import * as dotenv from 'dotenv';
import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID!;
  const configPath = path.resolve(process.cwd(), 'data/niche_config.json');

  if (!fs.existsSync(configPath)) {
    console.error('❌ Niche config not found. Run scripts/niche-analyst.ts first.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const keywords = config.lsi_keywords;

  console.log(`\n🖼️ MEDIA DESIGNER: SEO Optimization for Photos (Org: ${orgId})`);
  console.log(`🎯 Using LSI Keywords for ALT tags: ${keywords.length} found.`);

  const client = new YandexBusinessClient(orgId, false);
  
  try {
    const health = await client.checkSessionHealth();
    if (!health.ok) {
        console.error(`❌ Session UNHEALTHY: ${health.reason}`);
        return;
    }

    const categories = ['interior', 'exterior', 'entrance', 'equipment'];
    
    for (const category of categories) {
        console.log(`\n🔹 Processing category: "${category}"...`);
        
        // Generate unique SEO descriptions for this category using our keywords
        const descriptions = keywords.map(kw => {
            const prefix = category === 'interior' ? 'Интерьер нашего офиса: ' : 
                           category === 'exterior' ? 'Вид здания снаружи: ' : 
                           category === 'entrance' ? 'Вход в маркетинговое агентство: ' : '';
            return `${prefix}${kw}. Работаем профессионально в 2026 году.`;
        });

        // Shuffle descriptions to avoid repetitive patterns
        const shuffled = descriptions.sort(() => Math.random() - 0.5);

        await client.setPhotoDescriptions(category, shuffled);
    }

    console.log('\n✅ SEO Media Optimization complete.');
  } catch (e: any) {
    console.error("❌ Media SEO Sync failed:", e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
