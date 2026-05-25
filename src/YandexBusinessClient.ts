import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

chromium.use(stealth());

export interface OrganizationData {
  name?: string;
  description?: string;
  website?: string;
  phones?: string[];
  socials?: {
    vk?: string;
    telegram?: string;
  };
}

export class YandexBusinessClient {
  private orgId: string;
  private browser: Browser | null = null;
  private dryRun: boolean;

  constructor(orgId: string, dryRun: boolean = false) {
    this.orgId = orgId;
    this.dryRun = dryRun;
  }

  private async getPage(): Promise<Page> {
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    if (!fs.existsSync(storageStatePath)) {
      throw new Error(`Session file not found at ${storageStatePath}. Please run auth script first.`);
    }

    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const context = await this.browser.newContext({
      storageState: storageStatePath,
      viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    return page;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  private async dismissPopups(page: Page): Promise<void> {
    await page.evaluate(() => {
      const selectors = [
        '.ya-business-ui-popup__screen-overlay',
        '[data-state="popup-visible"]',
        '.NotificationPopup',
        '.CrossPlatformModal',
        '.Modal-Wrapper',
        '.sc-sidebar-ya-business-ui-popup',
        '.sc-sidebar-ya-business-ui-modal',
        '.Paranja',
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      }
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    });
  }

  private async safeGoto(page: Page, url: string): Promise<void> {
    console.log(`  → Navigating to ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      await this.dismissPopups(page);
    } catch (e: any) {
      console.log(`  ⚠ Navigation warning: ${e.message}`);
    }
  }

  private async handleAuthAndCaptcha(page: Page): Promise<void> {
    const url = page.url();
    if (url.includes('passport.yandex.ru')) {
      throw new Error('Authentication failed: cookies may be expired');
    }
    const captchaVisible = await page.locator('.CheckboxCaptcha, .smartcaptcha-body, [class*="captcha"]').first().isVisible().catch(() => false);
    if (captchaVisible || (await page.title()).includes('робот')) {
      throw new Error('Captcha encountered');
    }
  }

  private async waitForEditForm(page: Page): Promise<void> {
    const selectors = ['input', 'button:has-text("Сохранить")', '[class*="Form"]'];
    for (const sel of selectors) {
      try {
        if (await page.locator(sel).first().isVisible({ timeout: 10000 })) return;
      } catch { }
    }
    throw new Error('Edit form not found');
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 150;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 100);
      });
    });
    await page.waitForTimeout(2000);
  }

  private async fillFieldByLabel(page: Page, labelText: string, value: string): Promise<boolean> {
    console.log(`  📝 Filling "${labelText}"...`);
    try {
      const isPhoneField = labelText.toLowerCase().includes('телефон') || labelText.toLowerCase().includes('добавочный');
      let locator = page.locator(`label:has-text("${labelText}"), div:has-text("${labelText}")`);
      
      if (labelText === 'Описание' && !isPhoneField) {
          locator = locator.filter({ hasNot: page.locator('.PhoneControl') });
      }

      const label = locator.last();
      let field = label.locator('input, textarea, [contenteditable="true"]').first();
      
      if (!(await field.isVisible({ timeout: 2000 }))) {
          field = page.locator(`label:has-text("${labelText}") + div input, label:has-text("${labelText}") + div textarea, label:has-text("${labelText}") + span input`).first();
      }

      if (await field.isVisible({ timeout: 5000 })) {
          await field.scrollIntoViewIfNeeded();
          await field.click({ force: true });
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await field.evaluate(el => {
              if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = '';
              else el.textContent = '';
          });
          await field.type(value, { delay: 20 });
          await field.evaluate((el) => {
              const eventOpts = { bubbles: true, cancelable: true };
              el.dispatchEvent(new Event('input', eventOpts));
              el.dispatchEvent(new Event('change', eventOpts));
              el.dispatchEvent(new Event('blur', eventOpts));
          });
          await page.keyboard.press('Tab');
          console.log(`    ✓ Success`);
          return true;
      }
    } catch (e) {
      console.log(`    ✗ Failed: ${e}`);
    }
    return false;
  }

  async getBasicInfo(): Promise<OrganizationData> {
    const page = await this.getPage();
    try {
      console.log(`\n🔍 Reading organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/`);
      await this.handleAuthAndCaptcha(page);
      
      const data = await page.evaluate(`(() => {
          const state = window.__PRELOAD_DATA || window.__INITIAL_STATE__;
          if (!state) return null;
          function findC(obj, d = 0) {
              if (d > 15 || !obj || typeof obj !== 'object') return null;
              if (obj.names && obj.displayName && obj.phones) return obj;
              for (const k in obj) {
                  try {
                      const f = findC(obj[k], d + 1);
                      if (f) return f;
                  } catch(e) {}
              }
              return null;
          }
          const c = findC(state);
          if (!c) return null;
          return {
              name: c.names && c.names[0] && c.names[0].value ? c.names[0].value.value : c.displayName,
              description: c.description || "",
              website: (c.urls || []).find(u => u.type === 'main' || !u.type)?.value || (c.urls && c.urls[0] ? c.urls[0].value : ""),
              phones: (c.phones || []).map(p => p.formatted || p.number)
          };
      })()`);

      if (data) {
          console.log('  Current data (from state):', JSON.stringify(data, null, 2));
          return data;
      }
      return {};
    } finally {
      await page.close();
    }
  }

  async updateBasicInfo(data: OrganizationData): Promise<void> {
    const page = await this.getPage();
    try {
      console.log(`\n🚀 Updating organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/`);
      await this.handleAuthAndCaptcha(page);
      await this.autoScroll(page);
      await this.waitForEditForm(page);

      if (data.name) await this.fillFieldByLabel(page, 'Обычное название', data.name);
      
      if (data.description) {
          const success = await this.fillFieldByLabel(page, 'Описание', data.description);
          if (!success) {
              console.log('  ⚠ Description label failed, trying generic textarea...');
              const mainTextarea = page.locator('textarea:not(.PhoneControl textarea)').first();
              if (await mainTextarea.isVisible({ timeout: 2000 })) {
                  await mainTextarea.fill(data.description);
                  console.log('    ✓ Success via generic textarea');
              }
          }
      }
      
      if (data.website) await this.fillFieldByLabel(page, 'Сайт', data.website);

      if (this.dryRun) return;

      const saveBtn = page.locator('button:has-text("Сохранить"), button[type="submit"]').filter({ hasText: /изменения|сохранить/i }).first();
      if (await saveBtn.isVisible({ timeout: 5000 })) {
          console.log('  Clicking save button...');
          await saveBtn.click({ force: true });
          await page.waitForTimeout(5000);
          console.log('  ✨ Save clicked');
      }
    } finally {
      await page.close();
    }
  }

  async updatePhotos(photoPaths: string[]) {
    const page = await this.getPage();
    try {
      console.log(`\n📸 Uploading photos for organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/photos/`);
      await this.handleAuthAndCaptcha(page);

      for (const photoPath of photoPaths) {
          const absolutePath = path.resolve(photoPath);
          if (!fs.existsSync(absolutePath)) continue;

          console.log(`  Uploading ${photoPath}...`);
          try {
              const uploadInput = page.locator('input[type="file"]').first();
              if (await uploadInput.isHidden()) {
                  await page.click('button:has-text("Добавить"), .add-photo-button, [class*="Upload"]', { force: true });
              }
              await uploadInput.setInputFiles(absolutePath);
              await page.waitForTimeout(5000);
              console.log(`    ✓ Uploaded ${photoPath}`);
          } catch (e) {
              console.log(`    ✗ Failed to upload ${photoPath}: ${e}`);
          }
      }
    } finally {
      await page.close();
    }
  }

  async deletePhotos(count: number = 10) {
    const page = await this.getPage();
    try {
      console.log(`\n🗑 Deleting up to ${count} photos for organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/photos/`);
      await this.handleAuthAndCaptcha(page);
      await this.dismissPopups(page);

      for (let i = 0; i < count; i++) {
          const photo = page.locator('.PhotosPage-Item, [class*="PhotoCard"]').first();
          if (!(await photo.isVisible({ timeout: 5000 }))) {
              console.log('  ✨ No more photos to delete');
              break;
          }
          
          await photo.hover();
          const deleteBtn = photo.locator('button[title*="Удалить"], .delete-button, [class*="Delete"]').first();
          await deleteBtn.click({ force: true });
          
          const confirmBtn = page.locator('button:has-text("Удалить"), button:has-text("Да")').first();
          if (await confirmBtn.isVisible({ timeout: 2000 })) {
              await confirmBtn.click({ force: true });
          }
          
          await page.waitForTimeout(1000);
          console.log(`    ✓ Deleted photo ${i + 1}`);
      }
    } finally {
      await page.close();
    }
  }

  async updateFeatures(featuresMap: Record<string, boolean>) {
    const page = await this.getPage();
    try {
      console.log(`\n⚙️ Updating features (attributes) for organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/features/`);
      await this.handleAuthAndCaptcha(page);
      
      for (const [featureName, isEnabled] of Object.entries(featuresMap)) {
          console.log(`  Toggling feature "${featureName}" to ${isEnabled ? 'ON' : 'OFF'}...`);
          
          // Features in Yandex are usually represented as a row with the feature name and a switch/radio
          // or a group of buttons. We look for a label/div with the text, then find the associated input/button.
          const featureBlock = page.locator(`div:has-text("${featureName}")`).filter({ has: page.locator('button, input[type="radio"], input[type="checkbox"]') }).last();
          
          if (await featureBlock.isVisible({ timeout: 3000 })) {
              // Yandex often uses custom Select/Radio buttons with text like "доступно" / "недоступно" or "да" / "нет"
              const targetText = isEnabled ? /(доступно|да|разрешено|есть)/i : /(недоступно|нет|запрещено|нет)/i;
              const toggleBtn = featureBlock.locator('button, label').filter({ hasText: targetText }).first();
              
              if (await toggleBtn.isVisible()) {
                  await toggleBtn.click({ force: true });
                  console.log(`    ✓ Set "${featureName}" successfully`);
              } else {
                  console.log(`    ⚠ Could not find exact toggle for "${featureName}" (might be a checkbox)`);
                  // Fallback for simple checkboxes
                  const checkbox = featureBlock.locator('input[type="checkbox"]').first();
                  if (await checkbox.isVisible()) {
                      const isChecked = await checkbox.isChecked();
                      if (isChecked !== isEnabled) {
                          await checkbox.click({ force: true });
                          console.log(`    ✓ Toggled checkbox for "${featureName}"`);
                      } else {
                          console.log(`    ✓ Checkbox already in correct state`);
                      }
                  }
              }
          } else {
              console.log(`    ✗ Feature "${featureName}" not found on page`);
          }
      }

      if (!this.dryRun) {
          const saveBtn = page.locator('button:has-text("Сохранить"), button[type="submit"]').filter({ hasText: /изменения|сохранить/i }).first();
          if (await saveBtn.isVisible({ timeout: 5000 })) {
              console.log('  Clicking save button...');
              await saveBtn.click({ force: true });
              await page.waitForTimeout(5000);
              console.log('  ✨ Features saved');
          }
      }
    } finally {
      await page.close();
    }
  }

  async uploadPriceList(ymlPath: string) {
    const page = await this.getPage();
    try {
      console.log(`\n📋 Uploading Price List (YML) for organization ${this.orgId}...`);
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/price-lists/`);
      await this.handleAuthAndCaptcha(page);
      
      const absolutePath = path.resolve(ymlPath);
      if (!fs.existsSync(absolutePath)) {
          throw new Error(`YML file not found at ${absolutePath}`);
      }

      console.log('  Uploading file...');
      
      // Usually there's a specific button for Excel/YML upload
      const uploadInput = page.locator('input[type="file"], input[accept*="xls"], input[accept*="xml"], input[accept*="yml"]').first();
      
      if (await uploadInput.isHidden()) {
          // Look for upload trigger buttons
          const triggerBtns = ['Загрузить XLS/YML', 'Загрузить прайс-лист', 'Импорт'];
          for (const text of triggerBtns) {
              const btn = page.locator(`button:has-text("${text}")`).first();
              if (await btn.isVisible()) {
                  await btn.click({ force: true });
                  break;
              }
          }
      }
      
      await uploadInput.setInputFiles(absolutePath);
      console.log('  ✓ File selected');
      
      if (!this.dryRun) {
          // Sometimes it auto-uploads, sometimes needs a save button
          const saveBtn = page.locator('button:has-text("Загрузить"), button:has-text("Сохранить")').filter({ hasNotText: /XLS/i }).first();
          if (await saveBtn.isVisible({ timeout: 3000 })) {
              await saveBtn.click({ force: true });
          }
          
          console.log('  ⏳ Waiting for processing (10s)...');
          await page.waitForTimeout(10000);
          
          // Check for errors
          const errorMsg = page.locator('.Error, .Alert_type_error, [class*="error"]').first();
          if (await errorMsg.isVisible({ timeout: 2000 })) {
              console.log(`  ✗ Upload failed: ${await errorMsg.textContent()}`);
          } else {
              console.log('  ✨ Price list uploaded successfully');
          }
      }
    } finally {
      await page.close();
    }
  }
}
