import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

chromium.use(stealth());
dotenv.config();

async function probePages() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    // 1. Stories
    console.log('Navigating to Stories...');
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/stories/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const storiesHtml = await page.content();
    fs.writeFileSync('data/stories_page.html', storiesHtml);
    await page.screenshot({ path: 'data/stories_page.png', fullPage: true });

    // 2. Goods/Price-lists
    console.log('Navigating to Price-lists...');
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/price-lists/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const priceListsHtml = await page.content();
    fs.writeFileSync('data/price_lists_page.html', priceListsHtml);
    await page.screenshot({ path: 'data/price_lists_page.png', fullPage: true });
    
    await browser.close();
}

probePages();
