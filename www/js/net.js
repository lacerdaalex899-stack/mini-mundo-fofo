import { G } from './g.js';
import { peerTransport } from './peernet.js';

// Multiplayer: sala privada com código de convite.
// Transporte: capability `room` usando PRESENCE (todo visitante admitido pode enviar presence,
// mesmo sem permissão de edição). Eventos (chat, presente, pose...) viajam como campos com
// número de sequência dentro do objeto de presence. O estado do mundo (semente + edições)
// fica na presence do anfitrião e, quando possível, persiste no `db` do artefato.
export const Net = {
  room: null, myRoom: null, db: null, code: null, isHost: false,
  myId: 'p' + Math.random().toString(36).slice(2, 9),
  peers: new Map(), peersPos: {}, handlers: {}, connected: false, available: false,
  online: 1, worldInfo: null, lobbyMode: false,
  _seq: { chat: 0, gift: 0, pose: 0, tame: 0 },
  _edits: [], _eseq: 0, _allEdits: [], _presBase: {}, _dbDirty: false, _dbT: 0,
  async init() {
    try { this.room = await claude.use('room'); } catch (e) { this.room = null; }
    try { this.db = await claude.use('db'); } catch (e) { this.db = null; }
    // fora do Claude (APK/navegador): cai para conexão direta entre celulares
    if (!this.room) { this.room = await peerTransport(); this.p2p = !!this.room; }
    this.available = !!this.room;
    return this.available;
  },
  genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 6; i++) c += a[(Math.random() * a.length) | 0]; return c; },
  on(t, f) { this.handlers[t] = f; },
  async host(seed) {
    this.code = this.genCode(); this.isHost = true;
    this.worldInfo = { seed };
    // conecta em segundo plano: o anfitrião entra no mundo na hora
    this._join().then(r => { if (!r.ok && this.onHostFail) this.onHostFail(r.err); });
    return { ok: true };
  },
  async joinRoom(code) {
    this.code = code.toUpperCase().trim(); this.isHost = false;
    const r = await this._join();
    if (r.ok) await this._tryLoadDb();
    return r;
  },
  async _join() {
    if (!this.room) return { ok: false, err: 'offline' };
    try {
      try {
        this.myRoom = await this.room.join('sala-' + this.code.toLowerCase(), this.isHost);
        this.lobbyMode = false;
      } catch (e) {
        if (this.p2p) return { ok: false, err: (e && e.message) || 'erro' };
        // fallback: lobby compartilhado filtrando pelo código
        this.myRoom = this.room; this.lobbyMode = true;
      }
      this.myRoom.onPeers(ch => this._onPeers(ch), () => { });
      this.connected = true;
      this._pushPresence({});
      return { ok: true };
    } catch (e) { return { ok: false, err: (e && e.code) || 'erro' }; }
  },
  async _tryLoadDb() {
    if (!this.db) return null;
    try {
      const snap = await Promise.race([this.db.doc('worlds/' + this.code).get(), new Promise(r => setTimeout(() => r(null), 4000))]);
      if (snap && snap.exists) {
        const d = snap.data();
        if (d && typeof d.seed === 'number') { this.savedWorld = { seed: d.seed, edits: d.edits || [] }; return this.savedWorld; }
      }
    } catch (e) { }
    return null;
  },
  saveDb() {
    if (!this.isHost || !this.db || !this.code || !this._dbDirty) return;
    const now = performance.now();
    if (now - this._dbT < 4000) return;
    this._dbT = now; this._dbDirty = false;
    const doc = { seed: this.worldInfo ? this.worldInfo.seed : 0, edits: this._allEdits.slice(-3000), t: Date.now() };
    this.db.doc('worlds/' + this.code).set(doc).catch(() => { });
  },
  // ---- envio ----
  state(d) { this._presBase = d; this._pushPresence({}); },
  emit(tp, data) {
    if (!this.connected) return;
    if (tp === 'chat' || tp === 'gift' || tp === 'pose' || tp === 'tame') {
      const s = ++this._seq[tp];
      this._pushPresence({ [tp]: Object.assign({ s }, data) });
    } else if (tp === 'edit') {
      this._eseq++;
      this._edits.push([data.x, data.y, data.z, data.v]);
      if (this._edits.length > 36) this._edits.shift();
      this._allEdits.push([data.x, data.y, data.z, data.v]);
      this._dbDirty = true;
      this._pushPresence({ eseq: this._eseq, edits: this._edits });
    } else if (tp === 'animals') {
      if (data.state) this._pushPresence({ anims: data.state.slice(0, 18) });
      if (data.tame) this.emit('tame', data.tame);
    } else if (tp === 'world') {
      this._pushPresence({ world: { seed: data.seed } });
    }
  },
  _pushPresence(extra) {
    if (!this.myRoom || !this.connected) return;
    const p = Object.assign({ id: this.myId, host: this.isHost ? 1 : 0 }, this._presBase, extra);
    if (this.lobbyMode) p.rc = this.code;
    if (this.isHost && this.worldInfo) p.world = { seed: this.worldInfo.seed };
    if (this._eseq) { p.eseq = this._eseq; p.edits = this._edits; }
    this.myRoom.presence(p).catch(() => { });
  },
  // ---- recepção ----
  _onPeers(ch) {
    for (const p of ch.left) {
      const st = this.peers.get(p.peer);
      if (st) { if (this.handlers._leave) this.handlers._leave(p.peer, st); delete this.peersPos[st.id]; this.peers.delete(p.peer); }
    }
    for (const p of [...ch.joined, ...ch.updated]) {
      if (p.isMe || p.kind === 'agent') continue;
      this._apply(p);
    }
    let n = 1;
    for (const p of (this.myRoom ? this.myRoom.peers() : [])) {
      if (p.kind === 'agent') continue;
      if (p.isMe) continue;
      const pr = p.presence || {};
      if (this.lobbyMode && pr.rc !== this.code) continue;
      n++;
    }
    this.online = n;
    if (this.handlers._peers) this.handlers._peers();
  },
  _apply(p) {
    const d = p.presence;
    if (!d || !d.id) return;
    if (this.lobbyMode && d.rc !== this.code) return;
    let st = this.peers.get(p.peer);
    const isNew = !st;
    if (isNew) { st = { peer: p.peer, _chatS: 0, _giftS: 0, _poseS: 0, _tameS: 0, _eseq: 0, _gotWorld: false }; this.peers.set(p.peer, st); }
    // eventos por sequência (antes do assign para comparar)
    if (d.chat && d.chat.s > st._chatS) { st._chatS = d.chat.s; if (!isNew && this.handlers.chat) this.handlers.chat(p.peer, d.chat); else if (isNew) st._chatS = d.chat.s; }
    if (d.gift && d.gift.s > st._giftS) { const fresh = !isNew; st._giftS = d.gift.s; if (fresh && this.handlers.gift) this.handlers.gift(p.peer, d.gift); }
    if (d.pose && d.pose.s > st._poseS) { const fresh = !isNew; st._poseS = d.pose.s; if (fresh && this.handlers.pose) this.handlers.pose(p.peer, d.pose); }
    if (d.tame && d.tame.s > st._tameS) { st._tameS = d.tame.s; if (this.handlers.tame) this.handlers.tame(p.peer, d.tame); }
    if (d.eseq && d.eseq > st._eseq && Array.isArray(d.edits)) {
      const missing = d.eseq - st._eseq;
      const take = isNew ? d.edits : d.edits.slice(-Math.min(missing, d.edits.length));
      st._eseq = d.eseq;
      if (this.handlers.edit) for (const e of take) this.handlers.edit(p.peer, { x: e[0], y: e[1], z: e[2], v: e[3] });
    }
    if (d.world && !this.isHost && !st._gotWorld) { st._gotWorld = true; if (this.handlers.world) this.handlers.world(p.peer, d.world); }
    if (d.anims && !this.isHost && this.handlers.animals) this.handlers.animals(p.peer, { state: d.anims });
    Object.assign(st, d);
    this.peersPos[d.id] = { x: d.x, y: d.y, z: d.z };
    if (isNew && this.handlers._join) this.handlers._join(p.peer, st);
    if (this.handlers.state) this.handlers.state(p.peer, st);
  },
  registerEdit(x, y, z, v) { this.emit('edit', { x, y, z, v }); },
  seedAllEdits(list) { this._allEdits = list.slice(); },
  leave() { if (this.myRoom && !this.lobbyMode) { try { this.myRoom.leave(); } catch (e) { } } this.myRoom = null; this.connected = false; this.peers.clear(); this.online = 1; },
};
