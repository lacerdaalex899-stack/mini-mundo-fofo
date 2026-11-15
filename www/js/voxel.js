import { THREE } from './g.js';

// Sombreamento por face: +x -x +y -y +z -z (mesmo esquema do terreno, para tudo combinar)
const SH = [0.82, 0.82, 1.0, 0.56, 0.92, 0.72];
const FLAG = 0x1000000;

// Grade de voxels com malha "greedy" (junta faces iguais) — leve o bastante para celular
export class Vox {
  constructor(sx, sy, sz, vs = 1 / 16, ox = 0, oy = 0, oz = 0) {
    this.sx = sx; this.sy = sy; this.sz = sz; this.vs = vs;
    this.ox = ox; this.oy = oy; this.oz = oz;
    this.yb = 0; // deslocamento interno em y (permite desenhar com y negativo)
    this.d = new Int32Array(sx * sy * sz);
  }
  in(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  i(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  set(x, y, z, c) {
    x = Math.round(x); y = Math.round(y + this.yb); z = Math.round(z);
    if (this.in(x, y, z)) this.d[this.i(x, y, z)] = (c & 0xffffff) | FLAG;
    return this;
  }
  soft(x, y, z, c) { // só preenche se estiver vazio
    x = Math.round(x); y = Math.round(y + this.yb); z = Math.round(z);
    if (this.in(x, y, z) && !this.d[this.i(x, y, z)]) this.d[this.i(x, y, z)] = (c & 0xffffff) | FLAG;
    return this;
  }
  get(x, y, z) { y = Math.round(y + this.yb); return this.in(x, y, z) ? this.d[this.i(x, y, z)] : 0; }
  raw(x, y, z) { return this.in(x, y, z) ? this.d[this.i(x, y, z)] : 0; }
  clear(x, y, z) { y = Math.round(y + this.yb); if (this.in(x, y, z)) this.d[this.i(x, y, z)] = 0; return this; }
  box(x0, y0, z0, x1, y1, z1, c) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, c);
    return this;
  }
  boxSoft(x0, y0, z0, x1, y1, z1, c) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.soft(x, y, z, c);
    return this;
  }
  boxClear(x0, y0, z0, x1, y1, z1) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.clear(x, y, z);
    return this;
  }
  // elipsoide cheio
  ball(cx, cy, cz, rx, ry, rz, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1.02) this.set(x, y, z, c);
        }
    return this;
  }
  // tira os 8 cantos (deixa a forma fofinha)
  roundCorners(x0, y0, z0, x1, y1, z1) {
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) this.clear(x, y, z);
    return this;
  }
  // versão com metade da resolução (para modelos distantes)
  downsample2() {
    const nx = Math.ceil(this.sx / 2), ny = Math.ceil(this.sy / 2), nz = Math.ceil(this.sz / 2);
    const n = new Vox(nx, ny, nz, this.vs * 2, this.ox, this.oy, this.oz);
    n.yb = this.yb / 2;
    const cnt = new Map();
    for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      cnt.clear(); let solid = 0;
      for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
        const v = this.raw(x * 2 + dx, y * 2 + dy, z * 2 + dz);
        if (v) { solid++; cnt.set(v, (cnt.get(v) || 0) + 1); }
      }
      if (solid >= 2) {
        let best = 0, bn = -1;
        for (const [v, c] of cnt) if (c > bn) { bn = c; best = v; }
        n.d[n.i(x, y, z)] = best;
      }
    }
    return n;
  }
  rotYCopy(times) { // gira a grade em múltiplos de 90° (só para grades quadradas em x/z)
    if (!times) return this;
    let g = this;
    for (let t = 0; t < times; t++) {
      const n = new Vox(g.sz, g.sy, g.sx, g.vs, g.ox, g.oy, g.oz);
      n.yb = g.yb;
      for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
        const v = g.d[g.i(x, y, z)];
        if (v) n.d[n.i(g.sz - 1 - z, y, x)] = v;
      }
      g = n;
    }
    return g;
  }
  // malha greedy -> arrays
  bake(opt = {}) {
    const swayFn = opt.sway || null;
    const pos = [], nor = [], col = [], idx = [], sway = [];
    const { sx, sy, sz, vs, ox, oz } = this;
    const oy = this.oy - this.yb * vs;
    const dims = [sx, sy, sz];
    const C = new THREE.Color();
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3, v = (d + 2) % 3;
      const mask = new Int32Array(dims[u] * dims[v]);
      const x = [0, 0, 0], q = [0, 0, 0];
      for (const dir of [1, -1]) {
        q[0] = q[1] = q[2] = 0; q[d] = dir;
        const faceI = d * 2 + (dir > 0 ? 0 : 1);
        const shade = SH[[0, 1, 2, 3, 4, 5][d === 0 ? (dir > 0 ? 0 : 1) : d === 1 ? (dir > 0 ? 2 : 3) : (dir > 0 ? 4 : 5)]];
        const nrm = [0, 0, 0]; nrm[d] = dir;
        for (x[d] = 0; x[d] < dims[d]; x[d]++) {
          let n = 0;
          for (x[v] = 0; x[v] < dims[v]; x[v]++) for (x[u] = 0; x[u] < dims[u]; x[u]++, n++) {
            const a = this.raw(x[0], x[1], x[2]);
            const b = this.raw(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
            mask[n] = (a && !b) ? a : 0;
          }
          for (let j = 0; j < dims[v]; j++) {
            for (let i = 0; i < dims[u];) {
              const c = mask[j * dims[u] + i];
              if (!c) { i++; continue; }
              let w = 1; while (i + w < dims[u] && mask[j * dims[u] + i + w] === c) w++;
              let h = 1;
              outer: while (j + h < dims[v]) {
                for (let k = 0; k < w; k++) if (mask[(j + h) * dims[u] + i + k] !== c) break outer;
                h++;
              }
              const o = [0, 0, 0]; o[d] = x[d] + (dir > 0 ? 1 : 0); o[u] = i; o[v] = j;
              const du = [0, 0, 0]; du[u] = w;
              const dv = [0, 0, 0]; dv[v] = h;
              const V = [
                [o[0], o[1], o[2]],
                [o[0] + du[0], o[1] + du[1], o[2] + du[2]],
                [o[0] + du[0] + dv[0], o[1] + du[1] + dv[1], o[2] + du[2] + dv[2]],
                [o[0] + dv[0], o[1] + dv[1], o[2] + dv[2]],
              ];
              if (dir < 0) V.reverse();
              const base = pos.length / 3;
              C.setHex(c & 0xffffff).multiplyScalar(shade);
              for (const p of V) {
                pos.push(ox + p[0] * vs, oy + p[1] * vs, oz + p[2] * vs);
                nor.push(nrm[0], nrm[1], nrm[2]);
                col.push(C.r, C.g, C.b);
                if (swayFn) sway.push(swayFn(oy + p[1] * vs));
              }
              idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
              for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) mask[(j + l) * dims[u] + i + k] = 0;
              i += w;
            }
          }
        }
      }
    }
    return {
      pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col),
      idx: new Uint32Array(idx), sway: swayFn ? new Float32Array(sway) : null,
    };
  }
  geometry(opt) {
    const b = this.bake(opt);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(b.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(b.col, 3));
    g.setIndex(new THREE.BufferAttribute(b.idx, 1));
    return g;
  }
  mesh(mat) { return new THREE.Mesh(this.geometry(), mat); }
}

let VOXMAT = null;
export function voxMat() {
  if (!VOXMAT) VOXMAT = new THREE.MeshLambertMaterial({ vertexColors: true });
  return VOXMAT;
}
export function voxMesh(vox) { return new THREE.Mesh(vox.geometry(), voxMat()); }

// utilidades de cor
const _c = new THREE.Color(), _w = new THREE.Color(0xffffff), _b = new THREE.Color(0x000000);
export function shade(hex, f) { _c.setHex(hex); f < 1 ? _c.lerp(_b, 1 - f) : _c.lerp(_w, Math.min(1, f - 1)); return _c.getHex(); }
export function mul(hex, f) { _c.setHex(hex).multiplyScalar(f); return _c.getHex(); }
export function tint(hex, f) { _c.setHex(hex).lerp(_w, f); return _c.getHex(); }
