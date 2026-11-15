// Transporte P2P para quando o jogo roda FORA do Claude (APK / navegador comum),
// onde a sala do artifact não existe. Usa PeerJS: o anfitrião vira o centro da
// estrela e repassa o estado de todo mundo. A interface imita a da capability `room`,
// então o resto do jogo não muda nada.
let loading = null;
function loadPeerJS() {
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    if (window.Peer) return res(window.Peer);
    const s = document.createElement('script');
    s.src = 'js/peerjs.min.js';
    s.onload = () => res(window.Peer || null);
    s.onerror = () => rej(new Error('peerjs indisponível'));
    document.head.appendChild(s);
    setTimeout(() => { if (!window.Peer) rej(new Error('peerjs demorou demais')); }, 12000);
  });
  return loading;
}

export async function peerTransport() {
  let P = null;
  try { P = await loadPeerJS(); } catch (e) { return null; }
  if (!P) return null;
  return { p2p: true, join: (name, isHost) => makeRoom(P, name, isHost) };
}

const PREFIX = 'mmfofo7';

function makeRoom(P, name, isHost) {
  return new Promise((resolve, reject) => {
    const code = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const hostId = PREFIX + code;
    const myPres = {};
    const peers = new Map();   // id -> peer
    const conns = new Map();   // id -> conexão
    const hs = [];
    let myId = null, peer = null, hostConn = null, done = false;

    const self = () => ({ peer: myId || 'eu', by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: myPres, updatedAt: Date.now() });
    const snap = () => [self(), ...peers.values()];
    const fire = (joined, left, updated) => { const s = snap(); for (const h of hs) { try { h({ peers: s, joined, left, updated }); } catch (e) { } } };
    const upsert = (id, pres) => {
      if (!id || id === myId) return;
      const old = peers.get(id);
      const p = { peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: pres || (old ? old.presence : {}), updatedAt: Date.now() };
      peers.set(id, p);
      fire(old ? [] : [p], [], old ? [p] : []);
    };
    const drop = (id) => { const p = peers.get(id); if (p) { peers.delete(id); fire([], [p], []); } };
    const send = (c, o) => { try { if (c && c.open) c.send(o); } catch (e) { } };
    const bcast = (o, except) => { for (const [id, c] of conns) if (id !== except) send(c, o); };

    const api = {
      name, p2p: true,
      presence: async (patch) => {
        for (const k in patch) { if (patch[k] === null) delete myPres[k]; else myPres[k] = patch[k]; }
        const msg = { t: 'p', id: myId, d: myPres };
        if (isHost) bcast(msg); else send(hostConn, msg);
      },
      peers: snap,
      onPeers: (h) => { hs.push(h); setTimeout(() => { try { h({ peers: snap(), joined: snap(), left: [], updated: [] }); } catch (e) { } }, 30); return () => { const i = hs.indexOf(h); if (i >= 0) hs.splice(i, 1); }; },
      emit: async () => { }, on: () => () => { },
      connected: () => !!peer && !peer.destroyed,
      onConnection: () => () => { },
      leave: async () => { try { peer && peer.destroy(); } catch (e) { } },
    };

    const fail = (e) => { if (!done) { done = true; reject(e || new Error('erro')); } };
    const ok = () => { if (!done) { done = true; resolve(api); } };

    const opts = Object.assign({ debug: 0 }, window.__PEER_OPTS || {});
    try {
      peer = new P(isHost ? hostId : undefined, opts);
    } catch (e) { return fail(e); }

    peer.on('error', (e) => {
      const t = e && e.type;
      if (t === 'peer-unavailable') { drop(hostId); if (!done) fail(new Error('sala não encontrada')); return; }
      if (!done) fail(e);
    });

    if (isHost) {
      peer.on('open', (id) => { myId = id; ok(); });
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          conns.set(conn.peer, conn);
          send(conn, { t: 'b', l: [{ id: myId, d: myPres }, ...[...peers].map(([id, p]) => ({ id, d: p.presence }))] });
          upsert(conn.peer, {});
        });
        conn.on('data', (m) => {
          if (!m || m.t !== 'p') return;
          upsert(m.id || conn.peer, m.d);
          bcast(m, conn.peer);   // repassa para os outros convidados
        });
        const bye = () => { conns.delete(conn.peer); drop(conn.peer); };
        conn.on('close', bye); conn.on('error', bye);
      });
    } else {
      peer.on('open', (id) => {
        myId = id;
        hostConn = peer.connect(hostId, { reliable: true });
        hostConn.on('open', () => { conns.set(hostId, hostConn); send(hostConn, { t: 'p', id: myId, d: myPres }); ok(); });
        hostConn.on('data', (m) => {
          if (!m) return;
          if (m.t === 'p') upsert(m.id, m.d);
          else if (m.t === 'b' && Array.isArray(m.l)) for (const e of m.l) upsert(e.id, e.d);
        });
        hostConn.on('close', () => drop(hostId));
        hostConn.on('error', () => { });
        setTimeout(() => { if (!hostConn.open) fail(new Error('sala não respondeu')); }, 15000);
      });
    }
    setTimeout(() => fail(new Error('tempo esgotado')), isHost ? 9000 : 16000);
  });
}
