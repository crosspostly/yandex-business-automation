/**
 * import-cookies.ts
 * 
 * Converts Chrome extension cookie format (e.g. from "Cookie-Editor" extension)
 * to Playwright storageState format and saves to cookies/yandex.json
 * 
 * Usage: npx tsx scripts/import-cookies.ts <path-to-cookies.json>
 * Or:    npx tsx scripts/import-cookies.ts  (reads from cookies/raw-cookies.json)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chrome extension cookie format
interface ChromeCookie {
  domain: string;
  expirationDate?: number;
  hostOnly?: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: string | null;
  secure: boolean;
  session: boolean;
  storeId?: string | null;
  value: string;
}

// Playwright cookie format
interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

interface PlaywrightStorageState {
  cookies: PlaywrightCookie[];
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}

function mapSameSite(sameSite: string | null): 'Strict' | 'Lax' | 'None' {
  if (!sameSite) return 'None';
  const s = sameSite.toLowerCase();
  if (s === 'strict') return 'Strict';
  if (s === 'lax') return 'Lax';
  return 'None'; // 'no_restriction', 'unspecified', null all map to None
}

function convertCookies(chromeCookies: ChromeCookie[]): PlaywrightStorageState {
  const playwrightCookies: PlaywrightCookie[] = chromeCookies.map((c) => ({
    name: c.name,
    value: c.value,
    // Playwright requires domain WITHOUT leading dot for hostOnly cookies,
    // but WITH leading dot for non-hostOnly (shared across subdomains)
    domain: c.domain,
    path: c.path,
    // -1 means session cookie in Playwright
    expires: c.expirationDate ? Math.round(c.expirationDate) : -1,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: mapSameSite(c.sameSite),
  }));

  return {
    cookies: playwrightCookies,
    origins: [],
  };
}

async function main() {
  const outputPath = path.resolve(process.cwd(), 'cookies/yandex.json');
  
  // Ensure cookies directory exists
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  // Determine source: CLI argument or default raw-cookies.json
  let inputPath = process.argv[2];
  if (!inputPath) {
    inputPath = path.resolve(process.cwd(), 'cookies/raw-cookies.json');
  }
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.error('');
    console.error('Usage: npx tsx scripts/import-cookies.ts [path-to-cookies.json]');
    console.error('  Or place your cookies JSON at: cookies/raw-cookies.json');
    process.exit(1);
  }

  console.log(`📂 Reading cookies from: ${inputPath}`);
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as ChromeCookie[];
  
  if (!Array.isArray(raw)) {
    console.error('❌ Expected a JSON array of cookies');
    process.exit(1);
  }

  console.log(`🍪 Found ${raw.length} cookies`);
  
  const storageState = convertCookies(raw);
  
  fs.writeFileSync(outputPath, JSON.stringify(storageState, null, 2), 'utf-8');
  
  console.log(`✅ Saved Playwright storageState to: ${outputPath}`);
  console.log('');
  console.log('Cookie summary:');
  const sessionCookies = raw.filter(c => !c.expirationDate);
  const persistentCookies = raw.filter(c => !!c.expirationDate);
  const importantCookies = ['Session_id', 'sessionid2', 'yandex_login', 'sessar', 'i'];
  console.log(`  - Total: ${raw.length} cookies`);
  console.log(`  - Session (no expiry): ${sessionCookies.length}`);
  console.log(`  - Persistent: ${persistentCookies.length}`);
  console.log('');
  console.log('  Key auth cookies found:');
  for (const name of importantCookies) {
    const found = raw.find(c => c.name === name);
    if (found) {
      const exp = found.expirationDate 
        ? new Date(found.expirationDate * 1000).toLocaleDateString('ru-RU') 
        : 'session';
      console.log(`  ✓ ${name} (expires: ${exp})`);
    } else {
      console.log(`  ✗ ${name} — NOT FOUND`);
    }
  }
}

main().catch(console.error);
