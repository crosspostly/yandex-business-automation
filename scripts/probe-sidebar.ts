import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

chromium.use(stealth());
dotenv.config();

async function probeSidebar() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    console.log('Clicking "О компании"...');
    await page.click('text="О компании"');
    await page.waitForTimeout(2000);
    
    const subitems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.sc-sidebar-ya-business-sidebar-item__option-text')).map(t => t.textContent);
    });
    
    console.log('Sub-items found:', subitems);
    
    // Take a screenshot of the expanded sidebar
    await page.screenshot({ path: 'data/sidebar_expanded.png' });
    
    await browser.close();
}

probeSidebar();
