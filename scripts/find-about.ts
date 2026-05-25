import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function findAbout() {
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
    
    const info = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, div, span')).filter(el => 
            (el.textContent || '').includes('Сайт') || (el.textContent || '').includes('Основное')
        );
        return links.map(el => ({
            tag: el.tagName,
            text: el.textContent?.substring(0, 20),
            href: (el.closest('a') as any)?.href
        }));
    });
    
    console.log('Found elements:', JSON.stringify(info, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

findAbout();
