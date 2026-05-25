import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

async function ultimateTest() {
    const orgId = process.env.YANDEX_ORG_ID!;
    const client = new YandexBusinessClient(orgId, false); // Real run
    
    console.log("================================================");
    console.log("🔥 THE ULTIMATE SYNC: POPULATING ALL SECTIONS 🔥");
    console.log("================================================");
    
    try {
        // 1. DATA & SCHEDULE
        console.log("\n[1/7] Syncing Basic Info & Schedule...");
        await client.updateBasicInfo({
            "names": { "ru": "Клубика", "en": "Klubika" },
            "description": "Клубика — маркетинговое агентство в Нижнем Новгороде. Мы внедряем ИИ-автоматизацию, развиваем Яндекс Карты и приводим клиентов в ваш бизнес.",
            "emails": ["info@klubika.ru"],
            "website": "https://vk.com/nanobloger",
            "workInterval": "Круглосуточно"
        });

        // 2. LOGO
        console.log("\n[2/7] Syncing Logo...");
        // Usually logo is a specific category in photos or on main page
        await client.uploadPhotosByCategory(['data/logo.png'], 'logo');

        // 3. CATEGORIZED PHOTOS
        console.log("\n[3/7] Syncing Interior & Exterior...");
        await client.uploadPhotosByCategory(['data/interior.jpg'], 'interior');
        await client.uploadPhotosByCategory(['data/exterior.jpg'], 'exterior');

        // 4. PRICE LIST (PRODUCTS)
        console.log("\n[4/7] Syncing Price List...");
        // Reusing existing generator logic in memory
        const catalogPath = path.resolve('data/ultimate_pricelist.yml');
        fs.writeFileSync(catalogPath, `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-05-25 20:30">
  <shop>
    <name>Клубика</name>
    <company>Клубика</company>
    <url>https://vk.com/nanobloger</url>
    <currencies><currency id="RUR" rate="1"/></currencies>
    <categories>
      <category id="1">Маркетинг</category>
    </categories>
    <offers>
      <offer id="1" available="true">
        <name>Упаковка Яндекс Карт 2026</name>
        <price>35000</price>
        <currencyId>RUR</currencyId>
        <categoryId>1</categoryId>
        <description>Полная автоматизация, SEO и ведение вашей карточки экспертами и ИИ.</description>
      </offer>
    </offers>
  </shop>
</yml_catalog>`);
        await client.uploadPriceList(catalogPath);

        // 5. PROMOTIONS & EVENTS
        console.log("\n[5/7] Syncing Lead Gen (Promos & Events)...");
        await client.createPromotion({
            title: "Скидка 50% на старт",
            description: "Для новых клиентов Клубики. Получите первый месяц ведения со скидкой 50%.",
            photoPath: 'data/promo.jpg'
        });

        // 6. STORIES
        console.log("\n[6/7] Syncing Stories...");
        await client.uploadStory('data/story.jpg');

        // 7. VIDEO (Using photos category tag)
        console.log("\n[7/7] Syncing Video Placeholder...");
        // In 2026 Yandex treats high-quality JPEGs as video covers
        await client.uploadPhotosByCategory(['data/story.jpg'], 'video');

        console.log("\n================================================");
        console.log("🏆 ALL SECTIONS SYNCED SUCCESSFULLY!");
        console.log("================================================");

    } catch (e) {
        console.error("❌ ULTIMATE SYNC FAILED:", e);
    } finally {
        await client.close();
    }
}

ultimateTest();
