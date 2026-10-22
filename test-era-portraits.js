const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const ids = ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
const root = __dirname;
for(const id of ids){
 for(const era of ['frontier','expansion','ascension']) {
  const f = path.join(root,'public/art/avatars', `${id}_${era}_neutral.png`);
  assert(fs.existsSync(f),`Missing ${f}`);
  const p=fs.readFileSync(f);
  assert.equal(p.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`Not PNG: ${f}`);
  assert.equal(p.readUInt32BE(16),512,`Bad width: ${f}`);
  assert.equal(p.readUInt32BE(20),512,`Bad height: ${f}`);
 }
}
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'src/common.js'),'utf8')+'; globalThis.API={avatarHTML,avatarArtFallback,artFailed};',ctx);
const av={id:'kaia',name:'Commander Kaia Rho',color:'#D63A3A',badge:'▲'};
assert(ctx.API.avatarHTML(av,{era:1,mood:'neutral'}).includes('kaia_expansion_neutral.png'));
assert(ctx.API.avatarHTML(av,{era:2,mood:'neutral'}).includes('kaia_ascension_neutral.png'));
assert(ctx.API.avatarHTML(av,{era:0,mood:'neutral'}).includes('kaia_frontier_neutral.png'));
assert(ctx.API.avatarHTML(av,{era:2,mood:'furious'}).includes('kaia_ascension_furious.png'));
const el={_src:'art/avatars/kaia_ascension_furious.png',getAttribute(){return this._src},set src(x){this._src=x},remove(){this.removed=true}};
ctx.API.avatarArtFallback(el,'art/avatars/kaia_ascension_neutral.png','art/avatars/kaia_frontier_neutral.png');
assert.equal(el._src,'art/avatars/kaia_ascension_neutral.png','Missing expression should fall back to era neutral');
assert.equal(el.removed,undefined);
const publicTV=fs.readFileSync(path.join(root,'public/tv.html'),'utf8');
const publicPhone=fs.readFileSync(path.join(root,'public/phone.html'),'utf8');
for (const [name,content] of [['TV',publicTV],['Phone',publicPhone]]) {
 assert(content.includes('const neutral = `art/avatars/${av.id}_${era}_neutral.png`;'), `${name} public output stale`);
 assert(content.includes('function avatarArtFallback(el, neutral, master)'), `${name} missing fallback`);
}
console.log('Portrait checks passed: 24 valid neutral assets, era switching, same-era mood fallback and both generated screens.');
