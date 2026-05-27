import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

chromium.use(stealth());

async function main() {
  const orgId = '139964443366';
  const url = `https://yandex.ru/sprav/${orgId}/p/edit/stories/`;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  console.log(`🔍 Deep-inspecting Stories page: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Look for anything that looks like a "plus" button or "new story"
    const allButtons = await page.locator('button, [role="button"]').all();
    console.log(`   Total buttons/roles found: ${allButtons.length}`);
    
    for (const btn of allButtons) {
        const text = await btn.innerText();
        const html = await btn.evaluate(el => el.outerHTML);
        if (text.toLowerCase().includes('истор') || html.toLowerCase().includes('plus') || html.toLowerCase().includes('add') || html.toLowerCase().includes('create')) {
            console.log(`   🔘 [POTENTIAL BUTTON] text="${text}" html="${html.substring(0, 150)}..."`);
        }
    }

    // Capture the main content area HTML
    const mainContent = page.locator('main, [class*="content"], [class*="Content"], [class*="container"]').first();
    if (await mainContent.isVisible()) {
        const html = await mainContent.evaluate(el => el.outerHTML);
        fs.writeFileSync('data/stories_content.html', html);
        console.log('   ✅ Main content HTML saved to data/stories_content.html');
    }

    await page.screenshot({ path: 'data/stories_final_check.png', fullPage: true });

  } catch (e) {
    console.error(`❌ Error:`, e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
