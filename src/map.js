// Starfall Lanes — shared star-map renderer (TV + phone)
function MapView(canvas, opts) {
  opts = Object.assign({ stars: true, theme: 'dark', labels: true, quality: 1, cinematic: false, padTop: 0, padBottom: 0 }, opts || {});
  const ctx = canvas.getContext('2d');
  const S3 = Math.sqrt(3);
  let st = null, AV = [], hexById = {}, lanes = [], size = 20, ox = 0, oy = 0, W = 0, H = 0, dpr = 1;
  let marks = { legal: new Set(), sel: new Set(), laneLegal: new Set(), laneSel: null, arrow: null };
  let effects = [];
  let stormSet = new Set(), ghostSet = new Set(), twinSet = new Set();
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // star layers (generated once)
  const stars = [];
  for (let i = 0; i < 260; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() < .25 ? 2 : 1, r: Math.random() * 1.3 + .3, tw: Math.random() * 6 });
  const nebulae = [];
  for (let i = 0; i < 4; i++) nebulae.push({ x: Math.random(), y: Math.random(), r: .35 + Math.random() * .35, c: ['#2a1d6b', '#0d4a6b', '#5b1d5e', '#1d3f6b'][i] });

  const TYPE = {
    rock: { a: '#c98a6e', b: '#8a4b3c', c: '#3d1f1a' },
    ice: { a: '#f0ffff', b: '#8fd0ee', c: '#2f6f99' },
    crystal: { a: '#f0d8ff', b: '#9a5be0', c: '#35196b' },
    gas: { a: '#ffd59a', b: '#e8862a', c: '#6e2c0c' },
    station: { a: '#ffffff', b: '#aab6d3', c: '#3a4560' },
    asteroid: { a: '#cfc8bb', b: '#8f8a80', c: '#3c3a35' }
  };
  const theme = () => opts.theme === 'light'
    ? { bg: '#E9EEF7', plate: 'rgba(14,20,36,0.06)', plateLine: 'rgba(14,20,36,0.28)', label: '#0E1424', labelBg: 'rgba(255,255,255,0.85)', lane: 'rgba(14,20,36,0.45)', voidFill: 'rgba(14,20,36,0.12)', outline: '#0E1424' }
    : { bg: '#070A16', plate: 'rgba(160,190,255,0.05)', plateLine: 'rgba(120,160,255,0.22)', label: '#EAF1FF', labelBg: 'rgba(7,10,22,0.7)', lane: 'rgba(200,220,255,0.45)', voidFill: 'rgba(0,0,0,0.35)', outline: '#FFFFFF' };

  function colorOf(pid) {
    if (!st) return '#888';
    const p = st.players.find(x => x.id === pid);
    return p && AV[p.avatar] ? AV[p.avatar].color : '#888';
  }
  function badgeOf(pid) {
    const p = st && st.players.find(x => x.id === pid);
    return p && AV[p.avatar] ? AV[p.avatar].badge : '';
  }
  function setState(pub, avatars) {
    st = pub; AV = avatars || AV;
    const g = pub && pub.game; if (!g) return;
    hexById = {}; for (const h of g.hexes) hexById[h.id] = h;
    lanes = g.lanes;
    stormSet = new Set(g.storm); ghostSet = new Set(g.ghost); twinSet = new Set(g.twin);
    layout();
  }
  function setMarks(m) { marks = Object.assign({ legal: new Set(), sel: new Set(), laneLegal: new Set(), laneSel: null, arrow: null }, m || {}); }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1) * opts.quality;
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    layout();
  }
  function layout() {
    if (!st || !st.game) return;
    const R = st.game.R;
    const h = Math.max(50, H - opts.padTop - opts.padBottom);
    size = Math.min(W / (S3 * (2 * R + 1) + .4), h / (3 * R + 2 + .4));
    ox = W / 2; oy = opts.padTop + h / 2;
  }
  const cen = h => [ox + size * S3 * (h.q + h.r / 2), oy + size * 1.5 * h.r];
  function hexPath(x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)); }
    ctx.closePath();
  }
  function hit(px, py) {
    if (!st || !st.game) return null;
    const x = px - ox, y = py - oy;
    const q = (S3 / 3 * x - y / 3) / size, r = (2 / 3 * y) / size;
    let cx = q, cz = r, cy = -q - r;
    let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    const h = hexById[rx + ',' + rz];
    return h ? h.id : null;
  }
  function hitLane(px, py) {
    let best = null, bd = size * 0.45;
    for (const l of lanes) {
      const [ax, ay] = cen(hexById[l.a]), [bx, by] = cen(hexById[l.b]);
      const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
      const d = Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
      if (d < bd) { bd = d; best = l.id; }
    }
    return best;
  }
  function addFx(f) {
    if (!f || !st || !st.game) return;
    const now = performance.now();
    const E = (k, dur, extra) => effects.push(Object.assign({ k, t0: now, dur }, extra));
    // Cinematic effects are view-only; they never change ownership or rules.
    if (f.k === 'found') { E('beam', 1400, { hex: f.hex, color: colorOf(f.pid) }); if (opts.cinematic) E('construct', 1600, { hex: f.hex, color: colorOf(f.pid) }); }
    if (f.k === 'spire') { E('beam', 1400, { hex: f.hex, color: colorOf(f.pid) }); E('ring', 1600, { hex: f.hex, color: colorOf(f.pid) }); if (opts.cinematic) E('construct', 2200, { hex: f.hex, color: colorOf(f.pid), spire: true }); }
    if (f.k === 'lane') { E('sweep', 1300, { lane: f.lane, color: colorOf(f.pid) }); if (opts.cinematic) E('warp', 1450, { lane: f.lane, color: colorOf(f.pid) }); }
    if (f.k === 'fleet') E('pop', 1100, { hex: f.hex, color: colorOf(f.pid), text: '+' + f.n });
    if (f.k === 'move') { E('laser', 900, { from: f.from, to: f.to, color: colorOf(f.pid), soft: true }); if (opts.cinematic) E('convoy', 1150, { from: f.from, to: f.to, color: colorOf(f.pid) }); }
    if (f.k === 'clash') { E('laser', 1700, { from: f.from, to: f.to, color: colorOf(f.pid) }); E('ring', 1500, { hex: f.to, color: f.win ? colorOf(f.pid) : colorOf(f.did), delay: 700 }); if (opts.cinematic) E('battle', 2050, { from: f.from, to: f.to, color: colorOf(f.pid), shield: colorOf(f.did), win: f.win }); }
    if (f.k === 'card' && f.hex) E('ring', 1300, { hex: f.hex, color: '#33D6FF' });
    if (f.k === 'storm') E('storm', 1400, {});
    if (opts.cinematic && f.k === 'era') E('eraWave', 2300, { era: f.era });
    if (opts.cinematic && f.k === 'over') E('eraWave', 2800, { era: 3 });
    if (f.k === 'income') E('storm', 0, {});
    if (effects.length > 28) effects.splice(0, effects.length - 28);
  }

  function drawBackground(t) {
    const T = theme();
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
    if (opts.theme === 'light' || !opts.stars) return;
    for (const n of nebulae) {
      const g = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * Math.max(W, H));
      g.addColorStop(0, n.c + '88'); g.addColorStop(1, n.c + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const drift = reduce ? 0 : t * 0.000006;
    for (const s of stars) {
      const x = ((s.x + drift * s.z) % 1) * W, y = s.y * H;
      const a = 0.45 + 0.35 * Math.sin(t * 0.001 + s.tw);
      ctx.fillStyle = `rgba(220,235,255,${a * (s.z === 2 ? 1 : 0.6)})`;
      ctx.fillRect(x, y, s.r * s.z * 0.8, s.r * s.z * 0.8);
    }
  }
  function planet(h, x, y, t) {
    const T = TYPE[h.type]; if (!T) return;
    const r = size * 0.42;
    if (h.type === 'asteroid') {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + (reduce ? 0 : t * 0.0004);
        const rr = r * (0.35 + (i % 3) * 0.22);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7, s = size * (0.07 + (i % 2) * 0.05);
        const g = ctx.createRadialGradient(px - s * .3, py - s * .3, 0, px, py, s);
        g.addColorStop(0, T.a); g.addColorStop(1, T.c);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, s, 0, 7); ctx.fill();
      }
      return;
    }
    if (h.type === 'station') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : t * 0.0003);
      ctx.strokeStyle = '#f1c64b'; ctx.lineWidth = size * 0.07;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.42, 0, 0, 7); ctx.stroke();
      ctx.restore();
      const g = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r * .55);
      g.addColorStop(0, T.a); g.addColorStop(1, T.c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fill();
      return;
    }
    // sphere with glow
    if (opts.theme !== 'light') {
      const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.35);
      glow.addColorStop(0, T.b + '55'); glow.addColorStop(1, T.b + '00');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, T.a); g.addColorStop(0.45, T.b); g.addColorStop(1, T.c);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const spin = reduce ? 0 : (t * 0.00004 * size) % (r * 2);
    if (h.type === 'gas') {
      ctx.globalAlpha = 0.35; ctx.fillStyle = T.c;
      for (let i = -3; i <= 3; i++) ctx.fillRect(x - r, y + i * r * 0.28 + Math.sin(spin + i) * 1.5, r * 2, r * 0.09);
    } else if (h.type === 'rock') {
      ctx.globalAlpha = 0.45; ctx.fillStyle = T.c;
      for (let i = 0; i < 4; i++) { const cx = x - r + ((i * r * 0.7 + spin) % (r * 2.4)) - r * 0.2; ctx.beginPath(); ctx.arc(cx, y + (i % 2 ? -1 : 1) * r * 0.3, r * (0.12 + i * 0.03), 0, 7); ctx.fill(); }
    } else if (h.type === 'crystal') {
      ctx.globalAlpha = 0.75; ctx.fillStyle = T.a;
      for (let i = 0; i < 4; i++) { const cx = x - r + ((i * r * 0.65 + spin) % (r * 2.4)) - r * 0.2, cy = y + r * 0.35; ctx.beginPath(); ctx.moveTo(cx, cy - r * (0.5 + (i % 2) * 0.2)); ctx.lineTo(cx + r * 0.12, cy); ctx.lineTo(cx - r * 0.12, cy); ctx.fill(); }
    } else if (h.type === 'ice') {
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - r, y - r * 0.85, r * 2, r * 0.25); ctx.fillRect(x - r, y + r * 0.62, r * 2, r * 0.25);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function beacon(x, y, t) {
    const p = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.003);
    const r = size * (0.55 + p * 0.1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#9ff0ff'); g.addColorStop(1, 'rgba(51,214,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (reduce ? 0 : t * 0.0005); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * size * .15, y + Math.sin(a) * size * .15); ctx.lineTo(x + Math.cos(a) * size * .6, y + Math.sin(a) * size * .6); ctx.stroke(); }
  }
  function lane(l, t) {
    const T = theme();
    const A = hexById[l.a], B = hexById[l.b]; if (!A || !B) return;
    const [ax, ay] = cen(A), [bx, by] = cen(B);
    const legal = marks.laneLegal.has(l.id), sel = marks.laneSel === l.id;
    if (l.owner) {
      const c = colorOf(l.owner);
      ctx.save();
      ctx.strokeStyle = c; ctx.lineWidth = size * 0.16; ctx.globalAlpha = 0.25; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = size * 0.06;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      // couriers
      if (!reduce) for (let i = 0; i < 2; i++) {
        const f = ((t * 0.00025 + i * 0.5 + l.len * 0.13) % 1);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ax + (bx - ax) * f, ay + (by - ay) * f, size * 0.055, 0, 7); ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = sel ? '#33D6FF' : legal ? '#33D6FF' : T.lane;
      ctx.lineWidth = sel ? size * 0.12 : legal ? size * (0.06 + 0.03 * Math.sin(t * 0.008)) : Math.max(1.5, size * 0.035);
      ctx.setLineDash([size * 0.12, size * 0.14]);
      ctx.lineDashOffset = reduce ? 0 : -t * 0.01;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.restore();
    }
    // segment count pip
    if (opts.labels && size > 16) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      ctx.fillStyle = T.labelBg; ctx.beginPath(); ctx.arc(mx, my, size * 0.16, 0, 7); ctx.fill();
      ctx.fillStyle = l.owner ? colorOf(l.owner) : T.label;
      ctx.font = `700 ${Math.round(size * 0.2)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(l.len), mx, my + 0.5);
    }
  }
  function stripes(x, y, color, alpha, t) {
    ctx.save(); hexPath(x, y, size * 0.98); ctx.clip();
    ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.globalAlpha = Math.min(1, alpha + 0.25); ctx.strokeStyle = color; ctx.lineWidth = size * 0.1;
    const off = reduce ? 0 : (t * 0.02) % (size * 0.45);
    for (let k = -4; k <= 4; k++) { const d = k * size * 0.45 + off; ctx.beginPath(); ctx.moveTo(x - size + d, y + size); ctx.lineTo(x + size + d, y - size); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function building(h, x, y, t) {
    const c = colorOf(h.owner), T = theme();
    const r = size;
    if (h.build === 'spire' || h.build === 'mega') {
      const tall = h.build === 'mega' ? 1.25 : 0.95;
      const bx = x + r * 0.22, by = y + r * 0.3;
      ctx.save();
      ctx.fillStyle = c; ctx.strokeStyle = T.outline; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - r * 0.12, by); ctx.lineTo(bx - r * 0.04, by - r * tall); ctx.lineTo(bx + r * 0.04, by - r * tall); ctx.lineTo(bx + r * 0.12, by); ctx.closePath(); ctx.fill(); ctx.stroke();
      const rings = h.build === 'mega' ? 3 : 2;
      for (let i = 0; i < rings; i++) {
        const yy = by - r * tall * (0.35 + i * 0.22) + (reduce ? 0 : Math.sin(t * 0.003 + i) * 1.2);
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, yy, r * 0.2, r * 0.06, 0, 0, 7); ctx.stroke();
      }
      const p = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * 0.005);
      ctx.fillStyle = `rgba(255,255,255,${p})`; ctx.beginPath(); ctx.arc(bx, by - r * tall - r * 0.05, r * 0.06, 0, 7); ctx.fill();
      if (h.build === 'mega') { ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by - r * tall - r * 0.05, r * 0.16, 0, 7); ctx.stroke(); }
      ctx.restore();
    }
    // dome + badge (always present on owned sectors)
    const dx = x - r * 0.42, dy = y + r * 0.38, dr = r * 0.22;
    ctx.save();
    ctx.fillStyle = c; ctx.strokeStyle = T.outline; ctx.lineWidth = Math.max(1.5, r * 0.04);
    ctx.beginPath(); ctx.arc(dx, dy, dr, Math.PI, 0); ctx.lineTo(dx + dr, dy + dr * 0.25); ctx.lineTo(dx - dr, dy + dr * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0E1424'; ctx.lineWidth = 2;
    ctx.font = `800 ${Math.round(r * 0.24)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(badgeOf(h.owner), dx, dy - dr * 0.25); ctx.fillText(badgeOf(h.owner), dx, dy - dr * 0.25);
    ctx.restore();
    // fleets
    if (h.fleets > 0) {
      const fx = x + r * 0.05, fy = y - r * 0.62;
      ctx.save();
      ctx.fillStyle = c; ctx.strokeStyle = T.outline; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx - r * 0.32, fy); ctx.lineTo(fx - r * 0.12, fy - r * 0.13); ctx.lineTo(fx - r * 0.16, fy); ctx.lineTo(fx - r * 0.12, fy + r * 0.13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = T.labelBg; ctx.beginPath(); ctx.arc(fx + r * 0.05, fy, r * 0.17, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = T.label; ctx.font = `800 ${Math.round(r * 0.24)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(h.fleets), fx + r * 0.05, fy + 1);
      ctx.restore();
    }
  }
  function draw(t) {
    if (!W) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(t);
    if (!st || !st.game) return;
    const T = theme();
    const g = st.game;
    // plates
    for (const h of g.hexes) {
      const [x, y] = cen(h);
      hexPath(x, y, size * 0.96);
      ctx.fillStyle = h.type === 'void' ? T.voidFill : T.plate; ctx.fill();
      ctx.strokeStyle = h.owner ? colorOf(h.owner) : T.plateLine;
      ctx.lineWidth = h.owner ? Math.max(2, size * 0.07) : 1;
      if (h.owner && opts.theme !== 'light') { ctx.shadowColor = colorOf(h.owner); ctx.shadowBlur = size * 0.25; }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    for (const l of lanes) lane(l, t);
    for (const h of g.hexes) {
      const [x, y] = cen(h);
      if (h.type === 'beacon') beacon(x, y, t); else planet(h, x, y, t);
    }
    // Solar Storm curtain: subtle ambient glow + deterministic energy filaments.
    // The striped overlays are retained for players who cannot distinguish hues.
    if (opts.cinematic && opts.theme !== 'light' && !reduce) {
      for (const id of stormSet) {
        const h = hexById[id]; if (!h) continue;
        const [x,y] = cen(h);
        ctx.save(); hexPath(x,y,size * .95); ctx.clip();
        const w = (.72 + Math.sin(t*.002 + h.q*2.3 + h.r)*.16);
        const grad = ctx.createLinearGradient(x-size,y-size,x+size,y+size);
        grad.addColorStop(0,'rgba(244,72,43,0)'); grad.addColorStop(w*.63,'rgba(255,100,42,.18)'); grad.addColorStop(1,'rgba(255,200,91,.025)');
        ctx.fillStyle=grad;ctx.fillRect(x-size,y-size,size*2,size*2);
        ctx.strokeStyle='rgba(255,210,137,.43)';ctx.lineWidth=Math.max(.8,size*.019);
        for(let i=0;i<2;i++){
          const o=Math.sin(t*.0025+h.q*1.7+h.r*3+i*1.7)*size*.4;
          ctx.beginPath();ctx.moveTo(x-size,y+o-size*.3);
          ctx.lineTo(x-size*.28,y+o+size*.1);
          ctx.lineTo(x+size*.19,y+o-size*.15);
          ctx.lineTo(x+size,y+o+size*.32);ctx.stroke();
        }
        ctx.restore();
      }
    }
    // storm overlays
    const sCol = opts.theme === 'light' ? '#E8622A' : '#FF7A3D';
    for (const h of g.hexes) {
      const [x, y] = cen(h);
      if (stormSet.has(h.id) || twinSet.has(h.id)) stripes(x, y, sCol, opts.theme === 'light' ? 0.4 : 0.45, t);
      else if (ghostSet.has(h.id)) {
        ctx.save(); hexPath(x, y, size * 0.9); ctx.setLineDash([size * 0.12, size * 0.1]); ctx.strokeStyle = sCol; ctx.globalAlpha = 0.85; ctx.lineWidth = Math.max(1.5, size * 0.05); ctx.stroke(); ctx.restore();
      }
    }
    for (const h of g.hexes) if (h.owner) { const [x, y] = cen(h); building(h, x, y, t); }
    // labels
    if (opts.labels) for (const h of g.hexes) {
      if (!h.name || size < 14) continue;
      const [x, y] = cen(h);
      ctx.font = `600 ${Math.round(Math.max(10, size * 0.2))}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(h.name).width + 8, yy = y + size * 0.72;
      ctx.fillStyle = T.labelBg; ctx.fillRect(x - w / 2, yy - size * 0.14, w, size * 0.28);
      ctx.fillStyle = T.label; ctx.fillText(h.name, x, yy + 0.5);
    }
    // marks
    const pulse = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 0.008);
    for (const id of marks.legal) {
      const h = hexById[id]; if (!h) continue; const [x, y] = cen(h);
      hexPath(x, y, size * 0.9); ctx.strokeStyle = `rgba(51,214,255,${pulse})`; ctx.lineWidth = Math.max(2.5, size * 0.09); ctx.stroke();
    }
    for (const id of marks.sel) {
      const h = hexById[id]; if (!h) continue; const [x, y] = cen(h);
      hexPath(x, y, size * 0.92); ctx.strokeStyle = opts.theme === 'light' ? '#0E1424' : '#ffffff'; ctx.lineWidth = Math.max(3.5, size * 0.13); ctx.stroke();
    }
    if (marks.arrow) arrow(marks.arrow[0], marks.arrow[1], opts.theme === 'light' ? '#0E1424' : '#ffffff');
    // effects
    const now = performance.now();
    effects = effects.filter(e => now - e.t0 < e.dur + (e.delay || 0));
    for (const e of effects) {
      const p = Math.max(0, Math.min(1, (now - e.t0 - (e.delay || 0)) / e.dur)); if (now - e.t0 < (e.delay || 0)) continue;
      if (e.k === 'beam') { const h = hexById[e.hex]; if (!h) continue; const [x, y] = cen(h); const a = Math.sin(p * Math.PI); const gr = ctx.createLinearGradient(x, 0, x, y); gr.addColorStop(0, e.color + '00'); gr.addColorStop(1, e.color); ctx.globalAlpha = a * 0.85; ctx.fillStyle = gr; ctx.fillRect(x - size * 0.25, 0, size * 0.5, y); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - size * 0.06, 0, size * 0.12, y); ctx.globalAlpha = 1; }
      if (e.k === 'ring') { const h = hexById[e.hex]; if (!h) continue; const [x, y] = cen(h); ctx.globalAlpha = 1 - p; ctx.strokeStyle = e.color; ctx.lineWidth = size * 0.12; ctx.beginPath(); ctx.arc(x, y, size * (0.3 + p * 1.4), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      if (e.k === 'pop') { const h = hexById[e.hex]; if (!h) continue; const [x, y] = cen(h); ctx.globalAlpha = 1 - p; ctx.fillStyle = e.color; ctx.strokeStyle = '#0E1424'; ctx.lineWidth = 3; ctx.font = `800 ${Math.round(size * 0.5)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.strokeText(e.text, x, y - size * (0.6 + p * 0.6)); ctx.fillText(e.text, x, y - size * (0.6 + p * 0.6)); ctx.globalAlpha = 1; }
      if (e.k === 'sweep') { const l = lanes.find(x => x.id === e.lane); if (!l) continue; const [ax, ay] = cen(hexById[l.a]), [bx, by] = cen(hexById[l.b]); const px = ax + (bx - ax) * p, py = ay + (by - ay) * p; const gr = ctx.createRadialGradient(px, py, 0, px, py, size * 0.6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, e.color); gr.addColorStop(1, e.color + '00'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, size * 0.6, 0, 7); ctx.fill(); }
      if (e.k === 'laser') { const A = hexById[e.from], B = hexById[e.to]; if (!A || !B) continue; const [ax, ay] = cen(A), [bx, by] = cen(B); const on = e.soft ? true : Math.floor(p * 9) % 2 === 0; if (on) { ctx.strokeStyle = e.color; ctx.lineWidth = e.soft ? size * 0.08 : size * 0.12; ctx.globalAlpha = e.soft ? 1 - p : 0.95; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * Math.min(1, p * 2.2), ay + (by - ay) * Math.min(1, p * 2.2)); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.035; ctx.stroke(); ctx.globalAlpha = 1; } if (!e.soft && p > 0.45) { const fa = 1 - (p - 0.45) / 0.55; ctx.fillStyle = `rgba(255,255,255,${fa * 0.8})`; ctx.beginPath(); ctx.arc(bx, by, size * (0.4 + (1 - fa) * 0.5), 0, 7); ctx.fill(); } }
      if (e.k === 'storm') { const a = Math.sin(p * Math.PI) * 0.5; for (const id of stormSet) { const h = hexById[id]; if (!h) continue; const [x, y] = cen(h); hexPath(x, y, size); ctx.fillStyle = `rgba(255,200,120,${a})`; ctx.fill(); } }
      if (!reduce && opts.cinematic && e.k === 'construct') {
        const h=hexById[e.hex]; if (!h) continue; const [x,y]=cen(h), height=size*(e.spire?1.35:.75), progress=Math.min(1,p*1.25);
        ctx.save(); ctx.translate(x,y);ctx.globalAlpha=(1-p)*.8;
        ctx.lineWidth=Math.max(1,size*.04);ctx.strokeStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=size*.35;
        for(let k=-1;k<=1;k++){const xx=k*size*.22;ctx.beginPath();ctx.moveTo(xx,size*.28);ctx.lineTo(xx,size*.28-height*progress);ctx.stroke();}
        ctx.beginPath();ctx.ellipse(0,size*.25,size*(.25+.6*p),size*(.09+.2*p),0,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      if (!reduce && opts.cinematic && e.k === 'warp') {
        const l=lanes.find(k=>k.id===e.lane);if(!l||!hexById[l.a]||!hexById[l.b])continue;
        const [ax,ay]=cen(hexById[l.a]),[bx,by]=cen(hexById[l.b]);
        ctx.save();ctx.lineCap='round';ctx.shadowColor=e.color;ctx.shadowBlur=size*.6;
        for(let j=0;j<3;j++){
          const d=Math.max(0,Math.min(1,p*1.32-j*.075));
          ctx.globalAlpha=(1-p)*(.9-j*.22);ctx.strokeStyle=j===0?'#fff':e.color;ctx.lineWidth=Math.max(1,size*(.12-j*.032));
          ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+(bx-ax)*d,ay+(by-ay)*d);ctx.stroke();
        }ctx.restore();
      }
      if (!reduce && opts.cinematic && e.k === 'convoy') {
        const a=hexById[e.from],b=hexById[e.to];if(!a||!b)continue;
        const [ax,ay]=cen(a),[bx,by]=cen(b);ctx.save();
        ctx.translate(ax+(bx-ax)*p,ay+(by-ay)*p);ctx.rotate(Math.atan2(by-ay,bx-ax));
        ctx.fillStyle='#eafaff';ctx.shadowColor=e.color;ctx.shadowBlur=size*.65;ctx.globalAlpha=Math.sin(Math.PI*p);
        ctx.beginPath();ctx.moveTo(size*.35,0);ctx.lineTo(-size*.18,-size*.19);ctx.lineTo(-size*.1,0);ctx.lineTo(-size*.18,size*.19);ctx.closePath();ctx.fill();ctx.restore();
      }
      if (!reduce && opts.cinematic && e.k === 'battle') {
        const a=hexById[e.from],b=hexById[e.to];if(!a||!b)continue;
        const [ax,ay]=cen(a),[bx,by]=cen(b);ctx.save();
        const angle=Math.atan2(by-ay,bx-ax);
        for(let j=0;j<3;j++){
          const q=Math.max(0,Math.min(1,(p-j*.095)*2.6));if(q<=0||q>=1)continue;
          const ox=Math.cos(angle+Math.PI/2)*size*(j-1)*.17,oy=Math.sin(angle+Math.PI/2)*size*(j-1)*.17;
          const xx=ax+(bx-ax)*q+ox,yy=ay+(by-ay)*q+oy;
          ctx.strokeStyle='#ffffff';ctx.lineWidth=size*.06;ctx.shadowColor=e.color;ctx.shadowBlur=size*.6;
          ctx.beginPath();ctx.moveTo(xx-Math.cos(angle)*size*.34,yy-Math.sin(angle)*size*.34);ctx.lineTo(xx,yy);ctx.stroke();
        }
        if(p>.3){let k=Math.min(1,(p-.3)/.55);ctx.globalAlpha=(1-k)*.85;
          const halo=ctx.createRadialGradient(bx,by,0,bx,by,size*(.4+1.1*k));
          halo.addColorStop(0,'rgba(255,255,255,.75)');halo.addColorStop(.35,e.win?'rgba(255,214,115,.46)':'rgba(92,190,255,.38)');halo.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=halo;ctx.beginPath();ctx.arc(bx,by,size*(.4+1.1*k),0,7);ctx.fill();
          ctx.strokeStyle=e.shield;ctx.lineWidth=Math.max(2,size*.09);ctx.beginPath();ctx.arc(bx,by,size*(.35+k*.9),0,7);ctx.stroke();
        }ctx.restore();
      }
      if (!reduce && opts.cinematic && e.k === 'eraWave') {
        ctx.save();ctx.globalAlpha=(1-p)*.25;const c=['#5fdbff','#927eff','#f9c572','#ffe3ab'][Math.min(3,e.era||0)];
        const g2=ctx.createRadialGradient(ox,oy,size*p,ox,oy,Math.max(W,H)*(.25+p*.7));
        g2.addColorStop(0,c+'00');g2.addColorStop(.55,c+'66');g2.addColorStop(1,c+'00');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);ctx.restore();
      }

    }
  }
  function arrow(a, b, color) {
    const A = hexById[a], B = hexById[b]; if (!A || !B) return;
    const [ax, ay] = cen(A), [bx, by] = cen(B);
    const ang = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.fillStyle = color; ctx.strokeStyle = opts.theme === 'light' ? '#ffffff' : '#0E1424'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(size * 0.2, -size * 0.08); ctx.lineTo(L - size * 0.35, -size * 0.08); ctx.lineTo(L - size * 0.35, -size * 0.22); ctx.lineTo(L - size * 0.05, 0); ctx.lineTo(L - size * 0.35, size * 0.22); ctx.lineTo(L - size * 0.35, size * 0.08); ctx.lineTo(size * 0.2, size * 0.08); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  return { setState, setMarks, resize, draw, hit, hitLane, addFx, center: id => hexById[id] ? cen(hexById[id]) : null, setTheme: th => { opts.theme = th; } };
}
