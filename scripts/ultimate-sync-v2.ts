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

  console.log(`\n🚀 ULTIMATE FULL-CARD SYNC (DIRECT MODE) FOR ${orgId}...`);
  
  try {
      // 1. BASIC INFO & SCHEDULE
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(10000);
      console.log("[1] Syncing Info...");
      
      const fill = async (label: string, val: string) => {
          const input = page.locator(`div:has-text("${label}")`).locator('input, textarea').first();
          if (await input.isVisible()) {
              await input.scrollIntoViewIfNeeded();
              await input.click({ force: true });
              await page.keyboard.press('Control+A');
              await page.keyboard.press('Backspace');
              await page.keyboard.type(val, { delay: 50 });
          }
      };

      await fill('Обычное название', 'Клубика');
      await fill('Описание', 'Клубика — ИИ-агентство №1 в маркетинге. Автоматизируем продажи через Яндекс Карты и нейросети.');
      await fill('Электронная почта', 'info@klubika.ru');
      
      const nonstop = page.locator('button:has-text("Круглосуточно")').first();
      if (await nonstop.isVisible()) await nonstop.evaluate(el => (el as HTMLElement).click());

      await page.locator('button:has-text("Сохранить")').first().evaluate(el => (el as HTMLElement).click());
      console.log("  ✓ Basic Info Saved");

      // 2. LOGO & PHOTOS
      console.log("\n[2] Syncing Media...");
      const uploadMedia = async (tag: string, file: string) => {
          await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/photos?tag=${tag}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(5000);
          const input = page.locator('input[type="file"]').first();
          if (await input.isVisible()) {
              await input.setInputFiles(path.resolve(file));
              console.log(`  ✓ Uploaded ${file} to ${tag}`);
              await page.waitForTimeout(5000);
          }
      };

      await uploadMedia('logo', 'data/logo.png');
      await uploadMedia('interior', 'data/interior.jpg');
      await uploadMedia('exterior', 'data/exterior.jpg');

      // 3. PRICE LIST
      console.log("\n[3] Syncing Price List...");
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/price-lists/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const ymlInput = page.locator('input[type="file"]').first();
      if (await ymlInput.isVisible()) {
          await ymlInput.setInputFiles(path.resolve('data/ultimate_pricelist.yml'));
          console.log("  ✓ YML Uploaded");
          await page.waitForTimeout(5000);
          const saveYml = page.locator('button:has-text("Загрузить"), button:has-text("Сохранить")').filter({ hasNotText: /XLS/i }).first();
          if (await saveYml.isVisible()) await saveYml.evaluate(el => (el as HTMLElement).click());
      }

      // 4. PROMOTIONS
      console.log("\n[4] Syncing Promotions...");
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/promotions/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const addPromo = page.locator('button:has-text("Добавить акцию"), button:has-text("Создать")').first();
      if (await addPromo.isVisible()) {
          await addPromo.evaluate(el => (el as HTMLElement).click());
          await page.waitForTimeout(2000);
          await page.keyboard.type('Скидка 50% от ИИ');
          await page.keyboard.press('Tab');
          await page.keyboard.type('Дарим скидку 50% на первый месяц автоматизации вашей карточки!');
          const promoFile = page.locator('input[type="file"]').first();
          await promoFile.setInputFiles(path.resolve('data/promo.jpg'));
          await page.waitForTimeout(3000);
          await page.locator('button:has-text("Опубликовать")').first().evaluate(el => (el as HTMLElement).click());
          console.log("  ✓ Promotion Created");
      }

      // 5. STORIES
      console.log("\n[5] Syncing Stories...");
      await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/stories/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const addStory = page.locator('button:has-text("Добавить"), button:has-text("Создать")').first();
      if (await addStory.isVisible()) {
          await addStory.evaluate(el => (el as HTMLElement).click());
          await page.waitForTimeout(2000);
          await page.locator('input[type="file"]').first().setInputFiles(path.resolve('data/story.jpg'));
          await page.waitForTimeout(5000);
          await page.locator('button:has-text("Опубликовать")').first().evaluate(el => (el as HTMLElement).click());
          console.log("  ✓ Story Published");
      }

      console.log("\n🏁 ALL SECTIONS PROCESSED.");
      await page.screenshot({ path: 'data/ULTIMATE_RESULT.png', fullPage: true });

  } catch (e) {
      console.error("Sync failed:", e);
  } finally {
      await browser.close();
  }
}

run();
