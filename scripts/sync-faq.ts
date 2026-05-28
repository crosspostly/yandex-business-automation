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
  console.log(`\n🚀 FAQ SYNC: Automating Q&A for "${config.niche}"...`);

  const client = new YandexBusinessClient(orgId, false);
  
  try {
    // Perform Health Check first
    const health = await client.checkSessionHealth();
    if (!health.ok) {
        console.error(`❌ Session UNHEALTHY: ${health.reason}`);
        return;
    }

    await client.syncFAQ(config.faq_templates);
    
  } catch (e: any) {
    console.error("❌ FAQ Sync failed:", e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
