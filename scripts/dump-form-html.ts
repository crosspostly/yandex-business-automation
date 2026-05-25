/**
 * dump-form-html.ts
 * Opens /p/edit/ Данные page, scrolls through, closes all modals,
 * and dumps HTML for analysis.
 */
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function main() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-http2', '--no-sandbox'],
  });

  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log('Opening /p/edit/ (Данные)...');
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(5000);

    // Hide all modals via JS
    await page.evaluate(() => {
      const els = document.querySelectorAll(
        '[data-state="popup-visible"], .InfoModal, .InfoModal-Overlay, .InfoModal-Content, .ya-business-ui-popup__screen-overlay'
      );
      els.forEach(el => (el as HTMLElement).style.display = 'none');
    });

    // Screenshot top of page
    await page.screenshot({ path: 'data/form_01_top.png', fullPage: false });

    // Scroll through page and screenshot each section
    for (let y = 0; y <= 6000; y += 800) {
      await page.evaluate(pos => window.scrollTo(0, pos), y);
      await page.waitForTimeout(600);
      // Close any InfoModal that appeared
      await page.evaluate(() => {
        document.querySelectorAll('.InfoModal, .InfoModal-Overlay').forEach(el => (el as HTMLElement).style.display = 'none');
      });
    }

    // Back to top and take full screenshot  
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'data/form_02_full.png', fullPage: true });

    // Dump ALL inputs, textareas, contenteditable elements
    const allEditable = await page.evaluate(() => {
      const result: object[] = [];
      
      // Standard inputs/textareas
      document.querySelectorAll('input, textarea').forEach(el => {
        const inp = el as HTMLInputElement;
        const rect = el.getBoundingClientRect();
        result.push({
          tag: el.tagName,
          type: inp.type || 'text',
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          value: inp.value?.substring(0, 80),
          classes: inp.className?.substring(0, 100),
          offsetTop: (el as HTMLElement).offsetTop,
          hidden: inp.type === 'hidden',
        });
      });
      
      // ContentEditable divs
      document.querySelectorAll('[contenteditable="true"], [contenteditable=""]').forEach(el => {
        result.push({
          tag: el.tagName + '[contenteditable]',
          text: el.textContent?.substring(0, 80),
          classes: (el as HTMLElement).className?.substring(0, 100),
          offsetTop: (el as HTMLElement).offsetTop,
          id: el.id,
          placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '',
        });
      });
      
      return result.sort((a: any, b: any) => (a.offsetTop || 0) - (b.offsetTop || 0));
    });

    console.log('\n=== ALL EDITABLE ELEMENTS (sorted by position) ===');
    console.log(JSON.stringify(allEditable, null, 2));

    // Also look for "Описание" and "Сайт" section headers
    const sectionInfo = await page.evaluate(() => {
      const sections: object[] = [];
      
      // Find all h2, h3, labels, section titles
      document.querySelectorAll('h1, h2, h3, h4, label, [class*="title"], [class*="Title"], [class*="header"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 100 && text.length > 0) {
          sections.push({
            tag: el.tagName,
            text,
            offsetTop: (el as HTMLElement).offsetTop,
            classes: (el as HTMLElement).className?.substring(0, 80),
          });
        }
      });
      
      return sections.sort((a: any, b: any) => (a.offsetTop || 0) - (b.offsetTop || 0));
    });

    console.log('\n=== PAGE SECTIONS/LABELS ===');
    sectionInfo.forEach((s: any) => {
      console.log(`  y=${s.offsetTop} <${s.tag}> "${s.text}"`);
    });

    // Save full HTML for offline analysis
    const html = await page.content();
    fs.writeFileSync('data/edit_page_full.html', html);
    console.log('\nSaved: data/edit_page_full.html');
    console.log('Screenshots: data/form_01_top.png, data/form_02_full.png');

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
