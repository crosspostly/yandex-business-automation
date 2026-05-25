import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

chromium.use(stealth());
dotenv.config();

async function checkPosts() {
    const orgId = process.env.YANDEX_ORG_ID;
    const storageStatePath = path.resolve(process.cwd(), 'cookies/yandex.json');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    
    console.log(`Checking posts for organization ${orgId}...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/posts/`, { waitUntil: 'networkidle' });
    
    const posts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.PublicationCard, [class*="PostCard"]')).map(p => ({
            text: p.textContent?.trim().substring(0, 100),
            hasImage: !!p.querySelector('img')
        }));
    });
    
    console.log('Posts found:', JSON.stringify(posts, null, 2));
    await page.screenshot({ path: 'data/posts_verification.png', fullPage: true });
    
    await browser.close();
}

checkPosts();
