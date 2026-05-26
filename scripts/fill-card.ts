/**
 * fill-card.ts
 * 
 * Master script: fills the Клубика card using YandexBusinessClient.
 * 
 * Based on fields_inspection.json, the edit page (/p/edit/) has these labels:
 *   - "Обычное название" → INPUT (text) = "Клубика"
 *   - "Короткое название" → INPUT (text) = ""
 *   - "Описание" → INPUT (text) ← NOT textarea!
 *   - "ВКонтакте" → INPUT (text) = "nanobloger"  
 *   - "Телефон" → INPUT (text) = "+7 (977) 330-77-20"
 *   - "Электронная почта" → INPUT (text) = ""
 *   - "Основная рубрика" → INPUT (search) = "Маркетинговые услуги"
 *   - "Время работы" → INPUT (text) = "круглосуточно"
 * 
 * The website field is inside "Сайт и социальные сети" section and may 
 * need an "Добавить" button click to reveal it.
 */
import { YandexBusinessClient, type OrganizationData } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const orgData: OrganizationData = {
  name: 'Клубика',
  description: 'Клубика — закрытый клуб локального маркетинга в Нижнем Новгороде. Соединяем местный бизнес с контент-мейкерами: заведения приглашают блогеров на гостевые визиты и дегустации, блогеры делятся честными впечатлениями с аудиторией. Без рекламных бюджетов — только живые рекомендации.',
  website: 'https://clubika.ru',
  phones: ['+7 (977) 330-77-20'],
  emails: ['NLPkem@yandex.ru'],
  socials: {
    vk: 'https://vk.com/shekhovpavel',
  },
  workInterval: 'круглосуточно',
};

async function main() {
  const orgId = process.env.YANDEX_ORG_ID;
  if (!orgId) throw new Error('YANDEX_ORG_ID not set in .env');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  🚀 Клубика — заполнение карточки Яндекс Бизнес');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Org ID:   ${orgId}`);
  console.log(`  Dry run:  ${DRY_RUN ? 'ДА' : 'НЕТ'}`);
  console.log('');

  const client = new YandexBusinessClient(orgId, DRY_RUN);

  // Set geo coordinates for СНТ Дружба-2, Нижний Новгород
  client.setCoordinates(56.2965, 43.9361);

  try {
    // ── Step 1: Update basic info ────────────────────────────────────────
    console.log('📋 Шаг 1: Заполнение основных данных...');
    await client.updateBasicInfo(orgData);
    console.log('  ✅ Основные данные обновлены\n');

  } catch (err) {
    console.error('\n❌ Ошибка:', err);
    throw err;
  } finally {
    await client.close();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Карточка Клубика обновлена!');
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(console.error);
