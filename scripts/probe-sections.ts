import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

async function probeSections() {
  const orgId = process.env.YANDEX_ORG_ID;
  const storagePath = path.resolve(process.cwd(), 'cookies/yandex.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  try {
    const url = `https://yandex.ru/sprav/${orgId}/p/edit/main`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); 
    
    const dismissPopups = async () => {
        await page.evaluate(() => {
            const selectors = ['.ya-business-ui-popup__screen-overlay', '.CrossPlatformModal', '.Modal-Wrapper'];
            selectors.forEach(s => document.querySelectorAll(s).forEach(el => (el as HTMLElement).style.display = 'none'));
        });
    };

    const baseUrl = `https://yandex.ru/sprav/${orgId}/p/edit/`;
    const sections = [
        { name: 'Данные', url: baseUrl },
        { name: 'Фото', url: baseUrl + 'photos/' },
        { name: 'Товары', url: baseUrl + 'price-lists/' },
        { name: 'Публикации', url: baseUrl + 'posts/' },
        { name: 'Истории', url: baseUrl + 'stories/' },
        { name: 'События', url: baseUrl + 'events/' },
        { name: 'Акции', url: baseUrl + 'promotions/' },
        { name: 'Сайт', url: `https://yandex.ru/business/crm/company/${orgId}/site` }
    ];

    for (const section of sections) {
        console.log(`\n--- Probing section: ${section.name} (${section.url}) ---`);
        try {
            await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(5000);
            
            const stateInfo = await page.evaluate(() => {
                const results = [];
                const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                let node;
                while(node = walk.nextNode()) {
                    if (node.textContent?.includes('Описание')) {
                        const parent = node.parentElement;
                        results.push({
                            text: node.textContent,
                            html: parent?.outerHTML.substring(0, 200),
                            hasInput: !!parent?.querySelector('input, textarea')
                        });
                    }
                }
                return results;
            });
            
            if (stateInfo.length > 0) {
                console.log(`  "Описание" found ${stateInfo.length} times`);
                for (const si of stateInfo) {
                    if (si.hasInput) {
                        console.log('  [!!!] FIELD FOUND:', si.html);
                    }
                }
            } else {
                console.log('  "Описание" not found');
            }
            
            await page.screenshot({ path: `data/probe_${section.name}.png` });
        } catch (e) {
            console.log(`  Failed to probe ${section.name}: ${e}`);
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

probeSections();
