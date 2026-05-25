import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function probeMain() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    console.log(`Navigating to /p/edit/main...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/main`, { waitUntil: 'networkidle' });
    
    const labels = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.ya-business-input__label, label, h2, h3')).map(l => l.textContent?.trim());
    });
    
    console.log('Labels on /main:', labels);
    await page.screenshot({ path: 'data/page_main.png', fullPage: true });
    
    await browser.close();
}

probeMain();
