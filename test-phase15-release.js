'use strict';
/* Starfall Lanes Phase 15 — portable, non-destructive release preflight.
   node test-phase15-release.js [--require-premium]
   `--require-premium` is appropriate for the GitHub deployment branch, not
   for working copies which intentionally retain procedural fallback cues.
*/
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = __dirname;
const file = name => path.join(root, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const presence = name => assert.ok(fs.statSync(file(name)).isFile(), `Missing ${name}`);
const ids = ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
const eras = ['frontier','expansion','ascension'];
const moods = ['neutral','smug','furious'];
const names = ['ambient-orbit','solar-storm','hyperlane-open','spire-build','fleet-move','fleet-clash','era-transition','victory','credits'];
// Byte lengths returned by the 2026 Mirelo SFX 2.0 asset generations.
// These are an identification aid, not cryptographic attestation or an audio-quality evaluation.
const premiumSizes = { 'ambient-orbit':625581, 'solar-storm':145197,
  'hyperlane-open':109485, 'spire-build':121581, 'fleet-move':78381,
  'fleet-clash':133677, 'era-transition':133677, 'victory':135981,
  'credits':44397 };
let count = 0;
for (const id of ids) for (const era of eras) for (const mood of moods) {
  const p = `public/art/avatars/${id}_${era}_${mood}.png`;
  presence(p);
  const b = fs.readFileSync(file(p));
  assert.ok(b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')), `Invalid PNG: ${p}`);
  assert.equal(b.readUInt32BE(16), 512, `${p} is not 512px wide`);
  assert.equal(b.readUInt32BE(20), 512, `${p} is not 512px high`);
  count++;
}
assert.equal(count, 72);
for (const p of ['public/art/brand/starfall-logo.png','public/tv.html','public/phone.html',
  'public/sound-lab.html','public/how-to-play.html','public/lore.html',
  'src/tv.html','src/phone.html','server.js','package.json']) presence(p);
for (const p of ['public/tv.html','public/phone.html']) {
  const h = read(p);
  for (const dest of ['/how-to-play.html','/lore.html'])
    assert.ok(h.includes(dest), `${p}: missing obvious ${dest} navigation`);
  assert.ok(h.includes('starfall-logo'), `${p}: missing branded logo`);
  assert.ok(h.includes('audio/'), `${p}: missing game sound wiring`);
}
assert.ok(read('public/tv.html').includes('musicToggle'), 'TV music controls missing');
assert.ok(read('public/tv.html').includes('duckMusic'), 'Sound priority mixing missing');
assert.ok(read('public/phone.html').includes('phoneSound'), 'Phone mute controls missing');
assert.ok(read('public/how-to-play.html').includes('How to Play'), 'How-to-play title missing');
const server = read('server.js');
assert.ok(server.includes("url === '/health'"), 'Render /health endpoint missing');
assert.ok(server.includes('maxPayload'), 'WebSocket payload limits missing');
assert.ok(server.includes('Cache-Control'), 'Static cache headers missing');
const audio = {};
for (const cue of [...names, 'command-bridge-theme']) {
  const p = `public/audio/${cue}.mp3`;
  presence(p);
  const b=fs.readFileSync(file(p));
  assert.ok(b.length > 4000, `Audio unexpectedly empty: ${cue}`);
  assert.ok(b.subarray(0,3).toString() === 'ID3' || (b[0]===255 && (b[1]&224)===224), `Invalid MP3 header: ${cue}`);
  audio[cue]=b.length;
}
const matched = names.filter(n => audio[n] === premiumSizes[n]);
const tier = matched.length === 9 ? 'Mirelo premium — all nine assets present' :
  matched.length === 0 ? 'procedural fallback' : `MIXED — ${matched.length} of nine Mirelo cues`;
if (process.argv.includes('--require-premium'))
  assert.equal(matched.length, 9, `GitHub deployment lacks complete premium audio: ${tier}`);
const receiptPath = file('public/audio/premium-audio-receipt.json');
if (fs.existsSync(receiptPath)) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.install_count,9,'Premium receipt has incorrect install count');
  for(const n of names) {
    assert.ok(receipt.tracks?.[n],`Premium receipt missing ${n}`);
    assert.equal(receipt.tracks[n].bytes, audio[n], `${n}: receipt/file length mismatch`);
  }
}
console.log(`Phase 15 preflight PASSED: ${count} portraits, 10 working audio headers, logo/help/lore, server health, TV/PC/phone controllers`);
console.log(`Audio tier: ${tier}${fs.existsSync(receiptPath) ? ' (receipt present)' : ' (receipt absent)'}`);
