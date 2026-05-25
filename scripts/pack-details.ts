import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const orgId = process.env.YANDEX_ORG_ID!;
    const client = new YandexBusinessClient(orgId, false); // Real run to update details
    
    console.log("=== UPDATING DETAILED ORGANIZATION SETTINGS ===");
    
    try {
        // 1. Basic Info & Work Hours
        await client.updateBasicInfo({
            "workInterval": "Ежедневно 24 часа",
            "names": {
                "ru": "Клубика",
                "en": "Klubika Agency"
            },
            "emails": ["info@klubika.ru"],
            "socials": {
                "ВКонтакте": "nanobloger",
                "Telegram": "@nanobloger"
            },
            "rubrics": ["Маркетинговые услуги", "Рекламное агентство"]
        });

        // 2. Detailed Features
        await client.updateFeatures({
            "Посещение с животными": "разрешено со всеми животными",
            "Подарочный сертификат": true,
            "Способ оплаты": "оплата картой",
            "Предварительная запись": true,
            "Парковка для людей с инвалидностью": true,
            "Доступность входа на инвалидной коляске": "доступно",
            "Туалет для людей с инвалидностью": true
        });

        console.log("\n✅ Detailed settings updated successfully!");
    } catch (e) {
        console.error("❌ Details update failed:", e);
    } finally {
        await client.close();
    }
}

main();
