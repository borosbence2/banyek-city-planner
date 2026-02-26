export const CITY_TYPES = [
    { id: 'main',       label: 'Main City',           icon: '🏙️' },
    { id: 'settlement', label: 'Cultural Settlement',  icon: '🏛️' },
    { id: 'colony',     label: 'Colony',               icon: '🚀' },
    { id: 'quantum',    label: 'Quantum Incursion',     icon: '⚡' },
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
        ROADLESS:       '#6B8E7F',
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
