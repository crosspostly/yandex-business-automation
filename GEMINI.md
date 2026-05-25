# Project Instructions: Yandex Business Automation

## Technical Stack
- **Language**: TypeScript
- **Automation Engine**: Playwright (with `playwright-extra` and `stealth` plugin)
- **State Management**: Playwright's `storageState` for cookie-based authentication.

## Guidelines
- **Stealth**: Always use the stealth plugin to avoid detection.
- **Error Handling**: Implement robust error handling for dynamic elements (Yandex Business UI is complex).
- **Modularity**: Separate field filling logic into discrete methods or modules.
- **Validation**: After filling fields, take screenshots to verify success.

## Workflow
1. Load session from `cookies/`.
2. Navigate to organization edit page.
3. Fill fields based on provided data object.
4. Handle potential captchas (log if encountered).
5. Submit and verify.
