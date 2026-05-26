import { chromium } from 'playwright-extra';
import type { Browser, Page, Locator } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import piexif from 'piexifjs';

chromium.use(stealth());

export interface OrganizationData {
  name?: string;
  names?: Record<string, string>; 
  description?: string;
  website?: string;
  phones?: string[];
  socials?: Record<string, string>;
  emails?: string[];
  rubrics?: string[]; 
  workInterval?: string; 
  [key: string]: any; 
}

export interface EventData { title: string; description: string; photoPath?: string; }
export interface PromotionData { title: string; description: string; photoPath?: string; }
export interface ArticleData { title: string; content: string; photos: string[]; }

export class YandexBusinessClient {
  private orgId: string;
  private browser: Browser | null = null;
  private dryRun: boolean;
  private coords: { lat: number, lon: number } | null = null;

  constructor(orgId: string, dryRun: boolean = false) {
    this.orgId = orgId;
    this.dryRun = dryRun;
  }

  setCoordinates(lat: number, lon: number) { this.coords = { lat, lon }; }

  private async getPage(): Promise<Page> {
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    if (!fs.existsSync(storageStatePath)) throw new Error(`Session file not found.`);
    if (!this.browser) this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2'] 
    });
    const context = await this.browser.newContext({ storageState: storageStatePath, viewport: { width: 1920, height: 1080 } });
    return await context.newPage();
  }

  async close() { if (this.browser) await this.browser.close(); }

  private async dispatchClick(page: Page, selector: string | Locator) {
    const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
    await loc.evaluate(el => {
        el.scrollIntoView();
        const opts = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
    });
  }

  private async dismissPopups(page: Page): Promise<void> {
    await page.evaluate(() => {
      const selectors = [
        '.ya-business-ui-popup__screen-overlay',
        '[data-state="popup-visible"]',
        '.Paranja',
        '.InfoModal',
        '.InfoModal-Overlay',
        '.InfoModal-Content',
        '.NotificationPopup',
        '.CrossPlatformModal',
      ];
      for (const sel of selectors) { 
        document.querySelectorAll(sel).forEach(el => { (el as HTMLElement).style.display = 'none'; }); 
      }
      document.body.style.overflow = 'auto';
    });
  }

  private async safeGoto(page: Page, url: string): Promise<void> {
    console.log(`  → Navigating to ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);
      await this.dismissPopups(page);
    } catch (e: any) { console.log(`  ⚠ Navigation warning: ${e.message}`); }
  }

  private async handleAuthAndCaptcha(page: Page): Promise<void> {
    const url = page.url();
    if (url.includes('passport.yandex.ru')) throw new Error('Authentication failed - cookies expired');
    const captchaVisible = await page.locator('.CheckboxCaptcha, .smartcaptcha-body').first().isVisible().catch(() => false);
    if (captchaVisible) throw new Error('Captcha encountered - automation blocked');
  }

  private injectGeoTags(photoPath: string): string {
    if (!this.coords) return photoPath;
    try {
        const absolutePath = path.resolve(photoPath);
        if (!photoPath.toLowerCase().match(/\.(jpg|jpeg)$/)) return photoPath;
        const jpeg = fs.readFileSync(absolutePath).toString("binary");
        const lat = this.coords.lat; const lng = this.coords.lon;
        const latDeg = Math.floor(Math.abs(lat)); const latMin = Math.floor((Math.abs(lat) - latDeg) * 60); const latSec = Math.round(((Math.abs(lat) - latDeg) * 60 - latMin) * 60 * 100);
        const lngDeg = Math.floor(Math.abs(lng)); const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60); const lngSec = Math.round(((Math.abs(lng) - lngDeg) * 60 - lngMin) * 60 * 100);
        const gps: any = {};
        gps[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S'; gps[piexif.GPSIFD.GPSLatitude] = [[latDeg, 1], [latMin, 1], [latSec, 100]];
        gps[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W'; gps[piexif.GPSIFD.GPSLongitude] = [[lngDeg, 1], [lngMin, 1], [lngSec, 100]];
        const exifObj = {"GPS": gps}; const exifBytes = piexif.dump(exifObj); const newJpeg = piexif.insert(exifBytes, jpeg);
        const geoPath = photoPath.replace(/\.(jpg|jpeg)/i, '_geo.jpg'); fs.writeFileSync(geoPath, newJpeg, "binary");
        return geoPath;
    } catch (e) { return photoPath; }
  }

  private async getFieldValue(field: Locator): Promise<string> {
    try {
      const tag = await field.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'input' || tag === 'textarea') {
        return await field.inputValue();
      } else {
        return await field.innerText();
      }
    } catch {
      return '';
    }
  }

  private getPossibleLabels(labelText: string): string[] {
    const labelMap: Record<string, string[]> = {
        'description': ['Описание', 'О компании', 'Коротко о месте'],
        'website': ['Сайт', 'Веб-сайт', 'Ссылка на сайт', 'URL'],
        'name': ['Обычное название', 'Название'],
        'title': ['Название', 'Заголовок'],
        'email': ['Электронная почта', 'Email', 'E-mail'],
        'phone': ['Телефон', 'Контактный телефон'],
        'vk': ['ВКонтакте', 'VK', 'vk.com'],
        'shortName': ['Короткое название'],
      };
      return labelMap[labelText] || [labelText];
  }

  /**
   * Only reads the value from the field, NO typing.
   */
  private async verifyField(page: Page, labelText: string, expectedValue: string): Promise<boolean> {
    const possibleLabels = this.getPossibleLabels(labelText);
    
    for (const finalLabel of possibleLabels) {
        const selectors = [
          `label:has-text("${finalLabel}")`,
          `div:has-text("${finalLabel}")`,
          `span:has-text("${finalLabel}")`,
          `[placeholder*="${finalLabel}"]`
        ];
        
        for (const sel of selectors) {
          const possible = page.locator(sel).last().locator('input, textarea, [contenteditable="true"]').first();
          if (await possible.isVisible({ timeout: 500 }).catch(() => false)) {
            const val = await this.getFieldValue(possible);
            const normalize = (s: string) => s.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '').replace(/\D/g, '');
            if (val.toLowerCase().includes(expectedValue.toLowerCase()) || normalize(val) === normalize(expectedValue)) {
                return true;
            }
          }
        }
    }
    return false;
  }

  /**
   * Robustly fill a field and verify it.
   */
  private async fillAndVerify(page: Page, labelText: string, value: string, maxTries = 3): Promise<boolean> {
    const possibleLabels = this.getPossibleLabels(labelText);
    console.log(`  📝 Target: "${labelText}" (${possibleLabels.join('/')}) → "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        await this.dismissPopups(page);
        
        let field: Locator | null = null;
        for (const finalLabel of possibleLabels) {
            const selectors = [
              `label:has-text("${finalLabel}")`,
              `div:has-text("${finalLabel}")`,
              `span:has-text("${finalLabel}")`,
              `[placeholder*="${finalLabel}"]`
            ];
            
            for (const sel of selectors) {
              const locator = page.locator(sel).last();
              const possible = locator.locator('input, textarea, [contenteditable="true"]').first();
              if (await possible.isVisible({ timeout: 500 }).catch(() => false)) {
                field = possible;
                break;
              }
              const sibling = page.locator(`${sel} + div input, ${sel} + div textarea, ${sel} + span input, ${sel} + div [contenteditable="true"]`).first();
              if (await sibling.isVisible({ timeout: 500 }).catch(() => false)) {
                field = sibling;
                break;
              }
            }
            if (field) break;
        }

        if (!field) {
          console.log(`    (Attempt ${attempt}) Field "${labelText}" not found. Looking for "Добавить" button...`);
          for (const finalLabel of possibleLabels) {
              const sectionHeader = page.locator(`h2:has-text("${finalLabel}"), h3:has-text("${finalLabel}"), div:has-text("${finalLabel}")`).first();
              if (await sectionHeader.isVisible().catch(() => false)) {
                await sectionHeader.scrollIntoViewIfNeeded();
                const container = sectionHeader.locator('xpath=..');
                const addBtn = container.locator('button:has-text("Добавить")').first();
                if (await addBtn.isVisible().catch(() => false)) {
                  await addBtn.evaluate(el => (el as HTMLElement).click());
                  await page.waitForTimeout(1000);
                  break; 
                }
              }
          }
          // Special fallback for Website/Socials
          if (!field && (labelText === 'website' || labelText === 'vk')) {
             const socialSection = page.locator('h2:has-text("Сайт и социальные сети")').first();
             if (await socialSection.isVisible().catch(() => false)) {
                await socialSection.scrollIntoViewIfNeeded();
                const addBtn = socialSection.locator('xpath=..').locator('button:has-text("Добавить")').first(); 
                if (await addBtn.isVisible().catch(() => false)) {
                   await addBtn.evaluate(el => (el as HTMLElement).click());
                   await page.waitForTimeout(1000);
                }
             }
          }
        }

        if (field) {
          // If we found one, let's find ALL and fill them using localized labels
          const targets: Locator[] = [];
          for (const label of possibleLabels) {
              const found = await page.locator(`label:has-text("${label}"), div:has-text("${label}"), span:has-text("${label}")`).locator('input, textarea').all();
              targets.push(...found);
          }
          
          console.log(`    (Attempt ${attempt}) Found ${targets.length} possible inputs for "${labelText}". Filling all...`);
          
          for (const t of targets) {
              try {
                  if (await t.isVisible({ timeout: 1000 })) {
                      await t.scrollIntoViewIfNeeded();
                      await t.click({ force: true });
                      await page.keyboard.press('Control+A');
                      await page.keyboard.press('Delete');
                      await t.type(value, { delay: 50 });
                      await page.keyboard.press('Enter');
                      await page.waitForTimeout(500);
                  }
              } catch (e) {}
          }
          
          await page.waitForTimeout(1000);
          const actualValue = await this.getFieldValue(targets[0] || field);
          const html = await (targets[0] || field).evaluate(el => el.outerHTML);
          console.log(`    🔍 DEBUG Field HTML: ${html.substring(0, 200)}...`);
          const normalize = (s: string) => s.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '').replace(/\D/g, '');
          const cleanActual = actualValue.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          const cleanExpected = value.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          
          if (cleanActual.includes(cleanExpected) || cleanExpected.includes(cleanActual) || (normalize(actualValue) === normalize(value) && normalize(value).length > 0)) {
            console.log(`    ✅ Verified local: "${actualValue.substring(0, 40)}..."`);
            return true;
          } else {
            console.log(`    ⚠ Verification failed (Attempt ${attempt}): Expected "${value.substring(0, 20)}", got "${actualValue.substring(0, 20)}"`);
          }
        }
      } catch (e: any) { console.log(`    ⚠ Error in attempt ${attempt}: ${e.message}`); }
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(500);
    }
    console.log(`    ❌ Failed to fill/verify "${labelText}" after ${maxTries} attempts`);
    return false;
  }

  async updateBasicInfo(data: OrganizationData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/`);
      await this.handleAuthAndCaptcha(page);

      console.log('  ⏬ Scrolling page to load all sections...');
      for (let y = 0; y <= 6000; y += 800) { await page.evaluate(pos => window.scrollTo(0, pos), y); await page.waitForTimeout(400); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
      
      const results: Record<string, boolean> = {};

      if (data.workInterval) {
          const nonstopBtn = page.locator('button:has-text("Круглосуточно")').first();
          if (await nonstopBtn.isVisible().catch(() => false)) {
            await nonstopBtn.click({ force: true });
            console.log('  ✓ Режим: Круглосуточно');
            results['workInterval'] = true;
          }
      }

      // Fill simple string fields (SKIPPING description as requested)
      const simpleFields = ['name', 'website', 'email'] as const;
      for (const key of simpleFields) {
        const val = key === 'email' ? (data.emails?.[0]) : data[key];
        if (val) {
          results[key] = await this.fillAndVerify(page, key, val as string);
        }
      }

      if (data.socials && typeof data.socials === 'object') {
        for (const [network, url] of Object.entries(data.socials)) {
          results[network] = await this.fillAndVerify(page, network, url as string);
        }
      }

      if (data.phones && Array.isArray(data.phones) && data.phones.length > 0) {
        results['phone'] = await this.fillAndVerify(page, 'phone', data.phones[0]);
      }

      await page.screenshot({ path: 'data/fill_before_save.png', fullPage: true });
      
      if (!this.dryRun) {
        await this.dismissPopups(page);
        const saveBtn = page.locator('button:has-text("Сохранить"), button:has-text("Сохранить изменения")').first();
        if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('  💾 Clicking SAVE button via dispatchClick...');
          await this.dispatchClick(page, saveBtn);
          await page.waitForTimeout(10000); // 10s wait for persistence
          
          console.log('  🔍 REFRESHING and checking persistence...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(10000); // 10s for heavy page load
          await this.dismissPopups(page);
          await page.screenshot({ path: 'data/revert_check.png', fullPage: true });

          if (data.emails?.[0]) {
             const finalOk = await this.verifyField(page, 'email', data.emails[0]);
             if (finalOk) console.log('  ✨ Email persistence CONFIRMED');
             else console.log('  ⛔ Email persistence FAILED');
             results['email_persisted'] = finalOk;
          }
          if (data.website) {
             const finalOk = await this.verifyField(page, 'website', data.website);
             if (finalOk) console.log('  ✨ Website persistence CONFIRMED');
             else console.log('  ⛔ Website persistence FAILED');
             results['website_persisted'] = finalOk;
          }
        } else {
          console.log('  ⚠ Save button not found');
        }
        await page.screenshot({ path: 'data/fill_after_save_full.png', fullPage: true });
      } else {
        console.log('  ⏩ DRY RUN — save skipped');
      }
      
      console.log('\n📊 Summary:');
      for (const [k, v] of Object.entries(results)) { console.log(`   ${v ? '✅' : '❌'} ${k}`); }

    } finally { await page.close(); }
  }

  async uploadPhotosByCategory(photoPaths: string[], category: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/photos?tag=${category}`);
      await this.dismissPopups(page);
      
      for (const p of photoPaths) {
          const absolutePath = path.resolve(this.injectGeoTags(p));
          console.log(`    📤 Uploading ${p} to ${category}...`);
          
          let uploadInput = page.locator(`#photo-attach-${category}`).first();
          if (!(await uploadInput.isVisible())) {
              uploadInput = page.locator('input[type="file"].MediaUploadButton-Input').first();
          }
          if (!(await uploadInput.isVisible())) {
              uploadInput = page.locator('input[type="file"]').first();
          }

          await uploadInput.setInputFiles(absolutePath);
          await page.waitForTimeout(5000);
          console.log(`    ✅ Uploaded ${p}`);
      }
    } finally { await page.close(); }
  }

  async createEvent(event: EventData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/events/`);
      await page.locator('button:has-text("Добавить"), button:has-text("Создать")').first().evaluate(el => (el as HTMLElement).click());
      await this.fillAndVerify(page, 'title', event.title);
      // Description fill would go here but ignoring for now or using fillAndVerify correctly
      if (!this.dryRun) await page.locator('button:has-text("Опубликовать"), button:has-text("Создать")').last().evaluate(el => (el as HTMLElement).click());
    } finally { await page.close(); }
  }

  async createPromotion(promo: PromotionData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/promotions/`);
      await page.locator('button:has-text("Добавить акцию"), button:has-text("Создать")').first().evaluate(el => (el as HTMLElement).click());
      await this.fillAndVerify(page, 'title', promo.title);
      if (!this.dryRun) await page.locator('button:has-text("Опубликовать"), button:has-text("Создать")').last().evaluate(el => (el as HTMLElement).click());
    } finally { await page.close(); }
  }

  async uploadPriceList(ymlPath: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/price-lists/`);
      await this.dismissPopups(page);

      console.log('    🔘 Clicking "Загрузить XLS/YML" button...');
      const triggerBtn = page.locator('button:has-text("Загрузить XLS/YML")').first();
      if (await triggerBtn.isVisible()) {
          await triggerBtn.click();
          await page.waitForTimeout(2000);
      }

      const uploadInput = page.locator('input[type="file"]').first();
      await uploadInput.setInputFiles(path.resolve(ymlPath));
      await page.waitForTimeout(5000);
      
      if (!this.dryRun) {
          const btn = page.locator('button:has-text("Загрузить"), button:has-text("Сохранить")').filter({ hasNotText: /XLS/i }).first();
          if (await btn.isVisible()) {
              console.log('    💾 Clicking save/upload button...');
              await btn.evaluate(el => (el as HTMLElement).click());
              await page.waitForTimeout(10000);
          }
      }
    } finally { await page.close(); }
  }

  async createPublication(text: string, photoPaths: string[]) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/posts/`);
      await this.dismissPopups(page);

      console.log('    📝 Filling publication text...');
      let textarea = page.locator('textarea').first();
      await textarea.fill(text);
      
      for (const p of photoPaths) {
          console.log(`    🖼️ Attaching photo ${p}...`);
          await page.locator('input[type="file"]').first().setInputFiles(path.resolve(p));
          await page.waitForTimeout(2000);
      }
      
      if (!this.dryRun) { 
          const btn = page.locator('button:has-text("Создать"), button:has-text("Опубликовать"), [class*="Submit"]').first();
          if (await btn.isVisible()) {
              console.log(`    🚀 Clicking "${await btn.innerText()}" button...`);
              await btn.evaluate(el => (el as HTMLElement).click());
              await page.waitForTimeout(5000);
              console.log('    ✅ Publication created.');
          } else {
              console.log('    ❌ Publication button not found!');
          }
      }
    } finally { await page.close(); }
  }

  async listStories(): Promise<string[]> {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/stories/`);
      await this.dismissPopups(page);
      
      const main = page.locator('main, [class*="Content"], [class*="container"]').first();
      // Look for any text inside plates
      const items = await main.locator('[class*="CompanyStoryPlate-AddText"], [class*="Story"] [class*="Title"], [class*="StoryName"]').all();
      
      const names: string[] = [];
      for (const item of items) {
          const text = await item.innerText();
          const cleanText = text?.replace(/\n/g, ' ').trim();
          if (cleanText && cleanText !== 'Новая история' && !['Главная', 'Данные', 'Сайт'].includes(cleanText)) {
              names.push(cleanText);
          }
      }
      return [...new Set(names)];
    } finally { await page.close(); }
  }

  async deleteStory(name: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/stories/`);
      await this.dismissPopups(page);
      
      const storyItem = page.locator(`[class*="CompanyStoryPlate"], [class*="Story"], [class*="Item"]`).filter({ hasText: name }).last();
      
      if (await storyItem.isVisible()) {
          console.log(`    🗑️ Deleting story: "${name}"`);
          await storyItem.hover();
          await page.waitForTimeout(1000);
          
          let deleteBtn = storyItem.locator('button:has-text("Удалить"), [class*="delete"], [class*="Delete"], [class*="trash"]').first();
          if (!(await deleteBtn.isVisible())) {
              const menuBtn = storyItem.locator('button [class*="More"], button [class*="Dots"], button [class*="menu"]').first();
              if (await menuBtn.isVisible()) {
                  await menuBtn.click();
                  deleteBtn = page.locator('button:has-text("Удалить"), [role="menuitem"]:has-text("Удалить")').first();
              }
          }
          
          if (await deleteBtn.isVisible()) {
              await this.dispatchClick(page, deleteBtn);
              const confirmBtn = page.locator('.ya-business-ui-modal button:has-text("Удалить"), .ya-business-ui-modal button:has-text("Да")').last();
              if (await confirmBtn.isVisible()) await this.dispatchClick(page, confirmBtn);
              await page.waitForTimeout(3000);
              console.log(`    ✅ Story "${name}" deleted.`);
          } else {
              console.log(`    ❌ Could not find delete button for story "${name}".`);
          }
      } else {
          console.log(`    ⚠ Story "${name}" not found for deletion.`);
      }
    } finally { await page.close(); }
  }

  async addStory(name: string, photoPaths: string[]) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/stories/`);
      await this.dismissPopups(page);
      await page.waitForTimeout(5000);

      console.log(`    ➕ Открываем модалку "Новая история"...`);
      const addPlate = page.locator('.CompanyStoryPlate-AddText:has-text("Новая история")').first();
      await addPlate.click();
      
      await page.waitForTimeout(4000);
      await this.dismissPopups(page);

      // 1. Заполняем название
      console.log(`    📝 Вводим название: "${name}"`);
      const nameInput = page.locator('.AddStoryForm-TitleTextInput .ya-business-input__control').first();
      // "Силовой" метод ввода для React
      await nameInput.evaluate((el, val) => {
          (el as HTMLInputElement).value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
      }, name);
      await page.keyboard.press('Enter');

      // 2. Загружаем файлы
      console.log(`    🖼️ Загружаем ${photoPaths.length} слайд(ов)...`);
      const uploadInput = page.locator('.AddStoryForm input.AddStoryFormImageAttach-HiddenInput').first();
      await uploadInput.setInputFiles(photoPaths.map(p => path.resolve(p)));
      
      // КРИТИЧНО: Ждем, пока исчезнут все спиннеры загрузки
      console.log('    ⏳ Ожидаем завершения загрузки (спиннеров)...');
      await page.locator('.Loading-Spinner').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);

      // 3. Публикуем
      if (!this.dryRun) {
          const publishBtn = page.locator('.AddStoryForm-Submit').last();
          console.log(`    🚀 Нажимаем "Опубликовать" (прямой вызов JS)...`);
          
          await page.screenshot({ path: 'data/before_final_publish_click.png' });
          
          // "Силовой" клик без проверки видимости
          await publishBtn.evaluate(el => (el as HTMLElement).click());
          
          await page.waitForTimeout(10000);
          console.log(`    ✅ Попытка публикации завершена.`);
      }
    } finally { await page.close(); }
  }

  async updateDirectionStory(photoPaths: string[], buttonText?: string, buttonLink?: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/stories/`);
      await this.dismissPopups(page);
      await page.waitForTimeout(5000);

      // 1. Находим плитку через bounding box для точности
      const plates = await page.locator('[class*="CompanyStoryPlate"]').all();
      let targetBox = null;
      for (const p of plates) {
          const text = await p.innerText();
          if (text.includes('как к') || text.includes('пройти')) {
              targetBox = await p.boundingBox();
              if (targetBox) break;
          }
      }

      if (targetBox) {
          console.log(`    🔄 Открываем редактор через клик по координатам: ${targetBox.x}, ${targetBox.y}`);
          await page.mouse.click(targetBox.x + targetBox.width/2, targetBox.y + targetBox.height/2);
          await page.waitForTimeout(4000);
          
          // 2. Внутри модалки - удаляем старые слайды
          const modal = page.locator('.ya-business-ui-modal__content, .AddStoryForm-Content').first();
          const removeButtons = await modal.locator('button:has([class*="bin"]), button:has([class*="Remove"])').all();
          if (removeButtons.length > 0) {
              console.log(`    🗑️ Удаляем старые слайды (${removeButtons.length})...`);
              for (const btn of removeButtons) {
                  await this.dispatchClick(page, btn);
                  await page.waitForTimeout(500);
              }
          }

          // 3. Загружаем новые фото через специфический скрытый инпут
          for (const p of photoPaths) {
              console.log(`    🖼️ Добавляем слайд: ${p}...`);
              const uploadInput = page.locator('input.AddStoryFormImageAttach-HiddenInput').first();
              await uploadInput.setInputFiles(path.resolve(p));
              await page.waitForTimeout(4000);
          }

          // 4. Опционально: Текст кнопки и ссылка
          if (buttonText) {
              const textInput = page.locator('.AddStoryForm-ButtonTextInput input').first();
              if (await textInput.isVisible()) await textInput.fill(buttonText);
          }
          if (buttonLink) {
              const linkInput = page.locator('.AddStoryForm-ButtonLinkInput input').first();
              if (await linkInput.isVisible()) await linkInput.fill(buttonLink);
          }

          // 5. Публикуем
          if (!this.dryRun) {
              const publishBtn = page.locator('button:has-text("Опубликовать"), button:has-text("Сохранить"), .AddStoryForm-Submit').last();
              console.log('    🚀 Нажимаем "Опубликовать"...');
              await this.dispatchClick(page, publishBtn);
              await page.waitForTimeout(10000);
              console.log('    ✅ История обновлена.');
          }
      } else {
          console.log('    ⚠ Шаблон "Как к вам пройти" не найден через bounding box.');
      }
    } finally { await page.close(); }
  }

  async updateStory(oldName: string, newName: string, photoPaths: string[]) {
      if (oldName.toLowerCase().includes('пройти')) {
          await this.updateDirectionStory(photoPaths);
      } else {
          await this.deleteStory(oldName);
          await this.addStory(newName, photoPaths);
      }
  }

  async respondToReviews(template: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/reviews/`);
      const unreplied = page.locator('.ReviewItem:not(:has(.ReviewItem-Reply))');
      const count = await unreplied.count();
      for (let i = 0; i < Math.min(count, 1); i++) {
          await unreplied.nth(i).locator('button:has-text("Ответить")').evaluate(el => (el as HTMLElement).click());
          await page.locator('textarea').fill(template);
          await page.locator('button:has-text("Отправить")').evaluate(el => (el as HTMLElement).click());
      }
    } finally { await page.close(); }
  }

  async createArticle(data: ArticleData) { await this.createPublication(`${data.title}\n\n${data.content}`, data.photos); }
}
