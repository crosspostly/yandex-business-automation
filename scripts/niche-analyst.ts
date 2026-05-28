import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
chromium.use(stealth());

interface NicheConfig {
  niche: string;
  region: string;
  lsi_keywords: string[];
  competitor_hooks: string[];
  faq_templates: { question: string; answer: string }[];
  media_standards: string[];
}

async function runNicheAnalyst(niche: string, region: string) {
  console.log(`\n🕵️ Niche Analyst: Analyzing "${niche}" in "${region}"...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Search Yandex Maps for top competitors
    const searchUrl = `https://yandex.ru/maps/org/${region.toLowerCase()}/${niche.toLowerCase().replace(/ /g, '_')}/`;
    console.log(`  🔍 Searching competitors on Yandex Maps...`);
    await page.goto(`https://yandex.ru/maps/?text=${encodeURIComponent(niche + ' ' + region)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // 2. Extract SEO patterns from top results
    console.log(`  📊 Extracting LSI patterns and FAQ triggers...`);
    const data = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.search-item-view__title')).map(el => el.textContent?.trim());
      const categories = Array.from(document.querySelectorAll('.search-item-view__categories')).map(el => el.textContent?.trim());
      
      // Mocked LSI extraction logic (in real world we would visit org cards)
      return { titles, categories };
    });

    // 3. Generate Universal Niche Config
    // For this prototype, we'll generate it based on the niche type
    const config: NicheConfig = {
      niche,
      region,
      lsi_keywords: [
        `лучший ${niche}`,
        `${niche} рядом`,
        `цены на ${niche}`,
        `отзывы ${niche}`,
        `${niche} 2026`,
        "гарантия качества",
        "профессиональный подход"
      ],
      competitor_hooks: [
        "Работаем без выходных",
        "Скидка 10% на первый заказ",
        "Бесплатная консультация"
      ],
      faq_templates: [
        { 
          question: `Как заказать услуги ${niche}?`, 
          answer: `Вы можете связаться с нами по телефону или оставить заявку на сайте. Мы работаем ежедневно.` 
        },
        { 
          question: "Какие гарантии вы предоставляете?", 
          answer: "Мы предоставляем полную гарантию на все виды наших работ согласно договору." 
        },
        { 
          question: "Есть ли у вас акции для новых клиентов?", 
          answer: "Да, для новых клиентов у нас всегда действуют специальные предложения. Уточняйте у менеджера." 
        }
      ],
      media_standards: [
        "Экстерьер: Входная группа и вывеска",
        "Интерьер: Рабочая зона и зона ожидания",
        "Процесс: Специалисты за работой"
      ]
    };

    // Refine based on specific niche
    if (niche.toLowerCase().includes('маркетинг') || niche.toLowerCase().includes('агентство')) {
        config.lsi_keywords.push('продвижение бизнеса', 'лидогенерация', 'контекстная реклама', 'SMM');
        config.faq_templates.push({
            question: "Сколько времени занимает продвижение?",
            answer: "Первые результаты заметны уже через 2 недели после настройки всех инструментов."
        });
    }

    const configPath = path.resolve(process.cwd(), 'data/niche_config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Niche Config generated: ${configPath}`);
    console.log(`   - Keywords: ${config.lsi_keywords.length}`);
    console.log(`   - FAQ Templates: ${config.faq_templates.length}`);

  } catch (e) {
    console.error("❌ Analyst failed:", e);
  } finally {
    await browser.close();
  }
}

// Example: Run for the current project context
const targetNiche = "Маркетинговое агентство";
const targetRegion = "Нижний Новгород";

runNicheAnalyst(targetNiche, targetRegion);
