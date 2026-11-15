import * as THREE from './three.module.min.js';
export { THREE };

// Estado global compartilhado entre os módulos
export const G = {
  THREE, scene: null, camera: null, renderer: null,
  mode: 'title',            // title | custom | play | photo
  now: 0, dt: 0,
  uTime: { value: 0 },
  settings: { music: 0.6, sfx: 0.8, dist: (('ontouchstart' in window) || navigator.maxTouchPoints > 0) ? 3 : 4, tts: false },
  profile: null,
  touch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
};

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
// suavização independente da taxa de quadros (evita tremidas quando o FPS varia)
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
export const smooth = (a, b, x) => { let t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function hash2(x, z, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function hash3(x, y, z, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 1103515245) ^ Math.imul(z | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));
export function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }

// Ruído de gradiente 2D/3D com semente
export function makeNoise(seed) {
  const p = new Uint8Array(512); const perm = []; for (let i = 0; i < 256; i++) perm.push(i);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const g2 = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y; case 4: return x * 1.4; case 5: return -x * 1.4; case 6: return y * 1.4; default: return -y * 1.4; } };
  function n2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y); x -= X; y -= Y; const xi = X & 255, yi = Y & 255;
    const u = fade(x), v = fade(y); const a = p[xi] + yi, b = p[xi + 1] + yi;
    return lerp(lerp(g2(p[a], x, y), g2(p[b], x - 1, y), u), lerp(g2(p[a + 1], x, y - 1), g2(p[b + 1], x - 1, y - 1), u), v);
  }
  const g3 = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function n3(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); x -= X; y -= Y; z -= Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255; const u = fade(x), v = fade(y), w = fade(z);
    const A = p[xi] + yi, AA = p[A] + zi, AB = p[A + 1] + zi, Bq = p[xi + 1] + yi, BA = p[Bq] + zi, BB = p[Bq + 1] + zi;
    return lerp(
      lerp(lerp(g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z), u), lerp(g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1), u), lerp(g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  return { n2, n3 };
}
