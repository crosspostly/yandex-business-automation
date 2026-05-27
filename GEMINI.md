# Project Instructions: Yandex Business Automation

## Technical Stack
- **Language**: TypeScript
- **Automation Engine**: Playwright (with `playwright-extra` and `stealth` plugin)
- **State Management**: Playwright's `storageState` for cookie-based authentication.
- **Media Processing**: `piexifjs` for geo-tagging photos.

## Dashboard Personas & Tasks
The automation simulates specialized expert roles:
- **SEO Specialist**: Collects keywords, injects them into descriptions, alt tags, and price list items. Optimizes the "Short name" and "About" sections.
- **Content Manager**: Handles Publications (with photos), Stories (with interactive buttons), and Events/Promotions.
- **Media Designer**: Generates visual assets, uploads categorized photos (Interior, Exterior, Entrance, etc.), and handles Video content.
- **Reputation Manager**: Responds to reviews using templates and manages feedback collection strategies.

## Guidelines
- **SEO & Keywords**: Every text field must be checked for keyword density based on the provided niche.
- **Geo-Tagging**: All uploaded photos MUST have EXIF data (GPS coordinates) matching the organization's location.
- **Stories**:
    - Title limit: 15 characters (auto-truncated).
    - Slide-First logic: Interactive button fields (text + URL) appear only after uploading the first slide. The script waits for these fields to mount in the DOM before filling.
    - Visibility: Modal can be hidden by generic pop-up dismissers; refined logic excludes `.AddStoryForm`.
- **Navigation**: Coverage must include:
    - Basic Data (SEO optimized).
    - Photos by category (tags: interior, exterior, entrance, etc.).
    - Price lists (YML with SEO descriptions).
    - Stories & Posts (Marketing design).
    - Events & Promotions (Lead generation).
    - Tools (Map widgets & Site generation).
    - Delivery settings.

## Workflow
1. Load session from `cookies/`.
2. Generate/Optimize assets (SEO, Geo-tags, Design).
3. Sequentially process all dashboard sections.
4. Verify changes with screenshots.
