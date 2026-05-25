import * as fs from 'fs';
import * as path from 'path';
import { create } from 'xmlbuilder2';

export interface YmlOffer {
    id: string;
    available: boolean;
    name: string;
    price: number;
    currencyId: string;
    categoryId: string;
    picture?: string;
    description?: string;
    url?: string;
}

export interface YmlCategory {
    id: string;
    name: string;
    parentId?: string;
}

export interface YmlCatalog {
    name: string;
    company: string;
    url: string;
    categories: YmlCategory[];
    offers: YmlOffer[];
}

export class YmlGenerator {
    static generate(catalog: YmlCatalog, outputPath: string) {
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('yml_catalog', { date: new Date().toISOString() })
            .ele('shop')
                .ele('name').txt(catalog.name).up()
                .ele('company').txt(catalog.company).up()
                .ele('url').txt(catalog.url).up()
                .ele('currencies')
                    .ele('currency', { id: 'RUR', rate: '1' }).up()
                .up()
                .ele('categories');

        for (const cat of catalog.categories) {
            const catEl = root.ele('category', { id: cat.id });
            if (cat.parentId) catEl.att('parentId', cat.parentId);
            catEl.txt(cat.name).up();
        }

        // We need to jump back up to <shop> level to add <offers>
        // The root reference is at <categories> currently because of the chain above
        // Actually, in xmlbuilder2, let's just find the shop node
        const shopNode = root.up();
        
        const offersEl = shopNode.ele('offers');

        for (const offer of catalog.offers) {
            const el = offersEl.ele('offer', { id: offer.id, available: offer.available ? 'true' : 'false' })
                .ele('name').txt(offer.name).up()
                .ele('price').txt(offer.price.toString()).up()
                .ele('currencyId').txt(offer.currencyId).up()
                .ele('categoryId').txt(offer.categoryId).up();
                
            if (offer.picture) el.ele('picture').txt(offer.picture).up();
            if (offer.description) el.ele('description').txt(offer.description).up();
            if (offer.url) el.ele('url').txt(offer.url).up();
            el.up();
        }

        const xmlString = root.end({ prettyPrint: true });
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(outputPath, xmlString);
        console.log(`✨ YML file successfully generated at ${outputPath}`);
    }
}
