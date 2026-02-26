// Great Building bonus data sourced from https://foe-assistant.com/en/great-buildings
// Each entry: array of 80 values (index 0 = level 1, index 79 = level 80).
// Values are linearly interpolated between the sampled levels.
// Bonus types:
//   research          → Forge Points / 24h
//   military_boost    → Attack & defense boost for attacking units (%)
//   fierce_resistance → Attack & defense boost for defending units (%)
//   advanced_tactics  → Attack & defense boost for both attacking & defending units (%)
//   happiness         → Happiness provided
//   population        → Population provided
//   medals            → Medals / 24h
//   goods             → Random goods of player's age / 24h
//   goods_prev_age    → Random goods of previous age / 24h
//   guild_goods       → Guild goods / 24h (each type)
//   coins             → Coins / 24h
//   supplies          → Supplies / 24h
//   supply_boost      → Supply collection boost (%)
//   coin_boost        → Coin collection boost (%)
//   contrib_boost     → FP contribution bonus (%)
//   quest_boost       → Quest reward boost (%)
//   support_pool      → Support pool bonus
//   penal_unit        → Military units produced / 24h
//   double_collect    → Double collection chance (%)
//   first_strike      → First strike chance (%)
//   plunder_repel     → Plunder repel chance (%)
//   plunder_goods     → Goods when plundering
//   plunder_double    → Double plunder chance (%)
//   relic_hunt        → Relic hunt chance (%)
//   aid_blueprints    → Blueprint chance when aiding (%)
//   aid_goods         → Goods when aiding
//   helping_hands     → Additional aids per day
//   critical_hit      → Critical hit chance (%)
//   mysterious_shards → Mysterious shard chance (%) in Cultural Settlements
//   algorithmic_core  → Algorithmic core bonus (%)
//   diplomatic_gifts  → Diplomatic gift chance (%)
//   orbital_transfer  → Orbital transfer goods
//   missile_launch    → Missile launch chance (%)

// Helper: interpolate an array of [L1,L2,L3,L4,L5,L10,L20,L30,L40,L50,L60,L70,L80]
// sample points into a full 80-level array.
function interpGB(samples) {
    const keyLevels = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80];
    const result = new Array(80);
    for (let i = 0; i < keyLevels.length - 1; i++) {
        const l0 = keyLevels[i];
        const l1 = keyLevels[i + 1];
        const v0 = samples[i];
        const v1 = samples[i + 1];
        for (let l = l0; l < l1; l++) {
            result[l - 1] = Math.round((v0 + (v1 - v0) * (l - l0) / (l1 - l0)) * 100) / 100;
        }
    }
    result[79] = samples[12]; // level 80
    return result;
}

const _d = interpGB;

export const GB_BONUSES = {
    // ── Bronze Age ────────────────────────────────────────────────────────────
    "X_BronzeAge_Landmark1": { // Tower of Babel
        bonuses: [
            { type: 'goods',      label: 'Goods / 24h',     values: _d([6,7,8,9,10,15,25,35,45,55,65,75,85]) },
            { type: 'population', label: 'Population',      values: _d([90,140,200,280,360,1140,1613,1975,2280,2550,2793,3017,3225]) },
        ],
    },
    "X_BronzeAge_Landmark2": { // Statue of Zeus
        bonuses: [
            { type: 'military_boost', label: 'Att. military boost (%)', values: _d([3,6,9,12,15,30,35,40,45,50,55,61,65]) },
        ],
    },

    // ── Iron Age ──────────────────────────────────────────────────────────────
    "X_IronAge_Landmark1": { // Colosseum
        bonuses: [
            { type: 'happiness', label: 'Happiness',     values: _d([1100,1240,1460,1730,2040,4000,5657,6929,8000,8945,9798,10659,11314]) },
            { type: 'medals',    label: 'Medals / 24h',  values: _d([10,11,12,13,15,35,61,85,107,127,147,168,185]) },
        ],
    },
    "X_IronAge_Landmark2": { // Lighthouse of Alexandria
        bonuses: [
            { type: 'goods',        label: 'Goods / 24h',          values: _d([8,9,10,12,13,19,29,39,49,59,69,79,89]) },
            { type: 'supply_boost', label: 'Supply boost (%)',      values: _d([60,65,75,85,95,145,195,245,295,345,395,445,495]) },
        ],
    },

    // ── Early Middle Ages ─────────────────────────────────────────────────────
    "X_EarlyMiddleAge_Landmark1": { // Hagia Sophia
        bonuses: [
            { type: 'research',   label: 'Forge Points / 24h', values: _d([1,1,2,2,3,6,12,18,24,30,36,42,48]) },
            { type: 'happiness',  label: 'Happiness',          values: _d([1700,1920,2280,2710,3220,6400,9051,11086,12800,14311,15677,16933,18102]) },
        ],
    },
    "X_EarlyMiddleAge_Landmark2": { // Cathedral of Aachen
        bonuses: [
            { type: 'coins',          label: 'Coins / 24h',           values: _d([2610,3420,4480,5730,7150,18950,45071,74819,107198,141685,177951,219626,254960]) },
            { type: 'military_boost', label: 'Att. military boost (%)',values: _d([3,6,9,12,15,30,35,40,45,50,55,61,65]) },
        ],
    },
    "X_EarlyMiddleAge_Landmark3": { // Galata Tower
        bonuses: [
            { type: 'goods',         label: 'Goods / 24h',      values: _d([5,5,6,7,8,12,22,32,42,52,62,72,82]) },
            { type: 'plunder_repel', label: 'Plunder repel (%)', values: _d([16,18,20,22,23,28,31.68,34.98,37.59,41.39,44.39,47.19,49.76]) },
        ],
    },

    // ── High Middle Ages ──────────────────────────────────────────────────────
    "X_HighMiddleAge_Landmark1": { // St. Mark's Basilica
        bonuses: [
            { type: 'coin_boost', label: 'Coin boost (%)',  values: _d([100,120,135,150,170,250,300,350,400,450,500,550,600]) },
            { type: 'goods',      label: 'Goods / 24h',     values: _d([10,12,13,15,17,25,35,45,55,65,75,85,95]) },
        ],
    },
    "X_HighMiddleAge_Landmark3": { // Notre Dame
        bonuses: [
            { type: 'happiness', label: 'Happiness',      values: _d([1100,1230,1450,1710,2000,3900,5516,6755,7800,8721,9554,10319,11031]) },
            { type: 'supplies',  label: 'Supplies / 24h', values: _d([1380,1680,2080,2550,3090,7240,17220,28586,40956,54132,67988,82435,97410]) },
        ],
    },

    // ── Late Middle Ages ──────────────────────────────────────────────────────
    "X_LateMiddleAge_Landmark1": { // Saint Basil's Cathedral
        bonuses: [
            { type: 'coins',             label: 'Coins / 24h',           values: _d([4900,6150,7770,9680,11860,30210,71852,119276,170894,225873,283688,350126,406456]) },
            { type: 'fierce_resistance', label: 'Def. military boost (%)',values: _d([3,6,9,12,15,30,35,40,45,50,55,61,65]) },
        ],
    },
    "X_LateMiddleAge_Landmark3": { // Castel del Monte
        bonuses: [
            { type: 'research',       label: 'Forge Points / 24h',    values: _d([1,1,2,2,3,6,12,18,24,30,36,42,48]) },
            { type: 'military_boost', label: 'Att. military boost (%)',values: _d([3,6,9,12,15,30,35,40,45,50,55,60,65]) },
        ],
    },

    // ── Colonial Age ──────────────────────────────────────────────────────────
    "X_ColonialAge_Landmark1": { // Frauenkirche of Dresden
        bonuses: [
            { type: 'goods',     label: 'Goods / 24h', values: _d([7,8,9,10,11,17,27,37,47,57,67,77,87]) },
            { type: 'happiness', label: 'Happiness',   values: _d([1500,1660,1920,2240,2600,4900,6930,8488,9800,10957,12003,12965,13860]) },
        ],
    },
    "X_ColonialAge_Landmark2": { // Deal Castle
        bonuses: [
            { type: 'fierce_resistance', label: 'Def. military boost (%)', values: _d([3,6,9,12,15,30,35,40,45,50,55,61,65]) },
            { type: 'medals',            label: 'Medals / 24h',            values: _d([40,46,54,64,74,170,296,410,516,617,713,816,898]) },
        ],
    },

    // ── Industrial Age ────────────────────────────────────────────────────────
    "X_IndustrialAge_Landmark1": { // Royal Albert Hall
        bonuses: [
            { type: 'goods',        label: 'Goods / 24h',     values: _d([11,12,14,16,18,27,37,47,57,67,77,87,97]) },
            { type: 'supply_boost', label: 'Supply boost (%)', values: _d([70,85,95,110,120,200,250,300,350,400,450,500,550]) },
        ],
    },
    "X_IndustrialAge_Landmark2": { // Capitol
        bonuses: [
            { type: 'population', label: 'Population',      values: _d([2450,2880,3440,4100,4850,10530,14892,18239,21060,23546,25794,28059,29784]) },
            { type: 'supplies',   label: 'Supplies / 24h',  values: _d([3900,4600,5400,6400,7500,15800,37579,62382,89379,118133,148371,183118,212579]) },
        ],
    },

    // ── Progressive Era ───────────────────────────────────────────────────────
    "X_ProgressiveEra_Landmark1": { // Alcatraz
        bonuses: [
            { type: 'happiness',  label: 'Happiness',             values: _d([2700,3100,3750,4550,5470,11300,15981,19573,22600,25268,27680,30322,31962]) },
            { type: 'penal_unit', label: 'Military units / 24h',  values: _d([4,4,5,5,5,8,18,28,38,48,58,70,78]) },
        ],
    },
    "X_ProgressiveEra_Landmark2": { // Château Frontenac
        bonuses: [
            { type: 'coins',       label: 'Coins / 24h',         values: _d([7670,8950,10860,14310,15900,51260,121918,202386,289971,383258,481358,583649,689670]) },
            { type: 'quest_boost', label: 'Quest reward boost (%)',values: _d([50,60,70,80,90,150,200,250,300,350,400,450,500]) },
        ],
    },

    // ── Modern Era ────────────────────────────────────────────────────────────
    "X_ModernEra_Landmark1": { // Space Needle
        bonuses: [
            { type: 'coins',     label: 'Coins / 24h', values: _d([11600,13500,15400,21800,24200,69100,164349,272823,390889,516644,648885,800850,929696]) },
            { type: 'happiness', label: 'Happiness',   values: _d([1200,1370,1640,1980,2360,4800,6789,8314,9600,10734,11758,12790,13577]) },
        ],
    },
    "X_ModernEra_Landmark2": { // Atomium
        bonuses: [
            { type: 'guild_goods', label: 'Guild goods / 24h', values: _d([6,7,8,9,11,17,37,57,77,97,117,137,157]) },
            { type: 'happiness',   label: 'Happiness',         values: _d([2400,2740,3290,3970,4750,9700,13718,16801,19400,21690,23761,25664,27436]) },
        ],
    },

    // ── Post-Modern Era ───────────────────────────────────────────────────────
    "X_PostModernEra_Landmark1": { // Cape Canaveral
        bonuses: [
            { type: 'research', label: 'Forge Points / 24h', values: _d([2,2,3,4,5,10,20,30,40,50,60,70,80]) },
        ],
    },
    "X_PostModernEra_Landmark2": { // The Habitat
        bonuses: [
            { type: 'coins',      label: 'Coins / 24h', values: _d([10100,11800,13400,19700,21900,50800,120824,200570,287369,379819,477038,588758,683481]) },
            { type: 'population', label: 'Population',  values: _d([4410,5150,5880,7580,8420,18750,26517,32476,37500,41927,45928,49961,53034]) },
        ],
    },

    // ── Contemporary Era ──────────────────────────────────────────────────────
    "X_ContemporaryEra_Landmark1": { // Lotus Temple
        bonuses: [
            { type: 'coins',     label: 'Coins / 24h', values: _d([10100,11800,13400,19700,21900,50800,120824,200570,287369,379819,477038,588758,683481]) },
            { type: 'happiness', label: 'Happiness',   values: _d([2400,2760,3330,4040,4850,10000,14143,17321,20000,22361,24495,26646,28285]) },
        ],
    },
    "X_ContemporaryEra_Landmark2": { // Innovation Tower
        bonuses: [
            { type: 'research',   label: 'Forge Points / 24h', values: _d([1,1,2,2,3,6,12,18,24,30,36,42,48]) },
            { type: 'population', label: 'Population',         values: _d([3600,4200,4800,6190,6880,15310,21652,26518,30620,34235,37502,40507,43304]) },
        ],
    },

    // ── Tomorrow Era ──────────────────────────────────────────────────────────
    "X_TomorrowEra_Landmark1": { // Voyager V1
        bonuses: [
            { type: 'plunder_goods', label: 'Plunder goods',  values: _d([3,4,5,6,7,12,15,19,22,25,29,32,35]) },
            { type: 'supplies',      label: 'Supplies / 24h', values: _d([13200,15400,17600,21700,24100,42200,100370,166615,238720,315519,396280,480491,567774]) },
        ],
    },
    "X_TomorrowEra_Landmark2": { // Trust Tower
        bonuses: [
            { type: 'aid_goods', label: 'Goods when aiding', values: _d([12,15,18,21,24,39,49,59,69,79,89,99,109]) },
            { type: 'supplies',  label: 'Supplies / 24h',    values: _d([14100,16500,18800,23200,25800,45200,107505,178460,255690,337949,424451,514649,608137]) },
        ],
    },

    // ── Future Era ────────────────────────────────────────────────────────────
    "X_FutureEra_Landmark1": { // The Arc
        bonuses: [
            { type: 'contrib_boost', label: 'Contribution boost (%)',  values: _d([10,12,14,17,19,31,41,51,61,71,80,85.5,90]) },
            { type: 'guild_goods',   label: 'Guild goods / 24h',       values: _d([9,10,12,13,15,22,42,62,82,102,122,142,162]) },
        ],
    },
    "X_FutureEra_Landmark2": { // Rain Forest Project
        bonuses: [
            { type: 'aid_blueprints', label: 'Blueprint chance when aiding (%)', values: _d([33,40,47,53,60,93,164,221,273,323,371,418,463]) },
            { type: 'goods',          label: 'Goods / 24h',                      values: _d([13,16,18,20,22,34,44,54,64,74,84,94,104]) },
        ],
    },

    // ── Arctic Future ─────────────────────────────────────────────────────────
    "X_ArcticFuture_Landmark1": { // Gaea Statue
        bonuses: [
            { type: 'happiness', label: 'Happiness',    values: _d([4000,4390,5020,5790,6670,12300,17395,21305,24600,27504,30129,32543,34790]) },
            { type: 'medals',    label: 'Medals / 24h', values: _d([127,139,155,173,194,367,639,884,1113,1330,1539,1741,1938]) },
        ],
    },
    "X_ArcticFuture_Landmark2": { // Arctic Orangery
        bonuses: [
            { type: 'critical_hit', label: 'Critical hit (%)',        values: _d([4.87,5.07,5.28,5.50,5.73,6.98,8.75,10.54,12.63,15.03,17.73,20.99,23.82]) },
            { type: 'research',     label: 'Forge Points / 24h',      values: _d([2,2,3,4,5,10,20,30,40,50,60,70,80]) },
        ],
    },
    "X_ArcticFuture_Landmark3": { // Seed Vault
        bonuses: [
            { type: 'helping_hands', label: 'Helping hands / day',  values: _d([2,2.1,2.2,2.3,2.4,2.9,3.82,4.83,6.04,7.45,9.02,10.90,12.5]) },
            { type: 'supplies',      label: 'Supplies / 24h',        values: _d([21400,22700,24000,28500,30000,50600,120348,199781,286237,378324,475160,586440,680790]) },
        ],
    },

    // ── Oceanic Future ────────────────────────────────────────────────────────
    "X_OceanicFuture_Landmark1": { // Atlantis Museum
        bonuses: [
            { type: 'goods',          label: 'Goods / 24h',           values: _d([10,12,14,15,17,26,36,46,56,66,76,86,96]) },
            { type: 'plunder_double', label: 'Double plunder (%)',     values: _d([12,13,14.25,15.4,16.6,22.75,27.27,30.94,34.37,37.43,40.06,42.26,44.04]) },
        ],
    },
    "X_OceanicFuture_Landmark2": { // The Kraken
        bonuses: [
            { type: 'first_strike', label: 'First strike (%)',       values: _d([20,21,22,23,25,32,48.33,64.57,78.02,87.36,93.09,96.33,98.08]) },
            { type: 'research',     label: 'Forge Points / 24h',     values: _d([1,1,3,3,4,8,16,24,32,40,48,56,64]) },
        ],
    },
    "X_OceanicFuture_Landmark3": { // The Blue Galaxy
        bonuses: [
            { type: 'double_collect', label: 'Double collection (%)', values: _d([17,19,21,23,25,32,40,46,52,57,62,65,68]) },
            { type: 'medals',         label: 'Medals / 24h',          values: _d([140,153,170,190,214,404,704,973,1225,1581,1694,1917,2133]) },
        ],
    },

    // ── Virtual Future ────────────────────────────────────────────────────────
    "X_VirtualFuture_Landmark1": { // Terracotta Army
        bonuses: [
            { type: 'advanced_tactics', label: 'Att. & def. boost (%)', values: _d([2,4,6,8,10,20,25,30,35,40,45,50,55]) },
        ],
    },
    "X_VirtualFuture_Landmark2": { // Himeji Castle
        bonuses: [
            { type: 'spoils_of_war', label: 'Spoils of war (%)',  values: _d([7,9,11,13,15,25,31.12,36.55,40.88,44.04,46.21,47.74,48.53]) },
            { type: 'supplies',      label: 'Supplies / 24h',     values: _d([102500,108900,115300,136800,144000,243000,577955,959418,1374620,1816850,2281890,2816300,3269410]) },
        ],
    },

    // ── Space Age Mars ────────────────────────────────────────────────────────
    "X_SpaceAgeMars_Landmark1": { // Observatory
        bonuses: [
            { type: 'guild_goods',   label: 'Guild goods / 24h', values: _d([3,4,4,5,6,8,28,48,68,88,108,128,148]) },
            { type: 'support_pool',  label: 'Support pool',      values: _d([10,20,30,40,50,100,130,160,190,220,250,280,310]) },
        ],
    },
    "X_SpaceAgeMars_Landmark2": { // The Virgo Project
        bonuses: [
            { type: 'coins',          label: 'Coins / 24h',       values: _d([20000,23300,26700,39100,43400,100800,239745,397981,570211,753656,946564,1168240,1356200]) },
            { type: 'missile_launch', label: 'Missile launch (%)', values: _d([20,22,24,26,28,38,48.89,57.30,62.85,66.14,67.96,69.01,69.45]) },
        ],
    },

    // ── Space Age Asteroid Belt ───────────────────────────────────────────────
    "X_SpaceAgeAsteroidBelt_Landmark1": { // Space Carrier
        bonuses: [
            { type: 'diplomatic_gifts', label: 'Diplomatic gifts (%)', values: _d([7,9,11,13,15,25,31.12,36.55,40.88,44.04,46.21,47.63,48.53]) },
            { type: 'orbital_transfer', label: 'Orbital transfer',     values: _d([10,12,14,16,17,26,37,47,56,64,69,73,76]) },
        ],
    },

    // ── Space Age Venus ───────────────────────────────────────────────────────
    "X_SpaceAgeVenus_Landmark1": { // Flying Island
        bonuses: [
            { type: 'mysterious_shards', label: 'Mysterious shards (%)', values: _d([19.08,19.39,19.70,20.01,20.32,21.91,25.18,28.48,31.73,34.82,37.68,40.73,42.52]) },
        ],
    },

    // ── Space Age Titan ───────────────────────────────────────────────────────
    "X_SpaceAgeTitan_Landmark1": { // Saturn VI Gate CENTAURUS
        bonuses: [
            { type: 'goods_prev_age',  label: 'Prev. age goods / 24h', values: _d([5,10,15,20,25,50,98,162,233,304,369,435,486]) },
            { type: 'military_boost',  label: 'Att. military boost (%)',values: _d([4,8,12,16,20,40,80,120,160,200,240,284,320]) },
        ],
    },
    "X_SpaceAgeTitan_Landmark2": { // Saturn VI Gate PEGASUS
        bonuses: [
            { type: 'fierce_resistance', label: 'Def. military boost (%)', values: _d([5,10,15,20,25,50,100,150,200,250,300,350,400]) },
            { type: 'research',          label: 'Forge Points / 24h',      values: _d([2,4,6,8,10,20,40,60,80,100,120,140,160]) },
        ],
    },
    "X_SpaceAgeTitan_Landmark3": { // Saturn VI Gate HYDRA
        bonuses: [
            { type: 'advanced_tactics', label: 'Att. & def. boost (%)', values: _d([3,6,9,12,15,30,60,90,120,150,180,210,240]) },
            { type: 'guild_goods',      label: 'Guild goods / 24h',     values: _d([3,6,9,12,15,30,60,90,120,150,180,210,240]) },
        ],
    },

    // ── Space Age Jupiter Moon ────────────────────────────────────────────────
    "X_SpaceAgeJupiterMoon_Landmark1": { // AI Core
        bonuses: [
            { type: 'algorithmic_core', label: 'Algorithmic core (%)', values: _d([5,6,7,9,10,17,22.51,27.49,32.28,36.55,40.11,43.15,45.01]) },
            { type: 'guild_goods',      label: 'Guild goods / 24h',    values: _d([12,13,15,16,18,25,45,65,85,105,125,145,165]) },
        ],
    },

    // ── Space Age Space Hub ───────────────────────────────────────────────────
    "X_SpaceAgeSpaceHub_Landmark1": { // Stellar Warship
        bonuses: [
            { type: 'advanced_tactics', label: 'Att. & def. boost (%)',  values: _d([5,10,15,20,25,50,100,150,200,250,300,350,400]) },
            { type: 'penal_unit',        label: 'Military units / 24h',  values: _d([2,4,6,8,10,20,40,60,80,100,120,140,160]) },
        ],
    },
    "X_SpaceAgeSpaceHub_Landmark2": { // Cosmic Catalyst
        bonuses: [
            { type: 'critical_hit',  label: 'Critical hit (%)',     values: _d([1,2,3,4,5,10,11.67,13.33,15,16.67,18.33,20,21.67]) },
            { type: 'guild_goods',   label: 'Guild goods / 24h',    values: _d([5,10,15,20,25,50,100,150,200,250,300,350,400]) },
        ],
    },

    // ── All Ages ──────────────────────────────────────────────────────────────
    "X_AllAge_Oracle": { // Oracle of Delphi
        bonuses: [
            { type: 'happiness', label: 'Happiness',      values: _d([300,370,480,610,750,1700,2405,2945,3400,3802,4165,4498,4809]) },
            { type: 'supplies',  label: 'Supplies / 24h', values: _d([550,860,1260,1730,2270,6990,16626,27599,39542,52263,65640,79589,94046]) },
        ],
    },
    "X_AllAge_Expedition": { // Temple of Relics
        bonuses: [
            { type: 'relic_hunt', label: 'Relic hunt (%)', values: _d([12,12.5,13,13.5,14,16.25,20.25,23.75,26.5,28.75,30.25,31.75,32.5]) },
        ],
    },
    "X_AllAge_EasterBonus4": { // Observatory (All Ages version — same data)
        bonuses: [
            { type: 'guild_goods',  label: 'Guild goods / 24h', values: _d([3,4,4,5,6,8,28,48,68,88,108,128,148]) },
            { type: 'support_pool', label: 'Support pool',      values: _d([10,20,30,40,50,100,130,160,190,220,250,280,310]) },
        ],
    },

    // Star Gazer — no fixed ID in current DB listing, included for completeness
    // "X_???": Star Gazer: goods_prev_age [5,10,15,20,25,50,75,99,119,132,140,145,147]
};