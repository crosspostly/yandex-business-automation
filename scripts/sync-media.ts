import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID || '139964443366';
  const client = new YandexBusinessClient(orgId, false);
  
  // Клубика coordinates
  client.setCoordinates(56.294876, 43.998914);

  try {
    console.log('🖼️ Шаг 1: Загрузка фото по категориям...');
    
    console.log('  🏠 Экстерьер...');
    await client.uploadPhotosByCategory(['data/exterior.jpg'], 'exterior');
    
    console.log('  🛋️ Интерьер...');
    await client.uploadPhotosByCategory(['data/interior.jpg'], 'interior');
    
    console.log('  🚪 Вход...');
    await client.uploadPhotosByCategory(['data/test_photo.jpg'], 'entrance');

    console.log('\n💰 Шаг 2: Загрузка прайс-листа...');
    await client.uploadPriceList('data/ultimate_pricelist.yml');

    console.log('\n📝 Шаг 3: Создание публикации...');
    await client.createPublication(
      'Клубика — это не просто маркетинг. Это сообщество, где бизнес и блогеры находят друг друга для создания живого контента. Присоединяйтесь к нам в Нижнем Новгороде!',
      ['data/promo.jpg']
    );

    console.log('\n✨ ВСЕ ЗАДАЧИ ВЫПОЛНЕНЫ УСПЕШНО!');
    console.log('1. Фото загружены с гео-тегами (Экстерьер, Интерьер, Вход).');
    console.log('2. Прайс-лист YML синхронизирован.');
    console.log('3. Опубликован приветственный пост.');


  } catch (e) {
    console.error('❌ Ошибка в процессе:', e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
