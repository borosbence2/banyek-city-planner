/**
 * ProductionOverview — calculates and displays production totals
 * for all buildings currently placed on the canvas.
 *
 * Production data in the database is stored as:
 *   building.prod[eraCode] = {
 *     population, demandHappiness, happiness,   // no timer
 *     money_24h,                                // residential daily coins
 *     supplies_5m, supplies_15m, ...,           // production building outputs
 *     strategy_points_24h, medals_1h,
 *     clan_goods_24h, premium_24h,
 *     <fragment_id>_24h, ...                    // any game resource key
 *   }
 *
 * Era codes: 'BronzeAge', 'IronAge', …, 'SpaceAgeSpaceHub'
 * Multi-age buildings have entries for every era; fixed-era buildings only their own.
 */

// ── Era code list (newest last) ────────────────────────────────────────────
const ERA_CODES = [
    'StoneAge', 'BronzeAge', 'IronAge', 'EarlyMiddleAge', 'HighMiddleAge',
    'LateMiddleAge', 'ColonialAge', 'IndustrialAge', 'ProgressiveEra',
    'ModernEra', 'PostModernEra', 'ContemporaryEra', 'TomorrowEra', 'FutureEra',
    'ArcticFuture', 'OceanicFuture', 'VirtualFuture',
    'SpaceAgeMars', 'SpaceAgeAsteroidBelt', 'SpaceAgeVenus', 'SpaceAgeTitan',
    'SpaceAgeJupiterMoon', 'SpaceAgeSpaceHub',
    'GuildRaids', // Quantum Incursion
];

// Era codes that mean "scales with player era" — use latest available
const MULTI_AGE_CODES = new Set(['MultiAge', 'AllAge', 'NoAge']);

// ── Resource display config ────────────────────────────────────────────────
// Priority order for display; anything not listed shows afterwards alphabetically
const RESOURCE_ORDER = [
    'money', 'supplies', 'strategy_points', 'medals', 'premium',
    'goods', 'clan_goods', 'diplomacy_currency',
    'finish_special_production', 'action_points',
];

const RESOURCE_LABELS = {
    money:               '🪙 Coins',
    supplies:            '⚙️ Supplies',
    strategy_points:     '🔷 Forge Points',
    medals:              '🏅 Medals',
    premium:             '💎 Diamonds',
    goods:               '📦 Goods',
    clan_goods:          '🏰 Guild Goods',
    diplomacy_currency:  '🤝 Diplomacy Goods',
    finish_special_production: '🧩 Fragments (special prod.)',
    action_points:       '🎯 Action Points',
    // Quantum Incursion (Guild Raids) resources
    guild_raids_population:   '👥 QI Population',
    guild_raids_happiness:    '😊 QI Happiness',
    guild_raids_money:        '🪙 QI Coins',
    guild_raids_supplies:     '⚙️ QI Supplies',
    guild_raids_chrono_alloy: '⚡ Chrono Alloy',
    guild_raids_honey:        '🍯 Honey',
    guild_raids_bronze:       '🥉 Bronze',
    guild_raids_brick:        '🧱 Brick',
    guild_raids_rope:         '🪢 Rope',
    guild_raids_ebony:        '🪵 Ebony',
    guild_raids_gems:         '💎 Gems',
    guild_raids_lead:         '⚫ Lead',
    guild_raids_limestone:    '🪨 Limestone',
    guild_raids_cloth:              '🧶 Cloth',
    guild_raids_gunpowder:          '💥 Gunpowder',
    guild_raids_actions:            '🎯 QI Actions',
};

const TIMER_LABELS = {
    '5m': '5 min', '15m': '15 min', '1h': '1 hr',
    '4h': '4 hr',  '8h': '8 hr',   '10h': '10 hr', '24h': '24 hr',
};

const TIMERS_ORDERED = ['5m', '15m', '1h', '4h', '8h', '10h', '24h'];

// ── Key parsing ────────────────────────────────────────────────────────────
function parseResourceKey(key) {
    for (const timer of TIMERS_ORDERED) {
        if (key.endsWith('_' + timer)) {
            return { resource: key.slice(0, -(timer.length + 1)), timer };
        }
    }
    return { resource: key, timer: null };
}

function resourceLabel(resource) {
    if (RESOURCE_LABELS[resource]) return RESOURCE_LABELS[resource];
    // Make unknown keys more readable: replace underscores, capitalise
    return '🔹 ' + resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Main class ─────────────────────────────────────────────────────────────
export class ProductionOverview {
    constructor(planner) {
        this.planner = planner;
    }

    /**
     * Determine which era code to use for a building's prod lookup.
     * Parses the era segment from the entity ID (e.g. 'R_IronAge_Bakery' → 'IronAge').
     * Multi-age buildings return null (caller should use latest available era).
     */
    _eraCodeFromId(id) {
        if (!id) return null;
        const segment = id.split('_')[1];
        if (!segment || MULTI_AGE_CODES.has(segment)) return null;
        return segment; // e.g. 'IronAge', 'SpaceAgeSpaceHub'
    }

    /**
     * Get the best stats object from prod for this building.
     * For fixed-era buildings: use that era's data.
     * For multi-age buildings: use the latest (highest) era available.
     * eraCode (optional): the raw era key stored on the building during import.
     */
    _getStats(buildingId, prod, eraCode) {
        if (!prod) return null;
        const code = eraCode || this._eraCodeFromId(buildingId);

        if (code) {
            // Fixed-era building: prefer exact era, then walk backwards
            const idx = ERA_CODES.indexOf(code);
            for (let i = (idx >= 0 ? idx : ERA_CODES.length - 1); i >= 0; i--) {
                if (prod[ERA_CODES[i]]) return prod[ERA_CODES[i]];
            }
        }

        // Multi-age / fallback: use latest available era
        for (let i = ERA_CODES.length - 1; i >= 0; i--) {
            if (prod[ERA_CODES[i]]) return prod[ERA_CODES[i]];
        }
        return null;
    }

    /**
     * Aggregate all production stats from placed + pool buildings.
     * Priority for stat source per building:
     *   1. b.efficiencyStats   (set by Efficiency Rating import — most accurate)
     *   2. template.efficiencyStats  (set when a matched template was updated)
     *   3. b.prod / template.prod    (classic database-derived production)
     */
    calculate() {
        const totals = {};
        const buildingCounts = {};
        const poolCounts = {};
        let hasProdData = false;

        const nameIndex = {};
        for (const [key, t] of Object.entries(this.planner.buildingTemplates)) {
            const nk = `${t.name}|${t.width}|${t.height}`;
            if (!nameIndex[nk]) nameIndex[nk] = key;
        }

        const processBuilding = (b, counts) => {
            const type = b.type || 'unknown';
            counts[type] = (counts[type] || 0) + 1;

            let templateKey = (b.id && this.planner.buildingTemplates[b.id]) ? b.id : null;
            if (!templateKey) {
                const nk = `${b.name}|${b.width}|${b.height}`;
                templateKey = nameIndex[nk] || null;
            }
            const template = templateKey ? this.planner.buildingTemplates[templateKey] : null;

            // ── Choose stat source ────────────────────────────────────────
            // 1. efficiencyStats directly on the building (efficiency rating import)
            const effStats = b.efficiencyStats || (template && template.efficiencyStats) || null;
            if (effStats) {
                hasProdData = true;
                for (const [key, val] of Object.entries(effStats)) {
                    totals[key] = (totals[key] || 0) + (val || 0);
                }
                return;
            }

            // 2. Classic prod from database/template
            const prod = (template && template.prod) || b.prod;
            if (!prod) return;
            const stats = this._getStats(templateKey || b.id, prod, b.eraCode);
            if (!stats) return;
            hasProdData = true;
            for (const [key, val] of Object.entries(stats)) {
                totals[key] = (totals[key] || 0) + (val || 0);
            }
        };

        for (const b of this.planner.buildings)            processBuilding(b, buildingCounts);
        for (const b of (this.planner.buildingPool || [])) processBuilding(b, poolCounts);

        return { totals, buildingCounts, poolCounts, hasProdData };
    }

    /** Format large numbers with thousands separators */
    _fmt(n) {
        return Math.round(n || 0).toLocaleString();
    }

    /**
     * Aggregate all boosts across placed + pool buildings.
     * Sources:
     *   - b.boosts[]            (from FoeImporter or Efficiency Rating import)
     *   - template.boosts[]     (from the updated database after re-running build_database.py)
     */
    _calculateMilitary() {
        const sums = {};
        const all = [...this.planner.buildings, ...(this.planner.buildingPool || [])];
        for (const b of all) {
            // Resolve boosts: building-level first, then template fallback
            let boostSource = b.boosts;
            if (!boostSource || boostSource.length === 0) {
                const tmpl = b.id && this.planner.buildingTemplates[b.id];
                boostSource = tmpl && tmpl.boosts;
            }
            for (const boost of boostSource || []) {
                const key = `${boost.type}|${boost.feature || 'all'}`;
                sums[key] = (sums[key] || 0) + (boost.value || 0);
            }
        }
        return sums;
    }

    /**
     * Aggregate items (fragment drops) from buildings that have them.
     * Returns { itemName: totalQty }
     */
    _calculateItems() {
        const sums = {};
        const all = [...this.planner.buildings, ...(this.planner.buildingPool || [])];
        for (const b of all) {
            let items = b.items;
            if (!items || items.length === 0) {
                const tmpl = b.id && this.planner.buildingTemplates[b.id];
                items = tmpl && tmpl.items;
            }
            for (const it of items || []) {
                sums[it.name] = (sums[it.name] || 0) + (it.qty || 0);
            }
        }
        return sums;
    }

    /** Build the inner HTML for the modal */
    render() {
        const { totals, buildingCounts, poolCounts, hasProdData } = this.calculate();
        const buildingCount = this.planner.buildings.length;
        const poolCount = (this.planner.buildingPool || []).length;

        // ── Special (non-timer) fields ─────────────────────────────────────
        const population       = totals.population       || 0;
        const demandHappiness  = totals.demandHappiness  || 0;
        const happiness        = totals.happiness        || 0;
        const happinessBalance = happiness - demandHappiness;
        const hbClass = happinessBalance >= 0 ? 'prod-positive' : 'prod-negative';
        const hbSign  = happinessBalance >= 0 ? '+' : '';

        // ── Group remaining keys by resource type ──────────────────────────
        const SKIP_KEYS = new Set(['population', 'demandHappiness', 'happiness']);
        const groups = {}; // { resource: { timer: value } }

        for (const [key, val] of Object.entries(totals)) {
            if (SKIP_KEYS.has(key) || !val) continue;
            const { resource, timer } = parseResourceKey(key);
            if (!groups[resource]) groups[resource] = {};
            groups[resource][timer || '24h'] = (groups[resource][timer || '24h'] || 0) + val;
        }

        // Sort: known resources first in RESOURCE_ORDER, then alphabetically
        const sortedResources = Object.keys(groups).sort((a, b) => {
            const ia = RESOURCE_ORDER.indexOf(a);
            const ib = RESOURCE_ORDER.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        });

        // ── Building counts ────────────────────────────────────────────────
        const TYPE_LABELS = {
            residential: 'Residential', production: 'Production', goods: 'Goods',
            culture: 'Culture', military: 'Military', great: 'Great Buildings',
            event: 'Events', townhall: 'Town Hall', unknown: 'Other',
        };
        // Merge canvas + pool counts for display
        const allTypes = new Set([...Object.keys(buildingCounts), ...Object.keys(poolCounts)]);
        const countRows = [...allTypes]
            .sort((a, b) => {
                const total = t => (buildingCounts[t] || 0) + (poolCounts[t] || 0);
                return total(b) - total(a);
            })
            .map(type => {
                const onCanvas = buildingCounts[type] || 0;
                const inPool   = poolCounts[type]    || 0;
                const poolNote = inPool > 0 ? ` <span class="prod-pool-note">(+${inPool} pool)</span>` : '';
                return `<tr><td>${TYPE_LABELS[type] || type}</td><td>${onCanvas}${poolNote}</td></tr>`;
            }).join('');

        // ── No prod data notice ────────────────────────────────────────────
        const noProdNotice = !hasProdData
            ? `<div class="prod-notice">⚠️ No production data found in the building database.<br>
               Run <code>python tools/build_database.py &lt;url&gt;</code> to rebuild it.</div>`
            : '';

        // ── Render resource rows ───────────────────────────────────────────
        const resourceSections = sortedResources.map(resource => {
            const timerMap = groups[resource];
            const rows = TIMERS_ORDERED
                .filter(t => timerMap[t])
                .map(t => `
                    <div class="prod-row">
                        <span class="prod-timer">${TIMER_LABELS[t] || t}</span>
                        <span class="prod-value">${this._fmt(timerMap[t])}</span>
                    </div>`)
                .join('');
            return `
                <div class="prod-resource-group">
                    <div class="prod-resource-label">${resourceLabel(resource)}</div>
                    ${rows}
                </div>`;
        }).join('');

        // ── All passive boosts ─────────────────────────────────────────────
        const BOOST_LABELS = {
            att_boost_attacker:              ['⚔️',    'Attack (Attacker)'],
            att_boost_defender:              ['⚔️',    'Attack (Defender)'],
            def_boost_attacker:              ['🛡️',   'Defense (Attacker)'],
            def_boost_defender:              ['🛡️',   'Defense (Defender)'],
            att_def_boost_attacker:          ['⚔️🛡️', 'Att+Def (Attacker)'],
            att_def_boost_defender:          ['⚔️🛡️', 'Att+Def (Defender)'],
            att_def_boost_attacker_defender: ['⚔️🛡️', 'Att+Def (Both)'],
            coin_boost:                      ['🪙',   'Coin Production Boost'],
            supply_boost:                    ['⚙️',   'Supply Production Boost'],
        };
        const FEATURE_LABELS = {
            all: '', battleground: ' [GBG]',
            guild_expedition: ' [GE]', guild_raids: ' [GR]',
        };
        const militarySums = this._calculateMilitary();
        const militaryRows = Object.entries(militarySums)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => {
                const [type, feature] = key.split('|');
                const [icon, label] = BOOST_LABELS[type] || ['⚡', type.replace(/_/g, ' ')];
                const feat = FEATURE_LABELS[feature] ?? ` [${feature}]`;
                const valStr = Number.isInteger(val) ? val : val.toFixed(1);
                return `<div class="prod-row">
                    <span class="prod-label">${icon} ${label}${feat}</span>
                    <span class="prod-value">+${valStr}%</span>
                </div>`;
            }).join('');

        const militarySection = militaryRows ? `
            <div class="prod-section prod-section-full" style="margin-top:12px;">
                <div class="prod-section-title">Passive % Boosts</div>
                <div class="prod-grid">${militaryRows}</div>
            </div>` : '';

        // ── Fragment items ─────────────────────────────────────────────────
        const itemSums = this._calculateItems();
        const itemRows = Object.entries(itemSums)
            .sort((a, b) => b[1] - a[1])
            .map(([name, qty]) => {
                const qtyStr = Number.isInteger(qty) ? qty : qty.toFixed(1);
                return `<div class="prod-row">
                    <span class="prod-label">${name}</span>
                    <span class="prod-value">${qtyStr}×</span>
                </div>`;
            }).join('');

        const itemsSection = itemRows ? `
            <div class="prod-section prod-section-full" style="margin-top:12px;">
                <div class="prod-section-title">🧩 Item Drops</div>
                <div class="prod-grid">${itemRows}</div>
            </div>` : '';

        return `
            <div class="prod-summary-bar">
                ${buildingCount} building${buildingCount !== 1 ? 's' : ''} on canvas
                ${poolCount > 0 ? `· <span class="prod-pool-note">${poolCount} in pool (included in totals)</span>` : ''}
            </div>
            ${noProdNotice}

            <div class="prod-sections">

                <div class="prod-section">
                    <div class="prod-section-title">Population &amp; Happiness</div>
                    <div class="prod-grid">
                        <div class="prod-row">
                            <span class="prod-label">👥 Population</span>
                            <span class="prod-value">${this._fmt(population)}</span>
                        </div>
                        <div class="prod-row">
                            <span class="prod-label">😊 Happiness provided</span>
                            <span class="prod-value">${this._fmt(happiness)}</span>
                        </div>
                        <div class="prod-row">
                            <span class="prod-label">😐 Happiness demand</span>
                            <span class="prod-value">${this._fmt(demandHappiness)}</span>
                        </div>
                        <div class="prod-row prod-row-total">
                            <span class="prod-label">⚖️ Balance</span>
                            <span class="prod-value ${hbClass}">${hbSign}${this._fmt(happinessBalance)}</span>
                        </div>
                    </div>
                </div>

                <div class="prod-section prod-section-counts">
                    <div class="prod-section-title">Building Counts</div>
                    <table class="prod-count-table">
                        <thead><tr><th>Type</th><th>Count</th></tr></thead>
                        <tbody>${countRows || '<tr><td colspan="2">No buildings placed</td></tr>'}</tbody>
                    </table>
                </div>

            </div>

            ${sortedResources.length > 0 ? `
            <div class="prod-section prod-section-full" style="margin-top:12px;">
                <div class="prod-section-title">Production (per building timer option)</div>
                <div class="prod-resource-list">
                    ${resourceSections}
                </div>
            </div>` : ''}
            ${militarySection}
            ${itemsSection}
        `;
    }

    show() {
        document.getElementById('prodOverviewBody').innerHTML = this.render();
        this.planner.showModal('prodOverviewModal');
    }

    setupEvents() {
        // No dynamic events needed — modal is re-rendered fresh each time show() is called
    }
}
