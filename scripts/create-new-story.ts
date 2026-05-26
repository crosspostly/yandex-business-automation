import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID || '139964443366';
  const client = new YandexBusinessClient(orgId, false);

  try {
    console.log('🚀 Создаем НОВУЮ историю через модальное окно...');
    
    // Используем уникальное название
    const name = `Май ${new Date().getHours()}:${new Date().getMinutes()}`;
    await client.addStory(name, ['data/promo.jpg']);

    console.log(`\n✨ ЗАДАЧА ВЫПОЛНЕНА! История "${name}" создана.`);

  } catch (e) {
    console.error('❌ Ошибка:', e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
