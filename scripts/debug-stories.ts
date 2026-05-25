import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function debugStories() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  console.log(`Navigating to stories page for ${orgId}...`);
  await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/stories/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  fs.writeFileSync('data/stories_page.html', html);
  
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      className: b.className,
      id: b.id
    }));
  });
  console.log('Buttons on page:', JSON.stringify(buttons, null, 2));

  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type,
      className: i.className
    }));
  });
  console.log('Inputs on page:', JSON.stringify(inputs, null, 2));

  await page.screenshot({ path: 'data/stories_debug.png', fullPage: true });
  await browser.close();
}

debugStories();
