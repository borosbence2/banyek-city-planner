import { EN } from './locales/en.js';
import { HU } from './locales/hu.js';

const LOCALES = { en: EN, hu: HU };

// ── Detect initial language ──────────────────────────────────────────────
const saved   = localStorage.getItem('foe_lang');
const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
let _locale   = (saved && LOCALES[saved]) ? saved
              : (LOCALES[browser]         ? browser : 'en');

// ── Core API ─────────────────────────────────────────────────────────────

/** Translate a key, interpolating {{param}} placeholders. */
export function t(key, params = {}) {
    const str = LOCALES[_locale]?.[key] ?? LOCALES.en?.[key] ?? key;
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] ?? ''));
}

export function getLocale()  { return _locale; }
export function getLocales() { return Object.keys(LOCALES); }

/**
 * Switch the active locale, persist it, and re-apply all DOM translations.
 * Dispatches a 'localechange' event on window so other modules can react.
 */
export function setLocale(lang) {
    if (!LOCALES[lang]) return;
    _locale = lang;
    localStorage.setItem('foe_lang', lang);
    applyDOM();
    window.dispatchEvent(new CustomEvent('localechange', { detail: { locale: lang } }));
}

// ── DOM application ───────────────────────────────────────────────────────

/**
 * Apply translations to all elements carrying data-i18n* attributes.
 *
 *   data-i18n             → textContent
 *   data-i18n-html        → innerHTML
 *   data-i18n-placeholder → placeholder attribute
 *   data-i18n-title       → title attribute
 *   data-i18n-label       → aria-label attribute
 */
export function applyDOM(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
    root.querySelectorAll('[data-i18n-label]').forEach(el => {
        el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    });
}

// ── Language picker ───────────────────────────────────────────────────────

/**
 * Create and return a small language-switcher button group.
 * Appends to the element with id="langPickerContainer" if it exists.
 */
export function createLangPicker() {
    const container = document.getElementById('langPickerContainer');
    if (!container) return;

    const LABELS = { en: '🇬🇧', hu: '🇭🇺' };
    container.innerHTML = '';

    for (const lang of Object.keys(LOCALES)) {
        const btn = document.createElement('button');
        btn.className  = 'btn-icon lang-btn';
        btn.title      = lang.toUpperCase();
        btn.textContent = LABELS[lang] || lang.toUpperCase();
        btn.setAttribute('data-lang', lang);
        btn.addEventListener('click', () => {
            setLocale(lang);
            container.querySelectorAll('.lang-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.lang === lang)
            );
        });
        if (lang === _locale) btn.classList.add('active');
        container.appendChild(btn);
    }
}
