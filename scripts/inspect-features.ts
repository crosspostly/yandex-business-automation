import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';

chromium.use(stealth());

async function inspectFeatures() {
    const orgId = process.env.YANDEX_ORG_ID;
    const browser = await chromium.launch({ headless: true });
    const storageStatePath = 'cookies/yandex.json';
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();

    console.log(`Navigating to features page for ${orgId}...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/features/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    const html = await page.content();
    fs.writeFileSync('data/features_page.html', html);
    
    const text = await page.innerText('body');
    fs.writeFileSync('data/features_text.txt', text);
    
    console.log('Saved features page to data/features_page.html and data/features_text.txt');
    await browser.close();
}

inspectFeatures();
