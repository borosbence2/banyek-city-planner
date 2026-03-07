import { CONSTANTS } from './constants.js';

export class Renderer {
    constructor(planner) {
        this.p = planner;
        this._animations = []; // { building, startTime, duration }
        this._rafId = null;
    }

    /** Trigger a pop animation on a newly placed building. */
    triggerPlaceAnimation(building) {
        this._animations.push({ building, startTime: performance.now(), duration: 300 });
        this._startAnimLoop();
    }

    _startAnimLoop() {
        if (this._rafId) return;
        const tick = () => {
            this.draw();
            const now = performance.now();
            this._animations = this._animations.filter(a => now - a.startTime < a.duration);
            if (this._animations.length > 0) {
                this._rafId = requestAnimationFrame(tick);
            } else {
                this._rafId = null;
            }
        };
        this._rafId = requestAnimationFrame(tick);
    }

    _drawAnimations() {
        const { ctx, cellSize } = this.p;
        const now = performance.now();
        for (const anim of this._animations) {
            const { building, startTime, duration } = anim;
            const t = Math.min((now - startTime) / duration, 1);
            const x = building.x * cellSize;
            const y = building.y * cellSize;
            const w = building.width  * cellSize;
            const h = building.height * cellSize;

            // Subtle white flash, fades quickly
            if (t < 0.3) {
                ctx.globalAlpha = 0.2 * (1 - t / 0.3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = 1;
            }

            // Thin expanding ring, short reach, low opacity
            const expand = t * cellSize * 0.6;
            ctx.globalAlpha = (1 - t) * 0.35;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - expand, y - expand, w + expand * 2, h + expand * 2);
            ctx.globalAlpha = 1;
        }
    }

    get ctx() { return this.p.ctx; }

    get isDark() { return document.body.classList.contains('dark'); }

    draw() {
        const { ctx, canvas, panX, panY, zoom } = this.p;

        ctx.fillStyle = this.isDark ? '#12121e' : '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        this.drawBackground();
        this.drawGrid();
        this.drawPlacementCrosshair();
        this.drawRoads();
        this.drawBuildings();
        this._drawAnimations();
        this.drawHoverPreview();

        ctx.restore();
        if (this.p.showMinimap) this.drawMinimap();
    }

    /** Returns the minimap rectangle in canvas pixel space, clamped to fit the canvas. */
    _minimapBounds() {
        const { canvas, gridWidth, gridHeight } = this.p;
        const PAD = 10;
        const MAX_W = Math.min(160, Math.floor(canvas.width  * 0.28) - PAD);
        const MAX_H = Math.min(120, Math.floor(canvas.height * 0.28) - PAD);
        const ratio = gridHeight / gridWidth;
        let w = MAX_W, h = Math.round(MAX_W * ratio);
        if (h > MAX_H) { h = MAX_H; w = Math.round(MAX_H / ratio); }
        w = Math.max(40, w); h = Math.max(30, h);
        return { left: canvas.width - w - PAD, top: canvas.height - h - PAD, width: w, height: h };
    }

    drawMinimap() {
        const { ctx, canvas, gridWidth, gridHeight, gridOffsetX, gridOffsetY,
                cellSize, buildings, roads, panX, panY, zoom, renderMode } = this.p;

        const { left: mmL, top: mmT, width: mmW, height: mmH } = this._minimapBounds();
        const scaleX = mmW / gridWidth;
        const scaleY = mmH / gridHeight;

        // Clip everything to the minimap rect so nothing escapes it
        ctx.save();
        ctx.beginPath();
        ctx.rect(mmL, mmT, mmW, mmH);
        ctx.clip();

        // Background
        ctx.fillStyle = this.isDark ? 'rgba(15,15,28,0.88)' : 'rgba(220,225,232,0.92)';
        ctx.fillRect(mmL, mmT, mmW, mmH);

        const isRoads  = renderMode === 'roads';
        const isExpiry = renderMode === 'expiry';
        const reachableRoads = isRoads ? this.p.computeRoadConnectivity() : null;

        // Roads
        const roadColor = isRoads ? '#26C6DA' : (this.isDark ? '#555' : '#999');
        for (const key of roads) {
            const [rx, ry] = key.split(',').map(Number);
            ctx.fillStyle = roadColor;
            ctx.fillRect(
                mmL + (rx - gridOffsetX) * scaleX,
                mmT + (ry - gridOffsetY) * scaleY,
                Math.max(1, scaleX), Math.max(1, scaleY)
            );
        }

        // Buildings
        for (const b of buildings) {
            let color;
            if (isExpiry) {
                color = Renderer.expiryColor(b.expiration).color;
            } else if (isRoads) {
                color = b.needsRoad === 0 ? '#78909C'
                      : (reachableRoads && this.p.isBuildingRoadConnected(b, reachableRoads))
                          ? '#43A047' : '#E53935';
            } else {
                color = this.isDark ? (CONSTANTS.DARK_COLORS[b.type] || b.color) : b.color;
            }
            ctx.fillStyle = color;
            ctx.fillRect(
                mmL + (b.x - gridOffsetX) * scaleX,
                mmT + (b.y - gridOffsetY) * scaleY,
                Math.max(1, b.width  * scaleX),
                Math.max(1, b.height * scaleY)
            );
        }

        // Viewport rectangle (clipped automatically by the save/clip above)
        const vl = (0             - panX) / zoom / cellSize - gridOffsetX;
        const vt = (0             - panY) / zoom / cellSize - gridOffsetY;
        const vr = (canvas.width  - panX) / zoom / cellSize - gridOffsetX;
        const vb = (canvas.height - panY) / zoom / cellSize - gridOffsetY;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mmL + vl * scaleX, mmT + vt * scaleY, (vr - vl) * scaleX, (vb - vt) * scaleY);

        ctx.restore();

        // Border drawn after restore so it's always crisp on top
        ctx.strokeStyle = this.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mmL + 0.5, mmT + 0.5, mmW - 1, mmH - 1);
    }

    drawBackground() {
        const { ctx, gridWidth, gridHeight, gridOffsetX, gridOffsetY, cellSize } = this.p;
        const ox = gridOffsetX * cellSize;
        const oy = gridOffsetY * cellSize;
        const w  = gridWidth   * cellSize;
        const h  = gridHeight  * cellSize;

        if (!isFinite(w) || !isFinite(h) || w === 0 || h === 0) {
            console.warn(`[Renderer] drawBackground skipped: gridWidth=${gridWidth} gridHeight=${gridHeight} cellSize=${cellSize}`);
            return;
        }
        const gradient = ctx.createLinearGradient(ox, oy, ox + w, oy + h);
        if (this.isDark) {
            gradient.addColorStop(0,   '#1a1d2e');
            gradient.addColorStop(0.5, '#161928');
            gradient.addColorStop(1,   '#1a1d2e');
        } else {
            gradient.addColorStop(0,   '#F5F7FA');
            gradient.addColorStop(0.5, '#E8EDF2');
            gradient.addColorStop(1,   '#F5F7FA');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(ox, oy, w, h);

        ctx.fillStyle = this.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(150, 150, 150, 0.08)';
        for (let x = gridOffsetX; x < gridOffsetX + gridWidth; x++) {
            for (let y = gridOffsetY; y < gridOffsetY + gridHeight; y++) {
                if ((x + y) % 2 === 0) {
                    ctx.fillRect(
                        x * cellSize + cellSize / 2 - 1,
                        y * cellSize + cellSize / 2 - 1,
                        2, 2
                    );
                }
            }
        }
    }

    drawGrid() {
        const { ctx, gridWidth, gridHeight, gridOffsetX, gridOffsetY, cellSize, unlockedCells } = this.p;
        const ox = gridOffsetX * cellSize;
        const oy = gridOffsetY * cellSize;
        const w  = gridWidth   * cellSize;
        const h  = gridHeight  * cellSize;

        // Shade locked cells dark so the non-rectangular city shape is visible.
        if (unlockedCells) {
            ctx.fillStyle = this.isDark ? 'rgba(0,0,0,0.65)' : 'rgba(40,40,40,0.55)';
            for (let cy = gridOffsetY; cy < gridOffsetY + gridHeight; cy++) {
                for (let cx = gridOffsetX; cx < gridOffsetX + gridWidth; cx++) {
                    if (!unlockedCells.has(`${cx},${cy}`)) {
                        ctx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
                    }
                }
            }
        }

        ctx.strokeStyle = this.isDark
            ? (unlockedCells ? 'rgba(100,100,160,0.35)' : 'rgba(80,80,120,0.5)')
            : (unlockedCells ? 'rgba(180,180,180,0.4)'  : '#e0e0e0');
        ctx.lineWidth = 1;

        for (let i = 0; i <= gridWidth; i++) {
            ctx.beginPath();
            ctx.moveTo(ox + i * cellSize, oy);
            ctx.lineTo(ox + i * cellSize, oy + h);
            ctx.stroke();
        }
        for (let i = 0; i <= gridHeight; i++) {
            ctx.beginPath();
            ctx.moveTo(ox,     oy + i * cellSize);
            ctx.lineTo(ox + w, oy + i * cellSize);
            ctx.stroke();
        }

        // Draw expansion area borders and index labels on top
        if (this.p.unlockedAreas && this.p.unlockedAreas.length > 0) {
            const dark = this.isDark;
            let manualIndex = 0;
            let importedIndex = 0;
            this.p.unlockedAreas.forEach(area => {
                const x = (area.x || 0) * cellSize;
                const y = (area.y || 0) * cellSize;
                const aw = (area.width  || 0) * cellSize;
                const ah = (area.length || 0) * cellSize;

                if (area.autoTiled) {
                    // Default area tiles — subtle dashed border only, no label
                    ctx.save();
                    ctx.strokeStyle = dark ? 'rgba(140,140,180,0.35)' : 'rgba(120,120,160,0.3)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(x, y, aw, ah);
                    ctx.restore();
                } else if (area.manual) {
                    // User-placed expansion — green border + number
                    manualIndex++;
                    ctx.strokeStyle = dark ? '#66bb6a' : '#2e7d32';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.strokeRect(x, y, aw, ah);
                    ctx.fillStyle = dark ? '#66bb6a' : '#2e7d32';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(`+${manualIndex}`, x + 4, y + 3);
                } else {
                    // Imported from FoE — blue border + number
                    importedIndex++;
                    ctx.strokeStyle = dark ? '#64b5f6' : '#2196F3';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.strokeRect(x, y, aw, ah);
                    ctx.fillStyle = dark ? '#64b5f6' : '#1565C0';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(`#${importedIndex}`, x + 4, y + 3);
                }
            });
            ctx.setLineDash([]); // reset
        }
    }

    drawRoads() {
        const { ctx, roads, wideRoads, cellSize, hoverPos, selectedRoad, renderMode } = this.p;
        const isRoadsMode = renderMode === 'roads';
        const roadColor     = isRoadsMode ? '#26C6DA' : CONSTANTS.COLORS.ROAD;
        const wideRoadColor = isRoadsMode ? '#0097A7' : (CONSTANTS.COLORS.WIDE_ROAD || '#6b6b6b');

        for (const roadPos of roads) {
            const [x, y] = roadPos.split(',').map(Number);

            // Wide road: only draw from the anchor cell to avoid duplicate draws
            if (wideRoads.has(roadPos)) {
                // This IS the anchor — draw a 2×2 block
                const px = x * cellSize;
                const py = y * cellSize;
                const bw = cellSize * 2;
                const bh = cellSize * 2;

                ctx.fillStyle = wideRoadColor;
                ctx.fillRect(px, py, bw, bh);

                // Inner lane lines
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(px + bw / 2, py);
                ctx.lineTo(px + bw / 2, py + bh);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px, py + bh / 2);
                ctx.lineTo(px + bw, py + bh / 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Outer border — inset so it stays within the block
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, py + 0.5, bw - 1, bh - 1);

                // Selection highlight — also inset
                const isSelectedWide = selectedRoad && this.p._getWideRoadAnchor(
                    ...selectedRoad.split(',').map(Number)
                ) === roadPos;
                if (isSelectedWide || selectedRoad === roadPos) {
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(px + 2, py + 2, bw - 4, bh - 4);
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 6;
                    ctx.strokeRect(px + 2, py + 2, bw - 4, bh - 4);
                    ctx.shadowBlur = 0;
                }
                continue;
            }

            // Skip non-anchor cells that belong to a wide road (already drawn above)
            if (this.p._getWideRoadAnchor(x, y) !== null) continue;

            // Normal 1×1 road
            const px = x * cellSize;
            const py = y * cellSize;
            const isSelected = roadPos === selectedRoad;

            ctx.fillStyle = roadColor;
            ctx.fillRect(px, py, cellSize, cellSize);

            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);

            if (isSelected) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 6;
                ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
                ctx.shadowBlur = 0;
            }
        }

        // Draw narrow road drag ghost — free pixel position, snap preview on release
        if (this.p.draggingRoad) {
            const rect = this.p.canvas.getBoundingClientRect();
            const { panX, panY, zoom, roadDragPixelX, roadDragPixelY } = this.p;
            const canvasX = (roadDragPixelX - rect.left - panX) / zoom;
            const canvasY = (roadDragPixelY - rect.top  - panY) / zoom;
            const snapCX  = Math.floor(canvasX / cellSize);
            const snapCY  = Math.floor(canvasY / cellSize);
            const canDrop  = snapCX >= 0 && snapCY >= 0 &&
                             snapCX < this.p.gridWidth && snapCY < this.p.gridHeight &&
                             !this.p.isBuildingAt(snapCX, snapCY);
            // Snap ghost
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = canDrop ? '#00cc44' : '#ff3333';
            ctx.fillRect(snapCX * cellSize, snapCY * cellSize, cellSize, cellSize);
            ctx.globalAlpha = 1.0;
            // Floating ghost centered on cursor
            const gx = canvasX - cellSize / 2;
            const gy = canvasY - cellSize / 2;
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = CONSTANTS.COLORS.ROAD;
            ctx.fillRect(gx, gy, cellSize, cellSize);
            ctx.strokeStyle = canDrop ? '#00cc44' : '#ff3333';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(gx, gy, cellSize, cellSize);
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        }

        // Draw wide road drag ghost — free pixel position, snap preview on release
        if (this.p.draggingWideRoad) {
            const rect = this.p.canvas.getBoundingClientRect();
            const { panX, panY, zoom, wideRoadDragPixelX, wideRoadDragPixelY } = this.p;
            const canvasX = (wideRoadDragPixelX - rect.left - panX) / zoom;
            const canvasY = (wideRoadDragPixelY - rect.top  - panY) / zoom;
            const snapCX  = Math.floor(canvasX / cellSize);
            const snapCY  = Math.floor(canvasY / cellSize);
            const bw = cellSize * 2;
            const bh = cellSize * 2;
            let canDrop = snapCX >= 0 && snapCY >= 0 &&
                          snapCX + 1 < this.p.gridWidth && snapCY + 1 < this.p.gridHeight;
            if (canDrop) {
                for (let dy = 0; dy < 2 && canDrop; dy++)
                    for (let dx = 0; dx < 2 && canDrop; dx++)
                        if (!this.p.isCellUnlocked(snapCX + dx, snapCY + dy) ||
                            this.p.isBuildingAt(snapCX + dx, snapCY + dy))
                            canDrop = false;
            }
            // Snap ghost
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = canDrop ? '#00cc44' : '#ff3333';
            ctx.fillRect(snapCX * cellSize, snapCY * cellSize, bw, bh);
            ctx.globalAlpha = 1.0;
            // Floating ghost centered on cursor (offset by 1 cell so block is centered)
            const gx = canvasX - cellSize;
            const gy = canvasY - cellSize;
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = CONSTANTS.COLORS.WIDE_ROAD || '#6b6b6b';
            ctx.fillRect(gx, gy, bw, bh);
            ctx.strokeStyle = canDrop ? '#00cc44' : '#ff3333';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(gx, gy, bw, bh);
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        }
    }

    // Returns { color, label } for the Activity map mode.
    // Uses a single green→amber→red gradient; < 24h gets a distinct bright red.
    // expiration is a Unix timestamp in seconds, or null for always-active buildings.
    static expiryColor(expiration) {
        if (expiration === null || expiration === undefined)
            return { color: '#78909C', label: 'Always active' };
        const secsLeft = expiration - Date.now() / 1000;
        if (secsLeft <= 0)              return { color: '#37474F', label: 'Inactive' };
        if (secsLeft < 86400)           return { color: '#FF1744', label: '< 24 hours' }; // bright red — critical
        if (secsLeft < 7  * 86400)      return { color: '#EF5350', label: '< 7 days' };   // red
        if (secsLeft < 30 * 86400)      return { color: '#FF8F00', label: '< 30 days' };  // amber
        if (secsLeft < 90 * 86400)      return { color: '#66BB6A', label: '< 90 days' };  // light green
        return                                 { color: '#2E7D32', label: '> 90 days' };   // dark green
    }

    drawBuildings() {
        const { ctx, buildings, cellSize, draggingBuilding, selectedBuilding, renderMode } = this.p;
        const isExpiry = renderMode === 'expiry';
        const isRoads  = renderMode === 'roads';

        // Pre-compute road connectivity once per draw when in roads mode
        const reachableRoads = isRoads ? this.p.computeRoadConnectivity() : null;

        for (const building of buildings) {
            const w = building.width  * cellSize;
            const h = building.height * cellSize;

            const isDragging = draggingBuilding === building;
            const isSelected = selectedBuilding === building;
            const isRoadless = building.needsRoad === 0;

            let fillColor;
            if (isExpiry) {
                fillColor = Renderer.expiryColor(building.expiration).color;
            } else if (isRoads) {
                if (isRoadless) {
                    fillColor = '#78909C'; // no road required
                } else if (reachableRoads && this.p.isBuildingRoadConnected(building, reachableRoads)) {
                    fillColor = '#43A047'; // connected
                } else {
                    fillColor = '#E53935'; // disconnected
                }
            } else {
                fillColor = this.isDark ? (CONSTANTS.DARK_COLORS[building.type] || building.color) : building.color;
            }

            // Free-drag: follow cursor in pixel space, snap only on release
            let x = building.x * cellSize;
            let y = building.y * cellSize;
            if (isDragging) {
                const rect = this.p.canvas.getBoundingClientRect();
                const { panX, panY, zoom, dragPixelX, dragPixelY, dragOffset } = this.p;
                x = (dragPixelX - rect.left - panX) / zoom - dragOffset.x * cellSize;
                y = (dragPixelY - rect.top  - panY) / zoom - dragOffset.y * cellSize;

                // Faint snap ghost so the user can see where it will land
                const snapGX = Math.floor((dragPixelX - rect.left - panX) / zoom / cellSize) - dragOffset.x;
                const snapGY = Math.floor((dragPixelY - rect.top  - panY) / zoom / cellSize) - dragOffset.y;
                const snapX = snapGX * cellSize;
                const snapY = snapGY * cellSize;
                const canDrop = this.p.canPlaceBuilding(snapGX, snapGY, building.width, building.height, building);
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = canDrop ? '#00cc44' : '#ff3333';
                ctx.fillRect(snapX, snapY, w, h);
                ctx.globalAlpha = 1.0;
            }

            if (isDragging) ctx.globalAlpha = 0.75;

            if (isRoadless && !isDragging && !isExpiry && !isRoads) {
                this.drawRoadlessBuilding(x, y, w, h, fillColor);
            } else {
                ctx.fillStyle = fillColor;
                ctx.fillRect(x, y, w, h);
            }

            // All borders inset so they never bleed onto neighbouring cells
            if (isRoadless && !isExpiry && !isRoads) {
                ctx.strokeStyle = '#2E7D32';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
                ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = (isExpiry || isRoads)
                    ? 'rgba(0,0,0,0.35)'
                    : (this.isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.45)');
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            }

            if (isSelected && !isDragging) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
                ctx.shadowBlur = 0;
            }

            if (isDragging) {
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
                ctx.setLineDash([]);
            }

            ctx.globalAlpha = 1.0;
            this.drawBuildingText(building, x, y, w, h);
        }
    }

    drawRoadlessBuilding(x, y, w, h, color) {
        const { ctx } = this.p;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        for (let i = -h; i < w + h; i += 8) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i + h, y + h);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    drawBuildingText(building, x, y, w, h) {
        const { ctx } = this.p;
        if (this.isDark) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 3;
        } else {
            ctx.fillStyle = '#000';
        }
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = building.name.split(' ');
        const maxWidth = w - 4;
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        const lineHeight = 12;
        const startY = y + h / 2 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lineHeight));
        ctx.shadowBlur = 0;
    }

    drawPlacementCrosshair() {
        const { ctx, hoverPos, selectedTemplate, cellSize,
                gridOffsetX, gridOffsetY, gridWidth, gridHeight } = this.p;

        const template = this.p._poolDragTemplate || selectedTemplate;
        if (!hoverPos || !template) return;

        const { x, y } = hoverPos;
        const { width, height } = template;

        const gridL = gridOffsetX * cellSize;
        const gridT = gridOffsetY * cellSize;
        const gridR = (gridOffsetX + gridWidth)  * cellSize;
        const gridB = (gridOffsetY + gridHeight) * cellSize;

        const bldL = x * cellSize;
        const bldT = y * cellSize;
        const bldR = (x + width)  * cellSize;
        const bldB = (y + height) * cellSize;

        // Subtle filled guide strips
        ctx.fillStyle = 'rgba(79, 195, 247, 0.10)';
        ctx.fillRect(bldL, gridT, bldR - bldL, gridB - gridT);  // column strip
        ctx.fillRect(gridL, bldT, gridR - gridL, bldB - bldT);  // row strip

        // Dashed guide lines at building footprint edges
        ctx.save();
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath(); ctx.moveTo(bldL, gridT); ctx.lineTo(bldL, gridB); ctx.stroke(); // left
        ctx.beginPath(); ctx.moveTo(bldR, gridT); ctx.lineTo(bldR, gridB); ctx.stroke(); // right
        ctx.beginPath(); ctx.moveTo(gridL, bldT); ctx.lineTo(gridR, bldT); ctx.stroke(); // top
        ctx.beginPath(); ctx.moveTo(gridL, bldB); ctx.lineTo(gridR, bldB); ctx.stroke(); // bottom

        ctx.restore();
    }

    drawHoverPreview() {
        const { ctx, hoverPos, selectedTemplate, cellSize } = this.p;

        // Expansion placement preview
        if (this.p.placingExpansion && hoverPos) {
            const EXPANSION_SIZE = 4;
            const x = Math.floor(hoverPos.x / EXPANSION_SIZE) * EXPANSION_SIZE;
            const y = Math.floor(hoverPos.y / EXPANSION_SIZE) * EXPANSION_SIZE;
            ctx.fillStyle = 'rgba(33, 150, 243, 0.25)';
            ctx.fillRect(x * cellSize, y * cellSize, EXPANSION_SIZE * cellSize, EXPANSION_SIZE * cellSize);
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cellSize, y * cellSize, EXPANSION_SIZE * cellSize, EXPANSION_SIZE * cellSize);
            return;
        }

        // Wide road placement ghost
        if (this.p.placingWideRoad && hoverPos) {
            const { x, y } = hoverPos;
            const bw = cellSize * 2;
            const bh = cellSize * 2;
            const px = x * cellSize;
            const py = y * cellSize;
            ctx.fillStyle = 'rgba(107, 107, 107, 0.35)';
            ctx.fillRect(px, py, bw, bh);
            ctx.strokeStyle = '#6b6b6b';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, bw, bh);
            return;
        }

        const template = this.p._poolDragTemplate || selectedTemplate;
        if (!hoverPos || !template) return;

        const { x, y } = hoverPos;
        const { width, height } = template;
        const canPlace = this.p.canPlaceBuilding(x, y, width, height);

        ctx.fillStyle   = canPlace ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x * cellSize, y * cellSize, width * cellSize, height * cellSize);

        ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * cellSize, y * cellSize, width * cellSize, height * cellSize);
    }
}
