'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=require('node:path').join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const c=[];
function check(title, fn){fn();c.push(title);console.log('✓',title)}
check('Portraits preserve names and house identity while using era and status cues',()=>{
  for(const f of ['src/common.js','public/tv.html','public/phone.html']){
    const s=read(f);assert.match(s,/av era-\$\{era\}/);assert.match(s,/aria-label="\$\{esc\(av.name\)\}, \$\{era\} era/);assert.match(s,/av-state/);
    assert.match(s,/frontier_neutral.webp/);assert.match(s,/avatarArtFallback/);
  }
});
check('All eight existing neutral master portraits remain intact',()=>{
  for(const id of ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble']){
    const p=path.join(root,'public/art/avatars',id+'_frontier_neutral.webp');
    assert.ok(fs.statSync(p).size>5000,p);
  }
});
check('Modal keyboard trap, Escape/close and focus restoration are in the live phone code',()=>{
  for(const f of ['src/phone.html','public/phone.html']){
    const s=read(f);
    assert.match(s,/function synchroniseDialogFocus\(/);
    assert.match(s,/aria-modal="true" aria-labelledby="modalTitle"/);
    assert.match(s,/dialogReturnFocus/);assert.match(s,/e\.key!=='Tab'/);assert.match(s,/e\.key==='Escape'/);
    assert.match(s,/\$\('wrap'\)\.inert=true/);
    assert.match(s,/setAttribute\('aria-hidden', String\(!opened\)\)/);
    assert.match(s,/id="modalTitle"/);
  }
});
check('Draft priority is keyboard operable and politely announced',()=>{
  for(const f of ['src/phone.html','public/phone.html']){
    const s=read(f);assert.match(s,/role="list" aria-label="Draft preference order"/);
    assert.match(s,/aria-label="Raise/);assert.match(s,/aria-label="Lower/);assert.match(s,/priority \$\{to \+ 1\}/);
    assert.match(s,/role="status" aria-live="polite" aria-atomic="true"/);
  }
});
check('TV PC and phone retain their built-in help, sound and motion controls',()=>{
  for(const f of ['src/tv.html','src/phone.html','public/tv.html','public/phone.html']){
    const s=read(f);assert.match(s,/how-to-play.html/);assert.match(s,/lore.html/);assert.match(s,/prefers-reduced-motion:reduce/);
  }
  assert.match(read('src/tv.html'),/id="volume"/);assert.match(read('src/phone.html'),/id="phoneSound"/);
  assert.match(read('src/phone.html'),/role="img" aria-label="Visual galaxy map/);
});
check('Planning navigation exposes selection and unread alert labels',()=>{
  for (const f of ['src/phone.html','public/phone.html']) {
    const s=read(f);
    assert.match(s,/data-tab=\"\$\{k\}\" aria-pressed/);
    assert.match(s,/alerts/);
    assert.match(s,/document\.querySelector\(\`\[data-tab=/);
    assert.match(s,/Continue choosing or confirm your order/);
  }
});
check('Rules and lore pages have skip navigation and visible focus',()=>{
  assert.match(read('public/how-to-play.html'),/class="skip" href="#quickstart"/);
  assert.match(read('public/lore.html'),/class="skip" href="#history"/);
  assert.match(read('public/info.css'),/\.skip:focus-visible/);
});
console.log(`Phase 8 source integration checks passed: ${c.length}`);
