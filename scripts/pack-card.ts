import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import { YmlGenerator, YmlCatalog } from '../src/YmlGenerator.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function packCard() {
    const orgId = process.env.YANDEX_ORG_ID;
    if (!orgId) throw new Error("YANDEX_ORG_ID is missing");
    
    // Create the client with dryRun = false so changes are saved to the backend!
    const client = new YandexBusinessClient(orgId, false);

    console.log("=== ЯНДЕКС БИЗНЕС 2026: УПАКОВКА КАРТОЧКИ 'КЛУБИКА' ===");

    try {
        // 1. Очистка старых данных (Опционально)
        console.log("\n[1/6] Подготовка карточки (удаление тестового товара, очистка фото)");
        await client.deleteProduct("test_product_123"); 
        await client.deletePhotos(2);

        // 2. Генерация и загрузка YML Прайс-листа
        console.log("\n[2/6] Загрузка услуг (Price List)");
        const catalog: YmlCatalog = {
            name: "Услуги маркетингового агентства Клубика",
            company: "Клубика",
            url: "https://vk.com/nanobloger",
            categories: [
                { id: "1", name: "Комплексный маркетинг" },
                { id: "2", name: "Реклама", parentId: "1" }
            ],
            offers: [
                {
                    id: "srv-001", available: true, name: "SEO Продвижение на Яндекс Картах 2026",
                    price: 25000, currencyId: "RUR", categoryId: "1",
                    description: "Полная упаковка, поведенческие факторы, вывод в ТОП без рекламного бюджета. Создание LSI контента."
                },
                {
                    id: "srv-002", available: true, name: "SMM и ведение соцсетей",
                    price: 15000, currencyId: "RUR", categoryId: "1",
                    description: "Разработка контент-плана, посты, сторис и ответы на комментарии."
                },
                {
                    id: "srv-003", available: true, name: "Настройка таргетированной рекламы (VK)",
                    price: 20000, currencyId: "RUR", categoryId: "2",
                    description: "Лидогенерация из ВКонтакте. Оптимизация бюджета, настройка пикселей."
                }
            ]
        };
        YmlGenerator.generate(catalog, 'data/klubika_services.yml');
        await client.uploadPriceList('data/klubika_services.yml');

        // 3. Заполнение Базовой Информации
        console.log("\n[3/6] Заполнение Базовой Информации (Контакты, Названия)");
        await client.updateBasicInfo({
            "Короткое название": "Клубика Маркетинг",
            "Обычное название": "Клубика",
            "Сайт": "https://vk.com/nanobloger",
            "ВКонтакте": "nanobloger",
            "Электронная почта": "info@klubika.ru",
            // For categories without a description field, this falls back safely
            "description": "Клубика — маркетинговое агентство в Нижнем Новгороде. Продвижение на картах, таргетированная реклама, SMM. Приводим клиентов из онлайна."
        });

        // 4. Особенности (Attributes)
        console.log("\n[4/6] Настройка Фильтров Поиска (Особенности)");
        await client.updateFeatures({
            "Оплата картой": true,
            "предварительная запись": true,
            "онлайн консультации": true,
            "акции": true,
            "посещение с животными": true
        });

        // 5. Загрузка Фото (Галерея)
        console.log("\n[5/6] Оформление витрины (Загрузка главного фото)");
        await client.updatePhotos(['data/main_photo.png']);

        // 6. Активность (Посты и Сторис)
        console.log("\n[6/6] Генерация Активности (Сториз и Публикация)");
        await client.createPublication(
            "🚀 Как алгоритмы Яндекс Карт работают в 2026 году?\n\nМы в агентстве «Клубика» проанализировали сотни карточек и готовы поделиться чек-листом для бесплатного вывода в ТОП!\nЗаписывайтесь на бесплатный аудит вашей карточки.",
            ['data/post_photo.png']
        );
        await client.uploadStory('data/story_photo.png');
        
        // 7. Работа с репутацией
        console.log("\n[БОНУС] Ответы на новые отзывы");
        await client.respondToReviews("Здравствуйте! Спасибо за ваш отклик. Команда агентства Клубика всегда рада помочь вашему бизнесу расти в онлайне!");

        console.log("\n✅ КАРТОЧКА УСПЕШНО УПАКОВАНА ПО СТАНДАРТАМ 2026 ГОДА!");
    } catch (e) {
        console.error("Ошибка при упаковке карточки:", e);
    } finally {
        await client.close();
    }
}

packCard();
