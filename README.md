# Yandex Business Automation 2026

Скрипт для автоматизации ведения карточки организации на Яндекс Картах (через личный кабинет Яндекс Бизнес) по стандартам 2026 года.

## Особенности
*   **Stealth Mode:** Использование `playwright-extra` и `stealth` плагина для обхода блокировок.
*   **Cookie-based Auth:** Работа через сохраненные сессии (`storageState`).
*   **2026 Ready:** Поддержка новых интерфейсов, обход рекламных оверлеев.
*   **Publications:** Автоматическое создание постов с медиа-файлами (заменяет описание для многих рубрик).
*   **Media Management:** Массовая загрузка и массовое удаление фотографий.
*   **Reputation:** Автоматический ответ на отзывы по шаблонам.

## Установка
```bash
npm install
```

## Использование

### 1. Авторизация
Выполните вход в Яндекс в браузере и сохраните куки в `cookies/yandex.json` (формат Playwright storageState).

### 2. Тестовый запуск
```bash
npx tsx scripts/test-workflow.ts
```

### 3. Основные методы Client
```typescript
const client = new YandexBusinessClient(ORG_ID);

// Обновление основных данных
await client.updateBasicInfo({
    name: "Новое название",
    description: "SEO-оптимизированное описание"
});

// Работа с контентом
await client.updatePhotos(['path/to/photo.jpg']);
await client.createPublication("Свежая новость!", ['image.jpg']);

// Управление репутацией
await client.respondToReviews("Спасибо, что выбрали нас!");
```

## Стратегия 2026
Подробный гайд по выводу карточки в ТОП без рекламного бюджета читайте в [GUIDE_2026.md](./GUIDE_2026.md).

---
Разработано для автоматизации организации "Клубика" (Нижний Новгород).
