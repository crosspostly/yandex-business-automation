import { YmlGenerator, YmlCatalog } from '../src/YmlGenerator.js';
import * as path from 'path';

async function main() {
    const catalog: YmlCatalog = {
        name: 'Клубика',
        company: 'Клубика Маркетинг',
        url: 'https://clubika.ru',
        categories: [
            { id: '1', name: 'Маркетинг' },
            { id: '2', name: 'Контент' }
        ],
        offers: [
            {
                id: 'offer-1',
                available: true,
                name: 'Продвижение в Яндекс Картах (SEO)',
                price: 15000,
                currencyId: 'RUR',
                categoryId: '1',
                description: 'Вывод карточки в ТОП-3 без рекламного бюджета. Работа с поведенческими факторами, SEO-прайсом и атрибутами.'
            },
            {
                id: 'offer-2',
                available: true,
                name: 'Создание и оформление Сторис',
                price: 5000,
                currencyId: 'RUR',
                categoryId: '2',
                description: 'Профессиональные истории для Яндекс Бизнеса с интерактивными кнопками и CTA.'
            }
        ]
    };

    const outputPath = path.resolve(process.cwd(), 'data/pricelist.yml');
    YmlGenerator.generate(catalog, outputPath);
    console.log('✅ YML generation test complete.');
}

main().catch(console.error);
