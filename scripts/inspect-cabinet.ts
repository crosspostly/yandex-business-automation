/**
 * inspect-cabinet.ts
 * 
 * Opens the Yandex Business cabinet with visible browser so the user can see.
 * Navigates through ALL sections of the sidebar and captures:
 * - Section name
 * - URL
 * - All labels and inputs on each section
 * - Screenshot
 */
import { chromium } from 'playwright-extra';
import type { Page } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

interface SectionReport {
  name: string;
  url: string;
  screenshot: string;
  fields: { label: string; tag: string; type: string; value: string; placeholder: string }[];
  buttons: string[];
  headings: string[];
}

async function dismissAll(page: Page) {
  await page.evaluate(() => {
    const sels = [
      '.ya-business-ui-popup__screen-overlay',
      '[data-state="popup-visible"]',
      '.Paranja',
      '.InfoModal',
      '.InfoModal-Overlay',
      '.InfoModal-Content',
    ];
    for (const sel of sels) {
      document.querySelectorAll(sel).forEach(el => (el as HTMLElement).style.display = 'none');
    }
    document.body.style.overflow = 'auto';
  });
}

async function scanPage(page: Page): Promise<Pick<SectionReport, 'fields' | 'buttons' | 'headings'>> {
  return page.evaluate(() => {
    const fields: any[] = [];
    document.querySelectorAll('input:not([type=hidden]), textarea, [contenteditable="true"]').forEach(el => {
      const inp = el as HTMLInputElement;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      
      // Find nearest label text
      let label = '';
      const parent = el.closest('.ya-business-input, .ya-business-textarea, [class*="Control"]');
      if (parent) {
        const labelEl = parent.querySelector('label, .ya-business-input__label');
        if (labelEl) label = labelEl.textContent?.trim() || '';
      }
      if (!label) {
        const prevLabel = el.closest('label');
        if (prevLabel) label = prevLabel.textContent?.trim().substring(0, 60) || '';
      }
      
      fields.push({
        label,
        tag: el.tagName,
        type: inp.type || '',
        value: inp.value?.substring(0, 80) || '',
        placeholder: inp.placeholder || '',
      });
    });

    const buttons: string[] = [];
    document.querySelectorAll('button:not([class*="popup"])').forEach(b => {
      const text = (b as HTMLElement).textContent?.trim();
      if (text && text.length > 0 && text.length < 50) buttons.push(text);
    });

    const headings: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
      const text = h.textContent?.trim();
      if (text && text.length > 0 && text.length < 100) headings.push(`<${h.tagName}> ${text}`);
    });

    return { fields, buttons: [...new Set(buttons)], headings };
  });
}

async function main() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({
    headless: true,  // Headless for CLI
    args: ['--no-sandbox', '--disable-http2'],
  });

  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // All sidebar sections discovered earlier
  const sections = [
    { name: 'Данные', path: '' },
    { name: 'Фото и видео', path: 'photos/' },
    { name: 'Товары и услуги', path: 'price-lists/' },
    { name: 'Публикации', path: 'posts/' },
    { name: 'Истории', path: 'stories/' },
    { name: 'События', path: 'events/' },
    { name: 'Акции', path: 'promotions/' },
    { name: 'Доставка', path: 'delivery/' },
    { name: 'Отзывы', path: 'reviews/' },
    { name: 'Рейтинг компании', path: 'rating-history/' },
    { name: 'Промоматериалы', path: 'promo/' },
    { name: 'Карта на сайт', path: 'tools/' },
  ];

  const report: SectionReport[] = [];

  try {
    for (const section of sections) {
      const url = `https://yandex.ru/sprav/${orgId}/p/edit/${section.path}`;
      console.log(`\n════ ${section.name} ════`);
      console.log(`  URL: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);
        await dismissAll(page);

        // Scroll through
        for (let y = 0; y <= 3000; y += 500) {
          await page.evaluate(pos => window.scrollTo(0, pos), y);
          await page.waitForTimeout(300);
          await dismissAll(page);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        const screenshotFile = `data/cabinet_${section.path.replace(/\//g, '') || 'data'}.png`;
        await page.screenshot({ path: screenshotFile, fullPage: true });

        const { fields, buttons, headings } = await scanPage(page);

        report.push({
          name: section.name,
          url: page.url(),
          screenshot: screenshotFile,
          fields,
          buttons,
          headings,
        });

        console.log(`  Headings: ${headings.join(', ')}`);
        console.log(`  Fields: ${fields.length}`);
        fields.forEach(f => {
          const val = f.value ? ` = "${f.value}"` : '';
          console.log(`    [${f.label || '???'}] <${f.tag} type="${f.type}"> placeholder="${f.placeholder}"${val}`);
        });
        console.log(`  Buttons: ${buttons.join(', ')}`);

      } catch (err: any) {
        console.log(`  ❌ Error: ${err.message}`);
        report.push({ name: section.name, url, screenshot: '', fields: [], buttons: [], headings: [] });
      }
    }

    // Save full report
    fs.writeFileSync('data/cabinet_full_report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Report saved: data/cabinet_full_report.json');

    // Keep browser open for user to see
    console.log('\n🖥️  Browser is open for inspection. Press Ctrl+C to close.');
    // await page.waitForTimeout(300000); // 5 minutes

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
