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

  constructor(orgId: string, storageStatePath: string = path.resolve(process.cwd(), 'cookies/yandex.json')) {
    this.orgId = orgId;
    this.storageStatePath = storageStatePath;
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
          headless: true,
          args: ['--disable-http2'] // Force HTTP/1.1 to avoid protocol detection
      });
      this.context = await this.browser.newContext({
        storageState: fs.existsSync(this.storageStatePath) ? this.storageStatePath : undefined,
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });
    }
    const page = await this.context!.newPage();
    page.setDefaultTimeout(60000);
    return page;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async updateBasicInfo(data: OrganizationData) {
    const page = await this.getPage();
    
    try {
      console.log(`Navigating to organization ${this.orgId} edit page...`);
      // Use 'commit' to avoid waiting for heavy Yandex network idle
      await page.goto(`https://yandex.ru/sprav/${this.orgId}/edit/common`, { waitUntil: 'commit' });
      
      console.log('Waiting for page content...');
      await page.waitForSelector('body', { timeout: 30000 });

      // Handle Redirects/Auth
      if (page.url().includes('passport.yandex.ru')) {
        console.log('Redirected to login. Waiting 10s for session recovery...');
        await page.waitForTimeout(10000);
        if (page.url().includes('passport.yandex.ru')) {
            throw new Error(`Auth failed. Cookies are invalid or expired.`);
        }
      }

      // Handle Captcha
      if (await page.title() === 'Вы не робот?' || await page.locator('.CheckboxCaptcha').isVisible()) {
          console.log('--- CAPTCHA DETECTED ---');
          console.log('Please solve it in the browser window. Waiting indefinitely for navigation...');
          await page.waitForURL(url => !url.toString().includes('showcaptcha'), { timeout: 0 });
      }

      // Wait for the actual form to load
      await page.waitForSelector('input[name="name"], .input__control', { timeout: 30000 });

      if (data.name) {
        console.log(`Setting name: ${data.name}`);
        const nameInput = page.locator('input[name="name"], .input__control').first();
        await nameInput.clear();
        await nameInput.fill(data.name);
      }

      if (data.description) {
        console.log(`Setting description...`);
        const descInput = page.locator('textarea[name="description"], .textarea__control').first();
        await descInput.clear();
        await descInput.fill(data.description);
      }

      if (data.website) {
        console.log(`Setting website: ${data.website}`);
        const siteInput = page.locator('input[name^="links"][name$=".url"], input[placeholder*="сайт"], input[placeholder*="Website"]').first();
        if (await siteInput.isVisible()) {
            await siteInput.clear();
            await siteInput.fill(data.website);
        }
      }

      console.log('Preview complete. Taking screenshot...');
      await page.screenshot({ path: `data/preview_${Date.now()}.png` });
      
      console.log('--- TEST RUN SUCCESSFUL ---');
      console.log('Verification: Fields filled in browser. Save button NOT clicked.');

    } catch (error) {
      console.error('Update failed at URL:', page.url());
      try { console.error('Page title:', await page.title()); } catch {}
      console.error('Error details:', error);
      await page.screenshot({ path: `data/error_${Date.now()}.png` });
      throw error;
    }
  }

  async updatePhotos(photoPaths: string[]) {
    const page = await this.getPage();
    await page.goto(`https://yandex.ru/sprav/${this.orgId}/edit/photos`);
    // Placeholder for photo logic
  }
}
