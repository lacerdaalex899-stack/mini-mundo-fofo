import { THREE } from './g.js';
import { Vox, mul, tint } from './voxel.js';
import { B } from './blocks.js';

// Resolução das plantas: 20 voxels por bloco
const R = 20, VS = 1 / R, C = 9.5; // C = centro do bloco em voxels
const G = (h = 26) => new Vox(R, h, R, VS, 0, 0, 0);

// ---------- peças ----------
function stem(g, y0, y1, c, w = 1) {
  for (let y = y0; y <= y1; y++)
    for (let dx = 0; dx <= w; dx++) for (let dz = 0; dz <= w; dz++) g.set(C + dx, y, C + dz, c);
}
// pétala em coordenadas polares: faixa curva com vão entre as vizinhas (chave do visual de rosa)
function petal(g, cy, ang, r0, r1, halfA, yTip, cup, c, tipC, creaseC) {
  const dr = 0.36;
  for (let r = r0; r <= r1; r += dr) {
    const f = (r - r0) / Math.max(0.001, r1 - r0);
    const ha = halfA * Math.sin(Math.PI * Math.min(1, 0.22 + f * 0.92));
    const yc = cy + (yTip - cy) * f * f;
    const step = 0.32 / Math.max(0.9, r);
    const cc = (tipC && f > 0.80) ? tipC : (creaseC && f < 0.24) ? creaseC : c;
    for (let a = -ha; a <= ha + 1e-6; a += step) {
      const an = ha > 0.001 ? a / ha : 0;
      const y = yc + cup * an * an;
      g.set(C + Math.cos(ang + a) * r, y, C + Math.sin(ang + a) * r, cc);
    }
  }
}
function ring(g, cy, n, r0, r1, halfA, yTip, cup, c, phase = 0, tipC, creaseC) {
  for (let k = 0; k < n; k++) petal(g, cy, phase + k * Math.PI * 2 / n, r0, r1, halfA, yTip, cup, c, tipC, creaseC);
}
// folha achatada e serrilhada com nervura
function leaf(g, cy, ang, r0, r1, wid, droop, c, cv) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let t = r0; t <= r1; t += 0.34) {
    const f = (t - r0) / (r1 - r0);
    let w = wid * Math.sin(Math.PI * Math.min(1, 0.14 + f * 0.95));
    if (f > 0.88) w *= 0.4;
    const y = cy - droop * f * f * (r1 - r0);
    for (let s = -w; s <= w; s += 0.34) {
      const sn = Math.abs(s) / (w || 1);
      if (sn > 0.72 && Math.round(t * 1.6) % 2 === 0) continue;   // serrilha
      g.set(C + ca * t - sa * s, y + sn * sn * 0.55, C + sa * t + ca * s, sn < 0.2 ? cv : c);
    }
  }
}
function leafFan(g, cy, n, r0, r1, wid, droop, c, cv, phase = 0.4) {
  for (let k = 0; k < n; k++) leaf(g, cy, phase + k * Math.PI * 2 / n, r0, r1, wid, droop, c, cv);
}
function calyx(g, cy, c) {
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2566 + 0.4;
    for (let t = 1; t <= 3.4; t += 0.4) g.set(C + Math.cos(a) * t, cy + t * 0.42, C + Math.sin(a) * t, c);
  }
}

// ---------- ROSA: camadas de pétalas com miolo em espiral ----------
function roseModel(base, leafC = 0x3d7a33) {
  const g = G(26);
  const c1 = mul(base, 0.6), c2 = mul(base, 0.74), c3 = mul(base, 0.88), c4 = base, c5 = tint(base, 0.14), c6 = tint(base, 0.26);
  const lv = mul(leafC, 0.7);
  const cr = mul(base, 0.42); // vinco escuro na base das pétalas
  stem(g, 0, 10, 0x40763a, 1);
  leafFan(g, 9.0, 5, 2.6, 9.6, 2.5, 0.075, leafC, lv, 0.35);
  calyx(g, 10.0, mul(leafC, 1.1));
  // botão: pétalas externas caem como saia, internas sobem = volume de rosa
  ring(g, 12.6, 6, 2.2, 7.2, 0.41, 10.2, 2.0, c1, 0.00, mul(base, 0.56), cr);
  ring(g, 13.0, 6, 2.0, 6.0, 0.42, 11.6, 1.7, c2, 0.52, null, cr);
  ring(g, 13.3, 5, 1.7, 4.8, 0.50, 13.6, 1.4, c3, 0.26, null, cr);
  ring(g, 13.6, 5, 1.3, 3.6, 0.52, 14.8, 1.2, c4, 0.88, null, cr);
  ring(g, 13.9, 4, 0.9, 2.6, 0.60, 15.4, 1.0, c5, 0.35, null, cr);
  // miolo enrolado, baixinho e escondido entre as pétalas
  for (let a = 0, r = 1.5, y = 14.2; a < Math.PI * 2.6; a += 0.26, r -= 0.055, y += 0.042)
    g.set(C + Math.cos(a) * r, y, C + Math.sin(a) * r, a > 3.4 ? c6 : c5);
  return g;
}

// ---------- TULIPA: taça fechada ----------
function tulipModel(base) {
  const g = G(24);
  const c1 = mul(base, 0.72), c2 = mul(base, 0.88), c3 = tint(base, 0.2);
  stem(g, 0, 13, 0x4a8a3c, 1);
  leaf(g, 3.5, 0.9, 1.2, 9.0, 1.9, -0.11, 0x4f9440, 0x3d7a32);
  leaf(g, 3.0, 3.9, 1.2, 8.6, 1.8, -0.12, 0x4f9440, 0x3d7a32);
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    const c = k % 2 ? c1 : c2;
    for (let y = 0; y <= 8; y += 0.5) {
      const f = y / 8;
      const r = 1.6 + Math.sin(f * Math.PI * 0.82) * 3.1;
      const ha = 0.44 * Math.sin(Math.PI * Math.min(1, 0.3 + f * 0.9));
      for (let s = -ha; s <= ha; s += 0.33 / Math.max(1, r))
        g.set(C + Math.cos(a + s) * r, 13.5 + y, C + Math.sin(a + s) * r, y > 6.5 ? c3 : c);
    }
  }
  g.box(9, 21, 9, 10, 21, 10, c3);
  return g;
}

// ---------- MARGARIDA / GIRASSOL: pétalas radiais finas ----------
function daisyModel(petalC, coreC, tall = 0) {
  const g = G(22 + tall);
  stem(g, 0, 10 + tall, 0x51a040, 1);
  leafFan(g, 3.2 + tall * 0.4, 3, 1.6, 7.4, 2.1, 0.07, 0x51a040, 0x3d7f30, 0.8);
  const cy = 11.5 + tall;
  ring(g, cy, 12, 2.2, 8.6, 0.14, cy - 0.5, 0.55, mul(petalC, 0.84), 0.0);
  ring(g, cy + 0.8, 10, 1.8, 7.2, 0.15, cy + 0.6, 0.5, petalC, 0.3);
  g.ball(C, cy + 1.2, C, 2.5, 1.3, 2.5, coreC);
  g.ball(C, cy + 1.8, C, 1.6, 0.9, 1.6, tint(coreC, 0.28));
  return g;
}
function sunflowerModel() {
  const g = G(30);
  stem(g, 0, 17, 0x3f7f32, 1);
  leaf(g, 5.0, 0.7, 1.6, 8.4, 2.9, 0.08, 0x4a9138, 0x376f2a);
  leaf(g, 9.5, 3.7, 1.6, 8.0, 2.7, 0.09, 0x4a9138, 0x376f2a);
  const cy = 19;
  ring(g, cy, 14, 3.0, 9.4, 0.15, cy - 0.6, 0.6, 0xdd9c1b, 0.0, 0xf0b52c);
  ring(g, cy + 0.9, 12, 2.6, 8.0, 0.16, cy + 0.7, 0.55, 0xffd23f, 0.26);
  g.ball(C, cy + 1.3, C, 3.5, 1.5, 3.5, 0x55371f);
  g.ball(C, cy + 1.9, C, 2.5, 1.0, 2.5, 0x76502c);
  for (let k = 0; k < 10; k++) { const a = k * 0.84; g.set(C + Math.cos(a) * 1.9, cy + 2.4, C + Math.sin(a) * 1.9, 0x3b2615); }
  return g;
}

// ---------- LAVANDA ----------
function lavenderModel(base) {
  const g = G(26);
  stem(g, 0, 6, 0x5a9a4a, 1);
  leafFan(g, 2.2, 3, 1.4, 5.6, 1.4, 0.06, 0x5fa84f, 0x468038, 1.1);
  for (const [sx, sz, h0, len] of [[0, 0, 11, 10], [-2.6, 1.4, 8, 8], [2.6, -1.2, 9, 9]]) {
    for (let y = 3; y < h0; y++) g.set(C + sx, y, C + sz, 0x5a9a4a);
    for (let y = 0; y < len; y++) {
      const f = y / len, r = 2.0 * (1 - f * 0.78);
      const c = y % 2 ? mul(base, 0.76) : tint(base, 0.2);
      for (let k = 0; k < 6; k++) {
        const a = k * 1.047 + y * 0.55;
        g.set(C + sx + Math.cos(a) * r, h0 + y, C + sz + Math.sin(a) * r, c);
      }
      g.set(C + sx, h0 + y, C + sz, mul(base, 0.86));
    }
  }
  return g;
}

// ---------- HORTÊNSIA: buquê de florzinhas de 4 pétalas ----------
function hydrangeaModel(base) {
  const g = G(24);
  stem(g, 0, 9, 0x4a8a3c, 1);
  leafFan(g, 4.0, 4, 1.8, 8.8, 2.6, 0.06, 0x47913a, 0x35702b, 0.7);
  const cols = [mul(base, 0.72), mul(base, 0.88), base, tint(base, 0.25)];
  const cy = 13.5;
  for (let k = 0; k < 22; k++) {
    const a = k * 2.3998, t = k / 22;
    const yy = cy + Math.cos(t * Math.PI) * 3.2;
    const rr = 4.6 * Math.sqrt(Math.max(0.08, 1 - Math.pow((yy - cy) / 3.6, 2)));
    const x = C + Math.cos(a) * rr, z = C + Math.sin(a) * rr;
    const c = cols[k % 4];
    for (let p = 0; p < 4; p++) { const pa = p * Math.PI / 2 + a; g.set(x + Math.cos(pa) * 1.1, yy, z + Math.sin(pa) * 1.1, c); }
    g.set(x, yy, z, tint(base, 0.55));
  }
  g.ball(C, cy, C, 2.6, 2.4, 2.6, mul(base, 0.8));
  return g;
}

// ---------- FLOR DE CEREJEIRA ----------
function cherryModel() {
  const g = G(20);
  stem(g, 0, 8, 0x6b8a4a, 1);
  leafFan(g, 2.6, 2, 1.4, 6.2, 1.8, 0.08, 0x5fa84f, 0x468038, 2.0);
  const cy = 10.5;
  ring(g, cy, 5, 2.0, 8.4, 0.50, cy + 0.2, 1.1, 0xffbdd6, 0.0, 0xffe2ee);
  ring(g, cy + 0.9, 5, 1.6, 5.6, 0.48, cy + 1.3, 0.9, 0xffd7e6, 0.63);
  g.ball(C, cy + 1.5, C, 1.4, 0.8, 1.4, 0xfff0b0);
  for (let k = 0; k < 7; k++) { const a = k * 0.9; g.set(C + Math.cos(a) * 2.1, cy + 2.2, C + Math.sin(a) * 2.1, 0xffdd66); }
  return g;
}

// ---------- plantas pequenas ----------
function grassModel() {
  const g = G(14);
  const cs = [0x6fbf4a, 0x5fae42, 0x7ccb55, 0x68b846];
  const blades = [[0, 0, 7, 0.9, 0.4], [-2.6, 1.6, 6, -1.0, 0.5], [2.4, -1.4, 5, 0.8, -0.9], [0.6, 2.8, 6, -0.4, 1.0], [-1.4, -2.4, 4, -0.7, -0.8]];
  blades.forEach(([bx, bz, h, lx, lz], i) => {
    for (let y = 0; y <= h; y++) {
      const f = y / h;
      const x = C + bx + lx * f * f * 2.4, z = C + bz + lz * f * f * 2.4;
      g.set(x, y, z, cs[i % 4]);
      if (y < h * 0.6) { g.set(x + (lz > 0 ? 1 : -1) * 0.0 + 1, y, z, cs[i % 4]); } // base mais cheia
    }
    g.set(C + bx + lx * 2.4, h + 1, C + bz + lz * 2.4, cs[i % 4]);
  });
  return g;
}
function fernModel() {
  const g = G(18);
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2566 + 0.3;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let t = 0; t <= 6.5; t += 0.45) {
      const y = 1.5 + t * 1.5 - t * t * 0.14;
      g.set(C + ca * t, y, C + sa * t, 0x4a8c3c);
      const w = 2.4 * Math.sin(Math.PI * Math.min(1, 0.15 + t / 7.5));
      if (Math.round(t * 2.2) % 2 === 0)
        for (let s = -w; s <= w; s += 0.6) g.set(C + ca * t - sa * s, y, C + sa * t + ca * s, 0x58a447);
    }
  }
  stem(g, 0, 2, 0x3f7a35, 1);
  return g;
}
function bushModel() {
  const g = G(18);
  g.ball(C, 6.5, C, 6.0, 5.4, 6.0, 0x3a8234);
  g.ball(C, 8.4, C, 4.6, 4.0, 4.6, 0x4a9c42);
  g.ball(C - 2, 5.5, C + 2, 3.4, 3.0, 3.4, 0x44913c);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.1, r = 4.6;
    g.set(C + Math.cos(a) * r, 4 + (k % 4) * 2.1, C + Math.sin(a) * r, k % 2 ? 0xe8456b : 0xc42f55);
  }
  stem(g, 0, 2, 0x6b4a2a, 1);
  return g;
}
function wheatModel() {
  const g = G(22);
  for (const [sx, sz] of [[-2.2, 0.6], [1.6, 1.8], [0.4, -2.2]]) {
    for (let y = 0; y <= 10; y++) g.set(C + sx, y, C + sz, 0x8aa83e);
    for (let y = 10; y <= 16; y++) {
      g.set(C + sx, y, C + sz, 0xe0c24a);
      if (y % 2 === 0) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(C + sx + dx, y, C + sz + dz, 0xd0ac38);
    }
    g.set(C + sx, 17, C + sz, 0xeed66a);
  }
  return g;
}
function mushroomModel(capC, dot) {
  const g = G(14);
  g.box(9, 0, 9, 10, 5, 10, 0xf2e8d8);
  g.ball(C, 7.0, C, 5.2, 3.6, 5.2, capC);
  g.boxClear(4, 0, 4, 15, 5, 15);
  g.box(9, 0, 9, 10, 5, 10, 0xf2e8d8);
  g.box(8, 5, 8, 11, 5, 11, 0xe3d6c0);
  if (dot) for (let k = 0; k < 7; k++) {
    const a = k * 0.9, r = 2.2 + (k % 3);
    g.set(C + Math.cos(a) * r, 9 - (k % 2), C + Math.sin(a) * r, 0xfff4e4);
  }
  return g;
}

// ---------- registro ----------
const BUILD = {
  [B.ROSE]: () => roseModel(0xd4293c),
  [B.ROSE_P]: () => roseModel(0xff7cae),
  [B.ROSE_W]: () => roseModel(0xf7f0ea, 0x4a8a3c),
  [B.ROSE_Y]: () => roseModel(0xf5bd2a),
  [B.ROSE_B]: () => roseModel(0x6b8ce8),
  [B.ROSE_V]: () => roseModel(0xa05ad8),
  [B.TULIP]: () => tulipModel(0xff7336),
  [B.TULIP_P]: () => tulipModel(0xff9ec8),
  [B.DAISY]: () => daisyModel(0xfffaf2, 0xffd23f),
  [B.SUNF]: () => sunflowerModel(),
  [B.LAV]: () => lavenderModel(0xa177e8),
  [B.HYD]: () => hydrangeaModel(0x7fa8f0),
  [B.HYD_P]: () => hydrangeaModel(0xf08fc4),
  [B.CHERRY_F]: () => cherryModel(),
  [B.TGRASS]: () => grassModel(),
  [B.FERN]: () => fernModel(),
  [B.BUSH]: () => bushModel(),
  [B.WHEAT]: () => wheatModel(),
  [B.MUSH_R]: () => mushroomModel(0xd43f3f, 1),
  [B.MUSH_B]: () => mushroomModel(0xa9794a, 0),
};

const CACHE = new Map();
const GEOS = new Map();
const swayFn = (y) => Math.max(0, Math.min(1, (y - 0.25) / 0.8));

export function plantModel(id, rot = 0, lod = 0) {
  const k = (id * 4 + rot) * 4 + lod;
  let m = CACHE.get(k);
  if (m !== undefined) return m;
  const f = BUILD[id];
  if (!f) { CACHE.set(k, null); return null; }
  let g = f();
  for (let i = 0; i < lod; i++) g = g.downsample2();
  if (rot) g = g.rotYCopy(rot);
  m = g.bake({ sway: swayFn });
  CACHE.set(k, m);
  return m;
}
export function plantGeometry(id) {
  let g = GEOS.get(id);
  if (g !== undefined) return g;
  const f = BUILD[id];
  if (!f) { GEOS.set(id, null); return null; }
  g = f().geometry();
  g.computeBoundingBox();
  GEOS.set(id, g);
  return g;
}
export function hasPlantModel(id) { return !!BUILD[id]; }

// pré-aquecimento: prepara um modelo por quadro, em segundo plano,
// para nenhuma flor nova causar engasgo no meio da exploração
let WARM = null;
export function warmStep() {
  if (!WARM) {
    WARM = [];
    for (const id of Object.keys(BUILD)) for (let lod = 2; lod >= 0; lod--) for (let rot = 0; rot < 4; rot++) WARM.push([+id, rot, lod]);
  }
  while (WARM.length) {
    const [id, rot, lod] = WARM.pop();
    if (!CACHE.has((id * 4 + rot) * 4 + lod)) { plantModel(id, rot, lod); return true; }
  }
  return false;
}
