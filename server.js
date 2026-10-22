'use strict';
// Starfall Lanes — authoritative game server (Node.js + ws)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const FAST = process.env.FAST === '1';
const SPEED = FAST ? 0.004 : 1;
const ms = v => Math.max(4, Math.round(v * SPEED));
const PUBLIC = path.join(__dirname, 'public');

// ───────────────────────── Constants ─────────────────────────
const RES = ['ore', 'ice', 'crystal', 'plasma', 'credits'];
const RAW = ['ore', 'ice', 'crystal', 'plasma'];
const PROD = { rock: 'ore', ice: 'ice', crystal: 'crystal', gas: 'plasma' };
const CLAIMABLE = new Set(['rock', 'ice', 'crystal', 'gas', 'station', 'asteroid']);
const MAPS = {
  small: { R: 3, counts: { rock: 6, ice: 6, crystal: 5, gas: 5, station: 6, asteroid: 4, void: 4 }, lanes: [10, 12] },
  large: { R: 4, counts: { rock: 10, ice: 10, crystal: 8, gas: 8, station: 9, asteroid: 6, void: 9 }, lanes: [16, 18] }
};
const STATION_NAMES = ['Kepler Hub', 'Vasta Ring', 'Orrin Gate', 'Tavi Dock', 'Selene Yard', 'Mirro Point', 'Quell Station',
  'Halcyon Ring', 'Brasso Dock', 'Lumen Arc', 'Corvo Port', 'Nadir Gate', 'Ember Wharf', 'Pell Junction'];
const AVATARS = [
  { id: 'kaia', name: 'Commander Kaia Rho', short: 'Kaia', title: 'Human · The Commander', color: '#D63A3A', badge: '▲', perk: 'Fleets cost 1 Credit.' },
  { id: 'zibzob', name: 'Zib-Zob', short: 'Zib-Zob', title: 'Glorp · The Tinkerer', color: '#4CAF50', badge: '●', perk: 'Research costs 1 Credit less.' },
  { id: 'oolu', name: 'Matriarch Oolu', short: 'Oolu', title: 'Coralite · The Elder', color: '#E0569B', badge: '✿', perk: 'Immune to Deep Freeze and Ion Surge.' },
  { id: 'vex', name: 'Vex Halloran', short: 'Vex', title: 'Human · The Smuggler', color: '#1FA5B0', badge: '◆', perk: 'Once per round, one Exchange at 2:1.' },
  { id: 'pyrrhus', name: 'Archon Pyrrhus', short: 'Pyrrhus', title: 'Solari · The Warlord', color: '#E8861A', badge: '★', perk: 'Re-roll once per clash.' },
  { id: 'nim', name: 'Dr. Nim Okafor', short: 'Nim', title: 'Human · The Scientist', color: '#8A4FD8', badge: '⬢', perk: 'Crystal Worlds produce 2 in the Frontier era.' },
  { id: 'skrill', name: 'Skrill', short: 'Skrill', title: 'Insectoid · The Swarm Queen', color: '#2F6FE0', badge: '■', perk: 'Outposts cost no Ice.' },
  { id: 'bramble', name: 'Captain Bramble', short: 'Bramble', title: 'Floran · The Gardener', color: '#E8C21F', badge: '✚', perk: 'Sectors produce +1 the round after the storm leaves them.' }
];
const DRAFT = {
  supply: { name: 'Supply Drop', n: 4, type: 'instant', text: '+2 of one resource of your choice' },
  cache: { name: 'Credit Cache', n: 4, type: 'instant', text: '+3 Credits' },
  overdrive: { name: 'Overdrive', n: 3, type: 'held', text: 'One of your Strikes this round gets +2' },
  warp: { name: 'Warp Gate', n: 3, type: 'held', text: 'Your next hyperlane this round: 1 segment free' },
  survey: { name: 'Survey Drone', n: 3, type: 'instant', text: 'Look at the next 3 Missions, keep 1' },
  shields: { name: 'Emergency Shields', n: 3, type: 'held', text: 'One of your sectors gets +2 defence this round' },
  prospector: { name: 'Prospector', n: 3, type: 'instant', text: '+1 of each resource you have no sector producing' },
  immunity: { name: 'Diplomatic Immunity', n: 2, type: 'held', text: "Your sectors can't be Strike targets this round" },
  icebaron: { name: 'Ice Baron', n: 2, type: 'kept', text: '1 Influence while you own 3+ Ice Worlds' },
  crystalbaron: { name: 'Crystal Baron', n: 2, type: 'kept', text: '1 Influence while you own 3+ Crystal Worlds' },
  stormrider: { name: 'Storm Rider', n: 1, type: 'instant', text: 'The storm moves one extra step now' }
};
const EVENTS = {
  supernova: { name: 'Supernova Flash', text: 'All income this round is doubled' },
  ion: { name: 'Ion Surge', text: 'Hyperlanes pay nothing' },
  comet: { name: 'Comet Shower', text: 'Asteroid Fields produce 1 Ore' },
  flare: { name: 'Plasma Flare', text: 'Gas Giants produce 2' },
  freeze: { name: 'Deep Freeze', text: 'Ice Worlds produce nothing' },
  ceasefire: { name: 'Cease-fire', text: 'No Strikes this round' },
  pirate: { name: 'Pirate Raid', text: 'Players with no Fleets lose 1 Credit' },
  council: { name: 'Council Summit', text: 'Most Spires gain 1 Influence' },
  wormhole: { name: 'Wormhole', text: 'A Void becomes a claimable Trade Station' },
  twin: { name: 'Twin Storms', text: 'A second storm appears for one round' },
  boom: { name: 'Market Boom', text: 'Exchange is 2:1' },
  blackout: { name: 'Blackout', text: 'Draft Pool skipped this round' }
};
const UPGRADES = {
  autominers: { era: 0, name: 'Autominers', text: 'Each hyperlane costs 1 less Ore in total.' },
  cryo: { era: 0, name: 'Cryo Farms', text: 'Exchange at 2:1 when trading in Ice.' },
  militia: { era: 0, name: 'Militia Wing', text: 'Gain 2 Fleets now, and 1 free Fleet at the start of each later era.' },
  lattice: { era: 1, name: 'Crystal Lattice', text: 'Spires cost 1 less Plasma.' },
  couriers: { era: 1, name: 'Express Couriers', text: 'Your hyperlanes pay 2 Credits each.' },
  shieldgrid: { era: 1, name: 'Shield Grid', text: 'All your sectors +1 defence.' },
  shielding: { era: 2, name: 'Storm Shielding', text: 'Your sectors produce inside the Solar Storm.' },
  megaspire: { era: 2, name: 'Megaspire', text: 'Your first Spire becomes a Megaspire (4 Influence).' },
  archive: { era: 2, name: 'Grand Archive', text: 'Each completed Mission is worth +1 Influence.' }
};
const ERA_NAMES = ['Frontier', 'Expansion', 'Ascension'];
const MODES = {
  quick: { name: 'Quick', rounds: 8, target: 10, plan: 60, eras: [1, 4, 7], events: false, perks: false },
  standard: { name: 'Standard', rounds: 12, target: 15, plan: 90, eras: [1, 5, 9], events: false, perks: false },
  advanced: { name: 'Advanced', rounds: 12, target: 15, plan: 90, eras: [1, 5, 9], events: true, perks: true }
};
const CMD_TYPES = new Set(['found', 'spire', 'lane', 'fleet', 'research', 'strike']);

// ───────────────────────── Helpers ─────────────────────────
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = t => new Promise(r => setTimeout(r, ms(t)));
const token = () => crypto.randomBytes(12).toString('hex');
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const hid = (q, r) => q + ',' + r;
const cubeOf = h => [h.q, -h.q - h.r, h.r];
const hdist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const pix = h => [Math.sqrt(3) * (h.q + h.r / 2), 1.5 * h.r];
function cubeRound(x, y, z) {
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return { q: rx, r: rz };
}
function hexLine(a, b) {
  const n = hdist(a, b), out = [];
  const A = cubeOf(a).map(v => v + 1e-6), B = cubeOf(b).map(v => v + 1e-6);
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    out.push(cubeRound(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t));
  }
  return out;
}
function orient(a, b, c) { const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return Math.abs(v) < 1e-9 ? 0 : Math.sign(v); }
function onSeg(a, b, c) { return Math.min(a[0], b[0]) - 1e-9 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 && Math.min(a[1], b[1]) - 1e-9 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9; }
function lanesClash(p1, p2, q1, q2, shared) {
  if (shared) {
    // shared endpoint: only bad if they overlap (same direction)
    const s = p1, a = p2, b = q2;
    const v1 = [a[0] - s[0], a[1] - s[1]], v2 = [b[0] - s[0], b[1] - s[1]];
    const cr = v1[0] * v2[1] - v1[1] * v2[0], dt = v1[0] * v2[0] + v1[1] * v2[1];
    return Math.abs(cr) < 1e-6 && dt > 0;
  }
  const o1 = orient(p1, p2, q1), o2 = orient(p1, p2, q2), o3 = orient(q1, q2, p1), o4 = orient(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(p1, p2, q1)) return true;
  if (o2 === 0 && onSeg(p1, p2, q2)) return true;
  if (o3 === 0 && onSeg(q1, q2, p1)) return true;
  if (o4 === 0 && onSeg(q1, q2, p2)) return true;
  return false;
}
function compass(dx, dy) {
  const a = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
  return ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][Math.round(a / 45) % 8];
}

// ───────────────────────── Map generation ─────────────────────────
function genMap(size) {
  const spec = MAPS[size], R = spec.R;
  const all = [];
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) if (Math.abs(q + r) <= R) all.push({ q, r });
  let best = null;
  for (let attempt = 0; attempt < 600; attempt++) {
    const hexes = {};
    for (const h of all) hexes[hid(h.q, h.r)] = { id: hid(h.q, h.r), q: h.q, r: h.r, type: null, name: null, owner: null, build: null, fleets: 0, stormPrev: false };
    hexes['0,0'].type = 'beacon'; hexes['0,0'].name = 'The Beacon';
    const free = shuffle(all.filter(h => h.q || h.r).map(h => hexes[hid(h.q, h.r)]));
    // stations: not adjacent to each other or the beacon
    const stations = [];
    for (const h of free) {
      if (stations.length >= spec.counts.station) break;
      if (hdist(h, { q: 0, r: 0 }) < 2) continue;
      if (stations.some(s => hdist(s, h) < 2)) continue;
      stations.push(h);
    }
    if (stations.length < spec.counts.station) continue;
    const names = shuffle(STATION_NAMES.slice());
    stations.forEach((s, i) => { s.type = 'station'; s.name = names[i]; });
    const rest = free.filter(h => !h.type);
    let ok = false;
    for (let t = 0; t < 80 && !ok; t++) {
      const bag = [];
      for (const k of ['rock', 'ice', 'crystal', 'gas', 'asteroid', 'void']) for (let i = 0; i < spec.counts[k]; i++) bag.push(k);
      shuffle(bag);
      rest.forEach((h, i) => { h.type = bag[i]; });
      ok = clustersOk(hexes);
    }
    if (!ok) continue;
    // hyperlanes
    const ends = [hexes['0,0'], ...stations];
    const cands = [];
    for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
      const d = hdist(ends[i], ends[j]);
      if (d < 2 || d > 5) continue;
      const line = hexLine(ends[i], ends[j]).map(c => hexes[hid(c.q, c.r)]);
      if (line.some(x => !x)) continue;
      const interior = line.slice(1, -1);
      if (interior.some(x => x.type === 'station' || x.type === 'beacon')) continue;
      cands.push({ a: ends[i].id, b: ends[j].id, len: d, path: interior.map(x => x.id), pa: pix(ends[i]), pb: pix(ends[j]) });
    }
    shuffle(cands);
    // prefer shorter lanes slightly
    cands.sort((x, y) => (x.len + Math.random() * 2.5) - (y.len + Math.random() * 2.5));
    const target = spec.lanes[0] + rnd(spec.lanes[1] - spec.lanes[0] + 1);
    const lanes = [];
    for (const c of cands) {
      if (lanes.length >= target) break;
      let bad = false;
      for (const l of lanes) {
        const ptsL = { [l.a]: l.pa, [l.b]: l.pb }, ptsC = { [c.a]: c.pa, [c.b]: c.pb };
        const shared = [c.a, c.b].filter(e => e === l.a || e === l.b);
        if (shared.length === 2) { bad = true; break; }
        if (shared.length === 1) {
          const sId = shared[0], s = ptsC[sId];
          const oL = ptsL[l.a === sId ? l.b : l.a], oC = ptsC[c.a === sId ? c.b : c.a];
          if (lanesClash(s, oL, s, oC, s)) { bad = true; break; }
        } else if (lanesClash(l.pa, l.pb, c.pa, c.pb, null)) { bad = true; break; }
      }
      if (!bad) lanes.push(c);
    }
    const res = { R, hexes, lanes: lanes.map((l, i) => ({ id: 'L' + i, a: l.a, b: l.b, len: l.len, path: l.path, owner: null })) };
    if (lanes.length >= spec.lanes[0]) return res;
    if (!best || lanes.length > best.lanes.length) best = res;
  }
  return best;
}
function clustersOk(hexes) {
  const seen = new Set();
  for (const h of Object.values(hexes)) {
    if (!PROD[h.type] || seen.has(h.id)) continue;
    let size = 0; const st = [h]; seen.add(h.id);
    while (st.length) {
      const c = st.pop(); size++;
      for (const [dq, dr] of DIRS) {
        const n = hexes[hid(c.q + dq, c.r + dr)];
        if (n && n.type === h.type && !seen.has(n.id)) { seen.add(n.id); st.push(n); }
      }
    }
    if (size > 2) return false;
  }
  return true;
}

// ───────────────────────── Rooms ─────────────────────────
const rooms = new Map();
function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => L[rnd(L.length)]).join(''); } while (rooms.has(c));
  return c;
}
function makeRoom() {
  const room = { code: newCode(), tvToken: token(), tvs: new Set(), players: [], hostId: null, mode: 'standard', game: null, phase: 'lobby', touched: Date.now(), seq: 0 };
  rooms.set(room.code, room);
  return room;
}
const avatarOf = p => AVATARS[p.avatar] || AVATARS[0];
const nameOf = (room, pid) => { const p = room.players.find(x => x.id === pid); return p ? p.name : '?'; };

// ───────────────────────── Game setup ─────────────────────────
function startGame(room) {
  const n = room.players.length;
  const m = genMap(n <= 4 ? 'small' : 'large');
  const mode = MODES[room.mode];
  const g = {
    alive: true, R: m.R, hexes: m.hexes, lanes: m.lanes, mode: room.mode, M: mode,
    storm: null, twin: null, round: 0, era: 0, firstIdx: rnd(n), order: [],
    phase: 'missions', phaseEnds: 0, draftDeck: [], draftDiscard: [], pool: [],
    missionDeck: [], eventDeck: [], event: null, ps: {}, trophies: { network: null, armada: null },
    log: [], fx: null, fxSeq: 0, setupTurn: null, eraOffer: [], eraPicks: {}, leftoverUpgrades: [], offers: [], offerSeq: 0,
    results: null, moods: {}, uid: 0, incomeShow: null, eraTurn: null
  };
  room.game = g; room.phase = 'game';
  g.storm = spawnStorm(g, true);
  // decks
  for (const [k, d] of Object.entries(DRAFT)) for (let i = 0; i < d.n; i++) g.draftDeck.push({ uid: 'd' + (g.uid++), key: k });
  shuffle(g.draftDeck);
  g.missionDeck = genMissions(g);
  g.eventDeck = shuffle(Object.keys(EVENTS));
  for (const p of room.players) {
    g.ps[p.id] = {
      res: { ore: 1, ice: 1, crystal: 1, plasma: 1, credits: 2 }, missions: [], missionOffer: [], held: [], kept: [],
      upgrades: [], bonusInf: 0, plan: emptyPlan(), engaged: false, offersSent: 0, vexUsed: false, surveyOffer: null,
      pendingMega: false, megaDone: false, round: {}, keepDone: false
    };
  }
  setOrder(room);
  runGame(room).catch(e => { console.error('game error', e); });
}
function emptyPlan() { return { cmds: [null, null], rank: [], play: [], supply: null }; }
function setOrder(room) {
  const g = room.game, ids = room.players.map(p => p.id);
  g.order = ids.slice(g.firstIdx % ids.length).concat(ids.slice(0, g.firstIdx % ids.length));
}
function genMissions(g) {
  const st = Object.values(g.hexes).filter(h => h.type === 'station');
  const out = [];
  const add = m => out.push(Object.assign({ uid: 'm' + (g.uid++), done: false }, m));
  for (let i = 0; i < 10; i++) {
    const [a, b] = shuffle(st.slice()).slice(0, 2);
    const d = hdist(a, b);
    const inf = d <= g.R ? 2 : d <= g.R * 1.5 ? 3 : 4;
    add({ type: 'link', a: a.id, b: b.id, inf, text: `Link ${a.name} to ${b.name}` });
  }
  for (let i = 0; i < 4; i++) { const a = pick(st); add({ type: 'beacon', a: a.id, b: '0,0', inf: 3, text: `Link ${a.name} to the Beacon` }); }
  const W = { rock: 'Rock', ice: 'Ice', crystal: 'Crystal', gas: 'Gas Giant' };
  for (const k of ['rock', 'ice', 'crystal', 'gas']) add({ type: 'hold', world: k, inf: 2, text: `Hold 3 ${W[k]} ${k === 'gas' ? 'sectors' : 'Worlds'} at once` });
  for (let i = 0; i < 2; i++) add({ type: 'spires', inf: 3, text: 'Own 2 Spires' });
  for (let i = 0; i < 2; i++) add({ type: 'lanes', inf: 2, text: 'Own 3 hyperlanes' });
  for (let i = 0; i < 2; i++) add({ type: 'asteroid', inf: 2, text: 'Hold an Asteroid Field with 3+ Fleets on it' });
  return shuffle(out);
}

// ───────────────────────── Storm ─────────────────────────
function spawnStorm(g, initial) {
  const axis = rnd(3), sign = Math.random() < 0.5 ? -1 : 1;
  return { axis, sign, pos: -g.R - 2, label: stormLabel(axis, sign), fresh: !!initial };
}
function stormLabel(axis, sign) {
  // the two axial directions that increase sign*cube[axis] by 1
  let sx = 0, sy = 0;
  for (const [dq, dr] of DIRS) {
    const c = cubeOf({ q: dq, r: dr });
    if (c[axis] * sign === 1) { const p = pix({ q: dq, r: dr }); sx += p[0]; sy += p[1]; }
  }
  return compass(sx, sy);
}
const bandHas = (b, h) => { if (!b) return false; const v = b.sign * cubeOf(h)[b.axis]; return v >= b.pos && v <= b.pos + 1; };
const inStorm = (g, h) => bandHas(g.storm, h) || bandHas(g.twin, h);
const stormOff = (g, b) => b.pos > g.R;
function moveStorm(g) {
  if (stormOff(g, g.storm)) g.storm = spawnStorm(g);
  g.storm.pos++;
}

// ───────────────────────── Queries ─────────────────────────
const P = (g, pid) => g.ps[pid];
const owned = (g, pid) => Object.values(g.hexes).filter(h => h.owner === pid);
const nbrs = (g, h) => DIRS.map(([dq, dr]) => g.hexes[hid(h.q + dq, h.r + dr)]).filter(Boolean);
const hasUp = (g, pid, k) => P(g, pid).upgrades.includes(k);
const perk = (g, room, pid, av) => g.M.perks && avatarOf(room.players.find(p => p.id === pid)).id === av;
const canPay = (res, c) => Object.entries(c).every(([k, v]) => (res[k] || 0) >= v);
const pay = (res, c) => { for (const [k, v] of Object.entries(c)) res[k] -= v; };
const gain = (res, c) => { for (const [k, v] of Object.entries(c)) res[k] = (res[k] || 0) + v; };
const fleetsOf = (g, pid) => owned(g, pid).reduce((s, h) => s + h.fleets, 0);
const lanesOf = (g, pid) => g.lanes.filter(l => l.owner === pid);

function costs(g, room, pid) {
  const lanes = {};
  for (const l of g.lanes) lanes[l.id] = laneCost(g, pid, l, false);
  return {
    found: { ore: 1, ice: perk(g, room, pid, 'skrill') ? 0 : 1 },
    spire: { crystal: 2, plasma: hasUp(g, pid, 'lattice') ? 1 : 2, ore: 1 },
    fleetEach: perk(g, room, pid, 'kaia') ? 1 : 2,
    research: { credits: perk(g, room, pid, 'zibzob') ? 2 : 3, crystal: 1 },
    lanes
  };
}
function laneCost(g, pid, l, warp) {
  const segs = Math.max(0, l.len - (warp ? 1 : 0));
  return { ore: Math.max(0, segs - (hasUp(g, pid, 'autominers') ? 1 : 0)), plasma: segs };
}
function foundOk(g, pid, h) {
  if (!h || !CLAIMABLE.has(h.type) || h.owner) return false;
  if (nbrs(g, h).some(n => n.owner === pid)) return true;
  for (const l of lanesOf(g, pid)) {
    const cells = [l.a, l.b, ...l.path];
    for (const c of cells) { const x = g.hexes[c]; if (x.id === h.id || hdist(x, h) === 1) return true; }
  }
  return false;
}
function strikeOk(g, room, pid, from, to) {
  if (!from || !to || from.owner !== pid || from.fleets < 1) return false;
  if (!to.owner || to.owner === pid || hdist(from, to) !== 1 || inStorm(g, to)) return false;
  if (g.event === 'ceasefire') return false;
  return true;
}
function legal(g, room, pid) {
  const mine = owned(g, pid);
  const L = { found: [], spire: [], lane: [], fleetPlace: mine.map(h => h.id), move: [], strike: [], research: [], shields: mine.map(h => h.id) };
  for (const h of Object.values(g.hexes)) if (foundOk(g, pid, h)) L.found.push(h.id);
  for (const h of mine) if (h.type === 'station' && h.build === 'outpost') L.spire.push(h.id);
  for (const l of g.lanes) if (!l.owner && [l.a, l.b].some(e => g.hexes[e].type === 'station' && g.hexes[e].owner === pid)) L.lane.push(l.id);
  for (const h of mine) for (const n of nbrs(g, h)) {
    if (n.owner === pid && h.fleets > 0) L.move.push([h.id, n.id]);
    if (strikeOk(g, room, pid, h, n)) L.strike.push([h.id, n.id]);
  }
  if (g.missionDeck.length) L.research.push('mission');
  for (const k of g.leftoverUpgrades || []) if (!hasUp(g, pid, k)) L.research.push(k);
  return L;
}
function connected(g, pid, a, b) {
  const nodes = new Set(owned(g, pid).map(h => h.id));
  const adj = {};
  const link = (x, y) => { (adj[x] = adj[x] || []).push(y); (adj[y] = adj[y] || []).push(x); };
  for (const l of lanesOf(g, pid)) { nodes.add(l.a); nodes.add(l.b); link(l.a, l.b); }
  for (const id of nodes) { const h = g.hexes[id]; if (h.owner === pid) for (const n of nbrs(g, h)) if (n.owner === pid) link(id, n.id); }
  if (!nodes.has(a) || !nodes.has(b)) return false;
  const seen = new Set([a]), st = [a];
  while (st.length) { const c = st.pop(); if (c === b) return true; for (const n of adj[c] || []) if (!seen.has(n)) { seen.add(n); st.push(n); } }
  return false;
}
function missionMet(g, pid, m) {
  const mine = owned(g, pid);
  switch (m.type) {
    case 'link': case 'beacon': return connected(g, pid, m.a, m.b);
    case 'hold': return mine.filter(h => h.type === m.world).length >= 3;
    case 'spires': return mine.filter(h => h.build === 'spire' || h.build === 'mega').length >= 2;
    case 'lanes': return lanesOf(g, pid).length >= 3;
    case 'asteroid': return mine.some(h => h.type === 'asteroid' && h.fleets >= 3);
  }
  return false;
}
function networkSize(g, pid) {
  const ls = lanesOf(g, pid); if (!ls.length) return 0;
  const parent = {};
  const f = x => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (const l of ls) { parent[l.a] = parent[l.a] || l.a; parent[l.b] = parent[l.b] || l.b; }
  for (const l of ls) parent[f(l.a)] = f(l.b);
  const tot = {};
  for (const l of ls) { const r = f(l.a); tot[r] = (tot[r] || 0) + l.len; }
  return Math.max(...Object.values(tot));
}
function influence(g, pid) {
  const ps = P(g, pid);
  let v = ps.bonusInf;
  for (const h of owned(g, pid)) if (h.type === 'station') v += h.build === 'mega' ? 4 : h.build === 'spire' ? 2 : 1;
  for (const m of ps.missions) if (m.done) v += m.inf + (hasUp(g, pid, 'archive') ? 1 : 0);
  if (g.trophies.network === pid) v += 2;
  if (g.trophies.armada === pid) v += 2;
  const mine = owned(g, pid);
  for (const c of ps.kept) {
    if (c.key === 'icebaron' && mine.filter(h => h.type === 'ice').length >= 3) v++;
    if (c.key === 'crystalbaron' && mine.filter(h => h.type === 'crystal').length >= 3) v++;
  }
  return v;
}
function laneSegs(g, pid) { return lanesOf(g, pid).reduce((s, l) => s + l.len, 0); }
function rates(g, room, pid) {
  const r = {};
  for (const k of RES) {
    let v = 3;
    if (g.event === 'boom') v = 2;
    if (k === 'ice' && hasUp(g, pid, 'cryo')) v = 2;
    if (perk(g, room, pid, 'vex') && !P(g, pid).vexUsed) v = 2;
    r[k] = v;
  }
  return r;
}

// ───────────────────────── Effects / log ─────────────────────────
function log(g, text) { g.log.push(text); if (g.log.length > 40) g.log.shift(); }
function fx(g, o) { g.fx = Object.assign({ seq: ++g.fxSeq }, o); }
function mood(g, pid, m) { g.moods[pid] = { m, until: Date.now() + 7000 }; }

// ───────────────────────── Game loop ─────────────────────────
async function waitFor(room, t, done) {
  const g = room.game;
  g.phaseEnds = Date.now() + ms(t);
  sync(room);
  await new Promise(res => {
    const iv = setInterval(() => {
      if (!g.alive || room.game !== g) { clearInterval(iv); return res(); }
      expireOffers(room);
      if (done() || Date.now() >= g.phaseEnds) { clearInterval(iv); res(); }
    }, FAST ? 5 : 200);
  });
  g.phaseEnds = 0;
}
const live = (room, g) => g.alive && room.game === g;
const humansActive = room => room.players.filter(p => !p.isAI);

async function runGame(room) {
  const g = room.game;
  // 1. Missions: keep at least 2 of 3
  for (const p of room.players) { const ps = P(g, p.id); ps.missionOffer = g.missionDeck.splice(0, 3); if (p.isAI) {
    const keep = botKeepMissions(g, p.id, ps.missionOffer);
    g.missionDeck.push(...ps.missionOffer.filter(m => !keep.includes(m)));
    ps.missionOffer = keep;
    ps.keepDone = true;
  } }
  g.phase = 'missions';
  await waitFor(room, 30000, () => room.players.every(p => P(g, p.id).keepDone || p.isAI));
  if (!live(room, g)) return;
  for (const p of room.players) { const ps = P(g, p.id); ps.missions = ps.missionOffer; ps.missionOffer = []; }
  // 2. Snake placement
  g.phase = 'setup';
  const snake = g.order.concat(g.order.slice().reverse());
  for (const pid of snake) {
    g.setupTurn = pid; g.setupChoice = null;
    const p = room.players.find(x => x.id === pid);
    if (p && p.isAI) { await sleep(700); g.setupChoice = botSetupChoice(g, pid, setupLegal(g, pid)); }
    else await waitFor(room, 45000, () => !!g.setupChoice || !p || p.isAI);
    if (!live(room, g)) return;
    let h = g.hexes[g.setupChoice];
    if (!h || !setupLegal(g, pid).includes(h.id)) h = g.hexes[pick(setupLegal(g, pid))];
    if (h) { h.owner = pid; h.build = 'outpost'; h.fleets = 1; fx(g, { k: 'found', pid, hex: h.id }); log(g, `${nameOf(room, pid)} landed on ${hexLabel(h)}.`); }
    sync(room);
  }
  g.setupTurn = null;
  // 3. Rounds
  for (let rd = 1; rd <= g.M.rounds; rd++) {
    g.round = rd;
    if (!live(room, g)) return;
    if (g.round > 1) { g.firstIdx = (g.firstIdx + 1) % room.players.length; setOrder(room); }
    const eraIdx = g.M.eras.indexOf(g.round);
    if (eraIdx >= 0) { g.era = eraIdx; await eraPhase(room, eraIdx); if (!live(room, g)) return; }
    await incomePhase(room); if (!live(room, g)) return;
    await planPhase(room); if (!live(room, g)) return;
    await revealPhase(room); if (!live(room, g)) return;
    const target = g.M.target;
    if (room.players.some(p => influence(g, p.id) >= target)) break;
  }
  endGame(room);
}
function setupLegal(g, pid) {
  const cand = Object.values(g.hexes).filter(h => PROD[h.type] && !h.owner);
  const far = cand.filter(h => !nbrs(g, h).some(n => n.owner && n.owner !== pid));
  return (far.length ? far : cand).map(h => h.id);
}
function hexLabel(h) {
  if (h.name) return h.name;
  return { rock: 'a Rock World', ice: 'an Ice World', crystal: 'a Crystal World', gas: 'a Gas Giant', asteroid: 'an Asteroid Field' }[h.type] || 'a sector';
}

function eraPickOrder(room) {
  const g = room.game;
  // Reverse Influence, with the current first-player order breaking ties.
  return g.order.slice().sort((a, b) => influence(g, a) - influence(g, b) || g.order.indexOf(a) - g.order.indexOf(b));
}
async function eraPhase(room, eraIdx) {
  const g = room.game;
  g.phase = 'era';
  log(g, `The ${ERA_NAMES[eraIdx]} era begins.`);
  fx(g, { k: 'era', era: eraIdx });
  for (const p of room.players) if (eraIdx > 0 && hasUp(g, p.id, 'militia')) addFleets(g, p.id, 1);
  g.eraOffer = Object.keys(UPGRADES).filter(k => UPGRADES[k].era === eraIdx);
  g.eraPicks = {};
  // Picks are sequential, last place first. All three upgrades remain available to
  // every house, as required by the v2 design; they are not exclusive cards.
  for (const pid of eraPickOrder(room)) {
    if (!live(room, g)) return;
    g.eraTurn = pid;
    const player = room.players.find(p => p.id === pid);
    if (player.isAI) g.eraPicks[pid] = botEraChoice(room, pid, g.eraOffer);
    else await waitFor(room, 10000, () => !!g.eraPicks[pid] || player.isAI);
    if (!live(room, g)) return;
    const k = g.eraOffer.includes(g.eraPicks[pid]) ? g.eraPicks[pid] : pick(g.eraOffer);
    g.eraPicks[pid] = k;
    applyUpgrade(room, pid, k);
    sync(room);
  }
  g.leftoverUpgrades.push(...g.eraOffer.filter(k => !Object.values(g.eraPicks).includes(k)));
  g.eraTurn = null;
  g.eraOffer = []; g.eraPicks = {};
  sync(room);
  await sleep(1500);
}

function addFleets(g, pid, n) {
  const mine = owned(g, pid);
  if (!mine.length) return;
  mine.sort((a, b) => b.fleets - a.fleets);
  mine[0].fleets += n;
}
function applyUpgrade(room, pid, k) {
  const g = room.game, ps = P(g, pid);
  if (ps.upgrades.includes(k)) return;
  ps.upgrades.push(k);
  if (k === 'militia') addFleets(g, pid, 2);
  if (k === 'megaspire') {
    const sp = owned(g, pid).find(h => h.build === 'spire');
    if (sp) { sp.build = 'mega'; ps.megaDone = true; fx(g, { k: 'spire', pid, hex: sp.id }); log(g, `${nameOf(room, pid)} raised a Megaspire at ${sp.name}!`); mood(g, pid, 'smug'); }
    else ps.pendingMega = true;
  }
  log(g, `${nameOf(room, pid)} took ${UPGRADES[k].name}.`);
}

async function incomePhase(room) {
  const g = room.game;
  g.phase = 'income';
  // record storm cover from last round, then move
  for (const h of Object.values(g.hexes)) h.stormPrev = inStorm(g, h);
  g.twin = null;
  moveStorm(g);
  g.event = null;
  if (g.M.events) {
    if (!g.eventDeck.length) g.eventDeck = shuffle(Object.keys(EVENTS));
    g.event = g.eventDeck.pop();
    log(g, `Cosmic Event: ${EVENTS[g.event].name} — ${EVENTS[g.event].text}.`);
    if (g.event === 'twin') { g.twin = { axis: rnd(3), sign: 1, pos: rnd(2 * g.R) - g.R }; }
    if (g.event === 'wormhole') {
      const voids = Object.values(g.hexes).filter(h => h.type === 'void');
      if (voids.length) {
        const v = pick(voids); v.type = 'station';
        const used = new Set(Object.values(g.hexes).map(h => h.name));
        v.name = STATION_NAMES.find(n => !used.has(n)) || 'Wormhole Gate';
        log(g, `A wormhole opened ${v.name}!`);
      }
    }
  }
  const gains = {};
  const infs = {};
  for (const p of room.players) infs[p.id] = influence(g, p.id);
  const low = Math.min(...Object.values(infs));
  for (const p of room.players) {
    const pid = p.id, inc = { ore: 0, ice: 0, crystal: 0, plasma: 0, credits: 0 };
    for (const h of owned(g, pid)) {
      const storm = inStorm(g, h) && !hasUp(g, pid, 'shielding');
      if (storm) continue;
      let k = null, v = 0;
      if (PROD[h.type]) { k = PROD[h.type]; v = 1; }
      if (h.type === 'station') { k = 'credits'; v = (h.build === 'spire' || h.build === 'mega') ? 2 : 1; }
      if (h.type === 'asteroid' && g.event === 'comet') { k = 'ore'; v = 1; }
      if (h.type === 'ice' && g.event === 'freeze' && !perk(g, room, pid, 'oolu')) v = 0;
      if (h.type === 'gas' && g.event === 'flare') v = 2;
      if (h.type === 'crystal' && g.era === 0 && perk(g, room, pid, 'nim')) v = 2;
      if (k && v && h.stormPrev && !inStorm(g, h) && perk(g, room, pid, 'bramble')) v += 1;
      if (k) inc[k] += v;
    }
    for (const l of lanesOf(g, pid)) {
      if (g.event === 'ion' && !perk(g, room, pid, 'oolu')) continue;
      inc.credits += (hasUp(g, pid, 'couriers') ? 2 : 1) + (l.a === '0,0' || l.b === '0,0' ? 1 : 0);
    }
    if (infs[pid] === low) inc.credits += 1;
    // The catch-up Credit is income too: Supernova doubles all income.
    if (g.event === 'supernova') for (const k of RES) inc[k] *= 2;
    const res = P(g, pid).res;
    gain(res, inc);
    if (g.event === 'pirate' && fleetsOf(g, pid) === 0 && res.credits > 0) { res.credits -= 1; inc.credits -= 1; }
    if (owned(g, pid).some(h => inStorm(g, h)) && !hasUp(g, pid, 'shielding')) mood(g, pid, 'furious');
    gains[pid] = inc;
  }
  if (g.event === 'council') {
    const cnt = {};
    for (const p of room.players) cnt[p.id] = owned(g, p.id).filter(h => h.build === 'spire' || h.build === 'mega').length;
    const top = Math.max(...Object.values(cnt));
    if (top > 0) for (const p of room.players) if (cnt[p.id] === top) { P(g, p.id).bonusInf += 1; log(g, `${p.name} gained 1 Influence at the Council Summit.`); }
  }
  // rescue: players with no sectors get a free outpost
  for (const p of room.players) {
    if (owned(g, p.id).length === 0) {
      const free = Object.values(g.hexes).filter(h => PROD[h.type] && !h.owner);
      if (free.length) { const h = pick(free); h.owner = p.id; h.build = 'outpost'; h.fleets = 1; log(g, `${p.name} regrouped at ${hexLabel(h)}.`); fx(g, { k: 'found', pid: p.id, hex: h.id }); }
    }
  }
  g.incomeShow = gains;
  fx(g, { k: 'income', gains });
  for (const p of room.players) { const ps = P(g, p.id); ps.vexUsed = false; ps.offersSent = 0; ps.round = {}; }
  sync(room);
  await sleep(4000);
}

async function planPhase(room) {
  const g = room.game;
  g.phase = 'plan';
  g.incomeShow = null;
  // Draft pool
  g.pool = [];
  if (g.event !== 'blackout') {
    const need = room.players.length + 1;
    if (g.draftDeck.length < need) { g.draftDeck = g.draftDeck.concat(shuffle(g.draftDiscard)); g.draftDiscard = []; }
    g.pool = g.draftDeck.splice(0, need);
  }
  for (const p of room.players) {
    const ps = P(g, p.id);
    ps.plan = emptyPlan(); ps.engaged = false;
    if (p.isAI) aiPlan(room, p.id);
  }
  await waitFor(room, g.M.plan * 1000, () => room.players.every(p => P(g, p.id).engaged || p.isAI));
  // close any pending offers
  for (const o of g.offers) o.status = o.status || 'expired';
  g.offers = [];
  for (const p of room.players) {
    const ps = P(g, p.id);
    if (ps.surveyOffer) {
      const ranked = ps.surveyOffer.slice().sort((a,b)=>botMissionPriority(g,p.id,b)-botMissionPriority(g,p.id,a));
      chooseSurvey(g, p.id, p.isAI ? ranked[0].uid : ps.surveyOffer[0].uid);
    }
  }
}

async function revealPhase(room) {
  const g = room.game;
  g.phase = 'reveal';
  sync(room);
  await sleep(900);
  // 1. Draft
  if (g.pool.length) {
    for (const pid of g.order) {
      if (!g.pool.length) break;
      const ps = P(g, pid);
      let card = null;
      for (const uid of ps.plan.rank) { card = g.pool.find(c => c.uid === uid); if (card) break; }
      if (!card) card = pick(g.pool);
      g.pool = g.pool.filter(c => c !== card);
      receiveCard(room, pid, card);
      sync(room);
      await sleep(1000);
      if (!live(room, g)) return;
    }
    g.draftDiscard.push(...g.pool); g.pool = [];
  }
  // 2. Played held cards
  for (const pid of g.order) {
    const ps = P(g, pid);
    for (const pl of ps.plan.play || []) {
      const c = ps.held.find(x => x.uid === pl.uid);
      if (!c) continue;
      if (c.key === 'shields') { const h = g.hexes[pl.target]; if (!h || h.owner !== pid) continue; ps.round.shields = h.id; }
      if (c.key === 'overdrive') ps.round.overdrive = true;
      if (c.key === 'warp') ps.round.warp = true;
      if (c.key === 'immunity') ps.round.immunity = true;
      ps.held = ps.held.filter(x => x !== c);
      g.draftDiscard.push(c);
      log(g, `${nameOf(room, pid)} played ${DRAFT[c.key].name}.`);
      fx(g, { k: 'card', pid, key: c.key, hex: c.key === 'shields' ? ps.round.shields : null });
    }
  }
  sync(room);
  // 3. Commands
  const strikes = [];
  for (const i of [0, 1]) {
    for (const pid of g.order) {
      const cmd = P(g, pid).plan.cmds[i];
      if (!cmd) continue;
      if (cmd.type === 'strike') { strikes.push({ pid, cmd }); continue; }
      resolveCmd(room, pid, cmd);
      sync(room);
      await sleep(1200);
      if (!live(room, g)) return;
    }
  }
  // 4. Clashes
  for (const s of strikes) {
    resolveStrike(room, s.pid, s.cmd);
    sync(room);
    await sleep(2200);
    if (!live(room, g)) return;
  }
  // 5. Missions & trophies
  for (const p of room.players) {
    for (const m of P(g, p.id).missions) {
      if (!m.done && missionMet(g, p.id, m)) {
        m.done = true; mood(g, p.id, 'smug');
        log(g, `${p.name} completed a Mission: ${m.text} (+${m.inf}).`);
        fx(g, { k: 'mission', pid: p.id, text: m.text, inf: m.inf });
        sync(room); await sleep(1500);
      }
    }
  }
  updateTrophies(room);
  sync(room);
  await sleep(1200);
}

function receiveCard(room, pid, card) {
  const g = room.game, ps = P(g, pid), d = DRAFT[card.key];
  log(g, `${nameOf(room, pid)} drafted ${d.name}.`);
  fx(g, { k: 'draft', pid, key: card.key });
  if (d.type === 'held') {
    ps.held.push(card);
    while (ps.held.length > 3) g.draftDiscard.push(ps.held.shift());
    return;
  }
  if (d.type === 'kept') { ps.kept.push(card); return; }
  g.draftDiscard.push(card);
  if (card.key === 'supply') {
    // A submitted preference is applied only if the player actually wins Supply Drop.
    // Bot, timeout and older phone clients fall back to the scarcest resource.
    const k = RAW.includes(ps.plan.supply) ? ps.plan.supply : RAW.slice().sort((a, b) => ps.res[a] - ps.res[b])[0];
    ps.res[k] += 2;
    log(g, `${nameOf(room, pid)} received 2 ${k} from Supply Drop.`);
  }
  if (card.key === 'cache') ps.res.credits += 3;
  if (card.key === 'prospector') {
    const prod = new Set(owned(g, pid).map(h => PROD[h.type]).filter(Boolean));
    for (const k of RAW) if (!prod.has(k)) ps.res[k] += 1;
  }
  if (card.key === 'survey') {
    const offer = g.missionDeck.splice(0, 3);
    if (offer.length) ps.surveyOffer = offer;
  }
  if (card.key === 'stormrider') { g.storm.pos++; log(g, 'The Solar Storm surged forward!'); fx(g, { k: 'storm' }); }
}
function chooseSurvey(g, pid, uid) {
  const ps = P(g, pid);
  if (!ps.surveyOffer) return;
  const keep = ps.surveyOffer.find(m => m.uid === uid) || ps.surveyOffer[0];
  ps.missions.push(keep);
  g.missionDeck.push(...ps.surveyOffer.filter(m => m !== keep));
  ps.surveyOffer = null;
}

function fail(room, pid, cmd, why) {
  const g = room.game;
  P(g, pid).res.credits += 1;
  log(g, `${nameOf(room, pid)}: ${cmdName(cmd)} failed — ${why}. (+1 Credit)`);
  fx(g, { k: 'fail', pid, why });
  mood(g, pid, 'furious');
}
function cmdName(c) { return { found: 'Found Outpost', spire: 'Raise Spire', lane: 'Open Hyperlane', fleet: 'Build Fleet', research: 'Research', strike: 'Strike' }[c.type] || 'Command'; }

function resolveCmd(room, pid, cmd) {
  const g = room.game, ps = P(g, pid), res = ps.res, C = costs(g, room, pid), who = nameOf(room, pid);
  if (cmd.type === 'found') {
    const h = g.hexes[cmd.target];
    if (!foundOk(g, pid, h)) return fail(room, pid, cmd, 'that sector is no longer reachable');
    if (!canPay(res, C.found)) return fail(room, pid, cmd, 'not enough resources');
    pay(res, C.found); h.owner = pid; h.build = 'outpost'; h.fleets = 0;
    log(g, `${who} founded an Outpost on ${hexLabel(h)}.`);
    fx(g, { k: 'found', pid, hex: h.id });
  } else if (cmd.type === 'spire') {
    const h = g.hexes[cmd.target];
    if (!h || h.owner !== pid || h.type !== 'station' || h.build !== 'outpost') return fail(room, pid, cmd, 'that station is not yours to upgrade');
    if (!canPay(res, C.spire)) return fail(room, pid, cmd, 'not enough resources');
    pay(res, C.spire);
    if (ps.pendingMega && !ps.megaDone) { h.build = 'mega'; ps.pendingMega = false; ps.megaDone = true; log(g, `${who} raised a Megaspire at ${h.name}!`); }
    else { h.build = 'spire'; log(g, `${who} raised a Spire at ${h.name}!`); }
    fx(g, { k: 'spire', pid, hex: h.id }); mood(g, pid, 'smug');
  } else if (cmd.type === 'lane') {
    const l = g.lanes.find(x => x.id === cmd.lane);
    if (!l || l.owner || ![l.a, l.b].some(e => g.hexes[e].type === 'station' && g.hexes[e].owner === pid)) return fail(room, pid, cmd, 'that hyperlane is unavailable');
    const warp = ps.round.warp && !ps.round.warpUsed;
    const c = laneCost(g, pid, l, warp);
    if (!canPay(res, c)) return fail(room, pid, cmd, 'not enough resources');
    pay(res, c); l.owner = pid; if (warp) ps.round.warpUsed = true;
    log(g, `${who} opened the ${g.hexes[l.a].name}–${g.hexes[l.b].name} hyperlane!`);
    fx(g, { k: 'lane', pid, lane: l.id });
  } else if (cmd.type === 'fleet') {
    const n = Math.max(0, Math.min(3, cmd.n | 0));
    const place = g.hexes[cmd.place];
    let did = false;
    if (n > 0) {
      if (!place || place.owner !== pid) return fail(room, pid, cmd, 'that sector is no longer yours');
      const c = { credits: n * C.fleetEach };
      if (!canPay(res, c)) return fail(room, pid, cmd, 'not enough Credits');
      pay(res, c); place.fleets += n; did = true;
      log(g, `${who} built ${n} Fleet${n > 1 ? 's' : ''} at ${hexLabel(place)}.`);
      fx(g, { k: 'fleet', pid, hex: place.id, n });
    }
    if (cmd.move) {
      const a = g.hexes[cmd.move.from], b = g.hexes[cmd.move.to];
      if (a && b && a.owner === pid && b.owner === pid && hdist(a, b) === 1 && a.fleets > 0) {
        const k = Math.max(1, Math.min(a.fleets, cmd.move.n | 0 || a.fleets));
        a.fleets -= k; b.fleets += k; did = true;
        log(g, `${who} moved ${k} Fleet${k > 1 ? 's' : ''}.`);
        fx(g, { k: 'move', pid, from: a.id, to: b.id, n: k });
      }
    }
    if (!did) return fail(room, pid, cmd, 'nothing to build or move');
  } else if (cmd.type === 'research') {
    if (ps.round.researched) return fail(room, pid, cmd, 'Research is once per round');
    if (!canPay(res, C.research)) return fail(room, pid, cmd, 'not enough resources');
    if (cmd.choice === 'mission') {
      if (!g.missionDeck.length) return fail(room, pid, cmd, 'no Missions left');
      pay(res, C.research); ps.missions.push(g.missionDeck.shift());
      log(g, `${who} researched a new Mission.`);
    } else if (UPGRADES[cmd.choice] && (g.leftoverUpgrades || []).includes(cmd.choice) && !hasUp(g, pid, cmd.choice)) {
      pay(res, C.research); applyUpgrade(room, pid, cmd.choice);
    } else return fail(room, pid, cmd, 'that research is unavailable');
    ps.round.researched = true;
    fx(g, { k: 'research', pid });
  }
}

function resolveStrike(room, pid, cmd) {
  const g = room.game, ps = P(g, pid);
  const from = g.hexes[cmd.from], to = g.hexes[cmd.to];
  if (!strikeOk(g, room, pid, from, to)) return fail(room, pid, cmd, 'the target can no longer be reached');
  const did = to.owner, dps = P(g, did);
  if (dps.round.immunity) return fail(room, pid, cmd, `${nameOf(room, did)} has Diplomatic Immunity`);
  const atkF = from.fleets, defF = to.fleets;
  let atkB = 0, defB = 0;
  if (ps.round.overdrive && !ps.round.overdriveUsed) { atkB += 2; ps.round.overdriveUsed = true; }
  if (to.type === 'asteroid') defB += 1;
  if (to.build === 'spire' || to.build === 'mega') defB += 1;
  if (hasUp(g, did, 'shieldgrid')) defB += 1;
  if (dps.round.shields === to.id) defB += 2;
  let ad = 1 + rnd(6), dd = 1 + rnd(6);
  let A = atkF + atkB + ad, D = defF + defB + dd;
  let reroll = null;
  if (A <= D && perk(g, room, pid, 'pyrrhus')) { ad = 1 + rnd(6); A = atkF + atkB + ad; reroll = 'atk'; }
  else if (A > D && perk(g, room, did, 'pyrrhus')) { dd = 1 + rnd(6); D = defF + defB + dd; reroll = 'def'; }
  const win = A > D;
  const an = nameOf(room, pid), dn = nameOf(room, did);
  if (win) {
    const atkLeft = Math.max(0, atkF - 1);
    const defLoss = Math.ceil(defF / 2), defLeft = defF - defLoss;
    from.fleets = 0;
    if (defLeft > 0) {
      const retreat = nbrs(g, to).filter(n => n.owner === did).sort((a, b) => b.fleets - a.fleets)[0];
      if (retreat) retreat.fleets += defLeft;
    }
    to.owner = pid; to.fleets = atkLeft;
    if (to.build === 'spire' || to.build === 'mega') to.build = 'outpost';
    if (!to.build) to.build = 'outpost';
    log(g, `${an} captured ${hexLabel(to)} from ${dn}! (${A} vs ${D})`);
    mood(g, pid, 'smug'); mood(g, did, 'furious');
  } else {
    const atkLoss = Math.ceil(atkF / 2);
    from.fleets = atkF - atkLoss;
    to.fleets = Math.max(0, defF - 1);
    log(g, `${dn} held ${hexLabel(to)} against ${an}. (${A} vs ${D})`);
    mood(g, did, 'smug'); mood(g, pid, 'furious');
  }
  fx(g, { k: 'clash', pid, did, from: from.id, to: to.id, A, D, ad, dd, atkF, defF, atkB, defB, win, reroll });
}

function updateTrophies(room) {
  const g = room.game;
  const award = (key, valFn, min, label) => {
    const vals = room.players.map(p => ({ id: p.id, v: valFn(p.id) }));
    const top = Math.max(...vals.map(x => x.v));
    const holder = g.trophies[key];
    if (top < min) { if (holder) { g.trophies[key] = null; log(g, `${label} is unclaimed.`); } return; }
    const leaders = vals.filter(x => x.v === top).map(x => x.id);
    if (holder && leaders.includes(holder)) return;
    if (leaders.length === 1) {
      g.trophies[key] = leaders[0]; mood(g, leaders[0], 'smug');
      log(g, `${nameOf(room, leaders[0])} took ${label}!`);
      fx(g, { k: 'trophy', pid: leaders[0], key });
    } else if (holder) { g.trophies[key] = null; }
  };
  award('network', pid => networkSize(g, pid), 5, 'Longest Network');
  award('armada', pid => fleetsOf(g, pid), 5, 'Grand Armada');
}

function endGame(room) {
  const g = room.game;
  if (!live(room, g)) return;
  g.phase = 'over';
  const rows = room.players.map(p => {
    const inf = influence(g, p.id);
    const penalty = g.M.perks ? P(g, p.id).missions.filter(m => !m.done).length : 0;
    const ps = P(g, p.id);
    const station = owned(g, p.id).filter(h => h.type === 'station').reduce((total, h) => total + (h.build === 'mega' ? 4 : h.build === 'spire' ? 2 : 1), 0);
    const missions = ps.missions.filter(m => m.done).reduce((total, m) => total + m.inf + (hasUp(g, p.id, 'archive') ? 1 : 0), 0);
    const trophies = (g.trophies.network === p.id ? 2 : 0) + (g.trophies.armada === p.id ? 2 : 0);
    const kept = ps.kept.reduce((total, c) => total + (c.key === 'icebaron' && owned(g, p.id).filter(h => h.type === 'ice').length >= 3 ? 1 : 0) + (c.key === 'crystalbaron' && owned(g, p.id).filter(h => h.type === 'crystal').length >= 3 ? 1 : 0), 0);
    const breakdown = { stations: station, missions, trophies, bonuses: ps.bonusInf, barons: kept, penalty };
    return { pid: p.id, inf, penalty, final: inf - penalty, credits: ps.res.credits, segs: laneSegs(g, p.id), breakdown };
  });
  rows.sort((a, b) => b.final - a.final || b.credits - a.credits || b.segs - a.segs);
  const t = rows[0];
  const winners = rows.filter(r => r.final === t.final && r.credits === t.credits && r.segs === t.segs).map(r => r.pid);
  g.results = { rows, winners };
  for (const w of winners) mood(g, w, 'smug');
  log(g, winners.length > 1 ? 'A shared victory! The Cluster has joint Wardens.' : `${nameOf(room, winners[0])} is Warden of the Cluster!`);
  fx(g, { k: 'over' });
  sync(room);
}

// ───────────────────────── Offers ─────────────────────────
function expireOffers(room) {
  const g = room.game; if (!g) return;
  const now = Date.now(); let changed = false;
  for (const o of g.offers) if (!o.status && now > o.expires) { o.status = 'expired'; changed = true; }
  if (changed) { g.offers = g.offers.filter(o => !o.status || now - o.expires < 4000); sync(room); }
}
function cleanBundle(b) {
  const o = {};
  if (!b || typeof b !== 'object') return o;
  for (const k of RES) { const v = Math.max(0, Math.min(20, b[k] | 0)); if (v) o[k] = v; }
  return o;
}

// ───────────────────────── AI ─────────────────────────
// The house bots are *opponents*, not evidence that the human victory
// thresholds need changing. Prefer attainable objectives and predictable
// starting resources; never give an AI extra resources or rule exemptions.
function botMissionPriority(g, pid, m) {
  if (m.type === 'hold') return 7 + owned(g, pid).filter(h => h.type === m.world).length * 2;
  if (m.type === 'asteroid') return 6 + (owned(g, pid).some(h => h.type === 'asteroid') ? 3 : 0);
  if (m.type === 'spires') return 6 + owned(g, pid).filter(h => h.type === 'station').length * 2;
  if (m.type === 'lanes') return 6 + lanesOf(g, pid).length * 2;
  if (m.type === 'beacon') return 4;
  if (m.type === 'link') return 3 + (m.inf === 2 ? 2 : m.inf === 3 ? 1 : 0);
  return 0;
}
function botKeepMissions(g, pid, offer) {
  // Keeping exactly two satisfies the written rule and avoids gambling on a
  // third usually-impossible Mission in Advanced mode.
  const ranked = offer.slice().sort((a, b) => botMissionPriority(g, pid, b) - botMissionPriority(g, pid, a));
  return ranked.slice(0, 2);
}
function botSetupChoice(g, pid, choices) {
  const mine = owned(g, pid), resourceCounts = {};
  for (const h of mine) resourceCounts[h.type] = (resourceCounts[h.type] || 0) + 1;
  const rate = h => {
    const stationNear = nbrs(g, h).filter(x => x.type === 'station' && !x.owner).length;
    const newResource = resourceCounts[h.type] ? 0 : 5;
    const needsOreIce = h.type === 'rock' || h.type === 'ice' ? 5 : 0;
    const crystal = h.type === 'crystal' ? 2 : 0;
    return stationNear * 6 + newResource + needsOreIce + crystal;
  };
  return choices.slice().sort((a, b) => rate(g.hexes[b]) - rate(g.hexes[a]) || a.localeCompare(b))[0];
}
function botEraChoice(room, pid, offer) {
  const g = room.game, ps = P(g, pid), mine = owned(g, pid), nLanes = lanesOf(g, pid).length;
  const scores = { militia: 13, autominers: nLanes ? 8 : 10, cryo: 4,
    couriers: nLanes ? 17 : 4, lattice: mine.some(h => h.type === 'station') ? 12 : 7,
    shieldgrid: 6, megaspire: mine.some(h => h.build === 'spire') ? 16 : 8,
    archive: ps.missions.filter(m => m.done).length >= 2 ? 14 : 5, shielding: 6 };
  return offer.slice().sort((a,b) => (scores[b] || 0) - (scores[a] || 0) || a.localeCompare(b))[0];
}
function aiPlan(room, pid) {
  const g = room.game, ps = P(g, pid), L = legal(g, room, pid), C = costs(g, room, pid);
  const cmds = [];
  const spend = {};
  const avail = () => { const r = Object.assign({}, ps.res); for (const k in spend) r[k] -= spend[k]; return r; };
  // try to trade surplus into what a cost needs
  const tradeFor = c => {
    for (let n = 0; n < 4; n++) {
      const r = avail();
      const miss = Object.keys(c).find(k => r[k] < c[k]);
      if (!miss) return true;
      const rt = rates(g, room, pid);
      const give = RES.filter(k => k !== miss && r[k] - (c[k] || 0) >= rt[k]).sort((a, b) => r[b] - r[a])[0];
      if (!give || !doExchange(room, pid, give, miss)) return false;
    }
    return canPay(avail(), c);
  };
  const take = (cmd, c) => { if (cmds.length >= 2) return; if (!tradeFor(c)) return; for (const [k, v] of Object.entries(c)) spend[k] = (spend[k] || 0) + v; cmds.push(cmd); };
  const scarce = () => { const r = avail(); return RAW.slice().sort((a, b) => r[a] - r[b]); };
  // Objectives are pursued using *existing* legal actions and standard costs.
  const missions = ps.missions.filter(m => !m.done);
  const holdTarget = missions.filter(m => m.type === 'hold').map(m => ({
    world: m.world, have: owned(g, pid).filter(h => h.type === m.world).length
  })).sort((a,b) => b.have - a.have)[0];
  const asteroidMission = missions.some(m => m.type === 'asteroid');
  const asteroidOwned = owned(g, pid).find(h => h.type === 'asteroid' && h.fleets < 3);
  // First secure a near-complete objective; this can be worth 2–3 Influence.
  if (holdTarget && holdTarget.have >= 1) {
    const goal = L.found.find(id => g.hexes[id].type === holdTarget.world);
    if (goal) take({ type: 'found', target: goal }, C.found);
  }
  if (asteroidMission && cmds.length < 2 && asteroidOwned) {
    const count = Math.min(3-asteroidOwned.fleets, 3, Math.floor(avail().credits / C.fleetEach));
    if (count > 0) take({ type: 'fleet', n: count, place: asteroidOwned.id }, { credits: count * C.fleetEach });
  }
  if (asteroidMission && cmds.length < 2 && !asteroidOwned) {
    const goal = L.found.find(id => g.hexes[id].type === 'asteroid');
    if (goal) take({ type: 'found', target: goal }, C.found);
  }
  // Claim stations (the most direct Influence source) and upgrade when possible.
  if (L.spire.length && cmds.length < 2) take({ type: 'spire', target: L.spire[0] }, C.spire);
  const stations = L.found.filter(id => g.hexes[id].type === 'station');
  if (stations.length && cmds.length < 2) {
    const target = stations.slice().sort((a,b) =>
      g.lanes.filter(l => l.a === b || l.b === b).length - g.lanes.filter(l => l.a === a || l.b === a).length)[0];
    take({ type: 'found', target }, C.found);
  }
  // Buying a short hyperlane builds future income and can satisfy Lane Missions.
  if (cmds.length < 2 && L.lane.length) {
    const id = L.lane.slice().sort((a,b) => (C.lanes[a].ore+C.lanes[a].plasma)-(C.lanes[b].ore+C.lanes[b].plasma))[0];
    take({ type: 'lane', lane: id }, C.lanes[id]);
  }
  // Build toward a 5-Fleet Grand Armada trophy if no stronger purchase fits.
  if (cmds.length < 2 && L.fleetPlace.length && fleetsOf(g, pid) < 5) {
    const n = Math.min(3, 5-fleetsOf(g,pid), Math.floor(avail().credits/C.fleetEach));
    if (n > 0) {
      const place = L.fleetPlace.slice().sort((a,b) => Number(g.hexes[b].type === 'station')-Number(g.hexes[a].type === 'station'))[0];
      take({ type: 'fleet', n, place }, { credits: n*C.fleetEach });
    }
  }
  // Gather a missing resource and pursue held mission types when no scoring
  // objective is available right now.
  if (cmds.length < 2 && L.found.length) {
    const want = scarce();
    const goal = L.found.filter(id => !cmds.some(c => c.target === id)).sort((a,b) => {
      const ha=g.hexes[a], hb=g.hexes[b];
      const ma=holdTarget && ha.type === holdTarget.world ? -5 : 0;
      const mb=holdTarget && hb.type === holdTarget.world ? -5 : 0;
      const ra=want.indexOf(PROD[ha.type]), rb=want.indexOf(PROD[hb.type]);
      return (ma+(ra<0?9:ra))-(mb+(rb<0?9:rb));
    })[0];
    if (goal) take({ type: 'found', target:goal }, C.found);
  }
  if (cmds.length < 2) {
    const s = L.strike.filter(([a,b]) => g.hexes[a].fleets >= g.hexes[b].fleets+2)
      .sort((x,y) => Number(g.hexes[y[1]].type==='station')-Number(g.hexes[x[1]].type==='station'));
    if (s.length) take({ type:'strike',from:s[0][0],to:s[0][1]}, {});
  }
  if (cmds.length < 2 && L.research.length) {
    const ups = L.research.filter(k=>k!=='mission');
    const ch = ups.length ? botEraChoice(room,pid,ups) : (L.research.includes('mission')?'mission':null);
    if (ch) take({type:'research',choice:ch},C.research);
  }
  // rank: prefer resources/Credits early, Barons if close
  const pref = ['cache', 'supply', 'prospector', 'warp', 'overdrive', 'survey', 'icebaron', 'crystalbaron', 'shields', 'immunity', 'stormrider'];
  ps.plan = { cmds: [cmds[0] || null, cmds[1] || null], rank: g.pool.slice().sort((a, b) => pref.indexOf(a.key) - pref.indexOf(b.key)).map(c => c.uid), play: [] };
  for (const c of ps.held) {
    if (c.key === 'overdrive' && cmds.some(x => x.type === 'strike')) ps.plan.play.push({ uid: c.uid });
    else if (c.key === 'warp' && cmds.some(x => x.type === 'lane')) ps.plan.play.push({ uid: c.uid });
    else if (c.key === 'shields' || c.key === 'immunity') {
      const mine = owned(g, pid);
      const hot = mine.filter(h => nbrs(g, h).some(x => x.owner && x.owner !== pid && x.fleets > h.fleets));
      if (hot.length) ps.plan.play.push({ uid: c.uid, target: hot.sort((a, b) => (b.type === 'station') - (a.type === 'station'))[0].id });
    }
  }
  ps.engaged = true;
}
function doExchange(room, pid, give, get) {
  const g = room.game, ps = P(g, pid);
  if (!RES.includes(give) || !RES.includes(get) || give === get) return false;
  const r = rates(g, room, pid)[give];
  if (ps.res[give] < r) return false;
  const vexDiscount = perk(g, room, pid, 'vex') && !ps.vexUsed && r === 2 && g.event !== 'boom' && !(give === 'ice' && hasUp(g, pid, 'cryo'));
  ps.res[give] -= r; ps.res[get] += 1;
  if (vexDiscount) ps.vexUsed = true;
  return true;
}

// ───────────────────────── State views ─────────────────────────
function pubState(room) {
  const g = room.game;
  const now = Date.now();
  const players = room.players.map(p => {
    const base = { id: p.id, name: p.name, avatar: p.avatar, isAI: p.isAI, bot: !!p.bot, connected: p.isAI || !!p.ws };
    if (!g) return base;
    const ps = P(g, p.id);
    const md = g.moods[p.id];
    return Object.assign(base, {
      inf: influence(g, p.id), engaged: ps.engaged, fleets: fleetsOf(g, p.id), sectors: owned(g, p.id).length,
      lanes: lanesOf(g, p.id).length, segs: networkSize(g, p.id), held: ps.held.length, kept: ps.kept.map(c => c.key),
      upgrades: ps.upgrades, missionsDone: ps.missions.filter(m => m.done).map(m => ({ text: m.text, inf: m.inf })),
      missionsOpen: ps.missions.filter(m => !m.done).length, keepDone: ps.keepDone,
      eraPicked: !!g.eraPicks[p.id], mood: md && md.until > now ? md.m : 'neutral'
    });
  });
  const out = { room: room.code, phase: room.phase, mode: room.mode, hostId: room.hostId, players, now };
  if (!g) return out;
  const storm = [], ghost = [], twin = [];
  const gb = Object.assign({}, g.storm, { pos: g.storm.pos + 1 });
  for (const h of Object.values(g.hexes)) {
    if (bandHas(g.storm, h)) storm.push(h.id);
    if (bandHas(g.twin, h)) twin.push(h.id);
    if (!stormOff(g, g.storm) && bandHas(gb, h)) ghost.push(h.id);
  }
  out.game = {
    R: g.R, hexes: Object.values(g.hexes).map(h => ({ id: h.id, q: h.q, r: h.r, type: h.type, name: h.name, owner: h.owner, build: h.build, fleets: h.fleets })),
    lanes: g.lanes, storm, ghost, twin, stormDir: g.storm.label, round: g.round, maxRounds: g.M.rounds, era: g.era,
    target: g.M.target, order: g.order, phase: g.phase, phaseEnds: g.phaseEnds, pool: g.pool, event: g.event,
    trophies: g.trophies, log: g.log.slice(-8), fx: g.fx, setupTurn: g.setupTurn, eraOffer: g.eraOffer,
    results: g.results, income: g.incomeShow, mode: g.mode, deckLeft: g.draftDeck.length, eraTurn: g.eraTurn
  };
  return out;
}
function privState(room, p) {
  const g = room.game;
  const out = { pid: p.id, isHost: room.hostId === p.id };
  if (!g) return out;
  const ps = P(g, p.id);
  const mine = owned(g, p.id);
  Object.assign(out, {
    res: ps.res, missions: ps.missions.map(m => Object.assign({}, m, { met: !m.done && missionMet(g, p.id, m) })),
    missionOffer: ps.missionOffer, keepDone: ps.keepDone, held: ps.held, kept: ps.kept, upgrades: ps.upgrades, plan: ps.plan, engaged: ps.engaged,
    surveyOffer: ps.surveyOffer, eraPick: g.eraPicks[p.id] || null, rates: rates(g, room, p.id), offersSent: ps.offersSent,
    stormNext: mine.filter(h => h.id && pubGhostHas(g, h)).map(h => h.id),
    offersIn: g.offers.filter(o => o.to === p.id && !o.status), offersOut: g.offers.filter(o => o.from === p.id),
    legal: (g.phase === 'plan' || g.phase === 'setup' || g.phase === 'income') ? legal(g, room, p.id) : null,
    costs: costs(g, room, p.id), setupLegal: g.setupTurn === p.id ? setupLegal(g, p.id) : null,
    perks: g.M.perks
  });
  return out;
}
function pubGhostHas(g, h) { if (stormOff(g, g.storm)) return false; return bandHas(Object.assign({}, g.storm, { pos: g.storm.pos + 1 }), h); }

function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function sync(room) {
  room.touched = Date.now();
  // host repair
  const host = room.players.find(p => p.id === room.hostId);
  if (!host || (!host.ws && !host.bot)) {
    const h = room.players.find(p => !p.bot && p.ws);
    if (h) room.hostId = h.id; else if (!host) room.hostId = null;
  }
  const pub = pubState(room);
  for (const ws of room.tvs) send(ws, { t: 'state', pub });
  for (const p of room.players) if (p.ws) send(p.ws, { t: 'state', pub, priv: privState(room, p) });
}

// ───────────────────────── Message handling ─────────────────────────
const CONSTS = { AVATARS, DRAFT, UPGRADES, EVENTS, ERA_NAMES, MODES, RES };
function onMessage(ws, msg) {
  const t = msg && msg.t;
  if (t === 'ping') return send(ws, { t: 'pong' });
  if (t === 'tvCreate' || t === 'tvJoin') {
    let room = t === 'tvJoin' && rooms.get(String(msg.room || '').toUpperCase());
    if (!room) room = makeRoom();
    room.tvs.add(ws); ws.room = room; ws.role = 'tv';
    send(ws, { t: 'welcome', role: 'tv', room: room.code, tvToken: room.tvToken, consts: CONSTS });
    return sync(room);
  }
  if (t === 'join') {
    const room = rooms.get(String(msg.room || '').toUpperCase().trim());
    if (!room) return send(ws, { t: 'error', text: 'No game with that code. Check the code on the TV.' });
    let p = msg.playerId && room.players.find(x => x.id === msg.playerId && x.token === msg.token);
    if (!p) {
      if (room.phase !== 'lobby') return send(ws, { t: 'error', text: 'That game has already started.' });
      if (room.players.length >= 8) return send(ws, { t: 'error', text: 'That game is full (8 players).' });
      const taken = new Set(room.players.map(x => x.avatar));
      const av = [0, 1, 2, 3, 4, 5, 6, 7].find(i => !taken.has(i));
      const name = String(msg.name || '').trim().slice(0, 14) || AVATARS[av].short;
      p = { id: 'p' + token().slice(0, 8), token: token(), name, avatar: av, isAI: false, bot: false, ws: null };
      room.players.push(p);
      if (!room.hostId || !room.players.find(x => x.id === room.hostId)) room.hostId = p.id;
    }
    if (p.ws && p.ws !== ws) { const old = p.ws; send(old, { t: 'replaced' }); old.room = null; setTimeout(() => { try { old.close(); } catch (e) { } }, 200); }
    p.ws = ws; if (!p.bot) p.isAI = false;
    ws.room = room; ws.role = 'phone'; ws.pid = p.id;
    send(ws, { t: 'welcome', role: 'phone', room: room.code, playerId: p.id, token: p.token, consts: CONSTS });
    return sync(room);
  }
  const room = ws.room; if (!room) return;
  if (ws.role !== 'phone') return;
  const p = room.players.find(x => x.id === ws.pid); if (!p) return;
  const isHost = room.hostId === p.id;
  const g = room.game;

  // ── Lobby ──
  if (t === 'avatar' && room.phase === 'lobby') {
    const i = msg.id | 0;
    if (i >= 0 && i < 8 && !room.players.some(x => x.avatar === i && x !== p)) {
      if (p.name === AVATARS[p.avatar].short) p.name = AVATARS[i].short;
      p.avatar = i;
    }
    return sync(room);
  }
  if (t === 'name' && room.phase === 'lobby') { const n = String(msg.name || '').trim().slice(0, 14); if (n) p.name = n; return sync(room); }
  if (t === 'mode' && isHost && room.phase === 'lobby' && MODES[msg.mode]) { room.mode = msg.mode; return sync(room); }
  if (t === 'addBot' && isHost && room.phase === 'lobby' && room.players.length < 8) {
    const taken = new Set(room.players.map(x => x.avatar));
    const av = [0, 1, 2, 3, 4, 5, 6, 7].find(i => !taken.has(i));
    room.players.push({ id: 'b' + token().slice(0, 8), token: token(), name: AVATARS[av].short + ' (bot)', avatar: av, isAI: true, bot: true, ws: null });
    return sync(room);
  }
  if (t === 'kick' && isHost && room.phase === 'lobby') {
    const k = room.players.find(x => x.id === msg.pid);
    if (k && k !== p) { room.players = room.players.filter(x => x !== k); if (k.ws) { send(k.ws, { t: 'kicked' }); k.ws.room = null; } }
    return sync(room);
  }
  if (t === 'start' && isHost && room.phase === 'lobby' && room.players.length >= 2) { startGame(room); return sync(room); }
  if (t === 'toAI' && isHost && g) {
    const k = room.players.find(x => x.id === msg.pid);
    if (k && k !== p) { k.isAI = !k.isAI; if (k.isAI && g.phase === 'plan' && !P(g, k.id).engaged) aiPlan(room, k.id); }
    return sync(room);
  }
  if (t === 'endGame' && isHost && g) { if (g.phase === 'over') { g.alive = false; room.game = null; room.phase = 'lobby'; } else { endGame(room); } return sync(room); }
  if (t === 'toLobby' && isHost && g && g.phase === 'over') { g.alive = false; room.game = null; room.phase = 'lobby'; return sync(room); }
  if (!g) return;
  const ps = P(g, p.id); if (!ps) return;

  // ── Game ──
  if (t === 'keepMissions' && g.phase === 'missions') {
    if (msg.discard && ps.missionOffer.length === 3) {
      const m = ps.missionOffer.find(x => x.uid === msg.discard);
      if (m) { ps.missionOffer = ps.missionOffer.filter(x => x !== m); g.missionDeck.push(m); }
    }
    ps.keepDone = true; return sync(room);
  }
  if (t === 'place' && g.phase === 'setup' && g.setupTurn === p.id) {
    if (setupLegal(g, p.id).includes(msg.hex)) g.setupChoice = msg.hex;
    return;
  }
  if (t === 'eraPick' && g.phase === 'era' && g.eraTurn === p.id && !g.eraPicks[p.id] && g.eraOffer.includes(msg.id)) { g.eraPicks[p.id] = msg.id; return sync(room); }
  if (t === 'survey' && g.phase === 'plan') { chooseSurvey(g, p.id, msg.uid); return sync(room); }
  if (t === 'plan' && g.phase === 'plan') {
    const cmds = Array.isArray(msg.cmds) ? msg.cmds.slice(0, 2) : [];
    const clean = c => {
      if (!c || !CMD_TYPES.has(c.type)) return null;
      const o = { type: c.type };
      for (const k of ['target', 'lane', 'place', 'from', 'to', 'choice']) if (typeof c[k] === 'string') o[k] = c[k].slice(0, 40);
      if (c.type === 'fleet') { o.n = Math.max(0, Math.min(3, c.n | 0)); if (c.move && typeof c.move.from === 'string' && typeof c.move.to === 'string') o.move = { from: c.move.from, to: c.move.to, n: Math.max(1, c.move.n | 0) }; }
      return o;
    };
    ps.plan.cmds = [clean(cmds[0]), clean(cmds[1])];
    if (Array.isArray(msg.rank)) {
      const available = new Set(g.pool.map(c => c.uid));
      ps.plan.rank = [...new Set(msg.rank.filter(u => typeof u === 'string' && available.has(u)))].slice(0, 9);
    }
    if (msg.supply !== undefined) ps.plan.supply = RAW.includes(msg.supply) ? msg.supply : null;
    if (Array.isArray(msg.play)) ps.plan.play = msg.play.filter(x => x && ps.held.some(c => c.uid === x.uid)).map(x => ({ uid: x.uid, target: typeof x.target === 'string' ? x.target : null }));
    if (msg.engage !== undefined) ps.engaged = !!msg.engage;
    return sync(room);
  }
  if (t === 'exchange' && g.phase === 'plan') { doExchange(room, p.id, msg.give, msg.get); return sync(room); }
  if (t === 'offer' && g.phase === 'plan') {
    const to = room.players.find(x => x.id === msg.to);
    const give = cleanBundle(msg.give), get = cleanBundle(msg.get);
    const left = g.phaseEnds - Date.now();
    if (!to || to === p || ps.offersSent >= 2 || left < ms(20000) || !Object.keys(give).length || !Object.keys(get).length) return send(ws, { t: 'toast', text: 'That offer can’t be sent right now.' });
    if (!canPay(ps.res, give)) return send(ws, { t: 'toast', text: 'You don’t have what you’re offering.' });
    ps.offersSent++;
    const o = { id: 'o' + (++g.offerSeq), from: p.id, to: to.id, give, get, expires: Date.now() + ms(20000), status: null };
    g.offers.push(o);
    if (to.isAI) {
      setTimeout(() => {
        if (o.status || room.game !== g || g.phase !== 'plan' || Date.now() >= o.expires) return;
        const tps = P(g, to.id);
        const gv = Object.values(give).reduce((a, b) => a + b, 0), gt = Object.values(get).reduce((a, b) => a + b, 0);
        resolveOffer(room, o, canPay(tps.res, get) && gv >= gt && Math.random() < 0.7);
      }, ms(2500));
    }
    return sync(room);
  }
  if (t === 'offerReply' && g.phase === 'plan') {
    const o = g.offers.find(x => x.id === msg.id && x.to === p.id && !x.status);
    if (o) resolveOffer(room, o, !!msg.accept);
    return sync(room);
  }
}
function resolveOffer(room, o, accept) {
  const g = room.game; if (!g || o.status) return;
  if (g.phase !== 'plan' || Date.now() >= o.expires) { o.status = 'expired'; sync(room); return; }
  const a = P(g, o.from), b = P(g, o.to);
  if (accept && canPay(a.res, o.give) && canPay(b.res, o.get)) {
    pay(a.res, o.give); gain(b.res, o.give); pay(b.res, o.get); gain(a.res, o.get);
    o.status = 'accepted';
    log(g, `${nameOf(room, o.from)} and ${nameOf(room, o.to)} made a trade.`);
  } else o.status = accept ? 'failed' : 'declined';
  sync(room);
}

// ───────────────────────── HTTP + WS ─────────────────────────
function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  return out;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch (_) { res.writeHead(400); return res.end('Invalid URL'); }
  if (url === '/') { res.writeHead(302, { Location: '/tv.html' }); return res.end(); }
  if (url === '/info') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ips: lanIPs(), port: PORT })); }
  if (url === '/health') { res.writeHead(200); return res.end('ok'); }
  const file = path.resolve(PUBLIC, '.' + url);
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
// Keep inbound packets bounded so one rogue controller cannot consume unbounded memory.
const wss = new WebSocketServer({ server, maxPayload: 32 * 1024 });
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    try { onMessage(ws, msg); } catch (e) { console.error('message error', e); }
  });
  ws.on('error', err => { console.warn('WebSocket connection error:', err.message); });
  ws.on('close', () => {
    const room = ws.room; if (!room) return;
    if (ws.role === 'tv') room.tvs.delete(ws);
    if (ws.role === 'phone') { const p = room.players.find(x => x.id === ws.pid); if (p && p.ws === ws) p.ws = null; }
    sync(room);
  });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch (e) { } } }, 25000);
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyone = room.tvs.size || room.players.some(p => p.ws);
    if (!anyone && now - room.touched > 3 * 3600 * 1000) { if (room.game) room.game.alive = false; rooms.delete(code); }
  }
}, 10 * 60 * 1000);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Starfall Lanes running on port ${PORT}`);
    for (const ip of lanIPs()) console.log(`  TV:     http://${ip}:${PORT}/tv.html`);
  });
}
module.exports = { server, rooms, genMap, MAPS, _internal: {
  startGame, makeRoom, onMessage, pubState, privState, sync, P, costs, legal, influence, owned, inStorm, moveStorm,
  incomePhase, planPhase, revealPhase, eraPhase, eraPickOrder, receiveCard, resolveCmd, resolveStrike,
  resolveOffer, updateTrophies, networkSize, missionMet, genMissions, endGame, emptyPlan,
  aiPlan, botEraChoice, botSetupChoice, botMissionPriority, botKeepMissions,
  applyUpgrade, cleanBundle, canPay, spawnStorm, bandHas, setOrder, doExchange
} };
