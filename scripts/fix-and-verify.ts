import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function fixAndVerify() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  // Back to headless: true since we are in a CLI env without XServer
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`\n🛠 SURGICAL FIX FOR ORG: ${orgId}`);
  
  try {
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(5000);

      // Dismiss any paranja/modal
      await page.evaluate(() => {
          document.querySelectorAll('.Paranja, .ya-business-ui-popup__screen-overlay').forEach(el => (el as HTMLElement).style.display = 'none');
          document.body.style.overflow = 'auto';
      });

      // 1. FILL EMAIL
      console.log("📝 Filling Email...");
      // More specific selector based on user HTML
      const emailInput = page.locator('#info-emails input[type="text"], .InfoEmails input').first();
      
      await emailInput.scrollIntoViewIfNeeded();
      await emailInput.click({ force: true });
      await emailInput.fill('info@klubika.ru');
      
      // Force change events
      await emailInput.evaluate(el => {
          (el as HTMLInputElement).value = 'info@klubika.ru';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
      });

      // 2. FILL WORK HOURS
      console.log("📝 Filling Work Hours (24/7)...");
      // Try multiple ways to click 24/7
      const scheduleButtons = ["Круглосуточно", "Ежедневно"];
      for (const btnText of scheduleButtons) {
          const btn = page.locator(`button:has-text("${btnText}")`).first();
          if (await btn.isVisible()) {
              await btn.evaluate(el => (el as HTMLElement).click());
              console.log(`  ✓ Clicked '${btnText}' via evaluate`);
          }
      }

      // 3. SAVE
      console.log("💾 Clicking SAVE...");
      const saveBtn = page.locator('button:has-text("Сохранить")').filter({ hasText: /изменения|сохранить/i }).first();
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.evaluate(el => (el as HTMLElement).click());
      
      console.log("⏳ Waiting for save processing...");
      await page.waitForTimeout(10000);

      // 4. VERIFY BY READING BACK
      console.log("\n🔍 VERIFYING...");
      // Re-navigating to ensure we see what's on the server
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);

      const savedEmail = await page.locator('#info-emails input').first().inputValue();
      const bodyText = await page.innerText('body');
      const is24h = bodyText.includes('круглосуточно') || bodyText.includes('24 часа');

      console.log(`Final Email on Server: "${savedEmail}"`);
      console.log(`Schedule contains 24h: ${is24h}`);

      await page.screenshot({ path: 'data/REAL_FIX_PROOF.png', fullPage: true });

      if (savedEmail === 'info@klubika.ru' && is24h) {
          console.log("\n✅ SUCCESS: Changes are confirmed on Yandex side.");
      } else {
          console.log("\n❌ FAILURE: Data did not persist. Checking for errors on page...");
          const error = await page.locator('.Error, .Alert_type_error').first().innerText().catch(() => "No specific error found");
          console.log(`Page Error: ${error}`);
      }

  } catch (e) {
      console.error("Error during fix:", e);
  } finally {
      await browser.close();
  }
}

fixAndVerify();
