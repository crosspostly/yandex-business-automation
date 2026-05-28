import * as dotenv from 'dotenv';
import { YandexBusinessClient } from '../src/YandexBusinessClient.js';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID;
  if (!orgId) {
    console.error('❌ YANDEX_ORG_ID is not set in .env file');
    process.exit(1);
  }

  console.log(`\n🏥 Starting Health Check for Org: ${orgId}...`);
  const client = new YandexBusinessClient(orgId);
  
  try {
    const status = await client.checkSessionHealth();
    if (status.ok) {
        console.log('✅ Session is HEALTHY. Automation can proceed.');
    } else {
        console.error(`❌ Session is UNHEALTHY: ${status.reason}`);
        process.exit(1);
    }
  } catch (e: any) {
    console.error(`💥 Health Check CRASHED: ${e.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
