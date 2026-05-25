import { YandexBusinessClient, OrganizationData } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runTest() {
  const orgId = process.env.YANDEX_ORG_ID;
  if (!orgId) {
    console.error('❌ YANDEX_ORG_ID is not set in .env');
    return;
  }

  const client = new YandexBusinessClient(orgId, path.resolve(process.cwd(), 'cookies/yandex.json'), false);

  try {
    // 1. Read current data
    console.log('--- Phase 1: Reading current data ---');
    const currentData = await client.getBasicInfo();
    console.log('Current Data:', JSON.stringify(currentData, null, 2));

    // 2. Prepare test update
    console.log('\n--- Phase 2: Updating data ---');
    const testUpdate: OrganizationData = {
      description: (currentData.description || '') + ' (updated by automation ' + new Date().toISOString() + ')',
    };
    
    // If name is missing or we want to ensure it stays the same
    if (currentData.name) {
      testUpdate.name = currentData.name;
    }

    // Try a real update (or change to true for dry run)
    await client.updateBasicInfo(testUpdate);

    // 2.3 Test Photo Upload
    console.log('\n--- Phase 2.3: Uploading a test photo ---');
    await client.updatePhotos(['data/test_photo.jpg']);

    // 2.5 Test Publication
    console.log('\n--- Phase 2.5: Creating a test publication ---');
    await client.createPublication(
        'Мы обновили нашу карточку! Теперь здесь будет больше актуальной информации о наших услугах в 2026 году. #маркетинг #клубика',
        ['data/test_photo.jpg']
    );

    console.log('\n⏳ Waiting 15 seconds for backend synchronization...');
    await new Promise(r => setTimeout(r, 15000));

    // 3. Verify
    console.log('\n--- Phase 3: Verifying change ---');
    const updatedData = await client.getBasicInfo();
    console.log('Updated Data:', JSON.stringify(updatedData, null, 2));

    if (updatedData.description?.includes('updated by automation')) {
      console.log('\n✨ SUCCESS: Card updated and verified!');
    } else {
      console.log('\n⚠️  Verification failed: Description does not contain the expected update.');
    }

  } catch (error) {
    console.error('\n❌ Test workflow failed:', error);
  } finally {
    await client.close();
  }
}

runTest();
