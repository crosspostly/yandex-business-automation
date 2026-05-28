import * as dotenv from 'dotenv';
import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID!;
  console.log(`\n📸 MEDIA DESIGNER: Uploading & Geo-tagging (Org: ${orgId})`);

  const client = new YandexBusinessClient(orgId, false);
  // Set coordinates for KLUBIKA (Nizhny Novgorod)
  client.setCoordinates(56.294876, 43.998914);
  
  try {
    const health = await client.checkSessionHealth();
    if (!health.ok) {
        console.error(`❌ Session UNHEALTHY: ${health.reason}`);
        return;
    }

    // 1. Upload Photos by Category
    console.log('\n🚀 Starting category-based uploads...');
    
    if (fs.existsSync('data/interior.jpg')) {
        console.log('🔹 Uploading Interior...');
        await client.uploadPhotosByCategory(['data/interior.jpg'], 'interior');
    }

    if (fs.existsSync('data/exterior.jpg')) {
        console.log('🔹 Uploading Exterior...');
        await client.uploadPhotosByCategory(['data/exterior.jpg'], 'exterior');
    }

    if (fs.existsSync('data/promo.jpg')) {
        console.log('🔹 Uploading Entrance/Promo...');
        await client.uploadPhotosByCategory(['data/promo.jpg'], 'entrance');
    }

    console.log('\n✅ Uploads complete. Waiting for Yandex to process images...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for images to appear in DOM

    // 2. SEO Optimize (ALT tags)
    console.log('\n🎯 Triggering SEO ALT-tag optimization...');
    // We can just run our existing optimization script via shell or import logic.
    // For simplicity and robustness, I'll call the optimization method directly here.
    
    const configPath = path.resolve(process.cwd(), 'data/niche_config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const keywords = config.lsi_keywords;

        const categories = ['interior', 'exterior', 'entrance'];
        for (const cat of categories) {
            const descriptions = keywords.map(kw => `Наше маркетинговое агентство: ${kw}. Работаем в 2026 году.`);
            const shuffled = descriptions.sort(() => Math.random() - 0.5);
            await client.setPhotoDescriptions(cat, shuffled);
        }
    }

    console.log('\n✨ ALL DONE: Photos uploaded, geo-tagged, and SEO-optimized!');
  } catch (e: any) {
    console.error("❌ Media Cycle failed:", e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
