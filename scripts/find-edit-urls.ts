/**
 * find-edit-urls.ts
 * Properly closes the notification popup (clicks × not "Включить"), 
 * then clicks "О компании" via JS and captures the resulting URL.
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

  // Track all navigation URLs
  const navigations: string[] = [];
  page.on('framenavigated', f => {
    if (f === page.mainFrame()) navigations.push(f.url());
  });

  try {
    console.log('Opening dashboard...');
    await page.goto(`https://yandex.ru/sprav/${orgId}/p/edit/main`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(5000);

    // Inspect the popup structure
    console.log('\n=== POPUP ANALYSIS ===');
    const popupInfo = await page.evaluate(() => {
      const popup = document.querySelector('[data-state="popup-visible"]');
      if (!popup) return 'No popup found';
      
      const buttons = Array.from(popup.querySelectorAll('button'));
      return {
        popupClass: popup.className,
        buttons: buttons.map(b => ({
          text: b.textContent?.trim(),
          ariaLabel: b.getAttribute('aria-label'),
          classes: b.className,
          type: b.type,
        }))
      };
    });
    console.log(JSON.stringify(popupInfo, null, 2));

    await page.screenshot({ path: 'data/url_01_popup.png' });

    // Close popup by clicking × (the CLOSE button, not the action button)
    // The × button should have aria-label or be a specific element
    console.log('\n=== CLOSING POPUP ===');
    
    // Strategy: find and click the cross/close button inside the popup
    // NOT the primary action button ("Включить уведомления")
    const closed = await page.evaluate(() => {
      const popup = document.querySelector('[data-state="popup-visible"]');
      if (!popup) return 'no popup';
      
      // Find close button - it's usually the one WITHOUT primary action styling
      // Cross buttons often have these patterns:
      const crossSelectors = [
        '.ya-business-ui-cross-button',
        'button[class*="cross"]',
        'button[class*="close"]',
        'button[class*="Cross"]',
        'button[class*="Close"]',
        '[class*="modal__close"]',
        '[class*="popup__close"]',
      ];
      
      for (const sel of crossSelectors) {
        const btn = popup.querySelector(sel) as HTMLElement;
        if (btn) {
          btn.click();
          return `clicked: ${sel}`;
        }
      }
      
      // Look for SVG icons (× symbols are often SVGs)
      const svgButtons = Array.from(popup.querySelectorAll('button')).filter(b => {
        return b.querySelector('svg') && !b.textContent?.trim();
      });
      if (svgButtons.length > 0) {
        (svgButtons[0] as HTMLElement).click();
        return 'clicked svg button';
      }
      
      // The LAST button or first with no text often is the close
      const buttons = Array.from(popup.querySelectorAll('button'));
      // Skip "Включить уведомления" (the action button) - find the X
      const nonActionBtn = buttons.find(b => {
        const text = b.textContent?.trim() || '';
        return text.length === 0 || text === '×' || text === '✕' || text.length < 3;
      });
      if (nonActionBtn) {
        (nonActionBtn as HTMLElement).click();
        return `clicked non-action button: "${nonActionBtn.textContent?.trim()}"`;
      }
      
      return 'no close button found';
    });
    console.log('Close result:', closed);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'data/url_02_after_close.png' });
    
    // Check if popup is gone
    const popupGone = await page.locator('[data-state="popup-visible"]').isVisible().catch(() => false);
    console.log('Popup still visible:', popupGone);
    
    if (popupGone) {
      // Force hide via JS
      await page.evaluate(() => {
        const overlay = document.querySelector('.ya-business-ui-popup__screen-overlay') as HTMLElement;
        const modal = document.querySelector('[data-state="popup-visible"]') as HTMLElement;
        if (overlay) overlay.style.display = 'none';
        if (modal) modal.style.display = 'none';
      });
      console.log('Hidden popup via JS');
    }

    await page.waitForTimeout(500);

    // Now find all sidebar links and their hrefs
    console.log('\n=== SIDEBAR LINKS ===');
    const sidebarLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/sprav/"], a[href*="/edit"]'));
      return links.map(a => ({
        text: a.textContent?.trim().substring(0, 50),
        href: a.getAttribute('href'),
        dataName: a.getAttribute('data-name'),
      })).filter(l => l.href && l.href.includes('edit'));
    });
    console.log(JSON.stringify(sidebarLinks, null, 2));

    // Click "О компании" via JS
    console.log('\n=== CLICKING О КОМПАНИИ ===');
    const clickResult = await page.evaluate(() => {
      // Find by data-name attribute (seen in earlier logs: "sidebar-ratinghistory")
      // Look for О компании
      const allLinks = Array.from(document.querySelectorAll('a'));
      const aboutLink = allLinks.find(a => a.textContent?.includes('О компании'));
      if (aboutLink) {
        const href = aboutLink.getAttribute('href');
        (aboutLink as HTMLElement).click();
        return { clicked: true, href, text: aboutLink.textContent?.trim() };
      }
      return { clicked: false };
    });
    console.log('Click result:', JSON.stringify(clickResult));
    
    await page.waitForTimeout(5000);
    const urlAfterClick = page.url();
    console.log('URL after click:', urlAfterClick);
    await page.screenshot({ path: 'data/url_03_after_about_click.png', fullPage: true });

    // Inspect page inputs
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
        tag: el.tagName,
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        type: (el as HTMLInputElement).type,
        value: (el as HTMLInputElement).value?.substring(0, 50),
      }));
    });
    console.log('\n=== INPUTS ON PAGE ===');
    console.log(JSON.stringify(inputs, null, 2));

    // Try navigating to the URL directly
    if (urlAfterClick !== `https://yandex.ru/sprav/${orgId}/p/edit/main`) {
      console.log(`\n✅ О компании URL found: ${urlAfterClick}`);
    } else {
      console.log('\n⚠️ Still on main page after clicking О компании');
    }
    
    console.log('\n=== ALL NAVIGATIONS DURING SESSION ===');
    navigations.forEach(u => console.log(' -', u));

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
