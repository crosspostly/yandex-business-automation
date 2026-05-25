import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function findTextarea() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const textareas = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('textarea')).map(t => ({
            placeholder: t.placeholder,
            label: t.closest('.ya-business-input')?.querySelector('.ya-business-input__label')?.textContent,
            value: t.value
        }));
    });
    
    console.log('Textareas found:', JSON.stringify(textareas, null, 2));
    await browser.close();
}

findTextarea();
