import { G, THREE, hash2, hash3, makeNoise, clamp, lerp, smooth, strHash } from './g.js';
import { B, BD, isPlant, isLeaf } from './blocks.js';

export const CS = 16, CH = 64, SEA = 24;
// paleta de flores por bioma (todas esculpidas em camadas, variando a cor)
const FLOWER_PAL = {
  flower: [B.ROSE, B.ROSE_P, B.ROSE_W, B.ROSE_Y, B.ROSE_B, B.ROSE_V, B.TULIP, B.TULIP_P, B.DAISY, B.HYD, B.HYD_P, B.LAV, B.SUNF, B.CHERRY_F],
  plains: [B.DAISY, B.ROSE, B.ROSE_P, B.TULIP, B.SUNF, B.DAISY, B.ROSE_Y],
  forest: [B.CHERRY_F, B.HYD, B.ROSE_W, B.ROSE_V, B.DAISY, B.HYD_P],
  pine: [B.LAV, B.ROSE_B, B.HYD, B.DAISY],
  beachy: [B.TULIP_P, B.DAISY, B.ROSE_Y],
};
const key = (cx, cz) => cx + ',' + cz;

export const World = {
  seed: 1234, chunks: new Map(), edits: new Map(), dirty: new Set(), group: null,
  noise: null, nCave: null,
  init(seed) {
    this.seed = seed >>> 0; this.chunks.forEach(c => c.dispose && c.dispose()); this.chunks.clear(); this.edits.clear(); this.dirty.clear();
    if (this.group) G.scene.remove(this.group);
    this.group = new THREE.Group(); G.scene.add(this.group);
    this.noise = makeNoise(this.seed); this.nCave = makeNoise(this.seed ^ 0x9e3779b9);
  },
  // ---- geração de terreno ----
  height(x, z) {
    const n = this.noise;
    const cont = n.n2(x * 0.0035, z * 0.0035);                        // continente
    const hills = n.n2(x * 0.015, z * 0.015) * 0.6 + n.n2(x * 0.045, z * 0.045) * 0.25; // montes
    const mt = Math.max(0, n.n2(x * 0.008 + 100, z * 0.008 - 50));    // montanhas
    let h = SEA + 2 + cont * 10 + hills * 7 + mt * mt * 30;
    // vale do rio: banda senoidal serpenteando
    const rb = this.riverDist(x, z);
    if (rb < 1) h = lerp(SEA - 3.2, h, smooth(0.25, 1, rb));
    return h;
  },
  riverDist(x, z) { // 0 no centro do rio, 1 fora
    const n = this.noise;
    const w = n.n2(x * 0.004 + 31.7, z * 0.004 - 11.2) + n.n2(x * 0.011 - 7.3, z * 0.011 + 3.1) * 0.35;
    return clamp(Math.abs(w) * 9.0, 0, 1);
  },
  biome(x, z) {
    const n = this.noise;
    const t = n.n2(x * 0.0045 + 500, z * 0.0045 + 500); // temperatura
    if (t > 0.42) return 'beachy';
    if (t < -0.42) return 'pine';
    const f = n.n2(x * 0.006 - 300, z * 0.006 + 200);
    if (f > 0.3) return 'forest';
    if (f < -0.35) return 'flower';
    return 'plains';
  },
  genChunk(cx, cz) {
    const data = new Uint8Array(CS * CH * CS);
    const idx = (x, y, z) => (y * CS + z) * CS + x;
    const hmap = new Float32Array(CS * CS);
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const wx = cx * CS + lx, wz = cz * CS + lz;
      const h = this.height(wx, wz); hmap[lz * CS + lx] = h;
      const hi = Math.min(CH - 2, Math.floor(h));
      const bio = this.biome(wx, wz);
      for (let y = 0; y <= Math.max(hi, SEA); y++) {
        let b = B.AIR;
        if (y === 0) b = B.BEDROCK;
        else if (y <= hi) {
          if (y === hi) {
            if (hi <= SEA + 1) b = B.SAND;
            else if (hi > 46) b = B.SNOW;
            else b = B.GRASS;
          } else if (y > hi - 3) b = hi <= SEA + 1 ? B.SAND : B.DIRT;
          else {
            b = B.STONE;
            // cavernas
            const c = this.nCave.n3(wx * 0.055, y * 0.075, wz * 0.055);
            const c2 = this.nCave.n3(wx * 0.03 + 80, y * 0.045, wz * 0.03 - 40);
            if ((c > 0.58 || (Math.abs(c2) < 0.055 && y < hi - 6)) && y > 1) b = B.AIR;
            else {
              const r = hash3(wx, y, wz, this.seed);
              if (r < 0.013 && y < 40) b = B.COAL;
              else if (r < 0.020 && y < 28) b = B.IRON;
              else if (r < 0.0235 && y < 18) b = B.GOLD;
              else if (r < 0.026 && y < 12) b = B.CRYS;
            }
          }
        } else if (y <= SEA) b = B.WATER;
        if (b) data[idx(lx, y, lz)] = b;
      }
      // decoração de superfície
      const hiY = hi + 1;
      if (hi > SEA + 1 && hi < 46 && data[idx(lx, hi, lz)] === B.GRASS && hiY < CH - 8) {
        const r = hash2(wx, wz, this.seed ^ 77);
        const r2 = hash2(wx, wz, this.seed ^ 991);
        const densTree = bio === 'forest' ? 0.028 : bio === 'pine' ? 0.022 : bio === 'flower' ? 0.004 : bio === 'beachy' ? 0.004 : 0.008;
        const densFl = bio === 'flower' ? 0.034 : bio === 'forest' ? 0.011 : bio === 'pine' ? 0.008 : bio === 'beachy' ? 0.004 : 0.012;
        if (r < densTree && lx > 1 && lx < CS - 2 && lz > 1 && lz < CS - 2) {
          this.tree(data, idx, lx, hiY, lz, bio, r2);
        } else if (r < densTree + densFl) {
          const pal = FLOWER_PAL[bio] || FLOWER_PAL.plains;
          data[idx(lx, hiY, lz)] = pal[(r2 * pal.length) | 0];
        } else if (r < densTree + densFl + 0.075) {
          data[idx(lx, hiY, lz)] = r2 < 0.62 ? B.TGRASS : (r2 < 0.78 ? B.FERN : (r2 < 0.88 ? B.WHEAT : (r2 < 0.96 ? B.BUSH : (hash2(wx, wz, 5) < 0.5 ? B.MUSH_R : B.MUSH_B))));
        }
      }
      if (bio === 'beachy' && hi >= SEA && hi <= SEA + 2 && data[idx(lx, hi, lz)] === B.SAND && lx > 1 && lx < CS - 2 && lz > 1 && lz < CS - 2) {
        if (hash2(wx, wz, this.seed ^ 303) < 0.01) this.palm(data, idx, lx, hi + 1, lz);
      }
    }
    return { data, hmap };
  },
  tree(data, idx, x, y, z, bio, r) {
    let log = B.LOG, leaf = B.LEAF, hgt = 4 + ((r * 3) | 0);
    if (bio === 'pine') { log = B.PLOG; leaf = B.PLEAF; hgt = 5 + ((r * 4) | 0); }
    else if (r < 0.18) { log = B.SLOG; leaf = B.SLEAF; }
    else if (r < 0.42) { log = B.BLOG; leaf = B.BLEAF; }
    else if (r > 0.9) { leaf = B.MLEAF; }
    if (bio === 'pine') {
      for (let i = 0; i < hgt; i++) data[idx(x, y + i, z)] = log;
      let rad = 2;
      for (let ly = 1; ly < hgt + 1; ly++) {
        const rr = Math.max(0, rad - ((ly / 1.6) | 0));
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > rr + 0.4) continue;
          const p = idx(x + dx, y + ly, z + dz); if (!data[p]) data[p] = leaf;
        }
      }
      data[idx(x, y + hgt + 1, z)] = leaf;
    } else {
      for (let i = 0; i < hgt; i++) data[idx(x, y + i, z)] = log;
      for (let dy = -1; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const d = dx * dx + dz * dz + dy * dy * 1.6;
        if (d > 6.5 - (dy > 1 ? 2.3 : 0)) continue;
        const p = idx(x + dx, y + hgt - 1 + dy, z + dz);
        if (!data[p]) data[p] = leaf;
      }
    }
  },
  palm(data, idx, x, y, z) {
    const h = 5 + ((hash2(x, z, 9) * 3) | 0);
    for (let i = 0; i < h; i++) data[idx(x, y + i, z)] = B.PALMLOG;
    const ty = y + h;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]])
      if (!data[idx(x + dx, ty, z + dz)]) data[idx(x + dx, ty, z + dz)] = B.PALMLEAF;
    data[idx(x, ty + 1, z)] = B.PALMLEAF;
  },
  // ---- acesso ----
  chunk(cx, cz) {
    const k = key(cx, cz); let c = this.chunks.get(k);
    if (!c) {
      const g = this.genChunk(cx, cz);
      c = { cx, cz, data: g.data, hmap: g.hmap, mesh: null, wmesh: null, built: false, topY: 0 };
      let mh = 0; for (let i = 0; i < CS * CS; i++) if (g.hmap[i] > mh) mh = g.hmap[i];
      c.topY = Math.min(CH - 1, Math.ceil(mh) + 10);
      const ed = this.edits.get(k);
      if (ed) for (const [i, v] of ed) { c.data[i] = v; if (v) { const y = (i / (CS * CS)) | 0; if (y > c.topY) c.topY = y; } }
      this.chunks.set(k, c);
    }
    return c;
  },
  get(x, y, z) {
    if (y < 0) return B.BEDROCK; if (y >= CH) return B.AIR;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const c = this.chunk(cx, cz);
    return c.data[(y * CS + (z - cz * CS)) * CS + (x - cx * CS)];
  },
  set(x, y, z, v, silent) {
    if (y < 1 || y >= CH) return;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const c = this.chunk(cx, cz); const lx = x - cx * CS, lz = z - cz * CS;
    const i = (y * CS + lz) * CS + lx;
    if (c.data[i] === v) return;
    c.data[i] = v;
    if (v && y > c.topY) c.topY = Math.min(CH - 1, y + 1);
    const k = key(cx, cz);
    let ed = this.edits.get(k); if (!ed) { ed = new Map(); this.edits.set(k, ed); }
    ed.set(i, v);
    this.dirty.add(k);
    if (lx === 0) this.dirty.add(key(cx - 1, cz)); if (lx === CS - 1) this.dirty.add(key(cx + 1, cz));
    if (lz === 0) this.dirty.add(key(cx, cz - 1)); if (lz === CS - 1) this.dirty.add(key(cx, cz + 1));
    if (!silent && this.onEdit) this.onEdit(x, y, z, v);
  },
  groundY(x, z) {
    for (let y = CH - 2; y > 0; y--) { const b = this.get(Math.floor(x), y, Math.floor(z)); if (b && b !== B.WATER && !isPlant(b)) return y + 1; }
    return SEA + 2;
  },
  solidAt(x, y, z) { const b = this.get(Math.floor(x), Math.floor(y), Math.floor(z)); return b && BD[b] && BD[b].solid; },
  // aplica edições vindas da rede antes do chunk existir
  applyRemoteEdits(list) { for (const [x, y, z, v] of list) this.set(x, y, z, v, true); },
  serializeEdits() { const out = []; for (const [k, ed] of this.edits) { const [cx, cz] = k.split(',').map(Number); for (const [i, v] of ed) { const y = (i / (CS * CS)) | 0, rz = ((i - y * CS * CS) / CS) | 0, rx = i % CS; out.push([cx * CS + rx, y, cz * CS + rz, v]); } } return out; },
};
export { key };
