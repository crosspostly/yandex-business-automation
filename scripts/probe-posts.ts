import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function probePosts() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  console.log(`Navigating to posts page for ${orgId}...`);
  await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/posts/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      className: b.className
    }));
  });
  console.log('Buttons on posts page:', JSON.stringify(buttons, null, 2));

  // Check for tabs or dropdowns
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, [role="tab"]')).map(l => ({
      text: l.textContent?.trim(),
      role: l.getAttribute('role'),
      href: l.getAttribute('href')
    }));
  });
  console.log('Navigation elements on posts page:', JSON.stringify(links, null, 2));

  await page.screenshot({ path: 'data/posts_debug.png', fullPage: true });
  await browser.close();
}

probePosts();
