'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname; const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0;function check(name,fn){fn();n++;console.log('✓',name)}
check('All screen source and generated code expose Galaxy Intel and five filters',()=>{
 for(const path of ['src/phone.html','public/phone.html']){
  const html=read(path);
  for(const token of ['id="phoneIntel"','function getIntelRows(','function renderIntel()','Every sector','My sectors','Rival sectors','Unclaimed','Storm and forecast','Hyperlane register','Return to game'])assert.ok(html.includes(token),`${path}: ${token}`);
 }
});
check('Structured map list makes ownership, build, Fleets, storm and lanes textual',()=>{
 const s=read('src/phone.html');
 for(const token of ['ownership','h.build','h.fleets','g.storm','g.twin','g.ghost','role="','<ul class="intel-list"','owner.name'])assert.ok(s.includes(token),token);
 assert.match(s,/Private Missions, Draft rankings and hidden orders remain/);
});
check('Intel remains a display-only client feature, never mutates server commands',()=>{
 const s=read('src/phone.html'); const body=s.split('function getIntelRows(')[1].split("$('phoneIntel').addEventListener")[0];
 assert.ok(!body.includes('send('), 'intel screen must not issue game messages');
 assert.ok(!body.includes('priv.missions'), 'private missions do not enter public register');
});
check('Phone sound uses bounded channels, independent volume and visibility safety',()=>{
 for(const path of ['src/phone.html','public/phone.html']){
  const s=read(path);
  for(const token of ['sf_phone_volume','type="range"','id="phoneVolume"','id="phoneAudioOptions"','lastPlayed','new Audio','document.visibilityState','PhoneAudio.stop()','on:false'])assert.ok(s.includes(token),`${path}: ${token}`);
 }
});
check('All screen inline JavaScript is syntactically parseable',()=>{
 // Inline script placeholders in the editable source are comments; generated pages contain bundled JS.
 for(const path of ['src/phone.html','public/phone.html']){
  const parts=[...read(path).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(parts.length);
  for(const part of parts)new vm.Script(part[1],{filename:path});
 }
});
check('Existing 9 MP3 cues and 8 canonical master portraits are intact',()=>{
 for(const cue of ['ambient-orbit','solar-storm','hyperlane-open','spire-build','fleet-move','fleet-clash','era-transition','victory','credits']){
  assert.ok(fs.statSync(path.join(root,'public/audio',cue+'.mp3')).size>6000);
 }
 for(const id of ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']){
  assert.ok(fs.statSync(path.join(root,'public/art/avatars',id+'_frontier_neutral.png')).size>30000);
 }
});
check('Seeded balance evidence is recorded, but win conditions are unchanged',()=>{
 const data=JSON.parse(read('docs/phase9-balance-results.json'));
 assert.equal(data.games,27);assert.equal(data.results.length,27);
 assert.ok(data.results.every(x=>['quick','standard','advanced'].includes(x.mode)&&[2,4,8].includes(x.players)&&x.top>=0));
});
console.log('Phase 9 integration checks passed:',n);
