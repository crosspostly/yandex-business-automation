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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const YandexBusinessClient_1 = require("../src/YandexBusinessClient");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
dotenv.config();
async function main() {
    const orgId = process.env.YANDEX_ORG_ID;
    if (!orgId) {
        console.error('YANDEX_ORG_ID is not set in .env file');
        process.exit(1);
    }
    const dataPath = path.join(__dirname, '../data/organization.json');
    if (!fs.existsSync(dataPath)) {
        console.warn('Data file not found at', dataPath, '. Using template...');
        const template = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/organization-template.json'), 'utf-8'));
        fs.writeFileSync(dataPath, JSON.stringify(template, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const client = new YandexBusinessClient_1.YandexBusinessClient(orgId);
    try {
        await client.updateBasicInfo(data);
    }
    finally {
        await client.close();
    }
}
main().catch(console.error);
//# sourceMappingURL=run.js.map