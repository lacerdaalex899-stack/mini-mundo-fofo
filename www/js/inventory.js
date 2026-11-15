import { B, BD, IT, GROUPS, RECIPES, itemName, isFlower } from './blocks.js';

export const Inv = {
  slots: {},            // id -> count
  hotbar: [0, 0, 0, 0, 0, 0],
  sel: 0,
  onChange: null,
  reset() {
    this.slots = {}; this.hotbar = [0, 0, 0, 0, 0, 0]; this.sel = 0;
    this.add(108, 3);
    this._fire();
  },
  count(id) { return this.slots[id] || 0; },
  countGroup(gid) { let n = 0; for (const i of GROUPS[gid].ids) n += this.count(i); return n; },
  add(id, n = 1) {
    this.slots[id] = (this.slots[id] || 0) + n;
    // auto-coloca na hotbar se tiver espaço e ainda não estiver
    if (!this.hotbar.includes(id)) { const i = this.hotbar.indexOf(0); if (i >= 0) this.hotbar[i] = id; }
    this._fire();
  },
  take(id, n = 1) {
    if ((this.slots[id] || 0) < n) return false;
    this.slots[id] -= n;
    if (this.slots[id] <= 0) { delete this.slots[id]; const i = this.hotbar.indexOf(id); if (i >= 0) this.hotbar[i] = 0; }
    this._fire(); return true;
  },
  takeGroup(gid, n) {
    if (this.countGroup(gid) < n) return false;
    for (const i of GROUPS[gid].ids) { while (n > 0 && this.count(i) > 0) { this.take(i, 1); n--; } }
    return true;
  },
  selected() { return this.hotbar[this.sel] || 0; },
  canCraft(r) { for (const [id, n] of r.ins) { if (id < 0 ? this.countGroup(id) < n : this.count(id) < n) return false; } return true; },
  craft(r) {
    if (!this.canCraft(r)) return false;
    for (const [id, n] of r.ins) { id < 0 ? this.takeGroup(id, n) : this.take(id, n); }
    this.add(r.out, r.n);
    return true;
  },
  _fire() { if (this.onChange) this.onChange(); },
};
