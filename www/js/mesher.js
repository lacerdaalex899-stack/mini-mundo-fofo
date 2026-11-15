import { G, THREE, hash2, hash3 } from './g.js';
import { B, BD, isPlant, isLeaf } from './blocks.js';
import { World, CS, CH, SEA, key } from './world.js';
import { plantModel } from './plants.js';

// Materiais com vertex colors + leve "wind" nas folhas/plantas via onBeforeCompile
let matSolid, matWater, matGlassLeaf, matPlant;
function makeMats() {
  matSolid = new THREE.MeshLambertMaterial({ vertexColors: true });
  matPlant = new THREE.MeshLambertMaterial({ vertexColors: true });
  matGlassLeaf = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
  matWater = new THREE.MeshLambertMaterial({ color: 0x58b5f0, transparent: true, opacity: 0.62 });
  // balanço suave das plantas (atributo `sway` = altura dentro do modelo)
  matPlant.onBeforeCompile = (sh) => {
    sh.uniforms.uT = G.uTime;
    sh.vertexShader = 'uniform float uT;\nattribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float sw = sway * 0.055;
       transformed.x += sin(uT*1.7 + position.x*0.8 + position.z*0.55) * sw;
       transformed.z += cos(uT*1.4 + position.x*0.6 - position.z*0.8) * sw * 0.7;`);
  };
}

const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], n: [1, 0, 0], s: 0.80 },
  { d: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], n: [-1, 0, 0], s: 0.80 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], n: [0, 1, 0], s: 1.0 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], n: [0, -1, 0], s: 0.55 },
  { d: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], n: [0, 0, 1], s: 0.90 },
  { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], n: [0, 0, -1], s: 0.70 },
];
const C = new THREE.Color();
// cache de cores já sombreadas (evita recalcular por vértice)
const COLC = new Map();
function colFor(hex, mul, jit) {
  const q = jit === undefined ? 5 : (jit * 5) | 0;              // jitter em 5 níveis (5 = sem jitter)
  const mq = Math.min(63, (mul * 24) | 0);
  const k = hex * 512 + mq * 8 + q;
  let v = COLC.get(k);
  if (!v) {
    C.setHex(hex).multiplyScalar(mul);
    if (q !== 5) { const j = 1 + (q / 4 - 0.5) * 0.09; C.r *= j; C.g *= j; C.b *= j; }
    v = [C.r, C.g, C.b]; COLC.set(k, v);
  }
  return v;
}
// buffer tipado que cresce sozinho (bem mais rápido que array JS com push)
class Buf {
  constructor(T, n) { this.T = T; this.a = new T(n); this.n = 0; }
  need(k) { if (this.n + k > this.a.length) { const b = new this.T(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } }
  p1(x) { this.need(1); this.a[this.n++] = x; }
  p3(x, y, z) { this.need(3); const a = this.a; let n = this.n; a[n] = x; a[n + 1] = y; a[n + 2] = z; this.n = n + 3; }
  p4(a0, b0, c0, d0) { this.need(4); const a = this.a; let n = this.n; a[n] = a0; a[n + 1] = b0; a[n + 2] = c0; a[n + 3] = d0; this.n = n + 4; }
  copy(src) { this.need(src.length); this.a.set(src, this.n); this.n += src.length; }
  copyOff3(src, ox, oy, oz) {
    this.need(src.length); const a = this.a; let n = this.n;
    for (let i = 0; i < src.length; i += 3) { a[n++] = src[i] + ox; a[n++] = src[i + 1] + oy; a[n++] = src[i + 2] + oz; }
    this.n = n;
  }
  copyAdd(src, add) {
    this.need(src.length); const a = this.a; let n = this.n;
    for (let i = 0; i < src.length; i++) a[n++] = src[i] + add;
    this.n = n;
  }
  view() { return this.a.subarray(0, this.n); }
}
const attr = (buf, size) => new THREE.BufferAttribute(buf.view().slice(), size);

export const Mesher = {
  init() { makeMats(); },
  buildChunk(c) {
    if (c.mesh) { c.mesh.geometry.dispose(); World.group.remove(c.mesh); c.mesh = null; }
    if (c.wmesh) { c.wmesh.geometry.dispose(); World.group.remove(c.wmesh); c.wmesh = null; }
    if (c.pmesh) { c.pmesh.geometry.dispose(); World.group.remove(c.pmesh); c.pmesh = null; }
    const P = new Buf(Float32Array, 12288), N = new Buf(Float32Array, 12288), K = new Buf(Float32Array, 12288), I = new Buf(Uint32Array, 8192);
    const WP = new Buf(Float32Array, 512), WI = new Buf(Uint32Array, 512);
    const PP = new Buf(Float32Array, 4096), PN = new Buf(Float32Array, 4096), PK = new Buf(Float32Array, 4096), PI = new Buf(Uint32Array, 4096), PS = new Buf(Float32Array, 2048);
    const ox = c.cx * CS, oz = c.cz * CS;
    const data = c.data;
    const get = (x, y, z) => (x >= 0 && x < CS && z >= 0 && z < CS && y >= 0 && y < CH) ? data[(y * CS + z) * CS + x] : World.get(ox + x, y, oz + z);
    // altura máxima do pedaço: evita varrer o céu vazio
    const maxY = Math.min(CH - 1, Math.max(c.topY || 0, SEA + 2));
    for (let y = 0; y <= maxY; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const b = data[(y * CS + z) * CS + x];
      if (!b) continue;
      const d = BD[b]; const wx = ox + x, wz = oz + z;
      if (d.kind === 'liquid') {
        if (!get(x, y + 1, z)) {
          const b0 = WP.n / 3, h = 0.86;
          WP.p3(wx, y + h, wz); WP.p3(wx + 1, y + h, wz); WP.p3(wx + 1, y + h, wz + 1); WP.p3(wx, y + h, wz + 1);
          WI.p3(b0, b0 + 2, b0 + 1); WI.p3(b0, b0 + 3, b0 + 2);
        }
        continue;
      }
      if (d.kind === 'plant') { this.plantMesh(PP, PN, PK, PI, PS, b, wx, y, wz, c.lod || 0); continue; }
      if (d.kind === 'model' || d.kind === 'bedfoot') { this.modelMesh(P, N, K, I, b, d, wx, y, wz, c); continue; }
      const jit = hash3(wx, y, wz, 11);
      for (let fi = 0; fi < 6; fi++) {
        const f = FACES[fi];
        const nb = get(x + f.d[0], y + f.d[1], z + f.d[2]);
        if (nb && BD[nb].opaque) continue;
        if (nb && isLeaf(b) && isLeaf(nb)) continue;
        if (nb === b && d.kind === 'glass') continue;
        let hex = d.c;
        if (f.n[1] === 1 && d.top !== undefined) hex = d.top;
        else if (f.n[1] === -1 && d.bot !== undefined) hex = d.bot;
        else if (d.pat !== undefined && hash3(wx * 3 + f.n[0], y * 3 + f.n[1], wz * 3 + f.n[2], 7) < 0.45) hex = d.pat;
        const cc = colFor(hex, f.s, jit);
        const base = P.n / 3;
        for (let qi = 0; qi < 4; qi++) {
          const q = f.c[qi];
          P.p3(wx + q[0], y + q[1], wz + q[2]);
          N.p3(f.n[0], f.n[1], f.n[2]);
          K.p3(cc[0], cc[1], cc[2]);
        }
        I.p3(base, base + 1, base + 2); I.p3(base, base + 2, base + 3);
      }
    }
    if (P.n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', attr(P, 3)); g.setAttribute('normal', attr(N, 3)); g.setAttribute('color', attr(K, 3));
      g.setIndex(new THREE.BufferAttribute(I.view().slice(), 1));
      c.mesh = new THREE.Mesh(g, matSolid);
      World.group.add(c.mesh);
    }
    if (PP.n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', attr(PP, 3)); g.setAttribute('normal', attr(PN, 3)); g.setAttribute('color', attr(PK, 3));
      g.setAttribute('sway', attr(PS, 1));
      g.setIndex(new THREE.BufferAttribute(PI.view().slice(), 1));
      c.pmesh = new THREE.Mesh(g, matPlant);
      World.group.add(c.pmesh);
    }
    if (WP.n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', attr(WP, 3));
      g.setIndex(new THREE.BufferAttribute(WI.view().slice(), 1)); g.computeVertexNormals();
      c.wmesh = new THREE.Mesh(g, matWater);
      World.group.add(c.wmesh);
    }
    c.built = true;
  },
  // modelo voxel esculpido para plantas/flores
  plantMesh(pos, nor, col, idx, sw, b, x, y, z, lod) {
    const rot = (hash2(x, z, 5) * 4) | 0;
    const m = plantModel(b, rot, lod);
    if (!m) return;
    const base = pos.n / 3;
    pos.copyOff3(m.pos, x, y, z);
    nor.copy(m.nor); col.copy(m.col); sw.copy(m.sway);
    idx.copyAdd(m.idx, base);
  },
  // modelos simples: fornalha, bancada, panela, mesa, cadeira, cama, lanterna
  modelMesh(pos, nor, col, idx, b, d, x, y, z, c) {
    const box = (x0, y0, z0, x1, y1, z1, hex, mul = 1) => {
      const vx = [x0, x1], vy = [y0, y1], vz = [z0, z1];
      for (const f of FACES) {
        const base = pos.n / 3;
        const cc = colFor(hex, Math.min(1.9, f.s * mul));
        for (const q of f.c) { pos.p3(x + vx[q[0]], y + vy[q[1]], z + vz[q[2]]); nor.p3(f.n[0], f.n[1], f.n[2]); col.p3(cc[0], cc[1], cc[2]); }
        idx.p3(base, base + 1, base + 2); idx.p3(base, base + 2, base + 3);
      }
    };
    if (b === B.FURNACE) {
      box(.08, 0, .08, .92, .75, .92, 0x8c9099);
      box(.0, .75, .0, 1, .95, 1, 0x767b85);
      box(.25, .08, -.01, .75, .45, .13, 0xffa64a, 1.6); // boca acesa
      box(.35, .95, .35, .65, 1.25, .65, 0x6b707a);
    } else if (b === B.BENCH) {
      box(0, .7, 0, 1, .95, 1, 0xd9a868);
      box(.08, 0, .08, .24, .7, .24, 0xb08048); box(.76, 0, .08, .92, .7, .24, 0xb08048);
      box(.08, 0, .76, .24, .7, .92, 0xb08048); box(.76, 0, .76, .92, .7, .92, 0xb08048);
      box(.2, .95, .2, .5, 1.03, .4, 0x9aa0a8); box(.55, .95, .5, .8, 1.05, .72, 0xc96f5a);
    } else if (b === B.POT) {
      box(.2, .05, .2, .8, .55, .8, 0x555a66);
      box(.14, .55, .14, .86, .66, .86, 0x666c7a);
      box(.3, .66, .3, .7, .72, .7, 0xe8955c, 1.3); // sopa
      box(.84, .3, .45, 1.02, .38, .55, 0x555a66);
    } else if (b === B.TABLE) {
      box(0, .75, 0, 1, .92, 1, 0xd9a868);
      box(.1, 0, .1, .22, .75, .22, 0xb08048); box(.78, 0, .1, .9, .75, .22, 0xb08048);
      box(.1, 0, .78, .22, .75, .9, 0xb08048); box(.78, 0, .78, .9, .75, .9, 0xb08048);
    } else if (b === B.LANTERN) {
      box(.3, 0, .3, .7, .12, .7, 0x6b707a);
      box(.34, .12, .34, .66, .52, .66, 0xffe08a, 1.9);
      box(.3, .52, .3, .7, .62, .7, 0x6b707a);
    } else if (d.seat) {
      const dir = d.dir;
      box(.1, .35, .1, .9, .5, .9, 0xd9a868);
      box(.14, 0, .14, .26, .35, .26, 0xb08048); box(.74, 0, .14, .86, .35, .26, 0xb08048);
      box(.14, 0, .74, .26, .35, .86, 0xb08048); box(.74, 0, .74, .86, .35, .86, 0xb08048);
      if (dir === 0) box(.1, .5, .74, .9, 1.15, .9, 0xc99858); else if (dir === 1) box(.1, .5, .1, .9, 1.15, .26, 0xc99858);
      else if (dir === 2) box(.74, .5, .1, .9, 1.15, .9, 0xc99858); else box(.1, .5, .1, .26, 1.15, .9, 0xc99858);
    } else if (d.bed || d.kind === 'bedfoot') {
      // cama: cabeceira (bloco com dir) + pé; cada bloco desenha sua metade
      const head = d.bed, dir = d.dir ?? ((c && this.bedDirAt(c, x, y, z)) || 0);
      box(.02, 0, .02, .98, .2, .98, 0xb08048);
      box(0, .2, 0, 1, .5, 1, 0xfff5ea);
      if (head) {
        const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
        // travesseiro no lado oposto ao pé
        const px = .5 - dx * .3, pz = .5 - dz * .3;
        box(px - .3, .5, pz - .3, px + .3, .62, pz + .3, 0xffffff);
        // cobertor cobre lado do pé
        box(dx > 0 ? .4 : 0, .5, dz > 0 ? .4 : 0, dx < 0 ? .6 : 1, .56, dz < 0 ? .6 : 1, 0xffa0bd);
      } else {
        box(0, .5, 0, 1, .56, 1, 0xffa0bd);
      }
    } else {
      box(.05, 0, .05, .95, .9, .95, d.c);
    }
  },
  bedDirAt(c, x, y, z) {
    for (let dir = 0; dir < 4; dir++) {
      const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
      const nb = World.get(x - dx, y, z - dz);
      if (nb >= 64 && nb <= 67 && (nb - 64) === dir) return dir;
    }
    return 0;
  },
  update(px, pz) {
    const R = G.settings.dist;
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let built = 0;
    const lodFor = (d) => (d <= 1 ? 0 : d <= 3 ? 1 : 2);
    // um pedaço por quadro: mantém a taxa de quadros estável
    for (let r = 0; r <= R && !built; r++) {
      for (let dx = -r; dx <= r && !built; dx++) for (let dz = -r; dz <= r && !built; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const c = World.chunk(pcx + dx, pcz + dz);
        if (!c.built) { c.lod = lodFor(r); this.buildChunk(c); built++; }
      }
    }
    // troca o nível de detalhe das plantas conforme o jogador se aproxima/afasta
    this._lodT = (this._lodT || 0) + 1;
    if (!built && this._lodT % 4 === 0) {
      for (const c of World.chunks.values()) {
        if (!c.built) continue;
        const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
        if (d > R) continue;
        const want = lodFor(d);
        if ((c.lod || 0) !== want) { c.lod = want; this.buildChunk(c); break; }
      }
    }
    for (const k of World.dirty) { const c = World.chunks.get(k); if (c && c.built) this.buildChunk(c); }
    World.dirty.clear();
    // descarrega chunks distantes
    if ((this._t = (this._t || 0) + 1) % 120 === 0) {
      for (const [k, c] of World.chunks) {
        if (Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz)) > R + 2 && c.built) {
          if (c.mesh) { c.mesh.geometry.dispose(); World.group.remove(c.mesh); c.mesh = null; }
          if (c.wmesh) { c.wmesh.geometry.dispose(); World.group.remove(c.wmesh); c.wmesh = null; }
          if (c.pmesh) { c.pmesh.geometry.dispose(); World.group.remove(c.pmesh); c.pmesh = null; }
          c.built = false;
          if (!World.edits.has(k)) World.chunks.delete(k);
        }
      }
    }
  },
};
