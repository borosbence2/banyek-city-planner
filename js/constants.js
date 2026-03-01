export const CITY_TYPES = [
    { id: 'main',       label: 'Main City',           icon: '🏙️' },
    { id: 'settlement', label: 'Cultural Settlement',  icon: '🏛️' },
    { id: 'colony',     label: 'Colony',               icon: '🚀' },
    { id: 'quantum',    label: 'Quantum Incursion',     icon: '⚡' },
];

/**
 * Cultural Settlement types.
 * gridW/gridH: starting grid in cells (each expansion = 4×4 cells).
 * embassyId:   building ID of the embassy (placed automatically on new settlement).
 * hasRoads:    whether this settlement uses road connections.
 */
export const SETTLEMENT_TYPES = [
    { id: 'vikings',     label: 'Vikings',       icon: '⚓',   gridW:  8, gridH:  8, hasRoads: true,  embassyId: 'S_Vikings_Embassy'     },
    { id: 'feudal_japan',label: 'Feudal Japan',  icon: '⛩️',  gridW:  8, gridH:  8, hasRoads: true,  embassyId: 'S_Japan_Embassy'        },
    { id: 'egypt',       label: 'Ancient Egypt', icon: '🏺',   gridW: 16, gridH:  8, hasRoads: true,  embassyId: 'S_Egypt_Embassy'        },
    { id: 'aztecs',      label: 'Aztecs',        icon: '🌿',   gridW: 12, gridH:  8, hasRoads: true,  embassyId: 'S_Aztecs_Embassy'       },
    { id: 'mughal',      label: 'Mughal Empire', icon: '🕌',   gridW: 16, gridH: 12, hasRoads: true,  embassyId: 'S_Mughal_Embassy'       },
    { id: 'polynesia',   label: 'Polynesia',     icon: '🌴',   gridW:  8, gridH:  8, hasRoads: false, embassyId: 'S_Polynesia_Embassy'    },
    { id: 'pirates',     label: 'Pirates',       icon: '🏴‍☠️', gridW:  8, gridH:  8, hasRoads: false, embassyId: 'S_Pirates_Embassy'      },
];

/**
 * Space Age Colony types.
 * gridW/gridH: starting grid size in cells.
 * hqId:        building ID of the headquarters (placed automatically).
 * hasRoads:    whether this colony uses road connections.
 */
export const COLONY_TYPES = [
    { id: 'mars',         label: 'Mars',          icon: '🔴', gridW: 20, gridH: 20, hasRoads: true,  hqId: 'C_Mars_TH'   },
    { id: 'asteroid_belt',label: 'Asteroid Belt', icon: '🪨', gridW: 20, gridH: 20, hasRoads: true,  hqId: 'C_AB_TH'     },
    { id: 'venus',        label: 'Venus',          icon: '🟡', gridW: 20, gridH: 20, hasRoads: true,  hqId: 'C_Venus_TH'  },
    { id: 'jupiter_moon', label: 'Jupiter Moon',   icon: '🌊', gridW: 20, gridH: 20, hasRoads: true,  hqId: 'C_JM_TH'     },
    { id: 'titan',        label: 'Titan',          icon: '🧊', gridW: 20, gridH: 20, hasRoads: false, hqId: 'C_Titan_TH'  },
    { id: 'space_hub',    label: 'Space Hub',      icon: '🛸', gridW: 20, gridH: 20, hasRoads: false, hqId: 'C_SH_TH'     },
];

export const CONSTANTS = {
    DEFAULT_CELL_SIZE: 30,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 3.0,
    ZOOM_STEP: 1.2,
    MIN_GRID_SIZE: 10,
    MAX_GRID_SIZE: 200,
    DEFAULT_GRID_SIZE: 20,
    DEFAULT_GRID_SIZE_BY_TYPE: {
        main:       { w: 20, h: 20 },
        settlement: { w: 20, h: 20 },
        colony:     { w: 20, h: 20 },
        quantum:    { w: 12, h: 16 },
    },

    // Colors matching FoE Helper
    COLORS: {
        RESIDENTIAL:    '#87CEEB',
        PRODUCTION:     '#5F8DC3',
        GOODS:          '#F4E16B',
        CULTURE:        '#6B8E7F',
        MILITARY:       '#8B7BAA',
        GREAT_BUILDING: '#D46A4F',
        TOWN_HALL:      '#E8D679',
        EVENT:          '#D4884B',
        ROAD:           '#808080',
        WIDE_ROAD:      '#6b6b6b',
        ROADLESS:       '#6B8E7F',
    },

    // Dark-mode building color palette (vivid but not harsh on dark canvas)
    DARK_COLORS: {
        residential:    '#1E88E5',
        production:     '#0097A7',
        goods:          '#FFA000',
        culture:        '#43A047',
        military:       '#8E24AA',
        great:          '#F4511E',
        townhall:       '#FFB300',
        event:          '#FB8C00',
    },

    // Optimizer settings
    OPTIMIZER: {
        GRID_OVERHEAD:            0.55,
        LARGE_BUILDING_PERCENTILE: 0.18,
        MAX_PRUNING_PASSES:        40,
        TOWN_HALL_RING_SIZE:       1,
    },

    VERSION: '6.0',
};
