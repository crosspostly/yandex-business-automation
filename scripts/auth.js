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
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function saveAuth() {
    const storagePath = path.join(__dirname, '../cookies/yandex.json');
    const browser = await playwright_extra_1.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log('Navigating to Yandex Passport...');
    await page.goto('https://passport.yandex.ru/auth');
    console.log('--- ACTION REQUIRED ---');
    console.log('Please log in manually in the browser window.');
    console.log('Once you are logged in and redirected to your dashboard, this script will save the session.');
    // Wait for the user to be logged in (URL changes from passport to something else)
    await page.waitForURL(/yandex\.ru\/(sprav|business|portal)/, { timeout: 0 });
    console.log('Logged in detected. Saving storage state...');
    if (!fs.existsSync(path.dirname(storagePath))) {
        fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    }
    await context.storageState({ path: storagePath });
    console.log('Session saved to', storagePath);
    await browser.close();
}
saveAuth().catch(console.error);
//# sourceMappingURL=auth.js.map