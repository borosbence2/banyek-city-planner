import { Utils } from './utils.js';
import { SETTLEMENT_TYPES, COLONY_TYPES } from './constants.js';
import { t } from './i18n.js';

// Grid cell constants for Uint8Array
const FREE = 0, BUILDING = 1, ROAD = 2, TOWNHALL = 3, BLOCKED = 4;

const BEAM_WIDTH  = 12;
const K_CANDIDATES = 5;
const TIME_LIMIT  = 90_000; // ms
const MAX_PER_TOPOLOGY = 3; // beam diversity: max states per topology hash

const PLACE_ROADLESS = true; // set false to skip auto-placement of roadless buildings

export class Optimizer {
    constructor(planner) {
        this.p = planner;
        this._snapshot = null;
        this._running  = false;
    }

    async run() {
        if (this._running) return;
        const p = this.p;

        if (p.buildings.length === 0 && p.buildingPool.length === 0) {
            alert(t('alert.noOptimize'));
            return;
        }

        this._running = true;
        this.setProgress(0, t('optimizer.starting'));
        document.getElementById('progressContainer').classList.add('active');
        document.getElementById('optimizeBtn').disabled = true;

        try {
            await this._core();
            document.getElementById('undoOptimizeBtn').style.display = 'block';
        } catch (err) {
            console.error('Optimizer error:', err);
            alert(t('alert.optimizeFailed', { error: err.message }));
        } finally {
            this._running = false;
            document.getElementById('progressContainer').classList.remove('active');
            document.getElementById('optimizeBtn').disabled = false;
        }
    }

    undo() {
        if (!this._snapshot) {
            alert(t('alert.noUndoOptimize'));
            return;
        }
        const p = this.p;
        p.buildings    = this._snapshot.buildings;
        p.roads        = this._snapshot.roads;
        p.wideRoads    = this._snapshot.wideRoads;
        p.buildingPool = this._snapshot.buildingPool;
        p.gridWidth    = this._snapshot.gridWidth;
        p.gridHeight   = this._snapshot.gridHeight;

        document.getElementById('gridWidth').value  = p.gridWidth;
        document.getElementById('gridHeight').value = p.gridHeight;

        this._snapshot = null;
        document.getElementById('undoOptimizeBtn').style.display = 'none';

        p.resizeCanvas();
        p.updatePoolPanel();
        p.renderer.draw();
        alert(t('alert.optimizeUndone'));
    }

    setProgress(percent, text) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = text;
    }

    yieldUI() { return Utils.sleep(10); }

    _isBetterResult(a, b) {
        if (!b) return true;
        if (a.buildingsPlaced !== b.buildingsPlaced) return a.buildingsPlaced > b.buildingsPlaced;
        return a.roadCount < b.roadCount;
    }

    // ========================================================================
    // CORE — Time-Boxed Multi-Strategy Optimizer
    // ========================================================================
    async _core() {
        const p = this.p;

        this._snapshot = {
            buildings:    Utils.deepClone(p.buildings),
            roads:        new Set(p.roads),
            wideRoads:    new Set(p.wideRoads),
            buildingPool: Utils.deepClone(p.buildingPool),
            gridWidth:    p.gridWidth,
            gridHeight:   p.gridHeight,
        };

        const skipRoads = this._isRoadlessCity();
        const allBuildings = [...p.buildings, ...p.buildingPool];
        const thEntry = allBuildings.find(b => p.isTownhall(b));
        if (!thEntry) throw new Error('No Town Hall found to optimize around');

        const others = allBuildings.filter(b => b !== thEntry);
        // Stamp each building with a unique ID for tracking placement
        let _nextOptId = 1;
        for (const b of others) b._optId = _nextOptId++;
        const roadBuildings    = others.filter(b => b.needsRoad && !skipRoads);
        const roadlessBuildings = others.filter(b => !b.needsRoad || skipRoads)
            .sort((a, b) => (b.width * b.height) - (a.width * a.height));

        const offX = p.gridOffsetX, offY = p.gridOffsetY;
        const W = p.gridWidth, H = p.gridHeight;

        const templateGrid = new Uint8Array(W * H);
        for (let r = 0; r < H; r++)
            for (let c = 0; c < W; c++)
                if (!p.isCellUnlocked(offX + c, offY + r)) templateGrid[r * W + c] = BLOCKED;

        const ctx = {
            W, H, offX, offY,
            templateGrid,
            thEntry,
            maxRoads: Math.ceil(
                roadBuildings.reduce((s, b) => s + Math.min(b.width, b.height), 0) / 2 * 1.2
            ),
            maxIntersections: Math.max(3, Math.floor(roadBuildings.length / 15)),
            totalRoadBuildings: roadBuildings.length,
            startTime: Date.now(),
        };

        let globalBest = null;
        let strategiesTried = 0;

        // ── Snake Strategies ──────────────────────────────────────────────
        const snakeConfigs = this._generateSnakeConfigs(roadBuildings);
        for (const config of snakeConfigs) {
            if (Date.now() - ctx.startTime > TIME_LIMIT) break;
            strategiesTried++;
            const elapsed = ((Date.now() - ctx.startTime) / 1000).toFixed(0);
            const bestInfo = globalBest ? `best: ${globalBest.buildingsPlaced}b/${globalBest.roadCount}r` : 'searching...';
            this.setProgress(
                Math.min(90, Math.floor(strategiesTried / snakeConfigs.length * 90)),
                `[${elapsed}s] Snake: ${config.name} (${bestInfo})`
            );
            await this.yieldUI();

            const result = this._snakeRoadStrategy(roadBuildings, config, ctx);
            if (result && this._isBetterResult(result, globalBest)) {
                globalBest = result;
                globalBest.strategy = `snake:${config.name}`;
            }
        }

        if (!globalBest) throw new Error('No valid layout found — try a larger grid');

        // ── Medium building short-side retry ─────────────────────────────
        // Re-place medium buildings (>2×2, shorter side ≤5) so their shorter
        // side faces the road. Retry with shuffled orderings for up to 30 s;
        // fall back to the best partial result on timeout.
        {
            const { medium: medInLayout } = this._classifyBuildings(
                globalBest.buildings.filter(b => !p.isTownhall(b))
            );
            if (medInLayout.length > 0) {
                this.setProgress(91, t('optimizer.medium', { count: medInLayout.length }));
                await this.yieldUI();

                const { thLX, thLY } = globalBest;
                const centerLX = thLX + thEntry.width  / 2;
                const centerLY = thLY + thEntry.height / 2;

                // Un-stamp medium buildings from the grid
                const gridForRetry = new Uint8Array(globalBest.grid);
                for (const b of medInLayout) {
                    const blx = b.x - offX, bly = b.y - offY;
                    for (let dy = 0; dy < b.height; dy++)
                        for (let dx = 0; dx < b.width; dx++)
                            gridForRetry[(bly + dy) * W + (blx + dx)] = FREE;
                }

                // Re-build connected roads (road cells still present; non-medium buildings still stamped)
                const connRoads = this._findConnectedRoads(gridForRetry, W, H, thLX, thLY, thEntry.width, thEntry.height);
                for (const b of globalBest.buildings) {
                    if (p.isTownhall(b) || medInLayout.includes(b)) continue;
                    const blx = b.x - offX, bly = b.y - offY;
                    this._expandConnectedRoads(gridForRetry, W, H, blx, bly, b.width, b.height, connRoads);
                }

                const { placed, grid: newGrid, connectedRoads: newConnRoads } = this._placeMediumBuildingsRetry(
                    gridForRetry, connRoads, W, H, medInLayout, offX, offY, centerLX, centerLY
                );

                // Apply: replace grid, drop old medium entries, insert newly placed ones
                globalBest.grid = newGrid;
                globalBest.connectedRoads = newConnRoads;
                globalBest.buildings = globalBest.buildings.filter(b => !medInLayout.includes(b));
                for (const { b, lx, ly } of placed)
                    globalBest.buildings.push({ ...b, x: lx + offX, y: ly + offY });
                globalBest.buildingsPlaced = globalBest.buildings.filter(b => !p.isTownhall(b)).length;
            }
        }

        // ── Small-building gap fill (post medium retry) ────────────────
        {
            const placedOptIds = new Set(globalBest.buildings.map(b => b._optId).filter(Boolean));
            const smallUnplaced = roadBuildings.filter(b =>
                !placedOptIds.has(b._optId) && Math.max(b.width, b.height) <= 2
            );
            if (smallUnplaced.length > 0) {
                // Rebuild connected roads if not already available from medium retry
                if (!globalBest.connectedRoads) {
                    const { thLX, thLY } = globalBest;
                    globalBest.connectedRoads = this._findConnectedRoads(
                        globalBest.grid, W, H, thLX, thLY, thEntry.width, thEntry.height
                    );
                    for (const b of globalBest.buildings) {
                        if (p.isTownhall(b)) continue;
                        const blx = b.x - offX, bly = b.y - offY;
                        this._expandConnectedRoads(globalBest.grid, W, H, blx, bly, b.width, b.height, globalBest.connectedRoads);
                    }
                }

                const gapFilled = this._gapFillSmallBuildings(
                    globalBest.grid, W, H, globalBest.connectedRoads,
                    globalBest.buildings, smallUnplaced, offX, offY
                );
                if (gapFilled > 0)
                    globalBest.buildingsPlaced = globalBest.buildings.filter(b => !p.isTownhall(b)).length;
                for (const b of smallUnplaced) delete b._gapFilled;
            }
        }

        // ── Post-processing ──────────────────────────────────────────────
        this.setProgress(92, t('optimizer.compacting'));
        await this.yieldUI();

        const finalGrid = Array.from({ length: H }, (_, r) =>
            Array.from({ length: W }, (_, c) => {
                const v = globalBest.grid[r * W + c];
                if (v === BUILDING) return 'B';
                if (v === ROAD)     return 'R';
                if (v === TOWNHALL) return 'T';
                if (v === BLOCKED)  return 'X';
                return null;
            })
        );

        const centerLX = globalBest.thLX + thEntry.width / 2;
        const centerLY = globalBest.thLY + thEntry.height / 2;

        this._compactBuildings(finalGrid, W, H, globalBest.buildings, centerLX, centerLY, offX, offY);
        const finalRoads = this._pruneRoads2D(finalGrid, W, H, globalBest.buildings, offX, offY);

        // Collect road-requiring buildings that weren't placed → pool
        const unplacedPool = [];
        const placedOptIds = new Set(globalBest.buildings.map(b => b._optId).filter(Boolean));
        for (const b of roadBuildings) {
            if (!placedOptIds.has(b._optId)) {
                unplacedPool.push(b);
            }
        }

        // Roadless buildings: optionally auto-place, remainder goes to pool
        if (PLACE_ROADLESS) {
            this._placeRoadlessInGrid(finalGrid, W, H, globalBest.buildings, roadlessBuildings, centerLX, centerLY, offX, offY);
        }
        for (const b of roadlessBuildings) {
            if (!b._roadlessPlaced) unplacedPool.push(b);
            delete b._roadlessPlaced;
        }

        // Clean up temporary _optId stamps
        for (const b of globalBest.buildings) delete b._optId;
        for (const b of unplacedPool) delete b._optId;

        p.buildings    = globalBest.buildings;
        p.roads        = finalRoads;
        p.wideRoads    = new Set();
        p.buildingPool = unplacedPool;

        const elapsed = ((Date.now() - ctx.startTime) / 1000).toFixed(1);
        this.setProgress(100, t('optimizer.done', {
            placed:     globalBest.buildingsPlaced,
            total:      roadBuildings.length,
            roads:      finalRoads.size,
            strategies: strategiesTried,
            elapsed,
            strategy:   globalBest.strategy,
        }));
        p.updatePoolPanel();
        p.renderer.draw();
    }

    // ========================================================================
    // SNAKE STRATEGY — configs
    // ========================================================================

    _generateSnakeConfigs(roadBuildings) {
        const { medium: medBlds } = this._classifyBuildings(roadBuildings);

        // Split medium buildings by orientation:
        //   Wide  (width > height): HEIGHT is the perpendicular corridor for H roads → prefer H
        //   Tall  (height > width): WIDTH  is the perpendicular corridor for V roads → prefer V
        //   Square: neutral — split half weight to each axis
        const tallMed = medBlds.filter(b => b.height > b.width);
        const wideMed = medBlds.filter(b => b.width  > b.height);
        const sqMed   = medBlds.filter(b => b.width === b.height);

        // H/V demand via perpendicular-corridor sums:
        //   hDemand = sum of heights of wide buildings (their H-road perpendicular = height)
        //   vDemand = sum of widths  of tall buildings (their V-road perpendicular = width)
        // More demand on an axis → explore more configs of that axis.
        const hShortSum = wideMed.reduce((s, b) => s + b.height,        0)
                        + sqMed  .reduce((s, b) => s + b.height * 0.5,  0);
        const vShortSum = tallMed.reduce((s, b) => s + b.width,         0)
                        + sqMed  .reduce((s, b) => s + b.width  * 0.5,  0);
        const wTot = hShortSum + vShortSum;

        let hReps = 1, vReps = 1;
        if (wTot > 0) {
            const r = hShortSum / wTot;
            if      (r >= 0.75) { hReps = 3; vReps = 1; }
            else if (r >= 0.60) { hReps = 2; vReps = 1; }
            else if (r <= 0.25) { hReps = 1; vReps = 3; }
            else if (r <= 0.40) { hReps = 1; vReps = 2; }
        }

        // Orientation-specific spacings.
        // segSpacing = corridor depth + 1 road cell, so it must exceed the building's
        // perpendicular dimension (the dim extending away from the road).
        //   H snake: buildings sit above/below → perpendicular dim = height → use wide building heights
        //   V snake: buildings sit left/right  → perpendicular dim = width  → use tall building widths
        const hPerpDims = [...wideMed.map(b => b.height), ...sqMed.map(b => b.height)]
            .sort((a, b) => a - b);
        const vPerpDims = [...tallMed.map(b => b.width),  ...sqMed.map(b => b.width)]
            .sort((a, b) => a - b);

        // Build a spacing list from a set of perpendicular dims; fall back to allMinDims.
        const allMinDims = medBlds.map(b => Math.min(b.width, b.height)).sort((a, b) => a - b);
        const makeSpacings = dims => {
            const src = dims.length > 0 ? dims : (allMinDims.length > 0 ? allMinDims : [4]);
            const med = src[Math.floor(src.length / 2)];
            const max = src[src.length - 1];
            return [...new Set([
                med + 1, med + 2,
                max + 1, max + 2, max + 3, max + 4,
            ])].filter(s => s >= 2).sort((a, b) => a - b);
        };

        const hSnakeSpacings = makeSpacings(hPerpDims);
        const vSnakeSpacings = makeSpacings(vPerpDims);

        const hConfigs = [], vConfigs = [];
        for (const thQuadrant of [0, 1, 2, 3]) {
            for (const sp of hSnakeSpacings) {
                hConfigs.push({ name: `h-q${thQuadrant}-sp${sp}`, snakeAxis: 'h', thQuadrant, segSpacing: sp });
                hConfigs.push({ name: `h-br${thQuadrant}-sp${sp}`, snakeAxis: 'h', thQuadrant, segSpacing: sp, thMode: 'branch' });
            }
            for (const sp of vSnakeSpacings) {
                vConfigs.push({ name: `v-q${thQuadrant}-sp${sp}`, snakeAxis: 'v', thQuadrant, segSpacing: sp });
                vConfigs.push({ name: `v-br${thQuadrant}-sp${sp}`, snakeAxis: 'v', thQuadrant, segSpacing: sp, thMode: 'branch' });
            }
        }

        // Interleave h and v configs according to the computed ratio.
        const configs = [];
        let hi = 0, vi = 0;
        while (hi < hConfigs.length || vi < vConfigs.length) {
            for (let r = 0; r < hReps && hi < hConfigs.length; r++) configs.push(hConfigs[hi++]);
            for (let r = 0; r < vReps && vi < vConfigs.length; r++) configs.push(vConfigs[vi++]);
        }
        return configs;
    }

    _findConnectedRoads(grid, W, H, thLX, thLY, thW, thH) {
        const connected = new Set();
        const queue = [];
        const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];

        for (let dx = 0; dx < thW; dx++) {
            const ty = thLY - 1;
            if (ty >= 0 && grid[ty * W + thLX + dx] === ROAD) {
                const idx = ty * W + thLX + dx; connected.add(idx); queue.push(idx);
            }
            const by = thLY + thH;
            if (by < H && grid[by * W + thLX + dx] === ROAD) {
                const idx = by * W + thLX + dx; connected.add(idx); queue.push(idx);
            }
        }
        for (let dy = 0; dy < thH; dy++) {
            if (thLX - 1 >= 0 && grid[(thLY + dy) * W + thLX - 1] === ROAD) {
                const idx = (thLY + dy) * W + thLX - 1; connected.add(idx); queue.push(idx);
            }
            if (thLX + thW < W && grid[(thLY + dy) * W + thLX + thW] === ROAD) {
                const idx = (thLY + dy) * W + thLX + thW; connected.add(idx); queue.push(idx);
            }
        }

        let head = 0;
        while (head < queue.length) {
            const ci = queue[head++];
            const cx = ci % W, cy = (ci - cx) / W;
            for (let d = 0; d < 4; d++) {
                const nx = cx + DX[d], ny = cy + DY[d];
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const ni = ny * W + nx;
                if (connected.has(ni)) continue;
                if (grid[ni] === ROAD) { connected.add(ni); queue.push(ni); }
            }
        }
        return connected;
    }

    _findBestRoadAdjacentPos(grid, W, H, b, centerLX, centerLY, connectedRoads, strictShortSide = false) {
        const bw = b.width, bh = b.height;
        let bestPos = null, bestScore = Infinity;

        for (let ly = 0; ly <= H - bh; ly++) {
            for (let lx = 0; lx <= W - bw; lx++) {
                if (!this._isAreaFreeFG(grid, W, H, lx, ly, bw, bh)) continue;

                let touchesRoad = false;
                for (let dx = 0; dx < bw && !touchesRoad; dx++) {
                    if (ly > 0 && connectedRoads.has((ly - 1) * W + lx + dx)) touchesRoad = true;
                    if (ly + bh < H && connectedRoads.has((ly + bh) * W + lx + dx)) touchesRoad = true;
                }
                for (let dy = 0; dy < bh && !touchesRoad; dy++) {
                    if (lx > 0 && connectedRoads.has((ly + dy) * W + lx - 1)) touchesRoad = true;
                    if (lx + bw < W && connectedRoads.has((ly + dy) * W + lx + bw)) touchesRoad = true;
                }
                if (!touchesRoad) continue;

                let roadTouchCount = 0;
                for (let dx = 0; dx < bw; dx++) {
                    if (ly > 0 && grid[(ly - 1) * W + lx + dx] === ROAD) roadTouchCount++;
                    if (ly + bh < H && grid[(ly + bh) * W + lx + dx] === ROAD) roadTouchCount++;
                }
                for (let dy = 0; dy < bh; dy++) {
                    if (lx > 0 && grid[(ly + dy) * W + lx - 1] === ROAD) roadTouchCount++;
                    if (lx + bw < W && grid[(ly + dy) * W + lx + bw] === ROAD) roadTouchCount++;
                }
                const isLgRF = Math.min(bw, bh) > 5;
                if (isLgRF && roadTouchCount > 2) continue; // large: max 2 touches (road tip only)
                if (!isLgRF && roadTouchCount > Math.max(bw, bh) + 2) continue;

                let packCount = 0;
                for (let dx = 0; dx < bw; dx++) {
                    if (ly > 0 && grid[(ly - 1) * W + lx + dx] === BUILDING) packCount++;
                    if (ly + bh < H && grid[(ly + bh) * W + lx + dx] === BUILDING) packCount++;
                }
                for (let dy = 0; dy < bh; dy++) {
                    if (lx > 0 && grid[(ly + dy) * W + lx - 1] === BUILDING) packCount++;
                    if (lx + bw < W && grid[(ly + dy) * W + lx + bw] === BUILDING) packCount++;
                }

                const distToCenter = Math.abs(lx + bw / 2 - centerLX)
                                   + Math.abs(ly + bh / 2 - centerLY);

                // Corner-aware scoring
                let trRoad = false, brRoad = false, lrRoad = false, rrRoad = false;
                for (let dx = 0; dx < bw; dx++) {
                    if (ly > 0 && grid[(ly - 1) * W + lx + dx] === ROAD) trRoad = true;
                    if (ly + bh < H && grid[(ly + bh) * W + lx + dx] === ROAD) brRoad = true;
                }
                for (let dy = 0; dy < bh; dy++) {
                    if (lx > 0 && grid[(ly + dy) * W + lx - 1] === ROAD) lrRoad = true;
                    if (lx + bw < W && grid[(ly + dy) * W + lx + bw] === ROAD) rrRoad = true;
                }
                const touchesH = trRoad || brRoad; // road on top or bottom face (spans bw)
                const touchesV = lrRoad || rrRoad; // road on left or right face (spans bh)

                // Strict short-side filter: only accept positions where the shorter
                // edge of the building faces the road (used in first pass of retry)
                if (strictShortSide && bw !== bh) {
                    const shortFace = bw < bh ? touchesH : touchesV;
                    if (!shortFace) continue;
                }

                const isIC = touchesH && touchesV;
                const minS = Math.min(bw, bh);
                let posScore = 0;
                if (minS > 5  && !isIC) posScore = -500; // bonus for outer/road-end
                if (minS > 5  && isIC)  posScore =  3000; // strong penalty for inner corners
                // Medium buildings: strongly prefer short face toward road
                if (minS >= 3 && minS <= 5 && bw !== bh && (touchesH !== touchesV)) {
                    const shortFaceToRoad = bw < bh ? touchesH : touchesV;
                    if (shortFaceToRoad) posScore -= 5000;
                }

                const score = distToCenter * 10 - packCount * 30 + posScore;
                if (score < bestScore) {
                    bestScore = score;
                    bestPos = [lx, ly];
                }
            }
        }
        return bestPos;
    }

    _expandConnectedRoads(grid, W, H, lx, ly, bw, bh, connectedRoads) {
        const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
        const toCheck = [];

        for (let dx = 0; dx < bw; dx++) {
            if (ly > 0) toCheck.push((ly - 1) * W + lx + dx);
            if (ly + bh < H) toCheck.push((ly + bh) * W + lx + dx);
        }
        for (let dy = 0; dy < bh; dy++) {
            if (lx > 0) toCheck.push((ly + dy) * W + lx - 1);
            if (lx + bw < W) toCheck.push((ly + dy) * W + lx + bw);
        }

        const queue = [];
        for (const idx of toCheck) {
            if (grid[idx] === ROAD && !connectedRoads.has(idx)) {
                const x = idx % W, y = (idx - x) / W;
                for (let d = 0; d < 4; d++) {
                    const nx = x + DX[d], ny = y + DY[d];
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    const ni = ny * W + nx;
                    if (connectedRoads.has(ni) || grid[ni] === TOWNHALL) {
                        connectedRoads.add(idx);
                        queue.push(idx);
                        break;
                    }
                }
            }
        }

        let head = 0;
        while (head < queue.length) {
            const ci = queue[head++];
            const cx = ci % W, cy = (ci - cx) / W;
            for (let d = 0; d < 4; d++) {
                const nx = cx + DX[d], ny = cy + DY[d];
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const ni = ny * W + nx;
                if (connectedRoads.has(ni)) continue;
                if (grid[ni] === ROAD) { connectedRoads.add(ni); queue.push(ni); }
            }
        }
    }

    // ========================================================================
    _classifyBuildings(buildings) {
        const large = [], medium = [], small = [];
        for (const b of buildings) {
            const minDim = Math.min(b.width, b.height);
            const maxDim = Math.max(b.width, b.height);
            if (minDim > 5) large.push(b);        // large: shorter side > 5
            else if (maxDim <= 2) small.push(b);  // small: both sides ≤ 2
            else medium.push(b);
        }
        large.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        medium.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        small.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        return { large, medium, small };
    }

    /**
     * Compute variable corridor widths for the snake layout.
     * Each corridor is sized for its tallest building PLUS room for a smaller
     * building on the opposite side of the road (minPerp).
     *
     * Formula: width[i] = (segSpacing - maxPerp + minPerp) + groupPerp[i]
     * Corridor 0 (widest) = segSpacing + minPerp  (wider than constant spacing).
     * Subsequent corridors shrink proportionally to their building dimensions.
     */
    _computeCorridorWidths(roadBuildings, maxCorridors, isHoriz, maxWidth) {
        if (maxCorridors <= 0) return [];

        // Only medium buildings drive corridor width; large go to corners, small fit anywhere
        const perpDims = roadBuildings
            .filter(b => Math.min(b.width, b.height) <= 5 && Math.max(b.width, b.height) > 2)
            .map(b => isHoriz ? b.height : b.width)
            .sort((a, b) => b - a); // descending

        if (perpDims.length === 0) {
            return Array(maxCorridors).fill(Math.min(maxWidth, 4));
        }

        const maxPerp = perpDims[0];
        const minPerp = perpDims[perpDims.length - 1];
        // base = config margin + opposite-side building allowance + extra clearance
        const base = maxWidth - maxPerp + minPerp + 2;
        const groupSize = Math.ceil(perpDims.length / maxCorridors);
        const widths = [];
        for (let c = 0; c < maxCorridors; c++) {
            const start = c * groupSize;
            if (start >= perpDims.length) {
                widths.push(Math.max(3, base + minPerp));
                continue;
            }
            // Corridor width = base margin + this group's tallest perpendicular dim
            widths.push(Math.max(3, base + perpDims[start]));
        }

        return widths;
    }

    /**
     * Snake/zigzag road strategy.
     *
     * Generates a single continuous path (no branches) that snakes across the grid:
     *   - snakeAxis='h': horizontal segments connected by 1-column vertical connectors
     *   - snakeAxis='v': vertical segments connected by 1-row horizontal connectors
     *
     * Number of segments is derived from roadBudget / segmentLength:
     *   - 2–3 segs → U/C shape
     *   - 4–6 segs → zigzag
     *
     * Config: { snakeAxis: 'h'|'v', thQuadrant: 0-3, segSpacing }
     */
    _snakeRoadStrategy(roadBuildings, config, ctx) {
        const { W, H, offX, offY, templateGrid, thEntry } = ctx;
        const thW = thEntry.width, thH = thEntry.height;
        const grid = new Uint8Array(templateGrid);

        const roadBudget = roadBuildings.reduce((s, b) => s + Math.min(b.width, b.height), 0);
        // Target road cells = sum(min(w,h)) / 2 — each road cell serves both sides
        const targetRoads = Math.max(1, Math.floor(roadBudget / 2));
        const { thQuadrant, segSpacing, snakeAxis } = config;
        const isHoriz = snakeAxis === 'h';

        // Border margin — snake stays inside, leaving these cells free on each edge for buildings
        const BORDER = 9;
        const iX1 = BORDER, iX2 = W - 1 - BORDER;
        const iY1 = BORDER, iY2 = H - 1 - BORDER;
        if (iX2 - iX1 < 4 || iY2 - iY1 < 4) return null; // grid too small

        const isBranch = config.thMode === 'branch';
        let thLX, thLY;

        if (isBranch) {
            // TH at edge center — frees corners for large building placement.
            // A short branch road will connect TH to the nearest snake segment.
            if (isHoriz) {
                thLX = Math.floor(W / 2 - thW / 2);
                thLY = thQuadrant < 2 ? 0 : H - thH;
            } else {
                thLX = thQuadrant % 2 === 0 ? 0 : W - thW;
                thLY = Math.floor(H / 2 - thH / 2);
            }
            if (!this._isAreaFreeFG(grid, W, H, thLX, thLY, thW, thH)) {
                const found = this._findNearestFreeFG(grid, W, H, thW, thH, thLX, thLY);
                if (!found) return null;
                [thLX, thLY] = found;
            }
        } else {
            // Corner position — used for seg0 span calculations
            const qx = thQuadrant % 2 === 0 ? 0 : W - thW;
            const qy = thQuadrant < 2 ? 0 : H - thH;
            const cornerThLX = Math.max(0, Math.min(W - thW, qx));
            const cornerThLY = Math.max(0, Math.min(H - thH, qy));

            // Try placing TH at the first bend of the snake instead of the corner.
            const goDown  = thQuadrant < 2;
            const goRight = thQuadrant % 2 === 0;
            const bendSeg0Y = goDown  ? cornerThLY + thH : cornerThLY - 1;
            const bendSeg0X = goRight ? cornerThLX + thW : cornerThLX - 1;
            let thLX_b, thLY_b;
            if (isHoriz) {
                const connXb = goRight ? iX2 : iX1;
                thLX_b = goRight ? connXb + 1     : connXb - thW;
                thLY_b = goDown  ? bendSeg0Y - thH + 1 : bendSeg0Y;
            } else {
                const connYb = thQuadrant < 2 ? iY2 : iY1;
                thLX_b = goRight ? bendSeg0X - thW + 1 : bendSeg0X;
                thLY_b = thQuadrant < 2 ? connYb + 1   : connYb - thH;
            }
            const bendOK = thLX_b >= 0 && thLY_b >= 0
                        && thLX_b + thW <= W && thLY_b + thH <= H
                        && this._isAreaFreeFG(grid, W, H, thLX_b, thLY_b, thW, thH);

            if (bendOK) {
                thLX = thLX_b;
                thLY = thLY_b;
            } else {
                thLX = cornerThLX;
                thLY = cornerThLY;
                if (!this._isAreaFreeFG(grid, W, H, thLX, thLY, thW, thH)) {
                    const found = this._findNearestFreeFG(grid, W, H, thW, thH, thLX, thLY);
                    if (!found) return null;
                    [thLX, thLY] = found;
                }
            }
        }
        for (let dy = 0; dy < thH; dy++)
            for (let dx = 0; dx < thW; dx++)
                grid[(thLY + dy) * W + (thLX + dx)] = TOWNHALL;

        // Road cells must stay at least this many cells away from any blocked cell
        const BLOCKED_MARGIN = 5;
        const isAwayFromBlocked = (x, y) => {
            for (let dy = -BLOCKED_MARGIN; dy <= BLOCKED_MARGIN; dy++)
                for (let dx = -BLOCKED_MARGIN; dx <= BLOCKED_MARGIN; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny * W + nx] === BLOCKED) return false;
                }
            return true;
        };

        let roadCount = 0;
        const layRoad = (x, y) => {
            if (roadCount >= targetRoads) return false;
            if (x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] === FREE && isAwayFromBlocked(x, y)) {
                grid[y * W + x] = ROAD;
                roadCount++;
            }
            return roadCount < targetRoads;
        };

        // Segment cost within inner bounds; connectors span (segSpacing-1) cells
        const innerSegLen = isHoriz ? (iX2 - iX1 + 1) : (iY2 - iY1 + 1);
        const segCost = innerSegLen + (segSpacing - 1);
        // Need enough outer corners (= numSegs-1) so each large building can go to an outer side
        const { large: _lgForSegs } = this._classifyBuildings(roadBuildings);
        const requiredCorners = Math.ceil(_lgForSegs.length / 2);
        const numSegs = Math.min(8, Math.max(2, Math.ceil(targetRoads / segCost), requiredCorners + 1));

        // Variable corridor widths — each corridor sized to its building content
        const corridorWidths = this._computeCorridorWidths(
            roadBuildings, numSegs - 1, isHoriz, segSpacing);

        // How much to trim the dead-end of the last snake segment so a large building
        // can sit there touching only the tip road cell (no connector on that side).
        // The BORDER gives 9 free cells beyond iX1/iY1; we shorten to extend that pocket.
        const _maxLargeDim = _lgForSegs.length > 0
            ? Math.max(..._lgForSegs.map(b => Math.max(b.width, b.height))) : 0;
        const DEAD_END_SHORTEN = Math.min(
            Math.floor(innerSegLen / 3),          // never remove more than 1/3 of a segment
            Math.max(0, _maxLargeDim - BORDER + 1) // enough room (+1 margin) for widest large bld
        );

        // Extend connectors for buildings that don't match the snake orientation.
        // V snake: wide buildings (w > h) need H road → extend H connectors.
        // H snake: tall buildings (h > w) need V road → extend V connectors.
        // Uses road budget from segments, keeping total road count the same.
        const medBldsMix = roadBuildings.filter(b =>
            Math.min(b.width, b.height) <= 5 && Math.max(b.width, b.height) > 2);
        const unmatchedArea = (isHoriz
            ? medBldsMix.filter(b => b.height > b.width)
            : medBldsMix.filter(b => b.width > b.height)
        ).reduce((s, b) => s + b.width * b.height, 0);
        const totalMedArea = medBldsMix.reduce((s, b) => s + b.width * b.height, 0);
        const unmatchedRatio = totalMedArea > 0 ? unmatchedArea / totalMedArea : 0;
        const connExtend = Math.min(
            Math.floor(innerSegLen / 3),
            Math.round(unmatchedRatio * innerSegLen * 0.4)
        );

        // junctions[]: connector info used to seed corner fill zones
        // horiz: { connX, y1, y2 }   vert: { connY, x1, x2 }
        const junctions = [];
        if (isHoriz) {
            const goDown = thQuadrant < 2;
            const signY = goDown ? 1 : -1;
            const seg0Y = isBranch
                ? (goDown ? iY1 : iY2)
                : (goDown ? thLY + thH : thLY - 1);
            if (seg0Y < 0 || seg0Y >= H) return null;

            // First segment
            if (isBranch) {
                // Branch mode: full inner bounds (TH is at edge center, not corner)
                for (let x = iX1; x <= iX2; x++) { if (!layRoad(x, seg0Y)) break; }
            } else {
                // Corner/bend mode: from TH's x edge to the far inner bound
                const fs_x1 = thQuadrant % 2 === 0 ? thLX : iX1;
                const fs_x2 = thQuadrant % 2 === 0 ? iX2   : thLX + thW - 1;
                for (let x = fs_x1; x <= fs_x2; x++) { if (!layRoad(x, seg0Y)) break; }
            }

            let prevY = seg0Y;
            // Connector starts on the inner-bound side opposite TH
            let connX = thQuadrant % 2 === 0 ? iX2 : iX1;
            let lastConnX = -1; // connector column used in the last full segment

            let cumOffsetH = 0;
            for (let s = 1; s < numSegs && roadCount < targetRoads; s++) {
                cumOffsetH += corridorWidths[s - 1];
                const segY = seg0Y + cumOffsetH * signY;
                if (segY < iY1 || segY > iY2) break;

                // Connector (extended for unmatched buildings)
                const y1 = Math.max(iY1, Math.min(prevY, segY) - connExtend);
                const y2 = Math.min(iY2, Math.max(prevY, segY) + connExtend);
                for (let y = y1; y <= y2; y++) { if (!layRoad(connX, y)) break; }
                junctions.push({ connX, y1, y2 });

                // Segment within inner bounds
                for (let x = iX1; x <= iX2; x++) { if (!layRoad(x, segY)) break; }

                lastConnX = connX; // record connector side before swapping
                prevY = segY;
                connX = connX === iX2 ? iX1 : iX2;
            }

            // Trim the dead-end (connector-free) side of the last segment so a large
            // building can sit in the wider pocket created between the new tip and the wall.
            if (DEAD_END_SHORTEN > 0 && lastConnX >= 0) {
                const deadEndX = lastConnX === iX2 ? iX1 : iX2;
                const step = deadEndX === iX1 ? 1 : -1;
                let removed = 0;
                for (let x = deadEndX; removed < DEAD_END_SHORTEN && x >= iX1 && x <= iX2; x += step) {
                    if (grid[prevY * W + x] === ROAD) { grid[prevY * W + x] = FREE; roadCount--; removed++; }
                }
            }

            // L-shaped branch: road along TH interior edge + vertical connector to seg0.
            // Creates building frontage around TH and a corner for large building placement.
            if (isBranch) {
                const intY = goDown ? thLY + thH : thLY - 1;
                const sideRight = thQuadrant % 2 === 0;
                const sideX = sideRight ? thLX + thW : thLX - 1;

                // Horizontal road along TH interior edge
                for (let x = thLX; x < thLX + thW; x++) {
                    if (intY >= 0 && intY < H && x >= 0 && x < W && grid[intY * W + x] === FREE) {
                        grid[intY * W + x] = ROAD; roadCount++;
                    }
                }

                // Vertical connector from corner of L to seg0
                const vY1 = Math.min(intY, seg0Y);
                const vY2 = Math.max(intY, seg0Y);
                for (let y = vY1; y <= vY2; y++) {
                    if (sideX >= 0 && sideX < W && y >= 0 && y < H && grid[y * W + sideX] === FREE) {
                        grid[y * W + sideX] = ROAD; roadCount++;
                    }
                }
            }
        } else {
            const goRight = thQuadrant % 2 === 0;
            const signX = goRight ? 1 : -1;
            const seg0X = isBranch
                ? (goRight ? iX1 : iX2)
                : (goRight ? thLX + thW : thLX - 1);
            if (seg0X < 0 || seg0X >= W) return null;

            // First segment
            if (isBranch) {
                for (let y = iY1; y <= iY2; y++) { if (!layRoad(seg0X, y)) break; }
            } else {
                const fs_y1 = thQuadrant < 2 ? thLY : iY1;
                const fs_y2 = thQuadrant < 2 ? iY2   : thLY + thH - 1;
                for (let y = fs_y1; y <= fs_y2; y++) { if (!layRoad(seg0X, y)) break; }
            }

            let prevX = seg0X;
            let connY = thQuadrant < 2 ? iY2 : iY1;
            let lastConnY = -1; // connector row used in the last full segment

            let cumOffsetV = 0;
            for (let s = 1; s < numSegs && roadCount < targetRoads; s++) {
                cumOffsetV += corridorWidths[s - 1];
                const segX = seg0X + cumOffsetV * signX;
                if (segX < iX1 || segX > iX2) break;

                // Connector (extended for unmatched buildings)
                const x1 = Math.max(iX1, Math.min(prevX, segX) - connExtend);
                const x2 = Math.min(iX2, Math.max(prevX, segX) + connExtend);
                for (let x = x1; x <= x2; x++) { if (!layRoad(x, connY)) break; }
                junctions.push({ connY, x1, x2 });

                // Segment within inner bounds
                for (let y = iY1; y <= iY2; y++) { if (!layRoad(segX, y)) break; }

                lastConnY = connY; // record connector side before swapping
                prevX = segX;
                connY = connY === iY2 ? iY1 : iY2;
            }

            // Trim the dead-end side of the last segment (vertical axis equivalent).
            if (DEAD_END_SHORTEN > 0 && lastConnY >= 0) {
                const deadEndY = lastConnY === iY2 ? iY1 : iY2;
                const step = deadEndY === iY1 ? 1 : -1;
                let removed = 0;
                for (let y = deadEndY; removed < DEAD_END_SHORTEN && y >= iY1 && y <= iY2; y += step) {
                    if (grid[y * W + prevX] === ROAD) { grid[y * W + prevX] = FREE; roadCount--; removed++; }
                }
            }

            // L-shaped branch: road along TH interior edge + horizontal connector to seg0.
            if (isBranch) {
                const intX = goRight ? thLX + thW : thLX - 1;
                const sideBottom = thQuadrant < 2;
                const sideY = sideBottom ? thLY + thH : thLY - 1;

                // Vertical road along TH interior edge
                for (let y = thLY; y < thLY + thH; y++) {
                    if (intX >= 0 && intX < W && y >= 0 && y < H && grid[y * W + intX] === FREE) {
                        grid[y * W + intX] = ROAD; roadCount++;
                    }
                }

                // Horizontal connector from corner of L to seg0
                const hX1 = Math.min(intX, seg0X);
                const hX2 = Math.max(intX, seg0X);
                for (let x = hX1; x <= hX2; x++) {
                    if (sideY >= 0 && sideY < H && x >= 0 && x < W && grid[sideY * W + x] === FREE) {
                        grid[sideY * W + x] = ROAD; roadCount++;
                    }
                }
            }
        }

        // Verify connectivity and strip disconnected roads
        const connectedRoads = this._findConnectedRoads(grid, W, H, thLX, thLY, thW, thH);
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
                if (grid[y * W + x] === ROAD && !connectedRoads.has(y * W + x))
                    grid[y * W + x] = FREE;

        const buildings = [{ ...thEntry, x: thLX + offX, y: thLY + offY }];
        let buildingsPlaced = 0;
        const centerLX = thLX + thW / 2;
        const centerLY = thLY + thH / 2;

        // Phase A: place large buildings at road corner outer slots (exactly 1 road touch each)
        const { large: lgBlds } = this._classifyBuildings(roadBuildings);
        const lgFirst = [...lgBlds].sort((a, b) => (b.width * b.height) - (a.width * a.height));
        buildingsPlaced += this._placeAtCorners(grid, W, H, connectedRoads, buildings, lgFirst, offX, offY);

        // Phase B: place remaining buildings road-adjacent — large/medium first, small (≤2) last
        const sorted = [...roadBuildings].sort((a, b) => {
            const tier = x => {
                if (Math.max(x.width, x.height) <= 2) return 2; // small → last
                if (Math.min(x.width, x.height) > 5)  return 0; // large → first
                return 1;                                         // medium → middle
            };
            if (tier(a) !== tier(b)) return tier(a) - tier(b);
            return (b.width * b.height) - (a.width * a.height);
        });
        for (const b of sorted) {
            if (b._snakePlaced || b._cornerPlaced) continue;
            const pos = this._findBestRoadAdjacentPos(grid, W, H, b, centerLX, centerLY, connectedRoads);
            if (pos) {
                const [lx, ly] = pos;
                this._stampBuilding(grid, W, lx, ly, b, buildings, offX, offY);
                buildingsPlaced++;
                b._snakePlaced = true;
                this._expandConnectedRoads(grid, W, H, lx, ly, b.width, b.height, connectedRoads);
            }
        }

        for (const b of roadBuildings) { delete b._snakePlaced; delete b._cornerPlaced; }

        roadCount = this._pruneDeadEndRoads(grid, W, H, buildings, offX, offY);
        return { grid, buildings, roadCount, buildingsPlaced, thLX, thLY };
    }

    /**


    /**
     * Scan every road cell for corners (exactly 1 horizontal + 1 vertical road neighbour).
     * For each corner, compute two outer-quadrant slot positions where a large building
     * can be placed touching exactly 1 road cell (the corner cell itself).
     *
     * Slot A — building's edge runs parallel to the horizontal road arm:
     *   the building's innermost row is flush with the corner row (cy),
     *   so only the corner cell touches the building's perpendicular edge.
     *
     * Slot B — building's edge runs parallel to the vertical road arm:
     *   the building's innermost column is flush with the corner column (cx),
     *   so only the corner cell touches the building's perpendicular edge.
     *
     * Buildings are tried largest-area first; one per corner.
     * Placed buildings are marked with b._cornerPlaced = true.
     * Returns the count of newly placed buildings.
     */
    _placeAtCorners(grid, W, H, connectedRoads, buildings, largeSorted, offX, offY) {
        const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
        const isH = d => d < 2;
        let placed = 0;

        for (let cy = 0; cy < H; cy++) {
            for (let cx = 0; cx < W; cx++) {
                if (grid[cy * W + cx] !== ROAD) continue;

                // Collect road/TH neighbours
                const roadDirs = [];
                for (let d = 0; d < 4; d++) {
                    const nx = cx + DX[d], ny = cy + DY[d];
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    const v = grid[ny * W + nx];
                    if (v === ROAD || v === TOWNHALL) roadDirs.push(d);
                }
                // Corner = exactly 2 neighbours on perpendicular axes
                if (roadDirs.length !== 2) continue;
                const [da, db] = roadDirs;
                if (isH(da) === isH(db)) continue; // both horizontal or both vertical → straight

                const hDir = isH(da) ? da : db; // 0 = right (+x), 1 = left (−x)
                const vDir = isH(da) ? db : da; // 2 = down (+y), 3 = up  (−y)

                // Outer quadrant: opposite to both road arms
                const odx = -DX[hDir]; // road→right  ⇒ outer←left  (odx=−1), vice-versa
                const ody = -DY[vDir]; // road→down   ⇒ outer↑up    (ody=−1), vice-versa

                for (const b of largeSorted) {
                    if (b._cornerPlaced) continue;
                    const bw = b.width, bh = b.height;

                    // Slot B (preferred): building fully in outer quadrant, face-to-face with road.
                    //   Building's right/left column = cx (includes corner col), fully above/below road.
                    //   odx=−1 → lxB = cx−bw+1  (right col = cx)
                    //   odx=+1 → lxB = cx        (left  col = cx)
                    //   ody=−1 → lyB = cy−bh     (bottom row = cy−1, fully above road)
                    //   ody=+1 → lyB = cy+1       (top    row = cy+1, fully below road)
                    const lxB = odx === -1 ? cx - bw + 1 : cx;
                    const lyB = ody === -1 ? cy - bh      : cy + 1;

                    // Slot A (fallback): building's side face touches corner — bottom/top row at cy.
                    //   odx=−1 → lxA = cx−bw  (right col = cx−1, side-adjacent to corner col)
                    //   odx=+1 → lxA = cx+1   (left  col = cx+1, side-adjacent to corner col)
                    //   ody=−1 → lyA = cy−bh+1 (bottom row = cy, at road level)
                    //   ody=+1 → lyA = cy       (top    row = cy, at road level)
                    const lxA = odx === -1 ? cx - bw     : cx + 1;
                    const lyA = ody === -1 ? cy - bh + 1 : cy;

                    let didPlace = false;
                    for (const [lx, ly] of [[lxB, lyB], [lxA, lyA]]) {
                        if (this._tryPlaceBuilding(grid, W, H, lx, ly, b, connectedRoads, buildings, offX, offY)) {
                            placed++;
                            b._cornerPlaced = true;
                            this._expandConnectedRoads(grid, W, H, lx, ly, bw, bh, connectedRoads);
                            didPlace = true;
                            break;
                        }
                    }
                    if (didPlace) break; // one large building per corner
                }
            }
        }
        return placed;
    }

    _tryPlaceBuilding(grid, W, H, lx, ly, b, connectedRoads, buildings, offX, offY) {
        const bw = b.width, bh = b.height;
        if (!this._isAreaFreeFG(grid, W, H, lx, ly, bw, bh)) return false;
        if (!this._touchesConnectedRoad(grid, W, H, lx, ly, bw, bh, connectedRoads)) return false;

        let roadTouchCount = 0;
        for (let dx = 0; dx < bw; dx++) {
            if (ly > 0 && grid[(ly - 1) * W + lx + dx] === ROAD) roadTouchCount++;
            if (ly + bh < H && grid[(ly + bh) * W + lx + dx] === ROAD) roadTouchCount++;
        }
        for (let dy = 0; dy < bh; dy++) {
            if (lx > 0 && grid[(ly + dy) * W + lx - 1] === ROAD) roadTouchCount++;
            if (lx + bw < W && grid[(ly + dy) * W + lx + bw] === ROAD) roadTouchCount++;
        }
        const isLargeBld = Math.min(bw, bh) > 5;
        if (isLargeBld && roadTouchCount > 2) return false; // large: max 2 touches (road tip, not alongside)
        if (!isLargeBld && roadTouchCount > Math.min(bw, bh) + 1) return false;
        if (roadTouchCount > 6) return false;

        this._stampBuilding(grid, W, lx, ly, b, buildings, offX, offY);
        return true;
    }

    _stampBuilding(grid, W, lx, ly, b, buildings, offX, offY) {
        for (let dy = 0; dy < b.height; dy++)
            for (let dx = 0; dx < b.width; dx++)
                grid[(ly + dy) * W + (lx + dx)] = BUILDING;
        buildings.push({ ...b, x: lx + offX, y: ly + offY });
    }

    _touchesConnectedRoad(grid, W, H, lx, ly, bw, bh, connectedRoads) {
        for (let dx = 0; dx < bw; dx++) {
            if (ly > 0 && connectedRoads.has((ly - 1) * W + lx + dx)) return true;
            if (ly + bh < H && connectedRoads.has((ly + bh) * W + lx + dx)) return true;
        }
        for (let dy = 0; dy < bh; dy++) {
            if (lx > 0 && connectedRoads.has((ly + dy) * W + lx - 1)) return true;
            if (lx + bw < W && connectedRoads.has((ly + dy) * W + lx + bw)) return true;
        }
        return false;
    }

    _pruneDeadEndRoads(grid, W, H, buildings, offX, offY) {
        const buildingAdj = new Set();
        for (const placed of buildings) {
            const blx = placed.x - offX, bly = placed.y - offY;
            const pw = placed.width, ph = placed.height;
            for (let dx = 0; dx < pw; dx++) {
                if (bly - 1 >= 0)    buildingAdj.add((bly - 1) * W + blx + dx);
                if (bly + ph < H)    buildingAdj.add((bly + ph) * W + blx + dx);
            }
            for (let dy = 0; dy < ph; dy++) {
                if (blx - 1 >= 0)    buildingAdj.add((bly + dy) * W + blx - 1);
                if (blx + pw < W)    buildingAdj.add((bly + dy) * W + blx + pw);
            }
        }

        let roadCells = [];
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
                if (grid[y * W + x] === ROAD) roadCells.push(y * W + x);

        const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
        let changed = true;
        while (changed) {
            changed = false;
            const kept = [];
            for (const idx of roadCells) {
                if (grid[idx] !== ROAD) continue;
                if (buildingAdj.has(idx)) { kept.push(idx); continue; }
                const rx = idx % W, ry = (idx - rx) / W;
                let neighbors = 0;
                for (let d = 0; d < 4; d++) {
                    const nx = rx + DX[d], ny = ry + DY[d];
                    if (nx >= 0 && ny >= 0 && nx < W && ny < H) {
                        const nv = grid[ny * W + nx];
                        if (nv === ROAD || nv === TOWNHALL) neighbors++;
                    }
                }
                if (neighbors <= 1) { grid[idx] = FREE; changed = true; }
                else { kept.push(idx); }
            }
            roadCells = kept;
        }
        return roadCells.length;
    }

    // ========================================================================
    // FLAT GRID HELPERS
    // ========================================================================

    _isAreaFreeFG(grid, W, H, lx, ly, w, h) {
        if (lx < 0 || ly < 0 || lx + w > W || ly + h > H) return false;
        for (let dy = 0; dy < h; dy++)
            for (let dx = 0; dx < w; dx++)
                if (grid[(ly + dy) * W + (lx + dx)] !== FREE) return false;
        return true;
    }

    _findNearestFreeFG(grid, W, H, w, h, targetLX, targetLY) {
        const maxDist = W + H;
        for (let d = 0; d <= maxDist; d++) {
            for (let dy = -d; dy <= d; dy++) {
                const dxRange = d - Math.abs(dy);
                for (const dx of (dxRange === 0 ? [0] : [-dxRange, dxRange])) {
                    const lx = targetLX + dx, ly = targetLY + dy;
                    if (this._isAreaFreeFG(grid, W, H, lx, ly, w, h)) return [lx, ly];
                }
            }
        }
        return null;
    }

    // ========================================================================
    // 2D GRID HELPERS (post-processing)
    // ========================================================================

    _findNearestFreePos2D(grid, W, H, w, h, targetLX, targetLY) {
        const maxDist = W + H;
        for (let d = 0; d <= maxDist; d++) {
            for (let dy = -d; dy <= d; dy++) {
                const dxRange = d - Math.abs(dy);
                for (const dx of (dxRange === 0 ? [0] : [-dxRange, dxRange])) {
                    const lx = targetLX + dx, ly = targetLY + dy;
                    if (lx < 0 || ly < 0 || lx + w > W || ly + h > H) continue;
                    let free = true;
                    outer:
                    for (let r = 0; r < h; r++)
                        for (let c = 0; c < w; c++)
                            if (grid[ly + r][lx + c] !== null) { free = false; break outer; }
                    if (free) return [lx, ly];
                }
            }
        }
        return null;
    }

    _pruneRoads2D(grid, W, H, buildings, offX, offY) {
        const buildingAdj = new Set();
        for (const b of buildings) {
            const blx = b.x - offX, bly = b.y - offY;
            for (let dx = 0; dx < b.width; dx++) {
                if (bly - 1 >= 0)          buildingAdj.add(`${blx + dx},${bly - 1}`);
                if (bly + b.height < H)    buildingAdj.add(`${blx + dx},${bly + b.height}`);
            }
            for (let dy = 0; dy < b.height; dy++) {
                if (blx - 1 >= 0)          buildingAdj.add(`${blx - 1},${bly + dy}`);
                if (blx + b.width < W)     buildingAdj.add(`${blx + b.width},${bly + dy}`);
            }
        }

        const roadCells = [];
        for (let ly = 0; ly < H; ly++)
            for (let lx = 0; lx < W; lx++)
                if (grid[ly][lx] === 'R') roadCells.push([lx, ly]);

        const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = roadCells.length - 1; i >= 0; i--) {
                const [lx, ly] = roadCells[i];
                if (grid[ly][lx] !== 'R') continue;
                if (buildingAdj.has(`${lx},${ly}`)) continue;
                let neighbors = 0;
                for (let d = 0; d < 4; d++) {
                    const nx = lx + DX[d], ny = ly + DY[d];
                    if (nx >= 0 && ny >= 0 && nx < W && ny < H)
                        if (grid[ny][nx] === 'R' || grid[ny][nx] === 'T') neighbors++;
                }
                if (neighbors <= 1) {
                    grid[ly][lx] = null;
                    roadCells.splice(i, 1);
                    changed = true;
                }
            }
        }

        const finalRoads = new Set();
        for (const [lx, ly] of roadCells)
            if (grid[ly][lx] === 'R') finalRoads.add(`${lx + offX},${ly + offY}`);
        return finalRoads;
    }

    _compactBuildings(grid, W, H, buildings, centerLX, centerLY, offX, offY) {
        const MAX_PASSES = 5;
        for (let pass = 0; pass < MAX_PASSES; pass++) {
            let moved = false;
            const sorted = buildings
                .filter(b => !this.p.isTownhall(b))
                .sort((a, b) => (a.width * a.height) - (b.width * b.height));

            for (const b of sorted) {
                // Large buildings are placed at specific road corners; compacting them
                // 1 cell toward centre changes their road-adjacency face (correct →
                // side-touching), producing the "wrong corner" visual. Skip them.
                if (Math.min(b.width, b.height) > 5) continue;
                const blx = b.x - offX, bly = b.y - offY;
                const bCX = blx + b.width / 2, bCY = bly + b.height / 2;
                const dxDir = centerLX - bCX, dyDir = centerLY - bCY;

                const moves = [];
                if (Math.abs(dxDir) >= Math.abs(dyDir)) {
                    if (dxDir > 0) moves.push([1, 0]); else if (dxDir < 0) moves.push([-1, 0]);
                    if (dyDir > 0) moves.push([0, 1]); else if (dyDir < 0) moves.push([0, -1]);
                } else {
                    if (dyDir > 0) moves.push([0, 1]); else if (dyDir < 0) moves.push([0, -1]);
                    if (dxDir > 0) moves.push([1, 0]); else if (dxDir < 0) moves.push([-1, 0]);
                }

                for (const [mx, my] of moves) {
                    const nlx = blx + mx, nly = bly + my;
                    if (nlx < 0 || nly < 0 || nlx + b.width > W || nly + b.height > H) continue;

                    for (let dy = 0; dy < b.height; dy++)
                        for (let dx = 0; dx < b.width; dx++)
                            grid[bly + dy][blx + dx] = null;

                    let free = true;
                    for (let dy = 0; dy < b.height && free; dy++)
                        for (let dx = 0; dx < b.width && free; dx++)
                            if (grid[nly + dy][nlx + dx] !== null) free = false;

                    if (free) {
                        let touchesRoad = !b.needsRoad;
                        if (!touchesRoad) {
                            for (let dx = 0; dx < b.width && !touchesRoad; dx++) {
                                if (nly - 1 >= 0 && grid[nly - 1][nlx + dx] === 'R') touchesRoad = true;
                                if (nly + b.height < H && grid[nly + b.height][nlx + dx] === 'R') touchesRoad = true;
                            }
                            for (let dy = 0; dy < b.height && !touchesRoad; dy++) {
                                if (nlx - 1 >= 0 && grid[nly + dy][nlx - 1] === 'R') touchesRoad = true;
                                if (nlx + b.width < W && grid[nly + dy][nlx + b.width] === 'R') touchesRoad = true;
                            }
                        }
                        if (touchesRoad) {
                            for (let dy = 0; dy < b.height; dy++)
                                for (let dx = 0; dx < b.width; dx++)
                                    grid[nly + dy][nlx + dx] = 'B';
                            b.x = nlx + offX; b.y = nly + offY;
                            moved = true;
                            break;
                        }
                    }
                    for (let dy = 0; dy < b.height; dy++)
                        for (let dx = 0; dx < b.width; dx++)
                            grid[bly + dy][blx + dx] = 'B';
                }
            }
            if (!moved) break;
        }
    }

    _placeRoadlessInGrid(grid, W, H, buildings, roadlessBuildings, centerLX, centerLY, offX, offY) {
        const sorted = [...roadlessBuildings].sort((a, b) => (b.width * b.height) - (a.width * a.height));
        for (const b of sorted) {
            let bestPos = null, bestDist = Infinity;
            for (let ly = 0; ly <= H - b.height; ly++) {
                lxloop:
                for (let lx = 0; lx <= W - b.width; lx++) {
                    for (let dy = 0; dy < b.height; dy++)
                        for (let dx = 0; dx < b.width; dx++)
                            if (grid[ly + dy][lx + dx] !== null) continue lxloop;
                    const dist = Math.abs(lx + b.width / 2 - centerLX) + Math.abs(ly + b.height / 2 - centerLY);
                    if (dist < bestDist) { bestDist = dist; bestPos = [lx, ly]; }
                }
            }
            if (bestPos) {
                const [lx, ly] = bestPos;
                for (let dy = 0; dy < b.height; dy++)
                    for (let dx = 0; dx < b.width; dx++)
                        grid[ly + dy][lx + dx] = 'B';
                buildings.push({ ...b, x: lx + offX, y: ly + offY });
                b._roadlessPlaced = true;
            }
        }
    }

    // Try to place all medium buildings road-adjacent, retrying with shuffled
    // orderings until all are placed or 30 seconds elapse. Returns the best result found.
    _placeMediumBuildingsRetry(gridBase, connRoadsBase, W, H, medBuildings, offX, offY, centerLX, centerLY) {
        const MEDIUM_TIME_LIMIT = 30_000;
        const start = Date.now();
        if (medBuildings.length === 0)
            return { placed: [], grid: new Uint8Array(gridBase), connectedRoads: new Set(connRoadsBase) };

        let bestCount = -1;
        let bestPlaced = [];
        let bestGrid = new Uint8Array(gridBase);
        let bestConnRoads = new Set(connRoadsBase);

        const order = [...medBuildings];

        while (true) {
            const grid = new Uint8Array(gridBase);
            const connectedRoads = new Set(connRoadsBase);
            const placed = [];
            const tempBuildings = []; // throwaway — _stampBuilding needs an array param

            // Pass 1: place buildings with their shorter side facing the road
            const placedSet = new Set();
            for (const b of order) {
                const pos = this._findBestRoadAdjacentPos(grid, W, H, b, centerLX, centerLY, connectedRoads, true);
                if (pos) {
                    const [lx, ly] = pos;
                    this._stampBuilding(grid, W, lx, ly, b, tempBuildings, offX, offY);
                    this._expandConnectedRoads(grid, W, H, lx, ly, b.width, b.height, connectedRoads);
                    placed.push({ b, lx, ly });
                    placedSet.add(b);
                }
            }
            // Pass 2: remaining buildings with any orientation
            for (const b of order) {
                if (placedSet.has(b)) continue;
                const pos = this._findBestRoadAdjacentPos(grid, W, H, b, centerLX, centerLY, connectedRoads);
                if (pos) {
                    const [lx, ly] = pos;
                    this._stampBuilding(grid, W, lx, ly, b, tempBuildings, offX, offY);
                    this._expandConnectedRoads(grid, W, H, lx, ly, b.width, b.height, connectedRoads);
                    placed.push({ b, lx, ly });
                }
            }

            if (placed.length > bestCount) {
                bestCount = placed.length;
                bestPlaced = placed;
                bestGrid = new Uint8Array(grid);
                bestConnRoads = new Set(connectedRoads);
            }

            if (placed.length === medBuildings.length) break; // all placed — success
            if (Date.now() - start >= MEDIUM_TIME_LIMIT) break; // timeout — use best so far

            // Fisher-Yates shuffle for next attempt
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
        }

        return { placed: bestPlaced, grid: bestGrid, connectedRoads: bestConnRoads };
    }

    /**
     * Fill small road-adjacent gaps with unplaced small buildings (max(w,h) <= 2).
     * Prefers positions surrounded by more buildings (true gap-filling).
     * Operates on the flat Uint8Array grid. Returns the count of newly placed buildings.
     */
    _gapFillSmallBuildings(grid, W, H, connectedRoads, buildings, smallPool, offX, offY) {
        const candidates = smallPool
            .filter(b => !b._snakePlaced && !b._cornerPlaced && !b._gapFilled)
            .sort((a, b) => (b.width * b.height) - (a.width * a.height)); // 2x2 > 2x1 > 1x1

        let placed = 0;
        for (const b of candidates) {
            const bw = b.width, bh = b.height;
            let bestPos = null, bestScore = Infinity;

            for (let ly = 0; ly <= H - bh; ly++) {
                for (let lx = 0; lx <= W - bw; lx++) {
                    if (!this._isAreaFreeFG(grid, W, H, lx, ly, bw, bh)) continue;
                    if (!this._touchesConnectedRoad(grid, W, H, lx, ly, bw, bh, connectedRoads)) continue;

                    // Count adjacent building/TH cells — more neighbors = tighter gap fill
                    let adj = 0;
                    for (let dx = 0; dx < bw; dx++) {
                        if (ly > 0     && (grid[(ly - 1)  * W + lx + dx] === BUILDING || grid[(ly - 1)  * W + lx + dx] === TOWNHALL)) adj++;
                        if (ly + bh < H && (grid[(ly + bh) * W + lx + dx] === BUILDING || grid[(ly + bh) * W + lx + dx] === TOWNHALL)) adj++;
                    }
                    for (let dy = 0; dy < bh; dy++) {
                        if (lx > 0     && (grid[(ly + dy) * W + lx - 1]  === BUILDING || grid[(ly + dy) * W + lx - 1]  === TOWNHALL)) adj++;
                        if (lx + bw < W && (grid[(ly + dy) * W + lx + bw] === BUILDING || grid[(ly + dy) * W + lx + bw] === TOWNHALL)) adj++;
                    }

                    const score = -adj; // lower = better (more neighbors)
                    if (score < bestScore) {
                        bestScore = score;
                        bestPos = [lx, ly];
                    }
                }
            }

            if (bestPos) {
                this._stampBuilding(grid, W, bestPos[0], bestPos[1], b, buildings, offX, offY);
                this._expandConnectedRoads(grid, W, H, bestPos[0], bestPos[1], bw, bh, connectedRoads);
                b._gapFilled = true;
                placed++;
            }
        }
        return placed;
    }

    _isRoadlessCity() {
        const p = this.p;
        if (p.activeCityType === 'settlement') {
            const st = SETTLEMENT_TYPES.find(s => s.id === p.activeSettlementType);
            return st && !st.hasRoads;
        }
        if (p.activeCityType === 'colony') {
            const ct = COLONY_TYPES.find(c => c.id === p.activeColonyType);
            return ct && !ct.hasRoads;
        }
        return false;
    }
}
