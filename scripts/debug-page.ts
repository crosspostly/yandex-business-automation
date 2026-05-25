import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function debugPage() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  const cliUrl = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1];
  const urls = cliUrl ? [cliUrl] : [
    `https://yandex.ru/sprav/${orgId}/p/edit/`,
    `https://yandex.ru/sprav/${orgId}/p/edit/info`,
    `https://yandex.ru/sprav/${orgId}/p/edit/about`,
    `https://yandex.ru/sprav/${orgId}/p/edit/common`,
  ];

  try {
    for (const url of urls) {
        console.log(`\n--- Probing ${url} ---`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000); 
        
        console.log('Page title:', await page.title());
        
        const fields = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                tag: el.tagName,
                placeholder: (el as any).placeholder || '',
                value: (el as any).value || '',
                visible: (el as HTMLElement).offsetParent !== null
            }));
        });
        
        const visibleFields = fields.filter(f => f.visible);
        console.log('Visible fields:', visibleFields.length);
        for (const f of visibleFields) {
            console.log(`  - <${f.tag}> placeholder="${f.placeholder}" value="${f.value.substring(0, 30)}"`);
        }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

debugPage();
