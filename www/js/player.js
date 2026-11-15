import { G, THREE, clamp, lerp, damp } from './g.js';
import { World, CH, SEA } from './world.js';
import { B, BD, IT, isPlant } from './blocks.js';
import { buildAvatar, animateAvatar, setHeld } from './avatar.js';
import { Audio2 } from './audio.js';

export const Player = {
  x: 8, y: 40, z: 8, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.2,
  grounded: false, inWater: false, av: null, firstPerson: false,
  speed: 4.3, camDist: 4.6, sleeping: false, sitting: false, bedPos: null, stepOff: 0,
  joy: { x: 0, z: 0 }, jumpHeld: false, camShake: 0,
  init() {
    if (this.av) G.scene.remove(this.av.group);
    this.av = buildAvatar(G.profile);
    G.scene.add(this.av.group);
    const sx = 8 + Math.floor(Math.random() * 16), sz = 8 + Math.floor(Math.random() * 16);
    this.x = sx + 0.5; this.z = sz + 0.5; this.y = World.groundY(this.x, this.z) + 1;
    this.vx = this.vy = this.vz = 0; this.sleeping = false; this.sitting = false; this.stepOff = 0; this._cd = undefined;
  },
  aabbFree(x, y, z) {
    const r = 0.28;
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]])
      for (const oy of [0.05, 0.9, 1.45])
        if (World.solidAt(x + ox, y + oy, z + oz)) return false;
    return true;
  },
  // topo do bloco logo abaixo dos pés (null se não houver) — evita o "afunda e volta"
  groundTop(x, z, y) {
    const r = 0.28; let best = null;
    const y0 = Math.floor(y + 0.001);
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      for (let yy = y0; yy >= y0 - 3; yy--) {
        if (World.solidAt(x + ox, yy, z + oz)) {
          const t = yy + 1;
          if (t <= y + 0.001 && (best === null || t > best)) best = t;
          break;
        }
      }
    }
    return best;
  },
  update(dt) {
    if (this.sleeping || (this.sitting && !this.joyActive())) {
      if (this.sleeping || this.sitting) this.av.anim.sleeping = this.sleeping, this.av.anim.sitting = this.sitting;
      this.syncAvatar(dt, 0);
      return;
    }
    if (this.joyActive() && (this.sitting)) { this.sitting = false; this.av.anim.sitting = false; }
    const jx = this.joy.x, jz = this.joy.z;
    const mag = Math.min(1, Math.hypot(jx, jz));
    let mx = 0, mz = 0;
    if (mag > 0.08) {
      const ang = Math.atan2(jx, -jz) + this.yaw;
      mx = Math.sin(ang) * mag; mz = Math.cos(ang) * mag;
    }
    const feet = World.get(Math.floor(this.x), Math.floor(this.y + 0.3), Math.floor(this.z));
    const head = World.get(Math.floor(this.x), Math.floor(this.y + 1.3), Math.floor(this.z));
    this.inWater = feet === B.WATER;
    const sp = this.speed * (this.inWater ? 0.55 : 1);
    this.vx = damp(this.vx, mx * sp, 20, dt); this.vz = damp(this.vz, mz * sp, 20, dt);
    if (this.inWater) {
      this.vy = this.jumpHeld ? damp(this.vy, 3.4, 6, dt) : damp(this.vy, -1.4, 2.5, dt);
    } else {
      this.vy -= 24 * dt;
      if (this.jumpHeld && this.grounded) { this.vy = 8.6; this.grounded = false; }
    }
    // movimento com colisão por eixo + degrau automático
    let nx = this.x + this.vx * dt;
    if (this.aabbFree(nx, this.y, this.z)) this.x = nx;
    else if (this.grounded && this.aabbFree(nx, this.y + 1.02, this.z)) { this.x = nx; this.step = 1; } else this.vx = 0;
    let nz = this.z + this.vz * dt;
    if (this.aabbFree(this.x, this.y, nz)) this.z = nz;
    else if (this.grounded && this.aabbFree(this.x, this.y + 1.02, nz)) { this.z = nz; this.step = 1; } else this.vz = 0;
    // sobe o degrau na física, mas a câmera/avatar acompanham suavemente
    if (this.step) { this.y += 1.0; this.step = 0; this.vy = 0; this.stepOff = Math.min(1.0, this.stepOff + 1.0); }
    this.stepOff = this.stepOff > 0.003 ? damp(this.stepOff, 0, 13, dt) : 0;
    let ny = this.y + this.vy * dt;
    if (this.vy <= 0) {
      const gy = this.groundTop(this.x, this.z, this.y);
      if (gy !== null && ny <= gy + 1e-4) {
        // pousa exatamente no topo do bloco (sem oscilar)
        if (this.vy < -11) { Audio2.sfx('pop'); this.camShake = 0.18; }
        this.y = gy; this.vy = 0; this.grounded = true;
      } else { this.y = ny; this.grounded = false; }
    } else {
      if (this.aabbFree(this.x, ny + 0.2, this.z)) this.y = ny; else this.vy = 0;
      this.grounded = false;
    }
    // segurança: se ficou preso dentro de um bloco, sobe
    let guard = 0;
    while (!this.aabbFree(this.x, this.y, this.z) && this.y < CH && guard++ < 4) this.y += 1;
    if (this.y < -8) { this.y = World.groundY(this.x, this.z) + 2; this.vy = 0; }
    const hsp = Math.hypot(this.vx, this.vz);
    if (mag > 0.08) this.av.root.rotation.y = Math.atan2(mx, mz);
    this.syncAvatar(dt, hsp);
  },
  joyActive() { return Math.hypot(this.joy.x, this.joy.z) > 0.08; },
  syncAvatar(dt, hsp) {
    const a = this.av;
    if (this.sleeping && this.bedPos) {
      a.group.position.set(this.bedPos.x, this.bedPos.y + 0.55, this.bedPos.z);
      a.group.rotation.y = this.bedPos.yaw;
      a.group.rotation.x = -Math.PI / 2;
    } else {
      a.group.rotation.x = 0;
      a.group.position.set(this.x, this.y - this.stepOff, this.z);
    }
    animateAvatar(a, dt, hsp, this.grounded || this.inWater);
    a.group.visible = !this.firstPerson || this.sleeping || G.mode === 'photo';
  },
  updateCamera(dt) {
    const cam = G.camera;
    let shake = 0;
    if (this.camShake > 0) { this.camShake -= dt; shake = Math.sin(G.now * 60) * this.camShake * 0.25; }
    if (this.sleeping && this.bedPos) {
      // câmera de cima mostrando os personagens dormindo
      const t = { x: this.bedPos.x, y: this.bedPos.y + 0.6, z: this.bedPos.z };
      cam.position.lerp(new THREE.Vector3(t.x, t.y + 5.2, t.z + 2.2), 1 - Math.exp(-5 * dt));
      cam.lookAt(t.x, t.y, t.z);
      return;
    }
    const eye = this.y - this.stepOff + 1.42;
    if (this.firstPerson) {
      cam.position.set(this.x, eye + shake, this.z);
      const d = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
      cam.lookAt(cam.position.clone().add(d));
    } else {
      const d = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
      let dist = this.camDist;
      // encurta a câmera se houver bloco no caminho
      const from = new THREE.Vector3(this.x, eye, this.z);
      for (let s = 0.4; s < this.camDist; s += 0.2) {
        const p = from.clone().addScaledVector(d, -s);
        if (World.solidAt(p.x, p.y, p.z)) { dist = Math.max(0.6, s - 0.3); break; }
      }
      // encolhe na hora (não atravessa parede), volta devagar (não pula)
      if (this._cd === undefined) this._cd = dist;
      this._cd = dist < this._cd ? dist : damp(this._cd, dist, 4, dt);
      const target = from.clone().addScaledVector(d, -this._cd);
      cam.position.x = damp(cam.position.x, target.x, 16, dt);
      cam.position.y = damp(cam.position.y, target.y, 16, dt) + shake;
      cam.position.z = damp(cam.position.z, target.z, 16, dt);
      cam.lookAt(this.x, eye - 0.15, this.z);
    }
  },
  // raycast de voxel (DDA)
  raycast(maxD = 5.2) {
    const o = new THREE.Vector3(this.x, this.y - this.stepOff + 1.42, this.z);
    let d;
    if (this.firstPerson) d = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    else { d = new THREE.Vector3(); G.camera.getWorldDirection(d); o.copy(G.camera.position); maxD += this.camDist; }
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const stepX = Math.sign(d.x) || 1, stepY = Math.sign(d.y) || 1, stepZ = Math.sign(d.z) || 1;
    const tdx = Math.abs(1 / (d.x || 1e-9)), tdy = Math.abs(1 / (d.y || 1e-9)), tdz = Math.abs(1 / (d.z || 1e-9));
    let tx = ((stepX > 0 ? x + 1 - o.x : o.x - x)) * tdx, ty = ((stepY > 0 ? y + 1 - o.y : o.y - y)) * tdy, tz = ((stepZ > 0 ? z + 1 - o.z : o.z - z)) * tdz;
    let face = [0, 0, 0], t = 0;
    for (let i = 0; i < 90; i++) {
      const b = World.get(x, y, z);
      if (b && b !== B.WATER && !(this.firstPerson === false && t < 0.01)) {
        return { x, y, z, b, face, t };
      }
      if (tx < ty && tx < tz) { x += stepX; t = tx; tx += tdx; face = [-stepX, 0, 0]; }
      else if (ty < tz) { y += stepY; t = ty; ty += tdy; face = [0, -stepY, 0]; }
      else { z += stepZ; t = tz; tz += tdz; face = [0, 0, -stepZ]; }
      if (t > maxD) break;
    }
    return null;
  },
  sitOn(x, y, z, dir) {
    this.sitting = true; this.av.anim.sitting = true;
    this.x = x + 0.5; this.z = z + 0.5; this.y = y + 0.32; this.vx = this.vz = 0;
    this.av.root.rotation.y = [0, Math.PI, Math.PI / 2, -Math.PI / 2][dir] || 0;
  },
  sleepIn(x, y, z, dir, double, shift) {
    this.sleeping = true; this.av.anim.sleeping = true;
    const dx = [0, 0, 1, -1][dir], dz = [1, -1, 0, 0][dir];
    // desloca para o lado se cama de casal (shift -1/+1)
    const px = x + 0.5 + (double ? (dz !== 0 ? shift * 0.5 : 0) : 0) + dx * 0.5;
    const pz = z + 0.5 + (double ? (dx !== 0 ? shift * 0.5 : 0) : 0) + dz * 0.5;
    this.bedPos = { x: px, y, z: pz, yaw: Math.atan2(-dx, -dz) };
    Audio2.sfx('sleep');
  },
  wake() { this.sleeping = false; this.av.anim.sleeping = false; if (this.bedPos) { this.x = this.bedPos.x; this.z = this.bedPos.z; this.y = World.groundY(this.x, this.z); } this.bedPos = null; },
};
