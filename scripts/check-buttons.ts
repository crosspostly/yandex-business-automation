import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function checkButtons() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  console.log(`Navigating to posts page...`);
  await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/posts/`, { waitUntil: 'networkidle' });
  
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      html: b.outerHTML.substring(0, 100)
    }));
  });
  console.log('Visible buttons:', JSON.stringify(buttons, null, 2));

  await page.screenshot({ path: 'data/verify_buttons.png' });
  await browser.close();
}

checkButtons();
