import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function checkDescription() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const url = `https://yandex.ru/sprav/${orgId}/p/edit/`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000); 
    
    const info = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, div')).filter(el => el.innerText.includes('Описание'));
        return labels.map(l => ({
            tag: l.tagName,
            text: (l as HTMLElement).innerText.substring(0, 50),
            html: (l as HTMLElement).outerHTML.substring(0, 200),
            hasInput: !!l.querySelector('input'),
            hasTextarea: !!l.querySelector('textarea')
        }));
    });
    
    console.log('Labels with "Описание":', JSON.stringify(info, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

checkDescription();
