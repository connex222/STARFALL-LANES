const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const ids = ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
const root = require('node:path').join(__dirname,'..');
for(const id of ids){
 for(const era of ['frontier','expansion','ascension']) {
  for (const mood of ['neutral','smug','furious']) {
  const f = path.join(root,'public/art/avatars', `${id}_${era}_${mood}.webp`);
  assert(fs.existsSync(f),`Missing ${f}`);
  const p=fs.readFileSync(f);
  assert.equal(p.toString('ascii',0,4),'RIFF',`Not PNG: ${f}`);
  assert.equal(p.readUInt16LE(26),256,`Bad width: ${f}`);
  assert.equal(p.readUInt16LE(28),256,`Bad height: ${f}`);
  }
 }
}
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'src/common.js'),'utf8')+'; globalThis.API={avatarHTML,avatarArtFallback,artFailed};',ctx);
const av={id:'kaia',name:'Commander Kaia Rho',color:'#D63A3A',badge:'▲'};
assert(ctx.API.avatarHTML(av,{era:1,mood:'neutral'}).includes('kaia_expansion_neutral.webp'));
assert(ctx.API.avatarHTML(av,{era:2,mood:'neutral'}).includes('kaia_ascension_neutral.webp'));
assert(ctx.API.avatarHTML(av,{era:0,mood:'neutral'}).includes('kaia_frontier_neutral.webp'));
assert(ctx.API.avatarHTML(av,{era:2,mood:'furious'}).includes('kaia_ascension_furious.webp'));
for(const era of [0,1,2]) {
 const eraId=['frontier','expansion','ascension'][era];
 assert(ctx.API.avatarHTML(av,{era,mood:'smug'}).includes(`kaia_${eraId}_smug.webp`), 'Smug portrait missing in era '+era);
}

const el={_src:'art/avatars/kaia_ascension_furious.webp',getAttribute(){return this._src},set src(x){this._src=x},remove(){this.removed=true}};
ctx.API.avatarArtFallback(el,'art/avatars/kaia_ascension_neutral.webp','art/avatars/kaia_frontier_neutral.webp');
assert.equal(el._src,'art/avatars/kaia_ascension_neutral.webp','Missing expression should fall back to era neutral');
assert.equal(el.removed,undefined);
assert(ctx.API.avatarHTML(av,{era:1,mood:'furious'}).includes('kaia_expansion_furious.webp'));
const publicTV=fs.readFileSync(path.join(root,'public/tv.html'),'utf8');
const publicPhone=fs.readFileSync(path.join(root,'public/phone.html'),'utf8');
for (const [name,content] of [['TV',publicTV],['Phone',publicPhone]]) {
 assert(content.includes('const neutral = `art/avatars/${av.id}_${era}_neutral.webp`;'), `${name} public output stale`);
 assert(content.includes('function avatarArtFallback(el, neutral, master)'), `${name} missing fallback`);
}
console.log('Portrait checks passed: 72 valid Neutral/Smug/Furious assets, era switching, same-era mood fallback and both generated screens.');
