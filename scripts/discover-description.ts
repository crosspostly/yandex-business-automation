import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

chromium.use(stealth());
dotenv.config();

async function discoverDescription() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    const sections = [
        'edit/',
        'edit/details/',
        'edit/features/',
        'edit/posts/',
        'edit/about/'
    ];
    
    for (const section of sections) {
        const url = `https://yandex.ru/sprav/${orgId}/p/${section}`;
        console.log(`Checking ${url}...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);
            
            const found = await page.evaluate(() => {
                const labels = Array.from(document.querySelectorAll('label, .ya-business-input__label, span, h2, h3'));
                const desc = labels.find(l => l.textContent?.includes('Описание') && !l.closest('.PhoneControl'));
                const textarea = document.querySelector('textarea');
                return {
                    hasDescriptionLabel: !!desc,
                    descLabelText: desc?.textContent,
                    textareaCount: document.querySelectorAll('textarea').length,
                    textareas: Array.from(document.querySelectorAll('textarea')).map(t => (t as any).placeholder || (t as any).name)
                };
            });
            
            console.log(`  Results:`, found);
            if (found.hasDescriptionLabel || (found as any).textareaCount > 0) {
                await page.screenshot({ path: `data/found_${section.replace(/\//g, '_')}.png`, fullPage: true });
            }
        } catch (e) {
            console.log(`  Failed to check ${section}`);
        }
    }
    
    await browser.close();
}

discoverDescription();
