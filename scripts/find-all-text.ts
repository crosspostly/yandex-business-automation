import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function findAllText() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const textData = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent?.trim();
            if (text && text.length > 2) {
                nodes.push({
                    text,
                    parent: node.parentElement?.tagName,
                    className: node.parentElement?.className
                });
            }
        }
        return nodes;
    });
    
    console.log(JSON.stringify(textData, null, 2));
    await browser.close();
}

findAllText();
