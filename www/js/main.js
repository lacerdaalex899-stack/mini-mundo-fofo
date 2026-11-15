import { G, THREE, $, $$, clamp, lerp, strHash, angLerp } from './g.js';
import { B, BD, IT, itemName, isFlower, isPlaceable, FLOWER_IDS } from './blocks.js';
import { World, SEA } from './world.js';
import { Mesher } from './mesher.js';
import { warmStep } from './plants.js';
import { Player } from './player.js';
import { Inv } from './inventory.js';
import { UI, iconFor } from './ui.js';
import { Net } from './net.js';
import { Animals, SPECIES } from './animals.js';
import { Audio2 } from './audio.js';
import { buildAvatar, animateAvatar, setHeld, defaultProfile, buildItemMesh, EMOTES, POSES_DUO, POSES_SOLO } from './avatar.js';

// ================== CENA ==================
const canvas = $('#c');
G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
G.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
G.scene = new THREE.Scene();
G.camera = new THREE.PerspectiveCamera(70, 2, 0.1, 400);
const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(40, 80, 20); G.scene.add(sun);
const amb = new THREE.AmbientLight(0xbfd4ff, 0.75); G.scene.add(amb);
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a6f55, 0.5); G.scene.add(hemi);
G.scene.fog = new THREE.Fog(0xbfe3ff, 40, 150);

// céu fofo: sol/lua + estrelas + nuvens
const skyGroup = new THREE.Group(); G.scene.add(skyGroup);
const mkDisc = (c, s, em = 1.2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s * 0.3), new THREE.MeshBasicMaterial({ color: c })); return m; };
const sunM = mkDisc(0xffd84a, 7); const moonM = mkDisc(0xfff5dd, 5); skyGroup.add(sunM, moonM);
const stars = new THREE.Group();
for (let i = 0; i < 90; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2; const r = 160; s.position.set(Math.cos(a) * Math.cos(b) * r, Math.abs(Math.sin(b)) * r * 0.9 + 6, Math.sin(a) * Math.cos(b) * r); stars.add(s); }
G.scene.add(stars);
const clouds = new THREE.Group(); G.scene.add(clouds);
for (let i = 0; i < 16; i++) {
  const cl = new THREE.Group();
  const n = 2 + (Math.random() * 3 | 0);
  for (let j = 0; j < n; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 7, 2.2, 4 + Math.random() * 4), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); b.position.set(j * 4 - n * 2 + Math.random() * 2, Math.random(), Math.random() * 3); cl.add(b); }
  cl.position.set((Math.random() - 0.5) * 300, 58 + Math.random() * 14, (Math.random() - 0.5) * 300);
  cl.userData.v = 0.3 + Math.random() * 0.5;
  clouds.add(cl);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  G.renderer.setSize(w, h, false);
  G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
  $('#rotate').classList.toggle('on', h > w && G.mode !== 'title');
}
addEventListener('resize', resize); resize();

// ================== DIA/NOITE (10 min dia + 10 min noite) ==================
const DAY_LEN = 1200; // 10 min de dia + 10 min de noite
let dayT = DAY_LEN * 0.2; // começa de manhã
const skyDay = new THREE.Color(0x9ed4ff), skyEve = new THREE.Color(0xffb28a), skyNight = new THREE.Color(0x1a2342);
const fogDay = new THREE.Color(0xbfe3ff), fogNight = new THREE.Color(0x232c4d);
const tmp1 = new THREE.Color(), tmp2 = new THREE.Color();
function updateSky(dt) {
  dayT = (dayT + dt) % DAY_LEN;
  const ph = dayT / DAY_LEN; // 0..1 (0=amanhecer)
  const ang = ph * Math.PI * 2 - Math.PI / 2;
  const sx = Math.cos(ang) * 150, sy = Math.sin(ang) * 130;
  sunM.position.set(G.camera.position.x + sx, Math.max(-20, sy) + 10, G.camera.position.z - 90);
  moonM.position.set(G.camera.position.x - sx, Math.max(-20, -sy) + 10, G.camera.position.z - 90);
  sunM.lookAt(G.camera.position); moonM.lookAt(G.camera.position);
  const dayness = clamp(Math.sin(ph * Math.PI * 2) * 1.6 + 0.5, 0, 1); // 1 dia, 0 noite
  const evening = clamp(1 - Math.abs(Math.sin(ph * Math.PI * 2)) * 3, 0, 1);
  tmp1.copy(skyNight).lerp(skyDay, dayness).lerp(skyEve, evening * 0.6);
  G.renderer.setClearColor(tmp1);
  tmp2.copy(fogNight).lerp(fogDay, dayness);
  G.scene.fog.color.copy(tmp2);
  G.scene.fog.near = 30 + G.settings.dist * 6; G.scene.fog.far = 60 + G.settings.dist * 28;
  sun.intensity = 0.25 + dayness * 0.95;
  sun.color.setHex(evening > 0.3 ? 0xffc9a0 : 0xffffff);
  amb.intensity = 0.32 + dayness * 0.45;
  hemi.intensity = 0.2 + dayness * 0.35;
  sun.position.set(G.camera.position.x + sx, Math.max(10, sy + 40), G.camera.position.z + 30);
  stars.visible = dayness < 0.45;
  stars.children.forEach((s, i) => s.material.opacity = (0.45 - dayness) * 2 * (0.4 + Math.abs(Math.sin(G.now * 1.5 + i)) * 0.6));
  stars.position.copy(G.camera.position);
  clouds.children.forEach(cl => { cl.position.x += cl.userData.v * dt; if (cl.position.x > G.camera.position.x + 170) cl.position.x = G.camera.position.x - 170; cl.children.forEach(b => b.material.opacity = 0.4 + dayness * 0.45); });
  $('#clock').textContent = dayness > 0.5 ? '☀️' : (evening > 0.3 ? '🌇' : '🌙');
}

// ================== JOGADORES REMOTOS ==================
const remotes = new Map(); // peer -> {av, st, nameEl}
function remoteFor(peer, d) {
  let r = remotes.get(peer);
  if (!r) {
    const av = buildAvatar(d.prof || defaultProfile(d.name));
    G.scene.add(av.group);
    const tag = document.createElement('div'); tag.className = 'nametag'; tag.textContent = d.name || '???';
    $('#tags').appendChild(tag);
    const bub = document.createElement('div'); bub.className = 'bubble'; $('#tags').appendChild(bub);
    r = { av, tag, bub, bubT: 0, x: d.x || 0, y: d.y || 0, z: d.z || 0, yaw: 0, st: d };
    remotes.set(peer, r);
    UI.addChat('', `${d.name || 'Alguém'} entrou! 🎉`, false, true);
    Audio2.sfx('tame');
  }
  return r;
}
function removeRemote(peer) {
  const r = remotes.get(peer); if (!r) return;
  G.scene.remove(r.av.group); r.tag.remove(); r.bub.remove(); remotes.delete(peer);
}
const v3 = new THREE.Vector3();
function updateRemotes(dt) {
  for (const r of remotes.values()) {
    const s = r.st;
    const k = 1 - Math.exp(-12 * dt);
    r.x = lerp(r.x, s.x, k); r.y = lerp(r.y, s.y, k); r.z = lerp(r.z, s.z, k);
    r.yaw = angLerp(r.yaw, s.ryaw || 0, k);
    const a = r.av;
    if (s.prof && JSON.stringify(s.prof) !== r.profJson) {
      r.profJson = JSON.stringify(s.prof);
      G.scene.remove(a.group); const nv = buildAvatar(s.prof); nv.anim = a.anim; r.av = nv; G.scene.add(nv.group);
    }
    const av = r.av;
    av.anim.sleeping = !!s.slp; av.anim.sitting = !!s.sit;
    av.anim.pose = s.pose || null; av.anim.poseRole = s.poseRole || 0;
    if (s.emote && s.emote !== r.lastEmote) { av.anim.emote = s.emote; av.anim.emoteT = 0; }
    r.lastEmote = s.emote;
    if (s.slp && s.bed) {
      av.group.position.set(s.bed.x, s.bed.y + 0.55, s.bed.z);
      av.group.rotation.y = s.bed.yaw; av.group.rotation.x = -Math.PI / 2;
    } else {
      av.group.rotation.x = 0;
      av.group.position.set(r.x, r.y, r.z);
      av.root.rotation.y = r.yaw;
    }
    setHeld(av, s.held || 0);
    animateAvatar(av, dt, Math.hypot(s.x - r.x, s.z - r.z) > 0.03 ? 1 : 0, true);
    // nametag + balão
    v3.set(r.x, r.y + 2.05, r.z).project(G.camera);
    const on = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    r.tag.style.display = on ? '' : 'none';
    if (on) { const px = (v3.x * 0.5 + 0.5) * innerWidth, py = (-v3.y * 0.5 + 0.5) * innerHeight; r.tag.style.transform = `translate(${px}px,${py}px)`; r.bub.style.transform = `translate(${px}px,${py - 34}px)`; }
    r.tag.textContent = (s.name || '???');
    if (r.bubT > 0) { r.bubT -= dt; if (r.bubT <= 0) r.bub.classList.remove('on'); }
    r.bub.style.display = on ? '' : 'none';
  }
}
function nearestRemote(maxD = 2.6) {
  let best = null, bd = maxD;
  for (const [peer, r] of remotes) { const d = Math.hypot(r.x - Player.x, r.z - Player.z); if (d < bd) { bd = d; best = { peer, r }; } }
  return best;
}

// ================== ESTADO LOCAL EXTRA ==================
let myEmote = null, myPose = null, myPoseRole = 0, holdMine = false, mineT = 0, breakFX = null;
let tts = null, dict = null, micOn = false;
let photoTimer = 0, photoPending = false;

// partículas fofas
const parts = [];
function puff(x, y, z, color, n = 8, up = false) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.6);
    m.userData = { vx: (Math.random() - 0.5) * 2.4, vy: Math.random() * 3 + (up ? 2.5 : 0.5), vz: (Math.random() - 0.5) * 2.4, t: 0.7 + Math.random() * 0.4 };
    G.scene.add(m); parts.push(m);
  }
}
function hearts(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), mat); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), mat.clone()); b.position.set(-0.06, 0.08, 0); g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), mat.clone()); c.position.set(0.06, 0.08, 0); g.add(c);
    g.position.set(x + (Math.random() - 0.5) * 0.8, y + 0.6 + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.8);
    g.userData = { vx: (Math.random() - 0.5), vy: 1.6 + Math.random(), vz: (Math.random() - 0.5), t: 1.3, heart: 1 };
    G.scene.add(g); parts.push(g);
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; const u = p.userData;
    u.t -= dt; if (u.t <= 0) { G.scene.remove(p); parts.splice(i, 1); continue; }
    if (!u.heart) u.vy -= 8 * dt;
    p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
    p.rotation.y += dt * 4;
    const op = Math.min(1, u.t * 2);
    p.traverse(o => { if (o.material) o.material.opacity = op; });
  }
}

// ================== ENTRADA (toque + mouse) ==================
const joyBase = $('#joy'), joyKnob = $('#joyknob');
let joyId = null, lookId = null, lookLX = 0, lookLY = 0, lookMoved = 0, lookT0 = 0;
function joyCenter() { const r = joyBase.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; }
addEventListener('pointerdown', e => {
  if (G.mode !== 'play' && G.mode !== 'photo') return;
  const onJoy = e.target.closest('#joy');
  if (e.target.closest('.ui') && !onJoy) return;
  Audio2.resume();
  const c = joyCenter();
  if (G.mode === 'play' && (onJoy || (e.clientX < innerWidth * 0.42 && Math.hypot(e.clientX - c.x, e.clientY - c.y) < c.R * 2.2))) {
    joyId = e.pointerId; moveJoy(e);
  } else {
    lookId = e.pointerId; lookLX = e.clientX; lookLY = e.clientY; lookMoved = 0; lookT0 = performance.now();
  }
});
addEventListener('pointermove', e => {
  if (e.pointerId === joyId) moveJoy(e);
  else if (e.pointerId === lookId) {
    const dx = e.clientX - lookLX, dy = e.clientY - lookLY; lookLX = e.clientX; lookLY = e.clientY;
    lookMoved += Math.abs(dx) + Math.abs(dy);
    Player.yaw -= dx * 0.0042;
    Player.pitch = clamp(Player.pitch - dy * 0.0036, -1.35, 1.35);
  }
});
function endPointer(e) {
  if (e.pointerId === joyId) { joyId = null; Player.joy.x = 0; Player.joy.z = 0; joyKnob.style.transform = 'translate(0px,0px)'; }
  if (e.pointerId === lookId) {
    const dt = performance.now() - lookT0;
    if (lookMoved < 14 && dt < 380 && G.mode === 'play' && !e.target.closest('.ui')) tapWorld();
    lookId = null;
  }
}
addEventListener('pointerup', endPointer); addEventListener('pointercancel', endPointer);
function moveJoy(e) {
  const c = joyCenter();
  let dx = e.clientX - c.x, dy = e.clientY - c.y;
  const d = Math.hypot(dx, dy), m = c.R * 0.75;
  if (d > m) { dx = dx / d * m; dy = dy / d * m; }
  joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
  Player.joy.x = dx / m; Player.joy.z = dy / m;
}
// teclado (para testes no computador)
const keys = {};
addEventListener('keydown', e => {
  if (UI.chatOpen && e.key !== 'Escape') return;
  keys[e.code] = true;
  if (e.code === 'Space') Player.jumpHeld = true;
  if (e.code === 'KeyT') UI.toggleChat(true);
  if (e.code === 'Escape') { UI.toggleChat(false); UI.closePanel(); }
  if (e.code === 'KeyF') toggleCam();
  if (e.code >= 'Digit1' && e.code <= 'Digit6') { Inv.sel = +e.code.slice(5) - 1; UI.renderHotbar(); onHotbarSel(); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') Player.jumpHeld = false; });
function keyJoy() {
  if (G.mode !== 'play') return;
  let x = 0, z = 0;
  if (keys['KeyW'] || keys['ArrowUp']) z -= 1; if (keys['KeyS'] || keys['ArrowDown']) z += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1; if (keys['KeyD'] || keys['ArrowRight']) x += 1;
  if (x || z) { Player.joy.x = x; Player.joy.z = z; }
  else if (joyId === null && (Player.joy.x || Player.joy.z) && !joyTouched) { Player.joy.x = 0; Player.joy.z = 0; }
}
let joyTouched = false;
joyBase.addEventListener('pointerdown', () => joyTouched = true);

// ================== AÇÕES DO MUNDO ==================
function onHotbarSel() { setHeld(Player.av, Inv.selected()); sendState(true); }
function toolPower(blockId) {
  const d = BD[blockId]; const sel = Inv.selected(); const it = IT[sel];
  let mult = 1, can = true;
  if (d.t === 'p') { const lv = it && it.tool === 'p' ? it.lv : 0; can = lv >= d.lv; mult = it && it.tool === 'p' ? 2.6 + lv : 1; }
  else if (d.t === 'a') { mult = it && it.tool === 'a' ? 2.6 + it.lv : 1; }
  return { can, mult };
}
function tapWorld() {
  // toque curto: interagir/quebrar conforme contexto
  const sel = Inv.selected();
  // 1) presente/domar: amigo ou bichinho perto na mira
  const nr = nearestRemote(2.8);
  const it = IT[sel];
  if (it && it.gift && nr) { giveGift(nr); return; }
  const an = Animals.nearest(Player.x, Player.y, Player.z, 2.6);
  if (an && sel && !an.tame && SPECIES[an.sp].food.includes(sel)) { tameAnimal(an, sel); return; }
  if (an && an.tame && !sel) { hearts(an.x, an.y + 0.3, an.z); Audio2.sfx('pop'); if (SPECIES[an.sp].milk && Math.random() < 0.4) { Inv.add(107); UI.toast('Leite fresquinho! 🥛'); } if (SPECIES[an.sp].lay && Math.random() < 0.4) { Inv.add(106); UI.toast('Um ovinho! 🥚'); } return; }
  const hit = Player.raycast();
  if (hit) {
    const d = BD[hit.b];
    // interações
    if (d.station && (d.station === 'furnace' || d.station === 'pot' || d.station === 'bench')) { UI.setNearby(nearbyStations()); UI.openPanel('craft'); UI.renderCraft(d.station); return; }
    if (d.seat) { Player.sitOn(hit.x, hit.y, hit.z, d.dir); sendState(true); return; }
    if (d.bed || d.kind === 'bedfoot') { trySleep(hit); return; }
    // colocar bloco se item selecionado for colocável e o alvo não for planta
    if (sel && isPlaceable(sel) && d.kind !== 'plant') { placeBlock(hit, sel); return; }
    // quebrar planta instantâneo
    if (d.kind === 'plant') { breakBlock(hit); return; }
    // comer
    if (it && it.food) { eatFood(sel); return; }
    // sem item colocável: começa a quebrar com toque longo? quebra rápida em toque: inicia mini quebra
    startMine(hit);
  } else if (it && it.food) eatFood(sel);
}
function eatFood(sel) {
  if (!Inv.take(sel, 1)) return;
  Audio2.sfx('eat'); UI.toast(`Hmmm, ${itemName(sel).toLowerCase()}! 😋`, iconFor(sel));
  puff(Player.x, Player.y + 1.2, Player.z, 0xffe38a, 6, true);
  onHotbarSel();
}
function placeBlock(hit, sel) {
  const nx = hit.x + hit.face[0], ny = hit.y + hit.face[1], nz = hit.z + hit.face[2];
  // não colocar dentro do jogador
  if (Math.abs(nx + 0.5 - Player.x) < 0.75 && Math.abs(nz + 0.5 - Player.z) < 0.75 && ny > Player.y - 1 && ny < Player.y + 1.8) return;
  let place = sel;
  const it = IT[sel];
  if (it && it.place !== undefined) place = it.place;
  if (place === 60 || place === 64) { // orienta cadeira/cama para o jogador
    let dir = Math.abs(Player.x - (nx + 0.5)) > Math.abs(Player.z - (nz + 0.5)) ? (Player.x > nx ? 2 : 3) : (Player.z > nz ? 0 : 1);
    place = place + dir;
    if (BD[place].bed) {
      // cama ocupa 2 blocos: cabeceira + pé na direção
      const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
      const fx = nx - dx, fz = nz - dz;
      if (World.get(fx, ny, fz) !== 0) { UI.toast('Precisa de espaço para a cama! 🛏️'); return; }
      if (!Inv.take(sel, 1)) return;
      World.set(nx, ny, nz, place); World.set(fx, ny, fz, B.BEDF);
      Audio2.sfx('place'); onHotbarSel(); return;
    }
  }
  if (!Inv.take(sel, 1)) return;
  World.set(nx, ny, nz, place);
  Audio2.sfx('place'); puff(nx + 0.5, ny + 0.5, nz + 0.5, BD[place].c || 0xffffff, 5);
  Player.av.anim.swing = 1;
  onHotbarSel();
}
let mining = null;
function startMine(hit) { mining = { ...hit, p: 0 }; }
function breakBlock(hit) {
  const d = BD[hit.b];
  const { can } = toolPower(hit.b);
  if (!can) { UI.toast(`Precisa de uma picareta ${d.lv >= 3 ? 'de ferro' : d.lv >= 2 ? 'de pedra' : ''} melhor! ⛏️`); return; }
  if (d.hard > 1e8) return;
  World.set(hit.x, hit.y, hit.z, 0);
  // cama: remove par
  if (d.bed) { const dx = [0, 0, 1, -1][d.dir], dz = [1, -1, 0, 0][d.dir]; if (World.get(hit.x - dx, hit.y, hit.z - dz) === B.BEDF) World.set(hit.x - dx, hit.y, hit.z - dz, 0); }
  if (d.kind === 'bedfoot') { for (let dir = 0; dir < 4; dir++) { const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir]; const nb = World.get(hit.x + dx, hit.y, hit.z + dz); if (nb >= 64 && nb <= 67 && nb - 64 === dir) { World.set(hit.x + dx, hit.y, hit.z + dz, 0); break; } } }
  const drop = d.drop !== undefined ? d.drop : hit.b;
  if (drop) { Inv.add(drop, d.ch >= 1 ? 1 : (Math.random() < d.ch ? 1 : 0)); }
  Audio2.sfx(d.kind === 'plant' ? 'pickup' : 'break');
  puff(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, d.c || 0x9aa0a8, 10);
  Player.av.anim.swing = 1;
  if (isFlower(hit.b)) {
    let fl = 0; for (const f of FLOWER_IDS) fl += Inv.count(f);
    if (fl === 10) UI.toast('10 flores! Já dá para fazer um buquê 💐 (menu Criar)');
  }
}
function updateMining(dt) {
  if (!holdMine) { if (mining) mining = null; $('#breakbar').style.display = 'none'; return; }
  const hit = Player.raycast();
  if (!hit) { mining = null; $('#breakbar').style.display = 'none'; return; }
  if (!mining || mining.x !== hit.x || mining.y !== hit.y || mining.z !== hit.z) mining = { ...hit, p: 0 };
  const d = BD[hit.b];
  const { can, mult } = toolPower(hit.b);
  if (d.hard > 1e8 || !can) { $('#breakbar').style.display = 'none'; if (!can && Math.random() < 0.02) UI.toast('Esse bloco precisa de ferramenta melhor! 🥺'); return; }
  mining.p += dt * mult / Math.max(0.12, d.hard);
  Player.av.anim.swing = 1;
  $('#breakbar').style.display = '';
  $('#breakfill').style.width = Math.min(100, mining.p * 100) + '%';
  if (Math.random() < 0.25) puff(hit.x + 0.5, hit.y + 0.6, hit.z + 0.5, d.c || 0x999, 1);
  if (mining.p >= 1) { breakBlock(mining); mining = null; }
}
function nearbyStations() {
  const out = { bench: false, furnace: false, pot: false };
  const px = Math.floor(Player.x), py = Math.floor(Player.y), pz = Math.floor(Player.z);
  for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) {
    const b = World.get(px + dx, py + dy, pz + dz);
    if (b === B.BENCH) out.bench = true; if (b === B.FURNACE) out.furnace = true; if (b === B.POT) out.pot = true;
  }
  return out;
}
// ---- dormir / cama de casal ----
function bedInfo(hit) {
  // retorna {hx,hy,hz,dir, double, shift}
  let hx = hit.x, hy = hit.y, hz = hit.z, b = hit.b;
  if (BD[b].kind === 'bedfoot') {
    for (let dir = 0; dir < 4; dir++) {
      const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
      const nb = World.get(hit.x + dx, hit.y, hit.z + dz);
      if (nb >= 64 && nb <= 67 && nb - 64 === dir) { hx = hit.x + dx; hz = hit.z + dz; b = nb; break; }
    }
  }
  const dir = b - 64;
  const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
  // cama dupla: outra cabeceira com mesma direção ao lado (perpendicular)
  const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
  let double = false, shift = 0;
  for (const s of [-1, 1]) {
    const nb = World.get(hx + px * s, hy, hz + pz * s);
    if (nb === b) { double = true; shift = -s * 0.5; break; }
  }
  return { hx, hy, hz, dir, double, shift };
}
function trySleep(hit) {
  const bi = bedInfo(hit);
  // cama de casal: se amigo já dorme nela, deita do lado — dormem abraçadinhos
  let shift = 0;
  if (bi.double) {
    let other = null;
    for (const r of remotes.values()) if (r.st.slp && r.st.bed && Math.abs(r.st.bed.x - (bi.hx + 0.5)) < 1.6 && Math.abs(r.st.bed.z - (bi.hz + 0.5)) < 1.6) other = r;
    shift = other ? (other.st.bed.shift >= 0 ? -1 : 1) * 0.42 : 0.42;
    if (other) { UI.toast('Dormindo juntinhos… 💕'); hearts(bi.hx + 0.5, bi.hy + 1, bi.hz + 0.5); }
  }
  Player.sleepIn(bi.hx, bi.hy + 0.55, bi.hz, bi.dir, bi.double, shift / 0.5 * 0.5);
  Player.bedPos.shift = shift;
  // braço abraçando: incline levemente
  UI.toast(bi.double ? 'Boa noite! 🌙💞' : 'Boa noite! 🌙');
  $('#bWake').style.display = 'inline-block';
  sendState(true);
}
$('#bWake').addEventListener('pointerdown', e => { e.stopPropagation(); Player.wake(); $('#bWake').style.display = 'none'; sendState(true); });

function tameAnimal(an, food) {
  if (!Inv.take(food, 1)) return;
  const S = SPECIES[an.sp];
  if (Math.random() < 0.6) {
    an.tame = Net.myId; an.hearts = 2;
    hearts(an.x, an.y + 0.4, an.z); Audio2.sfx('tame');
    UI.toast(`${S.name} agora é seu amiguinho! 💖`);
    if (!Net.isHost) Net.emit('animals', { tame: { id: an.id, by: Net.myId } });
  } else {
    puff(an.x, an.y + 0.5, an.z, 0xffe38a, 5, true); Audio2.sfx('pop');
    UI.toast(`${S.name} comeu e ficou tímido… tente de novo! 🥺`);
  }
  onHotbarSel();
}
function giveGift(nr) {
  const sel = Inv.selected();
  if (!Inv.take(sel, 1)) return;
  Net.emit('gift', { to: nr.r.st.id, item: sel, from: G.profile.name });
  hearts(nr.r.x, nr.r.y + 1, nr.r.z);
  Audio2.sfx('gift');
  UI.toast(`Você deu ${itemName(sel)} para ${nr.r.st.name}! 💝`);
  onHotbarSel();
}

// ================== REDE ==================
let stateT = 0;
function sendState(force) {
  if (!Net.connected) return;
  stateT -= G.dt;
  if (!force && stateT > 0) return;
  stateT = 0.09;
  Net.state({
    id: Net.myId, name: G.profile.name, prof: G.profile,
    x: +Player.x.toFixed(2), y: +Player.y.toFixed(2), z: +Player.z.toFixed(2),
    ryaw: +Player.av.root.rotation.y.toFixed(2),
    held: Inv.selected(), emote: myEmote, pose: myPose, poseRole: myPoseRole,
    sit: Player.sitting, slp: Player.sleeping,
    bed: Player.bedPos ? { x: +Player.bedPos.x.toFixed(2), y: +Player.bedPos.y.toFixed(2), z: +Player.bedPos.z.toFixed(2), yaw: +Player.bedPos.yaw.toFixed(2), shift: Player.bedPos.shift || 0 } : null,
  });
}
function wireNet() {
  Net.handlers._join = (peer, d) => { if (d.x !== undefined) remoteFor(peer, d); };
  Net.handlers._leave = (peer, st) => { UI.addChat('', `${st.name || 'Alguém'} saiu 👋`, false, true); removeRemote(peer); };
  Net.handlers._peers = () => { $('#online').textContent = '👥 ' + Math.max(1, Net.online); };
  Net.on('state', (peer, st) => {
    if (st.x === undefined) return;
    const r = remotes.get(peer) || remoteFor(peer, st);
    r.st = st;
  });
  Net.on('edit', (p, d) => {
    World.set(d.x, d.y, d.z, d.v, true);
    if (Net.isHost) { Net._allEdits.push([d.x, d.y, d.z, d.v]); Net._dbDirty = true; }
  });
  World.onEdit = (x, y, z, v) => Net.registerEdit(x, y, z, v);
  Net.on('tame', (p, d) => { const a = Animals.list.get(d.id); if (a) { a.tame = d.by; } });
  Net.on('chat', (p, d) => {
    UI.addChat(d.name, d.msg); Audio2.sfx('msg');
    const r = remotes.get(p); if (r) { r.bub.textContent = (d.voice ? '🎤 ' : '') + d.msg; r.bub.classList.add('on'); r.bubT = 4.5; }
    if (G.settings.tts && tts) tts.speak((d.name || 'Alguém') + ' disse: ' + d.msg, { language: 'pt-BR' }).catch(() => { });
  });
  Net.on('gift', (p, d) => {
    if (d.to !== Net.myId) return;
    Inv.add(d.item, 1);
    hearts(Player.x, Player.y + 1, Player.z);
    Audio2.sfx('gift');
    UI.toast(`${d.from} te deu ${itemName(d.item)}! 💝`, iconFor(d.item));
    UI.addChat('', `${d.from} te deu um presente: ${itemName(d.item)} 💝`, false, true);
  });
  Net.on('pose', (p, d) => {
    if (d.with !== Net.myId) return;
    // aceita pose em dupla automaticamente (fofura em primeiro lugar)
    myPose = d.id; myPoseRole = 1;
    Player.av.anim.pose = d.id; Player.av.anim.poseRole = 1;
    UI.toast(`${d.from} fez a pose "${(POSES_DUO.find(x => x.id === d.id) || {}).name}" com você! 💞`);
    hearts(Player.x, Player.y + 1.2, Player.z);
    setTimeout(() => { if (myPose === d.id) { myPose = null; Player.av.anim.pose = null; sendState(true); } }, 6000);
    sendState(true);
  });
  Net.on('world', (p, d) => {
    if (Net.isHost) return;
    if (!worldStarted) startWorld(d.seed, false);
  });
  Net.on('animals', (p, d) => {
    if (d.state && !Net.isHost) Animals.applyState(d.state);
  });
}
let animT = 0;
function hostAnimalSync(dt) {
  if (!Net.isHost || !Net.connected) return;
  animT -= dt; if (animT > 0) return; animT = 0.4;
  Net.emit('animals', { state: Animals.serialize() });
}

// ================== EMOTES / POSES / CHAT ==================
function doEmote(id) {
  myEmote = id; Player.av.anim.emote = id; Player.av.anim.emoteT = 0;
  if (id === 'heart') hearts(Player.x, Player.y + 1.4, Player.z);
  sendState(true);
  setTimeout(() => { if (myEmote === id) { myEmote = null; sendState(true); } }, 3600);
}
function doPoseSolo(id) {
  myPose = id; myPoseRole = 0; Player.av.anim.pose = id; Player.av.anim.poseRole = 0;
  sendState(true);
  UI.toast('Pose pronta! Abra o modo foto 📸');
}
function doPoseDuo(id) {
  const nr = nearestRemote(3.2);
  if (!nr) { UI.toast('Chegue pertinho de um amigo primeiro! 🥰'); return; }
  myPose = id; myPoseRole = 0; Player.av.anim.pose = id; Player.av.anim.poseRole = 0;
  // vira os dois um para o outro
  const ang = Math.atan2(nr.r.x - Player.x, nr.r.z - Player.z);
  Player.av.root.rotation.y = ang;
  Net.emit('pose', { with: nr.r.st.id, id, from: G.profile.name });
  sendState(true);
  const nm = (POSES_DUO.find(x => x.id === id) || {}).name;
  UI.toast(`Pose "${nm}" com ${nr.r.st.name}! 📸💕`);
  if (id === 'kiss' || id === 'hug' || id === 'hands') hearts((Player.x + nr.r.x) / 2, Player.y + 1.3, (Player.z + nr.r.z) / 2);
  setTimeout(() => { if (myPose === id) { myPose = null; Player.av.anim.pose = null; sendState(true); } }, 6000);
}
function sendChat(msg, voice = false) {
  UI.addChat(G.profile.name, msg, true);
  Net.emit('chat', { name: G.profile.name, msg, voice: voice ? 1 : 0 });
}

// ================== MODO FOTO ==================
function enterPhoto() {
  G.mode = 'photo'; UI.photoUI(true); UI.closePanel();
  UI.toast('Arraste para enquadrar. Poses no menu 💞!');
}
function exitPhoto() { G.mode = 'play'; UI.photoUI(false); }
$('#phExit').addEventListener('pointerdown', e => { e.stopPropagation(); exitPhoto(); });
$('#phSnap').addEventListener('pointerdown', e => { e.stopPropagation(); photoTimer = 3; $('#phCount').style.display = ''; });
$('#phPose').addEventListener('pointerdown', e => { e.stopPropagation(); UI.openPanel('social'); });
$('#pvClose').addEventListener('pointerdown', () => $('#photoview').classList.remove('on'));
function takePhoto() {
  Audio2.sfx('photo'); UI.flash();
  requestAnimationFrame(() => {
    try {
      const src = G.renderer.domElement;
      const cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(src, 0, 0);
      // moldura fofa
      const w = cv.width, h = cv.height, bw = Math.round(Math.min(w, h) * 0.035);
      ctx.fillStyle = '#fff8f0';
      ctx.fillRect(0, 0, w, bw); ctx.fillRect(0, h - bw * 2.6, w, bw * 2.6);
      ctx.fillRect(0, 0, bw, h); ctx.fillRect(w - bw, 0, bw, h);
      ctx.fillStyle = '#e8927c';
      ctx.font = `bold ${bw * 1.1}px "Comic Sans MS", "Segoe UI", sans-serif`;
      ctx.fillText('🌸 Mini Mundo Fofo', bw * 1.4, h - bw * 1.1);
      const d = new Date();
      ctx.fillStyle = '#b9a090';
      ctx.textAlign = 'right';
      ctx.fillText(d.toLocaleDateString('pt-BR'), w - bw * 1.4, h - bw * 1.1);
      ctx.textAlign = 'left';
      lastPhoto = cv.toDataURL('image/png');
      UI.showPhoto(lastPhoto);
    } catch (err) { UI.toast('Não consegui salvar a foto 😢'); }
  });
}

// ================== VOZ (ditado + leitura) ==================
let dlCap = null, lastPhoto = null;
async function initVoice() {
  try { tts = await claude.use('tts'); } catch (e) { tts = null; }
  try { dict = await claude.use('dictation'); } catch (e) { dict = null; }
  try { dlCap = await claude.use('downloads'); } catch (e) { dlCap = null; }
  if (!dict) $('#bMic').style.display = 'none';
  if (dlCap) $('#pvSave').style.display = 'inline-block';
}
$('#pvSave').addEventListener('pointerdown', async e => {
  e.stopPropagation();
  if (!dlCap || !lastPhoto) return;
  try {
    const blob = await (await fetch(lastPhoto)).blob();
    await dlCap.save({ filename: 'foto-mini-mundo-fofo.png', data: blob });
    UI.toast('Foto salva! 💾💕');
  } catch (err) { UI.toast('Não deu para salvar — segure a imagem 💾'); }
});
let dictBuf = '';
function micToggle() {
  if (!dict) { UI.toast('Voz não disponível aqui 😢 — use o chat ✍️'); return; }
  if (!micOn) {
    dictBuf = '';
    dict.start().then(() => {
      micOn = true; $('#bMic').classList.add('rec');
      UI.toast('Falando… toque de novo para enviar 🎤');
    }).catch(err => {
      if (err && err.code === 'not_granted') { UI.toast('Microfone não permitido 😢'); $('#bMic').style.display = 'none'; }
      else UI.toast('Não consegui ouvir agora 😢');
    });
    if (!dict._wired) {
      dict._wired = 1;
      dict.onFinal(({ text }) => { dictBuf += (dictBuf ? ' ' : '') + text; });
    }
  } else {
    dict.stop().then(() => {
      micOn = false; $('#bMic').classList.remove('rec');
      if (dictBuf.trim()) sendChat(dictBuf.trim(), true);
      dictBuf = '';
    }).catch(() => { micOn = false; $('#bMic').classList.remove('rec'); });
  }
}

// ================== FLUXO DE TELAS ==================
let worldStarted = false;
function toggleCam() { Player.firstPerson = !Player.firstPerson; UI.toast(Player.firstPerson ? 'Primeira pessoa 👀' : 'Terceira pessoa 🧸'); }

UI.init({
  emote: doEmote, poseSolo: doPoseSolo, poseDuo: doPoseDuo,
  chat: sendChat, photo: enterPhoto, toggleCam,
  jump: v => Player.jumpHeld = v,
  mine: v => holdMine = v,
  use: () => { const h = Player.raycast(); if (h) tapWorld(); },
  hotbarSel: onHotbarSel,
  mic: micToggle,
  roomCode: () => Net.code, online: () => Math.max(1, Net.online),
  leave: () => { location.reload(); },
  ttsToggle: () => { },
  custChange: () => renderPreview(true),
});

// prévia do personagem na personalização
let prevAv = null, prevScene = null, prevCam = null, prevRenderer = null;
function setupPreview() {
  prevScene = new THREE.Scene();
  prevScene.background = null;
  const l = new THREE.DirectionalLight(0xffffff, 1.2); l.position.set(2, 4, 3); prevScene.add(l);
  prevScene.add(new THREE.AmbientLight(0xfff0e8, 0.8));
  prevCam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  prevCam.position.set(0, 1.15, 2.5); prevCam.lookAt(0, 0.92, 0);
  prevRenderer = new THREE.WebGLRenderer({ canvas: $('#prevCanvas'), antialias: true, alpha: true });
}
function renderPreview(rebuild) {
  if (!prevScene) setupPreview();
  if (rebuild || !prevAv) {
    if (prevAv) prevScene.remove(prevAv.group);
    prevAv = buildAvatar(UI.custProf);
    prevScene.add(prevAv.group);
  }
}

// botões da tela título
$('#tPlay').addEventListener('click', async () => {
  Audio2.ensure(); Audio2.resume();
  UI.custProf = Object.assign(defaultProfile(), loadProfile() || {});
  $('#cName').value = UI.custProf.name;
  UI.buildCustomize(); renderPreview(true);
  UI.show('customize'); G.mode = 'custom';
});
function loadProfile() { try { return JSON.parse(localStorage.getItem('mmf_prof') || 'null'); } catch (e) { return null; } }
function saveProfile(p) { try { localStorage.setItem('mmf_prof', JSON.stringify(p)); } catch (e) { } }
$('#cDone').addEventListener('click', () => {
  UI.custProf.name = ($('#cName').value || 'Fofinho').slice(0, 14);
  G.profile = UI.custProf; saveProfile(G.profile);
  UI.show('lobby'); G.mode = 'lobby';
  $('#lobbyMsg').textContent = Net.available ? 'Crie uma sala e mande o código para quem você ama 💌' : 'Multiplayer indisponível aqui — mas você pode explorar sozinho(a)! 🌷';
  if (!Net.available) { $('#lJoin').style.display = 'none'; $('#lCode').style.display = 'none'; }
});
$('#lHost').addEventListener('click', async () => {
  const seed = (Math.random() * 1e9) | 0;
  wireNet();
  Net.onHostFail = () => { UI.toast('Sem conexão agora — jogando sozinho(a) 🌷'); $('#roomTag').textContent = '🌷 sozinho(a)'; };
  if (Net.available) await Net.host(seed);
  startWorld(seed, true);
});
$('#lJoin').addEventListener('click', async () => {
  const code = ($('#lCode').value || '').trim().toUpperCase();
  if (code.length < 4) { UI.toast('Digite o código da sala! ✉️'); return; }
  $('#lobbyMsg').textContent = 'Entrando na sala…';
  wireNet();
  const r = await Net.joinRoom(code);
  if (!r.ok) { $('#lobbyMsg').textContent = 'Não consegui entrar 😢 Confira o código e tente de novo.'; return; }
  $('#lobbyMsg').textContent = 'Esperando o mundo chegar… 🎁';
  // se o mundo estava salvo no artefato, usa; senão espera o anfitrião; por fim, semente do código
  if (Net.savedWorld) {
    startWorld(Net.savedWorld.seed, false);
    World.applyRemoteEdits(Net.savedWorld.edits || []);
  } else {
    setTimeout(() => { if (!worldStarted) startWorld(strHash(code), false); }, 6000);
  }
});
$('#copyCode').addEventListener('click', async () => {
  if (!Net.code) { UI.toast('Você está jogando sozinho(a) 🌷'); return; }
  try { await navigator.clipboard.writeText(Net.code); UI.toast('Código copiado! 💌 Mande para quem você ama'); }
  catch (e) { UI.toast('Código da sala: ' + Net.code); }
});

function startWorld(seed, hosting) {
  if (worldStarted) return;
  worldStarted = true;
  World.init(seed); Mesher.init(); Animals.init();
  Inv.reset();
  Player.init();
  setHeld(Player.av, Inv.selected());
  G.mode = 'play';
  UI.show(null); UI.showHUD(true);
  $('#roomTag').textContent = Net.code ? '💌 ' + Net.code : '🌷 sozinho(a)';
  $('#online').textContent = '👥 1';
  Audio2.startMusic();
  wireNet();
  sendState(true);
  UI.addChat('', 'Bem-vindo(a) ao seu mundinho! Toque nas plantas para colher 🌸', false, true);
  resize();
}

// ================== LOOP ==================
let last = performance.now(), stationT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.now = now / 1000; G.dt = dt; G.uTime.value = G.now;
  if (G.mode === 'custom') {
    // prévia girando
    if (prevAv) { prevAv.group.rotation.y += dt * 0.8; animateAvatar(prevAv, dt, 0, true); }
    const pc = $('#prevCanvas');
    if (pc && prevRenderer) {
      const r = pc.getBoundingClientRect();
      if (r.width > 4) {
        prevRenderer.setSize(r.width, r.height, false);
        prevCam.aspect = r.width / r.height; prevCam.updateProjectionMatrix();
        prevRenderer.render(prevScene, prevCam);
      }
    }
    return;
  }
  if (G.mode !== 'play' && G.mode !== 'photo') { return; }
  keyJoy();
  Player.update(dt);
  Player.updateCamera(dt);
  Mesher.update(Player.x, Player.z);
  warmStep();
  updateSky(dt);
  updateMining(dt);
  updateRemotes(dt);
  Animals.spawnAround(Player.x, Player.z, !Net.connected || Net.isHost);
  Animals.update(dt, !Net.connected || Net.isHost, Player, Net);
  hostAnimalSync(dt);
  Net.saveDb();
  updateParts(dt);
  sendState(false);
  // contagem da foto
  if (photoTimer > 0) {
    photoTimer -= dt;
    $('#phCount').textContent = Math.ceil(photoTimer);
    if (photoTimer <= 0) { $('#phCount').style.display = 'none'; takePhoto(); }
  }
  // estações por perto (para menu criar)
  stationT += dt; if (stationT > 0.8) { stationT = 0; UI.setNearby(nearbyStations()); }
  G.renderer.render(G.scene, G.camera);
}
requestAnimationFrame(loop);

// init rede/voz em paralelo
Net.init().then(av => { if (!av) { $('#netWarn').style.display = ''; } });
initVoice();
// começa música no primeiro toque (regra de autoplay)
addEventListener('pointerdown', function once() { Audio2.ensure(); Audio2.resume(); removeEventListener('pointerdown', once); }, { once: true });
// para depuração/testes
window.__dbg = { G, Player, Inv, World, Net, Animals, remotes, nearestRemote, setDay: f => { dayT = f * DAY_LEN; }, trySleep, tapWorld };
