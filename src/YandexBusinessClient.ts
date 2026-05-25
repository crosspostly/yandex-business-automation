import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

chromium.use(stealth());

export interface OrganizationData {
  name?: string;
  category?: string;
  phones?: string[];
  website?: string;
  description?: string;
  address?: string;
  hours?: string;
  socials?: {
    vk?: string;
    telegram?: string;
    instagram?: string;
  };
}

export class YandexBusinessClient {
  private orgId: string;
  private storageStatePath: string;
  private browser?: Browser;
  private context?: BrowserContext;
  private dryRun: boolean;

  constructor(
    orgId: string,
    storageStatePath: string = path.resolve(process.cwd(), 'cookies/yandex.json'),
    dryRun: boolean = false
  ) {
    this.orgId = orgId;
    this.storageStatePath = storageStatePath;
    this.dryRun = dryRun;
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-http2',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      this.context = await this.browser.newContext({
        storageState: fs.existsSync(this.storageStatePath)
          ? this.storageStatePath
          : undefined,
        viewport: { width: 1280, height: 900 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'ru-RU',
        timezoneId: 'Europe/Moscow',
      });
    }
    const page = await this.context!.newPage();
    page.setDefaultTimeout(60000);
    return page;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  /**
   * Safely navigate to a Yandex SPA page.
   * Uses 'load' instead of 'commit' or 'networkidle' to avoid hangs.
   */
  private async safeGoto(page: Page, url: string): Promise<void> {
    console.log(`  → Navigating to ${url}`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    } catch (e: any) {
      // If 'load' times out (SPA doesn't fire load), try domcontentloaded
      if (e?.name === 'TimeoutError') {
        console.log('  ⚠ load timed out, retrying with domcontentloaded...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else {
        throw e;
      }
    }
    // Wait extra for React/Vue hydration
    await page.waitForTimeout(3000);
  }

  /**
   * Handle auth redirect and captcha detection
   */
  private async handleAuthAndCaptcha(page: Page): Promise<void> {
    const url = page.url();

    if (url.includes('passport.yandex.ru')) {
      console.log('⚠ Redirected to login page — cookies may be expired');
      throw new Error('Authentication failed: redirected to passport.yandex.ru. Please re-export cookies.');
    }

    // Check for captcha
    const captchaVisible =
      (await page.locator('.CheckboxCaptcha, .smartcaptcha-body, [class*="captcha"]').first().isVisible().catch(() => false));

    if (captchaVisible || (await page.title()).includes('робот')) {
      console.log('🔒 CAPTCHA DETECTED — cannot proceed automatically');
      throw new Error('Captcha encountered. Please open the page manually and solve it, then re-export cookies.');
    }
  }

  /**
   * Wait for the edit form to appear. Tries multiple selectors.
   */
  private async waitForEditForm(page: Page): Promise<void> {
    const selectors = [
      'input[name="name"]',
      'input[placeholder*="назван"]',
      'input[placeholder*="имя"]',
      '.CompanyEditForm',
      '[class*="EditForm"]',
      '[class*="edit-form"]',
      'form input',
      'main input',
    ];

    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 10000 });
        console.log(`  ✓ Edit form found via: ${sel}`);
        return;
      } catch {
        // try next
      }
    }

    // Last resort: take screenshot and throw with context
    await page.screenshot({ path: `data/form_not_found_${Date.now()}.png`, fullPage: true });
    throw new Error('Edit form not found. Check data/form_not_found_*.png screenshot.');
  }

  /**
   * Fill a field safely: find it, clear it, type the value.
   * Returns true if field was filled.
   */
  private async fillField(page: Page, selectors: string[], value: string, label: string): Promise<boolean> {
    for (const sel of selectors) {
      try {
        const locator = page.locator(sel).first();
        if (await locator.isVisible({ timeout: 3000 })) {
          await locator.click({ force: true });
          await locator.selectAll?.();
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await locator.fill(value);
          await page.keyboard.press('Tab'); // trigger blur/validation
          console.log(`  ✓ ${label} filled via ${sel}`);
          return true;
        }
      } catch {
        // try next selector
      }
    }
    console.log(`  ✗ ${label} — field not found (tried ${selectors.length} selectors)`);
    return false;
  }

  async updateBasicInfo(data: OrganizationData): Promise<void> {
    const page = await this.getPage();

    try {
      console.log(`\n🚀 Updating organization ${this.orgId}...`);
      if (this.dryRun) console.log('  (DRY RUN mode — will NOT click Save)');

      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/edit/common`);
      await this.handleAuthAndCaptcha(page);

      console.log(`  Current URL: ${page.url()}`);
      console.log(`  Page title: ${await page.title()}`);

      // Take initial screenshot
      await page.screenshot({ path: `data/before_edit_${Date.now()}.png`, fullPage: false });

      await this.waitForEditForm(page);

      // === Fill Name ===
      if (data.name) {
        console.log(`\n📝 Setting name: "${data.name}"`);
        await this.fillField(
          page,
          [
            'input[name="name"]',
            'input[placeholder*="назван"]',
            'input[placeholder*="Назван"]',
            '#name',
            '[data-testid="name-input"]',
            'label:has-text("Название") input',
            'label:has-text("название") + input',
            '.CompanyName input',
          ],
          data.name,
          'Name'
        );
      }

      // === Fill Description ===
      if (data.description) {
        console.log(`\n📝 Setting description...`);
        await this.fillField(
          page,
          [
            'textarea[name="description"]',
            'textarea[placeholder*="писание"]',
            'textarea[placeholder*="Описание"]',
            '#description',
            '[data-testid="description-input"]',
            'label:has-text("Описание") textarea',
            '.textarea__control',
          ],
          data.description,
          'Description'
        );
      }

      // === Fill Website ===
      if (data.website) {
        console.log(`\n🌐 Setting website: ${data.website}`);
        await this.fillField(
          page,
          [
            'input[name^="links"][name*="url"]',
            'input[placeholder*="сайт"]',
            'input[placeholder*="Сайт"]',
            'input[placeholder*="http"]',
            'input[type="url"]',
            '[data-testid="website-input"]',
            'label:has-text("Сайт") input',
          ],
          data.website,
          'Website'
        );
      }

      // === Fill Phones ===
      if (data.phones && data.phones.length > 0) {
        console.log(`\n📞 Setting phones...`);
        // Look for phone inputs
        const phoneSelectors = [
          'input[name^="phones"]',
          'input[type="tel"]',
          'input[placeholder*="елефон"]',
          'input[placeholder*="Телефон"]',
          '[data-testid="phone-input"]',
        ];

        let phoneIndex = 0;
        for (const phone of data.phones) {
          const phoneInputs = await page.locator(phoneSelectors.join(',')).all();
          if (phoneIndex < phoneInputs.length) {
            try {
              const input = phoneInputs[phoneIndex];
              await input.click({ force: true });
              await page.keyboard.press('Control+A');
              await input.fill(phone);
              await page.keyboard.press('Tab');
              console.log(`  ✓ Phone ${phoneIndex + 1} filled: ${phone}`);
            } catch (e) {
              console.log(`  ✗ Phone ${phoneIndex + 1} failed: ${e}`);
            }
            phoneIndex++;
          } else {
            // Try to click "Add phone" button
            const addBtn = page.locator('button:has-text("Добавить телефон"), button:has-text("+ телефон"), [class*="add-phone"]').first();
            if (await addBtn.isVisible().catch(() => false)) {
              await addBtn.click();
              await page.waitForTimeout(1000);
              const newInputs = await page.locator(phoneSelectors.join(',')).all();
              if (newInputs.length > phoneIndex) {
                await newInputs[phoneIndex].fill(phone);
                await page.keyboard.press('Tab');
                console.log(`  ✓ Phone ${phoneIndex + 1} filled (after add): ${phone}`);
              }
              phoneIndex++;
            }
          }
        }
      }

      // === Screenshot after filling ===
      await page.waitForTimeout(1000);
      const screenshotPath = `data/after_fill_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

      if (this.dryRun) {
        console.log('\n✅ DRY RUN complete — fields filled but NOT saved');
        return;
      }

      // === Click Save ===
      console.log('\n💾 Clicking Save button...');
      const saveSelectors = [
        'button[type="submit"]',
        'button:has-text("Сохранить")',
        'button:has-text("сохранить")',
        '[data-testid="save-button"]',
        'button:has-text("Готово")',
        'button:has-text("Применить")',
        '.Button_view_action',
        'button.save',
      ];

      let saved = false;
      for (const sel of saveSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            console.log(`  ✓ Save button clicked via: ${sel}`);
            saved = true;
            break;
          }
        } catch {
          // try next
        }
      }

      if (!saved) {
        await page.screenshot({ path: `data/save_btn_not_found_${Date.now()}.png`, fullPage: true });
        throw new Error('Save button not found. Check screenshot.');
      }

      // Wait for save confirmation
      await page.waitForTimeout(3000);
      const finalScreenshotPath = `data/after_save_${Date.now()}.png`;
      await page.screenshot({ path: finalScreenshotPath, fullPage: false });
      console.log(`\n📸 Final screenshot: ${finalScreenshotPath}`);
      console.log(`   URL after save: ${page.url()}`);
      console.log('\n✅ Organization updated successfully!');

    } catch (error) {
      console.error('\n❌ Update failed!');
      console.error('  URL:', page.url());
      try {
        console.error('  Title:', await page.title());
      } catch {}
      console.error('  Error:', error);
      await page.screenshot({ path: `data/error_${Date.now()}.png`, fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await page.close();
    }
  }

  async updatePhotos(photoPaths: string[]) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/edit/photos`);
      await this.handleAuthAndCaptcha(page);
      // Photo upload logic placeholder
      console.log('Photo update not yet implemented');
    } finally {
      await page.close();
    }
  }
}
