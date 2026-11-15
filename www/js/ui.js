import { G, $, $$, clamp } from './g.js';
import { B, BD, IT, RECIPES, STATION_NAMES, itemName, isFlower, GROUPS } from './blocks.js';
import { Inv } from './inventory.js';
import { SKINS, HAIR_COLORS, EYE_COLORS, HAIRS, OUTFITS, EMOTES, POSES_DUO, POSES_SOLO } from './avatar.js';
import { Audio2 } from './audio.js';

// ícones de itens em emoji/cores para a UI
export function iconFor(id) {
  const M = {
    [B.GRASS]: '🟩', [B.DIRT]: '🟫', [B.STONE]: '🪨', [B.SAND]: '🟨', [B.LOG]: '🪵', [B.BLOG]: '🪵', [B.PLOG]: '🪵', [B.SLOG]: '🪵', [B.PALMLOG]: '🪵',
    [B.LEAF]: '🍃', [B.BLEAF]: '🍃', [B.PLEAF]: '🌲', [B.SLEAF]: '🌸', [B.MLEAF]: '🍁', [B.PALMLEAF]: '🌴',
    [B.PLANK]: '🟧', [B.PLANK_P]: '🩷', [B.PLANK_W]: '⬜', [B.PLANK_B]: '🟦', [B.PLANK_Y]: '🟨',
    [B.COAL]: '⚫', [B.IRON]: '🔩', [B.GOLD]: '🟡', [B.CRYS]: '💎', [B.SNOW]: '⬜', [B.COBBLE]: '🪨', [B.BRICK]: '🧱', [B.GLASS]: '🔲',
    [B.FURNACE]: '🔥', [B.BENCH]: '🛠️', [B.POT]: '🍲', [B.TABLE]: '🪑', [B.LANTERN]: '🏮', [B.SMOOTH]: '⬜', [B.WOOL]: '☁️',
    [B.TGRASS]: '🌿', [B.ROSE]: '🌹', [B.DAISY]: '🌼', [B.TULIP]: '🌷', [B.SUNF]: '🌻', [B.LAV]: '💜', [B.HYD]: '💠',
    [B.ROSE_P]: '🌸', [B.ROSE_W]: '🤍', [B.ROSE_Y]: '🌼', [B.ROSE_B]: '💙', [B.ROSE_V]: '💜', [B.TULIP_P]: '🌷', [B.HYD_P]: '🌸', [B.CHERRY_F]: '🌸',
    [B.MUSH_R]: '🍄', [B.MUSH_B]: '🍄‍🟫', [B.BUSH]: '🫐', [B.FERN]: '🌿', [B.WHEAT]: '🌾',
    100: '🥢', 101: '⚫', 102: '🔩', 103: '🟡', 104: '💎', 106: '🥚', 107: '🥛', 108: '🍎', 109: '🍓', 110: '🥥', 111: '🧵',
    112: '🍞', 113: '🍎', 114: '🍪', 115: '🍲', 116: '🍯', 117: '🥗', 118: '🎂', 119: '🍳', 120: '☕', 121: '💐', 122: '💍',
    130: '🪓', 131: '🪓', 132: '🪓', 133: '⛏️', 134: '⛏️', 135: '⛏️', 136: '🛏️', 137: '🪑',
  };
  if (id < 0) return { [-1]: '🪵', [-2]: '🌸', [-3]: '🟧', [-4]: '🍄', [-5]: '🍃' }[id] || '❔';
  return M[id] || '❔';
}

export const UI = {
  cb: {}, toastT: null, chatOpen: false, panelOpen: null,
  init(cb) {
    this.cb = cb;
    this.buildHotbar(); this.bindButtons(); this.buildCustomize();
    Inv.onChange = () => this.renderHotbar();
  },
  // ---------- telas ----------
  show(id) { $$('.screen').forEach(s => s.classList.remove('on')); if (id) $('#' + id).classList.add('on'); },
  showHUD(on) { $('#hud').style.display = on ? 'block' : 'none'; },
  toast(msg, emoji = '') {
    const t = $('#toast'); t.innerHTML = (emoji ? `<span class="big">${emoji}</span>` : '') + msg; t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), 2600);
  },
  // ---------- hotbar ----------
  buildHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div'); d.className = 'slot'; d.dataset.i = i;
      d.addEventListener('pointerdown', (e) => { e.stopPropagation(); Audio2.sfx('click'); Inv.sel = i; this.renderHotbar(); if (this.cb.hotbarSel) this.cb.hotbarSel(); });
      hb.appendChild(d);
    }
    this.renderHotbar();
  },
  renderHotbar() {
    $$('#hotbar .slot').forEach((d, i) => {
      const id = Inv.hotbar[i];
      d.classList.toggle('sel', i === Inv.sel);
      d.innerHTML = id ? `<span class="ic">${iconFor(id)}</span><span class="ct">${Inv.count(id)}</span>` : '';
    });
    if (this.panelOpen === 'inv') this.renderInv();
    if (this.panelOpen === 'craft') this.renderCraft(this._station || 'hand');
  },
  // ---------- painéis ----------
  openPanel(name) {
    this.closePanel();
    this.panelOpen = name;
    $('#panel').classList.add('on');
    $$('#panel .ptab').forEach(b => b.classList.toggle('sel', b.dataset.p === name));
    if (name === 'inv') this.renderInv();
    if (name === 'craft') this.renderCraft(this._station || 'hand');
    if (name === 'social') this.renderSocial();
    if (name === 'opts') this.renderOpts();
  },
  closePanel() { this.panelOpen = null; $('#panel').classList.remove('on'); },
  renderInv() {
    const el = $('#pbody'); el.innerHTML = '<div class="ptitle">🎒 Mochila</div><div class="grid" id="invgrid"></div><div class="hint">Toque em um item para colocar na mãozinha 🖐️</div>';
    const g = $('#invgrid');
    const ids = Object.keys(Inv.slots).map(Number).sort((a, b) => a - b);
    if (!ids.length) g.innerHTML = '<div class="empty">Vazia… vá explorar e coletar! 🌷</div>';
    for (const id of ids) {
      const d = document.createElement('div'); d.className = 'slot big';
      d.innerHTML = `<span class="ic">${iconFor(id)}</span><span class="ct">${Inv.count(id)}</span><span class="nm">${itemName(id)}</span>`;
      d.addEventListener('pointerdown', () => {
        Audio2.sfx('click');
        if (!Inv.hotbar.includes(id)) Inv.hotbar[Inv.sel] = id; else Inv.sel = Inv.hotbar.indexOf(id);
        this.renderHotbar(); if (this.cb.hotbarSel) this.cb.hotbarSel();
        this.toast(`${itemName(id)} na mão!`, iconFor(id));
      });
      g.appendChild(d);
    }
  },
  renderCraft(station) {
    this._station = station;
    const el = $('#pbody');
    const tabs = ['hand', 'bench', 'furnace', 'pot'].map(s =>
      `<button class="stab ${s === station ? 'sel' : ''} ${s !== 'hand' && !this._nearby[s] ? 'off' : ''}" data-s="${s}">${{ hand: '🖐️', bench: '🛠️', furnace: '🔥', pot: '🍲' }[s]} ${STATION_NAMES[s]}</button>`).join('');
    el.innerHTML = `<div class="ptitle">✨ Criar</div><div class="stabs">${tabs}</div><div class="rlist" id="rlist"></div>`;
    $$('.stab').forEach(b => b.addEventListener('pointerdown', () => { const s = b.dataset.s; if (s !== 'hand' && !this._nearby[s]) { this.toast(`Chegue perto de uma ${STATION_NAMES[s].toLowerCase()}!`, '🥺'); return; } this.renderCraft(s); }));
    const list = $('#rlist');
    const rs = RECIPES.filter(r => r.st === station);
    for (const r of rs) {
      const ok = Inv.canCraft(r) && (station === 'hand' || this._nearby[station]);
      const ins = r.ins.map(([id, n]) => `<span class="${(id < 0 ? Inv.countGroup(id) : Inv.count(id)) >= n ? 'got' : 'miss'}">${iconFor(id)}×${n}</span>`).join(' ');
      const d = document.createElement('div'); d.className = 'recipe' + (ok ? '' : ' off');
      d.innerHTML = `<span class="ric">${iconFor(r.out)}</span><div class="rinfo"><b>${itemName(r.out)}${r.n > 1 ? ' ×' + r.n : ''}</b><div class="rins">${ins}</div></div><button class="mk">Fazer</button>`;
      d.querySelector('.mk').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!ok) { this.toast('Faltam materiais… 🥺'); return; }
        if (Inv.craft(r)) { Audio2.sfx('craft'); this.toast(`${itemName(r.out)} criado!`, iconFor(r.out)); this.renderCraft(station); }
      });
      list.appendChild(d);
    }
    if (!rs.length) list.innerHTML = '<div class="empty">Nada por aqui…</div>';
  },
  _nearby: { bench: false, furnace: false, pot: false },
  setNearby(n) { this._nearby = n; },
  renderSocial() {
    const el = $('#pbody');
    el.innerHTML = `<div class="ptitle">💞 Emotes & Poses</div>
      <div class="sub">Emotes</div><div class="chips" id="emts"></div>
      <div class="sub">Poses sozinho 📸</div><div class="chips" id="psolo"></div>
      <div class="sub">Poses em dupla (perto de um amigo) 💑</div><div class="chips" id="pduo"></div>`;
    const mk = (parent, arr, fn) => {
      for (const it of arr) {
        const b = document.createElement('button'); b.className = 'chip'; b.innerHTML = `${it.e} ${it.name}`;
        b.addEventListener('pointerdown', () => { Audio2.sfx('pop'); fn(it); this.closePanel(); });
        parent.appendChild(b);
      }
    };
    mk($('#emts'), EMOTES, it => this.cb.emote(it.id));
    mk($('#psolo'), POSES_SOLO, it => this.cb.poseSolo(it.id));
    mk($('#pduo'), POSES_DUO, it => this.cb.poseDuo(it.id));
  },
  renderOpts() {
    const el = $('#pbody');
    el.innerHTML = `<div class="ptitle">⚙️ Ajustes</div>
      <label class="opt">🎵 Música <input type="range" id="omus" min="0" max="1" step="0.05" value="${G.settings.music}"></label>
      <label class="opt">🔔 Sons <input type="range" id="osfx" min="0" max="1" step="0.05" value="${G.settings.sfx}"></label>
      <label class="opt">👀 Distância <input type="range" id="odist" min="2" max="6" step="1" value="${G.settings.dist}"></label>
      <label class="opt">🗣️ Ler chat em voz alta <input type="checkbox" id="otts" ${G.settings.tts ? 'checked' : ''}></label>
      <div class="row">
        <button class="btn small" id="ocam">📷 Trocar visão (1ª/3ª)</button>
        <button class="btn small warn" id="oleave">🚪 Sair da sala</button>
      </div>
      <div class="roomcode">Sala: <b>${this.cb.roomCode() || '—'}</b> · ${this.cb.online()} online</div>`;
    $('#omus').addEventListener('input', e => { G.settings.music = +e.target.value; Audio2.setVolumes(); });
    $('#osfx').addEventListener('input', e => { G.settings.sfx = +e.target.value; Audio2.setVolumes(); });
    $('#odist').addEventListener('input', e => { G.settings.dist = +e.target.value; });
    $('#otts').addEventListener('change', e => { G.settings.tts = e.target.checked; this.cb.ttsToggle(e.target.checked); });
    $('#ocam').addEventListener('pointerdown', () => { this.cb.toggleCam(); this.closePanel(); });
    $('#oleave').addEventListener('pointerdown', () => { this.cb.leave(); });
  },
  // ---------- chat ----------
  addChat(name, msg, mine = false, sys = false) {
    const log = $('#chatlog');
    const d = document.createElement('div'); d.className = 'cmsg' + (mine ? ' mine' : '') + (sys ? ' sys' : '');
    if (sys) d.textContent = msg; else { const b = document.createElement('b'); b.textContent = name + ': '; d.appendChild(b); d.appendChild(document.createTextNode(msg)); }
    log.appendChild(d);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    const mini = $('#chatmini');
    mini.textContent = sys ? msg : name + ': ' + msg;
    mini.classList.add('on'); clearTimeout(this._miniT); this._miniT = setTimeout(() => mini.classList.remove('on'), 5000);
  },
  toggleChat(on) {
    this.chatOpen = on ?? !this.chatOpen;
    $('#chatbox').classList.toggle('on', this.chatOpen);
    if (this.chatOpen) $('#chatin').focus();
  },
  // ---------- botões ----------
  bindButtons() {
    const tap = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); Audio2.sfx('click'); fn(e); }); };
    tap('#bInv', () => this.panelOpen === 'inv' ? this.closePanel() : this.openPanel('inv'));
    tap('#bCraft', () => this.panelOpen === 'craft' ? this.closePanel() : this.openPanel('craft'));
    tap('#bSocial', () => this.panelOpen === 'social' ? this.closePanel() : this.openPanel('social'));
    tap('#bOpts', () => this.panelOpen === 'opts' ? this.closePanel() : this.openPanel('opts'));
    tap('#bChat', () => this.toggleChat());
    tap('#bPhoto', () => this.cb.photo());
    tap('#bCam', () => this.cb.toggleCam());
    tap('#pClose', () => this.closePanel());
    tap('#chatClose', () => this.toggleChat(false));
    tap('#bMic', () => this.cb.mic());
    $$('#panel .ptab').forEach(b => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.openPanel(b.dataset.p); }));
    $('#chatsend').addEventListener('click', () => this._sendChat());
    $('#chatin').addEventListener('keydown', e => { if (e.key === 'Enter') this._sendChat(); });
    // ações principais
    const hold = (sel, down, up) => {
      const el = $(sel);
      el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); down(); });
      el.addEventListener('pointerup', e => { e.stopPropagation(); up && up(); });
      el.addEventListener('pointercancel', () => up && up());
      el.addEventListener('pointerleave', () => up && up());
    };
    hold('#bJump', () => this.cb.jump(true), () => this.cb.jump(false));
    hold('#bMine', () => this.cb.mine(true), () => this.cb.mine(false));
    tap('#bUse', () => this.cb.use());
  },
  _sendChat() { const i = $('#chatin'); const v = i.value.trim(); if (!v) return; i.value = ''; this.cb.chat(v); },
  // ---------- personalização ----------
  custProf: null,
  buildCustomize() {
    const sw = (parent, colors, get, set) => {
      parent.innerHTML = '';
      colors.forEach((c, i) => {
        const d = document.createElement('button'); d.className = 'sw' + (get() === i ? ' sel' : '');
        d.style.background = '#' + c.toString(16).padStart(6, '0');
        d.addEventListener('pointerdown', () => { set(i); this.buildCustomize(); if (this.cb.custChange) this.cb.custChange(); });
        parent.appendChild(d);
      });
    };
    const p = this.custProf; if (!p) return;
    sw($('#cSkin'), SKINS, () => p.skin, v => p.skin = v);
    sw($('#cHairC'), HAIR_COLORS, () => p.hairC, v => p.hairC = v);
    sw($('#cEyes'), EYE_COLORS, () => p.eyes, v => p.eyes = v);
    const hb = $('#cHair'); hb.innerHTML = '';
    HAIRS.forEach((h, i) => {
      const b = document.createElement('button'); b.className = 'chip' + (p.hair === i ? ' sel' : ''); b.textContent = h.name;
      b.addEventListener('pointerdown', () => { p.hair = i; this.buildCustomize(); if (this.cb.custChange) this.cb.custChange(); });
      hb.appendChild(b);
    });
    const ob = $('#cOutfit'); ob.innerHTML = '';
    let lastCat = '';
    OUTFITS.forEach((o, i) => {
      if (o.cat !== lastCat) { lastCat = o.cat; const t = document.createElement('div'); t.className = 'sub'; t.textContent = { 'Dia a dia': '🧺 Dia a dia', 'Casamento': '💒 Casamento', 'Festa': '🎉 Festa', 'Fantasia': '🎭 Fantasia', 'Dormir': '🌙 Dormir' }[o.cat] || o.cat; ob.appendChild(t); }
      const b = document.createElement('button'); b.className = 'chip' + (p.outfit === i ? ' sel' : ''); b.textContent = o.name;
      b.addEventListener('pointerdown', () => { p.outfit = i; this.buildCustomize(); if (this.cb.custChange) this.cb.custChange(); });
      ob.appendChild(b);
    });
  },
  // ---------- modo foto ----------
  photoUI(on) {
    $('#photoui').style.display = on ? 'block' : 'none';
    $('#hud').style.display = on ? 'none' : 'block';
  },
  flash() {
    const f = $('#flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 300);
  },
  showPhoto(dataUrl) {
    const w = $('#photoview'); w.classList.add('on');
    $('#photoimg').src = dataUrl;
  },
};
