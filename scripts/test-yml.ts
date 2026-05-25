import { YmlGenerator, YmlCatalog } from '../src/YmlGenerator.js';

const catalog: YmlCatalog = {
    name: "Прайс-лист Клубики",
    company: "Клубика",
    url: "https://vk.com/nanobloger",
    categories: [
        { id: "1", name: "Маркетинговые услуги" },
        { id: "2", name: "Реклама", parentId: "1" }
    ],
    offers: [
        {
            id: "svc-1",
            available: true,
            name: "Аудит социальных сетей",
            price: 5000,
            currencyId: "RUR",
            categoryId: "1",
            description: "Полный аудит ваших соцсетей с рекомендациями по улучшению вовлеченности."
        },
        {
            id: "svc-2",
            available: true,
            name: "Настройка таргетированной рекламы",
            price: 15000,
            currencyId: "RUR",
            categoryId: "2",
            description: "Запуск рекламных кампаний в VK с гарантией результата."
        }
    ]
};

YmlGenerator.generate(catalog, 'data/pricelist.yml');
