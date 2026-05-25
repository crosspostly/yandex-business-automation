import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function checkServerState() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ storageState: storagePath, viewport: { width: 1440, height: 2000 } });
  const page = await context.newPage();

  console.log(`\n🕵️ FINAL SERVER STATE AUDIT: ${orgId}`);
  
  try {
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(10000); 

      // Find ANY input that has info@klubika.ru
      const foundData = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input, textarea'));
          const emailInput = inputs.find((i: any) => i.value?.includes('info@klubika.ru'));
          const scheduleText = document.body.innerText.includes('круглосуточно') || document.body.innerText.includes('24 часа');
          
          return {
              emailValue: (emailInput as any)?.value || "NOT FOUND",
              is24h: scheduleText,
              allInputs: inputs.map((i: any) => ({ label: i.placeholder || i.name || "field", val: i.value })).filter(x => x.val)
          };
      });
      
      console.log(`\n--- ACTUAL DATA ON YANDEX SERVER ---`);
      console.log(`EMAIL FOUND: "${foundData.emailValue}"`);
      console.log(`SCHEDULE 24/7: ${foundData.is24h}`);
      console.log(`\nAll non-empty fields found:`, JSON.stringify(foundData.allInputs, null, 2));

      await page.screenshot({ path: 'data/SERVER_TRUTH.png', fullPage: true });

  } catch (e) {
      console.error("Audit failed:", e);
  } finally {
      await browser.close();
  }
}

checkServerState();
