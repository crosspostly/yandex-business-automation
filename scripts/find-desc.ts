import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function findDescription() {
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
    
    const matches = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));
        return all
            .filter(el => (el.textContent || '').includes('Описание') && el.children.length === 0)
            .map(el => ({
                tag: el.tagName,
                text: el.textContent,
                path: el.parentElement ? el.parentElement.tagName + ' > ' + el.tagName : el.tagName
            }));
    });
    
    console.log('Matches for "Описание":', JSON.stringify(matches, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

findDescription();
