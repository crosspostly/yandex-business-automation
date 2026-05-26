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
- **Скрипт**: `npx tsx scripts/sync-media.ts`

### 2. 💰 Прайс-листы (YML)
- **SEO-синхронизация**: Загрузка товаров и услуг через YML-фиды с автоматическим подтверждением публикации.

### 3. 📝 Публикации (Новости)
- **Rich Posts**: Поддержка длинных текстов и одновременной загрузки нескольких изображений.
- **Верификация**: Скрипт проверяет наличие поста в кабинете после создания.
- **Скрипт**: `npx tsx scripts/verify-publications.ts`

### 4. 📱 Сторис (Stories)
- **Стандартные истории**: Создание новых историй через модальное окно с обходом ограничений React (прямые JS-клики, эмуляция событий ввода).
- **Скрипт**: `npx tsx scripts/create-new-story.ts`

## 🛠 Project Structure
- `src/YandexBusinessClient.ts`: Основной движок автоматизации.
- `scripts/sync-media.ts`: Полная синхронизация медиа и прайса.
- `scripts/create-new-story.ts`: Мастер создания новых Сторис.
- `scripts/verify-publications.ts`: Тестирование постов с картинками.

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
