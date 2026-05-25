import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function debugDescription() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const details = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, .ya-business-input__label, span, div')).filter(l => l.textContent?.includes('Описание'));
        return labels.map(l => ({
            text: l.textContent,
            tagName: l.tagName,
            className: l.className,
            parentClass: l.parentElement?.className,
            grandParentClass: l.parentElement?.parentElement?.className,
            hasInput: !!l.querySelector('input, textarea'),
            nextInput: !!l.nextElementSibling?.querySelector('input, textarea') || l.parentElement?.querySelector('input, textarea')
        }));
    });
    
    console.log(JSON.stringify(details, null, 2));
    await browser.close();
}

debugDescription();
