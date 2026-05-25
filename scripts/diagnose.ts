/**
 * diagnose.ts
 * Opens the Yandex Business edit page and screenshots it to understand current state.
 */
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnose() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  if (!orgId) {
    console.error('❌ YANDEX_ORG_ID not set');
    process.exit(1);
  }

  if (!fs.existsSync(storagePath)) {
    console.error('❌ cookies/yandex.json not found. Run: npm run import-cookies');
    process.exit(1);
  }

  console.log(`🔍 Diagnosing org ${orgId}...`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // First test: visit yandex.ru to verify auth
    console.log('1. Testing auth on yandex.ru...');
    await page.goto('https://yandex.ru', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: 'data/diag_01_yandex_home.png', fullPage: false });
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // Check if logged in
    const loginBtn = await page.locator('[data-id="login"]').isVisible().catch(() => false);
    console.log(`   Login button visible: ${loginBtn} (should be false if logged in)`);

    // Second test: visit sprav.yandex.ru  
    console.log('\n2. Visiting sprav.yandex.ru...');
    await page.goto('https://sprav.yandex.ru', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'data/diag_02_sprav_home.png', fullPage: false });
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // Third test: visit org page
    console.log(`\n3. Visiting org ${orgId} edit page...`);
    await page.goto(`https://yandex.ru/sprav/${orgId}/edit/common`, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'data/diag_03_edit_page.png', fullPage: true });
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // Check page content
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const first500 = bodyText.substring(0, 500);
    console.log(`   Body preview: ${first500}`);

    // Check for common elements
    const checks = [
      { name: 'input[name="name"]', sel: 'input[name="name"]' },
      { name: '.input__control', sel: '.input__control' },
      { name: 'form', sel: 'form' },
      { name: '#name', sel: '#name' },
      { name: 'passport redirect', sel: 'body:has-text("passport")' },
      { name: 'captcha', sel: '.CheckboxCaptcha, .smartcaptcha' },
    ];

    console.log('\n4. Element presence:');
    for (const c of checks) {
      const visible = await page.locator(c.sel).first().isVisible().catch(() => false);
      console.log(`   ${visible ? '✓' : '✗'} ${c.name}`);
    }

    // Try the business.yandex.ru API endpoint  
    console.log('\n5. Checking business.yandex.ru...');
    await page.goto(`https://business.yandex.ru`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'data/diag_04_business.png', fullPage: false });
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // Try direct sprav API 
    console.log('\n6. Direct sprav API...');
    const apiResponse = await page.evaluate(async (orgId) => {
      try {
        const r = await fetch(`https://sprav-ext-rc.yandex.ru/v1/get?id=${orgId}&lang=ru`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, ok: r.ok };
      } catch (e) {
        return { error: String(e) };
      }
    }, orgId);
    console.log('   API response:', JSON.stringify(apiResponse));

  } catch (err) {
    console.error('❌ Error:', err);
    await page.screenshot({ path: 'data/diag_error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('\n✅ Screenshots saved to data/ directory');
  }
}

diagnose().catch(console.error);
