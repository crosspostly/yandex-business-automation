import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function forceSave() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  console.log(`\n🚨 FORCE SAVE PROTOCOL: ${orgId}`);
  
  try {
      // Use faster 'domcontentloaded' instead of 'networkidle'
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(10000); // Wait for scripts to settle

      // Dismiss popups aggressively
      await page.evaluate(() => {
          const sels = ['.Paranja', '.ya-business-ui-popup__screen-overlay', '[class*="Modal"]'];
          sels.forEach(s => document.querySelectorAll(s).forEach(el => (el as HTMLElement).remove()));
          document.body.style.overflow = 'auto';
      });

      // 1. EMAIL - Human-like typing
      console.log("📝 Typing Email...");
      const emailInput = page.locator('input[type="text"]').filter({ hasText: /@/ }).or(page.locator('label:has-text("Электронная почта") + div input')).first();
      
      // Fallback selector if the above fails
      const emailField = await emailInput.isVisible() ? emailInput : page.locator('input[value*="@"]').first();
      
      await emailField.scrollIntoViewIfNeeded();
      await emailField.click({ delay: 500 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await emailField.type('info@klubika.ru', { delay: 100 });
      await page.keyboard.press('Tab');

      // 2. SCHEDULE - Physical click
      console.log("📝 Clicking 'Круглосуточно'...");
      const nonstopBtn = page.locator('button:has-text("Круглосуточно")').first();
      if (await nonstopBtn.isVisible()) {
          await nonstopBtn.scrollIntoViewIfNeeded();
          await nonstopBtn.click({ force: true, delay: 500 });
      }

      // 3. SAVE
      console.log("💾 Clicking SAVE...");
      const saveBtn = page.locator('button:has-text("Сохранить")').filter({ hasText: /изменения|сохранить/i }).first();
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.click({ force: true });
      
      console.log("⏳ Waiting for save to process...");
      await page.waitForTimeout(10000);

      // 4. VERIFY
      console.log("\n🔄 VERIFYING...");
      const currentEmail = await emailField.inputValue();
      console.log(`Email in field before closing: ${currentEmail}`);
      
      await page.screenshot({ path: 'data/FORCE_SAVE_RESULT.png', fullPage: true });

      if (currentEmail === 'info@klubika.ru') {
          console.log("✅ DATA ENTERED SUCCESSFULLY. Yandex processing usually takes 6-8 hours to reflect on public card, but field is filled.");
      } else {
          console.log("❌ FIELD STILL EMPTY. Attempting one last JS-based injection...");
          await emailField.evaluate(el => {
              (el as HTMLInputElement).value = 'info@klubika.ru';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
          });
          await saveBtn.click({ force: true });
          await page.waitForTimeout(5000);
      }

  } catch (e) {
      console.error("Force save failed:", e);
  } finally {
      await browser.close();
  }
}

forceSave();
