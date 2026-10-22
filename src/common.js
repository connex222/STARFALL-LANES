const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RES_NAMES = { ore: 'Ore', ice: 'Ice', crystal: 'Crystal', plasma: 'Plasma', credits: 'Credits' };
const ricon = k => `<span class="ricon res-${k}" aria-hidden="true"></span>`;
const ERA_IDS = ['frontier', 'expansion', 'ascension'];
const artFailed = new Set();
function initials(name) {
  const w = name.split(/[\s-]+/).filter(x => !/^(Commander|Matriarch|Archon|Dr\.|Captain)$/.test(x));
  return w.map(x => x[0]).join('').slice(0, 2).toUpperCase();
}
function avatarHTML(av, o) {
  o = o || {};
  const s = o.size || 48, mood = o.mood || 'neutral', era = ERA_IDS[o.era || 0];
  const src = `art/avatars/${av.id}_${era}_${mood}.png`;
  const img = artFailed.has(src) ? '' : `<img src="${src}" alt="" onerror="artFailed.add(this.getAttribute('src'));this.remove()">`;
  return `<div class="av mood-${mood}${o.off ? ' off' : ''}" style="--c:${av.color};--s:${s}px;width:${s}px;height:${s}px" role="img" aria-label="${esc(av.name)}"><span class="av-ini">${initials(av.name)}</span>${img}<span class="av-badge">${av.badge}</span></div>`;
}
function costHTML(c) {
  const parts = Object.entries(c || {}).filter(([, v]) => v > 0).map(([k, v]) => `<span class="cost res-${k}">${v}${ricon(k)}</span>`);
  return parts.length ? parts.join('') : '<span class="cost">Free</span>';
}
function Conn(onMsg, onOpen, onStatus) {
  let ws, ping, stopped = false;
  function open() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => { onStatus && onStatus(true); onOpen(send); clearInterval(ping); ping = setInterval(() => send({ t: 'ping' }), 20000); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
    ws.onclose = () => { clearInterval(ping); if (stopped) return; onStatus && onStatus(false); setTimeout(open, 1500); };
  }
  function stop() { stopped = true; try { ws.close(); } catch (e) { } }
  function restart() { if (!stopped) return; stopped = false; open(); }
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  open();
  return { send, stop, restart };
}
function clockFrom(pub) {
  const off = pub.now - Date.now();
  return () => Date.now() + off;
}
function fmtTime(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
