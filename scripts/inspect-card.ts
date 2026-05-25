/**
 * inspect-card.ts
 * Opens the Клубика edit page with the correct URL and screenshots all sections.
 * Also extracts current field values.
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

async function inspectCard() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  console.log(`🔍 Inspecting org card: ${orgId}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  // Intercept all network requests to find API calls
  const apiCalls: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('sprav') || url.includes('business')) {
      apiCalls.push(`${response.status()} ${response.request().method()} ${url}`);
    }
  });

  try {
    // Use the CORRECT URL pattern found from discovery
    const editUrl = `https://yandex.ru/sprav/${orgId}/p/edit/main`;
    console.log(`\n→ Opening: ${editUrl}`);
    
    // Don't wait for load - SPA won't fire it properly. Use domcontentloaded.
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`  URL after goto: ${page.url()}`);
    
    // Wait for React to render
    console.log('  Waiting for React hydration...');
    await page.waitForTimeout(8000);
    
    // Screenshot #1: initial state
    await page.screenshot({ path: 'data/inspect_01_initial.png', fullPage: true });
    console.log(`  → Screenshot: data/inspect_01_initial.png`);
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    // Check for redirect to passport
    if (page.url().includes('passport')) {
      console.error('❌ Redirected to passport - cookies expired!');
      return;
    }

    // Try to wait for form elements
    const possibleSelectors = [
      'input',
      'textarea', 
      'form',
      '[class*="form"]',
      '[class*="Form"]',
      '[class*="edit"]',
      '[class*="Edit"]',
      'button',
    ];

    for (const sel of possibleSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) console.log(`  Found ${count}x ${sel}`);
    }

    // Extract current values from all visible inputs
    console.log('\n📋 Current form values:');
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const name = await input.getAttribute('name').catch(() => '');
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      const value = await input.inputValue().catch(() => '');
      const type = await input.getAttribute('type').catch(() => 'text');
      if (type !== 'hidden') {
        console.log(`  input[name="${name}" placeholder="${placeholder}"] = "${value}"`);
      }
    }

    const textareas = await page.locator('textarea').all();
    for (const ta of textareas) {
      const name = await ta.getAttribute('name').catch(() => '');
      const value = await ta.inputValue().catch(() => '');
      console.log(`  textarea[name="${name}"] = "${value.substring(0, 100)}"`);
    }

    // Scroll down and screenshot more
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'data/inspect_02_scrolled.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'data/inspect_03_bottom.png', fullPage: false });

    // Full page screenshot
    await page.screenshot({ path: 'data/inspect_full.png', fullPage: true });
    console.log('\n  → Full screenshot: data/inspect_full.png');

    // Get page HTML for analysis
    const html = await page.content();
    fs.writeFileSync('data/inspect_page.html', html);
    console.log('  → HTML saved: data/inspect_page.html');

    // API calls log
    console.log('\n📡 API calls intercepted:');
    for (const call of apiCalls.slice(0, 20)) {
      console.log(`  ${call}`);
    }

    // Try the "fill profile" URL too
    const fillUrl = `https://yandex.ru/sprav/${orgId}/p/edit?show-fill-profile=true`;
    console.log(`\n→ Trying fill-profile URL: ${fillUrl}`);
    await page.goto(fillUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'data/inspect_04_fill_profile.png', fullPage: true });
    console.log(`  URL: ${page.url()}`);

  } catch (err) {
    console.error('❌ Error:', err);
    await page.screenshot({ path: `data/inspect_error_${Date.now()}.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

inspectCard().catch(console.error);
