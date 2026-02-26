export const Utils = {
    formatNumber(num) {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    },

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    getBuildingArea(building) {
        return building.width * building.height;
    },

    getBuildingShortSide(building) {
        return Math.min(building.width, building.height);
    },
};
