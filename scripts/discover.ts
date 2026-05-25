/**
 * discover.ts
 * Navigates to sprav companies list and discovers all org IDs and their edit URLs
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

async function discover() {
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ru-RU',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    console.log('Opening Yandex Business organizations list...');
    await page.goto('https://yandex.ru/sprav/companies', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'data/discover_01_companies.png', fullPage: true });
    console.log(`URL: ${page.url()}`);

    // Find all organization links
    const orgLinks = await page.locator('a[href*="/sprav/"], a[href*="edit"]').all();
    console.log(`\nFound ${orgLinks.length} links`);
    
    const orgs: { name: string; href: string }[] = [];
    for (const link of orgLinks) {
      const href = await link.getAttribute('href').catch(() => '');
      const text = await link.innerText().catch(() => '');
      if (href && (href.includes('/edit') || href.match(/\/sprav\/\d+/))) {
        orgs.push({ name: text.trim().substring(0, 60), href });
      }
    }

    console.log('\nOrganization links found:');
    for (const org of orgs) {
      console.log(`  "${org.name}" → ${org.href}`);
    }

    // Also look for data attributes with IDs
    const orgItems = await page.locator('[data-id], [data-company-id], [data-org-id]').all();
    console.log(`\nElements with data IDs: ${orgItems.length}`);
    for (const item of orgItems.slice(0, 10)) {
      const id = await item.getAttribute('data-id').catch(() => '') ||
                 await item.getAttribute('data-company-id').catch(() => '') ||
                 await item.getAttribute('data-org-id').catch(() => '');
      const text = await item.innerText().catch(() => '').then(t => t.substring(0, 50));
      if (id) console.log(`  [${id}] "${text}"`);
    }

    // Try to find edit links by clicking first org
    console.log('\nLooking for org cards...');
    const cards = await page.locator('.CompanyCard, .company-card, [class*="company"], [class*="Company"]').all();
    console.log(`Company cards: ${cards.length}`);

    // Get page HTML to find org IDs
    const html = await page.content();
    const idMatches = html.match(/\/sprav\/(\d+)/g) || [];
    const uniqueIds = [...new Set(idMatches.map(m => m.replace('/sprav/', '')))];
    console.log(`\nOrg IDs found in page HTML: ${uniqueIds.join(', ')}`);

    // Try clicking first organization
    const firstOrgLink = page.locator('a[href*="/sprav/"]').first();
    if (await firstOrgLink.isVisible()) {
      const href = await firstOrgLink.getAttribute('href');
      console.log(`\nFirst org link: ${href}`);
      
      // Navigate to it
      await firstOrgLink.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'data/discover_02_first_org.png', fullPage: true });
      console.log(`After click URL: ${page.url()}`);
    }

    // Try navigating to edit via network idle
    const orgId = process.env.YANDEX_ORG_ID!;
    console.log(`\nAttempting direct navigation to org ${orgId} with networkidle...`);
    
    // Use longer timeout and networkidle
    await page.goto(`https://yandex.ru/sprav/${orgId}/edit/common`, { 
      waitUntil: 'load', 
      timeout: 60000 
    });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'data/discover_03_edit.png', fullPage: true });
    console.log(`Edit page URL: ${page.url()}`);
    console.log(`Edit page title: ${await page.title()}`);

    const bodySnippet = await page.locator('body').innerText().catch(() => 'N/A');
    console.log(`Body (first 300 chars): ${bodySnippet.substring(0, 300)}`);

  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'data/discover_error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

discover().catch(console.error);
