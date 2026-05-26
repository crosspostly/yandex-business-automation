import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID || '139964443366';
  const client = new YandexBusinessClient(orgId, false);

  try {
    console.log('🚀 Начинаем обновление системной истории "Как к вам пройти"...');
    
    // Обновляем именно шаблон "Как пройти"
    // Добавляем кнопку и ссылку для теста
    await client.updateDirectionStory(
        ['data/interior.jpg'], 
        'Зайти в гости', 
        'https://vk.com/nanobloger'
    );

    console.log('\n✨ ТЕСТ ЗАВЕРШЕН!');

  } catch (e) {
    console.error('❌ Ошибка:', e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
