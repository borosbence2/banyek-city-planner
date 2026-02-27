import { CONSTANTS } from './constants.js';

export class FoeImporter {
    constructor(planner) {
        this.p = planner;
    }

    /**
     * Entry point called by EventHandler when the user clicks "Import".
     * selectedCityTypes: array of city type IDs to import (e.g. ['main', 'settlement']).
     * data: already-parsed JSON object from the textarea.
     */
    async importFromFoeHelper(selectedCityTypes, data) {
        const p = this.p;
        try {
            const summaryParts = [];

            for (const cityType of selectedCityTypes) {
                const snapshot = this._importCityTypeFromData(data, cityType);
                if (!snapshot) continue;

                p.cities[cityType] = snapshot;
                summaryParts.push(
                    `${cityType}: ${snapshot.buildings.length} buildings, ${snapshot.roads.length} roads`
                );
            }

            if (summaryParts.length === 0) {
                alert('No city data could be imported. Check that the JSON matches the selected city types.');
                return;
            }

            // Restore the active city so the canvas reflects it
            p.restoreSnapshot(p.cities[p.activeCityType]);
            p.updateCityTabs();
            p.hideModal('importFoeModal');

            const pooled = p.buildingPool.length;
            const poolNote = pooled > 0 ? `\n${pooled} building(s) placed in the Building Pool (were outside the grid).` : '';
            alert(`Import complete!\n\n${summaryParts.join('\n')}${poolNote}`);

        } catch (error) {
            console.error('Import error:', error);
            alert(`Error importing city data: ${error.message}\n\nPlease make sure you copied the complete JSON from FoE Helper.`);
        }
    }

    /**
     * Import one city type from a parsed FoE Helper JSON.
     * Temporarily writes to p.* fields, then captures and returns a snapshot.
     * Returns null if no data is found for this city type.
     */
    _importCityTypeFromData(data, cityType) {
        const p = this.p;
        const keys = FoeImporter.CITY_ROOT_KEYS[cityType];
        if (!keys || !data[keys.map]) return null;

        // Reset temp state
        p.buildings    = [];
        p.roads        = new Set();
        p.buildingPool = [];
        p.unlockedAreas = [];
        p.cityMetadata  = null;

        let entities = [];
        let cityEntitiesMetadata = {};

        // Use the known root keys for this city type
        cityEntitiesMetadata = keys.entities && data[keys.entities] ? data[keys.entities] : {};
        entities = Object.values(data[keys.map]);
        console.log(`[Import] ${cityType} — ${entities.length} entities`);

        if (!entities || entities.length === 0) return null;

        const rawUnlockedAreas = (keys.areas && data[keys.areas])
            ? Object.values(data[keys.areas]) : [];
        this.initializeCityMetadata(entities.length);

        // Compute bounds and offset
        let offsetX, offsetY;
        if (rawUnlockedAreas.length > 0) {
            let minX = Infinity, minY = Infinity;
            rawUnlockedAreas.forEach(area => {
                minX = Math.min(minX, area.x || 0);
                minY = Math.min(minY, area.y || 0);
            });
            if (!isFinite(minX)) { minX = 0; minY = 0; }
            offsetX = -minX;
            offsetY = -minY;
            // Shift areas by the same offset so entities and areas stay aligned.
            // _recomputeGridBounds will derive gridWidth/Height/OffsetX/Y automatically.
            p.unlockedAreas = rawUnlockedAreas.map(area => ({
                ...area,
                x: (area.x || 0) + offsetX,
                y: (area.y || 0) + offsetY,
            }));
        } else {
            const b = this.calculateGridBounds(entities, cityEntitiesMetadata);
            offsetX = isFinite(b.minX) ? -b.minX + 2 : 2;
            offsetY = isFinite(b.minY) ? -b.minY + 2 : 2;
            p.gridWidth  = Math.max(20, b.maxX - b.minX + 4);
            p.gridHeight = Math.max(20, b.maxY - b.minY + 4);
        }

        // Compute grid bounds and unlock cells BEFORE placing buildings.
        // rebuildUnlockedCells → _recomputeGridBounds sets gridWidth/Height from
        // unlockedAreas when areas are present; for area-less cities gridWidth/Height
        // were already set by calculateGridBounds in the else branch above.
        p.rebuildUnlockedCells();

        this.importEntities(entities, cityEntitiesMetadata, offsetX, offsetY);

        return p.getSnapshot();
    }

    initializeCityMetadata(buildingCount) {
        const p = this.p;
        p.cityMetadata = {
            importedAt:    new Date().toLocaleString(),
            buildingCount,
            gridSize:      `${p.gridWidth}x${p.gridHeight}`,
            greatBuildings: [],
            streetEfficiency: null,
            production: { coins: 0, supplies: 0, goods: {}, forgePoints: 0, medals: 0, units: 0 },
            boosts:     { attack_for_attacker: 0, attack_for_defender: 0, defense_for_attacker: 0, defense_for_defender: 0 },
            population: { provided: 0, required: 0 },
            happiness:  { total: 0 },
        };
    }

    calculateGridBounds(entities, metadata) {
        let maxX = 0, maxY = 0, minX = Infinity, minY = Infinity;

        entities.forEach(entity => {
            const x = entity.x || 0;
            const y = entity.y || 0;
            const meta = metadata[entity.cityentity_id] || {};

            let w = 1, h = 1;
            if (meta.width !== undefined && meta.length !== undefined) {
                w = meta.width; h = meta.length;
            } else if (meta.components?.AllAge?.placement?.size) {
                w = meta.components.AllAge.placement.size.x;
                h = meta.components.AllAge.placement.size.y;
            }

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        });

        return { minX, minY, maxX, maxY };
    }

    importEntities(entities, cityEntitiesMetadata, offsetX, offsetY) {
        const p = this.p;
        let streetsNeeded = 0;
        let streetsUsed = 0;
        let pooledCount = 0;

        // Detect the player's current era from their Town Hall entity ID.
        // e.g. 'H_IronAge_Townhall' → segment 'IronAge' → known in ERA_MAP.
        const townHall = entities.find(e => e.type === 'main_building');
        const townHallSegment = townHall?.cityentity_id?.split('_')[1];
        const playerEraCode = (townHallSegment && FoeImporter.ERA_MAP[townHallSegment])
            ? townHallSegment : null;
        p.cityMetadata.playerEraCode = playerEraCode;

        entities.forEach(entity => {
            const entityId = entity.cityentity_id;
            const meta = cityEntitiesMetadata[entityId] || {};

            const x = (entity.x ?? 0) + offsetX;
            const y = (entity.y ?? 0) + offsetY;

            let width = 1, height = 1;
            if (meta.width !== undefined && meta.length !== undefined) {
                width = meta.width; height = meta.length;
            } else if (meta.components?.AllAge?.placement?.size) {
                width  = meta.components.AllAge.placement.size.x;
                height = meta.components.AllAge.placement.size.y;
            }

            const type = entity.type || meta.type || '';
            const name = meta.name || entityId || 'Unknown Building';

            let needsRoad = 0;
            if (meta.requirements?.street_connection_level !== undefined) {
                needsRoad = meta.requirements.street_connection_level;
            } else if (meta.components?.AllAge?.streetConnectionRequirement) {
                needsRoad = meta.components.AllAge.streetConnectionRequirement.requiredLevel;
            }

            const typeLC = type.toLowerCase();
            const isRoad = typeLC.includes('street') || typeLC.includes('road') || type === 'Street';

            if (isRoad) {
                // CarStreet entities are 2×2 wide roads
                const isWideRoad = entityId && entityId.includes('CarStreet');
                if (isWideRoad) {
                    // Determine block size from meta (should be 2×2), default to 2
                    const bw = (width  >= 2) ? width  : 2;
                    const bh = (height >= 2) ? height : 2;
                    const anchor = `${x},${y}`;
                    if (!p.wideRoads.has(anchor)) {
                        p.wideRoads.add(anchor);
                        for (let dy = 0; dy < bh; dy++)
                            for (let dx = 0; dx < bw; dx++)
                                p.roads.add(`${x + dx},${y + dy}`);
                    }
                } else {
                    p.roads.add(`${x},${y}`);
                }
                streetsUsed++;
                return;
            }

            // If the entity is in our building database, trust its type/color directly.
            // This correctly handles event buildings (W_*), culture, goods, etc.
            let buildingType, color;
            const knownTemplate = p.buildingTemplates[entityId];
            if (knownTemplate) {
                buildingType = knownTemplate.type;
                color        = knownTemplate.color;
            } else {
                ({ buildingType, color } = this.getBuildingTypeAndColor(type, needsRoad));
            }
            this._processEntityMetadata(entity, meta, type);

            if (entity.connected === 1 && type !== 'street' && needsRoad > 0) {
                streetsNeeded += Math.min(width, height) * needsRoad / 2;
            }

            // Resolve era: fixed-era buildings have min_era; multi-age buildings fall back
            // to the player's current era detected from the Town Hall.
            const minEra  = meta.requirements?.min_era || null;
            const eraCode = minEra || playerEraCode || null;
            const age     = FoeImporter.ERA_MAP[minEra] || (buildingType === 'event' ? 'All Ages' : (knownTemplate?.age || 'Unknown'));

            // Extract the actual production option object from CityEntities metadata.
            // entity.state.productionOption is the selected option INDEX; the real data
            // lives in meta.components[eraCode].production.options[idx].
            let currentProd = null;
            const optionIdx = entity.state?.productionOption;
            if (typeof optionIdx === 'number') {
                const prodComp = comps[eraCode]?.production
                    || comps.AllAge?.production
                    || Object.values(comps).find(c => c?.production)?.production
                    || null;
                currentProd = prodComp?.options?.[optionIdx] ?? null;
            }
            const eventName = (buildingType === 'event') ? (knownTemplate?.age || null) : null;
            const gbLevel = (type === 'greatbuilding' && entity.level !== undefined) ? entity.level : null;

            // Expiration: "limited" (Felemelkedett/evolved) buildings have a
            // limited component somewhere in meta.components (always AllAge in
            // practice, but we search all keys to be safe).
            // entity.state.next_state_transition_at is the expiration Unix timestamp.
            // For regular production buildings that same field is just the next
            // production-ready timer — so we only read it for confirmed limited entities.
            let limited = null;
            const comps = meta.components || {};
            for (const ageKey of Object.keys(comps)) {
                if (comps[ageKey]?.limited) { limited = comps[ageKey].limited; break; }
            }
            // For limited (Felemelkedett/evolved) buildings the expiration Unix
            // timestamp is in entity.state.decaysAt.  Fall back to
            // next_state_transition_at (older export format), or compute from
            // next_state_transition_in if that's all that's available.
            let expiration = null;
            if (limited) {
                if (entity.state?.decaysAt != null) {
                    expiration = entity.state.decaysAt;
                } else if (entity.state?.next_state_transition_at != null) {
                    expiration = entity.state.next_state_transition_at;
                } else if (entity.state?.next_state_transition_in != null) {
                    expiration = Math.floor(Date.now() / 1000) + entity.state.next_state_transition_in;
                }
            }

            // Revert-to building comes from limited.config.targetCityEntityId.
            const revertId = limited?.config?.targetCityEntityId ?? null;
            const revertName = revertId
                ? (cityEntitiesMetadata[revertId]?.name ?? revertId)
                : null;
            // Total duration of the evolved state in seconds (e.g. 2592000 = 30 days).
            const expireDuration = limited?.config?.expireTime ?? null;

            // Military boosts: stored in meta.components[ageKey].boosts.boosts[].
            // AllAge and era-specific boosts are mutually exclusive in the data.
            // Pick the right source: AllAge → era-match → first available.
            const MILITARY_BOOST_TYPES = new Set([
                'att_boost_attacker', 'att_boost_defender',
                'def_boost_attacker', 'def_boost_defender',
                'att_def_boost_attacker', 'att_def_boost_defender',
                'att_def_boost_attacker_defender',
            ]);
            let boostSource = comps.AllAge?.boosts?.boosts;
            if (!boostSource) {
                const eraKey = age ? age.replace(/ /g, '') : null;
                boostSource = (eraKey && comps[eraKey]?.boosts?.boosts)
                    || (eraCode && comps[eraCode]?.boosts?.boosts)
                    || Object.values(comps).find(c => c?.boosts?.boosts)?.boosts?.boosts;
            }
            const boosts = (boostSource || [])
                .filter(b => MILITARY_BOOST_TYPES.has(b.type))
                .map(b => ({ type: b.type, value: b.value, feature: b.targetedFeature || 'all' }));

            const building = { id: entityId, x, y, width, height, name, type: buildingType, color, age, eraCode, eventName, needsRoad, currentProd, expiration, expireDuration, revertName, ...(boosts.length > 0 && { boosts }), ...(gbLevel !== null && { gbLevel }) };

            // Expand the grid if the building would overflow — all imported buildings
            // should land on the canvas, never the pool (pool is for user drag-off).
            if (x + width  > p.gridWidth)  p.gridWidth  = x + width  + 1;
            if (y + height > p.gridHeight) p.gridHeight = y + height + 1;

            if (x < 0 || y < 0) {
                // Negative coordinates shouldn't occur with correct offsetting — pool as last resort
                p.buildingPool.push(building);
                pooledCount++;
            } else {
                p.buildings.push(building);
            }
        });

        if (pooledCount > 0) {
            console.log(`[Import] ${pooledCount} buildings placed in pool (partially outside grid).`);
            p.updatePoolPanel();
        }

        p.cityMetadata.streetEfficiency = {
            needed:     streetsNeeded,
            used:       streetsUsed,
            efficiency: streetsUsed > 0 ? (streetsNeeded / streetsUsed * 100) : 0,
        };
    }

    getBuildingTypeAndColor(type, needsRoad) {
        const t = type.toLowerCase();

        if (needsRoad === 0) return { buildingType: 'roadless',   color: CONSTANTS.COLORS.CULTURE };
        if (t.includes('residential') || t.includes('house')) return { buildingType: 'residential', color: CONSTANTS.COLORS.RESIDENTIAL };
        if (t.includes('production'))  return { buildingType: 'production',  color: CONSTANTS.COLORS.PRODUCTION };
        if (t.includes('goods'))       return { buildingType: 'goods',       color: CONSTANTS.COLORS.GOODS };
        if (t.includes('culture') || t.includes('decoration')) return { buildingType: 'culture', color: CONSTANTS.COLORS.CULTURE };
        if (t.includes('military'))    return { buildingType: 'military',    color: CONSTANTS.COLORS.MILITARY };
        if (t.includes('great'))       return { buildingType: 'great',       color: CONSTANTS.COLORS.GREAT_BUILDING };
        if (t.includes('main') || t.includes('townhall') || t.includes('city_hall')) return { buildingType: 'townhall', color: CONSTANTS.COLORS.TOWN_HALL };

        return { buildingType: 'residential', color: CONSTANTS.COLORS.RESIDENTIAL };
    }

    _processEntityMetadata(entity, meta, type) {
        const p = this.p;

        if (type === 'greatbuilding' && entity.level !== undefined) {
            p.cityMetadata.greatBuildings.push({
                name:     meta.name || entity.cityentity_id,
                level:    entity.level,
                maxLevel: entity.max_level || entity.level,
                id:       entity.cityentity_id,
            });
        }

        if (meta.components?.AllAge?.boosts?.boosts) {
            meta.components.AllAge.boosts.boosts.forEach(boost => {
                if (!p.cityMetadata.boosts[boost.type]) p.cityMetadata.boosts[boost.type] = 0;
                p.cityMetadata.boosts[boost.type] += boost.value;
            });
        }
    }

    updateCityInfoPanel() {
        const p = this.p;
        const cityInfoEl   = document.getElementById('cityInfo');
        const cityInfoText = document.getElementById('cityInfoText');

        if (!p.cityMetadata) {
            cityInfoEl.style.display = 'none';
            return;
        }

        let html = `<strong>City Imported!</strong><br>`;
        html += `${p.buildings.length} buildings + ${p.roads.size} roads<br>`;
        html += `<small>Imported: ${p.cityMetadata.importedAt}</small>`;

        if (p.cityMetadata.greatBuildings?.length > 0) {
            html += `<div style="margin-top:15px;border-top:1px solid #ddd;padding-top:10px;">`;
            html += `<strong>🏛️ Great Buildings (${p.cityMetadata.greatBuildings.length}):</strong><br>`;
            html += `<div style="font-size:11px;max-height:200px;overflow-y:auto;">`;

            p.cityMetadata.greatBuildings.sort((a, b) => a.name.localeCompare(b.name));
            p.cityMetadata.greatBuildings.forEach(gb => {
                const progress  = (gb.level / gb.maxLevel * 100).toFixed(0);
                const barColor  = progress == 100 ? '#4CAF50' : '#2196F3';
                html += `<div style="margin:8px 0;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                        <span style="font-weight:500;">${gb.name}</span>
                        <span style="color:#666;">Lv ${gb.level}/${gb.maxLevel}</span>
                    </div>
                    <div style="background:#e0e0e0;height:6px;border-radius:3px;overflow:hidden;">
                        <div style="background:${barColor};width:${progress}%;height:100%;"></div>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        const eff = p.cityMetadata.streetEfficiency;
        if (eff) {
            const pct      = eff.efficiency.toFixed(1);
            const effColor = eff.efficiency < 80 ? '#FF9800' : eff.efficiency > 110 ? '#2196F3' : '#4CAF50';
            const effText  = eff.efficiency < 80 ? 'Too many roads' : eff.efficiency > 110 ? 'Very efficient!' : 'Excellent!';

            html += `<div style="margin-top:15px;border-top:1px solid #ddd;padding-top:10px;">
                <strong>🛣️ Street Efficiency:</strong>
                <div style="font-size:11px;margin-top:5px;">
                    <div style="display:flex;justify-content:space-between;margin:3px 0;">
                        <span>Efficiency:</span><span style="color:${effColor};font-weight:bold;">${pct}%</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin:3px 0;">
                        <span>Streets needed:</span><span>${eff.needed.toFixed(1)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin:3px 0;">
                        <span>Streets used:</span><span>${eff.used}</span>
                    </div>
                    <div style="margin-top:5px;padding:5px;background:#f5f5f5;border-radius:3px;font-size:10px;">
                        <strong style="color:${effColor};">${effText}</strong>
                    </div>
                </div>
            </div>`;
        }

        cityInfoText.innerHTML = html;
        cityInfoEl.style.display = 'block';
    }
}

/**
 * Maps city type IDs to the FoE Helper JSON root keys that identify them.
 * NOTE: Quantum Incursion (Guild Raids) uses the SAME root keys as the main city
 * (CityMapData / CityEntities / UnlockedAreas). City type is distinguished by
 * inspecting the main_building entity ID — see detectCities() below.
 */
FoeImporter.CITY_ROOT_KEYS = {
    main:       { map: 'CityMapData',        entities: 'CityEntities',       areas: 'UnlockedAreas' },
    quantum:    { map: 'CityMapData',        entities: 'CityEntities',       areas: 'UnlockedAreas' },
    settlement: { map: 'SettlementMapData',  entities: 'SettlementEntities', areas: null },
    colony:     { map: 'ColonyMapData',      entities: 'ColonyEntities',     areas: null },
};

/**
 * Scan a parsed FoE Helper JSON object and return the list of city type IDs
 * present in the data.
 * - Quantum Incursion uses the same keys as main city, so we distinguish them
 *   by looking for a GuildRaids main_building entity ID.
 */
FoeImporter.detectCities = function(data) {
    const detected = [];

    if (data.CityMapData) {
        // Determine if this is a QI export by checking the main_building entity ID
        const mainBuilding = Object.values(data.CityMapData).find(e => e.type === 'main_building');
        const isQI = mainBuilding && mainBuilding.cityentity_id &&
                     mainBuilding.cityentity_id.includes('GuildRaids');
        detected.push(isQI ? 'quantum' : 'main');
    }

    if (data.SettlementMapData) detected.push('settlement');
    if (data.ColonyMapData)     detected.push('colony');

    return detected;
};

FoeImporter.ERA_MAP = {
    StoneAge:             'Stone Age',
    BronzeAge:            'Bronze Age',
    IronAge:              'Iron Age',
    EarlyMiddleAge:       'Early Middle Ages',
    HighMiddleAge:        'High Middle Ages',
    LateMiddleAge:        'Late Middle Ages',
    ColonialAge:          'Colonial Age',
    IndustrialAge:        'Industrial Age',
    ProgressiveEra:       'Progressive Era',
    ModernEra:            'Modern Era',
    PostModernEra:        'Post-Modern Era',
    ContemporaryEra:      'Contemporary Era',
    TomorrowEra:          'Tomorrow Era',
    FutureEra:            'Future Era',
    ArcticFuture:         'Arctic Future',
    OceanicFuture:        'Oceanic Future',
    VirtualFuture:        'Virtual Future',
    SpaceAgeMars:         'Space Age Mars',
    SpaceAgeAsteroidBelt: 'Space Age Asteroid Belt',
    SpaceAgeVenus:        'Space Age Venus',
    SpaceAgeTitan:        'Space Age Titan',
    SpaceAgeJupiterMoon:  'Space Age Jupiter Moon',
    SpaceAgeSpaceHub:     'Space Age Space Hub',
    AllAge:               'All Ages',
    MultiAge:             'All Ages',
    NoAge:                'All Ages',
    GuildRaids:           'Quantum Incursion',
};
