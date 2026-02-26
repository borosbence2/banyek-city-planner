#!/usr/bin/env python3
"""
FoE Building Database Builder
==============================
Fetches the city_entities metadata from an Innogames CDN URL and converts it
to foe_buildings_database.js and qi_buildings_database.js for the city planner.

Usage:
    # Fetch directly from the game CDN URL:
    python tools/build_database.py <url>

    # Or from a locally saved JSON file:
    python tools/build_database.py <local_file.json>

How to get the URL:
    1. Open Forge of Empires in Chrome/Firefox
    2. Open DevTools (F12) -> Network tab
    3. Reload the game
    4. Filter by "city_entities" in the search box
    5. Right-click the matching request -> Copy -> Copy URL
    6. Pass that URL to this script

Output:
    data/foe_buildings_database.js   (main city buildings)
    data/qi_buildings_database.js    (Quantum Incursion / Guild Raids buildings)

Note:
    Building names will be in the language of the server you captured from.
    Use an English-language server URL for English names.
"""

import gzip
import json
import re
import sys
import urllib.request
from pathlib import Path


# ── Type mapping: game type -> (app type, hex color) ─────────────────────────
TYPE_MAP = {
    'residential':               ('residential', '#87CEEB'),
    'production':                ('production',  '#5F8DC3'),
    'goods':                     ('goods',       '#F4E16B'),
    'cultural_goods_production': ('goods',       '#F4E16B'),
    'culture':                   ('culture',     '#6B8E7F'),
    'decoration':                ('culture',     '#6B8E7F'),
    'military':                  ('military',    '#8B7BAA'),
    'greatbuilding':             ('great',       '#D46A4F'),
    'main_building':             ('townhall',    '#E8D679'),
    # GenericCityEntity (event/special buildings) — handled separately in convert()
    '':                          ('culture',     '#6B8E7F'),
}

EVENT_COLOR = '#D4884B'

# Prefix → event name mapping for W_MultiAge_<CODE><number> buildings.
# Sorted longest-first so longer prefixes match before shorter ones.
_EVENT_PREFIXES_RAW = [
    ('HalloweenBonusGP',    'Halloween Event'),
    ('HalloweenBonus',      'Halloween Event'),
    ('HistoricalAllies',    'Historical Allies Event'),
    ('GBGWatchtower',       'Guild Battleground'),
    ('SummerBonus',         'Summer Event'),
    ('PassBonus',           'Season Pass'),
    ('Expedition',          'Guild Expedition'),
    ('FallBonus',           'Fall Event'),
    ('AgeBonus',            'Age Bonus'),
    ('ONBOARD',             'Starter Buildings'),
    ('ANNI',                'Anniversary Event'),
    ('ARCH',                'Archaeology Event'),
    ('BOWL',                'Bowl Event'),
    ('CARE',                'Care Event'),
    ('FELL',                'Fellowship Event'),
    ('HERO',                'Heroes Event'),
    ('TEMP',                'Temporal Rift Event'),
    ('WILD',                'Wildfire Event'),
    ('FALL',                'Fall Event'),
    ('GBG',                 'Guild Battleground'),
    ('GEX',                 'Guild Expedition'),
    ('COP',                 'Carnival of Peace'),
    ('CUP',                 'Football Cup Event'),
    ('GR',                  'Spring Event'),
    ('HAL',                 'Halloween Event'),
    ('LTE',                 'Event Building'),
    ('PAT',                 'Passion Event'),
    ('SPR',                 'Spring Event'),
    ('SUM',                 'Summer Event'),
    ('WIN',                 'Winter Event'),
]
EVENT_PREFIXES = sorted(_EVENT_PREFIXES_RAW, key=lambda x: -len(x[0]))


def get_event_name(entity_id):
    """Return a human-readable event name from a W_MultiAge_<code> entity ID."""
    parts = entity_id.split('_')
    code = parts[2] if len(parts) >= 3 else ''
    for prefix, name in EVENT_PREFIXES:
        if code.startswith(prefix):
            return name
    return 'Event Building'

# Building types that are not placeable city buildings — skip entirely
SKIP_TYPES = {
    'street',
    'off_grid',
    'impediment',
    'static_provider',
    'outpost_ship',
    'friends_tavern',
    'hub_part',
    'hub_main',
    'tower',
    'clan_power_production',
    'random_production',
    'diplomacy',
    'main_building',
}

# ID "world" segments (second _-delimited part) that belong to non-main-city game modes.
# Cultural settlements should not appear in the main city building library.
NON_MAIN_CITY_WORLDS = {
    # Cultural settlements
    'Vikings', 'Egyptians', 'Japanese', 'Mughals', 'Polynesia', 'Pirates', 'Aztecs',
    'Feudal', 'China', 'Mughal',
}

# Quantum Incursion (Guild Raids) worlds — processed separately into qi_buildings_database.js
QI_WORLDS = {
    'GuildRaidsIronAge', 'GuildRaidsEarlyMiddleAge',
    'GuildRaidsHighMiddleAge', 'GuildRaidsLateMiddleAge',
}

# For QI buildings: allow main_building and impediment (QI has a townhall-like buildings)
QI_SKIP_TYPES = SKIP_TYPES - {'main_building', 'impediment'}

# Per-type colors for QI buildings (same palette as main city for consistency)
QI_TYPE_COLORS = {
    'military':   '#8B7BAA',
    'production': '#5F8DC3',
    'goods':      '#F4E16B',
    'residential':'#87CEEB',
    'culture':    '#6B8E7F',
    'impediment': '#607080',
    'main_building': '#E8D679',
}

# Map the ID suffix (id_parts[2]) to QI building type for W_* GenericCityEntity buildings.
# These have empty raw_type in the game data, so type must be inferred from the ID.
QI_SUFFIX_TYPE = {
    # Military — barracks, stables, siege
    'Archery':                       'military',
    'Archeryrange':                  'military',
    'Armoredswordsmsanbarracks':     'military',
    'Axehammer':                     'military',
    'BidenhnderMercenaryBarracks':   'military',
    'Dismountedknight':              'military',
    'Legionairebarracks':            'military',
    'Militiamanbarracks':            'military',
    'Pikemanbarracks':               'military',
    'Siege':                         'military',
    'Siegecamp':                     'military',
    'Spearmanbarracks':              'military',
    'Stable':                        'military',
    'Stablecataphract':              'military',
    # Production — workshops, farms
    'Alchimist':                     'production',
    'Bakery':                        'production',
    'Barrelproducer':                'production',
    'Brewery':                       'production',
    'Butcher':                       'production',
    'Goatbreed':                     'production',
    'Shoemaker':                     'production',
    'Spicefarm':                     'production',
    'Tailor':                        'production',
    'Tannery':                       'production',
    'Wheatfarm':                     'production',
    'Windmill':                      'production',
    # Goods — raw material producers
    'Beekeeper':                     'goods',
    'BronzeFoundry':                 'goods',
    'Brickworks':                    'goods',
    'Carpenter':                     'goods',
    'Gunpowder':                     'goods',
    'JewelryManufacturer':           'goods',
    'Leadfoundry':                   'goods',
    'LimestoneMason':                'goods',
    'Ropery':                        'goods',
    'Weavingmill':                   'goods',
}

# Canonical era order (used to find the "best" era level for non-multi-age buildings)
ERA_ORDER = [
    'StoneAge', 'BronzeAge', 'IronAge', 'EarlyMiddleAge', 'HighMiddleAge',
    'LateMiddleAge', 'ColonialAge', 'IndustrialAge', 'ProgressiveEra',
    'ModernEra', 'PostModernEra', 'ContemporaryEra', 'TomorrowEra', 'FutureEra',
    'ArcticFuture', 'OceanicFuture', 'VirtualFuture',
    'SpaceAgeMars', 'SpaceAgeAsteroidBelt', 'SpaceAgeVenus', 'SpaceAgeTitan',
    'SpaceAgeJupiterMoon', 'SpaceAgeSpaceHub',
    'AllAge', 'MultiAge', 'NoAge',
]

# ── Era name mapping ──────────────────────────────────────────────────────────
ERA_MAP = {
    'StoneAge':            'Stone Age',
    'BronzeAge':           'Bronze Age',
    'IronAge':             'Iron Age',
    'EarlyMiddleAge':      'Early Middle Ages',
    'HighMiddleAge':       'High Middle Ages',
    'LateMiddleAge':       'Late Middle Ages',
    'ColonialAge':         'Colonial Age',
    'IndustrialAge':       'Industrial Age',
    'ProgressiveEra':      'Progressive Era',
    'ModernEra':           'Modern Era',
    'PostModernEra':       'Post-Modern Era',
    'ContemporaryEra':     'Contemporary Era',
    'TomorrowEra':         'Tomorrow Era',
    'FutureEra':           'Future Era',
    'ArcticFuture':        'Arctic Future',
    'OceanicFuture':       'Oceanic Future',
    'VirtualFuture':       'Virtual Future',
    'SpaceAgeMars':        'Space Age Mars',
    'SpaceAgeAsteroidBelt':'Space Age Asteroid Belt',
    'SpaceAgeVenus':       'Space Age Venus',
    'SpaceAgeTitan':       'Space Age Titan',
    'SpaceAgeJupiterMoon': 'Space Age Jupiter Moon',
    'SpaceAgeSpaceHub':    'Space Age Space Hub',
    'AllAge':              'All Ages',
    'MultiAge':            'All Ages',
    'NoAge':               'All Ages',
}


# Timer seconds → label suffix used as stat key suffix
TIMER_SUFFIX_MAP = {
    300:    '5m',
    900:    '15m',
    3600:   '1h',
    14400:  '4h',
    28800:  '8h',
    86400:  '24h',
    172800: '2d',
    604800: '7d',
}


def get_production_stats(entity):
    """
    Extract per-era passive bonus stats from an entity.
    Returns a dict keyed by era code (e.g. 'BronzeAge') with stats dict, or None.

    Covers two data systems used by the game:

    System A — entity_levels (older buildings):
      Flat fields per era level: provided_population, provided_happiness,
      demand_for_happiness, produced_money.

    System B — components (newer/event buildings):
      components[era].staticResources  → population
      components[era].happiness        → provided / demanded
      components[era].production       → autoStart passive production options
        options[].time + products[].playerResources.resources → resource amounts

    Stat keys:
      population, happiness, demandHappiness, money_24h (residential coins)
      <resource_key>_<timer_suffix>  e.g. supplies_8h, strategy_points_24h,
      medals_1h, all_goods_of_age_24h …
    """
    # ── System A: entity_levels ───────────────────────────────────────────────
    entity_levels = entity.get('entity_levels', []) or []
    if entity_levels:
        result = {}
        for level in entity_levels:
            era = level.get('era', '')
            if not era:
                continue
            stats = {}
            hp     = level.get('provided_happiness', 0) or 0
            pop    = level.get('provided_population', 0) or 0
            demand = level.get('demand_for_happiness', 0) or 0
            coins  = level.get('produced_money', 0) or 0
            if hp:     stats['happiness']      = hp
            if pop:    stats['population']     = pop
            if demand: stats['demandHappiness'] = demand
            if coins:  stats['money_24h']      = coins
            if stats:
                result[era] = stats
        return result if result else None

    # ── System B: components ──────────────────────────────────────────────────
    components = entity.get('components') or {}
    if components:
        result = {}
        for era, era_data in components.items():
            if not isinstance(era_data, dict):
                continue
            stats = {}

            # Population (staticResources)
            pop = (
                (era_data.get('staticResources') or {})
                .get('resources', {})
                .get('resources', {})
                .get('population', 0) or 0
            )
            if pop:
                stats['population'] = pop

            # Happiness
            hap_block = era_data.get('happiness') or {}
            hp     = hap_block.get('provided', 0) or 0
            demand = hap_block.get('demanded', 0) or 0
            if hp:     stats['happiness']       = hp
            if demand: stats['demandHappiness'] = demand

            # Passive (autoStart) production options
            prod_block = era_data.get('production') or {}
            if prod_block.get('autoStart'):
                timer = prod_block.get('time') or 0
                for opt in prod_block.get('options') or []:
                    opt_timer = opt.get('time') or timer
                    suffix = TIMER_SUFFIX_MAP.get(opt_timer, f't{opt_timer}s')
                    for product in opt.get('products') or []:
                        resources = (product.get('playerResources') or {}).get('resources') or {}
                        for res_key, val in resources.items():
                            if val:
                                stats[f'{res_key}_{suffix}'] = val

            if stats:
                result[era] = stats
        return result if result else None

    return None


MILITARY_BOOST_TYPES = {
    'att_boost_attacker', 'att_boost_defender',
    'def_boost_attacker', 'def_boost_defender',
    'att_def_boost_attacker', 'att_def_boost_defender',
    'att_def_boost_attacker_defender',
}


def get_boosts(entity):
    """
    Extract passive military/percentage boosts from an entity's components.
    Returns a list of {type, value, feature} dicts, or None.

    Components can be under 'AllAge', an era key, or any era.
    De-duplicates identical type+feature pairs (takes the first seen).
    """
    components = entity.get('components') or {}
    if not components:
        return None

    seen = set()
    boosts = []

    for era_data in components.values():
        if not isinstance(era_data, dict):
            continue
        boost_block = era_data.get('boosts') or {}
        for b in boost_block.get('boosts') or []:
            btype   = b.get('type', '')
            bval    = b.get('value', 0) or 0
            feature = b.get('targetedFeature', 'all') or 'all'
            if not btype or not bval:
                continue
            key = f'{btype}|{feature}'
            if key not in seen:
                seen.add(key)
                boosts.append({'type': btype, 'value': bval, 'feature': feature})

    return boosts if boosts else None


def load_data(source):
    """Load JSON from a URL or local file path."""
    if source.startswith('http://') or source.startswith('https://'):
        print(f'Fetching {source} ...')
        req = urllib.request.Request(source, headers={
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'gzip, deflate',
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
        # Decompress if gzip
        if raw[:2] == b'\x1f\x8b':
            raw = gzip.decompress(raw)
        return json.loads(raw)
    else:
        path = Path(source)
        if not path.exists():
            print(f'Error: file not found: {source}')
            sys.exit(1)
        print(f'Reading {source} ...')
        return json.loads(path.read_text(encoding='utf-8'))


def get_size(entity):
    """Return (width, height) or None if size cannot be determined."""
    if 'width' in entity and 'length' in entity:
        return entity['width'], entity['length']
    # Fallback: components-based size (used by GenericCityEntity)
    try:
        size = entity['components']['AllAge']['placement']['size']
        return size['x'], size['y']
    except (KeyError, TypeError):
        return None


def convert(data):
    """Convert the raw list of game entities to the database dict."""
    buildings = {}
    stats = {'skipped_type': 0, 'skipped_world': 0, 'skipped_no_size': 0, 'included': 0}

    for entity in data:
        raw_type = entity.get('type', '')

        if raw_type in SKIP_TYPES:
            stats['skipped_type'] += 1
            continue

        # Skip cultural settlement and guild raid buildings by ID world segment
        id_parts = entity.get('id', '').split('_')
        if len(id_parts) >= 2 and id_parts[1] in NON_MAIN_CITY_WORLDS:
            stats['skipped_world'] += 1
            continue

        size = get_size(entity)
        if size is None or size[0] <= 0 or size[1] <= 0:
            stats['skipped_no_size'] += 1
            continue

        width, height = size

        req = entity.get('requirements', {}) or {}

        # GenericCityEntity (W_* ids, empty type) are event/special buildings
        entity_id = entity.get('id', '')
        if raw_type == '' and entity.get('__class__') == 'GenericCityEntity':
            app_type = 'event'
            color    = EVENT_COLOR
            age      = get_event_name(entity_id)
        else:
            app_type, color = TYPE_MAP.get(raw_type, ('culture', '#6B8E7F'))
            min_era = req.get('min_era', '') or ''
            age     = ERA_MAP.get(min_era, 'All Ages')

        needs_road = req.get('street_connection_level', 0)

        prod_stats  = get_production_stats(entity)
        boost_stats = get_boosts(entity)

        key = entity['id']
        buildings[key] = {
            'name':      entity.get('name', key),
            'width':     width,
            'height':    height,
            'type':      app_type,
            'age':       age,
            'color':     color,
            'needsRoad': needs_road,
        }
        if prod_stats:
            buildings[key]['prod'] = prod_stats
        if boost_stats:
            buildings[key]['boosts'] = boost_stats
        stats['included'] += 1

    return buildings, stats


def infer_qi_type(id_parts, raw_type):
    """
    Infer (app_type, color) for a QI building.

    Priority:
      1. H_ prefix  → main_building
      2. I_ prefix  → impediment
      3. raw_type in TYPE_MAP (non-empty) → use TYPE_MAP
      4. W_ GenericCityEntity → look up suffix in QI_SUFFIX_TYPE;
         Residential* → residential; default → culture
    """
    prefix = id_parts[0] if id_parts else ''
    suffix = id_parts[2] if len(id_parts) >= 3 else ''

    if prefix == 'H' or raw_type == 'main_building':
        app_type = 'main_building'
    elif prefix == 'I' or raw_type == 'impediment':
        app_type = 'impediment'
    elif raw_type and raw_type in TYPE_MAP:
        app_type, _ = TYPE_MAP[raw_type]
    elif suffix.startswith('Residential'):
        app_type = 'residential'
    else:
        app_type = QI_SUFFIX_TYPE.get(suffix, 'culture')

    color = QI_TYPE_COLORS.get(app_type, '#6B8E7F')
    return app_type, color


def convert_qi(data):
    """
    Convert QI (Guild Raids) entities to the database dict.
    Similar to convert() but:
      - only processes entities whose world segment is in QI_WORLDS
      - allows main_building and impediment types
      - forces age = 'Quantum Incursion' for all entries
      - infers building type from ID prefix/suffix (QI buildings are GenericCityEntity)
      - deduplicates impediments by size (keeps first occurrence per (w,h))
    """
    buildings = {}
    seen_impediment_sizes = set()
    stats = {'skipped_type': 0, 'skipped_world': 0, 'skipped_no_size': 0,
             'skipped_impediment_dup': 0, 'included': 0}

    for entity in data:
        id_parts = entity.get('id', '').split('_')
        if len(id_parts) < 2 or id_parts[1] not in QI_WORLDS:
            stats['skipped_world'] += 1
            continue

        raw_type = entity.get('type', '')
        if raw_type in QI_SKIP_TYPES:
            stats['skipped_type'] += 1
            continue

        size = get_size(entity)
        if size is None or size[0] <= 0 or size[1] <= 0:
            stats['skipped_no_size'] += 1
            continue

        width, height = size
        app_type, color = infer_qi_type(id_parts, raw_type)

        # Deduplicate impediments: keep only the first occurrence of each (w, h)
        if app_type == 'impediment':
            if (width, height) in seen_impediment_sizes:
                stats['skipped_impediment_dup'] += 1
                continue
            seen_impediment_sizes.add((width, height))

        req = entity.get('requirements', {}) or {}
        needs_road = req.get('street_connection_level', 0)

        prod_stats  = get_production_stats(entity)
        boost_stats = get_boosts(entity)

        key = entity['id']
        buildings[key] = {
            'name':      entity.get('name', key),
            'width':     width,
            'height':    height,
            'type':      app_type,
            'age':       'Quantum Incursion',
            'color':     color,
            'needsRoad': needs_road,
        }
        if prod_stats:
            buildings[key]['prod'] = prod_stats
        if boost_stats:
            buildings[key]['boosts'] = boost_stats
        stats['included'] += 1

    return buildings, stats


def write_js(buildings, out_path, export_name='BUILDINGS'):
    """Write the buildings dict as an ES module JS file."""
    lines = [
        '// Auto-generated by tools/build_database.py — do not edit by hand.',
        f'// Total buildings: {len(buildings)}',
        f'export const {export_name} = {{',
    ]

    # Sort by era order, then name
    era_order = list(ERA_MAP.values())
    def sort_key(item):
        b = item[1]
        try:
            era_idx = era_order.index(b['age'])
        except ValueError:
            era_idx = 999
        return (era_idx, b['name'])

    for key, b in sorted(buildings.items(), key=sort_key):
        prod_str   = ''
        boosts_str = ''
        if 'prod' in b:
            prod_str = f', prod: {json.dumps(b["prod"], separators=(",", ":"))}'
        if 'boosts' in b:
            boosts_str = f', boosts: {json.dumps(b["boosts"], separators=(",", ":"))}'
        lines.append(
            f'    {json.dumps(key)}: {{'
            f' name: {json.dumps(b["name"])},'
            f' width: {b["width"]}, height: {b["height"]},'
            f' type: {json.dumps(b["type"])}, age: {json.dumps(b["age"])},'
            f' color: {json.dumps(b["color"])}, needsRoad: {b["needsRoad"]}'
            f'{prod_str}{boosts_str} }},'
        )

    lines.append('};')
    lines.append('')

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f'Wrote {out_path}')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    source = sys.argv[1]
    data_dir = Path(__file__).resolve().parent.parent / 'data'
    out_main = data_dir / 'foe_buildings_database.js'
    out_qi   = data_dir / 'qi_buildings_database.js'

    data = load_data(source)
    if not isinstance(data, list):
        print(f'Error: expected a JSON array, got {type(data).__name__}')
        sys.exit(1)

    print(f'Loaded {len(data)} entities.')

    # ── Main city buildings ───────────────────────────────────────────────────
    buildings, stats = convert(data)
    write_js(buildings, out_main, export_name='BUILDINGS')

    print()
    print('Main city buildings:')
    print(f'  Included:                      {stats["included"]}')
    print(f'  Skipped (non-placeable type):  {stats["skipped_type"]}')
    print(f'  Skipped (settlement/QI):       {stats["skipped_world"]}')
    print(f'  Skipped (no size data):        {stats["skipped_no_size"]}')

    # ── Quantum Incursion buildings ───────────────────────────────────────────
    qi_buildings, qi_stats = convert_qi(data)
    write_js(qi_buildings, out_qi, export_name='QI_BUILDINGS')

    print()
    print('Quantum Incursion buildings:')
    print(f'  Included:                      {qi_stats["included"]}')
    print(f'  Skipped (non-placeable type):  {qi_stats["skipped_type"]}')
    print(f'  Skipped (not QI world):        {qi_stats["skipped_world"]}')
    print(f'  Skipped (no size data):        {qi_stats["skipped_no_size"]}')
    print(f'  Skipped (impediment duplicate):{qi_stats["skipped_impediment_dup"]}')


if __name__ == '__main__':
    main()
