import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  const orgId = process.env.YANDEX_ORG_ID || '139964443366';
  const client = new YandexBusinessClient(orgId, false);

  try {
    console.log('📝 Создаем насыщенную публикацию (Текст + 2 Фото)...');
    
    const text = 'Клубика — это место силы для локальных брендов и блогеров в Нижнем Новгороде. 🚀\n\nМы создаем условия для честных рекомендаций и качественного контента. В этой публикации мы показываем наши основные направления. Присоединяйтесь!';
    const photos = ['data/promo.jpg', 'data/story.jpg'];

    await client.createPublication(text, photos);

    console.log('\n🔍 Проверяем список публикаций после создания...');
    const page = await (client as any).getPage();
    await (client as any).safeGoto(page, `https://yandex.ru/sprav/${orgId}/p/edit/posts/`);
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'data/publications_verify.png', fullPage: true });
    
    const content = await page.content();
    if (content.includes('место силы')) {
        console.log('✨ УСПЕХ: Публикация найдена на странице и содержит наш текст!');
    } else {
        console.log('⚠️ ВНИМАНИЕ: Текст публикации не найден сразу. Возможно, идет модерация или задержка обновления.');
    }

  } catch (e) {
    console.error('❌ Ошибка:', e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
