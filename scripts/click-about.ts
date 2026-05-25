import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function clickAbout() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const url = `https://yandex.ru/sprav/${orgId}/p/edit/main`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); 
    
    console.log('Searching for "О компании" element...');
    const aboutTab = page.locator('span:has-text("О компании"), div:has-text("О компании")').last();
    
    if (await aboutTab.isVisible()) {
        console.log('Clicking "О компании"...');
        await aboutTab.click();
        await page.waitForTimeout(5000);
        console.log('New URL:', page.url());
        
        const fields = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                tag: el.tagName,
                placeholder: (el as any).placeholder || '',
                value: (el as any).value || '',
                visible: (el as HTMLElement).offsetParent !== null
            }));
        });
        console.log('Visible fields after click:', fields.filter(f => f.visible).length);
        for(const f of fields.filter(f => f.visible)) {
            console.log(`  - <${f.tag}> placeholder="${f.placeholder}"`);
        }
        
        await page.screenshot({ path: 'data/after_about_click.png', fullPage: true });
    } else {
        console.log('Element "О компании" not found');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

clickAbout();
