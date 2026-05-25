import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function inspectFields() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    console.log(`Navigating to organization ${orgId}...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
    
    // Scroll to bottom to ensure all fields are loaded
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            let distance = 200;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    const fields = await page.evaluate(() => {
        const results: any[] = [];
        // Find all labels
        const labels = document.querySelectorAll('.ya-business-input__label, label, .InfoBlockCarcass-Title');
        labels.forEach(l => {
            const text = l.textContent?.trim();
            const parent = l.closest('.ya-business-input, .Section, .InfoBlockCarcass');
            const input = parent?.querySelector('input, textarea, [contenteditable="true"]');
            results.push({
                label: text,
                tagName: input?.tagName,
                type: (input as any)?.type,
                placeholder: (input as any)?.placeholder,
                value: (input as any)?.value || input?.textContent,
                className: input?.className
            });
        });
        return results;
    });
    
    fs.writeFileSync('data/fields_inspection.json', JSON.stringify(fields, null, 2));
    console.log('Fields inspection saved to data/fields_inspection.json');
    
    await browser.close();
}

inspectFields();
