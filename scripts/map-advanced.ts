import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function mapAdvancedFeatures() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    const pages = [
        { name: 'edit', url: `https://yandex.ru/sprav/${orgId}/p/edit/` },
        { name: 'price-lists', url: `https://yandex.ru/sprav/${orgId}/p/edit/price-lists/` },
        { name: 'features', url: `https://yandex.ru/sprav/${orgId}/p/edit/features/` }
    ];

    const report: any = {};

    for (const p of pages) {
        console.log(`Mapping ${p.name}...`);
        try {
            await page.goto(p.url, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);
            
            report[p.name] = await page.evaluate(() => {
                const labels = Array.from(document.querySelectorAll('label, .ya-business-input__label, h2, h3, .InfoBlockCarcass-Title'));
                const inputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'));
                const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
                
                return {
                    labels: labels.map(l => l.textContent?.trim()).filter(t => t && t.length > 2),
                    inputCount: inputs.length,
                    buttons: buttons.filter(b => b && b.length > 2)
                };
            });
            await page.screenshot({ path: `data/map_${p.name}.png`, fullPage: true });
        } catch (e) {
            console.log(`Failed to map ${p.name}`);
        }
    }

    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}

mapAdvancedFeatures();
