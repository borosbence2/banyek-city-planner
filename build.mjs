import { cpSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

// 1. Bundle + obfuscate JS
console.log('Bundling & obfuscating...');
execSync('npx rollup -c rollup.config.mjs', { stdio: 'inherit' });

// 2. Copy static assets
console.log('Copying assets...');
mkdirSync('dist/css',    { recursive: true });
mkdirSync('dist/assets', { recursive: true });
cpSync('css',    'dist/css',    { recursive: true });
cpSync('assets', 'dist/assets', { recursive: true });

// Copy root-level verification / SEO files if they exist
import { existsSync } from 'fs';
for (const file of ['robots.txt', '404.html']) {
    if (existsSync(file)) cpSync(file, `dist/${file}`);
}
// Copy any Google Search Console verification HTML files (googleXXXXXXXX.html)
import { readdirSync } from 'fs';
for (const file of readdirSync('.')) {
    if (/^google[a-f0-9]+\.html$/.test(file)) cpSync(file, `dist/${file}`);
}

// 3. Patch index.html — swap the module script tag for the bundle
console.log('Patching index.html...');
const html = readFileSync('index.html', 'utf8')
    .replace(
        '<script type="module" src="js/main.js"></script>',
        '<script src="bundle.js"></script>'
    );
writeFileSync('dist/index.html', html);

console.log('Build complete → dist/');
