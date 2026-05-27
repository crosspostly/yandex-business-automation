import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID || '139964443366';
  // dryRun = false because we want to see if it actually works
  const client = new YandexBusinessClient(orgId, false);

  try {
    console.log('🚀 Starting ULTIMATE SYNC (YML + Photo SEO)...');

    // 1. Upload YML
    console.log('\n📦 Phase 1: Uploading Price List (YML)...');
    await client.uploadPriceList('data/pricelist.yml');

    // 2. Set Photo ALT tags (SEO)
    console.log('\n🖼️ Phase 2: Setting Photo ALT tags (SEO)...');
    const interiorSEO = [
        'Интерьер офиса Клубика в Нижнем Новгороде',
        'Рабочее пространство маркетингового агентства Клубика',
        'Клубика: место, где создается контент'
    ];
    await client.setPhotoDescriptions('interior', interiorSEO);

    console.log('\n✨ Sync complete. Check the dashboard for changes.');

  } catch (e) {
    console.error('❌ Sync error:', e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
