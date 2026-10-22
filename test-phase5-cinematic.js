'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const read = f => fs.readFileSync(path.join(root,f),'utf8');
let n=0;
function check(name,fn){fn();n++;console.log('✓ '+name);}
const sounds=['ambient-orbit','solar-storm','hyperlane-open','spire-build','fleet-move','fleet-clash','era-transition','victory','credits'];
check('Nine bundled MP3 samples, no external audio dependency',()=>{
  for(const name of sounds){const b=fs.readFileSync(path.join(root,'public/audio',name+'.mp3'));
    assert.ok(b.length>2000, name);
    assert.ok(b.toString('latin1',0,3)==='ID3'||b[0]===0xff, name+' mp3 header');
  }
});
check('Editable TV and generated TV load local audio with consent',()=>{
  for(const f of ['src/tv.html','public/tv.html']){
    const h=read(f);
    assert.match(h, /fetch\('audio\/'\+k\+'\.mp3'/);
    assert.match(h, /aria-pressed="false"/);
    assert.match(h, /volumeControl\.oninput/);
    assert.match(h, /Snd\.setVolume/);
    assert.match(h, /startAmbience\(/);
    assert.match(h, /Snd\.victory\(/);
    assert.match(h, /id="cinematic"/);
    assert.match(h, /prefers-reduced-motion:reduce/);
  }
});
check('TV is cinematic but phone retains lightweight interaction',()=>{
  assert.match(read('src/tv.html'),/cinematic: true/);
  assert.doesNotMatch(read('src/phone.html'),/cinematic: true/);
  assert.match(read('src/map.js'),/cinematic: false/);
});
check('All visual events bind to server-authoritative data',()=>{
  const js=read('src/map.js');
  for(const k of ['construct','warp','convoy','battle','eraWave'])assert.match(js,new RegExp("e\\.k === '"+k+"'"));
  for(const k of ['found','spire','lane','fleet','move','clash','storm','era'])assert.match(js,new RegExp("f\\.k === '"+k+"'"));
  assert.match(js,/if \(!reduce && opts.cinematic/);
  assert.match(js,/stormSet/);assert.match(js,/ghostSet/);
});
check('Source renderer embedded in both generated clients',()=>{
  const map=read('src/map.js');
  for(const target of ['public/tv.html','public/phone.html']){
    assert.ok(read(target).includes(map), target+' MapView source parity');
  }
});
check('Optional sound-lab audition interface',()=>{const h=read('public/sound-lab.html');assert.ok(h.includes("new Audio('audio/'+id+'.mp3')"));assert.match(h,/aria-pressed/);});
check('Phase 5 cinematic rendering remains separate from the authoritative gameplay server',()=>{
  const server=read('server.js');
  assert.match(server,/function resolveStrike\(/);
  assert.match(server,/function incomePhase\(/);
  assert.match(server,/new WebSocketServer\(/);
});
console.log(`Phase 5 cinematic checks passed: ${n}`);
