import { G, THREE, hash2, lerp, clamp, angLerp } from './g.js';
import { World, CS } from './world.js';
import { B } from './blocks.js';

// Animais fofos e quadradinhos, domesticáveis
export const SPECIES = {
  bunny: { name: 'Coelhinho', food: [41, 42, 43, 44, 45, 46, 40], c: 0xfff5ea, c2: 0xffb7cf, speed: 2.2, drop: null },
  cat: { name: 'Gatinho', food: [109], c: 0xffc29e, c2: 0xfff5ea, speed: 2.6 },
  dog: { name: 'Cachorrinho', food: [112, 114], c: 0xc9a877, c2: 0xfff5ea, speed: 2.8 },
  chick: { name: 'Pintinho', food: [51], c: 0xffe38a, c2: 0xff9d5c, speed: 1.8, lay: 106 },
  cow: { name: 'Vaquinha', food: [51, 40], c: 0xfff5ea, c2: 0x6b4226, speed: 1.6, milk: 107 },
  sheep: { name: 'Ovelhinha', food: [51, 40], c: 0xfffaf5, c2: 0xffc29e, speed: 1.7 },
  fox: { name: 'Raposinha', food: [109], c: 0xff9d5c, c2: 0xfff5ea, speed: 3 },
};
const mat = c => new THREE.MeshLambertMaterial({ color: c });
const bx = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));

export function buildAnimal(sp) {
  const S = SPECIES[sp]; const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const scale = sp === 'cow' ? 1.25 : sp === 'sheep' ? 1.1 : sp === 'chick' ? 0.55 : 0.8;
  const B_ = bx(0.5 * scale, 0.4 * scale, 0.7 * scale, S.c); B_.position.y = 0.35 * scale; body.add(B_);
  const head = new THREE.Group(); head.position.set(0, 0.5 * scale, 0.38 * scale); body.add(head);
  const H = bx(0.44 * scale, 0.4 * scale, 0.36 * scale, S.c); H.position.y = 0.08 * scale; head.add(H);
  // olhos
  for (const sx of [-0.1, 0.1]) {
    const e = bx(0.085 * scale, 0.12 * scale, 0.02, 0x2a2230); e.position.set(sx * scale, 0.1 * scale, 0.19 * scale); head.add(e);
    const hl = bx(0.032 * scale, 0.042 * scale, 0.02, 0xffffff); hl.position.set((sx + 0.025) * scale, 0.135 * scale, 0.197 * scale); head.add(hl);
    const hl2 = bx(0.018 * scale, 0.022 * scale, 0.02, 0xffffff); hl2.position.set((sx - 0.022) * scale, 0.07 * scale, 0.197 * scale); head.add(hl2);
    const gw = bx(0.06 * scale, 0.025 * scale, 0.02, 0x8a7a88); gw.position.set(sx * scale, 0.052 * scale, 0.195 * scale); head.add(gw);
  }
  // bochechinhas de anime
  for (const sx of [-0.16, 0.16]) { const ch = bx(0.055 * scale, 0.03 * scale, 0.02, 0xffa8b0); ch.position.set(sx * scale, 0.02 * scale, 0.185 * scale); head.add(ch); }
  // focinho / bico
  if (sp === 'chick') { const bk = bx(0.1 * scale, 0.08 * scale, 0.1 * scale, 0xff9d5c); bk.position.set(0, 0.02 * scale, 0.22 * scale); head.add(bk); }
  else { const n = bx(0.12 * scale, 0.08 * scale, 0.04, S.c2); n.position.set(0, -0.02 * scale, 0.2 * scale); head.add(n); }
  // orelhas
  if (sp === 'bunny') for (const sx of [-0.11, 0.11]) { const e = bx(0.1 * scale, 0.4 * scale, 0.08 * scale, S.c); e.position.set(sx * scale, 0.45 * scale, 0); head.add(e); const ei = bx(0.05 * scale, 0.3 * scale, 0.06 * scale, S.c2); ei.position.set(sx * scale, 0.45 * scale, 0.02 * scale); head.add(ei); }
  if (sp === 'cat' || sp === 'fox') for (const sx of [-0.14, 0.14]) { const e = bx(0.12 * scale, 0.14 * scale, 0.06 * scale, S.c); e.position.set(sx * scale, 0.32 * scale, 0); head.add(e); }
  if (sp === 'dog') for (const sx of [-0.18, 0.18]) { const e = bx(0.1 * scale, 0.22 * scale, 0.08 * scale, S.c2); e.position.set(sx * scale, 0.2 * scale, 0); head.add(e); }
  if (sp === 'cow') { for (const sx of [-0.2, 0.2]) { const h = bx(0.08 * scale, 0.1 * scale, 0.08 * scale, 0xd8dce2); h.position.set(sx * scale, 0.3 * scale, 0); head.add(h); } const sp2 = bx(0.2 * scale, 0.14 * scale, 0.02, S.c2); sp2.position.set(0.1 * scale, 0.12 * scale, 0.185 * scale); head.add(sp2); }
  if (sp === 'sheep') { const w = bx(0.56 * scale, 0.46 * scale, 0.76 * scale, 0xfffaf5); w.position.y = 0.38 * scale; body.add(w); const wt = bx(0.5 * scale, 0.2 * scale, 0.4 * scale, 0xfffaf5); wt.position.set(0, 0.26 * scale, 0.04 * scale); head.add(wt); H.material = mat(S.c2); }
  // patas
  const legs = [];
  for (const [sx, sz] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.22], [0.15, -0.22]]) {
    const l = new THREE.Group(); l.position.set(sx * scale, 0.18 * scale, sz * scale);
    const p = bx(0.12 * scale, 0.2 * scale, 0.12 * scale, S.c2 === 0xfff5ea && sp !== 'dog' ? S.c : S.c2); p.position.y = -0.1 * scale; l.add(p);
    body.add(l); legs.push(l);
  }
  // rabinho
  let tail = null;
  if (sp === 'cat' || sp === 'fox') { tail = bx(0.1 * scale, 0.1 * scale, 0.34 * scale, sp === 'fox' ? 0xfff5ea : S.c); tail.position.set(0, 0.42 * scale, -0.42 * scale); body.add(tail); }
  else if (sp === 'dog') { tail = bx(0.08 * scale, 0.2 * scale, 0.08 * scale, S.c); tail.position.set(0, 0.5 * scale, -0.38 * scale); tail.rotation.x = 0.6; body.add(tail); }
  else if (sp === 'bunny' || sp === 'sheep') { tail = bx(0.12 * scale, 0.12 * scale, 0.12 * scale, 0xffffff); tail.position.set(0, 0.35 * scale, -0.4 * scale); body.add(tail); }
  return { group: g, body, head, legs, tail, scale };
}

let NEXT_ID = 1;
export const Animals = {
  list: new Map(), group: null, hearts: [],
  init() { if (this.group) G.scene.remove(this.group); this.group = new THREE.Group(); G.scene.add(this.group); this.list.clear(); NEXT_ID = 1; },
  spawnAround(px, pz, isHost) {
    if (!isHost) return;
    // spawna alguns por área usando determinismo por célula
    const cellX = Math.floor(px / 48), cellZ = Math.floor(pz / 48);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const cx = cellX + dx, cz = cellZ + dz; const ck = cx + ';' + cz;
      if (this._cells && this._cells.has(ck)) continue;
      (this._cells = this._cells || new Set()).add(ck);
      const r = hash2(cx, cz, World.seed ^ 555);
      const n = 1 + ((r * 3) | 0);
      const keys = Object.keys(SPECIES);
      for (let i = 0; i < n; i++) {
        const rx = cx * 48 + hash2(cx * 7 + i, cz, 1) * 48, rz = cz * 48 + hash2(cx, cz * 9 + i, 2) * 48;
        const y = World.groundY(rx, rz); if (y < 26 || y > 45) continue;
        const sp = keys[(hash2(cx + i, cz - i, 3) * keys.length) | 0];
        this.add({ id: 'a' + (NEXT_ID++), sp, x: rx, y, z: rz, tame: null, name: null });
      }
    }
  },
  add(st) {
    if (this.list.has(st.id)) return this.list.get(st.id);
    const m = buildAnimal(st.sp);
    m.group.position.set(st.x, st.y, st.z);
    this.group.add(m.group);
    const a = Object.assign({ vx: 0, vz: 0, vy: 0, yaw: hash2(st.x | 0, st.z | 0, 4) * 6.28, t: Math.random() * 10, wanderT: 0, mesh: m, tx: st.x, ty: st.y, tz: st.z, tyaw: 0, hearts: 0 }, st);
    this.list.set(st.id, a);
    return a;
  },
  remove(id) { const a = this.list.get(id); if (a) { this.group.remove(a.mesh.group); this.list.delete(id); } },
  // host simula; convidados interpolam
  update(dt, isHost, player, net) {
    for (const a of this.list.values()) {
      a.t += dt;
      const m = a.mesh;
      if (isHost) {
        a.wanderT -= dt;
        let sx = 0, sz = 0, spd = 0;
        const S = SPECIES[a.sp];
        if (a.tame) {
          // segue o dono
          const owner = a.tame === net.myId ? player : net.peersPos[a.tame];
          if (owner) {
            const dx = owner.x - a.x, dz = owner.z - a.z, d = Math.hypot(dx, dz);
            if (d > 2.4) { sx = dx / d; sz = dz / d; spd = S.speed * (d > 7 ? 1.7 : 1); a.yaw = Math.atan2(sx, sz); }
          }
        } else if (a.wanderT <= 0) {
          a.wanderT = 2 + Math.random() * 4;
          if (Math.random() < 0.55) { a.yaw = Math.random() * 6.28; a.wander = Math.random() < 0.7; } else a.wander = false;
        }
        if (!a.tame && a.wander) { sx = Math.sin(a.yaw); sz = Math.cos(a.yaw); spd = S.speed * 0.5; }
        // física simples
        a.vy -= 22 * dt;
        let nx = a.x + sx * spd * dt, nz = a.z + sz * spd * dt;
        if (!World.solidAt(nx, a.y + 0.2, nz) || !World.solidAt(nx, a.y + 0.7, nz)) { } else { // tenta pular
          if (World.solidAt(nx, a.y + 0.2, nz) && !World.solidAt(nx, a.y + 1.2, nz) && a.vy <= 0) a.vy = 7.2;
          nx = a.x; nz = a.z;
        }
        a.x = nx; a.z = nz;
        a.y += a.vy * dt;
        const gy = World.groundY(a.x, a.z);
        if (a.y <= gy) { a.y = gy; a.vy = 0; }
        if (a.y < gy - 2) a.y = gy;
        a.moving = spd > 0.1;
      } else {
        // interpola para alvo da rede
        const k = 1 - Math.exp(-9 * dt);
        a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k);
        a.yaw = angLerp(a.yaw, a.tyaw, k);
        a.moving = Math.hypot(a.tx - a.x, a.tz - a.z) > 0.05;
      }
      m.group.position.set(a.x, a.y, a.z);
      m.group.rotation.y = a.yaw;
      // animação fofa
      const w = a.moving ? Math.sin(a.t * 10) * 0.5 : 0;
      m.legs[0].rotation.x = w; m.legs[1].rotation.x = -w; m.legs[2].rotation.x = -w; m.legs[3].rotation.x = w;
      m.head.rotation.x = Math.sin(a.t * 1.5) * 0.06 + (a.moving ? 0 : Math.sin(a.t * 0.7) * 0.1);
      if (m.tail) m.tail.rotation.y = Math.sin(a.t * (a.tame ? 9 : 3)) * (a.tame ? 0.5 : 0.2);
      if (a.sp === 'bunny' && a.moving) m.body.position.y = Math.abs(Math.sin(a.t * 8)) * 0.18;
      if (a.hearts > 0) a.hearts -= dt;
    }
  },
  nearest(x, y, z, maxD) {
    let best = null, bd = maxD;
    for (const a of this.list.values()) { const d = Math.hypot(a.x - x, a.z - z) + Math.abs(a.y - y) * 0.5; if (d < bd) { bd = d; best = a; } }
    return best;
  },
  serialize() { const out = []; for (const a of this.list.values()) out.push({ id: a.id, sp: a.sp, x: +a.x.toFixed(2), y: +a.y.toFixed(2), z: +a.z.toFixed(2), yaw: +a.yaw.toFixed(2), tame: a.tame, name: a.name }); return out; },
  applyState(arr) {
    const seen = new Set();
    for (const st of arr) {
      seen.add(st.id);
      let a = this.list.get(st.id);
      if (!a) a = this.add(st);
      a.tx = st.x; a.ty = st.y; a.tz = st.z; a.tyaw = st.yaw; a.tame = st.tame; a.name = st.name;
    }
    for (const id of [...this.list.keys()]) if (!seen.has(id)) this.remove(id);
  },
};
