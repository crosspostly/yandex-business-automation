import { chromium } from 'playwright-extra';
import type { Browser, Page } from 'playwright';
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
    if (!this.browser) this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({ storageState: storageStatePath, viewport: { width: 1440, height: 900 } });
    return await context.newPage();
  }

  async close() { if (this.browser) await this.browser.close(); }

  private async dismissPopups(page: Page): Promise<void> {
    await page.evaluate(() => {
      const selectors = ['.ya-business-ui-popup__screen-overlay', '[data-state="popup-visible"]', '.Paranja'];
      for (const sel of selectors) { document.querySelectorAll(sel).forEach(el => { (el as HTMLElement).style.display = 'none'; }); }
      document.body.style.overflow = 'auto';
    });
  }

  private async safeGoto(page: Page, url: string): Promise<void> {
    console.log(`  → Navigating to ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      await this.dismissPopups(page);
    } catch (e: any) { console.log(`  ⚠ Navigation warning: ${e.message}`); }
  }

  private async handleAuthAndCaptcha(page: Page): Promise<void> {
    const url = page.url();
    if (url.includes('passport.yandex.ru')) throw new Error('Authentication failed');
    const captchaVisible = await page.locator('.CheckboxCaptcha, .smartcaptcha-body').first().isVisible().catch(() => false);
    if (captchaVisible) throw new Error('Captcha encountered');
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

  private async fillFieldByLabel(page: Page, labelText: string, value: string): Promise<boolean> {
      const labelMap: Record<string, string> = { 'description': 'Описание', 'website': 'Сайт', 'name': 'Обычное название', 'title': 'Название', 'email': 'Электронная почта' };
      const finalLabel = labelMap[labelText] || labelText;
      console.log(`  📝 Filling "${finalLabel}"...`);
      try {
          const selectors = [`label:has-text("${finalLabel}")`, `div:has-text("${finalLabel}")` ];
          for (const sel of selectors) {
              const locator = page.locator(sel).last();
              let field = locator.locator('input, textarea, [contenteditable="true"]').first();
              if (!(await field.isVisible({ timeout: 1000 }))) {
                  field = page.locator(`${sel} + div input, ${sel} + div textarea, ${sel} + span input`).first();
              }
              if (await field.isVisible({ timeout: 2000 })) {
                  await field.scrollIntoViewIfNeeded(); await field.evaluate(el => (el as HTMLElement).focus());
                  await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
                  await field.type(value, { delay: 10 });
                  return true;
              }
          }
      } catch {}
      return false;
  }

  async updateBasicInfo(data: OrganizationData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/`);
      await this.handleAuthAndCaptcha(page);
      
      if (data.workInterval) {
          const nonstopBtn = page.locator('button:has-text("Круглосуточно")').first();
          if (await nonstopBtn.isVisible()) await nonstopBtn.evaluate(el => (el as HTMLElement).click());
      }

      for (const [k, v] of Object.entries(data)) { 
          if (k === 'names' && typeof v === 'object') {
              for (const [lang, name] of Object.entries(v as any)) {
                  await this.fillFieldByLabel(page, lang === 'ru' ? 'На русском' : 'На английском', name as string);
              }
          } else if (k === 'emails' && Array.isArray(v)) {
              await this.fillFieldByLabel(page, 'email', v[0]);
          } else if (v && k !== 'workInterval') {
              await this.fillFieldByLabel(page, k, v as string); 
          }
      }
      if (!this.dryRun) { await page.locator('button:has-text("Сохранить")').first().evaluate(el => (el as HTMLElement).click()); await page.waitForTimeout(3000); }
    } finally { await page.close(); }
  }

  async uploadPhotosByCategory(photoPaths: string[], category: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/photos?tag=${category}`);
      for (const p of photoPaths) {
          const uploadInput = page.locator('input[type="file"]').first();
          await uploadInput.setInputFiles(path.resolve(this.injectGeoTags(p)));
          await page.waitForTimeout(5000);
      }
    } finally { await page.close(); }
  }

  async createEvent(event: EventData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/events/`);
      await page.locator('button:has-text("Добавить"), button:has-text("Создать")').first().evaluate(el => (el as HTMLElement).click());
      await this.fillFieldByLabel(page, 'title', event.title);
      await this.fillFieldByLabel(page, 'description', event.description);
      if (!this.dryRun) await page.locator('button:has-text("Опубликовать"), button:has-text("Создать")').last().evaluate(el => (el as HTMLElement).click());
    } finally { await page.close(); }
  }

  async createPromotion(promo: PromotionData) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/promotions/`);
      await page.locator('button:has-text("Добавить акцию"), button:has-text("Создать")').first().evaluate(el => (el as HTMLElement).click());
      await this.fillFieldByLabel(page, 'title', promo.title);
      await this.fillFieldByLabel(page, 'description', promo.description);
      if (!this.dryRun) await page.locator('button:has-text("Опубликовать"), button:has-text("Создать")').last().evaluate(el => (el as HTMLElement).click());
    } finally { await page.close(); }
  }

  async uploadPriceList(ymlPath: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/price-lists/`);
      const uploadInput = page.locator('input[type="file"]').first();
      await uploadInput.setInputFiles(path.resolve(ymlPath));
      await page.waitForTimeout(5000);
      if (!this.dryRun) {
          const btn = page.locator('button:has-text("Загрузить"), button:has-text("Сохранить")').filter({ hasNotText: /XLS/i }).first();
          if (await btn.isVisible()) await btn.evaluate(el => (el as HTMLElement).click());
      }
    } finally { await page.close(); }
  }

  async createPublication(text: string, photoPaths: string[]) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/posts/`);
      let textarea = page.locator('textarea').first();
      await textarea.fill(text);
      for (const p of photoPaths) { await page.locator('input[type="file"]').first().setInputFiles(path.resolve(p)); await page.waitForTimeout(2000); }
      if (!this.dryRun) { 
          const btn = page.locator('button:has-text("Создать"), button:has-text("Опубликовать"), [class*="Submit"]').first();
          await btn.evaluate(el => (el as HTMLElement).click());
          await page.waitForTimeout(3000);
      }
    } finally { await page.close(); }
  }

  async uploadStory(photoPath: string) {
    const page = await this.getPage();
    try {
      await this.safeGoto(page, `https://yandex.ru/sprav/${this.orgId}/p/edit/stories/`);
      await page.locator('button:has-text("Добавить"), button:has-text("Создать")').first().evaluate(el => (el as HTMLElement).click());
      await page.locator('input[type="file"]').first().setInputFiles(path.resolve(photoPath));
      await page.waitForTimeout(5000);
      if (!this.dryRun) await page.locator('button:has-text("Опубликовать")').first().evaluate(el => (el as HTMLElement).click());
    } finally { await page.close(); }
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
