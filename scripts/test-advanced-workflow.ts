import { YandexBusinessClient } from '../src/YandexBusinessClient.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

class SEOSpecialist {
    private keywords = ["маркетинговое агентство", "продвижение на картах", "SEO Нижний Новгород", "SMM для бизнеса"];
    
    optimizeText(text: string): string {
        return `${text}\n\nНаши услуги включают: ${this.keywords.join(', ')}.`;
    }

    getAltTags() {
        return this.keywords;
    }
}

class MediaDesigner {
    constructor(private client: YandexBusinessClient) {}
    
    async setupGallery() {
        console.log("🎨 Media Designer: Preparing geo-tagged gallery...");
        if (fs.existsSync('data/test_photo.jpg')) {
            await this.client.uploadPhotosByCategory(['data/test_photo.jpg'], 'interior');
            await this.client.uploadPhotosByCategory(['data/test_photo.jpg'], 'exterior');
            await this.client.uploadPhotosByCategory(['data/test_photo.jpg'], 'enter');
            await this.client.uploadPhotosByCategory(['data/test_photo.jpg'], 'equipment');
        }
    }

    async uploadMarketingVideo() {
        console.log("🎬 Media Designer: Uploading brand video...");
        // For testing, we'd need a real video. For now, we'll skip or use a placeholder if available.
        // await this.client.uploadVideo('data/brand_video.mp4');
    }
}

class ContentManager {
    constructor(private client: YandexBusinessClient, private seo: SEOSpecialist) {}
    
    async publishCampaign() {
        console.log("📝 Content Manager: Launching marketing campaign...");
        
        await this.client.createEvent({
            title: "Мастер-класс по SEO 2026",
            description: this.seo.optimizeText("Приходите на наш бесплатный мастер-класс по продвижению локального бизнеса."),
            photoPath: 'data/test_photo.jpg'
        });

        await this.client.createPromotion({
            title: "Скидка 20% на аудит",
            description: "Только до конца месяца! Закажите аудит карточки со скидкой.",
            photoPath: 'data/test_photo.jpg'
        });
        
        await this.client.uploadStory('data/test_photo.jpg');
    }
}

class ReputationManager {
    private templates = [
        "Здравствуйте! Благодарим за высокую оценку. Будем рады видеть вас снова!",
        "Спасибо за ваш отзыв! Мы постоянно работаем над улучшением качества услуг.",
        "Рады, что вам понравилось! Команда Клубики всегда на связи."
    ];

    constructor(private client: YandexBusinessClient) {}

    async handleReviews() {
        console.log("💬 Reputation Manager: Responding to reviews with optimized templates...");
        const template = this.templates[Math.floor(Math.random() * this.templates.length)];
        await this.client.respondToReviews(template);
    }
}

async function main() {
    const orgId = process.env.YANDEX_ORG_ID!;
    const client = new YandexBusinessClient(orgId, true); // dryRun = true
    
    client.setCoordinates(56.294876, 43.998914);
    
    const seo = new SEOSpecialist();
    const designer = new MediaDesigner(client);
    const content = new ContentManager(client, seo);
    const reputation = new ReputationManager(client);

    console.log("=== COMPREHENSIVE YANDEX BUSINESS AUTOMATION 2026 ===");
    
    try {
        // 1. Data Actualization (SEO)
        await client.updateBasicInfo({
            "Короткое название": "Клубика Маркетинг",
            "description": seo.optimizeText("Клубика — маркетинговое агентство полного цикла в Нижнем Новгороде.")
        });

        // 2. Media (Designer)
        await designer.setupGallery();
        
        // 3. Campaigns (Content)
        await content.publishCampaign();
        
        // 4. Reputation (Reputation)
        await reputation.handleReviews();
        
        // 5. Advanced Settings
        await client.setDeliverySettings(false); // Services agency, no delivery
        
        // 6. Extraction
        console.log("\n🛠 Extraction Tools:");
        const widget = await client.getMapWidgetCode();
        console.log(`  Map Widget Code: ${widget.substring(0, 50)}...`);

        console.log("\n✅ ALL TASKS COMPLETED BY SPECIALIZED PERSONAS!");
    } catch (e) {
        console.error("❌ Workflow failed:", e);
    } finally {
        await client.close();
    }
}

main();
