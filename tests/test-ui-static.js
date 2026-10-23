'use strict';
// Phase 3 static checks; deliberately uses only Node core modules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = require('node:path').join(__dirname,'..');
const read = (area, name) => fs.readFileSync(path.join(root, area, name), 'utf8');
const checks = [];
function check(label, fn) { fn(); checks.push(label); }
for (const type of ['tv','phone']) {
  const src = read('src', `${type}.html`);
  const generated = read('public', `${type}.html`);
  check(`${type}: source and public have Phase 3 interface`, () => {
    assert.match(src, /Phase 3/); assert.match(generated, /Phase 3/);
    assert.match(src, /art\/brand\/starfall-logo\.png/);
    assert.match(generated, /art\/brand\/starfall-logo\.png/);
    assert.ok(!generated.includes('/*COMMONJS*/') && !generated.includes('/*MAPJS*/') && !generated.includes('/*CSS*/'));
  });
}
check('TV: nine-card adaptive pool and visible map key', () => {
  const tv = read('src', 'tv.html');
  assert.match(tv, /class="pool-grid"/); assert.match(tv, /g\.pool\.entries\(\)/);
  assert.match(tv, /id="mapLegend"/); assert.match(tv, /TURN ORDER/);
  assert.doesNotMatch(tv, /content:'1st'/);
});
check('Phone: visible order count and Engage state', () => {
  const phone = read('src', 'phone.html');
  assert.match(phone, /phase-status/); assert.match(phone, /ui\.plan\.cmds\.filter\(Boolean\)\.length/);
  assert.match(phone, /Orders are optional/);
  assert.match(phone, /role="status"/);
});
check('Brand and portrait assets exist', () => {
  const p = path.join(root, 'public', 'art');
  const logo = fs.readFileSync(path.join(p, 'brand', 'starfall-logo.png'));
  assert.equal(logo.toString('hex',0,8),'89504e470d0a1a0a');
  for (const id of ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']) {
    const image = fs.readFileSync(path.join(p,'avatars', `${id}_frontier_neutral.webp`));
    assert.equal(image.toString('hex',0,4),'52494646');
  }
});
check('Server remains authoritative and all modes remain present', () => {
  const server = read('.', 'server.js');
  for (const x of ['WebSocketServer','genMap','quick:', 'standard:', 'advanced:']) assert.ok(server.includes(x),x);
});
console.log(`UI static checks passed (${checks.length}):\n- ${checks.join('\n- ')}`);
