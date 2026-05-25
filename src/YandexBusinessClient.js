"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexBusinessClient = void 0;
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
class YandexBusinessClient {
    orgId;
    storageStatePath;
    browser;
    context;
    constructor(orgId, storageStatePath = 'cookies/yandex.json') {
        this.orgId = orgId;
        this.storageStatePath = storageStatePath;
    }
    async getPage() {
        if (!this.browser) {
            this.browser = await playwright_extra_1.chromium.launch({ headless: false });
            this.context = await this.browser.newContext({
                storageState: fs.existsSync(this.storageStatePath) ? this.storageStatePath : undefined,
                viewport: { width: 1280, height: 720 }
            });
        }
        return await this.context.newPage();
    }
    async close() {
        if (this.browser)
            await this.browser.close();
    }
    async updateBasicInfo(data) {
        const page = await this.getPage();
        try {
            console.log(`Navigating to organization ${this.orgId} edit page...`);
            // Modern Yandex Business URL
            await page.goto(`https://business.yandex.ru/dashboard/organizations/${this.orgId}/about/data`);
            await page.waitForLoadState('networkidle');
            if (page.url().includes('passport.yandex.ru')) {
                throw new Error(`Auth failed. Please check your cookies in ${this.storageStatePath}`);
            }
            if (data.name) {
                console.log(`Setting name: ${data.name}`);
                const nameInput = page.getByLabel('Название');
                await nameInput.clear();
                await nameInput.fill(data.name);
            }
            if (data.website) {
                console.log(`Setting website: ${data.website}`);
                const siteInput = page.getByLabel('Сайт');
                await siteInput.clear();
                await siteInput.fill(data.website);
            }
            if (data.description) {
                console.log(`Setting description...`);
                const descInput = page.getByLabel('Описание');
                await descInput.clear();
                await descInput.fill(data.description);
            }
            if (data.address) {
                console.log(`Setting address: ${data.address}`);
                const addrInput = page.getByLabel('Адрес');
                await addrInput.fill(data.address);
                // Wait for suggestions and pick first
                try {
                    await page.locator('.suggest-item').first().click({ timeout: 5000 });
                }
                catch (e) {
                    console.warn('Address suggestion not found or timed out.');
                }
            }
            // Handle categories (simplified)
            if (data.category) {
                console.log(`Handling category: ${data.category}`);
                const catInput = page.getByPlaceholder('Введите вид деятельности');
                if (await catInput.isVisible()) {
                    await catInput.fill(data.category);
                    await page.keyboard.press('Enter');
                }
            }
            console.log('Taking screenshot before saving...');
            await page.screenshot({ path: `data/update_${Date.now()}.png` });
            console.log('Note: Save button click is commented out for safety.');
            // const saveBtn = page.getByRole('button', { name: 'Сохранить' });
            // await saveBtn.click();
            // await page.waitForSelector('text=Изменения сохранены', { timeout: 10000 });
            console.log('Update process finished.');
        }
        catch (error) {
            console.error('Update failed:', error);
            await page.screenshot({ path: `data/error_${Date.now()}.png` });
            throw error;
        }
    }
    // Placeholder for more complex sections
    async updatePhotos(photoPaths) {
        const page = await this.getPage();
        await page.goto(`https://business.yandex.ru/dashboard/organizations/${this.orgId}/about/photos`);
        // Logic for uploading photos
    }
}
exports.YandexBusinessClient = YandexBusinessClient;
//# sourceMappingURL=YandexBusinessClient.js.map