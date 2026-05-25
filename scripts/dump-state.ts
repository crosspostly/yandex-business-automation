import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function dumpState() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    console.log(`Navigating to organization ${orgId}...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);
    
    const state = await page.evaluate(() => {
        return window.__PRELOAD_DATA || window.__INITIAL_STATE__ || null;
    });
    
    if (state) {
        fs.writeFileSync('data/full_state.json', JSON.stringify(state, null, 2));
        console.log('State dumped to data/full_state.json');
    } else {
        console.log('State not found');
    }
    
    await browser.close();
}

dumpState();
