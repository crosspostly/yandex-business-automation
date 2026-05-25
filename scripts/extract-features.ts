import * as fs from 'fs';
import * as path from 'path';

function extractFeatures() {
    try {
        const data = fs.readFileSync('data/full_state.json', 'utf8');
        const state = JSON.parse(data);
        
        const features = new Set<string>();
        
        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.feature && obj.feature.name) {
                features.add(obj.feature.name);
            }
            if (obj.name && obj.id && obj.highlight_in_callcenter !== undefined) {
                // enum values
                features.add(obj.name);
            }
            for (const key in obj) {
                traverse(obj[key]);
            }
        }
        
        traverse(state);
        
        const featureList = Array.from(features).sort();
        console.log("Found Features:");
        console.log(featureList.join('\n'));
        fs.writeFileSync('data/extracted_features.txt', featureList.join('\n'));
    } catch (e) {
        console.error(e);
    }
}

extractFeatures();
