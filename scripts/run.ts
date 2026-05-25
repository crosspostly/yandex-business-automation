import * as dotenv from 'dotenv';
import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const orgId = process.env.YANDEX_ORG_ID;
  if (!orgId) {
    console.error('YANDEX_ORG_ID is not set in .env file');
    process.exit(1);
  }

  const dataPath = path.resolve(process.cwd(), 'data/organization.json');
  const templatePath = path.resolve(process.cwd(), 'data/organization-template.json');
  
  if (!fs.existsSync(dataPath)) {
    console.warn('Data file not found at', dataPath, '. Using template...');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    fs.writeFileSync(dataPath, JSON.stringify(template, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const client = new YandexBusinessClient(orgId);
  
  try {
    await client.updateBasicInfo(data);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
