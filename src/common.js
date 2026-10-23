const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RES_NAMES = { ore: 'Ore', ice: 'Ice', crystal: 'Crystal', plasma: 'Plasma', credits: 'Credits' };
const ricon = k => `<span class="ricon res-${k}" aria-hidden="true"></span>`;
const ERA_IDS = ['frontier', 'expansion', 'ascension'];
const artFailed = new Set();
function initials(name) {
  const w = name.split(/[\s-]+/).filter(x => !/^(Commander|Matriarch|Archon|Dr\.|Captain)$/.test(x));
  return w.map(x => x[0]).join('').slice(0, 2).toUpperCase();
}
// Prefer the specific mood in the current era, then that era's neutral portrait,
// then the original Frontier master. This keeps a character's era outfit even
// when bespoke celebrating/under-pressure artwork has not yet been made.
function avatarArtFallback(el, neutral, master) {
  const attempted = el.getAttribute('src');
  artFailed.add(attempted);
  const next = [neutral, master].find(file => file !== attempted && !artFailed.has(file));
  if (next) el.src = next;
  else el.remove();
}
function avatarHTML(av, o) {
  o = o || {};
  const s = o.size || 48, mood = o.mood || 'neutral', era = ERA_IDS[o.era || 0] || 'frontier';
  const master = `art/avatars/${av.id}_frontier_neutral.webp`;
  const neutral = `art/avatars/${av.id}_${era}_neutral.webp`;
  const wanted = `art/avatars/${av.id}_${era}_${mood}.webp`;
  const src = [wanted, neutral, master].find(file => !artFailed.has(file));
  const img = src ? `<img src="${src}" alt="" loading="eager" onerror="avatarArtFallback(this, '${neutral}', '${master}')">` : '';
  const state = mood === 'furious' ? 'under pressure' : mood === 'smug' ? 'celebrating' : 'ready';
  const eraChip = s >= 68 ? `<span class="av-era" aria-hidden="true">${era === 'expansion' ? 'II' : era === 'ascension' ? 'III' : 'I'}</span>` : '';
  const moodChip = mood === 'furious' ? '<span class="av-state" aria-hidden="true">!</span>' : mood === 'smug' ? '<span class="av-state" aria-hidden="true">★</span>' : '';
  return `<div class="av era-${era} mood-${mood}${o.off ? ' off' : ''}" style="--c:${av.color};--s:${s}px;width:${s}px;height:${s}px" role="img" aria-label="${esc(av.name)}, ${era} era, ${state}"><span class="av-ini">${initials(av.name)}</span>${img}${eraChip}${moodChip}<span class="av-badge" aria-hidden="true">${av.badge}</span></div>`;
}
function costHTML(c) {
  const parts = Object.entries(c || {}).filter(([, v]) => v > 0).map(([k, v]) => `<span class="cost res-${k}">${v}${ricon(k)}</span>`);
  return parts.length ? parts.join('') : '<span class="cost">Free</span>';
}
function clockFrom(pub) {
  const off = pub.now - Date.now();
  return () => Date.now() + off;
}
function fmtTime(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
