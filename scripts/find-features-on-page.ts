import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function findFeatures() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  console.log(`Navigating to info page for ${orgId}...`);
  await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const featuresFound = await page.evaluate(() => {
    const results = [];
    const textToSearch = ["Оплата картой", "предварительная запись", "онлайн консультации", "акции", "скидки"];
    for (const text of textToSearch) {
      const found = document.body.innerText.includes(text);
      results.push({ text, found });
    }
    return results;
  });
  
  console.log('Features search results on /p/edit/:', JSON.stringify(featuresFound, null, 2));

  // Also check all links on page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim(),
      href: a.getAttribute('href')
    })).filter(l => l.text && (l.text.includes('Особенности') || l.text.includes('Данные') || l.text.includes('Атрибуты')));
  });
  console.log('Relevant links on page:', JSON.stringify(links, null, 2));

  await browser.close();
}

findFeatures();
