import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function main() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  const urls = [
    `https://yandex.ru/sprav/${orgId}/p/edit/features/`,
    `https://yandex.ru/sprav/${orgId}/p/edit/attributes/`,
    `https://yandex.ru/sprav/${orgId}/p/edit/details/`,
    `https://yandex.ru/sprav/${orgId}/p/edit/info/`,
  ];

  for (const url of urls) {
    console.log(`Checking ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const content = await page.innerText('body');
    if (!content.includes('Страница не найдена') && !content.includes('404')) {
      console.log(`✅ FOUND: ${url} (Title: ${title})`);
      // fs.writeFileSync(`data/probe_${url.split('/').slice(-2, -1)[0]}.txt`, content);
    } else {
      console.log(`❌ 404: ${url}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
