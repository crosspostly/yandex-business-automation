import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function mapState() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const url = `https://yandex.ru/sprav/${orgId}/p/edit/`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); 
    
    const paths = await page.evaluate(`() => {
        const state = window.__PRELOAD_DATA || window.__INITIAL_STATE__;
        if (!state) return ["NOT FOUND"];
        
        const foundPaths = [];
        const traverse = (obj, path, depth) => {
            if (depth > 8) return;
            if (!obj || typeof obj !== 'object') return;
            
            if (obj.names && obj.displayName) {
                foundPaths.push(path);
            }
            
            try {
                Object.keys(obj).forEach(key => {
                    traverse(obj[key], path ? path + "." + key : key, depth + 1);
                });
            } catch (e) {}
        };
        
        traverse(state, "", 0);
        return foundPaths;
    }`);
    
    console.log('Paths to company info:', paths);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

mapState();
