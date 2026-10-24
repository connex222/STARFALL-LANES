'use strict';
// Phase 4 integration guardrails without external test dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = require('node:path').join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/phone.html'), 'utf8');
const compiled = fs.readFileSync(path.join(root, 'public/phone.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const tests = [];
function test(name, body) { body(); tests.push(name); }
const phases = [
  ['Draft ranking', ['moveDraftRank', 'bindDraftDrag', 'pointerdown', 'pointercancel', 'data-up', 'data-dn']],
  ['Legal sector selection', ['pickSectorIds', 'selectSector', 'renderPickAssist', 'data-pick-sector', 'aria-pressed']],
  ['Trading', ['trade-bundle-grid', 'tradeBundleText', 'canOffer', 'data-s', 'offer-status']],
  ['Missions', ['missionProgress', 'progressbar', 'mission-summary', 'Scores at Reveal']],
  ['Responsive styling', ['@media(max-width:355px)', 'touch-action:none', 'focus-visible']]
];
for (const [feature, probes] of phases) {
  test(`${feature}: editable and generated builds`, () => {
    for (const token of probes) { assert.ok(source.includes(token), `${feature}: missing source ${token}`); assert.ok(compiled.includes(token), `${feature}: missing generated ${token}`); }
  });
}
test('Self-contained public phone build', () => {
  assert.doesNotMatch(compiled, /\/\*(CSS|COMMONJS|MAPJS)\*\//);
  assert.ok(compiled.includes('function MapView('), 'inline map renderer');
  assert.ok(compiled.includes('function Conn('), 'inline WebSocket adapter');
  assert.ok(compiled.includes('art/brand/starfall-logo.png'), 'logo');
  const scripts = [...compiled.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, 'inline code');
  for (const [, code] of scripts) new vm.Script(code, { filename: 'public/phone.html' });
});
test('Server protocol unchanged', () => {
  for (const word of ["t === 'plan'", "t === 'exchange'", "t === 'offer'", "t === 'offerReply'", "t === 'survey'", 'missionMet(', 'function legal(']) assert.ok(server.includes(word), word);
  assert.doesNotMatch(source, /fetch\s*\(\s*['"]https?:/);
});
console.log(`Phase 4 static tests passed: ${tests.length}\n${tests.map(x => '  ✓ ' + x).join('\n')}`);
