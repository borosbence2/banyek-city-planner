import { Utils } from './utils.js';

export class Optimizer {
    constructor(planner) {
        this.p = planner;
        this._snapshot = null;
        this._running  = false;
    }

    async run() {
        if (this._running) return;
        const p = this.p;

        if (p.buildings.length === 0) {
            alert('No buildings to optimize!');
            return;
        }

        this._running = true;
        this.setProgress(0, 'Starting optimization...');
        document.getElementById('progressContainer').classList.add('active');
        document.getElementById('optimizeBtn').disabled = true;

        try {
            await this._core();
            document.getElementById('undoOptimizeBtn').style.display = 'block';
            alert('Optimization complete!');
        } catch (err) {
            console.error('Optimizer error:', err);
            alert('Optimization failed: ' + err.message);
        } finally {
            this._running = false;
            document.getElementById('progressContainer').classList.remove('active');
            document.getElementById('optimizeBtn').disabled = false;
        }
    }

    undo() {
        if (!this._snapshot) {
            alert('No optimization to undo!');
            return;
        }
        const p = this.p;
        p.buildings  = this._snapshot.buildings;
        p.roads      = this._snapshot.roads;
        p.gridWidth  = this._snapshot.gridWidth;
        p.gridHeight = this._snapshot.gridHeight;

        document.getElementById('gridWidth').value  = p.gridWidth;
        document.getElementById('gridHeight').value = p.gridHeight;

        this._snapshot = null;
        document.getElementById('undoOptimizeBtn').style.display = 'none';

        p.resizeCanvas();
        p.renderer.draw();
        alert('Optimization undone!');
    }

    setProgress(percent, text) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = text;
    }

    yieldUI() {
        return Utils.sleep(10);
    }

    // ----------------------------------------
    // BFS optimizer core
    // ----------------------------------------
    async _core() {
        const p = this.p;

        this._snapshot = {
            buildings:  Utils.deepClone(p.buildings),
            roads:      new Set(p.roads),
            gridWidth:  p.gridWidth,
            gridHeight: p.gridHeight,
        };

        this.setProgress(5, 'Initializing grid...');
        await this.yieldUI();

        const W = p.gridWidth;
        const H = p.gridHeight;

        const grid = Array.from({ length: H }, () => Array(W).fill(null));

        const newBuildings  = [];
        const connectedRoads = new Set();

        // --- Helpers ---
        const inBounds   = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
        const isAreaFree = (x, y, w, h) => {
            if (!inBounds(x, y) || !inBounds(x + w - 1, y + h - 1)) return false;
            for (let dy = 0; dy < h; dy++)
                for (let dx = 0; dx < w; dx++)
                    if (grid[y + dy][x + dx] !== null) return false;
            return true;
        };
        const markArea = (x, y, w, h) => {
            for (let dy = 0; dy < h; dy++)
                for (let dx = 0; dx < w; dx++)
                    grid[y + dy][x + dx] = 'B';
        };
        const getNeighbors = (x, y) => [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
        ].filter(([nx, ny]) => inBounds(nx, ny));

        // --- Place Town Hall at center ---
        const townHall = p.buildings.find(b => b.type === 'townhall');
        if (!townHall) throw new Error('No Town Hall found to optimize around');

        const thX = Math.floor(W / 2 - townHall.width  / 2);
        const thY = Math.floor(H / 2 - townHall.height / 2);
        if (!isAreaFree(thX, thY, townHall.width, townHall.height)) {
            throw new Error('Cannot place Town Hall at center — grid too small');
        }

        newBuildings.push({ ...townHall, x: thX, y: thY });
        markArea(thX, thY, townHall.width, townHall.height);

        const isAdjacentToTownHall = (x, y) => {
            for (let dy = 0; dy < townHall.height; dy++)
                for (let dx = 0; dx < townHall.width; dx++)
                    if (Math.abs(thX + dx - x) + Math.abs(thY + dy - y) === 1) return true;
            return false;
        };

        const candidates = p.buildings
            .filter(b => b.type !== 'townhall' && b.needsRoad)
            .sort((a, b) => (b.width * b.height) - (a.width * a.height));

        this.setProgress(15, `Placing ${candidates.length} buildings via BFS...`);
        await this.yieldUI();

        for (const b of candidates) {
            let placed = false;

            outer:
            for (let y = 0; y < H && !placed; y++) {
                for (let x = 0; x < W && !placed; x++) {
                    if (!isAreaFree(x, y, b.width, b.height)) continue;

                    // Collect edge tiles around this candidate position
                    const edgeTiles = [];
                    for (let dx = 0; dx < b.width;  dx++) { edgeTiles.push([x + dx, y - 1]); edgeTiles.push([x + dx, y + b.height]); }
                    for (let dy = 0; dy < b.height; dy++) { edgeTiles.push([x - 1, y + dy]); edgeTiles.push([x + b.width, y + dy]); }

                    for (const [sx, sy] of edgeTiles) {
                        if (!inBounds(sx, sy) || grid[sy][sx] !== null) continue;

                        const queue   = [[sx, sy]];
                        const visited = new Set([`${sx},${sy}`]);
                        const parent  = new Map();
                        let found = null;

                        bfs:
                        while (queue.length > 0) {
                            const [cx, cy] = queue.shift();
                            if (isAdjacentToTownHall(cx, cy) || connectedRoads.has(`${cx},${cy}`)) {
                                found = [cx, cy];
                                break bfs;
                            }
                            for (const [nx, ny] of getNeighbors(cx, cy)) {
                                const key = `${nx},${ny}`;
                                if (!visited.has(key) && grid[ny][nx] === null) {
                                    visited.add(key);
                                    parent.set(key, `${cx},${cy}`);
                                    queue.push([nx, ny]);
                                }
                            }
                        }

                        if (found) {
                            newBuildings.push({ ...b, x, y });
                            markArea(x, y, b.width, b.height);

                            // Backtrack through parent map to carve road path
                            let [rx, ry] = found;
                            while (true) {
                                const key = `${rx},${ry}`;
                                grid[ry][rx] = 'R';
                                connectedRoads.add(key);
                                if (!parent.has(key)) break;
                                [rx, ry] = parent.get(key).split(',').map(Number);
                            }

                            placed = true;
                            break outer;
                        }
                    }
                }
            }

            if (!placed) console.warn('Could not place building:', b.name);
            await this.yieldUI();
        }

        p.buildings = newBuildings;
        p.roads     = connectedRoads;

        this.setProgress(100, 'Complete!');
        p.renderer.draw();
    }
}
