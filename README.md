# Yandex Business Automation 2026

Professional automation suite for Yandex Business card optimization using Playwright and AI Persona architecture.

## 🌟 Key Features
- **Persona-based Orchestration**: Specialized expert roles (SEO, Media, Content) manage different card sections.
- **Geo-Tagging Engine**: Automatic GPS injection (EXIF) for photos to boost local search trust.
- **LSI SEO Injektion**: Automatic keyword density management in descriptions and catalogs.
- **Dynamic Scheduling**: Automation of work hours, holidays, and breaks.
- **Media Categorization**: Smart upload into 'Interior', 'Exterior', and 'Entrance' tags.
- **Interactive Stories**: robust management of Stories via React-resilient JS-click logic.
- **AI Advisor**: Post-run analysis and generation of `ADVICE.md` with ranking boost tips.

## Ключевые возможности автоматизации (Обновление Май 2026)

### 1. 🖼️ Медиа и Гео-привязка
- **Автоматический инжект GPS**: При загрузке фото скрипт автоматически вшивает координаты организации (56.294876, 43.998914) в EXIF.
- **Категоризация**: Умная загрузка в разделы «Экстерьер», «Интерьер» и «Вход».
- **Скрипт**: `npx tsx scripts/upload-and-seo-media.ts` (Загрузка + SEO-теги).

### 2. 💰 Прайс-листы (YML)
- **SEO-синхронизация**: Загрузка товаров и услуг через YML-фиды с автоматическим подтверждением публикации.

### 3. 📝 Публикации (Новости)
- **Rich Posts**: Поддержка длинных текстов и одновременной загрузки нескольких изображений.
- **Верификация**: Скрипт проверяет наличие поста в кабинете после создания.

### 4. 🕵️ Аналитика и FAQ (NEW)
- **Niche Analyst**: Парсинг конкурентов и генерация `niche_config.json` с LSI-ключами.
- **FAQ Sync**: Автоматическое наполнение раздела «Вопросы и ответы» на основе данных аналитика.
- **Скрипты**: `scripts/niche-analyst.ts`, `scripts/sync-faq.ts`.

### 5. 🛡️ Anti-Detection & Health (NEW)
- **HumanBehavior**: Плавные движения мыши, натуральная печать, рандомные задержки.
- **Health Check**: Автоматическая проверка валидности сессии перед запуском.
- **Скрипты**: `scripts/check-health.ts`, `src/HumanBehavior.ts`.

## 🛠 Project Structure
- `src/YandexBusinessClient.ts`: Основной движок автоматизации.
- `src/HumanBehavior.ts`: Модуль эмуляции поведения человека.
- `scripts/upload-and-seo-media.ts`: Полная синхронизация медиа с GPS и ALT-тегами.
- `scripts/sync-faq.ts`: Мастер синхронизации FAQ.
- `scripts/niche-analyst.ts`: Агент конкурентной разведки.

## 🚀 Быстрый старт
1. **Синхронизация (Фото + Прайс + Пост)**:
   ```bash
   npx tsx scripts/sync-media.ts
   ```
2. **Создание новой Сторис**:
   ```bash
   npx tsx scripts/create-new-story.ts
   ```

---
