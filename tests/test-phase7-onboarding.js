'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = require('node:path').join(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const tests = [];
function check(label,fn){fn(); tests.push(label); console.log('✓ '+label);}
check('TV and phone share prominent How to Play and Lore links',()=>{
  for(const f of ['src/tv.html','public/tv.html','src/phone.html','public/phone.html']){
    const t=read(f); assert.match(t,/how-to-play\.html/); assert.match(t,/lore\.html/);
  }
  assert.match(read('src/tv.html'),/id="bridgeLinks"/);
  assert.match(read('src/phone.html'),/id="infoNav"/);
});
check('Both learning pages are bundled and independently accessible',()=>{
  const h=read('public/how-to-play.html'),l=read('public/lore.html');
  assert.match(h,/Your first game, in one minute/);
  assert.match(h,/Your six commands/);
  assert.match(h,/Solar Storm &amp; income|Solar Storm & income/);
  assert.match(h,/How do Draft cards work/);
  assert.match(h,/How Influence works/);
  assert.match(l,/When a star died, empires awakened/);
  assert.match(l,/new, original fictional background/);
  for(const name of ['Kaia Rho','Zib-Zob','Matriarch Oolu','Vex Halloran','Archon Pyrrhus','Nim Okafor','Skrill','Captain Bramble']) assert.ok(l.includes(name),name);
  assert.ok(fs.existsSync(path.join(root,'public/info.css')));
});
check('Phone has independent opt-in sound and reuse of bundled MP3 files',()=>{
  for(const f of ['src/phone.html','public/phone.html']){
    const t=read(f); assert.match(t,/PhoneAudio/); assert.match(t,/aria-pressed="false"/); assert.match(t,/new Audio\('audio\/'/);
    assert.match(t,/this\.on:false|on:false/); assert.match(t,/id="phoneSound"/);
  }
  for(const name of ['credits','solar-storm','era-transition','victory','fleet-clash']) assert.ok(fs.statSync(path.join(root,`public/audio/${name}.mp3`)).size>2000);
});
check('TV keeps original opt-in sound and mute with level adjustment',()=>{
  const t=read('public/tv.html'); assert.match(t,/id="soundRack"/); assert.match(t,/id="volume"/); assert.match(t,/Snd\.toggle\(\)/); assert.match(t,/audio\/.*\.mp3/);
});
check('Responsive mobile artwork and screen-specific guides',()=>{
  assert.ok(fs.statSync(path.join(root,'public/art/brand/starfall-logo-mobile.png')).size<fs.statSync(path.join(root,'public/art/brand/starfall-logo.png')).size);
  for(const f of ['src/tv.html','public/tv.html','src/phone.html','public/phone.html']) {
    const t=read(f); assert.match(t,/starfall-logo-mobile\.png/); assert.match(t,/prefers-reduced-motion:reduce/);
  }
  assert.doesNotMatch(read('src/phone.html'),/maximum-scale=1/);
  assert.match(read('public/info.css'),/@media\(max-width:600px\)/);
});
check('Server-authoritative game untouched, static resources accessible',()=>{
  const t=read('server.js'); assert.match(t,/new WebSocketServer/);assert.match(t,/\.css/);assert.match(t,/\.mp3/);
  for(const page of ['tv.html','phone.html','how-to-play.html','lore.html','sound-lab.html']) assert.ok(fs.existsSync(path.join(root,'public',page)));
});
console.log(`Phase 7 onboarding checks passed: ${tests.length}`);
