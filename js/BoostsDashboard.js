/**
 * BoostsDashboard — aggregates every passive boost of the current layout into
 * a single overview, modeled after FoE Helper's "Boosts" window:
 *
 *   1. Military matrix — effective attack/defense for the attacking and
 *      defending army, per feature (General / GBG / GE / QI). GBG and GE
 *      columns include the general ("all") boosts; the QI column counts only
 *      guild_raids-tagged boosts because generic combat boosts do not apply
 *      inside Quantum Incursions.
 *   2. Economy boosts — coin/supply/FP/goods/medal production %.
 *   3. Quantum Incursion bonuses — production %, starting resources, AP
 *      recharge/capacity granted by main-city buildings (Ascended event
 *      buildings), with one-click transfer into the QI simulator's external
 *      boost fields.
 */

import { t } from './i18n.js';

// boost type → effective military stats it contributes to
// (same mapping FoE Helper uses in boosts.js `Mapper`)
const MILITARY_MAP = {
    att_boost_attacker:              ['attA'],
    def_boost_attacker:              ['defA'],
    att_boost_defender:              ['attD'],
    def_boost_defender:              ['defD'],
    att_def_boost_attacker:          ['attA', 'defA'],
    att_def_boost_defender:          ['attD', 'defD'],
    att_def_boost_attacker_defender: ['attA', 'defA', 'attD', 'defD'],
    // legacy aliases seen in imported data
    military_boost:                  ['attA', 'defA'],
    fierce_resistance:               ['attD', 'defD'],
    advanced_tactics:                ['attA', 'defA', 'attD', 'defD'],
};

const STATS = ['attA', 'defA', 'attD', 'defD'];
const STAT_ICONS = { attA: '⚔️', defA: '🛡️', attD: '⚔️', defD: '🛡️' };

// feature columns in display order; 'general' is the 'all' bucket
const FEATURE_COLUMNS = ['general', 'battleground', 'guild_expedition', 'guild_raids'];

// economy % boosts; aliases normalize importer naming to database naming
const ECON_ALIASES = {
    coin_boost:     'coin_production',
    money_boost:    'coin_production',
    supply_boost:   'supply_production',
    supplies_boost: 'supply_production',
};
const ECON_TYPES = [
    'coin_production', 'supply_production', 'forge_points_production',
    'goods_production', 'medal_production', 'guild_goods_production',
    'special_goods_production',
];
const ECON_ICONS = {
    coin_production:          '🪙',
    supply_production:        '⚙️',
    forge_points_production:  '🔷',
    goods_production:         '📦',
    medal_production:         '🏅',
    guild_goods_production:   '🏰',
    special_goods_production: '💠',
};

// Quantum Incursion bonuses granted by main-city buildings.
// flat = absolute amount (no % suffix)
const QI_TYPES = [
    { type: 'guild_raids_coins_production',        icon: '🪙', flat: false },
    { type: 'guild_raids_supplies_production',     icon: '⚙️', flat: false },
    { type: 'guild_raids_coins_start',             icon: '🪙', flat: true  },
    { type: 'guild_raids_supplies_start',          icon: '⚙️', flat: true  },
    { type: 'guild_raids_goods_start',             icon: '📦', flat: true  },
    { type: 'guild_raids_units_start',             icon: '⚔️', flat: true  },
    { type: 'guild_raids_action_points_collection', icon: '🎯', flat: true  },
    { type: 'guild_raids_action_points_capacity',  icon: '🔋', flat: true  },
];

export class BoostsDashboard {
    constructor(planner) {
        this.planner = planner;
    }

    /** Sum boosts of all placed buildings as { 'type|feature': value } */
    _collect() {
        const sums = {};
        for (const b of this.planner.buildings) {
            let boosts = b.boosts;
            if (!boosts || boosts.length === 0) {
                const tmpl = b.id && this.planner.buildingTemplates[b.id];
                boosts = tmpl && tmpl.boosts;
            }
            for (const boost of boosts || []) {
                const key = `${boost.type}|${boost.feature || 'all'}`;
                sums[key] = (sums[key] || 0) + (boost.value || 0);
            }
        }
        return sums;
    }

    /** Split raw sums into military-per-feature, economy and QI groups */
    compute() {
        const sums = this._collect();
        const perFeature = { all: {}, battleground: {}, guild_expedition: {}, guild_raids: {} };
        const economy = {};
        const qi = {};

        for (const [key, val] of Object.entries(sums)) {
            const [rawType, feature] = key.split('|');

            const statTargets = MILITARY_MAP[rawType];
            if (statTargets) {
                const bucket = perFeature[feature] ? feature : 'all';
                for (const stat of statTargets) {
                    perFeature[bucket][stat] = (perFeature[bucket][stat] || 0) + val;
                }
                continue;
            }

            const econType = ECON_ALIASES[rawType] || rawType;
            if (ECON_TYPES.includes(econType)) {
                economy[econType] = (economy[econType] || 0) + val;
                continue;
            }

            if (QI_TYPES.some(q => q.type === rawType)) {
                qi[rawType] = (qi[rawType] || 0) + val;
            }
        }

        // Effective per-column values.
        // GBG / GE inherit the general boosts; QI counts only its own tags.
        const columns = { general: { ...perFeature.all } };
        for (const f of ['battleground', 'guild_expedition']) {
            if (Object.keys(perFeature[f]).length > 0) {
                columns[f] = {};
                for (const s of STATS) {
                    const v = (perFeature.all[s] || 0) + (perFeature[f][s] || 0);
                    if (v) columns[f][s] = v;
                }
            }
        }
        if (Object.keys(perFeature.guild_raids).length > 0) {
            columns.guild_raids = { ...perFeature.guild_raids };
        }

        return { columns, economy, qi };
    }

    _fmt(n) {
        return Math.round(n || 0).toLocaleString();
    }

    _renderMilitary(columns) {
        const activeCols = FEATURE_COLUMNS.filter(c => columns[c] && Object.keys(columns[c]).length > 0);
        if (activeCols.length === 0) return '';

        const header = activeCols
            .map(c => `<th>${t('boostsModal.feature.' + c)}</th>`)
            .join('');
        const rows = STATS
            .filter(s => activeCols.some(c => columns[c][s]))
            .map(s => {
                const cells = activeCols
                    .map(c => `<td>${columns[c][s] ? '+' + this._fmt(columns[c][s]) + '%' : '–'}</td>`)
                    .join('');
                return `<tr><td class="boosts-stat">${STAT_ICONS[s]} ${t('boostsModal.stat.' + s)}</td>${cells}</tr>`;
            })
            .join('');

        return `
            <div class="prod-section prod-section-full">
                <div class="prod-section-title">${t('boostsModal.military')}</div>
                <div class="boosts-matrix-wrap">
                    <table class="boosts-matrix">
                        <thead><tr><th></th>${header}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${columns.guild_raids ? `<div class="boosts-note">${t('boostsModal.qiColumnNote')}</div>` : ''}
            </div>`;
    }

    _renderEconomy(economy) {
        const rows = ECON_TYPES
            .filter(type => economy[type])
            .map(type => `
                <div class="prod-row">
                    <span class="prod-label">${ECON_ICONS[type]} ${t('boostsModal.eco.' + type)}</span>
                    <span class="prod-value">+${this._fmt(economy[type])}%</span>
                </div>`)
            .join('');
        if (!rows) return '';
        return `
            <div class="prod-section prod-section-full" style="margin-top:12px;">
                <div class="prod-section-title">${t('boostsModal.economy')}</div>
                <div class="prod-grid">${rows}</div>
            </div>`;
    }

    _renderQI(qi) {
        const rows = QI_TYPES
            .filter(q => qi[q.type])
            .map(q => `
                <div class="prod-row">
                    <span class="prod-label">${q.icon} ${t('boostsModal.qi.' + q.type)}</span>
                    <span class="prod-value">+${this._fmt(qi[q.type])}${q.flat ? '' : '%'}</span>
                </div>`)
            .join('');
        if (!rows) return '';

        // Offer the simulator transfer only from the main city: on the quantum
        // tab these sums come from the QI buildings themselves, which the
        // simulator already counts automatically.
        const coins    = qi.guild_raids_coins_production    || 0;
        const supplies = qi.guild_raids_supplies_production || 0;
        const showApply = this.planner.activeCityType === 'main' && (coins || supplies);
        const applyBtn = showApply ? `
            <button class="btn btn-small" id="applyQiBoostsBtn"
                    data-coins="${coins}" data-supplies="${supplies}"
                    style="margin-top:8px;">
                ${t('boostsModal.applyToSim', { coins, supplies })}
            </button>` : '';

        return `
            <div class="prod-section prod-section-full" style="margin-top:12px;">
                <div class="prod-section-title">${t('boostsModal.qiSection')}</div>
                <div class="prod-grid">${rows}</div>
                ${applyBtn}
            </div>`;
    }

    render() {
        const { columns, economy, qi } = this.compute();
        const military = this._renderMilitary(columns);
        const econ     = this._renderEconomy(economy);
        const qiHtml   = this._renderQI(qi);

        if (!military && !econ && !qiHtml) {
            return `<div class="prod-summary-bar">${t('boostsModal.empty')}</div>`;
        }
        return `
            <div class="prod-summary-bar">
                ${t('boostsModal.summary', { count: this.planner.buildings.length })}
            </div>
            ${military}${econ}${qiHtml}`;
    }

    show() {
        document.getElementById('boostsDashboardBody').innerHTML = this.render();
        this.planner.showModal('boostsDashboardModal');
    }

    setupEvents() {
        // Delegated: the body is re-rendered on every show()
        document.getElementById('boostsDashboardBody').addEventListener('click', (e) => {
            const btn = e.target.closest('#applyQiBoostsBtn');
            if (!btn) return;
            this.planner.applyQIExternalBoosts(
                parseFloat(btn.dataset.coins) || 0,
                parseFloat(btn.dataset.supplies) || 0
            );
            btn.textContent = t('boostsModal.appliedToSim');
            btn.disabled = true;
        });
    }
}
