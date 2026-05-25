/**
 * fill-card.ts
 *
 * Automated fill of Яндекс Бизнес card for Клубика.
 *
 * Key findings from reverse engineering:
 * - Dashboard:   /sprav/{id}/p/edit/main
 * - Данные:      /sprav/{id}/p/edit/          ← name, description, phones, website
 * - Фото:        /sprav/{id}/p/edit/photos/
 * - Товары:      /sprav/{id}/p/edit/price-lists/
 * - Отзывы:      /sprav/{id}/p/edit/reviews/
 *
 * Popup "Будьте в курсе" appears on first visit.
 * Must hide it via JS (not click "Включить" — that navigates away).
 */
import { chromium } from 'playwright-extra';
import type { Page } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ────────────────────────────────────────────────────────────────
const ORG_ID = process.env.YANDEX_ORG_ID!;
const STORAGE_PATH = path.resolve(process.cwd(), 'cookies/yandex.json');
const DATA_PATH = path.resolve(process.cwd(), 'data/organization.json');
const DRY_RUN = process.argv.includes('--dry-run');
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'data');
const BASE = `https://yandex.ru/sprav/${ORG_ID}/p/edit`;

// ─── Helpers ────────────────────────────────────────────────────────────────
let screenshotCounter = 0;
async function shot(page: Page, label: string): Promise<string> {
  screenshotCounter++;
  const filename = path.join(
    SCREENSHOT_DIR,
    `fill_${String(screenshotCounter).padStart(2, '0')}_${label}.png`
  );
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`  📸 ${filename}`);
  return filename;
}

/**
 * Safely dismiss any modal/popup by hiding it via JS.
 * Never clicks action buttons — only hides overlay elements.
 */
async function dismissPopup(page: Page): Promise<void> {
  const dismissed = await page.evaluate(() => {
    const selectors = [
      '.ya-business-ui-popup__screen-overlay',
      '[data-state="popup-visible"]',
      '.NotificationPopup',
      '.CrossPlatformModal',
    ];
    let count = 0;
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        (el as HTMLElement).style.display = 'none';
        count++;
      });
    }
    return count;
  });
  if (dismissed > 0) {
    console.log(`  ✓ Скрыто ${dismissed} оверлей(ей) через JS`);
    await page.waitForTimeout(300);
  }
}

/**
 * Navigate to a section URL and wait for React to hydrate.
 */
async function goTo(page: Page, url: string, label: string): Promise<void> {
  console.log(`\n🗂  ${label}: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await dismissPopup(page);
  await shot(page, label.replace(/\s+/g, '_').toLowerCase());
  console.log(`  URL: ${page.url()}`);
}

/**
 * Fill a text input. Tries each selector in order.
 */
async function fillText(
  page: Page,
  selectors: string[],
  value: string,
  label: string
): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (!(await el.isVisible({ timeout: 3000 }))) continue;

      await el.click({ force: true });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await el.fill(value);
      await page.keyboard.press('Tab');

      const val = await el.inputValue().catch(() => '');
      if (val.length > 0) {
        console.log(`  ✓ ${label} → "${value.substring(0, 70)}"`);
        return true;
      }
    } catch { /* try next */ }
  }
  console.log(`  ✗ ${label} — поле не найдено (tried ${selectors.length} selectors)`);
  return false;
}

/**
 * Fill a textarea.
 */
async function fillTextarea(
  page: Page,
  selectors: string[],
  value: string,
  label: string
): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (!(await el.isVisible({ timeout: 3000 }))) continue;

      await el.click({ force: true });
      await page.keyboard.press('Control+A');
      await el.fill(value);
      await page.keyboard.press('Tab');

      const val = await el.inputValue().catch(() => '');
      if (val.length > 0) {
        console.log(`  ✓ ${label} → "${value.substring(0, 70)}..."`);
        return true;
      }
    } catch { /* try next */ }
  }
  console.log(`  ✗ ${label} — textarea не найден`);
  return false;
}

/**
 * Click the Save button.
 */
async function save(page: Page): Promise<void> {
  if (DRY_RUN) {
    console.log('  ⏩ DRY RUN — сохранение пропущено');
    return;
  }

  const selectors = [
    'button:has-text("Сохранить")',
    'button[type="submit"]:has-text("охранить")',
    '[data-testid="save-btn"]',
    'button:has-text("Готово")',
    'button:has-text("Применить")',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click({ force: true });
        console.log(`  💾 Сохранено (${sel})`);
        await page.waitForTimeout(3000);
        return;
      }
    } catch { /* try next */ }
  }

  console.log('  ⚠️  Кнопка "Сохранить" не найдена — ищем все кнопки на странице:');
  const allBtns = await page.locator('button:visible').all();
  for (const b of allBtns) {
    const txt = await b.innerText().catch(() => '');
    console.log(`     button: "${txt}"`);
  }
}

/**
 * Dump all visible inputs/textareas on current page for debugging.
 */
async function dumpFields(page: Page): Promise<void> {
  console.log('\n  🔍 Visible fields on page:');
  const fields = await page.evaluate(() => {
    const result: object[] = [];
    document.querySelectorAll('input, textarea').forEach(el => {
      const inp = el as HTMLInputElement;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (inp.type === 'hidden') return;
      result.push({
        tag: el.tagName,
        type: inp.type,
        name: inp.name,
        placeholder: inp.placeholder,
        value: inp.value?.substring(0, 60),
        id: inp.id,
      });
    });
    return result;
  });
  for (const f of fields) {
    const { tag, name, placeholder, value, id } = f as Record<string, string>;
    console.log(`  [${value ? '✓' : '○'}] <${tag}> name="${name}" id="${id}" placeholder="${placeholder}" value="${value}"`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!ORG_ID) throw new Error('YANDEX_ORG_ID не задан в .env');
  if (!fs.existsSync(STORAGE_PATH)) {
    throw new Error('cookies/yandex.json не найден. Запустите: npm run import-cookies');
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  console.log('\n═══════════════════════════════════════════════');
  console.log('  🚀 Яндекс Бизнес — заполнение карточки');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Org ID:   ${ORG_ID}`);
  console.log(`  Dry run:  ${DRY_RUN ? 'ДА (без сохранения)' : 'НЕТ (реальное сохранение)'}`);
  console.log(`  Данные:   ${DATA_PATH}`);
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    storageState: STORAGE_PATH,
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ── Step 1: Open "Данные" section (main edit form) ───────────────────
    await goTo(page, `${BASE}/`, 'Данные');

    if (page.url().includes('passport')) {
      throw new Error('Куки устарели — редирект на passport.yandex.ru');
    }

    // Scroll through full page to trigger lazy-loading of all form sections
    console.log('  Прокрутка страницы для загрузки всех секций...');
    for (let scroll = 0; scroll <= 4000; scroll += 600) {
      await page.evaluate(y => window.scrollTo(0, y), scroll);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    await dumpFields(page);

    // ── Step 2: Fill name ───────────────────────────────────────────────
    if (data.name) {
      console.log(`\n✏️  Название: "${data.name}"`);
      await fillText(
        page,
        [
          'input[name="name"]',
          '[data-name="name"] input',
          'label:has-text("Название") input',
          'label:has-text("назван") input',
          '.CompanyName input',
          '#name',
        ],
        data.name,
        'Название'
      );
    }

    // ── Step 3: Fill description ────────────────────────────────────────
    if (data.description) {
      console.log(`\n✏️  Описание...`);
      // Scroll to find description textarea (it's below the fold)
      let descFilled = false;

      // Try standard selectors first
      descFilled = await fillTextarea(
        page,
        [
          'textarea[name="description"]',
          '[data-name="description"] textarea',
          'label:has-text("Описание") textarea',
          'label:has-text("описание") textarea',
          '.Description textarea',
          '#description',
        ],
        data.description,
        'Описание'
      );

      if (!descFilled) {
        // Scroll and search for any visible textarea
        for (let y = 0; y <= 5000; y += 400) {
          await page.evaluate(pos => window.scrollTo(0, pos), y);
          await page.waitForTimeout(300);
          const textareas = await page.locator('textarea:visible').all();
          for (const ta of textareas) {
            try {
              const placeholder = await ta.getAttribute('placeholder').catch(() => '');
              const currentVal = await ta.inputValue().catch(() => '');
              // Skip textareas that already have significant content
              if (currentVal.length > 100) continue;
              await ta.click({ force: true });
              await page.keyboard.press('Control+A');
              await ta.fill(data.description);
              const filled = await ta.inputValue().catch(() => '');
              if (filled.length > 10) {
                console.log(`  ✓ Описание заполнено (scroll y=${y}, placeholder="${placeholder}")`);
                descFilled = true;
                break;
              }
            } catch {}
          }
          if (descFilled) break;
        }
        if (!descFilled) console.log('  ✗ Описание — textarea не найден даже после прокрутки');
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    // ── Step 4: Fill website ────────────────────────────────────────────
    if (data.website) {
      console.log(`\n🌐 Сайт: ${data.website}`);

      // The website section is in "Сайт и социальные сети" — scroll to find it
      // First check if there's an "Добавить" button for the website
      let siteFilled = false;

      for (let y = 0; y <= 5000; y += 400) {
        await page.evaluate(pos => window.scrollTo(0, pos), y);
        await page.waitForTimeout(300);

        // Look for "Добавить" button next to "Сайт и социальные сети"
        const addBtn = page.locator('button:has-text("Добавить")').first();
        if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await addBtn.click();
          await page.waitForTimeout(1500);
          console.log(`  → Нажали "Добавить" для сайта (y=${y})`);
        }

        // Now look for site input fields
        const siteInput = await fillText(
          page,
          [
            'input[name*="url"]',
            'input[name*="website"]',
            'input[name*="site"]',
            'input[placeholder*="сайт"]',
            'input[placeholder*="Сайт"]',
            'input[placeholder*="http"]',
            'input[type="url"]',
            'input[placeholder*="ссылк"]',
            'label:has-text("Сайт") input',
          ],
          data.website,
          'Сайт'
        );

        if (siteInput) {
          siteFilled = true;
          break;
        }
      }

      if (!siteFilled) console.log('  ✗ Поле сайта не найдено даже после прокрутки');
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // ── Step 5: Fill phones ─────────────────────────────────────────────
    if (data.phones && data.phones.length > 0) {
      console.log(`\n📞 Телефоны: ${data.phones.join(', ')}`);
      const phoneInputs = await page
        .locator('input[type="tel"], input[name*="phone"], input[placeholder*="телефон"], input[placeholder*="Телефон"]')
        .all();

      for (let i = 0; i < data.phones.length; i++) {
        if (i < phoneInputs.length) {
          await phoneInputs[i].click({ force: true });
          await page.keyboard.press('Control+A');
          await phoneInputs[i].fill(data.phones[i]);
          await page.keyboard.press('Tab');
          console.log(`  ✓ Телефон ${i + 1}: ${data.phones[i]}`);
        }
      }
    }

    await shot(page, 'after_fill');
    await save(page);
    await shot(page, 'after_save');

    // ── Step 6: Fill social links (if on same page or different section) ─
    if (data.socials) {
      console.log('\n🔗 Социальные сети...');

      // Check if social fields exist on current page
      const hasSocials = await page
        .locator('input[placeholder*="ВКонтакте"], input[placeholder*="vk"], input[name*="vk"]')
        .isVisible()
        .catch(() => false);

      if (!hasSocials) {
        // Try navigating to contacts/links section
        console.log('  Социальные сети не найдены на текущей странице. Ищем в других разделах...');
      } else {
        if (data.socials.vk) {
          await fillText(
            page,
            ['input[placeholder*="ВКонтакте"]', 'input[placeholder*="vk.com"]', 'input[name*="vk"]'],
            data.socials.vk,
            'VK'
          );
        }
        await save(page);
      }
    }

    // ── Step 7: Final scan ──────────────────────────────────────────────
    console.log('\n🔍 Финальный скан страницы...');
    await dumpFields(page);
    const finalShot = await shot(page, 'FINAL');

    console.log('\n═══════════════════════════════════════════════');
    if (DRY_RUN) {
      console.log('  ✅ DRY RUN завершён — поля заполнены, НЕ сохранены');
    } else {
      console.log('  ✅ Карточка успешно обновлена!');
    }
    console.log(`  📸 Финальный скриншот: ${finalShot}`);
    console.log('═══════════════════════════════════════════════');

  } catch (err) {
    console.error('\n❌ Критическая ошибка:');
    console.error('  URL:', page.url());
    try { console.error('  Title:', await page.title()); } catch {}
    console.error('  Error:', err);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `fill_CRITICAL_ERROR_${Date.now()}.png`),
      fullPage: true,
    }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
