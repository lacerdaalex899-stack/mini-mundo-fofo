// Definições de blocos, itens e receitas
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, LOG: 6, LEAF: 7, BLOG: 8, BLEAF: 9, PLOG: 10, PLEAF: 11,
  SLEAF: 12, SLOG: 13, PLANK: 14, COAL: 15, IRON: 16, GOLD: 17, CRYS: 18, SNOW: 19, COBBLE: 20, BRICK: 21, GLASS: 22,
  FURNACE: 23, BENCH: 24, POT: 25, TABLE: 26, MLEAF: 27, PALMLOG: 28, PALMLEAF: 29, LANTERN: 30, PLANK_P: 31,
  PLANK_W: 32, PLANK_B: 33, PLANK_Y: 34, SMOOTH: 35, BEDROCK: 36, WOOL: 37,
  TGRASS: 40, ROSE: 41, DAISY: 42, TULIP: 43, SUNF: 44, LAV: 45, HYD: 46, MUSH_R: 47, MUSH_B: 48, BUSH: 49, FERN: 50, WHEAT: 51,
  ROSE_P: 52, ROSE_W: 53, ROSE_Y: 54, ROSE_B: 55, ROSE_V: 56, TULIP_P: 57, HYD_P: 58, CHERRY_F: 59,
  CHAIR: 60, BED: 64, BEDF: 68,
};
export const I = {
  STICK: 100, COALI: 101, IRONI: 102, GOLDI: 103, CRYSI: 104, EGG: 106, MILK: 107, APPLE: 108, BERRY: 109, COCO: 110, FIBER: 111,
  BREAD: 112, BAPPLE: 113, COOKIE: 114, SOUP: 115, JAM: 116, SALAD: 117, CAKE: 118, OMELET: 119, HOTMILK: 120,
  BOUQUET: 121, RING: 122, AXE1: 130, AXE2: 131, AXE3: 132, PICK1: 133, PICK2: 134, PICK3: 135, BEDI: 136, CHAIRI: 137,
};
// grupos (ids negativos) para receitas
export const GRP = { LOG: -1, FLOWER: -2, PLANK: -3, MUSH: -4, LEAF: -5 };
export const GROUPS = {
  [-1]: { name: 'Tronco (qualquer)', ids: [6, 8, 10, 13, 28] },
  [-2]: { name: 'Flores (quaisquer)', ids: [41, 42, 43, 44, 45, 46, 52, 53, 54, 55, 56, 57, 58, 59] },
  [-3]: { name: 'Tábua (qualquer)', ids: [14, 31, 32, 33, 34] },
  [-4]: { name: 'Cogumelo', ids: [47, 48] },
  [-5]: { name: 'Folhas', ids: [7, 9, 11, 12, 27, 29] },
};

// kind: cube | plant | model | liquid ; t = tipo de ferramenta ('a' machado, 'p' picareta) ; lv = nível mínimo da picareta
export const BD = [];
function def(id, name, o) { BD[id] = Object.assign({ id, name, kind: 'cube', solid: true, opaque: true, hard: 0.6, t: null, lv: 0, ch: 1, drop: id }, o); }
def(0, 'Ar', { kind: 'air', solid: false, opaque: false });
def(1, 'Grama', { c: 0xa8744f, top: 0x7ecb5a, bot: 0xa8744f, hard: 0.6, drop: 2 });
def(2, 'Terra', { c: 0xa8744f, hard: 0.5 });
def(3, 'Pedra', { c: 0x9aa0a8, hard: 3, t: 'p', lv: 1, drop: 20 });
def(4, 'Areia', { c: 0xf2e2a8, hard: 0.5 });
def(5, 'Água', { kind: 'liquid', solid: false, opaque: false, c: 0x4aa8e8 });
def(6, 'Tronco de carvalho', { c: 0x8a6240, top: 0xc9a877, bot: 0xc9a877, hard: 2, t: 'a' });
def(7, 'Folhas de carvalho', { c: 0x5fb04a, hard: 0.25, leaf: 1 });
def(8, 'Tronco de bétula', { c: 0xece8dc, pat: 0x6b6258, top: 0xd9c9a0, bot: 0xd9c9a0, hard: 2, t: 'a' });
def(9, 'Folhas de bétula', { c: 0x8fd163, hard: 0.25, leaf: 1 });
def(10, 'Tronco de pinheiro', { c: 0x5e4433, top: 0xa8845c, bot: 0xa8845c, hard: 2, t: 'a' });
def(11, 'Folhas de pinheiro', { c: 0x3f8f5f, hard: 0.25, leaf: 1 });
def(12, 'Flores de cerejeira', { c: 0xffb3d1, hard: 0.25, leaf: 1 });
def(13, 'Tronco de cerejeira', { c: 0x7a4a48, top: 0xd9a38f, bot: 0xd9a38f, hard: 2, t: 'a' });
def(14, 'Tábua', { c: 0xd9a868, hard: 1.4, t: 'a', plank: 1 });
def(15, 'Minério de carvão', { c: 0x9aa0a8, pat: 0x33333d, hard: 3.5, t: 'p', lv: 1, drop: 101 });
def(16, 'Minério de ferro', { c: 0x9aa0a8, pat: 0xe9b48e, hard: 4, t: 'p', lv: 2 });
def(17, 'Minério de ouro', { c: 0x9aa0a8, pat: 0xffd84a, hard: 4, t: 'p', lv: 2 });
def(18, 'Minério de cristal', { c: 0x9aa0a8, pat: 0xff8fd8, hard: 4.5, t: 'p', lv: 3, drop: 104 });
def(19, 'Neve', { c: 0xf8fbff, hard: 0.4 });
def(20, 'Pedregulho', { c: 0x8c9099, pat: 0x767b85, hard: 3, t: 'p', lv: 1 });
def(21, 'Tijolo', { c: 0xc96f5a, pat: 0xb25a48, hard: 3, t: 'p', lv: 1 });
def(22, 'Vidro', { kind: 'glass', opaque: false, c: 0xdff4ff, hard: 0.4 });
def(23, 'Fornalha', { kind: 'model', c: 0x8c9099, hard: 2.5, t: 'p', lv: 1, station: 'furnace' });
def(24, 'Bancada', { kind: 'model', c: 0xd9a868, hard: 1.4, t: 'a', station: 'bench' });
def(25, 'Panela', { kind: 'model', opaque: false, c: 0x555a66, hard: 1.2, ch: 0.8, station: 'pot' });
def(26, 'Mesa', { kind: 'model', opaque: false, c: 0xd9a868, hard: 1, t: 'a', ch: 0.9 });
def(27, 'Folhas de bordo', { c: 0xf09a3e, hard: 0.25, leaf: 1 });
def(28, 'Tronco de palmeira', { c: 0xb08a5a, pat: 0x9a744a, top: 0xd9c08a, bot: 0xd9c08a, hard: 2, t: 'a' });
def(29, 'Folhas de palmeira', { c: 0x6cc24a, hard: 0.25, leaf: 1 });
def(30, 'Lanterna', { kind: 'model', opaque: false, solid: false, c: 0xffe08a, hard: 0.3, light: 1 });
def(31, 'Tábua rosa', { c: 0xffb7cf, hard: 1.4, t: 'a', plank: 1 });
def(32, 'Tábua branca', { c: 0xfff5ea, hard: 1.4, t: 'a', plank: 1 });
def(33, 'Tábua azul', { c: 0xa9d4ff, hard: 1.4, t: 'a', plank: 1 });
def(34, 'Tábua amarela', { c: 0xffe38a, hard: 1.4, t: 'a', plank: 1 });
def(35, 'Pedra lisa', { c: 0xb9bec6, hard: 3, t: 'p', lv: 1 });
def(36, 'Rocha-mãe', { c: 0x4a4a55, hard: 1e9 });
def(37, 'Lã', { c: 0xfffaf5, hard: 0.5 });
const plant = (id, name, o) => def(id, name, Object.assign({ kind: 'plant', solid: false, opaque: false, hard: 0.08 }, o));
plant(40, 'Capim', { drop: 111 });
plant(41, 'Rosa', { flower: 1 });
plant(42, 'Margarida', { flower: 1 });
plant(43, 'Tulipa', { flower: 1 });
plant(44, 'Girassol', { flower: 1 });
plant(45, 'Lavanda', { flower: 1 });
plant(46, 'Hortênsia', { flower: 1 });
plant(47, 'Cogumelo vermelho', {});
plant(48, 'Cogumelo marrom', {});
plant(49, 'Arbusto de frutinhas', { drop: 109, hard: 0.3 });
plant(50, 'Samambaia', { drop: 111 });
plant(51, 'Trigo', {});
plant(52, 'Rosa cor-de-rosa', { flower: 1 });
plant(53, 'Rosa branca', { flower: 1 });
plant(54, 'Rosa amarela', { flower: 1 });
plant(55, 'Rosa azul', { flower: 1 });
plant(56, 'Rosa lilás', { flower: 1 });
plant(57, 'Tulipa rosa', { flower: 1 });
plant(58, 'Hortênsia rosa', { flower: 1 });
plant(59, 'Flor de cerejeira', { flower: 1 });
for (let d = 0; d < 4; d++) def(60 + d, 'Cadeira', { kind: 'model', opaque: false, c: 0xd9a868, hard: 0.8, t: 'a', ch: 0.5, drop: 137, dir: d, seat: 1 });
for (let d = 0; d < 4; d++) def(64 + d, 'Cama', { kind: 'model', opaque: false, c: 0xd9a868, hard: 0.8, t: 'a', ch: 0.56, drop: 136, dir: d, bed: 1 });
def(68, 'Cama', { kind: 'bedfoot', opaque: false, c: 0xd9a868, hard: 0.8, t: 'a', ch: 0.56, drop: 136 });

export const isPlant = id => id >= 40 && id <= 59;
export const FLOWER_IDS = [41, 42, 43, 44, 45, 46, 52, 53, 54, 55, 56, 57, 58, 59];
export const isFlower = id => FLOWER_IDS.indexOf(id) >= 0;
export const isLeaf = id => id === 7 || id === 9 || id === 11 || id === 12 || id === 27 || id === 29;
export const isLog = id => id === 6 || id === 8 || id === 10 || id === 13 || id === 28;

// Itens (não-blocos)
export const IT = {};
function item(id, name, o) { IT[id] = Object.assign({ id, name }, o || {}); }
item(100, 'Graveto'); item(101, 'Carvão'); item(102, 'Barra de ferro'); item(103, 'Barra de ouro'); item(104, 'Cristal');
item(106, 'Ovo'); item(107, 'Leite', { food: 30 }); item(108, 'Maçã', { food: 30 }); item(109, 'Frutinhas', { food: 15 });
item(110, 'Coco', { food: 30 }); item(111, 'Fibra');
item(112, 'Pão', { food: 90 }); item(113, 'Maçã assada', { food: 70 }); item(114, 'Biscoito', { food: 60 });
item(115, 'Sopa de cogumelo', { food: 120 }); item(116, 'Geleia', { food: 90 }); item(117, 'Salada de frutas', { food: 100 });
item(118, 'Bolo', { food: 240 }); item(119, 'Omelete', { food: 120 }); item(120, 'Leite quentinho', { food: 90 });
item(121, 'Buquê de flores', { gift: 1 }); item(122, 'Aliança', { gift: 1 });
item(130, 'Machado de madeira', { tool: 'a', lv: 1 }); item(131, 'Machado de pedra', { tool: 'a', lv: 2 }); item(132, 'Machado de ferro', { tool: 'a', lv: 3 });
item(133, 'Picareta de madeira', { tool: 'p', lv: 1 }); item(134, 'Picareta de pedra', { tool: 'p', lv: 2 }); item(135, 'Picareta de ferro', { tool: 'p', lv: 3 });
item(136, 'Cama', { place: 64 }); item(137, 'Cadeira', { place: 60 });

export function itemName(id) { if (id < 0) return GROUPS[id].name; return id < 100 ? (BD[id] ? BD[id].name : '?') : (IT[id] ? IT[id].name : '?'); }
export const isPlaceable = id => (id > 0 && id < 60 && id !== 5 && id !== 36) || id === 136 || id === 137;

// Receitas: st = hand | bench | furnace | pot
const R = (st, out, n, ...ins) => ({ st, out, n, ins });
export const RECIPES = [
  R('hand', 14, 4, [-1, 1]),
  R('hand', 100, 4, [-3, 2]),
  R('hand', 24, 1, [-3, 4]),
  R('hand', 130, 1, [-3, 3], [100, 2]),
  R('hand', 133, 1, [-3, 3], [100, 2]),
  R('hand', 121, 1, [-2, 10]),
  R('hand', 30, 2, [101, 1], [100, 1]),
  R('hand', 37, 1, [111, 4]),
  R('bench', 131, 1, [20, 3], [100, 2]),
  R('bench', 134, 1, [20, 3], [100, 2]),
  R('bench', 132, 1, [102, 3], [100, 2]),
  R('bench', 135, 1, [102, 3], [100, 2]),
  R('bench', 23, 1, [20, 8]),
  R('bench', 25, 1, [20, 4], [101, 1], [100, 2]),
  R('bench', 26, 1, [-3, 3], [100, 2]),
  R('bench', 137, 1, [-3, 2], [100, 2]),
  R('bench', 136, 1, [-3, 3], [37, 2]),
  R('bench', 31, 4, [-3, 4], [43, 1]),
  R('bench', 32, 4, [-3, 4], [42, 1]),
  R('bench', 33, 4, [-3, 4], [46, 1]),
  R('bench', 34, 4, [-3, 4], [44, 1]),
  R('bench', 122, 1, [103, 1], [104, 1]),
  R('furnace', 102, 1, [16, 1]),
  R('furnace', 103, 1, [17, 1]),
  R('furnace', 22, 1, [4, 1]),
  R('furnace', 35, 1, [20, 1]),
  R('furnace', 21, 1, [2, 2]),
  R('furnace', 112, 1, [51, 3]),
  R('furnace', 113, 1, [108, 1]),
  R('furnace', 114, 2, [51, 1], [109, 1]),
  R('pot', 115, 1, [-4, 2]),
  R('pot', 116, 1, [109, 3]),
  R('pot', 117, 1, [108, 1], [109, 2]),
  R('pot', 118, 1, [51, 2], [106, 1], [107, 1]),
  R('pot', 119, 1, [106, 2]),
  R('pot', 120, 1, [107, 1]),
];
export const STATION_NAMES = { hand: 'Mãos', bench: 'Bancada', furnace: 'Fornalha', pot: 'Panela' };
