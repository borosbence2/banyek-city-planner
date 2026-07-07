import { t } from './i18n.js';

// Production boost types — % multiplier on resource production
const PROD_BOOST_TYPES = {
    'guild_raids_supplies_production': 'guild_raids_supplies',
    'guild_raids_coins_production':    'guild_raids_money',
};

// Flat per-cycle accumulation (not %)
const FLAT_BOOST_TYPES = ['guild_raids_action_points_collection'];

// Base QA cap — extendable by guild_raids_action_points_capacity boosts
const QA_BASE_CAP = 200_000;

// Euphoria % → { mult, state }
const EUPHORIA_THRESHOLDS = [
    { max: 20,       mult: 0.2, state: 'Rebelling'    },
    { max: 60,       mult: 0.6, state: 'Unruly'       },
    { max: 80,       mult: 0.8, state: 'Unhappy'      },
    { max: 120,      mult: 1.0, state: 'Neutral'      },
    { max: 140,      mult: 1.1, state: 'Content'      },
    { max: 199.999,  mult: 1.2, state: 'Happy'        }, // <200% (FoE Helper: 1.5 only at ≥200%)
    { max: Infinity, mult: 1.5, state: 'Enthusiastic' },
];

// Resources shown in stockpile and available as starting resources
// isGoods = true marks donation goods (spendable on map nodes)
const QI_RESOURCES = [
    { key: 'guild_raids_supplies',     icon: '⚙️', label: 'QI Supplies'      },
    { key: 'guild_raids_money',        icon: '🪙', label: 'QI Coins'         },
    { key: 'guild_raids_chrono_alloy', icon: '⚡', label: 'Chrono Alloy'     },
    { key: 'guild_raids_action_points',icon: '🎯', label: 'Action Points'    },
    { key: 'guild_raids_shards',       icon: '🔮', label: 'Quantum Shards'   },
    { key: 'guild_raids_lunar_coins',  icon: '🌙', label: 'Lunar Coins'      },
    { key: 'guild_raids_honey',        icon: '🍯', label: 'Honey',      isGoods: true },
    { key: 'guild_raids_bronze',       icon: '🥉', label: 'Bronze',     isGoods: true },
    { key: 'guild_raids_brick',        icon: '🧱', label: 'Brick',      isGoods: true },
    { key: 'guild_raids_rope',         icon: '🪢', label: 'Rope',       isGoods: true },
    { key: 'guild_raids_gunpowder',    icon: '💥', label: 'Gunpowder',  isGoods: true },
];

// On-demand goods production buildings (data from game JSON)
const QI_GOODS_BUILDINGS = [
    { id: 'W_GuildRaidsEarlyMiddleAge_Beekeeper',          name: 'Beekeeper',            icon: '🍯', product: 'guild_raids_honey',     productLabel: 'Honey',
      options: [{amount:2,cost:{guild_raids_money:10000,guild_raids_supplies:8000}},{amount:6,cost:{guild_raids_money:27000,guild_raids_supplies:21600}},{amount:12,cost:{guild_raids_money:48000,guild_raids_supplies:38400}},{amount:20,cost:{guild_raids_money:70000,guild_raids_supplies:56000}}] },
    { id: 'W_GuildRaidsEarlyMiddleAge_BronzeFoundry',       name: 'Bronze Foundry',       icon: '🥉', product: 'guild_raids_bronze',    productLabel: 'Bronze',
      options: [{amount:2,cost:{guild_raids_money:9000,guild_raids_supplies:7000}},{amount:6,cost:{guild_raids_money:24300,guild_raids_supplies:18900}},{amount:12,cost:{guild_raids_money:43200,guild_raids_supplies:33600}},{amount:20,cost:{guild_raids_money:70000,guild_raids_supplies:56000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Brickworks',           name: 'Brickworks',           icon: '🧱', product: 'guild_raids_brick',     productLabel: 'Brick',
      options: [{amount:2,cost:{guild_raids_money:10000,guild_raids_supplies:8000}},{amount:6,cost:{guild_raids_money:27000,guild_raids_supplies:21600}},{amount:12,cost:{guild_raids_money:48000,guild_raids_supplies:38400}},{amount:20,cost:{guild_raids_money:70000,guild_raids_supplies:56000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Ropery',               name: 'Ropery',               icon: '🪢', product: 'guild_raids_rope',      productLabel: 'Rope',
      options: [{amount:2,cost:{guild_raids_money:10000,guild_raids_supplies:8000}},{amount:6,cost:{guild_raids_money:27000,guild_raids_supplies:21600}},{amount:12,cost:{guild_raids_money:48000,guild_raids_supplies:38400}},{amount:20,cost:{guild_raids_money:70000,guild_raids_supplies:56000}}] },
    { id: 'W_GuildRaidsLateMiddleAge_Gunpowder',            name: 'Gunpowder Mill',       icon: '💥', product: 'guild_raids_gunpowder', productLabel: 'Gunpowder',
      options: [{amount:2,cost:{guild_raids_money:10000,guild_raids_supplies:8000}},{amount:6,cost:{guild_raids_money:27000,guild_raids_supplies:21600}},{amount:12,cost:{guild_raids_money:48000,guild_raids_supplies:38400}},{amount:20,cost:{guild_raids_money:70000,guild_raids_supplies:56000}}] },
];

// Military recruitment buildings (data from game JSON)
const QI_MILITARY_BUILDINGS = [
    // Early Middle Age
    { id: 'W_GuildRaidsEarlyMiddleAge_Archeryrange',             name: 'Archery Range',           icon: '🏹', unitType: 'guild_raids_mounted_bowman',          unitLabel: 'Mounted Bowman',
      options: [{amount:1,cost:{guild_raids_money:5000,guild_raids_supplies:4000}},{amount:3,cost:{guild_raids_money:13500,guild_raids_supplies:10800}},{amount:6,cost:{guild_raids_money:24000,guild_raids_supplies:19200}},{amount:10,cost:{guild_raids_money:35000,guild_raids_supplies:28000}}] },
    { id: 'W_GuildRaidsEarlyMiddleAge_Armoredswordsmsanbarracks', name: 'Armored Swordsman Bks.', icon: '🛡️', unitType: 'guild_raids_armoredswordsman',         unitLabel: 'Armored Swordsman',
      options: [{amount:1,cost:{guild_raids_money:5000,guild_raids_supplies:4000}},{amount:3,cost:{guild_raids_money:13500,guild_raids_supplies:10800}},{amount:6,cost:{guild_raids_money:24000,guild_raids_supplies:19200}},{amount:10,cost:{guild_raids_money:35000,guild_raids_supplies:28000}}] },
    { id: 'W_GuildRaidsEarlyMiddleAge_Spearmanbarracks',         name: 'Spearman Barracks',       icon: '🗡️', unitType: 'guild_raids_spearman',                unitLabel: 'Spearman',
      options: [{amount:1,cost:{guild_raids_money:5000,guild_raids_supplies:4000}},{amount:3,cost:{guild_raids_money:13500,guild_raids_supplies:10800}},{amount:6,cost:{guild_raids_money:24000,guild_raids_supplies:19200}},{amount:10,cost:{guild_raids_money:35000,guild_raids_supplies:28000}}] },
    { id: 'W_GuildRaidsEarlyMiddleAge_Stablecataphract',         name: 'Cataphract Stable',       icon: '🐎', unitType: 'guild_raids_cataphract',              unitLabel: 'Cataphract',
      options: [{amount:1,cost:{guild_raids_money:5000,guild_raids_supplies:4000}},{amount:3,cost:{guild_raids_money:13500,guild_raids_supplies:10800}},{amount:6,cost:{guild_raids_money:24000,guild_raids_supplies:19200}},{amount:10,cost:{guild_raids_money:35000,guild_raids_supplies:28000}}] },
    { id: 'W_GuildRaidsEarlyMiddleAge_Siegecamp',                name: 'Siege Camp',              icon: '💣', unitType: 'guild_raids_catapult',                unitLabel: 'Catapult',
      options: [{amount:1,cost:{guild_raids_money:5000,guild_raids_supplies:4000}},{amount:3,cost:{guild_raids_money:13500,guild_raids_supplies:10800}},{amount:6,cost:{guild_raids_money:24000,guild_raids_supplies:19200}},{amount:10,cost:{guild_raids_money:35000,guild_raids_supplies:28000}}] },
    // High Middle Age
    { id: 'W_GuildRaidsHighMiddleAge_Archery',                   name: 'Archery',                 icon: '🏹', unitType: 'guild_raids_crossbowman',             unitLabel: 'Crossbowman',
      options: [{amount:1,cost:{guild_raids_money:6000,guild_raids_supplies:5000}},{amount:3,cost:{guild_raids_money:16200,guild_raids_supplies:13500}},{amount:6,cost:{guild_raids_money:28800,guild_raids_supplies:24000}},{amount:10,cost:{guild_raids_money:42000,guild_raids_supplies:35000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Axehammer',                 name: 'Axe Barracks',            icon: '🪓', unitType: 'guild_raids_axe_hammer_warrior',      unitLabel: 'Axe Warrior',
      options: [{amount:1,cost:{guild_raids_money:6000,guild_raids_supplies:5000}},{amount:3,cost:{guild_raids_money:16200,guild_raids_supplies:13500}},{amount:6,cost:{guild_raids_money:28800,guild_raids_supplies:24000}},{amount:10,cost:{guild_raids_money:42000,guild_raids_supplies:35000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Dismountedknight',          name: 'Knight Barracks',         icon: '⚔️', unitType: 'guild_raids_dismounted_knight',        unitLabel: 'Dismounted Knight',
      options: [{amount:1,cost:{guild_raids_money:6000,guild_raids_supplies:5000}},{amount:3,cost:{guild_raids_money:16200,guild_raids_supplies:13500}},{amount:6,cost:{guild_raids_money:28800,guild_raids_supplies:24000}},{amount:10,cost:{guild_raids_money:42000,guild_raids_supplies:35000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Stable',                    name: 'Stable',                  icon: '🐎', unitType: 'guild_raids_feudal_knight',           unitLabel: 'Feudal Knight',
      options: [{amount:1,cost:{guild_raids_money:6000,guild_raids_supplies:5000}},{amount:3,cost:{guild_raids_money:16200,guild_raids_supplies:13500}},{amount:6,cost:{guild_raids_money:28800,guild_raids_supplies:24000}},{amount:10,cost:{guild_raids_money:42000,guild_raids_supplies:35000}}] },
    { id: 'W_GuildRaidsHighMiddleAge_Siege',                     name: 'Siege Camp',              icon: '🎯', unitType: 'guild_raids_trebuchet',               unitLabel: 'Trebuchet',
      options: [{amount:1,cost:{guild_raids_money:6000,guild_raids_supplies:5000}},{amount:3,cost:{guild_raids_money:16200,guild_raids_supplies:13500}},{amount:6,cost:{guild_raids_money:28800,guild_raids_supplies:24000}},{amount:10,cost:{guild_raids_money:42000,guild_raids_supplies:35000}}] },
    // Late Middle Age
    { id: 'W_GuildRaidsLateMiddleAge_Archeryrange',              name: 'Archery Range',           icon: '🏹', unitType: 'guild_raids_longbowman',              unitLabel: 'Longbowman',
      options: [{amount:1,cost:{guild_raids_money:7000,guild_raids_supplies:6000}},{amount:3,cost:{guild_raids_money:18900,guild_raids_supplies:16200}},{amount:6,cost:{guild_raids_money:33600,guild_raids_supplies:28800}},{amount:10,cost:{guild_raids_money:49000,guild_raids_supplies:42000}}] },
    { id: 'W_GuildRaidsLateMiddleAge_BidenhnderMercenaryBarracks', name: 'Merc. Barracks',        icon: '⚔️', unitType: 'guild_raids_biedenhaender_mercenary', unitLabel: 'Bidenhänder Merc',
      options: [{amount:1,cost:{guild_raids_money:7000,guild_raids_supplies:6000}},{amount:3,cost:{guild_raids_money:18900,guild_raids_supplies:16200}},{amount:6,cost:{guild_raids_money:33600,guild_raids_supplies:28800}},{amount:10,cost:{guild_raids_money:49000,guild_raids_supplies:42000}}] },
    { id: 'W_GuildRaidsLateMiddleAge_Pikemanbarracks',           name: 'Pikeman Barracks',        icon: '🗡️', unitType: 'guild_raids_pikeman',                 unitLabel: 'Pikeman',
      options: [{amount:1,cost:{guild_raids_money:7000,guild_raids_supplies:6000}},{amount:3,cost:{guild_raids_money:18900,guild_raids_supplies:16200}},{amount:6,cost:{guild_raids_money:33600,guild_raids_supplies:28800}},{amount:10,cost:{guild_raids_money:49000,guild_raids_supplies:42000}}] },
    { id: 'W_GuildRaidsLateMiddleAge_Stable',                    name: 'Stable',                  icon: '🐎', unitType: 'guild_raids_imperial_knight',         unitLabel: 'Imperial Knight',
      options: [{amount:1,cost:{guild_raids_money:7000,guild_raids_supplies:6000}},{amount:3,cost:{guild_raids_money:18900,guild_raids_supplies:16200}},{amount:6,cost:{guild_raids_money:33600,guild_raids_supplies:28800}},{amount:10,cost:{guild_raids_money:49000,guild_raids_supplies:42000}}] },
    { id: 'W_GuildRaidsLateMiddleAge_Siegecamp',                 name: 'Siege Camp',              icon: '💣', unitType: 'guild_raids_bombarde',                unitLabel: 'Bombarde',
      options: [{amount:1,cost:{guild_raids_money:7000,guild_raids_supplies:6000}},{amount:3,cost:{guild_raids_money:18900,guild_raids_supplies:16200}},{amount:6,cost:{guild_raids_money:33600,guild_raids_supplies:28800}},{amount:10,cost:{guild_raids_money:49000,guild_raids_supplies:42000}}] },
];

// Construction costs for QI buildings (from game data).
// refund = 25% of build cost on removal.
const QI_BUILDING_COSTS = {
    // Early Middle Age
    'W_GuildRaidsEarlyMiddleAge_Archeryrange':             { guild_raids_money: 15000,  guild_raids_supplies: 7500 },
    'W_GuildRaidsEarlyMiddleAge_Armoredswordsmsanbarracks':{ guild_raids_money: 15000,  guild_raids_supplies: 7500 },
    'W_GuildRaidsEarlyMiddleAge_Bakery':                   { guild_raids_money: 84000,  guild_raids_supplies: 100000, guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsEarlyMiddleAge_Beekeeper':                { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_BronzeFoundry':            { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_Cypress':                  { guild_raids_money: 50000,  guild_raids_supplies: 50000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_Galgen':                   { guild_raids_money: 36000,  guild_raids_supplies: 36000,  guild_raids_chrono_alloy: 100 },
    'W_GuildRaidsEarlyMiddleAge_Hedgewithflowers':         { guild_raids_money: 50000,  guild_raids_supplies: 50000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_Marketplace':              { guild_raids_money: 12000 },
    'W_GuildRaidsEarlyMiddleAge_Pond':                     { guild_raids_money: 200000, guild_raids_supplies: 200000, guild_raids_chrono_alloy: 750 },
    'W_GuildRaidsEarlyMiddleAge_Pranger':                  { guild_raids_money: 120000, guild_raids_supplies: 120000, guild_raids_chrono_alloy: 500 },
    'W_GuildRaidsEarlyMiddleAge_Residential1':             { guild_raids_money: 10000 },
    'W_GuildRaidsEarlyMiddleAge_Residential2':             { guild_raids_money: 30000,  guild_raids_supplies: 50000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_Residential3':             { guild_raids_money: 210000, guild_raids_supplies: 200000, guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsEarlyMiddleAge_Shoemaker':                { guild_raids_money: 36000,  guild_raids_supplies: 50000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsEarlyMiddleAge_Siegecamp':                { guild_raids_money: 15000,  guild_raids_supplies: 7500 },
    'W_GuildRaidsEarlyMiddleAge_Spearmanbarracks':         { guild_raids_money: 15000,  guild_raids_supplies: 7500 },
    'W_GuildRaidsEarlyMiddleAge_Stablecataphract':         { guild_raids_money: 15000,  guild_raids_supplies: 7500 },
    'W_GuildRaidsEarlyMiddleAge_Tannery':                  { guild_raids_money: 12000 },
    // High Middle Age
    'W_GuildRaidsHighMiddleAge_Alchimist':        { guild_raids_money: 50400,  guild_raids_supplies: 60000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Archery':          { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Axehammer':        { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Brickworks':       { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Church':           { guild_raids_money: 16800 },
    'W_GuildRaidsHighMiddleAge_Dismountedknight': { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Doctor':           { guild_raids_money: 168000, guild_raids_supplies: 144000, guild_raids_chrono_alloy: 500 },
    'W_GuildRaidsHighMiddleAge_Flag':             { guild_raids_money: 300000, guild_raids_supplies: 250000, guild_raids_chrono_alloy: 750 },
    'W_GuildRaidsHighMiddleAge_Gargoyle':         { guild_raids_money: 75000,  guild_raids_supplies: 62500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Printshop':        { guild_raids_money: 50400,  guild_raids_supplies: 43200,  guild_raids_chrono_alloy: 100 },
    'W_GuildRaidsHighMiddleAge_Residential1':     { guild_raids_money: 14000 },
    'W_GuildRaidsHighMiddleAge_Residential2':     { guild_raids_money: 42000,  guild_raids_supplies: 60000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Residential3':     { guild_raids_money: 294000, guild_raids_supplies: 240000, guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsHighMiddleAge_Ropery':           { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Siege':            { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Stable':           { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsHighMiddleAge_Wheatfarm':        { guild_raids_money: 16800 },
    'W_GuildRaidsHighMiddleAge_Windmill':         { guild_raids_money: 117600, guild_raids_supplies: 120000, guild_raids_chrono_alloy: 1000 },
    // Late Middle Age
    'W_GuildRaidsLateMiddleAge_Archeryrange':               { guild_raids_money: 75000,  guild_raids_supplies: 37500,  guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Barrelproducer':             { guild_raids_money: 134400, guild_raids_supplies: 140000, guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_BidenhnderMercenaryBarracks':{ guild_raids_money: 75000,  guild_raids_supplies: 37500,  guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Brewery':                    { guild_raids_money: 19200 },
    'W_GuildRaidsLateMiddleAge_Cartographer':               { guild_raids_money: 192000, guild_raids_supplies: 168000, guild_raids_chrono_alloy: 500 },
    'W_GuildRaidsLateMiddleAge_Decayedtower':               { guild_raids_money: 100000, guild_raids_supplies: 75000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsLateMiddleAge_Gunpowder':                  { guild_raids_money: 45000,  guild_raids_supplies: 22500,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsLateMiddleAge_Library':                    { guild_raids_money: 57600,  guild_raids_supplies: 50400,  guild_raids_chrono_alloy: 100 },
    'W_GuildRaidsLateMiddleAge_Palace':                     { guild_raids_money: 19200 },
    'W_GuildRaidsLateMiddleAge_Pikemanbarracks':            { guild_raids_money: 75000,  guild_raids_supplies: 37500,  guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Residential1':               { guild_raids_money: 16000 },
    'W_GuildRaidsLateMiddleAge_Residential2':               { guild_raids_money: 48000,  guild_raids_supplies: 70000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsLateMiddleAge_Residential3':               { guild_raids_money: 336000, guild_raids_supplies: 280000, guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Sailorstatue':               { guild_raids_money: 400000, guild_raids_supplies: 300000, guild_raids_chrono_alloy: 750 },
    'W_GuildRaidsLateMiddleAge_Siegecamp':                  { guild_raids_money: 75000,  guild_raids_supplies: 37500,  guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Spicefarm':                  { guild_raids_money: 57600,  guild_raids_supplies: 70000,  guild_raids_chrono_alloy: 200 },
    'W_GuildRaidsLateMiddleAge_Stable':                     { guild_raids_money: 75000,  guild_raids_supplies: 37500,  guild_raids_chrono_alloy: 1000 },
    'W_GuildRaidsLateMiddleAge_Treegroup':                  { guild_raids_money: 100000, guild_raids_supplies: 75000,  guild_raids_chrono_alloy: 200 },
};

const DEFAULT_STARTING_RESOURCES = {
    guild_raids_action_points: 100_000,
    guild_raids_money:         450_000,
    guild_raids_supplies:       75_000,
};

// Goods expansion costs (total goods per expansion, split equally across all 5 goods types)
const QI_GOODS_EXPANSION_COSTS = [30, 60, 90, 130, 180, 240, 310, 390, 480, 580, 700];
const QI_GOODS_TYPES = [
    'guild_raids_honey', 'guild_raids_bronze', 'guild_raids_brick',
    'guild_raids_rope',  'guild_raids_gunpowder',
];

// SVG path strings for inline icons (viewBox 0 0 16 16)
const QI_RES_ICON_PATH = {
    guild_raids_money:         `<circle cx="8" cy="8" r="5.5"/><path d="M6.2 6.4c.5-.7 1.2-1 2-1 1.1 0 1.8.6 1.8 1.5"/><path d="M6.2 9.6c.5.7 1.2 1 2 1 1.1 0 1.8-.6 1.8-1.5"/><path d="M5.6 6.6h3.6M5.6 9.4h3.6"/>`,
    guild_raids_supplies:      `<path d="M2.5 5.5 8 2.7l5.5 2.8v5L8 13.3l-5.5-2.8z"/><path d="M2.5 5.5 8 8.3l5.5-2.8"/><path d="M8 8.3v5"/>`,
    guild_raids_chrono_alloy:  `<path d="m9.2 1.8-5 7.4h3.5L7 14.2l5-7.4H8.5l.7-5z"/>`,
    guild_raids_action_points: `<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".7" fill="currentColor"/>`,
    guild_raids_shards:        `<path d="m8 1.5 4.5 4-4.5 9-4.5-9z"/><path d="M3.5 5.5h9"/><path d="M8 5.5v9"/>`,
    guild_raids_lunar_coins:   `<path d="M11.5 9.2A5 5 0 1 1 6.8 4.5a4 4 0 0 0 4.7 4.7z"/>`,
    guild_raids_honey:         `<path d="M5 3h6l1.5 2.6L11 8.2l1.5 2.6L11 13.4H5l-1.5-2.6L5 8.2 3.5 5.6z"/>`,
    guild_raids_bronze:        `<circle cx="8" cy="8" r="5.5"/><path d="M8 4.5v7M5 6.5h6M5 9.5h6"/>`,
    guild_raids_brick:         `<rect x="2.2" y="6" width="11.6" height="4"/><path d="M5.5 6V3.5h5V6M5.5 10v2.5h5V10M2.2 8h11.6"/>`,
    guild_raids_rope:          `<path d="M3 5q2 3 5 0t5 0"/><path d="M3 8q2 3 5 0t5 0"/><path d="M3 11q2 3 5 0t5 0"/>`,
    guild_raids_gunpowder:     `<circle cx="8" cy="9.5" r="4"/><path d="M8 5.5V2.5l2 1"/><path d="m11 6 1.5-1.5"/>`,
    _unit:   `<path d="M3 8a5 5 0 0 1 10 0v3H3z"/><path d="M3 11h10"/><path d="M8 4.5V11"/>`,
    _sword:  `<path d="m13.5 2.5-7 7"/><path d="m9 6 1 1"/><path d="m2.5 13.5 2.5-2.5 1-3 3-1L13 2"/><path d="m5 11 .8.8"/>`,
    _shield: `<path d="M8 1.5 3 3.2v4.6c0 3 2.2 5.4 5 6.7 2.8-1.3 5-3.7 5-6.7V3.2z"/>`,
    _factory:`<path d="M2 13V7l3 1.5V7l3 1.5V7l3 1.5V5h2v8z"/><path d="M2 13h12"/>`,
    _send:   `<path d="m2 8 12-5-5 12-2-5z"/>`,
    _coin:   `<circle cx="8" cy="8" r="5.5"/><path d="M6.2 6.4c.5-.7 1.2-1 2-1 1.1 0 1.8.6 1.8 1.5"/><path d="M6.2 9.6c.5.7 1.2 1 2 1 1.1 0 1.8-.6 1.8-1.5"/><path d="M5.6 6.6h3.6M5.6 9.4h3.6"/>`,
    _supply: `<path d="M2.5 5.5 8 2.7l5.5 2.8v5L8 13.3l-5.5-2.8z"/><path d="M2.5 5.5 8 8.3l5.5-2.8"/><path d="M8 8.3v5"/>`,
};

const QI_RES_COLOR = {
    guild_raids_money:         'amber',
    guild_raids_supplies:      'indigo',
    guild_raids_chrono_alloy:  'violet',
    guild_raids_action_points: 'cyan',
};

const QI_EUPHORIA_TONE = {
    'Rebelling':    'neg',
    'Unruly':       'warn',
    'Unhappy':      'warn',
    'Neutral':      'neutral',
    'Content':      'pos',
    'Happy':        'pos',
    'Enthusiastic': 'accent',
};

// Deduplicated unit type → display info
const QI_UNIT_TYPE_MAP = Object.fromEntries(
    QI_MILITARY_BUILDINGS
        .filter((b, i, arr) => arr.findIndex(x => x.unitType === b.unitType) === i)
        .map(b => [b.unitType, { icon: b.icon, label: b.unitLabel }])
);

function stripTimerSuffix(key) {
    return key.replace(/_t\d+s$/, '');
}

export class QISimulator {
    constructor(planner) {
        this.planner = planner;
        this.enabled = false;

        this.cycle     = 0;
        this.resources = {};
        this.log       = [];

        this.startingResources      = { ...DEFAULT_STARTING_RESOURCES };
        this.externalBoostOverrides = {};
        this.euphoriaPercent        = 100;
        this.expansionsBought       = 0;
    }

    // ── Euphoria ───────────────────────────────────────────────────────────

    _getEuphoriaInfo(pct) {
        for (const t of EUPHORIA_THRESHOLDS) {
            if (pct <= t.max) return t;
        }
        return EUPHORIA_THRESHOLDS[EUPHORIA_THRESHOLDS.length - 1];
    }

    // ── QA cap ─────────────────────────────────────────────────────────────

    _getQACap() {
        const boosts = this.calculateAutoBoosts();
        return QA_BASE_CAP + (boosts.guild_raids_action_points_capacity || 0);
    }

    _clampQA() {
        const cap = this._getQACap();
        const cur = this.resources.guild_raids_action_points || 0;
        if (cur > cap) this.resources.guild_raids_action_points = cap;
    }

    // ── Boost calculation ──────────────────────────────────────────────────

    calculateAutoBoosts() {
        const sums = {};
        for (const b of this.planner.buildings) {
            const boosts = b.boosts || this._getTemplateBoosts(b.id);
            for (const boost of (boosts || [])) {
                const type = boost.type;
                if (
                    type in PROD_BOOST_TYPES ||
                    FLAT_BOOST_TYPES.includes(type) ||
                    type === 'guild_raids_action_points_capacity' ||
                    type === 'att_def_boost_attacker' ||
                    type === 'att_def_boost_defender'
                ) {
                    sums[type] = (sums[type] || 0) + (boost.value || 0);
                }
            }
        }
        return sums;
    }

    _getTemplateBoosts(id) {
        const tmpl = id && this.planner.buildingTemplates[id];
        return tmpl ? (tmpl.boosts || []) : [];
    }

    getEffectiveBoosts() {
        const auto   = this.calculateAutoBoosts();
        const result = { ...auto };
        for (const [type, val] of Object.entries(this.externalBoostOverrides)) {
            result[type] = (result[type] || 0) + (val || 0);
        }
        return result;
    }

    // ── Production calculation ─────────────────────────────────────────────

    calculateOneCycle() {
        const deltas  = {};
        const boosts  = this.getEffectiveBoosts();
        const euphMult = this._getEuphoriaInfo(this.euphoriaPercent).mult;
        const reachableRoads = this.planner.computeRoadConnectivity();

        // Town hall production (values are per 10h cycle; flat — not affected by euphoria)
        deltas['guild_raids_money']         = 50_000;
        deltas['guild_raids_supplies']      = 50_000;
        deltas['guild_raids_chrono_alloy']  =     15;
        // Base AP regeneration: 50,000 per cycle (flat — not affected by euphoria)
        deltas['guild_raids_action_points'] = 50_000;

        for (const building of this.planner.buildings) {
            if (building.type === 'main_building') continue; // town hall handled above as flat

            if (building.needsRoad) {
                if (!reachableRoads || !this.planner.isBuildingRoadConnected(building, reachableRoads)) {
                    continue;
                }
            }

            // Euphoria multiplies all prod-stat resources from non-main buildings
            const prod  = building.prod || this._getTemplateProd(building.id);
            if (prod) {
                const stats = prod['AllAge'] || prod['GuildRaids'] || Object.values(prod)[0];
                if (stats) {
                    for (const [rawKey, val] of Object.entries(stats)) {
                        const resource  = stripTimerSuffix(rawKey);
                        const boostType = this._getBoostTypeForResource(resource);
                        // Game formula (verified against FoE Helper citymap.js):
                        //   production = base × (euphoriaMult + totalBoost/100), rounded per building.
                        // Euphoria and the summed % boosts are ADDITIVE. Resources without a
                        // % boost type (chrono alloy) get the euphoria multiplier only.
                        const finalMult = euphMult + (boostType ? (boosts[boostType] || 0) / 100 : 0);
                        deltas[resource] = (deltas[resource] || 0) + Math.round(val * finalMult);
                    }
                }
            }

            // AP collection from cultural buildings (boost value is per hour × 10h cycle)
            const buildingBoosts = building.boosts || this._getTemplateBoosts(building.id);
            for (const boost of (buildingBoosts || [])) {
                if (boost.type === 'guild_raids_action_points_collection') {
                    deltas['guild_raids_action_points'] =
                        (deltas['guild_raids_action_points'] || 0) + (boost.value || 0) * 10;
                }
            }
        }

        return deltas;
    }

    _getTemplateProd(id) {
        const tmpl = id && this.planner.buildingTemplates[id];
        return tmpl ? tmpl.prod : null;
    }

    _getBoostTypeForResource(resource) {
        for (const [boostType, resPrefix] of Object.entries(PROD_BOOST_TYPES)) {
            if (resource.startsWith(resPrefix)) return boostType;
        }
        return null;
    }

    // ── Simulation operations ──────────────────────────────────────────────

    enable() {
        this.enabled = true;
        // Sync expansion count from whatever is already on the grid
        const manualAreas = (this.planner.unlockedAreas || []).filter(a => a.manual && !a.autoTiled);
        this.expansionsBought = Math.min(manualAreas.length, QI_GOODS_EXPANSION_COSTS.length);
        for (const [key, val] of Object.entries(this.startingResources)) {
            if (!(key in this.resources)) this.resources[key] = val;
        }
    }

    disable() {
        this.enabled = false;
    }

    reset() {
        this.cycle          = 0;
        this.expansionsBought = 0;
        this.resources = { ...this.startingResources };
        for (const [k, v] of Object.entries(this.resources)) {
            if (v === 0) delete this.resources[k];
        }
        this.log = [];
        this.log.push({ type: 'start', cycle: 0, data: {} });

        // Charge costs for buildings already on the grid at reset time
        let initCostTotal = null;
        for (const building of this.planner.buildings) {
            const cost = QI_BUILDING_COSTS[building.id] || null;
            if (!cost) continue;
            if (!initCostTotal) initCostTotal = {};
            for (const [res, amount] of Object.entries(cost)) {
                this.resources[res] = (this.resources[res] || 0) - amount;
                initCostTotal[res] = (initCostTotal[res] || 0) + amount;
            }
        }
        if (initCostTotal) {
            this.log.push({
                type: 'init_layout',
                cycle: 0,
                data: { count: this.planner.buildings.length, totalCost: initCostTotal },
            });
        }

        // Charge expansion goods costs for expansions already on the grid
        const manualAreas = (this.planner.unlockedAreas || []).filter(a => a.manual && !a.autoTiled);
        this.expansionsBought = 0;
        let expansionInitCost = null;
        for (let i = 0; i < Math.min(manualAreas.length, QI_GOODS_EXPANSION_COSTS.length); i++) {
            const total   = QI_GOODS_EXPANSION_COSTS[i];
            const perType = Math.round(total / QI_GOODS_TYPES.length);
            for (const key of QI_GOODS_TYPES) {
                this.resources[key]  = (this.resources[key]  || 0) - perType;
                if (!expansionInitCost) expansionInitCost = {};
                expansionInitCost[key] = (expansionInitCost[key] || 0) + perType;
            }
            this.expansionsBought++;
        }
        if (expansionInitCost) {
            this.log.push({ type: 'init_expansions', cycle: 0, data: { count: this.expansionsBought, totalCost: expansionInitCost } });
        }
    }

    applyStartingResources() {
        this.resources = { ...this.startingResources };
        for (const [k, v] of Object.entries(this.resources)) {
            if (v === 0) delete this.resources[k];
        }
    }

    collectProduction() {
        const deltas = this.calculateOneCycle();
        this.cycle++;
        for (const [key, val] of Object.entries(deltas)) {
            this.resources[key] = (this.resources[key] || 0) + val;
        }
        this._clampQA();
        this.log.push({ type: 'collect', cycle: this.cycle, data: { deltas: { ...deltas } } });
        return deltas;
    }

    fastForward(n) {
        const deltas = this.calculateOneCycle();
        this.cycle += n;
        for (const [key, val] of Object.entries(deltas)) {
            this.resources[key] = (this.resources[key] || 0) + val * n;
        }
        this._clampQA();
        const totalDeltas = {};
        for (const [k, v] of Object.entries(deltas)) totalDeltas[k] = v * n;
        this.log.push({ type: 'fast_forward', cycle: this.cycle, data: { n, deltas: totalDeltas } });
    }

    // ── On-demand production / recruitment ────────────────────────────────

    purchaseGoods(buildingId, optionIndex) {
        const def = QI_GOODS_BUILDINGS.find(b => b.id === buildingId);
        if (!def) return { success: false, error: 'unknown_building' };
        const opt = def.options[optionIndex];
        if (!opt) return { success: false, error: 'unknown_option' };

        const count = this.planner.buildings.filter(b => b.id === buildingId).length;
        const totalAmount = opt.amount * count;
        const totalCost   = {};
        for (const [res, c] of Object.entries(opt.cost)) totalCost[res] = c * count;

        for (const [res, cost] of Object.entries(totalCost)) {
            if ((this.resources[res] || 0) < cost) return { success: false, error: 'insufficient_resources' };
        }
        for (const [res, cost] of Object.entries(totalCost)) {
            this.resources[res] = (this.resources[res] || 0) - cost;
        }
        this.resources[def.product] = (this.resources[def.product] || 0) + totalAmount;
        this.log.push({
            type: 'produce',
            cycle: this.cycle,
            data: { buildingName: def.name, product: def.product, productLabel: def.productLabel, amount: totalAmount, cost: totalCost },
        });
        return { success: true };
    }

    recruitSoldiers(buildingId, optionIndex) {
        const def = QI_MILITARY_BUILDINGS.find(b => b.id === buildingId);
        if (!def) return { success: false, error: 'unknown_building' };
        const opt = def.options[optionIndex];
        if (!opt) return { success: false, error: 'unknown_option' };

        const count = this.planner.buildings.filter(b => b.id === buildingId).length;
        const totalAmount = opt.amount * count;
        const totalCost   = {};
        for (const [res, c] of Object.entries(opt.cost)) totalCost[res] = c * count;

        for (const [res, cost] of Object.entries(totalCost)) {
            if ((this.resources[res] || 0) < cost) return { success: false, error: 'insufficient_resources' };
        }
        for (const [res, cost] of Object.entries(totalCost)) {
            this.resources[res] = (this.resources[res] || 0) - cost;
        }
        this.resources[def.unitType] = (this.resources[def.unitType] || 0) + totalAmount;
        this.log.push({
            type: 'recruit',
            cycle: this.cycle,
            data: { buildingName: def.name, unitType: def.unitType, unitLabel: def.unitLabel, amount: totalAmount, cost: totalCost },
        });
        return { success: true };
    }

    spendGoods(resourceKey, amount) {
        if (!amount || amount <= 0) return { success: false, error: 'invalid_amount' };
        if ((this.resources[resourceKey] || 0) < amount) return { success: false, error: 'insufficient_resources' };
        this.resources[resourceKey] -= amount;
        const resInfo = QI_RESOURCES.find(r => r.key === resourceKey);
        this.log.push({
            type: 'spend_goods',
            cycle: this.cycle,
            data: { key: resourceKey, label: resInfo?.label || resourceKey, amount, icon: resInfo?.icon || '📦' },
        });
        return { success: true };
    }

    spendUnits(unitKey, amount) {
        if (!amount || amount <= 0) return { success: false, error: 'invalid_amount' };
        if ((this.resources[unitKey] || 0) < amount) return { success: false, error: 'insufficient_resources' };
        this.resources[unitKey] -= amount;
        const unitInfo = QI_UNIT_TYPE_MAP[unitKey];
        this.log.push({
            type: 'spend_units',
            cycle: this.cycle,
            data: { key: unitKey, label: unitInfo?.label || unitKey, amount, icon: unitInfo?.icon || '⚔️' },
        });
        return { success: true };
    }

    buyGoodsExpansion() {
        if (this.expansionsBought >= QI_GOODS_EXPANSION_COSTS.length) return { success: false, error: 'max_expansions' };
        const total    = QI_GOODS_EXPANSION_COSTS[this.expansionsBought];
        const perType  = Math.round(total / QI_GOODS_TYPES.length);
        for (const key of QI_GOODS_TYPES) {
            if ((this.resources[key] || 0) < perType) return { success: false, error: 'insufficient_goods' };
        }
        for (const key of QI_GOODS_TYPES) {
            this.resources[key] = (this.resources[key] || 0) - perType;
        }
        this.expansionsBought++;
        this.log.push({ type: 'expansion', cycle: this.cycle, data: { n: this.expansionsBought, perType, total } });
        return { success: true };
    }

    refundExpansion() {
        if (this.expansionsBought <= 0) return { success: false };
        const n       = this.expansionsBought;
        const total   = QI_GOODS_EXPANSION_COSTS[this.expansionsBought - 1];
        const perType = Math.round(total / QI_GOODS_TYPES.length);
        this.expansionsBought--;
        for (const key of QI_GOODS_TYPES) {
            this.resources[key] = (this.resources[key] || 0) + perType;
        }
        this.log.push({ type: 'expansion_refund', cycle: this.cycle, data: { n, perType, total } });
        return { success: true };
    }

    renderExpansionsHTML() {
        const bought = this.expansionsBought;
        const max    = QI_GOODS_EXPANSION_COSTS.length;
        const nextCost = bought < max ? QI_GOODS_EXPANSION_COSTS[bought] : null;
        const perType  = nextCost !== null ? Math.round(nextCost / QI_GOODS_TYPES.length) : 0;
        const canAfford = nextCost !== null && QI_GOODS_TYPES.every(k => (this.resources[k] || 0) >= perType);
        const goods = QI_RESOURCES.filter(r => r.isGoods);

        const boughtBar = `<div class="qi-exp-bar">${Array.from({length: max}, (_, i) =>
            `<div class="qi-exp-pip${i < bought ? ' is-done' : ''}"></div>`
        ).join('')}</div>`;

        // Next expansion cost row
        let nextHtml = '';
        if (nextCost !== null) {
            const costChips = goods.map(r => {
                const have = this.resources[r.key] || 0;
                const ok   = have >= perType;
                return `<span class="qi-exp-chip${ok ? '' : ' is-poor'}" title="${r.label}: have ${this._fmt(have)}, need ${perType}">${this._svg(QI_RES_ICON_PATH[r.key] || '', 10, 1.7)} ${perType}</span>`;
            }).join('');
            nextHtml = `<div class="qi-exp-row">
                <span class="qi-exp-label">${t('qiSim.expansionLabel', { n: bought + 1, max })}</span>
                <div class="qi-exp-cost">${costChips}</div>
            </div>
            <div class="qi-exp-hint">${t('qiSim.expansionHint')}</div>`;
        } else {
            nextHtml = `<div class="qi-exp-done">${t('qiSim.expansionAllDone', { max })}</div>`;
        }

        // Shortfall warning when can't afford
        let warnHtml = '';
        if (nextCost !== null && !canAfford) {
            const parts = goods
                .map(r => { const short = perType - (this.resources[r.key] || 0); return short > 0 ? `${this._svg(QI_RES_ICON_PATH[r.key] || '', 9, 1.5)} ${short}` : null; })
                .filter(Boolean);
            warnHtml = `<div class="qi-exp-warn">${t('qiSim.expansionMissing')} ${parts.join(' · ')}</div>`;
        }

        // Remove-last row (shown whenever at least one expansion was placed)
        let removeHtml = '';
        if (bought > 0) {
            const refundTotal   = QI_GOODS_EXPANSION_COSTS[bought - 1];
            const refundPerType = Math.round(refundTotal / QI_GOODS_TYPES.length);
            const refundChips   = goods.map(r =>
                `<span class="qi-exp-chip" title="${r.label}">${this._svg(QI_RES_ICON_PATH[r.key] || '', 10, 1.7)} +${refundPerType}</span>`
            ).join('');
            removeHtml = `<div class="qi-exp-row qi-exp-row--remove">
                <span class="qi-exp-label">${t('qiSim.expansionRemoveLast')}</span>
                <div class="qi-exp-cost">${refundChips}</div>
                <button class="qi-sr-btn qi-sr-btn--danger" data-qi-action="expansion_remove_last">
                    ${t('qiSim.expansionRemoveBtn')}
                </button>
            </div>`;
        }

        return `<div class="qi-exp">
            ${boughtBar}
            ${nextHtml}
            ${warnHtml}
            ${removeHtml}
        </div>`;
    }

    logBuildingPlaced(building) {
        if (!this.enabled) return;
        const cost = QI_BUILDING_COSTS[building.id] || null;
        if (cost) {
            for (const [res, amount] of Object.entries(cost)) {
                this.resources[res] = (this.resources[res] || 0) - amount;
            }
        }
        this.log.push({ type: 'place', cycle: this.cycle, data: { buildingName: building.name, buildingId: building.id, cost } });
    }

    logBuildingRemoved(building) {
        if (!this.enabled) return;
        const cost = QI_BUILDING_COSTS[building.id] || null;
        let refund = null;
        if (cost) {
            refund = {};
            for (const [res, amount] of Object.entries(cost)) {
                refund[res] = Math.floor(amount * 0.25);
                this.resources[res] = (this.resources[res] || 0) + refund[res];
            }
        }
        this.log.push({ type: 'remove', cycle: this.cycle, data: { buildingName: building.name, buildingId: building.id, refund } });
    }

    // ── Snapshot serialization ─────────────────────────────────────────────

    getSnapshot() {
        return {
            enabled:              this.enabled,
            cycle:                this.cycle,
            expansionsBought:     this.expansionsBought,
            resources:            { ...this.resources },
            log:                  JSON.parse(JSON.stringify(this.log)),
            startingResources:    { ...this.startingResources },
            externalBoostOverrides: { ...this.externalBoostOverrides },
            euphoriaPercent:      this.euphoriaPercent,
        };
    }

    loadSnapshot(snap) {
        if (!snap) return;
        this.enabled              = snap.enabled              || false;
        this.cycle                = snap.cycle                || 0;
        this.expansionsBought     = snap.expansionsBought     || 0;
        this.resources            = snap.resources            || {};
        this.log                  = snap.log                  || [];
        const savedSR = snap.startingResources || {};
        this.startingResources = Object.keys(savedSR).length > 0 ? savedSR : { ...DEFAULT_STARTING_RESOURCES };
        this.externalBoostOverrides = snap.externalBoostOverrides || {};
        this.euphoriaPercent      = snap.euphoriaPercent      ?? 100;
        // Fill in any default resources that are absent from the saved state
        for (const [key, val] of Object.entries(this.startingResources)) {
            if (!(key in this.resources)) this.resources[key] = val;
        }
    }

    // ── Rendering ─────────────────────────────────────────────────────────

    _fmt(n) {
        const v = Math.round(n || 0);
        return v.toLocaleString();
    }

    getCurrentRates() {
        return this.calculateOneCycle();
    }

    _svg(d, size = 11, sw = 1.7) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;display:block">${d}</svg>`;
    }

    renderStockpileHTML() {
        const rates = this.getCurrentRates();
        const cap   = this._getQACap();

        const coreKeys  = ['guild_raids_money','guild_raids_supplies','guild_raids_chrono_alloy','guild_raids_action_points'];
        const miniKeys  = ['guild_raids_shards','guild_raids_lunar_coins'];

        const coreRows = coreKeys.map(key => {
            const r = QI_RESOURCES.find(r => r.key === key);
            if (!r) return '';
            const amount  = this.resources[key] || 0;
            const rate    = rates[key] || 0;
            const color   = QI_RES_COLOR[key] || 'indigo';
            const iconPath = QI_RES_ICON_PATH[key] || '';
            const isCap   = key === 'guild_raids_action_points';
            const barHTML = isCap
                ? `<div class="qi-vital-bar"><div class="qi-vital-bar-fill" style="width:${Math.min(100, Math.round((amount / cap) * 100))}%"></div></div>`
                : '';
            const capHTML = isCap ? `<span class="qi-vital-cap">/${this._fmt(cap)}</span>` : '';
            const rateHTML = rate > 0 ? `<div class="qi-vital-rate">+${this._fmt(rate)}/cyc</div>` : '';
            return `<div class="qi-vital qi-vital--${color}">
                <div class="qi-vital-icon">${this._svg(iconPath, 13, 1.7)}</div>
                <div class="qi-vital-mid">
                    <div class="qi-vital-label">${r.label}</div>
                    ${rateHTML}${barHTML}
                </div>
                <div class="qi-vital-val">${this._fmt(amount)}${capHTML}</div>
            </div>`;
        }).filter(Boolean);

        const miniChips = miniKeys.map(key => {
            const r = QI_RESOURCES.find(r => r.key === key);
            if (!r) return '';
            const iconPath = QI_RES_ICON_PATH[key] || '';
            return `<div class="qi-cm">${this._svg(iconPath, 11, 1.7)}<span class="qi-cm-l">${r.label}</span><span class="qi-cm-v">${this._fmt(this.resources[key] || 0)}</span></div>`;
        }).filter(Boolean);

        if (coreRows.length === 0 && miniChips.length === 0) {
            return `<div class="qi-empty">${t('qiSim.noProduction')}</div>`;
        }

        let html = coreRows.join('');
        if (miniChips.length > 0) {
            html += `<div class="qi-vital-strip">${miniChips.join('')}</div>`;
        }
        return html;
    }

    renderInventoryHTML() {
        const goodsChips = QI_RESOURCES.filter(r => r.isGoods && (this.resources[r.key] || 0) > 0).map(r => {
            const iconPath = QI_RES_ICON_PATH[r.key] || '';
            return `<div class="qi-ic is-have" title="${r.label}">${this._svg(iconPath, 12, 1.7)}<span class="qi-ic-l">${r.label}</span><span class="qi-ic-v">${this._fmt(this.resources[r.key])}</span></div>`;
        });

        const unitChips = Object.entries(QI_UNIT_TYPE_MAP).filter(([key]) => (this.resources[key] || 0) > 0).map(([key, info]) => {
            const shortLabel = info.label.split(' ')[0].slice(0, 6);
            return `<div class="qi-ic is-have is-compact" title="${info.label}">${this._svg(QI_RES_ICON_PATH._unit, 12, 1.7)}<span class="qi-ic-l">${shortLabel}</span><span class="qi-ic-v">${this._fmt(this.resources[key])}</span></div>`;
        });

        if (goodsChips.length === 0 && unitChips.length === 0) return `<div class="qi-empty">${t('qiSim.inventoryEmpty')}</div>`;

        let html = '';
        if (goodsChips.length > 0) html += `<div class="qi-chip-grid">${goodsChips.join('')}</div>`;
        if (unitChips.length > 0)  html += `<div class="qi-chip-grid">${unitChips.join('')}</div>`;
        return html;
    }

    renderEuphoriaHTML() {
        const info = this._getEuphoriaInfo(this.euphoriaPercent);
        const pct  = this.euphoriaPercent;
        const tone = QI_EUPHORIA_TONE[info.state] || 'neutral';
        const visualPct = Math.max(0, Math.min(100, (pct / 240) * 100));

        const bands = [
            { cls: 'neg',     left: 0,            width: (20/240)*100 },
            { cls: 'warn',    left: (20/240)*100,  width: (60/240)*100 },
            { cls: 'neutral', left: (80/240)*100,  width: (40/240)*100 },
            { cls: 'pos',     left: (120/240)*100, width: (80/240)*100 },
            { cls: 'accent',  left: (200/240)*100, width: (40/240)*100 },
        ];
        const ticks = [20, 60, 80, 120, 140, 200];

        return `<div class="qi-eu">
            <div class="qi-eu-head">
                <div class="qi-eu-pill qi-eu-pill--${tone}">${info.state} <span>·</span> <strong>×${info.mult.toFixed(1)}</strong></div>
                <div class="qi-eu-num">
                    <input type="number" id="qiEuphoriaInput" class="qi-eu-input" value="${pct}" min="0" max="300">
                    <span>%</span>
                </div>
            </div>
            <div class="qi-eu-track">
                ${bands.map(b => `<div class="qi-eu-band qi-eu-band--${b.cls}" style="left:${b.left.toFixed(3)}%;width:${b.width.toFixed(3)}%"></div>`).join('')}
                ${ticks.map(v => `<div class="qi-eu-tick" style="left:${((v/240)*100).toFixed(3)}%"></div>`).join('')}
                <div class="qi-eu-thumb" style="left:${visualPct.toFixed(2)}%"></div>
            </div>
            <div class="qi-eu-hint">${t('qiSim.euphoriaHint')}</div>
        </div>`;
    }

    renderCombatBoostHTML() {
        const boosts = this.calculateAutoBoosts();
        const atk    = boosts.att_def_boost_attacker || 0;
        const def    = boosts.att_def_boost_defender || 0;
        if (atk === 0 && def === 0) {
            return `<div class="qi-empty">${t('qiSim.noDecorations')}</div>`;
        }
        return `<div class="qi-combat">
            <div class="qi-combat-tile" data-tone="red">
                ${this._svg(QI_RES_ICON_PATH._sword, 14, 1.7)}
                <div class="qi-combat-num">+${atk}%</div>
                <div class="qi-combat-lbl">${t('qiSim.attackBoost')}</div>
            </div>
            <div class="qi-combat-tile" data-tone="blue">
                ${this._svg(QI_RES_ICON_PATH._shield, 14, 1.7)}
                <div class="qi-combat-num">+${def}%</div>
                <div class="qi-combat-lbl">${t('qiSim.defenseBoost')}</div>
            </div>
        </div>`;
    }

    renderStartingResourcesHTML() {
        const allKeys = ['guild_raids_supplies','guild_raids_money','guild_raids_chrono_alloy',
                         'guild_raids_action_points','guild_raids_shards','guild_raids_lunar_coins',
                         ...QI_RESOURCES.filter(r => r.isGoods).map(r => r.key)];

        return QI_RESOURCES.filter(r => allKeys.includes(r.key)).map(r => {
            const val = this.startingResources[r.key] || '';
            const iconPath = QI_RES_ICON_PATH[r.key] || '';
            return `<div class="qi-fld">
                <span class="qi-fld-l">${this._svg(iconPath, 11, 1.7)} ${r.label}</span>
                <input type="number" class="qi-fld-i" min="0" data-resource="${r.key}" value="${val}" placeholder="0">
            </div>`;
        }).join('');
    }

    renderExternalBoostsHTML() {
        const autoBoosts = this.calculateAutoBoosts();
        return Object.keys(PROD_BOOST_TYPES).map(boostType => {
            const autoVal  = autoBoosts[boostType] || 0;
            const override = this.externalBoostOverrides[boostType] || 0;
            const isSupply = boostType === 'guild_raids_supplies_production';
            const label    = isSupply ? t('qiSim.suppliesBoost') : t('qiSim.coinsBoost');
            const iconPath = isSupply ? QI_RES_ICON_PATH.guild_raids_supplies : QI_RES_ICON_PATH.guild_raids_money;
            return `<div class="qi-fld">
                <span class="qi-fld-l">${this._svg(iconPath, 11, 1.7)} ${label} <span class="qi-fld-auto">(auto +${autoVal}%)</span></span>
                <div class="qi-fld-pct">
                    <input type="number" class="qi-fld-i" min="0" data-override-value="${boostType}" value="${override}" placeholder="0">
                    <span>%</span>
                </div>
            </div>`;
        }).join('');
    }

    _renderBuildRow(def, n, action) {
        const countBadge = n > 1 ? `<span class="qi-br-count">×${n}</span>` : '';
        const iconPath   = QI_RES_ICON_PATH[def.product || def.unitType] || QI_RES_ICON_PATH._factory;
        const subLabel   = def.productLabel || def.unitLabel || '';
        const btns = def.options.map((opt, i) => {
            const totalCost = {};
            for (const [res, c] of Object.entries(opt.cost)) totalCost[res] = c * n;
            const poor = this._canAfford(totalCost) ? '' : ' is-poor';
            const coinCost = this._fmt(totalCost.guild_raids_money || 0);
            const suppCost = this._fmt(totalCost.guild_raids_supplies || 0);
            return `<button class="qi-batch${poor}" data-qi-action="${action}" data-building-id="${def.id}" data-option-index="${i}" title="${coinCost} coins · ${suppCost} supplies">×${opt.amount * n}</button>`;
        }).join('');
        return `<div class="qi-br">
            <div class="qi-br-l">
                ${this._svg(iconPath, 13, 1.7)}
                <div class="qi-br-info">
                    <div class="qi-br-name">${def.name}${countBadge}</div>
                    <div class="qi-br-sub">${subLabel} · ${this._fmt(def.options[0]?.cost?.guild_raids_money * n || 0)} ${this._svg(QI_RES_ICON_PATH._coin, 9, 1.7)} · ${this._fmt(def.options[0]?.cost?.guild_raids_supplies * n || 0)} ${this._svg(QI_RES_ICON_PATH._supply, 9, 1.7)}</div>
                </div>
            </div>
            <div class="qi-br-btns">${btns}</div>
        </div>`;
    }

    renderGoodsProductionHTML() {
        const counts = {};
        for (const b of this.planner.buildings) {
            if (QI_GOODS_BUILDINGS.some(g => g.id === b.id)) {
                counts[b.id] = (counts[b.id] || 0) + 1;
            }
        }
        const placedDefs = QI_GOODS_BUILDINGS.filter(b => counts[b.id]);
        if (placedDefs.length === 0) {
            return `<div class="qi-empty">${t('qiSim.noGoodsBuildings')}</div>`;
        }
        return placedDefs.map(def => this._renderBuildRow(def, counts[def.id], 'produce')).join('');
    }

    renderMilitaryRecruitHTML() {
        const counts = {};
        for (const b of this.planner.buildings) {
            if (QI_MILITARY_BUILDINGS.some(m => m.id === b.id)) {
                counts[b.id] = (counts[b.id] || 0) + 1;
            }
        }
        const placedDefs = QI_MILITARY_BUILDINGS.filter(b => counts[b.id]);
        if (placedDefs.length === 0) {
            return `<div class="qi-empty">${t('qiSim.noMilitaryBuildings')}</div>`;
        }
        return placedDefs.map(def => this._renderBuildRow(def, counts[def.id], 'recruit')).join('');
    }

    renderSpendResourcesHTML() {
        const goodsWithStock = QI_RESOURCES.filter(r => r.isGoods && (this.resources[r.key] || 0) > 0);
        const unitsWithStock = Object.entries(QI_UNIT_TYPE_MAP).filter(([key]) => (this.resources[key] || 0) > 0);


        const goodsRows = goodsWithStock.map(r => {
            const have = this._fmt(this.resources[r.key] || 0);
            const iconPath = QI_RES_ICON_PATH[r.key] || '';
            return `<div class="qi-sr">${this._svg(iconPath, 12, 1.7)}<span class="qi-sr-l">${r.label}</span><span class="qi-sr-have">${have}</span><input type="number" class="qi-sr-n" min="1" max="${this.resources[r.key]}" value="1" data-spend-key="${r.key}"><button class="qi-sr-btn" data-qi-action="spend_goods" data-spend-key="${r.key}">${this._svg(QI_RES_ICON_PATH._send, 10, 1.7)} ${t('qiSim.spend')}</button></div>`;
        });

        const unitRows = unitsWithStock.map(([key, info]) => {
            const have = this._fmt(this.resources[key] || 0);
            return `<div class="qi-sr">${this._svg(QI_RES_ICON_PATH._unit, 12, 1.7)}<span class="qi-sr-l">${info.label}</span><span class="qi-sr-have">${have}</span><input type="number" class="qi-sr-n" min="1" max="${this.resources[key]}" value="1" data-spend-key="${key}"><button class="qi-sr-btn" data-qi-action="spend_units" data-spend-key="${key}">${this._svg(QI_RES_ICON_PATH._send, 10, 1.7)} ${t('qiSim.spend')}</button></div>`;
        });

        const sections = [];
        if (goodsRows.length > 0) sections.push(`<div class="qi-sr-hd">${t('qiSim.startingGoods')}</div>${goodsRows.join('')}`);
        if (unitRows.length > 0)  sections.push(`<div class="qi-sr-hd">${t('qiSim.unitStockpile')}</div>${unitRows.join('')}`);
        if (sections.length === 0) return `<div class="qi-empty">${t('qiSim.inventoryEmpty')}</div>`;
        return `<div class="qi-sr-list">${sections.join('')}</div>`;
    }

    _costStr(resources, prefix) {
        if (!resources) return '';
        const parts = [];
        if (resources.guild_raids_money)        parts.push(`🪙${this._fmt(resources.guild_raids_money)}`);
        if (resources.guild_raids_supplies)     parts.push(`⚙️${this._fmt(resources.guild_raids_supplies)}`);
        if (resources.guild_raids_chrono_alloy) parts.push(`⚡${this._fmt(resources.guild_raids_chrono_alloy)}`);
        if (parts.length === 0) return '';
        return ` (${prefix}${parts.join(' ')})`;
    }

    canAffordBuilding(building) {
        const cost = QI_BUILDING_COSTS[building.id];
        if (!cost) return true;
        return this._canAfford(cost);
    }

    _canAfford(cost) {
        return Object.entries(cost).every(([res, amount]) => (this.resources[res] || 0) >= amount);
    }

    _costLabel(cost) {
        const coins = this._fmt(cost.guild_raids_money || 0);
        const supp  = this._fmt(cost.guild_raids_supplies || 0);
        return t('qiSim.costTitle', { coins, supp });
    }

    _deltaSummary(deltas) {
        if (!deltas || Object.keys(deltas).length === 0) return '—';
        const parts = [];
        for (const r of QI_RESOURCES) {
            if ((deltas[r.key] || 0) > 0) parts.push(`${r.icon} ${this._fmt(deltas[r.key])}`);
        }
        for (const [key, info] of Object.entries(QI_UNIT_TYPE_MAP)) {
            if ((deltas[key] || 0) > 0) parts.push(`${info.icon} ${this._fmt(deltas[key])}`);
        }
        return parts.length > 0 ? parts.join(' · ') : '—';
    }

    renderLogEntryText(entry) {
        switch (entry.type) {
            case 'start':        return t('qiSim.logStart');
            case 'init_layout':  return t('qiSim.logInitLayout', { count: entry.data.count }) + this._costStr(entry.data.totalCost, '-');
            case 'place':        return t('qiSim.logPlace',   { name: entry.data.buildingName }) + this._costStr(entry.data.cost,   '-');
            case 'remove':       return t('qiSim.logRemove',  { name: entry.data.buildingName }) + this._costStr(entry.data.refund, '+');
            case 'collect':      return t('qiSim.logCollect',     { summary: this._deltaSummary(entry.data.deltas) });
            case 'fast_forward': return t('qiSim.logFastForward', { n: entry.data.n, summary: this._deltaSummary(entry.data.deltas) });
            case 'produce':      return t('qiSim.logProduce', { amount: entry.data.amount, product: entry.data.productLabel, coins: this._fmt(entry.data.cost.guild_raids_money || 0), supp: this._fmt(entry.data.cost.guild_raids_supplies || 0) });
            case 'recruit':      return t('qiSim.logRecruit', { amount: entry.data.amount, unit: entry.data.unitLabel, coins: this._fmt(entry.data.cost.guild_raids_money || 0), supp: this._fmt(entry.data.cost.guild_raids_supplies || 0) });
            case 'spend_goods':
            case 'spend_units':  return t('qiSim.logSpend', { amount: entry.data.amount, label: entry.data.label });
            case 'expansion':        return t('qiSim.logExpansion',       { n: entry.data.n, max: QI_GOODS_EXPANSION_COSTS.length, perType: entry.data.perType });
            case 'expansion_refund': return t('qiSim.logExpansionRefund',  { n: entry.data.n, max: QI_GOODS_EXPANSION_COSTS.length, perType: entry.data.perType });
            case 'init_expansions':  return t('qiSim.logInitExpansions',   { count: entry.data.count });
            default:                 return entry.type;
        }
    }

    renderLogHTML() {
        if (this.log.length === 0) {
            return `<div class="qi-empty">${t('qiSim.logEmpty')}</div>`;
        }

        return this.log.map(entry => {
            const text = this.renderLogEntryText(entry);
            return `<div class="qi-log-row qi-log-row--${entry.type}"><span class="qi-log-c">c${entry.cycle}</span><span class="qi-log-t">${text}</span></div>`;
        }).join('');
    }

    generatePlanText() {
        const lines = [`${t('qiSim.planTitle')} — ${t('qiSim.cycle')} ${this.cycle}\n`];
        const euphInfo = this._getEuphoriaInfo(this.euphoriaPercent);
        lines.push(`Euphoria: ${this.euphoriaPercent}% (${euphInfo.state}, ×${euphInfo.mult})\n`);

        for (const entry of this.log) {
            lines.push(`[${t('qiSim.cycle')} ${entry.cycle}] ${this.renderLogEntryText(entry)}`);
        }

        lines.push('\n' + t('qiSim.finalStockpile'));
        for (const r of QI_RESOURCES) {
            const amount = this.resources[r.key] || 0;
            if (amount !== 0) lines.push(`  ${r.icon} ${r.label}: ${this._fmt(amount)}`);
        }
        for (const [key, info] of Object.entries(QI_UNIT_TYPE_MAP)) {
            const amount = this.resources[key] || 0;
            if (amount > 0) lines.push(`  ${info.icon} ${info.label}: ${this._fmt(amount)}`);
        }
        return lines.join('\n');
    }
}
