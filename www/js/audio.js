import { G } from './g.js';

// Música calma gerada por WebAudio + efeitos fofos
export const Audio2 = {
  ctx: null, master: null, musicGain: null, sfxGain: null, started: false, timer: null,
  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.musicGain.gain.value = G.settings.music * 0.5; this.sfxGain.gain.value = G.settings.sfx;
      return true;
    } catch (e) { return false; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVolumes() { if (!this.ctx) return; this.musicGain.gain.value = G.settings.music * 0.5; this.sfxGain.gain.value = G.settings.sfx; },
  startMusic() {
    if (!this.ensure() || this.started) return; this.started = true;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];   // pentatônica estendida (fofa)
    const base = 220; let step = 0;
    const chordRoots = [0, -3, -5, -7];
    const playNote = (freq, t, dur, gain, type = 'sine', dest = this.musicGain) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.1);
    };
    const bar = () => {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + 0.05;
      const root = chordRoots[(step >> 2) % chordRoots.length];
      // acorde suave
      for (const iv of [0, 4, 7]) playNote(base / 2 * Math.pow(2, (root + iv) / 12), t0, 3.4, 0.05, 'triangle');
      // melodia cintilante
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.72) {
          const n = scale[(Math.random() * scale.length) | 0] + root;
          playNote(base * Math.pow(2, n / 12), t0 + i * 0.85 + Math.random() * 0.15, 1.6, 0.055, 'sine');
          if (Math.random() < 0.3) playNote(base * 2 * Math.pow(2, n / 12), t0 + i * 0.85 + 0.2, 1.2, 0.02, 'sine');
        }
      }
      step++;
    };
    bar(); this.timer = setInterval(bar, 3400);
  },
  sfx(kind) {
    if (!this.ensure()) return; this.resume();
    const t = this.ctx.currentTime;
    const blip = (f0, f1, dur, gain, type = 'square') => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
    };
    switch (kind) {
      case 'break': blip(220, 90, 0.12, 0.12); break;
      case 'place': blip(180, 320, 0.1, 0.1, 'triangle'); break;
      case 'pickup': blip(520, 980, 0.12, 0.08, 'sine'); blip(780, 1320, 0.14, 0.05, 'sine'); break;
      case 'pop': blip(330, 660, 0.08, 0.1, 'sine'); break;
      case 'tame': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, f * 1.01, 0.18, 0.09, 'sine'), i * 90)); break;
      case 'gift': [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => blip(f, f, 0.2, 0.08, 'sine'), i * 100)); break;
      case 'eat': blip(200, 140, 0.08, 0.1); setTimeout(() => blip(220, 150, 0.08, 0.1), 110); break;
      case 'photo': blip(1200, 900, 0.05, 0.12, 'square'); setTimeout(() => blip(900, 1400, 0.07, 0.1, 'square'), 70); break;
      case 'msg': blip(880, 1100, 0.07, 0.06, 'sine'); break;
      case 'craft': blip(300, 500, 0.1, 0.09, 'triangle'); setTimeout(() => blip(500, 700, 0.1, 0.08, 'triangle'), 100); break;
      case 'sleep': [660, 550, 440].forEach((f, i) => setTimeout(() => blip(f, f * 0.95, 0.3, 0.06, 'sine'), i * 200)); break;
      case 'click': blip(600, 700, 0.04, 0.05, 'sine'); break;
      case 'splash': blip(400, 120, 0.25, 0.07, 'sawtooth'); break;
    }
  },
};
