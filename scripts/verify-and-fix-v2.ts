import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();
chromium.use(stealth());

async function run() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1440, height: 2000 } });
  const page = await context.newPage();

  console.log(`\n🚀 STARTING REAL-TIME FIX FOR ${orgId}...`);
  
  try {
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(10000);

      if (page.url().includes('passport')) {
          console.log("❌ SESSION EXPIRED. Please run 'npm run auth' first.");
          return;
      }

      // 1. CLEAR OVERLAYS
      await page.evaluate(() => {
          document.querySelectorAll('.Paranja, [class*="Popup"], [class*="Modal"]').forEach(el => (el as HTMLElement).remove());
          document.body.style.overflow = 'auto';
      });

      // 2. FILL EMAIL - STEP BY STEP
      console.log("📝 Locating Email input via .InfoEmails...");
      const input = page.locator('.InfoEmails input[type="text"]').first();
      
      await input.scrollIntoViewIfNeeded();
      await input.click({ force: true, delay: 500 });
      
      // Select and clear
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(500);
      
      // Type as human
      console.log("⌨️ Typing info@klubika.ru...");
      await page.keyboard.type('info@klubika.ru', { delay: 100 });
      await page.keyboard.press('Enter');

      // 3. SET SCHEDULE
      console.log("🕒 Activating 24/7 Schedule...");
      const nonstopBtn = page.locator('button:has-text("Круглосуточно")').first();
      if (await nonstopBtn.isVisible()) {
          await nonstopBtn.click({ force: true });
          console.log("  ✅ Clicked 'Круглосуточно'");
      }

      // 4. SAVE AND LOG RESPONSE
      console.log("💾 Clicking SAVE...");
      const saveBtn = page.locator('button:has-text("Сохранить")').filter({ hasText: /изменения|сохранить/i }).first();
      
      // Capture the moment of save
      await page.screenshot({ path: 'data/BEFORE_SAVE.png' });
      await saveBtn.click({ force: true });
      
      console.log("⏳ Waiting for server response (15s)...");
      await page.waitForTimeout(15000);

      // 5. RE-VERIFY FROM DOM
      const currentVal = await input.inputValue();
      console.log(`\n--- RESULT ---`);
      console.log(`Value in DOM now: "${currentVal}"`);
      
      await page.screenshot({ path: 'data/AFTER_SAVE.png', fullPage: true });
      console.log("📸 Screenshots: data/BEFORE_SAVE.png and data/AFTER_SAVE.png");

      if (currentVal === 'info@klubika.ru') {
          console.log("🏆 SUCCESS: Field is filled and saved in current session.");
      } else {
          console.log("⚠️ FIELD STILL EMPTY. The UI might be blocked by moderation or a hidden error.");
          const errorMsg = await page.innerText('.Alert_type_error, .Error').catch(() => "No error text found");
          console.log(`Reported Error: ${errorMsg}`);
      }

  } catch (e) {
      console.error("Critical failure:", e);
  } finally {
      await browser.close();
  }
}

run();
