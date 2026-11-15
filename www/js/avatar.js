import { G, THREE, lerp, clamp, angLerp } from './g.js';
import { Vox, voxMat, voxMesh, mul, tint } from './voxel.js';
import { B, BD, IT, isFlower } from './blocks.js';
import { plantGeometry } from './plants.js';

// ====== catálogo ======
export const SKINS = [0xffe0c2, 0xf5c89e, 0xe0a878, 0xc08552, 0x8d5a33, 0x6b4226];
export const HAIR_COLORS = [0x3a2a1e, 0x1a1a22, 0x7a4a2a, 0xc98a3e, 0xe8d08a, 0xb55239, 0x9a9aa2, 0xffb7cf, 0xa9d4ff, 0xb792e8, 0x7ae0c0, 0xff9d5c];
export const EYE_COLORS = [0x3a2a1e, 0x2a5a8a, 0x3f8f5f, 0x6b4226, 0x7a7a85, 0x8a5aa8, 0xc94a6a, 0xe8a83e];
export const HAIRS = [
  { id: 'none', name: 'Raspado' }, { id: 'short', name: 'Curto' }, { id: 'fringe', name: 'Franjinha' },
  { id: 'bob', name: 'Chanel' }, { id: 'long', name: 'Longo' }, { id: 'pig', name: 'Maria-chiquinha' },
  { id: 'bun', name: 'Coque' }, { id: 'curly', name: 'Cacheado' }, { id: 'pony', name: 'Rabo de cavalo' },
  { id: 'twin', name: 'Twintails ✨' }, { id: 'hime', name: 'Hime 👘' }, { id: 'spiky', name: 'Espetado ⚡' }, { id: 'ahoge', name: 'Ahoge 🌱' },
];
// kind: hood (capuz de bichinho) / helmet / robot
export const OUTFITS = [
  { id: 'camp', name: 'Explorador', cat: 'Dia a dia', top: 0x6cc24a, bottom: 0x8a6240, boot: 0x5e4433, detail: 0xffe38a, belt: 1 },
  { id: 'cozy', name: 'Moletom fofo', cat: 'Dia a dia', top: 0xffb7cf, bottom: 0xa9d4ff, boot: 0xfff5ea, detail: 0xfff5ea, pocket: 1 },
  { id: 'overall', name: 'Jardineira', cat: 'Dia a dia', top: 0xfff5ea, bottom: 0x5a8ac9, boot: 0xb08048, detail: 0x5a8ac9, straps: 1 },
  { id: 'sailor', name: 'Marinheiro', cat: 'Dia a dia', top: 0xfff5ea, bottom: 0x2a4a7a, boot: 0x2a2a33, detail: 0x2a4a7a, collar: 1 },
  { id: 'gamer', name: 'Gamer 🎧', cat: 'Dia a dia', top: 0x5a8ac9, bottom: 0x3a4a6a, boot: 0xfff5ea, detail: 0xffd84a, phones: 1, pocket: 1 },
  { id: 'wed_b', name: 'Noivo', cat: 'Casamento', top: 0x23232e, bottom: 0x23232e, boot: 0x16161d, detail: 0xfff5ea, tie: 1, lapel: 1 },
  { id: 'wed_a', name: 'Noiva', cat: 'Casamento', top: 0xfffdf8, bottom: 0xfffdf8, boot: 0xfffdf8, detail: 0xffd6e8, dress: 1, veil: 1 },
  { id: 'party', name: 'Festa brilhante', cat: 'Festa', top: 0xb792e8, bottom: 0x8a5aa8, boot: 0xffd84a, detail: 0xffd84a, sparkle: 1 },
  { id: 'party2', name: 'Vestido de gala', cat: 'Festa', top: 0xe85a8a, bottom: 0xe85a8a, boot: 0xffd84a, detail: 0xffd84a, dress: 1, sparkle: 1 },
  { id: 'tux', name: 'Smoking', cat: 'Festa', top: 0x2a2a33, bottom: 0x2a2a33, boot: 0x16161d, detail: 0xe85a5a, tie: 1, lapel: 1 },
  { id: 'wizard', name: 'Mago 🧙', cat: 'Fantasia', top: 0x4a3a9a, bottom: 0x3a2d7a, boot: 0x2a2a44, detail: 0xffd84a, hat: 'wizard', robe: 1, stars: 1 },
  { id: 'cat', name: 'Gatinha 🐱', cat: 'Fantasia', top: 0xffc2d8, bottom: 0xb792e8, boot: 0xfff5ea, detail: 0xff9dc4, hood: 'cat', hoodC: 0xf0a8c4, tail: 'cat', dress: 1 },
  { id: 'bunny', name: 'Coelhinho 🐰', cat: 'Fantasia', top: 0xfff2f5, bottom: 0xfff2f5, boot: 0xffd6e2, detail: 0xffb7cf, hood: 'bunny', hoodC: 0xfff2f5, tail: 'puff', belly: 0xffe0ea },
  { id: 'fox', name: 'Raposinha 🦊', cat: 'Fantasia', top: 0xf08a3c, bottom: 0xe07a30, boot: 0x4a3a33, detail: 0xfff5ea, hood: 'fox', hoodC: 0xf08a3c, tail: 'fox', belly: 0xfff0e0 },
  { id: 'bear', name: 'Ursinho 🧸', cat: 'Fantasia', top: 0xc9a06a, bottom: 0xc9a06a, boot: 0xb08a58, detail: 0xf0dcb8, hood: 'bear', hoodC: 0xc9a06a, belly: 0xf0dcb8, tail: 'puff' },
  { id: 'dragon', name: 'Dragãozinho 🐲', cat: 'Fantasia', top: 0xf07a3c, bottom: 0xe06a2c, boot: 0xc95a24, detail: 0xffd84a, hood: 'dragon', hoodC: 0xf07a3c, tail: 'dino', spikes: 1, wings: 'bat', belly: 0xffd9a0 },
  { id: 'dino', name: 'Dinossauro 🦕', cat: 'Fantasia', top: 0x6cc24a, bottom: 0x5aad3c, boot: 0x4a9030, detail: 0x3f8f5f, hood: 'dino', hoodC: 0x6cc24a, tail: 'dino', spikes: 1, belly: 0xd8f0b0 },
  { id: 'angel', name: 'Anjinho 👼', cat: 'Fantasia', top: 0xfffdf8, bottom: 0xfffdf8, boot: 0xffe9a8, detail: 0xffd84a, dress: 1, wings: 'feather', halo: 1 },
  { id: 'knight', name: 'Cavaleiro ⚔️', cat: 'Fantasia', top: 0xb8bec8, bottom: 0x8c929c, boot: 0x5a606a, detail: 0xffd84a, hat: 'helm', armor: 1 },
  { id: 'astro', name: 'Astronauta 🚀', cat: 'Fantasia', top: 0xf4f6fa, bottom: 0xf4f6fa, boot: 0xd8dce4, detail: 0xff6b5a, hat: 'astro', pack: 1, armor: 1 },
  { id: 'robot', name: 'Robô 🤖', cat: 'Fantasia', top: 0x8fd0e8, bottom: 0x6fb4d4, boot: 0x5a9ab8, detail: 0xffd84a, face: 'robot', panel: 1 },
  { id: 'pirate', name: 'Pirata 🏴‍☠️', cat: 'Fantasia', top: 0x2a4a7a, bottom: 0x6b4a2a, boot: 0x3a2a1e, detail: 0xffd84a, hat: 'tricorn', patch: 1, coat: 1 },
  { id: 'princess', name: 'Princesa 👑', cat: 'Fantasia', top: 0xa9d4ff, bottom: 0xa9d4ff, boot: 0xfff5ea, detail: 0xffd84a, dress: 1, hat: 'crown', sparkle: 1 },
  { id: 'pj', name: 'Pijama estrelinha', cat: 'Dormir', top: 0x8fb8ff, bottom: 0x8fb8ff, boot: 0xfff5ea, detail: 0xffe38a, stars: 1 },
  { id: 'pj2', name: 'Pijama moranguinho', cat: 'Dormir', top: 0xffb7cf, bottom: 0xffb7cf, boot: 0xfff5ea, detail: 0xe85a5a, stars: 1 },
];
export const EMOTES = [
  { id: 'wave', name: 'Acenar', e: '👋' }, { id: 'heart', name: 'Coração', e: '💗' }, { id: 'dance', name: 'Dançar', e: '💃' },
  { id: 'jump', name: 'Pular de alegria', e: '🎉' }, { id: 'sit', name: 'Sentar', e: '🪑' }, { id: 'laugh', name: 'Rir', e: '😂' },
  { id: 'clap', name: 'Aplaudir', e: '👏' }, { id: 'sleep', name: 'Soninho', e: '😴' },
];
export const POSES_DUO = [
  { id: 'hands', name: 'Mãos dadas', e: '🤝' }, { id: 'hug', name: 'Abraço', e: '🫂' }, { id: 'kiss', name: 'Beijo', e: '💋' },
  { id: 'back', name: 'Costas com costas', e: '🎶' }, { id: 'peace', name: 'Paz e amor', e: '✌️' }, { id: 'highfive', name: 'Toca aqui', e: '🙌' },
];
export const POSES_SOLO = [
  { id: 'smile', name: 'Sorriso', e: '😊' }, { id: 'peace1', name: 'Pazinha', e: '✌️' }, { id: 'think', name: 'Pensativo', e: '🤔' },
  { id: 'hero', name: 'Herói', e: '🦸' }, { id: 'cute', name: 'Fofura', e: '🥰' }, { id: 'sit1', name: 'Sentadinho', e: '🧘' },
];
export function defaultProfile(name) {
  return { name: name || 'Fofinho', skin: 1, hair: 2, hairC: 2, eyes: 1, outfit: 0, cheeks: 1 };
}

// ====== medidas ======
const VS = 0.0625, HIP = 0.36, SHO = HIP + 0.46, NECK = HIP + 0.52;
const FZ = 0.316; // plano do rostinho

// ====== CABEÇA ======
function headVox(prof, of, skin, hairC) {
  const g = new Vox(22, 34, 22, VS, -0.6875, 0.02, -0.6875);
  g.yb = 12; // permite cabelo/orelhas abaixo da cabeça
  const X0 = 6, X1 = 15, Y0 = 0, Y1 = 9, Z0 = 6, Z1 = 15; // cubo da cabeça 10³
  const isRobot = of.face === 'robot';
  const headC = isRobot ? of.top : skin;
  g.box(X0, Y0, Z0, X1, Y1, Z1, headC);
  g.roundCorners(X0, Y0, Z0, X1, Y1, Z1);
  g.clear(X0, Y1, (Z0 + Z1) >> 1); g.clear(X1, Y1, (Z0 + Z1) >> 1);
  // orelhinhas
  if (!of.hood && !isRobot && of.hat !== 'astro') {
    g.box(X0 - 1, 3, 9, X0 - 1, 5, 11, mul(skin, 0.95));
    g.box(X1 + 1, 3, 9, X1 + 1, 5, 11, mul(skin, 0.95));
  }
  if (isRobot) {
    g.box(X0, 2, Z1 + 1, X1, 7, Z1 + 1, mul(of.top, 1.12));      // placa do rosto
    g.box(10, Y1 + 1, 10, 11, Y1 + 3, 11, 0x9aa0a8);             // antena
    g.ball(10.5, Y1 + 4.4, 10.5, 1.4, 1.4, 1.4, 0xff5a5a);
    g.box(X0 - 1, 3, 9, X0 - 1, 6, 12, 0x9aa0a8);
    g.box(X1 + 1, 3, 9, X1 + 1, 6, 12, 0x9aa0a8);
  }
  // cabelo
  if (!isRobot && of.hat !== 'astro') hairVox(g, prof, hairC, of);
  // capuzes de bichinho (kigurumi)
  if (of.hood) hoodVox(g, of, X0, X1, Y0, Y1, Z0, Z1);
  // chapéus
  if (of.hat === 'wizard') {
    g.box(3, Y1 + 1, 3, 18, Y1 + 2, 18, of.top);
    for (let i = 0; i < 7; i++) { const s = 4 - i * 0.5; g.box(10.5 - s, Y1 + 3 + i, 10.5 - s, 10.5 + s, Y1 + 3 + i, 10.5 + s, i > 4 ? of.detail : mul(of.top, 1 + i * 0.03)); }
    g.box(9, Y1 + 10, 9, 12, Y1 + 11, 12, of.detail);
    g.box(3, Y1 + 2, 3, 18, Y1 + 2, 18, mul(of.top, 0.8));
  }
  if (of.hat === 'crown') {
    g.box(X0, Y1 + 1, Z0, X1, Y1 + 2, Z1, 0xffd84a);
    for (const [cx, cz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1], [10, Z0], [10, Z1]]) g.box(cx - 0, Y1 + 3, cz, cx + 1, Y1 + 4, cz + 1, 0xffd84a);
    g.set(10, Y1 + 5, 10, 0xff6b9d); g.set(11, Y1 + 5, 11, 0x8fd0ff);
  }
  if (of.hat === 'helm') {
    g.boxSoft(X0 - 1, 1, Z0 - 1, X1 + 1, Y1 + 2, Z1 + 1, of.top);
    g.boxClear(X0 - 1, 1, Z1 + 1, X1 + 1, 7, Z1 + 1);            // abertura do rosto
    g.box(X0 - 1, 8, Z1 + 1, X1 + 1, Y1 + 2, Z1 + 1, mul(of.top, 0.88));
    g.box(10, 1, Z1 + 1, 11, 2, Z1 + 1, mul(of.top, 0.85));      // nasal
    for (let i = 0; i < 5; i++) g.box(10, Y1 + 3 + i, 8 - i, 11, Y1 + 3 + i, 9 - i, 0xe8453f);
  }
  if (of.hat === 'astro') {
    g.boxSoft(X0 - 1, 0, Z0 - 1, X1 + 1, Y1 + 1, Z1 + 1, of.top);
    g.boxClear(X0 - 1, 1, Z1 + 1, X1 + 1, 7, Z1 + 1);
    g.box(X0 - 1, 8, Z1 + 1, X1 + 1, Y1 + 1, Z1 + 1, of.detail); // faixa vermelha
    g.box(X0 - 1, 0, Z1 + 1, X1 + 1, 0, Z1 + 1, mul(of.top, 0.9));
    g.box(X0 - 1, 2, Z0 - 2, X1 + 1, 7, Z0 - 2, 0x2a3240);
  }
  if (of.hat === 'tricorn') {
    g.box(3, Y1 + 1, 4, 18, Y1 + 1, 17, 0x23232e);
    g.box(4, Y1 + 2, 3, 17, Y1 + 2, 18, 0x23232e);
    g.box(6, Y1 + 2, 6, 15, Y1 + 5, 15, 0x2e2e3a);
    g.box(9, Y1 + 3, Z1 + 1, 12, Y1 + 4, Z1 + 1, 0xfff5ea);      // caveirinha
    g.box(9, Y1 + 2, Z1 + 1, 12, Y1 + 2, Z1 + 1, 0xfff5ea);
  }
  if (of.phones) {
    g.box(X0 - 1, 3, 8, X0 - 1, 6, 12, 0x2a2a33); g.box(X1 + 1, 3, 8, X1 + 1, 6, 12, 0x2a2a33);
    g.box(X0 - 1, 7, 9, X1 + 1, Y1 + 2, 11, 0x2a2a33);
    g.set(X0 - 1, 5, 10, of.detail); g.set(X1 + 1, 5, 10, of.detail);
  }
  if (of.halo) for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; g.set(10.5 + Math.cos(a) * 4.4, Y1 + 5, 10.5 + Math.sin(a) * 4.4, 0xffe066); }
  return g;
}
function hoodVox(g, of, X0, X1, Y0, Y1, Z0, Z1) {
  const c = of.hoodC, c2 = mul(c, 0.82), w = of.detail;
  g.boxSoft(X0 - 1, 1, Z0 - 1, X1 + 1, Y1 + 1, Z1 + 1, c);
  g.boxClear(X0 - 1, 0, Z1 + 1, X1 + 1, 7, Z1 + 1);     // abre o rostinho todo
  g.box(X0 - 1, 8, Z1 + 1, X1 + 1, Y1 + 1, Z1 + 1, c2); // testeira
  const k = of.hood;
  const ear = (x0, x1, y0, y1, z0, z1, cc) => g.box(x0, y0, z0, x1, y1, z1, cc);
  if (k === 'cat' || k === 'fox') {
    for (const sx of [0, 9]) {
      ear(6 + sx, 8 + sx, Y1 + 2, Y1 + 3, 8, 11, c);
      ear(6 + sx + (sx ? 1 : 0), 7 + sx + (sx ? 1 : 0), Y1 + 4, Y1 + 5, 9, 10, c);
      g.box(7 + sx, Y1 + 2, Z1 - 4, 7 + sx, Y1 + 3, Z1 - 4, k === 'fox' ? 0x3a2a26 : 0xff9dc4);
    }
    if (k === 'fox') { g.box(6, Y1 + 4, 8, 8, Y1 + 5, 11, 0x3a2a26); g.box(15, Y1 + 4, 8, 17, Y1 + 5, 11, 0x3a2a26); }
  } else if (k === 'bunny') {
    for (const sx of [0, 10]) {
      ear(7 + sx, 8 + sx, Y1 + 2, Y1 + 10, 9, 11, c);
      ear(7 + sx, 8 + sx, Y1 + 3, Y1 + 9, 11, 11, 0xffb7cf);
    }
  } else if (k === 'bear') {
    for (const sx of [0, 11]) { g.ball(6.5 + sx, Y1 + 2.5, 10, 2.1, 2.1, 1.4, c); g.ball(6.5 + sx, Y1 + 2.5, 10.9, 1.1, 1.1, 0.9, mul(c, 1.2)); }
  } else if (k === 'dragon' || k === 'dino') {
    for (let i = 0; i < 4; i++) g.box(10, Y1 + 2 + (i < 2 ? i : 3 - i), 7 + i * 2, 11, Y1 + 3 + (i < 2 ? i : 3 - i), 8 + i * 2, of.detail);
    if (k === 'dragon') { for (const sx of [0, 9]) { g.box(6 + sx, Y1 + 2, 9, 7 + sx, Y1 + 4, 10, 0xf0e0c0); g.box(6 + sx, Y1 + 4, 8, 7 + sx, Y1 + 5, 9, 0xf0e0c0); } }
  }
}
function hairVox(g, prof, c, of) {
  const hid = HAIRS[prof.hair % HAIRS.length].id;
  if (hid === 'none') return;
  const d = mul(c, 0.82), X0 = 6, X1 = 15, Z0 = 6, Z1 = 15;
  const cap = () => { g.box(X0 - 1, 8, Z0 - 1, X1 + 1, 10, Z1 + 1, c); g.box(X0 - 1, 4, Z0 - 1, X1 + 1, 8, Z0 - 1, c); };
  const fringe = (y0 = 8) => { g.box(X0 - 1, y0, Z1 + 1, X1 + 1, 10, Z1 + 1, c); };
  const sideLock = (len) => { for (const sx of [X0 - 1, X1 + 1]) g.box(sx, 10 - len, Z1 - 2, sx, 9, Z1 + 1, c); };
  const ahoge = () => { g.box(10, 11, 9, 10, 12, 9, c); g.box(10, 13, 8, 10, 13, 9, c); g.set(11, 13, 8, c); };
  cap();
  if (hid === 'short') { fringe(9); sideLock(3); }
  if (hid === 'fringe') { fringe(8); sideLock(5); }
  if (hid === 'bob') { fringe(8); g.box(X0 - 1, 2, Z0 - 1, X0 - 1, 10, Z1 + 1, c); g.box(X1 + 1, 2, Z0 - 1, X1 + 1, 10, Z1 + 1, c); g.box(X0 - 1, 2, Z0 - 1, X1 + 1, 10, Z0 - 1, c); }
  if (hid === 'long') { fringe(8); g.box(X0 - 1, -6, Z0 - 2, X1 + 1, 10, Z0 - 1, c); g.box(X0 - 1, -2, Z0 - 1, X0 - 1, 10, Z1, c); g.box(X1 + 1, -2, Z0 - 1, X1 + 1, 10, Z1, c); }
  if (hid === 'pig') { fringe(8); for (const sx of [X0 - 2, X1 + 1]) { g.box(sx, 3, 9, sx + 1, 8, 12, c); g.box(sx, 1, 9, sx + 1, 3, 11, d); } }
  if (hid === 'bun') { g.ball(10.5, 12.5, 8.5, 2.6, 2.4, 2.4, c); g.box(9, 11, 7, 12, 11, 8, d); }
  if (hid === 'curly') { for (let i = 0; i < 9; i++) { const a = i * 0.9; g.ball(10.5 + Math.cos(a) * 4.2, 10 + (i % 3), 10.5 + Math.sin(a) * 4.2, 1.9, 1.7, 1.9, i % 2 ? c : d); } fringe(9); }
  if (hid === 'pony') { fringe(8); g.box(9, 2, Z0 - 3, 12, 10, Z0 - 1, c); g.box(9, 0, Z0 - 3, 12, 2, Z0 - 2, d); }
  if (hid === 'twin') {
    fringe(8);
    for (const sx of [X0 - 2, X1 + 1]) {
      g.box(sx, 7, 9, sx + 1, 9, 12, c);
      g.box(sx - (sx < 8 ? 1 : 0), -4, 9, sx + 1 + (sx > 8 ? 1 : 0), 7, 11, c);
      g.box(sx - (sx < 8 ? 1 : 0), -6, 9, sx + 1 + (sx > 8 ? 1 : 0), -4, 11, d);
    }
    ahoge();
  }
  if (hid === 'hime') {
    fringe(8);
    g.box(X0 - 1, -5, Z0 - 2, X1 + 1, 10, Z0 - 1, c);
    for (const sx of [X0 - 1, X1 + 1]) g.box(sx, 1, Z1 - 3, sx, 10, Z1 + 1, c);
    ahoge();
  }
  if (hid === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const x = 10.5 + Math.cos(a) * 3.4, z = 10.5 + Math.sin(a) * 3.2;
      for (let k = 0; k < 3; k++) g.set(x + Math.cos(a) * k * 0.7, 10 + k, z + Math.sin(a) * k * 0.7, k > 1 ? d : c);
    }
    g.box(X0, 9, Z1 + 1, 11, 10, Z1 + 1, c); ahoge();
  }
  if (hid === 'ahoge') { fringe(8); sideLock(4); ahoge(); }
}
// rostinho de anime (peças finas na frente da cabeça)
function faceDecals(headG, prof, of, skin, hairC) {
  const bx = (w, h, d, c, x, y, z, em) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial(em ? { color: c, emissive: c, emissiveIntensity: 0.5 } : { color: c }));
    m.position.set(x, y, z); headG.add(m); return m;
  };
  const CC = new THREE.Color();
  const sh = (hex, f) => { CC.setHex(hex).multiplyScalar(f); return CC.getHex(); };
  const tn = (hex, f) => { CC.setHex(hex).lerp(new THREE.Color(0xffffff), f); return CC.getHex(); };
  if (of.face === 'robot') {
    for (const sx of [-0.15, 0.15]) {
      bx(0.17, 0.17, 0.02, 0x1a2a3a, sx, 0.33, FZ);
      bx(0.12, 0.12, 0.02, 0x7ef0ff, sx, 0.33, FZ + 0.004, 1);
      bx(0.05, 0.05, 0.02, 0xffffff, sx + 0.03, 0.36, FZ + 0.008);
    }
    bx(0.16, 0.04, 0.02, 0x7ef0ff, 0, 0.17, FZ + 0.004, 1);
    bx(0.04, 0.04, 0.02, 0x7ef0ff, -0.1, 0.21, FZ + 0.004, 1);
    bx(0.04, 0.04, 0.02, 0x7ef0ff, 0.1, 0.21, FZ + 0.004, 1);
    return;
  }
  const eyeC = EYE_COLORS[prof.eyes % EYE_COLORS.length];
  const patch = of.patch;
  for (const sx of [-0.145, 0.145]) {
    const s = Math.sign(sx);
    if (patch && s < 0) continue;
    bx(0.165, 0.028, 0.02, 0x3a2f3c, sx, 0.402, FZ);                     // cílios
    bx(0.045, 0.024, 0.02, 0x3a2f3c, sx + s * 0.092, 0.387, FZ).rotation.z = -s * 0.5;
    bx(0.155, 0.2, 0.02, 0xffffff, sx, 0.3, FZ - 0.003);                 // branco
    bx(0.108, 0.15, 0.02, eyeC, sx + s * 0.008, 0.292, FZ);              // íris
    bx(0.108, 0.055, 0.02, sh(eyeC, 0.55), sx + s * 0.008, 0.339, FZ + 0.003);
    bx(0.085, 0.05, 0.02, tn(eyeC, 0.45), sx + s * 0.008, 0.245, FZ + 0.003);
    bx(0.05, 0.085, 0.02, 0x241a26, sx + s * 0.008, 0.295, FZ + 0.006);  // pupila
    bx(0.046, 0.062, 0.02, 0xffffff, sx + s * 0.04, 0.345, FZ + 0.009);  // brilhos
    bx(0.026, 0.031, 0.02, 0xffffff, sx - s * 0.031, 0.255, FZ + 0.009);
    bx(0.05, 0.02, 0.02, 0x6b5a66, sx + s * 0.062, 0.195, FZ - 0.001);
    bx(0.12, 0.022, 0.02, sh(hairC, 0.85), sx, 0.465, FZ - 0.001).rotation.z = s * 0.12;
  }
  if (patch) { // tapa-olho do pirata
    bx(0.17, 0.15, 0.02, 0x1a1a22, -0.145, 0.31, FZ);
    bx(0.42, 0.03, 0.02, 0x1a1a22, 0.0, 0.40, FZ - 0.002).rotation.z = 0.22;
  }
  if (prof.cheeks) for (const sx of [-0.215, 0.215]) {
    bx(0.1, 0.055, 0.02, 0xffb0b8, sx, 0.195, FZ - 0.002);
    bx(0.055, 0.03, 0.02, 0xff8f9d, sx, 0.195, FZ);
  }
  // sorrisinho
  bx(0.05, 0.022, 0.02, 0xd96a7a, 0, 0.145, FZ - 0.002);
  bx(0.022, 0.022, 0.02, 0xd96a7a, -0.034, 0.158, FZ - 0.002);
  bx(0.022, 0.022, 0.02, 0xd96a7a, 0.034, 0.158, FZ - 0.002);
  if (of.hat === 'tricorn') { // barbinha de pirata
    bx(0.3, 0.1, 0.07, 0x5a3a28, 0, 0.1, FZ - 0.06);
    bx(0.09, 0.05, 0.05, 0x5a3a28, 0, 0.19, FZ - 0.03);
  }
  if (of.hat === 'astro') { // visor de vidro
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.03), new THREE.MeshLambertMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.4 }));
    m.position.set(0, 0.3, FZ + 0.03); headG.add(m);
  }
  if (of.veil) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 0.1), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    m.position.set(0, 0.3, -0.36); headG.add(m);
  }
}

// ====== CORPO ======
function bodyVox(of, skin) {
  const g = new Vox(18, 18, 16, VS, -0.5625, -0.3125, -0.5);
  const X0 = 5, X1 = 12, Y0 = 5, Y1 = 12, Z0 = 5, Z1 = 10;
  g.box(X0, Y0, Z0, X1, Y1, Z1, of.top);
  if (of.belly) { g.box(X0 + 1, Y0 + 1, Z1 + 1, X1 - 1, Y1 - 2, Z1 + 1, of.belly); g.box(X0 + 2, Y0, Z1, X1 - 2, Y1 - 1, Z1, of.belly); }
  if (of.dress || of.robe) {
    const steps = [0, 0, 1, 1, 2, 2];
    for (let i = 0; i < steps.length; i++) {
      const e = steps[i], y = Y0 - 1 - i;
      g.box(X0 - e, y, Z0 - e, X1 + e, y, Z1 + e, i > 3 ? mul(of.top, 0.93) : of.top);
    }
    g.box(X0 - 2, Y0 - 6, Z0 - 2, X1 + 2, Y0 - 6, Z1 + 2, of.detail);
  } else {
    g.box(X0, Y0 - 2, Z0, X1, Y0 - 1, Z1, of.bottom); // cueirinho/calça curta
  }
  if (of.straps) for (const sx of [X0 + 1, X1 - 2]) g.box(sx, Y1 - 3, Z1, sx + 1, Y1, Z1, of.bottom);
  if (of.collar) { g.box(X0, Y1 - 1, Z0, X1, Y1, Z1, of.detail); g.box(X0 + 1, Y1 - 3, Z0 - 1, X1 - 1, Y1, Z0 - 1, of.detail); }
  if (of.lapel) { g.box(X0 + 1, Y1 - 4, Z1 + 1, X1 - 1, Y1, Z1 + 1, 0xf4f4f8); g.box(X0 + 2, Y1 - 5, Z1 + 1, X1 - 2, Y1, Z1 + 1, 0xf4f4f8); }
  if (of.tie) { g.box(8, Y1 - 1, Z1 + 1, 9, Y1, Z1 + 1, of.detail); g.box(8, Y1 - 4, Z1 + 1, 9, Y1 - 2, Z1 + 1, of.detail); }
  if (of.belt) { g.box(X0, Y0 + 1, Z0, X1, Y0 + 1, Z1, 0x6b4a2a); g.box(8, Y0 + 1, Z1 + 1, 9, Y0 + 1, Z1 + 1, 0xffd84a); }
  if (of.pocket) { g.box(X0 + 1, Y0 + 1, Z1 + 1, X1 - 1, Y0 + 2, Z1 + 1, mul(of.top, 0.88)); }
  if (of.panel) {
    g.box(X0 + 1, Y0 + 2, Z1 + 1, X1 - 1, Y1 - 2, Z1 + 1, 0x3a4a5a);
    g.set(X0 + 2, Y1 - 3, Z1 + 1, 0x7ef0ff); g.set(X0 + 4, Y1 - 3, Z1 + 1, 0xff6b6b); g.set(X0 + 6, Y1 - 3, Z1 + 1, 0xffd84a);
    g.box(X0 + 2, Y0 + 3, Z1 + 1, X1 - 2, Y0 + 4, Z1 + 1, 0x7ef0ff);
  }
  if (of.armor) { g.box(X0 - 1, Y1 - 2, Z0 - 1, X1 + 1, Y1, Z1 + 1, mul(of.top, 1.08)); g.box(X0, Y0, Z0 - 1, X1, Y1 - 3, Z0 - 1, mul(of.top, 0.92)); }
  if (of.coat) { for (const sz of [Z0 - 1, Z1 + 1]) g.box(X0 - 1, Y0 - 2, sz, X1 + 1, Y1, sz, mul(of.top, 0.86)); g.box(X0 - 1, Y0 - 2, Z0 - 1, X0 - 1, Y1, Z1 + 1, mul(of.top, 0.86)); g.box(X1 + 1, Y0 - 2, Z0 - 1, X1 + 1, Y1, Z1 + 1, mul(of.top, 0.86)); }
  if (of.sparkle || of.stars) for (let i = 0; i < 6; i++) {
    const x = X0 + 1 + ((i * 3) % 6), y = Y0 + 1 + ((i * 2) % 6);
    g.set(x, y, Z1 + 1, of.detail);
  }
  if (of.spikes) for (let i = 0; i < 3; i++) g.box(8, Y0 + 2 + i * 3, Z0 - 1, 9, Y0 + 3 + i * 3, Z0 - 1, of.detail);
  if (of.pack) { g.box(X0 + 1, Y0 + 1, Z0 - 3, X1 - 1, Y1 - 1, Z0 - 1, 0xe8eaf0); g.box(X0 + 2, Y0 + 2, Z0 - 4, X1 - 2, Y0 + 5, Z0 - 4, 0xb8bec8); }
  return g;
}
function armVox(of, skin, side) {
  const g = new Vox(7, 10, 7, VS, -0.21875, -0.4375, -0.21875);
  const sleeveC = mul(of.top, 0.9);   // um tom mais escuro para o braço se destacar
  g.box(2, 2, 2, 4, 6, 4, sleeveC);
  g.box(2, 6, 2, 4, 6, 4, mul(of.top, 0.98));
  g.box(2, 0, 2, 4, 1, 4, of.face === 'robot' ? mul(of.top, 1.15) : skin);  // mãozinha
  if (of.armor) g.box(1, 5, 1, 5, 6, 5, mul(of.top, 1.1));
  if (of.cuff || of.coat) g.box(2, 2, 2, 4, 2, 4, of.detail);
  if (of.face === 'robot') { g.box(2, 2, 2, 4, 2, 4, mul(of.top, 0.8)); g.box(2, 4, 2, 4, 4, 4, mul(of.top, 0.8)); }
  if (of.belly) g.box(2, 0, 2, 4, 1, 4, mul(of.hoodC || of.top, 0.85)); // patinhas
  return g;
}
function legVox(of, skin) {
  const g = new Vox(7, 8, 9, VS, -0.21875, -0.375, -0.28125);
  g.box(2, 2, 2, 4, 5, 5, of.dress || of.robe ? mul(of.bottom, 1) : of.bottom);
  g.box(2, 0, 2, 4, 1, 6, of.boot);     // pézinho
  if (of.belly) g.box(2, 0, 2, 4, 1, 6, mul(of.hoodC || of.bottom, 0.85));
  return g;
}
// acessórios translúcidos / extras no corpo
function backParts(body, of) {
  const bx = (w, h, d, c, x, y, z, o) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial(o ? { color: c, transparent: true, opacity: o } : { color: c }));
    m.position.set(x, y, z); body.add(m); return m;
  };
  if (of.wings === 'feather') {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) { const m = bx(0.26 - i * 0.05, 0.1, 0.04, 0xfffdf8, s * (0.2 + i * 0.1), 0.42 - i * 0.12, -0.26); m.rotation.z = s * (0.5 - i * 0.12); }
    }
  }
  if (of.wings === 'bat') {
    for (const s of [-1, 1]) { const m = bx(0.3, 0.26, 0.04, mul(of.detail, 0.95), s * 0.26, 0.38, -0.25); m.rotation.z = s * 0.35; }
  }
  if (of.tail === 'cat') { const t = bx(0.09, 0.09, 0.34, of.hoodC || of.top, 0, 0.14, -0.33); t.rotation.x = 0.5; }
  if (of.tail === 'fox') { const t = bx(0.17, 0.17, 0.4, of.hoodC, 0, 0.1, -0.36); t.rotation.x = 0.45; bx(0.15, 0.15, 0.12, 0xfff0e0, 0, 0.22, -0.52); }
  if (of.tail === 'dino') { bx(0.14, 0.12, 0.34, of.hoodC || of.top, 0, 0.1, -0.33); bx(0.09, 0.09, 0.16, of.detail, 0, 0.14, -0.5); }
  if (of.tail === 'puff') bx(0.17, 0.17, 0.14, 0xfffdf8, 0, 0.14, -0.26);
}

// ====== montagem ======
export function buildAvatar(prof) {
  const of = OUTFITS[prof.outfit % OUTFITS.length] || OUTFITS[0];
  const skin = SKINS[prof.skin % SKINS.length], hairC = HAIR_COLORS[prof.hairC % HAIR_COLORS.length];
  const g = new THREE.Group();
  const root = new THREE.Group(); g.add(root);

  const body = new THREE.Group(); body.position.y = HIP; root.add(body);
  body.add(voxMesh(bodyVox(of, skin)));
  backParts(body, of);

  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.13, HIP, 0); legR.position.set(0.13, HIP, 0);
  const lv = legVox(of, skin);
  legL.add(voxMesh(lv)); legR.add(voxMesh(lv));
  root.add(legL, legR);

  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.30, SHO, 0); armR.position.set(0.30, SHO, 0);
  armL.add(voxMesh(armVox(of, skin, -1))); armR.add(voxMesh(armVox(of, skin, 1)));
  root.add(armL, armR);

  const headG = new THREE.Group(); headG.position.y = NECK; root.add(headG);
  headG.add(voxMesh(headVox(prof, of, skin, hairC)));
  faceDecals(headG, prof, of, skin, hairC);

  const held = new THREE.Group(); held.position.set(0, -0.4, 0.08); armR.add(held);

  return {
    group: g, root, body, head: headG, armL, armR, legL, legR, held, prof,
    heldId: 0, heldMesh: null,
    anim: { t: Math.random() * 10, walk: 0, emote: null, emoteT: 0, pose: null, poseRole: 0, sleeping: false, sitting: false, swing: 0 },
  };
}

// ====== item na mão (visível para todos) ======
export function setHeld(av, id) {
  if (av.heldId === id) return; av.heldId = id;
  if (av.heldMesh) { av.held.remove(av.heldMesh); av.heldMesh = null; }
  if (!id) return;
  const m = buildItemMesh(id, 0.22);
  if (m) { av.heldMesh = m; av.held.add(m); }
}
const _im = new Map();
function itemMat(c, em) {
  const k = c + (em ? 'e' : '');
  let m = _im.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial(em ? { color: c, emissive: c, emissiveIntensity: 0.4 } : { color: c }); _im.set(k, m); }
  return m;
}
export function buildItemMesh(id, s = 0.22) {
  // plantas e flores usam o próprio modelo esculpido, em miniatura
  if (id < 100) {
    const pg = plantGeometry(id);
    if (pg) {
      const grp = new THREE.Group();
      const m = new THREE.Mesh(pg, voxMat());
      m.scale.setScalar(0.5); m.position.set(-0.25, 0, -0.25);
      grp.add(m); return grp;
    }
  }
  const grp = new THREE.Group();
  const add = (w, h, d, c, x = 0, y = 0, z = 0, em) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), itemMat(c, em));
    m.position.set(x * s, y * s, z * s); grp.add(m); return m;
  };
  if (id < 100) {
    const d = BD[id]; if (!d || d.kind === 'air') return null;
    add(1, 1, 1, d.c); if (d.top !== undefined) add(1.02, 0.18, 1.02, d.top, 0, 0.44, 0);
    return grp;
  }
  const it = IT[id]; if (!it) return null;
  if (it.tool) {
    add(0.14, 1.3, 0.14, 0xb08048, 0, 0.2, 0);
    const hc = it.lv === 1 ? 0xd9a868 : it.lv === 2 ? 0x9aa0a8 : 0xd8dce2;
    if (it.tool === 'a') { add(0.5, 0.42, 0.18, hc, 0.22, 0.75, 0); } else { add(0.9, 0.22, 0.18, hc, 0, 0.8, 0); add(0.2, 0.34, 0.18, hc, -0.38, 0.65, 0); add(0.2, 0.34, 0.18, hc, 0.38, 0.65, 0); }
    return grp;
  }
  switch (id) {
    case 121: { // buquê: mini-rosas de verdade
      add(0.18, 0.7, 0.18, 0x5fae4e, 0, 0.1, 0);
      const rose = plantGeometry(B.ROSE), rp = plantGeometry(B.ROSE_P), rw = plantGeometry(B.ROSE_W);
      [[rose, -0.05, 0.3, 0], [rp, 0.05, 0.34, 0.04], [rw, 0, 0.32, -0.05]].forEach(([geo, x, y, z]) => {
        if (!geo) return;
        const m = new THREE.Mesh(geo, voxMat());
        m.scale.setScalar(0.3); m.position.set(x - 0.15, y, z - 0.15); grp.add(m);
      });
      add(0.42, 0.22, 0.42, 0xffe38a, 0, 0.26, 0);
      break;
    }
    case 122: add(0.4, 0.12, 0.4, 0xffd84a, 0, 0.3, 0); add(0.2, 0.2, 0.2, 0xff8fd8, 0, 0.5, 0, 1); break;
    case 108: add(0.5, 0.5, 0.5, 0xe85a5a, 0, 0.3, 0); add(0.1, 0.2, 0.1, 0x6b4226, 0, 0.65, 0); break;
    case 107: case 120: add(0.4, 0.6, 0.4, 0xfffdf8, 0, 0.3, 0); add(0.44, 0.14, 0.44, 0xa9d4ff, 0, 0.62, 0); break;
    case 112: add(0.7, 0.4, 0.45, 0xe8b96a, 0, 0.3, 0); break;
    case 118: add(0.7, 0.3, 0.7, 0xffb7cf, 0, 0.2, 0); add(0.55, 0.22, 0.55, 0xfff5ea, 0, 0.45, 0); add(0.1, 0.16, 0.1, 0xe85a5a, 0, 0.62, 0); break;
    case 115: add(0.55, 0.3, 0.55, 0x8c9099, 0, 0.2, 0); add(0.45, 0.1, 0.45, 0xe8955c, 0, 0.38, 0); break;
    case 101: add(0.45, 0.45, 0.45, 0x33333d, 0, 0.3, 0); break;
    case 102: add(0.55, 0.3, 0.35, 0xd8dce2, 0, 0.25, 0); break;
    case 103: add(0.55, 0.3, 0.35, 0xffd84a, 0, 0.25, 0); break;
    case 104: add(0.3, 0.6, 0.3, 0xff8fd8, 0, 0.35, 0, 1); break;
    case 106: add(0.35, 0.45, 0.35, 0xfff5e0, 0, 0.3, 0); break;
    case 109: add(0.22, 0.22, 0.22, 0xe85a7a, -0.12, 0.25, 0); add(0.22, 0.22, 0.22, 0xb792e8, 0.12, 0.3, 0.05); add(0.22, 0.22, 0.22, 0xe85a7a, 0, 0.4, -0.08); break;
    default: add(0.4, 0.4, 0.4, 0xd9a868, 0, 0.3, 0);
  }
  return grp;
}

// ====== animação ======
export function animateAvatar(av, dt, speed, grounded) {
  const a = av.anim; a.t += dt;
  const A = av; const t = a.t;
  const rl = (o, x, y, z) => { o.rotation.x = lerp(o.rotation.x, x, 0.25); o.rotation.y = lerp(o.rotation.y, y, 0.25); o.rotation.z = lerp(o.rotation.z, z, 0.25); };
  if (a.sleeping) {
    rl(A.armL, 0, 0, 0.9); rl(A.armR, 0, 0, -0.9); rl(A.legL, 0, 0, 0); rl(A.legR, 0, 0, 0); rl(A.head, 0, 0, 0.08);
    A.body.position.y = HIP; A.root.position.y = 0; return;
  }
  if (a.pose) { posePair(av); return; }
  if (a.emote) { emoteAnim(av, dt); return; }
  if (a.sitting) {
    rl(A.legL, -1.45, 0, 0); rl(A.legR, -1.45, 0, 0); rl(A.armL, -0.2, 0, 0.1); rl(A.armR, -0.2, 0, -0.1); rl(A.head, 0, 0, 0);
    A.root.position.y = -0.22; return;
  }
  A.root.position.y = 0;
  a.walk = lerp(a.walk, speed > 0.3 ? 1 : 0, 0.2);
  const w = Math.sin(t * 9) * 0.7 * a.walk;
  let armRX = -w;
  if (a.swing > 0) { a.swing -= dt * 4; armRX = -1.6 + Math.abs(Math.sin(a.swing * Math.PI)) * 1.2; }
  rl(A.legL, w, 0, 0); rl(A.legR, -w, 0, 0);
  rl(A.armL, w * 0.8, 0, 0.06); rl(A.armR, armRX, 0, -0.06);
  if (!grounded) { rl(A.armL, 0, 0, 2.4); rl(A.armR, 0, 0, -2.4); }
  A.head.rotation.z = Math.sin(t * 1.2) * 0.03;
  A.body.position.y = HIP + Math.abs(Math.sin(t * 9)) * 0.03 * a.walk;
}
function emoteAnim(av, dt) {
  const a = av.anim; a.emoteT += dt; const t = a.emoteT; const A = av;
  const rl = (o, x, y, z) => { o.rotation.x = lerp(o.rotation.x, x, 0.3); o.rotation.y = lerp(o.rotation.y, y, 0.3); o.rotation.z = lerp(o.rotation.z, z, 0.3); };
  switch (a.emote) {
    case 'wave': rl(A.armR, -2.6 + Math.sin(t * 10) * 0.3, 0, -0.3); rl(A.armL, 0, 0, 0.05); break;
    case 'heart': rl(A.armL, -2.2, 0, -0.7); rl(A.armR, -2.2, 0, 0.7); rl(A.head, -0.1, 0, 0); break;
    case 'dance': A.root.rotation.y = Math.sin(t * 6) * 0.5; rl(A.armL, Math.sin(t * 6) * 1.4 - 0.8, 0, 0.3); rl(A.armR, -Math.sin(t * 6) * 1.4 - 0.8, 0, -0.3); A.body.position.y = HIP + Math.abs(Math.sin(t * 6)) * 0.06; break;
    case 'jump': A.root.position.y = Math.abs(Math.sin(t * 7)) * 0.3; rl(A.armL, 0, 0, 2.6); rl(A.armR, 0, 0, -2.6); break;
    case 'sit': rl(A.legL, -1.45, 0, 0); rl(A.legR, -1.45, 0, 0); A.root.position.y = -0.22; break;
    case 'laugh': rl(A.head, -0.16 + Math.sin(t * 14) * 0.08, 0, 0); rl(A.armL, -0.5, 0, 0.4); rl(A.armR, -0.5, 0, -0.4); break;
    case 'clap': { const c = Math.abs(Math.sin(t * 9)); rl(A.armL, -1.4, 0.7 * c, 0); rl(A.armR, -1.4, -0.7 * c, 0); break; }
    case 'sleep': rl(A.head, 0, 0, 0.3); rl(A.armL, 0, 0, 0.2); rl(A.armR, 0, 0, -0.2); break;
  }
  if (a.emoteT > 3.4 && a.emote !== 'sit') { a.emote = null; a.emoteT = 0; A.root.rotation.y = 0; A.root.position.y = 0; }
}
function posePair(av) {
  const A = av; const a = av.anim; const r = a.poseRole;
  const st = (o, x, y, z) => { o.rotation.set(x, y, z); };
  st(A.armL, 0, 0, 0.06); st(A.armR, 0, 0, -0.06); st(A.legL, 0, 0, 0); st(A.legR, 0, 0, 0); st(A.head, 0, 0, 0);
  A.root.position.y = 0; A.root.rotation.y = 0; A.body.position.y = HIP;
  switch (a.pose) {
    case 'hands': if (r === 0) st(A.armR, -1.2, 0, -0.5); else st(A.armL, -1.2, 0, 0.5); st(A.head, 0, r === 0 ? 0.3 : -0.3, 0); break;
    case 'hug': st(A.armL, -1.5, 0, r ? 0.5 : 0.3); st(A.armR, -1.5, 0, r ? -0.3 : -0.5); st(A.head, 0, 0, r ? 0.12 : -0.12); break;
    case 'kiss': st(A.head, -0.08, 0, r ? 0.1 : -0.1); st(A.armL, r ? -0.4 : -1.4, 0, 0.3); st(A.armR, r ? -1.4 : -0.4, 0, -0.3); break;
    case 'back': st(A.armL, 0, 0, 0.9); st(A.armR, 0, 0, -0.9); st(A.head, 0, r ? 0.4 : -0.4, 0); break;
    case 'peace': st(A.armR, -2.4, 0, -0.5); st(A.head, 0, 0, r ? 0.14 : -0.14); break;
    case 'highfive': if (r === 0) st(A.armR, -2.2, 0, -0.35); else st(A.armL, -2.2, 0, 0.35); break;
    case 'smile': st(A.head, -0.05, 0, 0.06); break;
    case 'peace1': st(A.armR, -2.4, 0, -0.5); st(A.head, 0, 0, 0.12); break;
    case 'think': st(A.armR, -2.0, 0, -0.9); st(A.head, 0.12, 0.2, 0); break;
    case 'hero': st(A.armL, 0, 0, 0.5); st(A.armR, 0, 0, -0.5); st(A.head, -0.12, 0, 0); break;
    case 'cute': st(A.armL, -2.6, 0, 0.3); st(A.armR, -2.6, 0, -0.3); st(A.head, -0.1, 0, 0.14); break;
    case 'sit1': st(A.legL, -1.45, 0, 0); st(A.legR, -1.45, 0, 0); A.root.position.y = -0.22; st(A.armL, -0.3, 0, 0.1); st(A.armR, -0.3, 0, -0.1); break;
  }
}
