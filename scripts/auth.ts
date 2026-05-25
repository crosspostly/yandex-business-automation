import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

chromium.use(stealth());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveAuth() {
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Yandex Passport...');
  await page.goto('https://passport.yandex.ru/auth');
  
  console.log('--- ACTION REQUIRED ---');
  console.log('Please log in manually in the browser window.');
  console.log('Once you are logged in and redirected to your dashboard, this script will save the session.');

  // Wait for the user to be logged in (URL changes from passport to something else)
  await page.waitForURL(/yandex\.ru\/(sprav|business|portal)/, { timeout: 0 });

  console.log('Logged in detected. Saving storage state...');
  
  if (!fs.existsSync(path.dirname(storagePath))) {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  }

  await context.storageState({ path: storagePath });
  console.log('Session saved to', storagePath);
  
  await browser.close();
}

saveAuth().catch(console.error);
