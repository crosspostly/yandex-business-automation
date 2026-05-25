import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function mapMenu() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const baseUrl = `https://yandex.ru/sprav/${orgId}/p/edit/`;
    const urls = [
        baseUrl + 'main',
        baseUrl,
        baseUrl + 'photos/',
        baseUrl + 'price-lists/',
        baseUrl + 'posts/',
        baseUrl + 'reviews/',
        `https://yandex.ru/business/crm/company/${orgId}/site`
    ];

    for (const url of urls) {
        console.log(`\n--- Probing ${url} ---`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        
        const info = await page.evaluate(() => {
            const results = [];
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
            let node;
            while(node = walk.nextNode()) {
                if (node.textContent?.includes('Описание')) {
                    const parent = node.parentElement;
                    results.push({
                        text: node.textContent,
                        html: parent?.outerHTML.substring(0, 300),
                        hasInput: !!parent?.querySelector('input, textarea')
                    });
                }
            }
            return results;
        });
        
        if (info.length > 0) {
            console.log(`  Found "Описание" ${info.length} times:`);
            info.forEach(i => {
                if (i.hasInput) console.log('  [!!!] FIELD FOUND:', i.html);
                else console.log('  Text found:', i.text.trim().substring(0, 100));
            });
        } else {
            console.log('  "Описание" not found on this page.');
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

mapMenu();
