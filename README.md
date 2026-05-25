# Yandex Business Automation

Automation for Yandex Business organization cards using Playwright and Stealth plugins.

## Setup

1. Place your Yandex cookies in `cookies/yandex.json` (Playwright storageState format).
2. Define your organization data in `data/organization.json`.
3. Run the automation: `npm run start`

## Project Structure

- `src/`: Core logic for Yandex Business interaction.
- `cookies/`: Storage for session cookies.
- `data/`: JSON files containing organization field values.
- `scripts/`: Entry point scripts.
