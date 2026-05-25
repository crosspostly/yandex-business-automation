# Yandex Business Automation 2026

Professional automation suite for Yandex Business card optimization using Playwright and AI Persona architecture.

## 🌟 Key Features
- **Persona-based Orchestration**: Specialized expert roles (SEO, Media, Content) manage different card sections.
- **Geo-Tagging Engine**: Automatic GPS injection (EXIF) for photos to boost local search trust.
- **LSI SEO Injektion**: Automatic keyword density management in descriptions and catalogs.
- **Dynamic Scheduling**: Automation of work hours, holidays, and breaks.
- **Media Categorization**: Smart upload into 'Interior', 'Exterior', and 'Entrance' tags.
- **Interactive Stories**: Uploading stories with call-to-action buttons.
- **AI Advisor**: Post-run analysis and generation of `ADVICE.md` with ranking boost tips.

## 🛠 Project Structure
- `src/YandexBusinessClient.ts`: Core automation engine with viewport-resilient JS-click logic.
- `scripts/pack-card.ts`: Full card synchronization.
- `scripts/final-report.ts`: Proof-of-work audit and screenshot generator.
- `cookies/`: Secure storage for Playwright session states.
- `data/`: Marketing assets and generated catalogs.

## 🚀 Quick Start
1. **Auth**: \`npm run auth\`
2. **Sync**: \`npx tsx scripts/pack-card.ts\`
3. **Report**: \`npx tsx scripts/final-report.ts\`

## 📈 2026 Ranking Factors Implemented
1. **Disabled Access Tags**: Hard requirement for Top Rated badge.
2. **Daily Engagement**: Automated stories and publications.
3. **Technical Authenticity**: Verified GPS coordinates in all media assets.
