import { CONSTANTS, CITY_TYPES } from './constants.js';
export { CITY_TYPES }; // re-export for convenience
import { Utils }              from './utils.js';
import { Renderer }           from './Renderer.js';
import { EventHandler }       from './EventHandler.js';
import { FoeImporter }        from './FoeImporter.js';
import { Optimizer }          from './Optimizer.js';
import { ProductionOverview } from './ProductionOverview.js';
import { BUILDINGS }          from '../data/foe_buildings_database.js';
import { QI_BUILDINGS }       from '../data/qi_buildings_database.js';

export class CityPlanner {
    constructor() {
        this.canvas = document.getElementById('cityCanvas');
        this.ctx    = this.canvas.getContext('2d');

        this.gridWidth   = CONSTANTS.DEFAULT_GRID_SIZE;
        this.gridHeight  = CONSTANTS.DEFAULT_GRID_SIZE;
        this.gridOffsetX = 0; // top-left grid cell X of the canvas
        this.gridOffsetY = 0; // top-left grid cell Y of the canvas
        this.cellSize    = CONSTANTS.DEFAULT_CELL_SIZE;

        // Zoom & pan
        this.zoom      = 1.0;
        this.panX      = 0;
        this.panY      = 0;
        this.isPanning = false;
        this.lastPanX  = 0;
        this.lastPanY  = 0;

        // Building catalogue — main city + Quantum Incursion databases merged
        this.buildingTemplates = { ...BUILDINGS, ...QI_BUILDINGS };

        // Multi-city registry
        this.activeCityType = 'main';
        this.cities = { main: null, settlement: null, colony: null, quantum: null };

        // City state
        this.buildings     = [];
        this.roads         = new Set();
        this.wideRoads     = new Set(); // anchors ("x,y") of 2×2 CarStreet road blocks
        this.unlockedAreas = [];
        this.unlockedCells = null; // Set of "x,y" strings, or null when whole grid is open
        this.cityMetadata  = null;
        this.buildingPool  = [];

        // Interaction state
        this.placingRoad      = false;
        this.isPaintingRoad   = false;
        this.placingWideRoad  = false;
        this.isPaintingWideRoad = false;
        this.placingExpansion = false;
        this.selectedTemplate = null;
        this.selectedBuilding = null;
        this.selectedRoad = null;
        this.draggingBuilding = null;
        this.dragOffset       = { x: 0, y: 0 };
        this.dragStartPos     = { x: 0, y: 0 };
        this.dragPixelX       = 0;
        this.dragPixelY       = 0;
        this.hoverPos         = null;
        this.draggingRoad      = null;
        this.roadDragStart     = null;
        this.roadDragPixelX    = 0;
        this.roadDragPixelY    = 0;
        this.draggingWideRoad  = null;
        this.wideRoadDragStart = null;
        this.wideRoadDragPixelX = 0;
        this.wideRoadDragPixelY = 0;
        this._poolDragTemplate = null;

        // UI state
        this.currentTab  = 'all';
        this.searchTerm  = '';
        this.expandedEras = new Set();
        this.renderMode  = 'normal'; // 'normal' | 'expiry'

        // Sub-systems
        this.renderer         = new Renderer(this);
        this.events           = new EventHandler(this);
        this.importer         = new FoeImporter(this);
        this.optimizer        = new Optimizer(this);
        this.productionOverview = new ProductionOverview(this);

        this.events.setup();
        this.productionOverview.setupEvents();
        this.updateBuildingList();
        this.updatePoolPanel();
        this.resizeCanvas();
        this.updateCityTabs();
    }

    // ========================================
    // MODE & STATUS
    // ========================================
    enterRoadPlacement() {
        this.placingRoad = true;
        this.placingWideRoad = false;
        this.isPaintingRoad = false;
        this.isPaintingWideRoad = false;
        this.selectedTemplate = null;
        this.selectedBuilding = null;
        this.selectedRoad = null;
        this._clearActiveBuildingBtn();
        this._setActiveToolBtn('roadBtn');

        this.updateStatus('Road placement active');

        this.showModeBanner(`
            <strong>🛣 Road Placement Mode</strong><br>
            Drag to paint • Press ESC to exit
        `);
    }

    enterWideRoadPlacement() {
        this.placingWideRoad = true;
        this.placingRoad = false;
        this.isPaintingRoad = false;
        this.isPaintingWideRoad = false;
        this.selectedTemplate = null;
        this.selectedBuilding = null;
        this.selectedRoad = null;
        this._clearActiveBuildingBtn();
        this._setActiveToolBtn('wideRoadBtn');

        this.updateStatus('Wide road placement active');

        this.showModeBanner(`
            <strong>🛤 Wide Road Placement Mode (2×2)</strong><br>
            Drag to paint • Press ESC to exit
        `);
    }

    _setActiveToolBtn(id) {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active-placement'));
        if (id) document.getElementById(id)?.classList.add('active-placement');
    }

    /**
     * Place a 2×2 wide road with top-left anchor at (gridPos.x, gridPos.y).
     * All 4 cells are added to this.roads for connectivity, anchor to this.wideRoads.
     */
    placeWideRoad(gridPos) {
        const { x, y } = gridPos;
        if (x < 0 || y < 0 || x + 1 >= this.gridWidth || y + 1 >= this.gridHeight) return;
        // Check all 4 cells are unlocked and not occupied by buildings
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                if (!this.isCellUnlocked(x + dx, y + dy)) return;
                if (this.isBuildingAt(x + dx, y + dy)) return;
            }
        }
        const anchor = `${x},${y}`;
        if (this.wideRoads.has(anchor)) return; // already placed
        this.wideRoads.add(anchor);
        for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++)
                this.roads.add(`${x + dx},${y + dy}`);
        this.renderer.draw();
    }

    /**
     * Returns the anchor "x,y" key of the wide road block that contains cell (x,y),
     * or null if that cell is not part of any wide road.
     */
    _getWideRoadAnchor(x, y) {
        // A 2×2 block's anchor can be at (x,y), (x-1,y), (x,y-1), or (x-1,y-1)
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const key = `${x - dx},${y - dy}`;
                if (this.wideRoads.has(key)) return key;
            }
        }
        return null;
    }

    /**
     * Remove the road (narrow or wide) at the given cell.
     * For wide roads, removes the entire 2×2 block.
     */
    removeRoadAt(x, y) {
        const anchor = this._getWideRoadAnchor(x, y);
        if (anchor) {
            this.wideRoads.delete(anchor);
            const [ax, ay] = anchor.split(',').map(Number);
            for (let dy = 0; dy < 2; dy++)
                for (let dx = 0; dx < 2; dx++)
                    this.roads.delete(`${ax + dx},${ay + dy}`);
        } else {
            this.roads.delete(`${x},${y}`);
        }
        if (this.selectedRoad === `${x},${y}` || anchor) {
            this.selectedRoad = null;
        }
        this.renderer.draw();
    }

    enterBuildingPlacement(template) {
        this.selectedTemplate = template;
        this.placingRoad = false;
        this.placingWideRoad = false;
        this.placingExpansion = false;
        this.selectedBuilding = null;
        this.selectedRoad = null;

        this._setActiveToolBtn(null);
        this._highlightActiveBuildingBtn(template.id);
        this.updateStatus(`Placing: ${template.name} (ESC to cancel)`);
        this.showModeBanner(`
            <strong>🏗 Placing: ${template.name}</strong>
            <span class="mode-banner-size">${template.width}×${template.height}</span><br>
            Click to place • ESC to exit
        `);
    }

    _highlightActiveBuildingBtn(templateId) {
        this._clearActiveBuildingBtn();
        const list = document.getElementById('buildingList');
        if (!list) return;
        for (const btn of list.querySelectorAll('.btn')) {
            if (btn._templateId === templateId) {
                btn.classList.add('active-placement');
                break;
            }
        }
    }

    _clearActiveBuildingBtn() {
        const prev = document.querySelector('.active-placement');
        if (prev) prev.classList.remove('active-placement');
    }

    setRenderMode(mode) {
        this.renderMode = mode;
        document.querySelectorAll('.render-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        const legend = document.getElementById('colorLegend');
        if (legend) legend.dataset.mode = mode;
        this.renderer.draw();
    }

    updateActiveButton(activeBtn) {
        document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
    }

    updateStatus(text) {
        document.getElementById('status').textContent = text;
    }

    showModal(id) { document.getElementById(id).classList.add('active'); }
    hideModal(id) { document.getElementById(id).classList.remove('active'); }

    // ========================================
    // COORDINATE CONVERSION
    // ========================================
    getGridCoords(canvasX, canvasY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.floor((canvasX - rect.left  - this.panX) / this.zoom / this.cellSize),
            y: Math.floor((canvasY - rect.top - this.panY) / this.zoom / this.cellSize),
        };
    }

    // ========================================
    // UNLOCKED AREA HELPERS
    // ========================================
    rebuildUnlockedCells() {
        if (!this.unlockedAreas || this.unlockedAreas.length === 0) {
            this.unlockedCells = null; // whole grid is open
            this._recomputeGridBounds();
            return;
        }
        this.unlockedCells = new Set();
        for (const area of this.unlockedAreas) {
            const x0 = area.x      || 0;
            const y0 = area.y      || 0;
            const x1 = x0 + (area.width  || 0);
            const y1 = y0 + (area.length || 0);
            for (let cy = y0; cy < y1; cy++)
                for (let cx = x0; cx < x1; cx++)
                    this.unlockedCells.add(`${cx},${cy}`);
        }
        this._recomputeGridBounds();
    }

    /** Recompute gridWidth/Height/OffsetX/Y from current unlockedAreas (or default size if none). */
    _recomputeGridBounds() {
        if (!this.unlockedAreas || this.unlockedAreas.length === 0) {
            // No expansions — keep whatever gridWidth/Height was set (by resize or init)
            this.gridOffsetX = 0;
            this.gridOffsetY = 0;
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const area of this.unlockedAreas) {
            const x0 = area.x || 0;
            const y0 = area.y || 0;
            minX = Math.min(minX, x0);
            minY = Math.min(minY, y0);
            maxX = Math.max(maxX, x0 + (area.width  || 0));
            maxY = Math.max(maxY, y0 + (area.length || 0));
        }
        this.gridOffsetX = minX;
        this.gridOffsetY = minY;
        this.gridWidth   = maxX - minX;
        this.gridHeight  = maxY - minY;
        document.getElementById('gridWidth').value  = this.gridWidth;
        document.getElementById('gridHeight').value = this.gridHeight;
    }

    isCellUnlocked(x, y) {
        if (!this.unlockedCells) return true;
        return this.unlockedCells.has(`${x},${y}`);
    }

    // ========================================
    // PLACEMENT VALIDATION
    // ========================================
    canPlaceBuilding(x, y, width, height, excludeBuilding = null) {
        // When expansions define the playable area, validate against them
        if (this.unlockedCells) {
            for (let by = y; by < y + height; by++)
                for (let bx = x; bx < x + width; bx++)
                    if (!this.unlockedCells.has(`${bx},${by}`)) return false;
        } else {
            // No expansions: restrict to the default rectangular grid
            const minX = this.gridOffsetX, minY = this.gridOffsetY;
            if (x < minX || y < minY ||
                x + width  > minX + this.gridWidth ||
                y + height > minY + this.gridHeight) return false;
        }

        for (const b of this.buildings) {
            if (b === excludeBuilding) continue;
            if (!(x + width <= b.x || x >= b.x + b.width || y + height <= b.y || y >= b.y + b.height))
                return false;
        }

        for (let by = y; by < y + height; by++)
            for (let bx = x; bx < x + width; bx++)
                if (this.roads.has(`${bx},${by}`)) return false;

        return true;
    }

    isBuildingAt(x, y) {
        return this.buildings.some(b =>
            x >= b.x && x < b.x + b.width &&
            y >= b.y && y < b.y + b.height
        );
    }

    // ========================================
    // BUILDING OPERATIONS
    // ========================================
    placeBuilding(gridPos) {
        const { id, width, height, name, color, type, age, needsRoad = 1, boosts, prod } = this.selectedTemplate;
        if (this.canPlaceBuilding(gridPos.x, gridPos.y, width, height)) {
            const entry = { id, x: gridPos.x, y: gridPos.y, width, height, name, color, type, age, needsRoad };
            if (boosts && boosts.length > 0) entry.boosts = boosts;
            if (prod) entry.prod = prod;
            this.buildings.push(entry);

            // Townhall: exit placement after one (only one allowed)
            if (this.isTownhall(this.selectedTemplate)) {
                this.selectedTemplate = null;
                this._clearActiveBuildingBtn();
                this.hideModeBanner();
                this.updateStatus('Mode: Select/Move');
            }

            this.renderer.draw();
        }
    }

    placeRoad(gridPos) {
        const { x, y } = gridPos;
        if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) return;
        if (this.isCellUnlocked(x, y) && !this.isBuildingAt(x, y)) {
            this.roads.add(`${x},${y}`);
            this.renderer.draw();
        }
    }

    selectAtPosition(gridPos) {
        // Try selecting building
        const building = this.buildings.find(b =>
            gridPos.x >= b.x &&
            gridPos.x < b.x + b.width &&
            gridPos.y >= b.y &&
            gridPos.y < b.y + b.height
        );

        if (building) {
            this.selectedBuilding = building;
            this.selectedRoad = null;
            this.updateSelectionBanner();
            this.renderer.draw();
            return;
        }

        // Try selecting road
        const roadKey = `${gridPos.x},${gridPos.y}`;
        if (this.roads.has(roadKey)) {
            this.selectedBuilding = null;
            this.selectedRoad = roadKey;
            this.updateSelectionBanner();
            this.renderer.draw();
            return;
        }

        // Nothing selected
        this.selectedBuilding = null;
        this.selectedRoad = null;
        this.updateSelectionBanner();
        this.renderer.draw();
    }

    /** Returns true for town hall / main building types that must not be deleted or duplicated. */
    isTownhall(building) {
        return building.type === 'townhall' || building.type === 'main_building';
    }

    // ========================================
    // BUILDING POOL
    // ========================================
    moveToPool(building) {
        this.buildings = this.buildings.filter(b => b !== building);
        this.buildingPool.push(building);
        if (this.selectedBuilding === building) this.selectedBuilding = null;
        this.updateSelectionBanner();
        this.updatePoolPanel();
        this.renderer.draw();
    }

    updatePoolPanel() {
        const list = document.getElementById('poolList');
        const countEl = document.getElementById('poolCount');
        if (!list || !countEl) return;

        countEl.textContent = this.buildingPool.length;
        countEl.classList.toggle('has-items', this.buildingPool.length > 0);

        list.innerHTML = '';

        if (this.buildingPool.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'pool-empty';
            empty.textContent = 'No buildings here yet.\nDrag a building off the grid to store it.';
            list.appendChild(empty);
            return;
        }

        const sorted = this.buildingPool
            .map((building, idx) => ({ building, idx }))
            .sort((a, b) => {
                const areaA = a.building.width * a.building.height;
                const areaB = b.building.width * b.building.height;
                if (areaB !== areaA) return areaB - areaA; // larger first
                return a.building.name.localeCompare(b.building.name);
            });

        sorted.forEach(({ building, idx }) => {
            const item = document.createElement('div');
            item.className = 'pool-item';
            item.style.borderLeftColor = building.color || '#ccc';
            item.innerHTML = `
                <span class="pool-item-name" title="${building.name}">${building.name}</span>
                <span class="pool-item-size">${building.width}×${building.height}</span>
            `;
            item.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                this._startPoolDrag(e, building, idx);
            });
            list.appendChild(item);
        });
    }

    _startPoolDrag(e, building, poolIdx) {
        // Create ghost element that follows the cursor
        const ghost = document.createElement('div');
        ghost.className = 'pool-drag-ghost';
        ghost.textContent = building.name;
        ghost.style.background = building.color || '#ccc';
        document.body.appendChild(ghost);

        const move = (ev) => {
            ghost.style.left = (ev.clientX + 12) + 'px';
            ghost.style.top  = (ev.clientY + 12) + 'px';

            // Highlight canvas when hovering over it
            const rect = this.canvas.getBoundingClientRect();
            const overCanvas =
                ev.clientX >= rect.left && ev.clientX <= rect.right &&
                ev.clientY >= rect.top  && ev.clientY <= rect.bottom;
            this.canvas.classList.toggle('pool-drag-over', overCanvas);

            // Show hover preview on canvas
            if (overCanvas) {
                this.hoverPos = this.getGridCoords(ev.clientX, ev.clientY);
                this._poolDragTemplate = building;
            } else {
                this.hoverPos = null;
                this._poolDragTemplate = null;
            }
            this.renderer.draw();
        };

        const up = (ev) => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup',   up);
            ghost.remove();
            this.canvas.classList.remove('pool-drag-over');
            this.hoverPos = null;
            this._poolDragTemplate = null;

            const rect = this.canvas.getBoundingClientRect();
            const overCanvas =
                ev.clientX >= rect.left && ev.clientX <= rect.right &&
                ev.clientY >= rect.top  && ev.clientY <= rect.bottom;

            if (overCanvas) {
                const gridPos = this.getGridCoords(ev.clientX, ev.clientY);
                if (this.canPlaceBuilding(gridPos.x, gridPos.y, building.width, building.height)) {
                    // Place onto grid and remove from pool
                    this.buildingPool.splice(poolIdx, 1);
                    this.buildings.push({ ...building, x: gridPos.x, y: gridPos.y });
                    this.updatePoolPanel();
                    this.updateStatus(`Placed ${building.name}`);
                    setTimeout(() => this.updateStatus('Mode: Select/Move'), 1500);
                } else {
                    this.updateStatus('Cannot place building here — returned to pool');
                    setTimeout(() => this.updateStatus('Mode: Select/Move'), 2000);
                }
            }
            this.renderer.draw();
        };

        // Position ghost at cursor immediately
        ghost.style.left = (e.clientX + 12) + 'px';
        ghost.style.top  = (e.clientY + 12) + 'px';

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup',   up);
    }

    // ========================================
    // ZOOM & VIEW
    // ========================================
    zoomIn() {
        this.zoom = Math.min(CONSTANTS.MAX_ZOOM, this.zoom * CONSTANTS.ZOOM_STEP);
        this.updateStatus(`Zoom: ${Math.round(this.zoom * 100)}%`);
        this.renderer.draw();
    }

    zoomOut() {
        this.zoom = Math.max(CONSTANTS.MIN_ZOOM, this.zoom / CONSTANTS.ZOOM_STEP);
        this.updateStatus(`Zoom: ${Math.round(this.zoom * 100)}%`);
        this.renderer.draw();
    }

    resetView() {
        this.zoom = 1.0; this.panX = 0; this.panY = 0;
        this.updateStatus('View reset');
        this.renderer.draw();
    }

    /** Centre the entire grid (bounding box of all expansions) in the canvas viewport. */
    centreView() {
        const gridW = this.gridWidth  * this.cellSize * this.zoom;
        const gridH = this.gridHeight * this.cellSize * this.zoom;
        // panX/Y must account for the offset so the bounding box is centred
        this.panX = (this.canvas.width  - gridW) / 2 - this.gridOffsetX * this.cellSize * this.zoom;
        this.panY = (this.canvas.height - gridH) / 2 - this.gridOffsetY * this.cellSize * this.zoom;
    }

    // ========================================
    // GRID MANAGEMENT
    // ========================================
    resizeGrid() {
        this.gridWidth  = Utils.clamp(parseInt(document.getElementById('gridWidth').value),  CONSTANTS.MIN_GRID_SIZE, CONSTANTS.MAX_GRID_SIZE);
        this.gridHeight = Utils.clamp(parseInt(document.getElementById('gridHeight').value), CONSTANTS.MIN_GRID_SIZE, CONSTANTS.MAX_GRID_SIZE);
        this.resizeCanvas();
        this.renderer.draw();
    }

    addExpansion() {
        this.placingExpansion = true;
        this.placingRoad = false;
        this.placingWideRoad = false;
        this.selectedTemplate = null;
        this.selectedBuilding = null;
        this.selectedRoad = null;
        this._clearActiveBuildingBtn();
        this._setActiveToolBtn('addExpansionBtn');
        this.hoverPos = null;
        this.updateStatus('Expansion placement active');
        this.showModeBanner(`
            <strong>⬛ Expansion Placement Mode</strong><br>
            Click to place 4×4 expansion • Press ESC to exit
        `);
        this.renderer.draw();
    }

    /** Called on click while placingExpansion is active. */
    placeExpansionAt(gridPos) {
        const EXPANSION_SIZE = 4;
        // Snap to nearest 4-cell grid boundary
        const x = Math.floor(gridPos.x / EXPANSION_SIZE) * EXPANSION_SIZE;
        const y = Math.floor(gridPos.y / EXPANSION_SIZE) * EXPANSION_SIZE;

        // First expansion on an open grid: preserve the existing grid by tiling it into
        // 4×4 expansion blocks so buildings already placed stay accessible.
        if (this.unlockedAreas.length === 0) {
            const ox = this.gridOffsetX;
            const oy = this.gridOffsetY;
            for (let ty = oy; ty < oy + this.gridHeight; ty += EXPANSION_SIZE) {
                for (let tx = ox; tx < ox + this.gridWidth; tx += EXPANSION_SIZE) {
                    this.unlockedAreas.push({ x: tx, y: ty, width: EXPANSION_SIZE, length: EXPANSION_SIZE, manual: true });
                }
            }
        }

        // Don't place a duplicate at the same position
        if (this.unlockedAreas.some(a => a.x === x && a.y === y)) return;

        const nextIndex = this.unlockedAreas.length;
        this.unlockedAreas.push({ x, y, width: EXPANSION_SIZE, length: EXPANSION_SIZE, manual: true });
        this.rebuildUnlockedCells(); // also calls _recomputeGridBounds
        this.resizeCanvas();
        this.updateStatus(`Expansion #${nextIndex + 1} placed at (${x}, ${y})`);
        this.renderer.draw();
    }

    fitGridToContent() {
        if (this.buildings.length === 0) { alert('No buildings to fit to!'); return; }
        let maxX = 0, maxY = 0;
        this.buildings.forEach(b => { maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height); });
        this.gridWidth  = Math.max(CONSTANTS.MIN_GRID_SIZE, maxX + 2);
        this.gridHeight = Math.max(CONSTANTS.MIN_GRID_SIZE, maxY + 2);
        document.getElementById('gridWidth').value  = this.gridWidth;
        document.getElementById('gridHeight').value = this.gridHeight;
        this.resizeCanvas();
        this.renderer.draw();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width  = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.renderer.draw();
    }

    // ========================================
    // BUILDING LIST
    // ========================================
    updateBuildingList() {
        const ERA_ORDER = [
            'Stone Age', 'Bronze Age', 'Iron Age',
            'Early Middle Ages', 'High Middle Ages', 'Late Middle Ages',
            'Colonial Age', 'Industrial Age', 'Progressive Era',
            'Modern Era', 'Post-Modern Era', 'Contemporary Era',
            'Tomorrow Era', 'Future Era', 'Arctic Future', 'Oceanic Future',
            'Virtual Future', 'Space Age Mars', 'Space Age Asteroid Belt',
            'Space Age Venus', 'Space Age Titan', 'Space Age Jupiter Moon',
            'Space Age Space Hub', 'All Ages',
        ];

        const container = document.getElementById('buildingList');
        container.innerHTML = '';

        const isQI = this.activeCityType === 'quantum';
        const filtered = Object.entries(this.buildingTemplates)
            .filter(([, b]) => {
                if (this.isTownhall(b)) return false; // always auto-placed, never in list
                if (isQI) return b.age === 'Quantum Incursion' &&
                    b.name.toLowerCase().includes(this.searchTerm);
                return b.age !== 'Quantum Incursion' &&
                    (this.currentTab === 'all' || b.type === this.currentTab) &&
                    b.name.toLowerCase().includes(this.searchTerm);
            });

        // ── QI: type-based collapsible groups ─────────────────────────────
        if (isQI) {
            const QI_TYPE_ORDER = [
                ['residential', 'Residential'],
                ['production',  'Production'],
                ['goods',       'Goods'],
                ['culture',     'Culture'],
                ['military',    'Military'],
                ['main_building','Town Hall'],
                ['impediment',  'Impediments'],
            ];

            // Deduplicate impediments: keep only one entry per WxH size
            const seenImpedimentSizes = new Set();
            const qiFiltered = filtered.filter(([, b]) => {
                if (b.type !== 'impediment') return true;
                const sizeKey = `${b.width}x${b.height}`;
                if (seenImpedimentSizes.has(sizeKey)) return false;
                seenImpedimentSizes.add(sizeKey);
                return true;
            });

            const qiGroups = new Map(QI_TYPE_ORDER.map(([t]) => [t, []]));
            qiFiltered.forEach(entry => {
                const type = entry[1].type || 'culture';
                if (!qiGroups.has(type)) qiGroups.set(type, []);
                qiGroups.get(type).push(entry);
            });
            qiGroups.forEach(list => list.sort((a, b) => a[1].name.localeCompare(b[1].name)));

            QI_TYPE_ORDER.forEach(([type, label]) => {
                const list = qiGroups.get(type) || [];
                if (list.length === 0) return;
                const key = 'qi_' + type;
                const expanded = this.expandedEras.has(key);
                const header = document.createElement('div');
                header.className = 'age-group-header' + (expanded ? ' expanded' : '');
                header.innerHTML =
                    `<span class="age-group-arrow">${expanded ? '▼' : '▶'}</span>` +
                    `${label}<span class="age-group-count">(${list.length})</span>`;
                header.addEventListener('click', () => {
                    if (this.expandedEras.has(key)) this.expandedEras.delete(key);
                    else this.expandedEras.add(key);
                    this.updateBuildingList();
                });
                container.appendChild(header);
                if (expanded) {
                    list.forEach(([id, building]) => container.appendChild(this._buildingBtn(id, building)));
                }
            });
            return;
        }

        // ── Searching: flat sorted list, no era grouping ──────────────────
        if (this.searchTerm) {
            filtered.sort((a, b) => a[1].name.localeCompare(b[1].name));
            filtered.forEach(([id, building]) => container.appendChild(this._buildingBtn(id, building)));
            return;
        }

        // ── No search: collapsible era groups ─────────────────────────────
        const groups = new Map(ERA_ORDER.map(era => [era, []]));
        filtered.forEach(entry => {
            const age = entry[1].age || 'All Ages';
            if (!groups.has(age)) groups.set(age, []);
            groups.get(age).push(entry);
        });
        groups.forEach(list => list.sort((a, b) => a[1].name.localeCompare(b[1].name)));

        groups.forEach((list, era) => {
            if (list.length === 0) return;
            const expanded = this.expandedEras.has(era);

            const header = document.createElement('div');
            header.className = 'age-group-header' + (expanded ? ' expanded' : '');
            header.innerHTML =
                `<span class="age-group-arrow">${expanded ? '▼' : '▶'}</span>` +
                `${era}<span class="age-group-count">(${list.length})</span>`;
            header.addEventListener('click', () => {
                if (this.expandedEras.has(era)) this.expandedEras.delete(era);
                else this.expandedEras.add(era);
                this.updateBuildingList();
            });
            container.appendChild(header);

            if (expanded) {
                list.forEach(([id, building]) => container.appendChild(this._buildingBtn(id, building)));
            }
        });
    }

    _buildingBtn(id, building) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn._templateId = id;
        btn.innerHTML = `<span>${building.name}</span><span class="building-size">${building.width}×${building.height}</span>`;
        btn.style.borderLeft = `5px solid ${building.color}`;

        // Townhall: disable if one already exists on canvas or in pool
        const isTH = this.isTownhall(building);
        if (isTH) {
            const alreadyExists =
                this.buildings.some(b => this.isTownhall(b)) ||
                this.buildingPool.some(b => this.isTownhall(b));
            if (alreadyExists) {
                btn.disabled = true;
                btn.title = 'Town hall already placed';
                return btn;
            }
        }

        btn.addEventListener('click', () => {
            this.enterBuildingPlacement({ ...building, id });
        });
        return btn;
    }

    handleAddBuilding(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const id = 'custom_' + Date.now();
        this.buildingTemplates[id] = {
            name:   fd.get('name'),
            width:  parseInt(fd.get('width')),
            height: parseInt(fd.get('height')),
            age:    fd.get('age') || 'Custom',
            type:   fd.get('type'),
            color:  fd.get('color'),
        };
        this.updateBuildingList();
        this.hideModal('addBuildingModal');
        e.target.reset();
    }

    // ========================================
    // EFFICIENCY RATING IMPORT
    // ========================================

    /**
     * Read a column value from an Efficiency Rating row, trying multiple
     * language-variant column names (FoE Helper is partially localized).
     */
    _readEffCol(row, variants) {
        for (const v of variants) {
            if (v in row) return row[v] || 0;
        }
        return 0;
    }

    /**
     * Parse the Items text field, e.g.:
     *   "Ø 10.5x 🧩 Speciális termelés befejezéseØ 10.5x 🧩 Árucikktermelés befejezése"
     * Returns array of { qty: number, name: string }.
     */
    _parseItemsText(text) {
        if (!text || typeof text !== 'string') return [];
        const items = [];
        // Split on "Ø" separator, each segment is like "10.5x 🧩 Name"
        for (const seg of text.split('Ø')) {
            const m = seg.trim().match(/^([\d.]+)\s*x\s*(.+)$/);
            if (m) items.push({ qty: parseFloat(m[1]), name: m[2].trim() });
        }
        return items;
    }

    /**
     * Import a FoE Helper Efficiency Rating JSON export.
     * perTile: if true (default), column values are per-tile and are multiplied
     * by the building's tile area to get absolute values.
     * Also updates buildingTemplates with extracted data so manually placed
     * copies of matched buildings carry the same stats.
     */
    importEfficiencyRating(rows, perTile = true) {
        if (!Array.isArray(rows)) { alert('Expected a JSON array.'); return; }

        // Column variants for multi-language support (Hungarian, English, German)
        const C = {
            building:   r => String(this._readEffCol(r, ['Building', 'Gebäude', 'Bâtiment']) || '').trim(),
            count:      r => Math.max(1, parseInt(r['#']) || 1),
            fp:         r => this._readEffCol(r, ['Forge Pontok', 'Forge Points', 'Forge Punkte', 'Points forge']),
            treasury:   r => this._readEffCol(r, ['Treasury Goods', 'Schatzgüter', 'Biens du trésor']),
            population: r => this._readEffCol(r, ['Lakolsság', 'Residents', 'Inhabitants', 'Einwohner', 'Bevölkerung', 'Habitants', 'Population']),
            att:        r => this._readEffCol(r, ['Attack boost att. army', 'Angriff Angreifer', 'Attaque attaquant']),
            gbg:        r => this._readEffCol(r, ['Guild Battlegrounds', 'Gildenschlachtfeld']),
            fragments:  r => this._readEffCol(r, ['Finish Special Production Fragment', 'Sonderproduktion abschließen']),
            ap:         r => this._readEffCol(r, ['Action Points', 'Aktionspunkte']),
            coins:      r => this._readEffCol(r, ['Start coins', 'Münzen', 'Pièces']),
            coinBoost:  r => this._readEffCol(r, ['Coin boosts', 'Münzen-Boost']),
            supplies:   r => this._readEffCol(r, ['Start supplies', 'Vorräte', 'Provisions']),
            supplyBoost:r => this._readEffCol(r, ['Supply boosts', 'Vorräte-Boost']),
            items:      r => this._readEffCol(r, ['Items']),
        };

        // Build name → [[id, template]] lookup
        const nameMap = new Map();
        for (const [id, t] of Object.entries(this.buildingTemplates)) {
            const key = t.name.trim().toLowerCase();
            if (!nameMap.has(key)) nameMap.set(key, []);
            nameMap.get(key).push([id, t]);
        }

        const matched   = [];
        const unmatched = [];

        for (const row of rows) {
            if (typeof row.Score !== 'number') continue; // footer row

            const rawName  = C.building(row);
            // Fallback: strip level suffix e.g. " – 2. szint", " - Level 5"
            const baseName = rawName.replace(/\s*[-–]\s*(\d+\.\s*szint|level\s*\d+)\s*$/i, '').trim();
            const count    = C.count(row);

            let candidates = nameMap.get(rawName.toLowerCase())
                          || nameMap.get(baseName.toLowerCase())
                          || null;

            if (!candidates || candidates.length === 0) {
                unmatched.push({ name: rawName, count });
                continue;
            }

            const [id, template] = candidates.find(([, t]) =>
                t.name.trim().toLowerCase() === rawName.toLowerCase()
            ) || candidates[0];

            // ── Extract & scale stats ──────────────────────────────────────
            const area = perTile ? (template.width * template.height) : 1;

            const fp          = C.fp(row)          * area;
            const treasury    = C.treasury(row)    * area;
            const population  = C.population(row)  * area;
            const coins       = C.coins(row)        * area;
            const supplies    = C.supplies(row)     * area;
            const fragments   = C.fragments(row)    * area;
            const ap          = C.ap(row)            * area;
            const att         = C.att(row)           * area;
            const gbg         = C.gbg(row)           * area;
            const coinBoost   = C.coinBoost(row)     * area;
            const supplyBoost = C.supplyBoost(row)   * area;
            const items       = this._parseItemsText(C.items(row));

            // Scaled items: multiply per-tile item counts by area
            const scaledItems = perTile
                ? items.map(it => ({ qty: Math.round(it.qty * area * 10) / 10, name: it.name }))
                : items;

            // Build efficiencyStats object (only include non-zero values)
            const effStats = {};
            const round1 = v => Math.round(v * 10) / 10;
            if (fp)        effStats.strategy_points_24h  = round1(fp);
            if (treasury)  effStats.clan_goods_24h       = round1(treasury);
            if (population) effStats.population          = round1(population);
            if (coins)     effStats.money_24h            = round1(coins);
            if (supplies)  effStats.supplies_24h         = round1(supplies);
            if (fragments) effStats.finish_special_production_24h = round1(fragments);
            if (ap)        effStats.action_points_24h    = round1(ap);

            const boosts = [];
            if (att)         boosts.push({ type: 'att_boost_attacker',     feature: 'all',          value: round1(att) });
            if (gbg)         boosts.push({ type: 'att_def_boost_attacker', feature: 'battleground',  value: round1(gbg) });
            if (coinBoost)   boosts.push({ type: 'coin_boost',             feature: 'all',          value: round1(coinBoost) });
            if (supplyBoost) boosts.push({ type: 'supply_boost',           feature: 'all',          value: round1(supplyBoost) });

            const hasStats = Object.keys(effStats).length > 0;
            const hasBoosts = boosts.length > 0;

            // Update the template so manually placed copies also carry these stats
            if (hasStats)  this.buildingTemplates[id].efficiencyStats = effStats;
            if (hasBoosts) this.buildingTemplates[id].boosts          = boosts;
            if (scaledItems.length > 0) this.buildingTemplates[id].items = scaledItems;

            matched.push({ id, template, count, name: rawName, effStats, boosts, items: scaledItems });

            for (let i = 0; i < count; i++) {
                const entry = {
                    id,
                    name:      template.name,
                    width:     template.width,
                    height:    template.height,
                    type:      template.type,
                    color:     template.color,
                    age:       template.age,
                    needsRoad: template.needsRoad ?? 1,
                };
                if (hasStats)        entry.efficiencyStats = effStats;
                if (hasBoosts)       entry.boosts          = boosts;
                if (scaledItems.length > 0) entry.items    = scaledItems;
                this.buildingPool.push(entry);
            }
        }

        this.updatePoolPanel();
        this.updateBuildingList(); // refresh palette so template changes take effect

        // ── Build result modal ─────────────────────────────────────────────
        const fmtStats = es => {
            if (!es || !Object.keys(es).length) return '';
            const lines = [];
            const L = {
                strategy_points_24h: '🔷 FP', clan_goods_24h: '🏰 Treasury',
                population: '👥 Pop', money_24h: '🪙 Coins', supplies_24h: '⚙️ Supplies',
                finish_special_production_24h: '🧩 Fragments', action_points_24h: '🎯 AP',
            };
            for (const [k, v] of Object.entries(es)) {
                lines.push(`${L[k] || k}: ${v}`);
            }
            return `<span class="eff-stat-preview">${lines.join(' · ')}</span>`;
        };

        const matchedRows = matched.map(m =>
            `<tr>
                <td>${m.name}</td>
                <td style="text-align:center">${m.count}</td>
                <td>${fmtStats(m.effStats)}${m.boosts.map(b => `<span class="eff-boost-preview">⚔️${b.value}%</span>`).join('')}</td>
            </tr>`
        ).join('');
        const unmatchedRows = unmatched.map(u =>
            `<tr style="color:#c44"><td>${u.name}</td><td style="text-align:center">${u.count}</td><td>—</td></tr>`
        ).join('');

        const totalAdded = matched.reduce((s, m) => s + m.count, 0);
        document.getElementById('efficiencyImportBody').innerHTML = `
            <p>Added <strong>${totalAdded}</strong> buildings to the pool
               (${matched.length} types matched)${perTile ? ' — values scaled by tile area' : ''}.</p>
            ${matchedRows ? `
            <details open>
                <summary style="cursor:pointer;font-weight:bold;margin-bottom:6px">
                    ✅ Matched (${matched.length})
                </summary>
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead><tr>
                        <th style="text-align:left">Building</th>
                        <th>#</th>
                        <th style="text-align:left">Stats</th>
                    </tr></thead>
                    <tbody>${matchedRows}</tbody>
                </table>
            </details>` : ''}
            ${unmatchedRows ? `
            <details ${matched.length === 0 ? 'open' : ''}>
                <summary style="cursor:pointer;font-weight:bold;margin:6px 0;color:#c44">
                    ⚠️ Not found in database (${unmatched.length})
                </summary>
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead><tr><th style="text-align:left">Building</th><th>#</th><th></th></tr></thead>
                    <tbody>${unmatchedRows}</tbody>
                </table>
            </details>` : ''}
        `;
        this.showModal('efficiencyImportModal');
    }

    // ========================================
    // SAVE / LOAD
    // ========================================
    saveLayout() {
        // Persist the active city first so it's included in the snapshot
        this.cities[this.activeCityType] = this.getSnapshot();

        const data = {
            version:        '6.1',
            activeCityType: this.activeCityType,
            cities:         this.cities,
            customBuildings: Object.fromEntries(
                Object.entries(this.buildingTemplates).filter(([id]) => id.startsWith('custom_'))
            ),
        };
        document.getElementById('modalTitle').textContent       = 'Save Layout';
        document.getElementById('modalInstructions').textContent = 'Copy this JSON to save your layout:';
        document.getElementById('saveLoadText').value           = JSON.stringify(data, null, 2);
        document.getElementById('copyBtn').style.display        = 'inline-block';
        document.getElementById('loadConfirmBtn').style.display = 'none';
        this.showModal('saveLoadModal');
    }

    /** Render the city grid to an offscreen canvas and return it. */
    _renderCityCanvas(scale = 2) {
        const cellPx  = this.cellSize * scale;
        const canvasW = this.gridWidth  * cellPx;
        const canvasH = this.gridHeight * cellPx;

        const offscreen = document.createElement('canvas');
        offscreen.width  = canvasW;
        offscreen.height = canvasH;
        const octx = offscreen.getContext('2d');

        // White background
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, canvasW, canvasH);

        // Offset so negative-coord expansions are visible
        octx.translate(-this.gridOffsetX * cellPx, -this.gridOffsetY * cellPx);

        // Shade locked cells
        if (this.unlockedCells) {
            octx.fillStyle = 'rgba(40,40,40,0.45)';
            for (let cy = this.gridOffsetY; cy < this.gridOffsetY + this.gridHeight; cy++)
                for (let cx = this.gridOffsetX; cx < this.gridOffsetX + this.gridWidth; cx++)
                    if (!this.unlockedCells.has(`${cx},${cy}`))
                        octx.fillRect(cx * cellPx, cy * cellPx, cellPx, cellPx);
        }

        // Grid lines
        octx.strokeStyle = this.unlockedCells ? 'rgba(180,180,180,0.4)' : '#d0d0d0';
        octx.lineWidth = 1;
        for (let i = this.gridOffsetX; i <= this.gridOffsetX + this.gridWidth; i++) {
            octx.beginPath();
            octx.moveTo(i * cellPx, this.gridOffsetY * cellPx);
            octx.lineTo(i * cellPx, (this.gridOffsetY + this.gridHeight) * cellPx);
            octx.stroke();
        }
        for (let i = this.gridOffsetY; i <= this.gridOffsetY + this.gridHeight; i++) {
            octx.beginPath();
            octx.moveTo(this.gridOffsetX * cellPx, i * cellPx);
            octx.lineTo((this.gridOffsetX + this.gridWidth) * cellPx, i * cellPx);
            octx.stroke();
        }

        // Roads
        for (const roadKey of this.roads) {
            const [rx, ry] = roadKey.split(',').map(Number);
            octx.fillStyle = '#808080';
            octx.fillRect(rx * cellPx, ry * cellPx, cellPx, cellPx);
            octx.strokeStyle = '#555';
            octx.lineWidth = 1;
            octx.strokeRect(rx * cellPx, ry * cellPx, cellPx, cellPx);
        }

        // Buildings
        for (const b of this.buildings) {
            const bx = b.x * cellPx, by = b.y * cellPx;
            const bw = b.width * cellPx, bh = b.height * cellPx;
            octx.fillStyle = b.color || '#aaa';
            octx.fillRect(bx, by, bw, bh);
            octx.strokeStyle = 'rgba(0,0,0,0.4)';
            octx.lineWidth = 1;
            octx.strokeRect(bx, by, bw, bh);

            const pad = 3;
            const maxW = bw - pad * 2;
            const maxH = bh - pad * 2;
            if (maxW < 4 || maxH < 4 || !b.name) continue;

            let fontSize = Math.min(cellPx * 0.30, 11 * scale);
            const minFont = 5 * scale;
            octx.textAlign = 'center';
            octx.textBaseline = 'top';

            const words = b.name.split(' ');
            let lines, lineH;
            for (; fontSize >= minFont; fontSize -= scale) {
                octx.font = `bold ${fontSize}px Arial`;
                lineH = fontSize * 1.15;
                lines = [];
                let cur = words[0];
                for (let i = 1; i < words.length; i++) {
                    const test = cur + ' ' + words[i];
                    if (octx.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; }
                    else cur = test;
                }
                lines.push(cur);
                if (lines.length * lineH <= maxH && Math.max(...lines.map(l => octx.measureText(l).width)) <= maxW) break;
            }

            const totalH = lines.length * lineH;
            let startY = by + bh / 2 - totalH / 2 + lineH * 0.15;
            octx.fillStyle = '#000';
            octx.save();
            octx.beginPath();
            octx.rect(bx + pad, by + pad, maxW, maxH);
            octx.clip();
            for (const line of lines) { octx.fillText(line, bx + bw / 2, startY); startY += lineH; }
            octx.restore();
        }

        return offscreen;
    }

    exportPNG() {
        const dateStr = new Date().toISOString().slice(0, 10);
        const canvas = this._renderCityCanvas(3); // 3× for sharp PNG
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `foe-city-${this.activeCityType}-${dateStr}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    exportPDF() {
        // jsPDF is loaded as a UMD global from CDN
        const { jsPDF } = window.jspdf;
        if (!jsPDF) { alert('PDF library not loaded yet — please try again in a moment.'); return; }

        const CITY_LABELS = {
            main: 'Main City', settlement: 'Cultural Settlement',
            colony: 'Colony', quantum: 'Quantum Incursion',
        };

        // ── 1. Render the city to a temporary hi-res canvas ──────────────────
        const SCALE = 2;
        const offscreen = this._renderCityCanvas(SCALE);
        const { width: canvasW, height: canvasH } = offscreen;
        const imgData = offscreen.toDataURL('image/png');

        // ── 2. Build PDF ──────────────────────────────────────────────────────
        const PDF_W = 297; // A4 landscape width mm
        const PDF_H = 210; // A4 landscape height mm
        const MARGIN = 10;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Title
        const cityLabel = CITY_LABELS[this.activeCityType] || this.activeCityType;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`FoE City Planner — ${cityLabel}`, MARGIN, MARGIN + 5);

        // Subtitle: building count
        const totalBuildings = this.buildings.length;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${totalBuildings} building${totalBuildings !== 1 ? 's' : ''} placed  ·  Grid ${this.gridWidth}×${this.gridHeight}`, MARGIN, MARGIN + 11);

        // ── 3. City image — fit in left ~60% of page ─────────────────────────
        const IMG_AREA_W = PDF_W * 0.58 - MARGIN;
        const IMG_AREA_H = PDF_H - MARGIN * 2 - 18;
        const imgAspect  = canvasW / canvasH;
        let imgW = IMG_AREA_W, imgH = IMG_AREA_W / imgAspect;
        if (imgH > IMG_AREA_H) { imgH = IMG_AREA_H; imgW = IMG_AREA_H * imgAspect; }
        const imgX = MARGIN, imgY = MARGIN + 16;
        doc.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

        // ── 4. Building legend table — right side ─────────────────────────────
        const TABLE_X   = MARGIN + IMG_AREA_W + 8;
        const TABLE_W   = PDF_W - TABLE_X - MARGIN;
        const ROW_H     = 5.5;
        const COL_COLOR = 6;
        const COL_NAME  = TABLE_W - COL_COLOR - 20;
        const COL_SIZE  = 12;
        const COL_QTY   = 8;
        let ty          = imgY;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Building', TABLE_X + COL_COLOR + 1, ty + 3.5);
        doc.text('Size', TABLE_X + COL_COLOR + COL_NAME + 1, ty + 3.5);
        doc.text('Qty', TABLE_X + COL_COLOR + COL_NAME + COL_SIZE + 1, ty + 3.5);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(TABLE_X, ty + ROW_H, TABLE_X + TABLE_W, ty + ROW_H);
        ty += ROW_H + 1;

        // Count duplicates
        const counts = {};
        for (const b of this.buildings) {
            const key = `${b.id}||${b.name}||${b.width}x${b.height}||${b.color || '#aaa'}`;
            counts[key] = (counts[key] || 0) + 1;
        }

        // Sort: type then name
        const TYPE_ORDER = ['townhall', 'main_building', 'residential', 'production', 'goods', 'culture', 'military', 'great_building', 'event', 'impediment'];
        const rows = Object.entries(counts)
            .map(([key, qty]) => { const [id, name, size, color] = key.split('||'); return { id, name, size, color, qty }; })
            .sort((a, b) => {
                const ta = TYPE_ORDER.indexOf(this.buildings.find(x => x.id === a.id)?.type || '') ?? 99;
                const tb = TYPE_ORDER.indexOf(this.buildings.find(x => x.id === b.id)?.type || '') ?? 99;
                return ta !== tb ? ta - tb : a.name.localeCompare(b.name);
            });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const MAX_TABLE_Y = PDF_H - MARGIN - 2;
        for (const row of rows) {
            if (ty + ROW_H > MAX_TABLE_Y) break; // clip if too many rows

            // Color swatch
            const [r, g, b_] = row.color.match(/\w\w/g).map(h => parseInt(h, 16));
            doc.setFillColor(r, g, b_);
            doc.rect(TABLE_X, ty + 0.5, COL_COLOR - 1, ROW_H - 1, 'F');
            doc.setDrawColor(160, 160, 160);
            doc.setLineWidth(0.2);
            doc.rect(TABLE_X, ty + 0.5, COL_COLOR - 1, ROW_H - 1, 'S');

            // Name (searchable text)
            doc.setTextColor(0, 0, 0);
            const maxChars = Math.floor(COL_NAME / 1.7);
            const label = row.name.length > maxChars ? row.name.slice(0, maxChars - 1) + '…' : row.name;
            doc.text(label, TABLE_X + COL_COLOR + 1, ty + 3.5);

            // Size
            doc.text(row.size, TABLE_X + COL_COLOR + COL_NAME + 1, ty + 3.5);

            // Qty
            doc.text(String(row.qty), TABLE_X + COL_COLOR + COL_NAME + COL_SIZE + 1, ty + 3.5);

            ty += ROW_H;
        }

        // ── 5. Production Overview — page 2 ──────────────────────────────────
        doc.addPage('a4', 'portrait');
        const P2_W = 210, P2_H = 297, PM = 12;
        const { totals, buildingCounts } = this.productionOverview.calculate();
        const militarySums = this.productionOverview._calculateMilitary();

        // helpers
        const fmt = n => Math.round(n || 0).toLocaleString();
        const stripEmoji = s => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]\s*/gu, '').trim();

        let py = PM + 6;

        // Page title
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Production Overview — ${cityLabel}`, PM, py);
        py += 8;

        // ── Population & Happiness ──────────────────────────────────────────
        const population      = totals.population      || 0;
        const demandHappiness = totals.demandHappiness || 0;
        const happiness       = totals.happiness       || 0;
        const happBalance     = happiness - demandHappiness;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Population & Happiness', PM, py);
        py += 5;

        const POP_ROWS = [
            ['Population',        fmt(population)],
            ['Happiness provided',fmt(happiness)],
            ['Happiness demand',  fmt(demandHappiness)],
            ['Balance',           (happBalance >= 0 ? '+' : '') + fmt(happBalance)],
        ];
        const COL2_X = P2_W / 2 + PM / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        for (const [label, val] of POP_ROWS) {
            doc.text(label, PM + 2, py);
            doc.text(val,   PM + 55, py, { align: 'right' });
            py += 4.5;
        }
        py += 3;

        // ── Building counts ─────────────────────────────────────────────────
        const TYPE_LABELS_PDF = {
            residential: 'Residential', production: 'Production', goods: 'Goods',
            culture: 'Culture', military: 'Military', great: 'Great Buildings',
            event: 'Events', townhall: 'Town Hall', main_building: 'Town Hall',
            impediment: 'Impediment', unknown: 'Other',
        };
        const countEntries = Object.entries(buildingCounts).sort((a, b) => b[1] - a[1]);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Building Counts', COL2_X, PM + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let cy2 = PM + 19;
        for (const [type, count] of countEntries) {
            doc.text(TYPE_LABELS_PDF[type] || type, COL2_X + 2, cy2);
            doc.text(String(count), COL2_X + 50, cy2, { align: 'right' });
            cy2 += 4.5;
        }

        // ── Divider ─────────────────────────────────────────────────────────
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(PM, py, P2_W - PM, py);
        py += 4;

        // ── Resources ───────────────────────────────────────────────────────
        const TIMERS_ORDERED_PDF = ['5m', '15m', '1h', '4h', '8h', '10h', '24h'];
        const TIMER_LABELS_PDF   = { '5m':'5m', '15m':'15m', '1h':'1h', '4h':'4h', '8h':'8h', '10h':'10h', '24h':'24h' };

        function parseKey(key) {
            for (const t of TIMERS_ORDERED_PDF)
                if (key.endsWith('_' + t)) return { resource: key.slice(0, -(t.length+1)), timer: t };
            return { resource: key, timer: null };
        }

        const SKIP = new Set(['population', 'demandHappiness', 'happiness']);
        const groups = {};
        for (const [key, val] of Object.entries(totals)) {
            if (SKIP.has(key) || !val) continue;
            const { resource, timer } = parseKey(key);
            if (!groups[resource]) groups[resource] = {};
            groups[resource][timer || '24h'] = (groups[resource][timer || '24h'] || 0) + val;
        }

        const RESOURCE_LABELS_PDF = {
            money:'Coins', supplies:'Supplies', strategy_points:'Forge Points',
            medals:'Medals', premium:'Diamonds', goods:'Goods',
            clan_goods:'Guild Goods', diplomacy_currency:'Diplomacy Goods',
            guild_raids_population:'QI Population', guild_raids_happiness:'QI Happiness',
            guild_raids_money:'QI Coins', guild_raids_supplies:'QI Supplies',
            guild_raids_chrono_alloy:'Chrono Alloy', guild_raids_honey:'Honey',
            guild_raids_bronze:'Bronze', guild_raids_brick:'Brick', guild_raids_rope:'Rope',
            guild_raids_ebony:'Ebony', guild_raids_gems:'Gems', guild_raids_lead:'Lead',
            guild_raids_limestone:'Limestone', guild_raids_cloth:'Cloth',
            guild_raids_gunpowder:'Gunpowder', guild_raids_actions:'QI Actions',
        };
        const resLabel = r => RESOURCE_LABELS_PDF[r] || r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

        const sortedRes = Object.keys(groups).sort((a, b) => {
            const ORDER = ['money','supplies','strategy_points','medals','premium','goods','clan_goods','diplomacy_currency'];
            const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1; if (ib !== -1) return 1;
            return a.localeCompare(b);
        });

        if (sortedRes.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Production', PM, py);
            py += 5;

            // Multi-column grid: 3 columns
            const RES_COLS = 3;
            const RES_COL_W = (P2_W - PM * 2) / RES_COLS;
            let resCol = 0, resColY = py;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);

            for (const res of sortedRes) {
                const timerMap = groups[res];
                const timers = TIMERS_ORDERED_PDF.filter(t => timerMap[t]);
                if (!timers.length) continue;

                const blockX = PM + resCol * RES_COL_W;
                let blockY = resColY;

                // Resource label
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text(resLabel(res), blockX, blockY);
                blockY += 4;

                doc.setFont('helvetica', 'normal');
                for (const t of timers) {
                    doc.text(`${TIMER_LABELS_PDF[t]}:`, blockX + 2, blockY);
                    doc.text(fmt(timerMap[t]), blockX + RES_COL_W - 4, blockY, { align: 'right' });
                    blockY += 3.8;
                }
                blockY += 2;

                // Advance column
                resColY = Math.max(resColY, blockY);
                resCol++;
                if (resCol >= RES_COLS) {
                    resCol = 0;
                    py = resColY;
                    resColY = py;
                }
            }
            py = Math.max(py, resColY) + 4;
        }

        // ── Military boosts ─────────────────────────────────────────────────
        if (Object.keys(militarySums).length > 0) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(PM, py, P2_W - PM, py);
            py += 5;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Military Bonuses', PM, py);
            py += 5;

            const BOOST_LABELS_PDF = {
                att_boost_attacker:              'Attack (Attacker)',
                att_boost_defender:              'Attack (Defender)',
                def_boost_attacker:              'Defense (Attacker)',
                def_boost_defender:              'Defense (Defender)',
                att_def_boost_attacker:          'Att+Def (Attacker)',
                att_def_boost_defender:          'Att+Def (Defender)',
                att_def_boost_attacker_defender: 'Att+Def (Both)',
            };
            const FEAT_LABELS_PDF = { all:'',' battleground':' [PvP]', guild_expedition:' [GE]', guild_raids:' [GR]' };

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const MIL_COLS = 3, MIL_COL_W = (P2_W - PM * 2) / MIL_COLS;
            let mc = 0, milColY = py;
            for (const [key, val] of Object.entries(militarySums).sort(([a],[b])=>a.localeCompare(b))) {
                const [type, feature] = key.split('|');
                const boostLabel = BOOST_LABELS_PDF[type] || type;
                const featLabel  = FEAT_LABELS_PDF[feature] ?? ` [${feature}]`;
                const bx = PM + mc * MIL_COL_W;
                doc.text(`${boostLabel}${featLabel}`, bx, milColY);
                doc.text(`+${val}%`, bx + MIL_COL_W - 4, milColY, { align: 'right' });
                milColY += 4.5;
                mc++;
                if (mc >= MIL_COLS) { mc = 0; py = milColY; }
            }
            py = Math.max(py, milColY);
        }

        // ── 6. Save ───────────────────────────────────────────────────────────
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`foe-city-${this.activeCityType}-${dateStr}.pdf`);
        this.updateStatus('PDF exported');
    }

    showLoadModal() {
        document.getElementById('modalTitle').textContent       = 'Load Layout';
        document.getElementById('modalInstructions').textContent = 'Paste your saved JSON here:';
        document.getElementById('saveLoadText').value           = '';
        document.getElementById('copyBtn').style.display        = 'none';
        document.getElementById('loadConfirmBtn').style.display = 'inline-block';
        this.showModal('saveLoadModal');
    }

    showModeBanner(text) {
        const banner = document.getElementById('modeBanner');
        banner.innerHTML = text;
        banner.classList.remove('hidden');
        banner.classList.add('visible');
    }

    updateSelectionBanner() {
        // Active placement modes override selection
        if (this.placingRoad || this.selectedTemplate || this.placingExpansion) return;

        if (this.selectedBuilding) {
            const deleteHint = this.isTownhall(this.selectedBuilding)
                ? 'Press DELETE to stash to pool'
                : 'Press DELETE to remove';
            this.showModeBanner(`
                <strong>🏢 Building Selected</strong><br>
                ${deleteHint}
            `);
            return;
        }

        if (this.selectedRoad) {
            this.showModeBanner(`
                <strong>🛣 Road Selected</strong><br>
                Press DELETE to remove
            `);
            return;
        }

        this.hideModeBanner();
    }

    hideModeBanner() {
        const banner = document.getElementById('modeBanner');
        banner.classList.remove('visible');
        banner.classList.add('hidden');
    }

    loadLayout() {
        try {
            const data = JSON.parse(document.getElementById('saveLoadText').value);
            if (data.customBuildings) Object.assign(this.buildingTemplates, data.customBuildings);

            if (data.cities) {
                // New multi-city format (v6.1+)
                this.cities = { main: null, settlement: null, colony: null, quantum: null, ...data.cities };
                this.activeCityType = data.activeCityType || 'main';
            } else {
                // Legacy single-city format — load into main city slot
                this.cities = { main: null, settlement: null, colony: null, quantum: null };
                this.activeCityType = 'main';
                this.cities.main = {
                    buildings:     data.buildings     || [],
                    roads:         data.roads         || [],
                    unlockedAreas: data.unlockedAreas || [],
                    buildingPool:  data.buildingPool  || [],
                    gridWidth:     data.gridWidth     || CONSTANTS.DEFAULT_GRID_SIZE,
                    gridHeight:    data.gridHeight    || CONSTANTS.DEFAULT_GRID_SIZE,
                    cityMetadata:  data.cityMetadata  || null,
                };
            }

            this.restoreSnapshot(this.cities[this.activeCityType]);
            this.updateCityTabs();
            this.hideModal('saveLoadModal');
            alert('Layout loaded successfully!');
        } catch (e) {
            alert('Error loading layout: ' + e.message);
        }
    }

    copyToClipboard() {
        const text = document.getElementById('saveLoadText');
        text.select();
        document.execCommand('copy');
        alert('Copied to clipboard!');
    }

    clearAll() {
        if (!confirm('Clear all buildings and roads?')) return;
        this.buildings   = [];
        this.roads       = new Set();
        this.wideRoads   = new Set();
        this.buildingPool = [];
        this.cityMetadata = null;
        document.getElementById('cityInfo').style.display     = 'none';
        document.getElementById('undoOptimizeBtn').style.display = 'none';
        this.optimizer._snapshot = null;
        this.updatePoolPanel();
        this.renderer.draw();
        this.updateCityTabs();
    }

    // ========================================
    // MULTI-CITY SUPPORT
    // ========================================

    /** Capture current city state into a plain serialisable object. */
    getSnapshot() {
        return {
            buildings:     JSON.parse(JSON.stringify(this.buildings)),
            roads:         Array.from(this.roads),
            wideRoads:     Array.from(this.wideRoads),
            unlockedAreas: JSON.parse(JSON.stringify(this.unlockedAreas)),
            buildingPool:  JSON.parse(JSON.stringify(this.buildingPool)),
            gridWidth:     this.gridWidth,
            gridHeight:    this.gridHeight,
            cityMetadata:  this.cityMetadata ? { ...this.cityMetadata } : null,
        };
    }

    /** Restore city state from a snapshot (or reset to empty if snap is null). */
    restoreSnapshot(snap) {
        if (snap) {
            this.buildings     = snap.buildings     || [];
            this.roads         = new Set(snap.roads || []);
            this.wideRoads     = new Set(snap.wideRoads || []);
            this.unlockedAreas = snap.unlockedAreas || [];
            this.buildingPool  = snap.buildingPool  || [];
            this.cityMetadata  = snap.cityMetadata  || null;
            this.gridWidth     = snap.gridWidth     || CONSTANTS.DEFAULT_GRID_SIZE;
            this.gridHeight    = snap.gridHeight    || CONSTANTS.DEFAULT_GRID_SIZE;
            this.gridOffsetX   = 0;
            this.gridOffsetY   = 0;
            // Ensure a townhall is always present (handles saves predating this feature)
            if (!this.buildings.some(b => this.isTownhall(b)) &&
                !this.buildingPool.some(b => this.isTownhall(b))) {
                this._placeDefaultTownhall();
            }
        } else {
            this._initEmptyCityState();
        }
        this.rebuildUnlockedCells();
        document.getElementById('gridWidth').value  = this.gridWidth;
        document.getElementById('gridHeight').value = this.gridHeight;
        this.resizeCanvas();
        this.centreView();
        this.updateBuildingList();
        this.updatePoolPanel();
        if (this.cityMetadata) {
            this.importer.updateCityInfoPanel();
        } else {
            document.getElementById('cityInfo').style.display = 'none';
        }
        this.renderer.draw();
    }

    /** Reset city-state properties to blank defaults (does NOT re-render). */
    _initEmptyCityState() {
        this.buildings     = [];
        this.roads         = new Set();
        this.wideRoads     = new Set();
        this.unlockedAreas = [];
        this.unlockedCells = null;
        this.buildingPool  = [];
        this.cityMetadata  = null;
        const gridDef = CONSTANTS.DEFAULT_GRID_SIZE_BY_TYPE[this.activeCityType] || { w: CONSTANTS.DEFAULT_GRID_SIZE, h: CONSTANTS.DEFAULT_GRID_SIZE };
        this.gridWidth   = gridDef.w;
        this.gridHeight  = gridDef.h;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.optimizer._snapshot = null;
        this._placeDefaultTownhall();
    }

    /**
     * Place the default town hall for the current city type at (0, 0).
     * For QI: first main_building template; for all others: first townhall template.
     * Does nothing if a townhall is already on the canvas.
     */
    _placeDefaultTownhall() {
        if (this.buildings.some(b => this.isTownhall(b))) return;
        const wantType = this.activeCityType === 'quantum' ? 'main_building' : 'townhall';
        const entry = Object.entries(this.buildingTemplates).find(([, t]) => t.type === wantType);
        if (!entry) return;
        const [id, t] = entry;
        this.buildings.push({ id, x: 0, y: 0, width: t.width, height: t.height,
            name: t.name, color: t.color, type: t.type, age: t.age, needsRoad: t.needsRoad ?? 0 });
    }

    /** Switch to another city type, preserving the current one first. */
    switchCity(cityType) {
        if (cityType === this.activeCityType) return;

        // Save current city
        this.cities[this.activeCityType] = this.getSnapshot();

        this.activeCityType = cityType;

        // Reset interaction state so no stale drag/selection carries over
        this.selectedBuilding   = null;
        this.selectedRoad       = null;
        this.draggingBuilding   = null;
        this.selectedTemplate   = null;
        this.placingRoad        = false;
        this.isPaintingRoad     = false;
        this.placingWideRoad    = false;
        this.isPaintingWideRoad = false;
        this.placingExpansion   = false;
        this.hoverPos           = null;
        this.hideModeBanner();

        this.restoreSnapshot(this.cities[cityType]);
        this.updateCityTabs();
    }

    /** Refresh the tab bar to reflect the active city and which cities have data. */
    updateCityTabs() {
        document.querySelectorAll('.city-tab').forEach(btn => {
            const id = btn.dataset.city;
            btn.classList.toggle('active', id === this.activeCityType);
            const snap = (id === this.activeCityType)
                ? { buildings: this.buildings }
                : this.cities[id];
            const hasData = snap && snap.buildings && snap.buildings.length > 0;
            btn.dataset.hasBuildings = hasData ? 'true' : 'false';
        });

        // Drive sidebar CSS: show/hide mode-specific sections
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.dataset.cityType = this.activeCityType;

        // Leave main city → reset Activity mode so non-main cities show Normal view
        if (this.activeCityType !== 'main' && this.renderMode !== 'normal') {
            this.setRenderMode('normal');
        }
    }
}
