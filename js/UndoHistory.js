import { t } from './i18n.js';

const MAX_HISTORY = 50;

export class UndoHistory {
    constructor(planner) {
        this.p = planner;
        this._undoStack = [];
        this._redoStack = [];
    }

    /** Save current state to undo stack, clearing the redo stack. */
    capture() {
        this._undoStack.push(this._snapshot());
        if (this._undoStack.length > MAX_HISTORY) this._undoStack.shift();
        this._redoStack = [];
        this._updateButtons();
    }

    /** Discard the most recently captured snapshot (e.g. when a drag cancelled with no net change). */
    discard() {
        this._undoStack.pop();
        this._updateButtons();
    }

    undo() {
        if (!this._undoStack.length) return;
        this._redoStack.push(this._snapshot());
        this._restore(this._undoStack.pop());
        this._updateButtons();
        this._flashStatus(t('status.undo'));
    }

    redo() {
        if (!this._redoStack.length) return;
        this._undoStack.push(this._snapshot());
        this._restore(this._redoStack.pop());
        this._updateButtons();
        this._flashStatus(t('status.redo'));
    }

    _snapshot() {
        const p = this.p;
        return {
            buildings:    JSON.parse(JSON.stringify(p.buildings)),
            roads:        new Set(p.roads),
            wideRoads:    new Set(p.wideRoads),
            buildingPool: JSON.parse(JSON.stringify(p.buildingPool)),
            unlockedAreas: JSON.parse(JSON.stringify(p.unlockedAreas)),
        };
    }

    _restore(snapshot) {
        const p = this.p;
        p.buildings    = snapshot.buildings;
        p.roads        = snapshot.roads;
        p.wideRoads    = snapshot.wideRoads;
        p.buildingPool = snapshot.buildingPool;
        p.unlockedAreas = snapshot.unlockedAreas;
        p.selectedBuilding = null;
        p.selectedRoad     = null;
        p.rebuildUnlockedCells();
        p.updatePoolPanel();
        p.updateSelectionBanner();
        p.renderer.draw();
    }

    _flashStatus(label) {
        const el = document.getElementById('status');
        if (!el) return;
        el.textContent = t('status.undoCount', { label, count: this._undoStack.length });
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => {
            el.textContent = t('status.selectMove');
        }, 1500);
    }

    _updateButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.disabled = this._undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this._redoStack.length === 0;
    }
}
