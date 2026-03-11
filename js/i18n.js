import { EN } from './locales/en.js';
import { HU } from './locales/hu.js';
import { DE } from './locales/de.js';
import { FR } from './locales/fr.js';
import { ES } from './locales/es.js';

const LOCALES = { en: EN, hu: HU, de: DE, fr: FR, es: ES };

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

const LANG_META = {
    en: { flag: 'EN', label: 'English'  },
    hu: { flag: 'HU', label: 'Magyar'   },
    de: { flag: 'DE', label: 'Deutsch'  },
    fr: { flag: 'FR', label: 'Français' },
    es: { flag: 'ES', label: 'Español'  },
};

/**
 * Build a dropdown language switcher inside #langPickerContainer.
 * Adding a new locale only requires adding an entry to LANG_META and LOCALES.
 */
export function createLangPicker() {
    const container = document.getElementById('langPickerContainer');
    if (!container) return;

    // Wrap in a relative-positioned root so the dropdown panel aligns to it
    container.innerHTML = `
        <div class="lang-dropdown" id="langDropdown">
            <button class="lang-trigger" id="langTrigger" aria-haspopup="listbox" aria-expanded="false">
                <span id="langTriggerFlag"></span>
                <span id="langTriggerLabel"></span>
                <span class="lang-caret">▾</span>
            </button>
            <ul class="lang-menu" id="langMenu" role="listbox"></ul>
        </div>
    `;

    const trigger    = document.getElementById('langTrigger');
    const menu       = document.getElementById('langMenu');
    const triggerFlag  = document.getElementById('langTriggerFlag');
    const triggerLabel = document.getElementById('langTriggerLabel');

    function updateTrigger() {
        const meta = LANG_META[_locale] || { flag: '', label: _locale.toUpperCase() };
        triggerFlag.textContent  = meta.flag;
        triggerLabel.textContent = meta.label;
    }

    function buildMenu() {
        menu.innerHTML = '';
        for (const lang of Object.keys(LOCALES)) {
            const meta = LANG_META[lang] || { flag: '', label: lang.toUpperCase() };
            const li = document.createElement('li');
            li.className = 'lang-option' + (lang === _locale ? ' active' : '');
            li.setAttribute('role', 'option');
            li.setAttribute('data-lang', lang);
            li.innerHTML = `<span class="lang-opt-flag">${meta.flag}</span><span>${meta.label}</span>`;
            li.addEventListener('click', () => {
                setLocale(lang);
                updateTrigger();
                buildMenu();
                closeMenu();
            });
            menu.appendChild(li);
        }
    }

    function openMenu() {
        menu.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Close on outside click
    document.addEventListener('click', closeMenu);

    updateTrigger();
    buildMenu();
}
