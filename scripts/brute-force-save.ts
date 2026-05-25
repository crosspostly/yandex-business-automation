import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function bruteForce() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1440, height: 2000 } });
  const page = await context.newPage();

  console.log(`\n🕵️ BRUTE FORCE ACTIVATED: ${orgId}`);
  
  try {
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(10000); 

      // 1. CLEAR PARANJA
      await page.evaluate(() => {
          document.querySelectorAll('.Paranja, .ya-business-ui-popup__screen-overlay').forEach(el => (el as HTMLElement).remove());
      });

      // 2. FIND AND FILL EMAIL VIA HUMAN INPUT
      console.log("📝 Locating Email field...");
      // Search for the section by ID from your HTML
      const emailBlock = page.locator('#info-emails');
      const emailInput = emailBlock.locator('input[type="text"]').first();
      
      await emailInput.scrollIntoViewIfNeeded();
      await emailInput.click({ force: true });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await emailInput.type('info@klubika.ru', { delay: 100 });
      console.log("  ✓ Email typed");

      // 3. SET SCHEDULE
      console.log("📝 Setting Schedule...");
      const nonstopBtn = page.locator('button:has-text("Круглосуточно")').first();
      await nonstopBtn.scrollIntoViewIfNeeded();
      await nonstopBtn.click({ force: true });
      console.log("  ✓ Clicked 'Круглосуточно'");

      // 4. SAVE
      console.log("💾 Clicking SAVE...");
      const saveBtn = page.locator('button:has-text("Сохранить")').filter({ hasText: /изменения|сохранить/i }).first();
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.click({ force: true });
      
      console.log("⏳ Waiting for confirmation...");
      await page.waitForTimeout(10000);

      // 5. SCREENSHOT AS ABSOLUTE PROOF
      await page.screenshot({ path: 'data/FORCE_TRUTH.png', fullPage: true });
      console.log("\n📸 Proof saved to data/FORCE_TRUTH.png");

      const finalVal = await emailInput.inputValue();
      console.log(`Final Value in DOM: ${finalVal}`);

      if (finalVal === 'info@klubika.ru') {
          console.log("✅ THE FIELD IS NOW FILLED LOCALLY. CHECKING IF SAVED...");
      }

  } catch (e) {
      console.error("Brute force failed:", e);
  } finally {
      await browser.close();
  }
}

bruteForce();
