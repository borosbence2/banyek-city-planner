#!/usr/bin/env node
/**
 * Localization checker — compares keys across all locale files in js/locales/.
 * Exits with code 1 if any keys are missing from any locale.
 */

const { readFileSync, readdirSync } = require('fs');
const { join, basename } = require('path');

const ROOT = join(__dirname, '../');
const LOCALES_DIR = join(ROOT, 'js/locales');

function extractKeys(filePath) {
    const src = readFileSync(filePath, 'utf-8');
    const keys = new Set();
    // Match both 'key': and "key": patterns at the start of object entries
    const re = /^\s+['"]([^'"]+)['"]\s*:/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
        keys.add(m[1]);
    }
    return keys;
}

const files = readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ name: basename(f, '.js').toUpperCase(), path: join(LOCALES_DIR, f) }));

if (files.length < 2) {
    console.log('Only one locale found — nothing to compare.');
    process.exit(0);
}

const locales = files.map(f => ({ name: f.name, keys: extractKeys(f.path) }));

// Use EN as the reference (or the first file if EN isn't present)
const ref = locales.find(l => l.name === 'EN') ?? locales[0];

let errors = 0;

for (const locale of locales) {
    if (locale === ref) continue;

    const missing = [...ref.keys].filter(k => !locale.keys.has(k));
    const extra   = [...locale.keys].filter(k => !ref.keys.has(k));

    if (missing.length) {
        console.error(`\n❌ [${locale.name}] Missing ${missing.length} key(s) (present in ${ref.name} but not ${locale.name}):`);
        missing.forEach(k => console.error(`   - '${k}'`));
        errors += missing.length;
    }

    if (extra.length) {
        console.warn(`\n⚠️  [${locale.name}] Extra ${extra.length} key(s) (in ${locale.name} but not in ${ref.name}):`);
        extra.forEach(k => console.warn(`   + '${k}'`));
        // Extra keys are a warning, not a hard error
    }
}

if (errors === 0) {
    console.log(`✅ All locale keys match across ${locales.map(l => l.name).join(', ')}.`);
    process.exit(0);
} else {
    console.error(`\n🚫 Locale check failed: ${errors} missing key(s). Add the missing translations before committing.\n`);
    process.exit(1);
}
