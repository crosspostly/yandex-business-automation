import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from '../src/GoogleSheetsClient.js';
import { WordstatKeywordAgent } from '../src/WordstatKeywordAgent.js';
import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import { DeepSemanticAgent } from '../src/DeepSemanticAgent.js';
import * as path from 'path';

dotenv.config();

const spreadsheetId = '1bQ558DtgqhsqbT_toq0BKY3auHaJLG-cWcAT88g89wA';

async function syncWordstat() {
    const orgId = process.env.YANDEX_ORG_ID;
    if (!orgId) throw new Error('YANDEX_ORG_ID not set');

    const sheets = new GoogleSheetsClient(spreadsheetId);
    const wordstat = new WordstatKeywordAgent();
    const semanticAgent = new DeepSemanticAgent();
    const client = new YandexBusinessClient(orgId);

    console.log('📖 Reading "Топ-услуги" from "Заказчик" tab...');
    const clientData = await sheets.getValues('Заказчик!A1:B20');
    
    // Find "Топ-услуги" row
    const serviceRow = clientData.find(row => row[0] === 'Топ-услуги');
    if (!serviceRow || !serviceRow[1]) {
        console.error('❌ "Топ-услуги" not found in "Заказчик" tab');
        return;
    }

    const rawServices = serviceRow[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    console.log(`🔎 Found ${rawServices.length} raw services: ${rawServices.join(', ')}`);

    const page = await client.getPage();
    const allKeywords: any[] = [];

    try {
        for (const rawService of rawServices) {
            console.log(`\n🧠 Sending "${rawService}" to DeepSemanticAgent...`);
            
            const semanticProfile = await semanticAgent.analyze({
                name: rawService,
                description: rawService,
                targetAudience: "Владельцы бизнеса, физлица",
                coreProblemSolved: rawService
            });

            // Take the top 2 most natural human queries instead of the raw service name
            const queriesToTest = semanticProfile.humanSearchQueries.slice(0, 2);
            
            for (const query of queriesToTest) {
                console.log(`\n🚀 Parsing keywords for natural query: "${query}" (derived from "${rawService}")...`);
                try {
                    const results = await wordstat.getKeywords(page, query);
                    console.log(`✅ Found ${results.length} keywords.`);
                    results.forEach(r => {
                        allKeywords.push([query, r.keyword, r.volume]);
                    });
                } catch (e) {
                    console.error(`❌ Failed to parse keywords for "${query}":`, e);
                }
            }
        }

        if (allKeywords.length > 0) {
            console.log(`\n✍️ Writing ${allKeywords.length} results to "SEO" tab...`);
            
            // Format: Type, Keyword, Volume
            const header = [['Группа (Услуга)', 'Ключевое слово', 'Частотность (Яндекс)']];
            const dataToWrite = [...header, ...allKeywords];

            // We'll write starting from row 7 (after the manually entered stuff) or clear it
            // Let's write to a clean area in the SEO tab
            await sheets.setValues('SEO!A6:C500', dataToWrite);
            console.log('✅ SEO tab updated with Wordstat data!');
        } else {
            console.warn('⚠️ No keywords found to write.');
        }

    } finally {
        await client.close();
    }
}

syncWordstat().catch(console.error);
