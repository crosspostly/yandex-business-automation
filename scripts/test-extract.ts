import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function testExtract() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const url = `https://yandex.ru/sprav/${orgId}/p/edit/`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); 
    
    const data = await page.evaluate(() => {
        const state = (window as any).__PRELOAD_DATA || (window as any).__INITIAL_STATE__;
        if (!state) return null;
        
        const company = state.companyData?.info?.company || state.info?.company;
        if (!company) return { raw: state };
        
        return {
            name: company.names?.[0]?.value?.value || company.displayName,
            description: company.description,
            website: company.urls?.[0]?.value,
            phones: company.phones?.map((p: any) => p.formatted || p.number),
            socials: company.urls?.filter((u: any) => u.type === 'social').map((u: any) => u.value)
        };
    });
    
    console.log('Extracted Data:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

testExtract();
