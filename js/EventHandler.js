import { CONSTANTS, CITY_TYPES } from './constants.js';
import { Utils } from './utils.js';
import { GB_BONUSES } from '../data/gb_bonuses.js';
import { FoeImporter } from './FoeImporter.js';

export class EventHandler {
    constructor(planner) {
        this.p = planner;
        this._parsedImportData = null;
    }

    setup() {
        const p = this.p;

        // Building type filter buttons
        document.querySelectorAll('.type-btn').forEach(tab =>
            tab.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                p.currentTab = tab.dataset.tab;
                p.updateBuildingList();
            })
        );

        // Search
        document.getElementById('searchBox').addEventListener('input', e => {
            p.searchTerm = e.target.value.toLowerCase();
            p.updateBuildingList();
        });

        // Building management
        document.getElementById('addBuildingBtn').addEventListener('click',  () => p.showModal('addBuildingModal'));
        document.getElementById('cancelAddBtn').addEventListener('click',    () => p.hideModal('addBuildingModal'));
        document.getElementById('addBuildingForm').addEventListener('submit', e => p.handleAddBuilding(e));

        // City tabs
        document.querySelectorAll('.city-tab').forEach(btn =>
            btn.addEventListener('click', () => p.switchCity(btn.dataset.city))
        );

        // FoE import — open modal, reset state
        document.getElementById('importFoeBtn').addEventListener('click', () => {
            this._updateImportTargetLabel();
            document.getElementById('foeImportText').value = '';
            document.getElementById('cityDetectionArea').style.display = 'none';
            document.getElementById('clipboardStatus').style.display = 'none';
            document.getElementById('importFoeConfirmBtn').disabled = true;
            this._parsedImportData = null;
            p.showModal('importFoeModal');
        });
        document.getElementById('closeFoeImportBtn').addEventListener('click', () => p.hideModal('importFoeModal'));

        // Clipboard paste button — primary import path
        document.getElementById('importClipboardBtn').addEventListener('click', async () => {
            const statusEl = document.getElementById('clipboardStatus');
            statusEl.style.display = 'block';
            statusEl.className = 'clipboard-status';
            statusEl.textContent = '⏳ Reading clipboard…';
            try {
                const text = await navigator.clipboard.readText();
                if (!text) throw new Error('Clipboard is empty.');
                let data;
                try { data = JSON.parse(text); }
                catch { throw new Error('Clipboard content is not valid JSON. Make sure you copied the FoE Helper city data.'); }
                this._parsedImportData = data;
                this._runCityDetection(data);
                statusEl.className = 'clipboard-status success';
                statusEl.textContent = '✅ Data read from clipboard successfully.';
                document.getElementById('importFoeConfirmBtn').disabled = false;
            } catch (err) {
                statusEl.className = 'clipboard-status error';
                statusEl.textContent = `❌ ${err.message}`;
                document.getElementById('importFoeConfirmBtn').disabled = true;
            }
        });

        // Manual textarea fallback — auto-detect cities on input
        document.getElementById('foeImportText').addEventListener('input', () => {
            const jsonText = document.getElementById('foeImportText').value.trim();
            if (!jsonText) {
                this._parsedImportData = null;
                document.getElementById('importFoeConfirmBtn').disabled = true;
                document.getElementById('cityDetectionArea').style.display = 'none';
                return;
            }
            let data;
            try { data = JSON.parse(jsonText); }
            catch { return; }
            this._parsedImportData = data;
            this._runCityDetection(data);
            document.getElementById('importFoeConfirmBtn').disabled = false;
        });

        // Confirm import — collect checked city types and run
        document.getElementById('importFoeConfirmBtn').addEventListener('click', () => {
            const data = this._parsedImportData;
            if (!data) { alert('Please paste your FoE Helper data first!'); return; }

            // Gather checked cities (fall back to active city type if detection area is hidden)
            const detectionArea = document.getElementById('cityDetectionArea');
            let selected;
            if (detectionArea.style.display === 'none') {
                selected = [p.activeCityType];
            } else {
                selected = [...document.querySelectorAll('#cityCheckboxes input:checked')]
                    .map(cb => cb.value);
                if (selected.length === 0) { alert('Please select at least one city to import.'); return; }
            }

            p.importer.importFromFoeHelper(selected, data);
        });

        // Tools
        document.getElementById('roadBtn')
            .addEventListener('click', () => p.enterRoadPlacement());
        document.getElementById('wideRoadBtn')
            .addEventListener('click', () => p.enterWideRoadPlacement());
        document.getElementById('addExpansionBtn')
            .addEventListener('click', () => p.addExpansion());

        // Optimizer
        document.getElementById('optimizeBtn').addEventListener('click',     () => p.optimizer.run());
        document.getElementById('undoOptimizeBtn').addEventListener('click', () => p.optimizer.undo());

        // Production overview
        document.getElementById('prodOverviewBtn').addEventListener('click',
            () => p.productionOverview.show());
        document.getElementById('closeProdOverviewBtn').addEventListener('click',
            () => p.hideModal('prodOverviewModal'));

        // Efficiency Rating import
        document.getElementById('importEfficiencyBtn').addEventListener('click', () => {
            document.getElementById('efficiencyFileInput').click();
        });
        document.getElementById('efficiencyFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                let data;
                try { data = JSON.parse(ev.target.result); }
                catch { alert('Invalid JSON file.'); return; }
                const perTile = document.getElementById('efficiencyPerTile').checked;
                p.importEfficiencyRating(data, perTile);
            };
            reader.readAsText(file);
            // Reset so same file can be re-imported
            e.target.value = '';
        });
        document.getElementById('closeEfficiencyImportBtn').addEventListener('click',
            () => p.hideModal('efficiencyImportModal'));

        // File
        document.getElementById('saveBtn').addEventListener('click',       () => p.saveLayout());
        document.getElementById('loadBtn').addEventListener('click',       () => p.showLoadModal());
        document.getElementById('exportPngBtn').addEventListener('click',  () => p.exportPNG());
        document.getElementById('exportPdfBtn').addEventListener('click',  () => p.exportPDF());
        document.getElementById('clearBtn').addEventListener('click',      () => p.clearAll());
        document.getElementById('closeModalBtn').addEventListener('click', () => p.hideModal('saveLoadModal'));
        document.getElementById('copyBtn').addEventListener('click',       () => p.copyToClipboard());
        document.getElementById('loadConfirmBtn').addEventListener('click', () => p.loadLayout());

        // Grid
        document.getElementById('resizeBtn').addEventListener('click',      () => p.resizeGrid());
        document.getElementById('fitToContentBtn').addEventListener('click', () => p.fitGridToContent());

        // Render mode toggle
        document.querySelectorAll('.render-mode-btn').forEach(btn =>
            btn.addEventListener('click', () => p.setRenderMode(btn.dataset.mode))
        );

        // Zoom
        document.getElementById('zoomInBtn').addEventListener('click',  () => p.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => p.zoomOut());
        document.getElementById('resetViewBtn').addEventListener('click', () => p.resetView());

        // Canvas
        p.canvas.addEventListener('wheel',       e => this.handleWheel(e));
        p.canvas.addEventListener('mousedown',   e => this.handleMouseDown(e));
        p.canvas.addEventListener('mousemove',   e => this.handleMouseMove(e));
        p.canvas.addEventListener('mouseup',     e => this.handleMouseUp(e));
        p.canvas.addEventListener('mouseleave',  () => this.handleMouseLeave());
        p.canvas.addEventListener('contextmenu', e => this.handleContextMenu(e));

        // Close context menu on any click outside it
        document.addEventListener('mousedown', (e) => {
            const menu = document.getElementById('ctxMenu');
            if (menu && !menu.contains(e.target)) this._hideContextMenu();
        });

        document.getElementById('ctxDelete').addEventListener('click', () => {
            if (this._ctxBuilding) {
                if (p.isTownhall(this._ctxBuilding)) {
                    // Townhall can't be deleted — stash to pool instead
                    p.moveToPool(this._ctxBuilding);
                } else {
                    p.buildings = p.buildings.filter(b => b !== this._ctxBuilding);
                    if (p.selectedBuilding === this._ctxBuilding) {
                        p.selectedBuilding = null;
                        p.updateSelectionBanner();
                    }
                    p.renderer.draw();
                }
            }
            this._hideContextMenu();
        });

        document.getElementById('ctxStash').addEventListener('click', () => {
            if (this._ctxBuilding) p.moveToPool(this._ctxBuilding);
            this._hideContextMenu();
        });

        document.getElementById('ctxDuplicate').addEventListener('click', () => {
            if (this._ctxBuilding && !p.isTownhall(this._ctxBuilding))
                this._startDuplicateDrag(this._ctxBuilding);
            this._hideContextMenu();
        });

        window.addEventListener('resize', () => p.resizeCanvas());

        // Dark mode toggle
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark');
                darkModeBtn.textContent = '☀️';
            }
            darkModeBtn.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark');
                darkModeBtn.textContent = isDark ? '☀️' : '🌙';
                localStorage.setItem('darkMode', isDark);
            });
        }

        // Settlement type picker — initial render
        p.updateSettlementTypePicker();

        // Collapsible sidebar sections — fluid height animation via scrollHeight
        document.querySelectorAll('.section-content.collapsed').forEach(el => {
            el.style.maxHeight = '0px';
        });

        document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const content = document.getElementById(header.dataset.toggle);
                if (!content) return;
                const isCollapsed = content.classList.contains('collapsed');

                if (isCollapsed) {
                    // Expand: remove class first so scrollHeight reflects full content
                    content.classList.remove('collapsed');
                    const fullH = content.scrollHeight;
                    content.offsetHeight; // force reflow so transition starts from 0
                    content.style.maxHeight = fullH + 'px';
                    const onEnd = (e) => {
                        if (e.propertyName !== 'max-height') return;
                        content.style.maxHeight = ''; // unconstrain after animation
                        content.removeEventListener('transitionend', onEnd);
                    };
                    content.addEventListener('transitionend', onEnd);
                } else {
                    // Collapse: lock to current height, then animate to 0
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.offsetHeight; // force reflow
                    content.classList.add('collapsed');
                    content.style.maxHeight = '0px';
                }

                header.classList.toggle('collapsed', !isCollapsed);
            });
        });

        // If the user releases the mouse outside the canvas while dragging, send to pool
        window.addEventListener('mouseup', (e) => {
            if (!p.draggingBuilding) return;
            const rect = p.canvas.getBoundingClientRect();
            const insideCanvas =
                e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top  && e.clientY <= rect.bottom;
            if (!insideCanvas) {
                p.moveToPool(p.draggingBuilding);
                p.draggingBuilding = null;
                p.canvas.style.cursor = 'default';
                p.updateStatus('Building moved to pool');
                setTimeout(() => p.updateStatus('Mode: Select/Move'), 2000);
            }
        });
        window.addEventListener('keydown', (e) => {

        // Delete selected building
        if (e.key === 'Delete') {

            if (p.selectedBuilding) {
                if (p.isTownhall(p.selectedBuilding)) {
                    p.moveToPool(p.selectedBuilding);
                } else {
                    p.buildings = p.buildings.filter(b => b !== p.selectedBuilding);
                    p.selectedBuilding = null;
                }
            }

            else if (p.selectedRoad) {
                const [rx, ry] = p.selectedRoad.split(',').map(Number);
                p.removeRoadAt(rx, ry); // handles both narrow and wide roads
            }

            p.updateSelectionBanner();
            p.renderer.draw();
        }

        // ESC cancels placement
        if (e.key === 'Escape') {
            p.selectedTemplate = null;
            p.placingRoad = false;
            p.isPaintingRoad = false;
            p.placingWideRoad = false;
            p.isPaintingWideRoad = false;
            p.placingExpansion = false;
            p.hoverPos = null;

            p._clearActiveBuildingBtn();
            p._setActiveToolBtn(null);
            p.hideModeBanner();

            p.updateStatus('Mode: Select/Move');
            p.renderer.draw();
        }
        });
    }

    // ----------------------------------------
    // Canvas events
    // ----------------------------------------
    handleWheel(e) {
        e.preventDefault();
        const p = this.p;
        const delta = e.deltaY > 0 ? 1 / CONSTANTS.ZOOM_STEP : CONSTANTS.ZOOM_STEP;
        const newZoom = Utils.clamp(p.zoom * delta, CONSTANTS.MIN_ZOOM, CONSTANTS.MAX_ZOOM);

        const rect = p.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        p.panX = mouseX - (mouseX - p.panX) * (newZoom / p.zoom);
        p.panY = mouseY - (mouseY - p.panY) * (newZoom / p.zoom);
        p.zoom = newZoom;

        p.updateStatus(`Zoom: ${Math.round(p.zoom * 100)}%`);
        p.renderer.draw();
    }

    handleMouseDown(e) {
        const p = this.p;

        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            p.isPanning = true;
            p.lastPanX = e.clientX;
            p.lastPanY = e.clientY;
            p.canvas.style.cursor = 'grabbing';
            return;
        }

        const gridPos = p.getGridCoords(e.clientX, e.clientY);

        // Road placement
        if (p.placingRoad) {
            p.isPaintingRoad = true;
            p.placeRoad(gridPos);
            return;
        }

        // Wide road placement
        if (p.placingWideRoad) {
            p.isPaintingWideRoad = true;
            p.placeWideRoad(gridPos);
            return;
        }

        // Expansion placement
        if (p.placingExpansion) {
            p.placeExpansionAt(gridPos);
            // stay in mode so the user can place multiple expansions
            return;
        }

        // Building placement — stay in mode for multi-placement (like road/expansion)
        if (p.selectedTemplate) {
            p.placeBuilding(gridPos);
            // stay in placement mode so user can place multiple
            return;
        }

        // Default: select/move
        // Check if clicking any building — select it and start dragging immediately
        const clickedBuilding = p.buildings.find(b =>
            gridPos.x >= b.x && gridPos.x < b.x + b.width &&
            gridPos.y >= b.y && gridPos.y < b.y + b.height
        );
        if (clickedBuilding) {
            p.selectedBuilding = clickedBuilding;
            p.selectedRoad = null;
            p.draggingBuilding = clickedBuilding;
            p.dragOffset   = { x: gridPos.x - clickedBuilding.x, y: gridPos.y - clickedBuilding.y };
            p.dragStartPos = { x: clickedBuilding.x, y: clickedBuilding.y };
            p.dragPixelX   = e.clientX;
            p.dragPixelY   = e.clientY;
            p.updateSelectionBanner();
            p.renderer.draw();
            return;
        }

        // Check if clicking on any road — select and start drag
        const roadKey = `${gridPos.x},${gridPos.y}`;
        if (p.roads.has(roadKey)) {
            p.selectedBuilding = null;
            const wideAnchor = p._getWideRoadAnchor(gridPos.x, gridPos.y);
            if (wideAnchor) {
                const [ax, ay] = wideAnchor.split(',').map(Number);
                p.selectedRoad = wideAnchor;
                // Remove from sets for the duration of the drag
                p.wideRoads.delete(wideAnchor);
                for (let dy = 0; dy < 2; dy++)
                    for (let dx = 0; dx < 2; dx++)
                        p.roads.delete(`${ax + dx},${ay + dy}`);
                p.draggingWideRoad  = { x: ax, y: ay };
                p.wideRoadDragStart = { x: ax, y: ay };
                p.wideRoadDragPixelX = e.clientX;
                p.wideRoadDragPixelY = e.clientY;
            } else {
                // Narrow road drag
                p.selectedRoad  = roadKey;
                p.draggingRoad  = { x: gridPos.x, y: gridPos.y };
                p.roadDragStart = { x: gridPos.x, y: gridPos.y };
                p.roads.delete(roadKey);
                p.roadDragPixelX = e.clientX;
                p.roadDragPixelY = e.clientY;
            }
            p.updateSelectionBanner();
            p.renderer.draw();
            return;
        }

        p.selectAtPosition(gridPos);
    }

    handleMouseMove(e) {
        const p = this.p;

        // Free pixel drag — snap only on mouseup
        if (p.draggingBuilding) {
            p.dragPixelX = e.clientX;
            p.dragPixelY = e.clientY;
            p.renderer.draw();
            this._hideTooltip();
            return;
        }

        if (p.draggingRoad) {
            p.roadDragPixelX = e.clientX;
            p.roadDragPixelY = e.clientY;
            p.renderer.draw();
            this._hideTooltip();
            return;
        }

        if (p.draggingWideRoad) {
            p.wideRoadDragPixelX = e.clientX;
            p.wideRoadDragPixelY = e.clientY;
            p.renderer.draw();
            this._hideTooltip();
            return;
        }

        if (p.isPanning) {
            p.panX += e.clientX - p.lastPanX;
            p.panY += e.clientY - p.lastPanY;
            p.lastPanX = e.clientX;
            p.lastPanY = e.clientY;
            p.renderer.draw();
            this._hideTooltip();
            return;
        }

        if (p.placingRoad && p.isPaintingRoad) {
            const gridPos = p.getGridCoords(e.clientX, e.clientY);
            p.placeRoad(gridPos);
            return;
        }

        if (p.placingWideRoad && p.isPaintingWideRoad) {
            const gridPos = p.getGridCoords(e.clientX, e.clientY);
            p.placeWideRoad(gridPos);
            return;
        }

        const gridPos = p.getGridCoords(e.clientX, e.clientY);

        if (p.selectedTemplate || p.placingExpansion || p.placingWideRoad) {
            p.hoverPos = gridPos;
            p.renderer.draw();
        }

        this._updateCursorForHover(gridPos);
        this._updateTooltip(e.clientX, e.clientY, gridPos);
    }

    handleMouseUp(e) {
        const p = this.p;

        if (p.isPanning) {
            p.isPanning = false;
            p.canvas.style.cursor = 'default';
            return;
        }

        if (p.draggingRoad) {
            const snapPos = p.getGridCoords(e.clientX, e.clientY);
            const newX = snapPos.x;
            const newY = snapPos.y;
            if (newX >= 0 && newY >= 0 && newX < p.gridWidth && newY < p.gridHeight &&
                p.isCellUnlocked(newX, newY) && !p.isBuildingAt(newX, newY)
            ) {
                p.roads.add(`${newX},${newY}`);
            } else {
                p.roads.add(`${p.roadDragStart.x},${p.roadDragStart.y}`);
            }
            p.draggingRoad = null;
            p.roadDragStart = null;
            p.canvas.style.cursor = 'default';
            p.renderer.draw();
            return;
        }

        if (p.draggingWideRoad) {
            const snapPos = p.getGridCoords(e.clientX, e.clientY);
            const newX = snapPos.x;
            const newY = snapPos.y;
            const { x: sx,  y: sy  }  = p.wideRoadDragStart;
            let canPlace = true;
            for (let dy = 0; dy < 2 && canPlace; dy++)
                for (let dx = 0; dx < 2 && canPlace; dx++)
                    if (!p.isCellUnlocked(newX + dx, newY + dy) || p.isBuildingAt(newX + dx, newY + dy))
                        canPlace = false;
            const newAnchor = `${newX},${newY}`;
            if (canPlace && !p.wideRoads.has(newAnchor)) {
                p.wideRoads.add(newAnchor);
                for (let dy = 0; dy < 2; dy++)
                    for (let dx = 0; dx < 2; dx++)
                        p.roads.add(`${newX + dx},${newY + dy}`);
                p.selectedRoad = newAnchor;
            } else {
                // Restore original position
                const origAnchor = `${sx},${sy}`;
                p.wideRoads.add(origAnchor);
                for (let dy = 0; dy < 2; dy++)
                    for (let dx = 0; dx < 2; dx++)
                        p.roads.add(`${sx + dx},${sy + dy}`);
                p.selectedRoad = origAnchor;
            }
            p.draggingWideRoad  = null;
            p.wideRoadDragStart = null;
            p.canvas.style.cursor = 'default';
            p.renderer.draw();
            return;
        }

        if (p.isPaintingRoad) {
            p.isPaintingRoad = false;
            return;
        }

        if (p.isPaintingWideRoad) {
            p.isPaintingWideRoad = false;
            return;
        }

        if (p.draggingBuilding) {
            const b = p.draggingBuilding;

            // Snap to grid from final mouse position
            const snapPos = p.getGridCoords(e.clientX, e.clientY);
            b.x = snapPos.x - p.dragOffset.x;
            b.y = snapPos.y - p.dragOffset.y;

            const offGrid =
                b.x < 0 || b.y < 0 ||
                b.x + b.width  > p.gridWidth ||
                b.y + b.height > p.gridHeight;

            if (offGrid) {
                p.moveToPool(b);
                p.updateStatus('Building moved to pool');
                setTimeout(() => p.updateStatus('Mode: Select/Move'), 2000);
            } else if (!p.canPlaceBuilding(b.x, b.y, b.width, b.height, b)) {
                b.x = p.dragStartPos.x;
                b.y = p.dragStartPos.y;
                p.updateStatus('Invalid placement — building returned to original position');
                setTimeout(() => p.updateStatus('Mode: Select/Move'), 2000);
            }
            p.draggingBuilding = null;
            p.canvas.style.cursor = 'default';
            p.renderer.draw();
            return;
        }
    }

    handleMouseLeave() {
        const p = this.p;
        p.isPanning = false;
        p.hoverPos  = null;

        // Restore roads if dragged off-canvas
        if (p.draggingRoad) {
            p.roads.add(`${p.roadDragStart.x},${p.roadDragStart.y}`);
            p.draggingRoad  = null;
            p.roadDragStart = null;
        }
        if (p.draggingWideRoad) {
            const { x: sx, y: sy } = p.wideRoadDragStart;
            const origAnchor = `${sx},${sy}`;
            p.wideRoads.add(origAnchor);
            for (let dy = 0; dy < 2; dy++)
                for (let dx = 0; dx < 2; dx++)
                    p.roads.add(`${sx + dx},${sy + dy}`);
            p.selectedRoad      = origAnchor;
            p.draggingWideRoad  = null;
            p.wideRoadDragStart = null;
        }

        p.renderer.draw();
        this._hideTooltip();
    }

    handleContextMenu(e) {
        e.preventDefault();
        const p = this.p;
        const gridPos = p.getGridCoords(e.clientX, e.clientY);
        const building = p.buildings.find(b =>
            gridPos.x >= b.x && gridPos.x < b.x + b.width &&
            gridPos.y >= b.y && gridPos.y < b.y + b.height
        );
        if (!building) return;

        this._ctxBuilding = building;

        // Select the building so it's visually highlighted
        p.selectedBuilding = building;
        p.selectedRoad = null;
        p.updateSelectionBanner();
        p.renderer.draw();

        // Adjust context menu for townhall protection
        const isTH = p.isTownhall(building);
        document.getElementById('ctxDuplicate').style.display = isTH ? 'none' : '';
        document.getElementById('ctxDelete').style.display    = isTH ? 'none' : '';

        const menu = document.getElementById('ctxMenu');
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        menu.style.display = 'block';
        const mw = menu.offsetWidth;
        const mh = menu.offsetHeight;
        menu.style.left = (e.clientX + mw > vw ? e.clientX - mw : e.clientX) + 'px';
        menu.style.top  = (e.clientY + mh > vh ? e.clientY - mh : e.clientY) + 'px';
    }

    _hideContextMenu() {
        const menu = document.getElementById('ctxMenu');
        if (menu) menu.style.display = 'none';
        this._ctxBuilding = null;
    }

    /** Update the "Importing into: …" label in the import modal. */
    _updateImportTargetLabel() {
        const p = this.p;
        const cityInfo = CITY_TYPES.find(c => c.id === p.activeCityType) || CITY_TYPES[0];
        document.getElementById('importTargetLabel').textContent = `${cityInfo.icon} ${cityInfo.label}`;
    }

    /**
     * Render city-detection checkboxes for a pre-parsed data object.
     */
    _runCityDetection(data) {
        const p = this.p;
        const area = document.getElementById('cityDetectionArea');
        const box  = document.getElementById('cityCheckboxes');

        const detected = new Set(FoeImporter.detectCities(data));
        if (detected.size === 0) { area.style.display = 'none'; return; }

        box.innerHTML = CITY_TYPES.map(ct => {
            const found    = detected.has(ct.id);
            const isActive = ct.id === p.activeCityType;
            const checked  = found ? 'checked' : '';
            const disabled = found ? '' : 'disabled';
            const cls      = found ? '' : ' class="not-found"';
            const badge    = found ? '✅' : '❌';
            const note     = isActive && found ? ' <em>(current tab)</em>' : '';
            return `<label${cls}>
                <input type="checkbox" value="${ct.id}" ${checked} ${disabled}>
                ${badge} ${ct.icon} ${ct.label}${note}
            </label>`;
        }).join('');

        area.style.display = 'block';
    }

    _startDuplicateDrag(source) {
        const p = this.p;
        // Create a copy with the same properties but place it on the grid later
        const copy = { ...source };

        // Ghost label following cursor
        const ghost = document.createElement('div');
        ghost.className = 'pool-drag-ghost';
        ghost.textContent = copy.name;
        ghost.style.background = copy.color || '#ccc';
        document.body.appendChild(ghost);

        const move = (ev) => {
            ghost.style.left = (ev.clientX + 12) + 'px';
            ghost.style.top  = (ev.clientY + 12) + 'px';

            const rect = p.canvas.getBoundingClientRect();
            const overCanvas =
                ev.clientX >= rect.left && ev.clientX <= rect.right &&
                ev.clientY >= rect.top  && ev.clientY <= rect.bottom;
            p.canvas.classList.toggle('pool-drag-over', overCanvas);

            if (overCanvas) {
                p.hoverPos = p.getGridCoords(ev.clientX, ev.clientY);
                p._poolDragTemplate = copy;
            } else {
                p.hoverPos = null;
                p._poolDragTemplate = null;
            }
            p.renderer.draw();
        };

        const up = (ev) => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup',   up);
            ghost.remove();
            p.canvas.classList.remove('pool-drag-over');
            p.hoverPos = null;
            p._poolDragTemplate = null;

            const rect = p.canvas.getBoundingClientRect();
            const overCanvas =
                ev.clientX >= rect.left && ev.clientX <= rect.right &&
                ev.clientY >= rect.top  && ev.clientY <= rect.bottom;

            if (overCanvas) {
                const gridPos = p.getGridCoords(ev.clientX, ev.clientY);
                if (p.canPlaceBuilding(gridPos.x, gridPos.y, copy.width, copy.height)) {
                    p.buildings.push({ ...copy, x: gridPos.x, y: gridPos.y });
                    p.updateStatus(`Placed copy of ${copy.name}`);
                    setTimeout(() => p.updateStatus('Mode: Select/Move'), 1500);
                } else {
                    p.updateStatus('Cannot place here — duplicate discarded');
                    setTimeout(() => p.updateStatus('Mode: Select/Move'), 2000);
                }
            }
            p.renderer.draw();
        };

        ghost.style.left = '-9999px';
        ghost.style.top  = '-9999px';
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup',   up);
    }

    _updateCursorForHover(gridPos) {
        const p = this.p;
        const hovering = p.buildings.some(b =>
            gridPos.x >= b.x && gridPos.x < b.x + b.width &&
            gridPos.y >= b.y && gridPos.y < b.y + b.height
        );
        p.canvas.style.cursor = hovering ? 'grab' : 'default';
    }

    _hideTooltip() {
        const el = document.getElementById('buildingTooltip');
        if (el) el.style.display = 'none';
    }

    _updateTooltip(clientX, clientY, gridPos) {
        const p = this.p;
        const el = document.getElementById('buildingTooltip');
        if (!el) return;

        const building = p.buildings.find(b =>
            gridPos.x >= b.x && gridPos.x < b.x + b.width &&
            gridPos.y >= b.y && gridPos.y < b.y + b.height
        );

        if (!building) {
            el.style.display = 'none';
            return;
        }

        const template = p.buildingTemplates[building.id] || {};
        el.innerHTML = this._buildTooltipHTML(building, template);

        // Position: follow cursor with a small offset, flip if near right/bottom edge
        const margin = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        el.style.display = 'block';
        const tw = el.offsetWidth;
        const th = el.offsetHeight;
        const left = (clientX + margin + tw > vw) ? clientX - tw - margin : clientX + margin;
        const top  = (clientY + margin + th > vh) ? clientY - th - margin : clientY + margin;
        el.style.left = left + 'px';
        el.style.top  = top  + 'px';
    }

    _buildTooltipHTML(building, template) {
        const STAT_LABELS = {
            population:      ['👥', 'Population'],
            happiness:       ['😊', 'Happiness'],
            demandHappiness: ['😊', 'Happiness demand'],
            money_24h:       ['🪙', 'Coins / 24h'],
            money_5m:        ['🪙', 'Coins / 5m'],
            money_15m:       ['🪙', 'Coins / 15m'],
            money_1h:        ['🪙', 'Coins / 1h'],
            money_4h:        ['🪙', 'Coins / 4h'],
            money_8h:        ['🪙', 'Coins / 8h'],
            supplies_5m:     ['⚙️', 'Supplies / 5m'],
            supplies_15m:    ['⚙️', 'Supplies / 15m'],
            supplies_1h:     ['⚙️', 'Supplies / 1h'],
            supplies_4h:     ['⚙️', 'Supplies / 4h'],
            supplies_8h:     ['⚙️', 'Supplies / 8h'],
            supplies_24h:    ['⚙️', 'Supplies / 24h'],
            strategy_points_24h: ['🔵', 'Forge Points / 24h'],
            strategy_points_7d:  ['🔵', 'Forge Points / 7d'],
            medals_1h:       ['🥇', 'Medals / 1h'],
            medals_24h:      ['🥇', 'Medals / 24h'],
            medals_7d:       ['🥇', 'Medals / 7d'],
            all_goods_of_age_24h:      ['📦', 'Goods / 24h'],
            random_good_of_age_24h:    ['📦', 'Goods / 24h'],
            all_goods_of_next_age_24h: ['📦', 'Next-age goods / 24h'],
            // Quantum Incursion (Guild Raids) resources
            guild_raids_population:         ['👥', 'QI Population'],
            guild_raids_happiness:          ['😊', 'QI Happiness'],
            guild_raids_money_10h:          ['🪙', 'QI Coins / 10h'],
            guild_raids_supplies_10h:       ['⚙️', 'QI Supplies / 10h'],
            guild_raids_chrono_alloy_10h:   ['⚡', 'Chrono Alloy / 10h'],
            guild_raids_honey:              ['🍯', 'Honey'],
            guild_raids_bronze:             ['🥉', 'Bronze'],
            guild_raids_brick:              ['🧱', 'Brick'],
            guild_raids_rope:               ['🪢', 'Rope'],
            guild_raids_ebony:              ['🪵', 'Ebony'],
            guild_raids_gems:               ['💎', 'Gems'],
            guild_raids_lead:               ['⚫', 'Lead'],
            guild_raids_limestone:          ['🪨', 'Limestone'],
            guild_raids_cloth:              ['🧶', 'Cloth'],
            guild_raids_gunpowder:          ['💥', 'Gunpowder'],
            guild_raids_actions:            ['🎯', 'QI Actions'],
        };

        const typeColors = {
            residential: '#87CEEB', production: '#5F8DC3', goods: '#F4E16B',
            culture: '#6B8E7F', military: '#8B7BAA', great: '#D46A4F',
            event: '#D4884B', townhall: '#E8D679',
        };

        const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${building.color || typeColors[building.type] || '#ccc'};margin-right:5px;vertical-align:middle;"></span>`;

        let html = `<div class="tt-name">${dot}${building.name}</div>`;
        const metaParts = [];
        if (building.age)       metaParts.push(building.age);
        if (building.eventName) metaParts.push(building.eventName);
        metaParts.push(building.type || '');
        metaParts.push(`${building.width}×${building.height}`);
        if (building.expiration != null) metaParts.push('⚡ Felemelkedett');
        html += `<div class="tt-meta">${metaParts.join(' · ')}</div>`;

        if (building.expiration != null) {
            const secsLeft = building.expiration - Date.now() / 1000;
            const expDate  = new Date(building.expiration * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            let actColor;
            if (secsLeft <= 0)              actColor = '#37474F';
            else if (secsLeft < 86400)      actColor = '#FF1744';
            else if (secsLeft < 7  * 86400) actColor = '#EF5350';
            else if (secsLeft < 30 * 86400) actColor = '#FF8F00';
            else if (secsLeft < 90 * 86400) actColor = '#66BB6A';
            else                            actColor = '#2E7D32';

            if (building.expireDuration != null) {
                const totalDays = Math.round(building.expireDuration / 86400);
                html += `<div class="tt-stat" style="margin-top:4px;">
                    <span class="tt-stat-label">⏱ Duration</span>
                    <span class="tt-stat-value">${totalDays} days total</span>
                </div>`;
            }

            const expTs = building.expiration;
            html += `<div class="tt-stat">
                <span class="tt-stat-label">🕐 Transition at</span>
                <span class="tt-stat-value" style="font-size:9px;color:#aaa;">${expTs} (${expDate})</span>
            </div>`;

            if (secsLeft <= 0) {
                html += `<div class="tt-stat">
                    <span class="tt-stat-label">⚡ Status</span>
                    <span class="tt-stat-value" style="color:${actColor};">Inactive</span>
                </div>`;
            } else {
                const daysLeft = Math.floor(secsLeft / 86400);
                const hrsLeft  = Math.floor((secsLeft % 86400) / 3600);
                const timeStr  = daysLeft > 0 ? `${daysLeft}d ${hrsLeft}h` : `${hrsLeft}h`;
                html += `<div class="tt-stat">
                    <span class="tt-stat-label">⚡ Active until</span>
                    <span class="tt-stat-value" style="color:${actColor};">${expDate} <small>(${timeStr})</small></span>
                </div>`;
            }
            if (building.revertName) {
                html += `<div class="tt-stat">
                    <span class="tt-stat-label">↩ Reverts to</span>
                    <span class="tt-stat-value" style="color:#888;">${building.revertName}</span>
                </div>`;
            }
        }

        // Military boosts
        if (building.boosts && building.boosts.length > 0) {
            const BOOST_LABELS = {
                att_boost_attacker:              ['⚔️',    'Attack (Attacker)'],
                att_boost_defender:              ['⚔️',    'Attack (Defender)'],
                def_boost_attacker:              ['🛡️',   'Defense (Attacker)'],
                def_boost_defender:              ['🛡️',   'Defense (Defender)'],
                att_def_boost_attacker:          ['⚔️🛡️', 'Att+Def (Attacker)'],
                att_def_boost_defender:          ['⚔️🛡️', 'Att+Def (Defender)'],
                att_def_boost_attacker_defender: ['⚔️🛡️', 'Att+Def (Both)'],
            };
            const FEATURE_LABELS = {
                all: '', battleground: ' [PvP]',
                guild_expedition: ' [GE]', guild_raids: ' [GR]',
            };
            html += `<div class="tt-section">Military Bonuses</div>`;
            for (const b of building.boosts) {
                const [icon, label] = BOOST_LABELS[b.type] || ['⚔️', b.type];
                const feature = FEATURE_LABELS[b.feature] ?? ` [${b.feature}]`;
                html += `<div class="tt-stat">
                    <span class="tt-stat-label">${icon} ${label}${feature}</span>
                    <span class="tt-stat-value">+${b.value}%</span>
                </div>`;
            }
        }

        // Production stats — prefer live values from state.productionOption (exact era),
        // fall back to database prod keyed by era.
        const TIMER = { 300:'5m', 900:'15m', 3600:'1h', 14400:'4h', 28800:'8h', 36000:'10h', 86400:'24h', 172800:'2d', 604800:'7d' };

        const baseStats = {};
        const motivatedStats = {};

        if (building.currentProd) {
            const time = building.currentProd.time || 0;
            const suffix = TIMER[time] || (time ? `${time}s` : '');
            for (const product of building.currentProd.products || []) {
                // Keep motivated split for display, but always show both sections
                const target = product.onlyWhenMotivated ? motivatedStats : baseStats;
                const resources = product.playerResources?.resources || {};
                if (Object.keys(resources).length > 0) {
                    for (const [res, val] of Object.entries(resources)) {
                        if (val) {
                            const key = suffix ? `${res}_${suffix}` : res;
                            target[key] = (target[key] || 0) + val;
                        }
                    }
                } else if (product.type === 'genericReward' && product.reward) {
                    // Unit or chest reward — show as a labelled entry
                    const r = product.reward;
                    const label = r.name || (r.type === 'unit' ? `Unit (${r.subType || '?'})` : r.type);
                    const amount = r.amount || 1;
                    target[`__reward__${label}`] = amount;
                }
            }
        } else if (template.prod) {
            const eras = Object.keys(template.prod);
            // Use building.eraCode first (exact match), then try age-string fallback, then latest era
            const eraKey = (building.eraCode && eras.includes(building.eraCode))
                ? building.eraCode
                : eras.find(e => building.age && building.age.replace(/ /g, '') === e)
                  || eras[eras.length - 1];
            Object.assign(baseStats, template.prod[eraKey] || {});
        }

        const renderStats = (statsObj, section) => {
            if (Object.keys(statsObj).length === 0) return '';
            let s = `<div class="tt-section">${section}</div>`;
            for (const [key, val] of Object.entries(statsObj)) {
                if (key.startsWith('__reward__')) {
                    const label = key.slice(10);
                    s += `<div class="tt-stat">
                        <span class="tt-stat-label">⚔️ ${label}</span>
                        <span class="tt-stat-value">${val.toLocaleString()}</span>
                    </div>`;
                } else {
                    const [icon, label] = STAT_LABELS[key] || ['·', key];
                    s += `<div class="tt-stat">
                        <span class="tt-stat-label">${icon} ${label}</span>
                        <span class="tt-stat-value">${val.toLocaleString()}</span>
                    </div>`;
                }
            }
            return s;
        };

        html += renderStats(baseStats, 'Bonuses');
        html += renderStats(motivatedStats, 'When motivated');

        // Great building level + bonuses
        if (building.type === 'great') {
            const gbData = GB_BONUSES[building.id];
            const level = building.gbLevel;

            if (level !== undefined && level !== null) {
                html += `<div class="tt-section">Great Building · Level ${level}</div>`;
            } else {
                html += `<div class="tt-section">Great Building Bonuses</div>`;
            }

            if (gbData && level) {
                const cappedLevel = Math.min(Math.max(level, 1), 80);
                const idx = cappedLevel - 1;
                const aboveCap = level > 80;
                for (const bonus of gbData.bonuses) {
                    const val = bonus.values[idx];
                    const display = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
                    html += `<div class="tt-stat">
                        <span class="tt-stat-label">🏛️ ${bonus.label}</span>
                        <span class="tt-stat-value">${display}${aboveCap ? '<span class="tt-gb-capped"> (Lv80)</span>' : ''}</span>
                    </div>`;
                }
                if (aboveCap) {
                    html += `<div class="tt-gb-note">Bonus data only available up to level 80</div>`;
                }
            } else if (gbData) {
                // No level known — show level 1 and 10 as reference
                for (const bonus of gbData.bonuses) {
                    const v1  = bonus.values[0];
                    const v10 = bonus.values[9];
                    const fmt = v => Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
                    html += `<div class="tt-stat">
                        <span class="tt-stat-label">🏛️ ${bonus.label}</span>
                        <span class="tt-stat-value tt-gb-range">Lv1: ${fmt(v1)} · Lv10: ${fmt(v10)}</span>
                    </div>`;
                }
            }
        }

        return html;
    }
}
