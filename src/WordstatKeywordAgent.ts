import { Page, Locator } from 'playwright';
import { HumanBehavior } from './HumanBehavior.js';
import fs from 'fs';

export interface KeywordResult {
    keyword: string;
    volume: number;
}

export class WordstatKeywordAgent {
    constructor() {}

    /**
     * Navigates to Wordstat and searches for keywords.
     */
    async getKeywords(page: Page, query: string): Promise<KeywordResult[]> {
        console.log(`🔍 Wordstat: Starting search for "${query}"...`);
        
        // Ensure session is "awake"
        try {
            console.log('  🛡️ Waking up session on yandex.ru...');
            await page.goto('https://yandex.ru/', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await HumanBehavior.sleep(2000, 4000);
        } catch (e) {}

        // Try .ru first if we are using a Russian proxy, otherwise fallback to .com
        let targetUrl = 'https://wordstat.yandex.ru/';
        
        try {
            console.log(`Targeting: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log(`⚠️ Failed to load .ru, trying .com...`);
            targetUrl = 'https://wordstat.yandex.com/';
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }

        await HumanBehavior.sleep(3000, 5000);
        
        let html = await page.content();
        let title = await page.title();
        if (title.includes('403') || title.includes('Forbidden') || (html.includes('403') && html.length < 5000)) {
            console.log("❌ Blocked on current domain. Trying the alternative...");
            targetUrl = targetUrl.includes('.ru') ? 'https://wordstat.yandex.com/' : 'https://wordstat.yandex.ru/';
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await HumanBehavior.sleep(3000, 5000);
            html = await page.content();
            title = await page.title();
        }

        console.log(`Current Page URL: ${page.url()}`);
        await page.screenshot({ path: `data/ws_attempt_final.png` });

        if (title.includes('403') || title.includes('Forbidden') || (html.includes('403') && html.length < 5000)) {
            throw new Error(`Access denied (403) on ${page.url()}. Check your proxy/IP.`);
        }

        // Setup Network Interception
        const interceptedResults: KeywordResult[] = [];
        let apiCallFound = false;

        const responseHandler = async (response: any) => {
            if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
                try {
                    const json = await response.json();
                    
                    // Does it look like wordstat data?
                    let items = json.data || json.results || json.words || json.top || json.items || [];
                    if (!Array.isArray(items) && json.data && Array.isArray(json.data.top)) {
                        items = json.data.top;
                    }
                    
                    if (Array.isArray(items) && items.length > 0) {
                        let validItemsFound = 0;
                        for (const item of items) {
                            const phrase = item.phrase || item.keyword || item.text || item.query;
                            const volume = item.shows || item.volume || item.count || item.showsCount;
                            if (phrase && volume !== undefined) {
                                interceptedResults.push({ keyword: phrase, volume: Number(volume) });
                                validItemsFound++;
                            }
                        }
                        if (validItemsFound > 0) {
                            apiCallFound = true;
                            console.log(`  📡 Intercepted ${validItemsFound} keywords from API: ${response.url()}`);
                        }
                    }
                } catch (e) {}
            }
        };

        page.on('response', responseHandler);

        // Fill search query
        const inputSelectors = [
            'input[placeholder*="фраза"]',
            'input[placeholder*="слово"]',
            'textarea[class*="SearchLine-TextArea"]',
            'textarea',
            '.textinput__control',
            '.SearchLine-TextArea',
            '[class*="input__control"]'
        ];

        let searchInput: Locator | null = null;
        for (const selector of inputSelectors) {
            const loc = page.locator(selector).first();
            if (await loc.isVisible()) {
                searchInput = loc;
                console.log(`Found search input with selector: ${selector}`);
                break;
            }
        }

        if (searchInput) {
            await HumanBehavior.naturalClick(page, searchInput);
            await HumanBehavior.sleep(1000, 2000);
            
            console.log("  ⌨️ Typing query...");
            await searchInput.fill(query);
            await HumanBehavior.sleep(500, 1000);
            
            await page.screenshot({ path: `data/ws_03_query_typed.png` });
            
            console.log("  🖱️ Clicking search button...");
            const searchBtn = page.locator('.wordstat__search-button, button:has-text("Найти"), .search-button').first();
            await searchBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            
            if (await searchBtn.isVisible() && !(await searchBtn.isDisabled())) {
                await HumanBehavior.naturalClick(page, searchBtn);
            } else {
                console.log("  ⌨️ Pressing Enter...");
                await page.keyboard.press('Enter');
            }
        }
 else {
            console.log("⚠️ Search input NOT found. Dumping frame structure and HTML...");
            const frameCount = page.frames().length;
            console.log(`Main Page URL: ${page.url()}`);
            console.log(`Total Frames: ${frameCount}`);
            
            for (const [idx, frame] of page.frames().entries()) {
                console.log(`Frame #${idx}: ${frame.url()}`);
            }

            const html = await page.content();
            console.log(`HTML Preview (first 1000 chars): ${html.substring(0, 1000)}`);
            
            await page.screenshot({ path: `data/ws_error_no_input.png` });
            throw new Error(`Could not find Wordstat search input. Page contains ${html.length} bytes of HTML.`);
        }

        await HumanBehavior.sleep(5000, 10000);
        
        // Dismiss any popups or tours
        await page.keyboard.press('Escape');
        const closeBtn = page.locator('button:has-text("Понятно"), button:has-text("Закрыть"), [class*="close"], [class*="Close"]').first();
        if (await closeBtn.isVisible()) {
            await HumanBehavior.naturalClick(page, closeBtn);
            await HumanBehavior.sleep(1000, 2000);
        }

        // Handle region confirmation if it appears
        const confirmBtn = page.locator('button:has-text("Подтвердить"), .regions-tree__select button').first();
        if (await confirmBtn.isVisible()) {
            console.log("  🌍 Confirming regions...");
            await HumanBehavior.naturalClick(page, confirmBtn);
            await HumanBehavior.sleep(2000, 4000);
        }

        // Wait for loading to finish
        console.log("  ⏳ Waiting for results to load (extended timeout)...");
        await page.locator('.wordstat_loading, .wordstat__spin').waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
        
        await HumanBehavior.sleep(3000, 5000);

        // Wait for table or rows to appear
        await page.locator('[class*="Table"], [class*="Row"], .wordstat-results__row').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

        await page.screenshot({ path: `data/ws_04_after_search_press.png` });
        
        // Check for Captcha again after search
        await this.handleCaptcha(page);

        page.removeListener('response', responseHandler);

        if (interceptedResults.length > 0) {
            console.log(`  ✅ Extracted ${interceptedResults.length} results via API!`);
            // Deduplicate
            const unique = new Map();
            interceptedResults.forEach(item => {
                if (!unique.has(item.keyword) || unique.get(item.keyword) < item.volume) {
                    unique.set(item.keyword, item.volume);
                }
            });
            return Array.from(unique.entries()).map(([keyword, volume]) => ({ keyword, volume }))
                .sort((a, b) => b.volume - a.volume);
        }

        console.log("  ⚠️ No API results intercepted. Fallback to DOM extraction...");

        // Extract results
        console.log("Extracting results with header-based logic...");
        const results: KeywordResult[] = await page.evaluate(() => {
            const data: any[] = [];
            
            // Strategy 1: Find the table headers
            const headers = Array.from(document.querySelectorAll('div, span, th')).filter(el => 
                el.textContent?.includes('Показов') || el.textContent?.includes('Запросы')
            );
            
            if (headers.length > 0) {
                // Find the nearest container that has many children
                let container = headers[0].parentElement;
                while (container && container.children.length < 5 && container !== document.body) {
                    container = container.parentElement;
                }
                
                if (container) {
                    const elements = Array.from(container.querySelectorAll('div, tr, span')).filter(el => {
                        return el.children.length === 0 && el.textContent?.trim();
                    });
                    
                    let phrase = "";
                    for (let i = 0; i < elements.length; i++) {
                        const text = elements[i].textContent?.trim() || "";
                        if (!phrase && text.length > 2 && !/^\d[\d\s]*$/.test(text)) {
                            phrase = text;
                        } else if (phrase && /^\d[\d\s]*$/.test(text)) {
                            const volume = parseInt(text.replace(/\s/g, '')) || 0;
                            if (volume > 0 && !phrase.includes('Вордстат') && !phrase.includes('Яндекс') && phrase.length < 100) {
                                data.push({ keyword: phrase, volume });
                            }
                            phrase = "";
                        }
                    }
                }
            }

            // Strategy 2: If Strategy 1 failed or found too little, look for any text followed by numbers
            if (data.length < 5) {
                const rows = Array.from(document.querySelectorAll('[class*="Row"], [class*="row"], tr'));
                for (const row of rows) {
                    const cells = Array.from(row.querySelectorAll('div, span, td')).filter(el => el.children.length === 0 || (el.children.length === 1 && el.firstChild?.nodeType === 3));
                    let phrase = "";
                    for (const cell of cells) {
                        const text = cell.textContent?.trim() || "";
                        if (!phrase && text.length > 2 && !/^\d[\d\s]*$/.test(text)) {
                            phrase = text;
                        } else if (phrase && /^\d[\d\s]*$/.test(text)) {
                            const volume = parseInt(text.replace(/\s/g, '')) || 0;
                            if (volume > 0 && !phrase.includes('Вордстат') && phrase.length < 100) {
                                data.push({ keyword: phrase, volume });
                            }
                            phrase = "";
                        }
                    }
                }
            }
            
            // Deduplicate
            const unique = new Map();
            data.forEach(item => {
                if (!unique.has(item.keyword) || unique.get(item.keyword) < item.volume) {
                    unique.set(item.keyword, item.volume);
                }
            });
            
            return Array.from(unique.entries()).map(([keyword, volume]) => ({ keyword, volume }))
                .sort((a, b) => b.volume - a.volume);
        });

        if (results.length === 0) {
            console.log("⚠️ No keywords found with generic logic. Dumping HTML for debug...");
            const htmlResults = await page.content();
            const debugPath = `data/ws_debug_results_${Date.now()}.html`;
            fs.writeFileSync(debugPath, htmlResults);
            console.log(`Debug HTML saved to ${debugPath}`);
            
            // Fallback to specific selectors if generic fails
            const specificRows = page.locator('.wordstat-table__row, .table__row, [class*="Table-Row"]');
            const count = await specificRows.count();
            for (let i = 0; i < Math.min(count, 50); i++) {
                const row = specificRows.nth(i);
                const phrase = await row.locator('[class*="phrase"], [class*="Keyword"]').first().innerText().catch(() => "");
                const volume = await row.locator('[class*="count"], [class*="Volume"]').first().innerText().catch(() => "0");
                if (phrase) {
                    results.push({
                        keyword: phrase.trim(),
                        volume: parseInt(volume.replace(/\s/g, '') || "0")
                    });
                }
            }
        }

        return results;
    }

    /**
     * Detects and handles Yandex SmartCaptcha.
     */
    async handleCaptcha(page: Page) {
        console.log("Checking for captcha...");
        
        const checkFrames = async (target: Page | any) => {
            const checkboxSelectors = [
                '.CheckboxCaptcha-Button',
                '.smartcaptcha-checkbox',
                '.CheckboxCaptcha-Anchor',
                '#captcha-container button',
                '[class*="checkbox"]',
                '.smart-captcha__checkbox',
                '.smartcaptcha-body',
                '[class*="SmartCaptcha"]'
            ];

            for (const cbSel of checkboxSelectors) {
                try {
                    const cb = target.locator(cbSel).first();
                    if (await cb.isVisible()) {
                        console.log(`✅ Found checkbox: ${cbSel}. Clicking...`);
                        if (target.click) {
                             await target.locator(cbSel).first().click();
                        } else {
                             await HumanBehavior.naturalClick(page, cb);
                        }
                        return true;
                    }
                } catch (e) {}
            }
            return false;
        };

        // Check main page
        if (await checkFrames(page)) {
            await HumanBehavior.sleep(3000, 5000);
            return;
        }

        // Deep iframe check
        const frames = page.frames();
        console.log(`Checking ${frames.length} frames for captcha...`);
        for (const frame of frames) {
            if (await checkFrames(frame)) {
                console.log(`Solved captcha in frame: ${frame.url()}`);
                await HumanBehavior.sleep(3000, 5000);
                return;
            }
        }
    }
}
