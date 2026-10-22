'use strict';
// Reproducible diagnostic cohort: report observed end scores, never silently rebalance.
const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const load=require('./tests/load-server');
const engine=load(0x9ABCD123), I=engine._internal;
after(()=>engine.cleanup());
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(mode,n){
  const room=I.makeRoom();room.mode=mode;
  room.players=Array.from({length:n},(_,i)=>({id:`b${i}`,name:`Bot ${i}`,token:`t${i}`,avatar:i%8,isAI:true,bot:true,ws:null}));
  I.startGame(room);
  const deadline=Date.now()+35000;
  while(room.game.phase!=='over'&&Date.now()<deadline)await pause(20);
  assert.equal(room.game.phase,'over',`${mode} ${n}-player simulation exceeded deadline`);
  assert.ok(room.game.results?.rows.length===n);
  const top=Math.max(...room.game.results.rows.map(r=>r.final));
  for(const row of room.game.results.rows){
    assert.ok(Number.isInteger(row.final), 'Final influence must be integer');
    assert.ok(Number.isInteger(row.credits)&&row.credits>=0,'Credits cannot be negative');
    for(const value of Object.values(room.game.ps[row.pid].res))assert.ok(Number.isInteger(value)&&value>=0,'Resources cannot be negative');
    const b=row.breakdown;assert.ok(b,'End-game scoreboard must explain Influence');
    assert.equal(b.stations+b.missions+b.trophies+b.bonuses+b.barons,row.inf,'Score component sum');
    assert.equal(row.inf-b.penalty,row.final,'Final Influence after penalties');
  }
  const threshold=mode==='quick'?10:15;
  room.game.alive=false;engine.rooms.delete(room.code);
  return {mode,players:n,round:room.game.round,top,target:threshold,met:top>=threshold};
}
test('Phase 10: 27 seeded bot games document effect of smarter AI without changing rules',async()=>{
  const data=[];
  for(let repeat=0;repeat<3;repeat++)for(const mode of ['quick','standard','advanced'])for(const n of [2,4,8])data.push(await run(mode,n));
  for(const mode of ['quick','standard','advanced']){
    const matches=data.filter(x=>x.mode===mode);
    const hit=matches.filter(x=>x.met).length;
    const mean=(matches.reduce((a,x)=>a+x.top,0)/matches.length).toFixed(2);
    console.log(`BALANCE ${mode}: ${hit}/${matches.length} reached Influence target; mean winning Influence ${mean}`);
  }
  const counts={games:data.length,results:data};
  require('node:fs').writeFileSync('docs/phase10-balance-results.json',JSON.stringify(counts,null,2));
  assert.equal(data.length,27);
},{timeout:140000});
