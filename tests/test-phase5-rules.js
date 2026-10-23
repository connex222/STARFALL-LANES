'use strict';
const {test, after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=require('./load-server');
const app=load(0x51A11A);
const I=app._internal;
after(()=>app.cleanup());
function fixture(mode='standard') {
  const make=(id,type,owner=null,build=null,fleets=0)=>{const [q,r]=id.split(',').map(Number);return{id,q,r,type,owner,build,fleets,name:type==='station'?'Rhea Gate':null,stormPrev:false};};
  const room={code:'PHAS',mode,phase:'game',revealSpeed:'normal',tvs:new Set(),hostId:'a',touched:Date.now(),players:[
    {id:'a',name:'Alice',avatar:0,isAI:false,bot:false,ws:null},
    {id:'b',name:'Bob',avatar:1,isAI:false,bot:false,ws:null}]};
  const ps={};for(const p of room.players)ps[p.id]={res:{ore:20,ice:20,crystal:20,plasma:20,credits:20},missions:[],missionOffer:[],held:[],kept:[],upgrades:[],bonusInf:0,round:{},plan:I.emptyPlan(mode),engaged:false,keepDone:true,backupUsed:false,pendingMega:false,megaDone:false};
  room.game={alive:true,mode,M:{plan:90,eras:[1,5,9],perks:mode==='advanced',events:mode==='advanced',rounds:12,target:15},R:3,
    hexes:{'0,0':make('0,0','station','a','outpost',9),'1,0':make('1,0','station','b','spire',3),'2,0':make('2,0','rock','b','outpost',0),'0,1':make('0,1','ice','a','outpost',0)},
    lanes:[],ps,round:5,era:1,phase:'plan',order:['a','b'],trophies:{network:null,armada:null},missionDeck:[{uid:'x1',type:'lanes',inf:2,done:false}],draftDeck:[],pool:[],draftDiscard:[],storm:{axis:0,sign:1,pos:-7,label:'E'},twin:null,event:null,log:[],fx:null,fxSeq:0,moods:{},offers:[],offerSeq:0,eraOffer:[],eraPicks:{},leftoverUpgrades:[],setupTurn:null,eraTurn:null,uid:0,playtest:null};
  return room;
}
function ws(room,id){return {room,role:'phone',pid:id,readyState:1,send(){}};}
for(const mode of ['quick','standard']){
  test(`${mode} changes era without making any upgrade offer or blocking on picks`,async()=>{
    const room=fixture(mode),g=room.game;
    await I.eraPhase(room,1);
    assert.equal(g.phase,'era');assert.equal(g.eraOffer.length,0);
    assert.equal(g.leftoverUpgrades.length,0);assert.equal(g.eraTurn,null);
    assert.deepEqual(Array.from(g.ps.a.upgrades),[]);
    const pub=I.pubState(room);assert.equal(pub.game.eraOffer.length,0);
    g.eraOffer=['lattice'];g.eraTurn='a';
    I.onMessage(ws(room,'a'),{t:'eraPick',id:'lattice'});
    assert.equal(g.eraPicks.a,undefined,'crafted selection must be rejected server-side');
  });
  test(`${mode} Research cannot purchase an upgrade even with stale injected leftovers`,()=>{
    const room=fixture(mode),g=room.game;
    g.leftoverUpgrades=['autominers'];
    assert.ok(!I.legal(g,room,'a').research.includes('autominers'));
    const before=g.ps.a.res.credits;
    I.resolveCmd(room,'a',{type:'research',choice:'autominers'});
    assert.ok(!g.ps.a.upgrades.includes('autominers'));
    assert.equal(g.ps.a.res.credits,before+1,'failed-action credit follows existing rule');
  });
}
test('Advanced still generates choices and bots pick legal upgrades',async()=>{
  const room=fixture('advanced'),g=room.game;
  room.players.forEach(p=>p.isAI=true);
  await I.eraPhase(room,0);
  assert.equal(g.phase,'era');
  assert.ok(g.ps.a.upgrades.length===1 && g.ps.b.upgrades.length===1);
  assert.equal(g.eraTurn,null);assert.equal(g.eraOffer.length,0);
});
test('Advanced unfinished Mission penalty has a single cap; breakdown reconciles',()=>{
  const room=fixture('advanced'),g=room.game;
  g.ps.a.missions=[{uid:'a',done:false},{uid:'b',done:false},{uid:'c',done:false},{uid:'d',done:true,inf:2}];
  const raw=I.influence(g,'a'); I.endGame(room);
  const row=g.results.rows.find(x=>x.pid==='a');
  assert.equal(row.penalty,1);assert.equal(row.final,raw-1);
  assert.equal(row.breakdown.penalty,1);
  assert.equal(row.breakdown.stations+row.breakdown.lanes+row.breakdown.tradeRoutes+row.breakdown.missions+row.breakdown.trophies+row.breakdown.bonuses+row.breakdown.barons-row.breakdown.penalty,row.final);
});
test('Standard never applies unfinished Mission penalty',()=>{
  const room=fixture('standard'),g=room.game;
  g.ps.a.missions=[{done:false},{done:false},{done:false}];
  I.endGame(room);
  const row=g.results.rows.find(x=>x.pid==='a');assert.equal(row.penalty,0);assert.equal(row.final,row.inf);
});
test('successful Strike keeps source garrison, moves Fleets in and defender loses exactly one',()=>{
  const room=fixture('standard'),g=room.game;
  const source=g.hexes['0,0'],dest=g.hexes['1,0'];
  source.fleets=10;dest.fleets=2;
  I.resolveStrike(room,'a',{type:'strike',from:source.id,to:dest.id});
  assert.equal(dest.owner,'a');assert.equal(dest.build,'outpost');
  assert.equal(source.fleets,1);assert.equal(dest.fleets,9);
  assert.equal(g.hexes['2,0'].fleets,1,'one survivor retreats to adjacent ally');
  assert.equal(g.fx.k,'clash');assert.equal(g.fx.attackerLost,0);assert.equal(g.fx.defenderLost,1);
  assert.equal(g.fx.moved,9);assert.equal(g.fx.reserve,1);
  assert.equal(g.fx.A,g.fx.atkF+g.fx.atkB+g.fx.ad);
  assert.equal(g.fx.D,g.fx.defF+g.fx.defB+g.fx.dd);
});
test('failed Strike loses exactly one attacking Fleet; victorious defenders take no losses',()=>{
  const room=fixture('standard'),g=room.game;
  const source=g.hexes['0,0'],dest=g.hexes['1,0'];
  source.fleets=1;dest.fleets=20;
  I.resolveStrike(room,'a',{type:'strike',from:source.id,to:dest.id});
  assert.equal(source.fleets,0);assert.equal(dest.fleets,20);
  assert.equal(g.fx.win,false);assert.equal(g.fx.attackerLost,1);assert.equal(g.fx.defenderLost,0);
});
test('single-Fleet capture is not stranded at source',()=>{
  const room=fixture('standard'),g=room.game;
  const source=g.hexes['0,0'],dest=g.hexes['1,0'];
  source.fleets=1;dest.fleets=0;
  I.resolveStrike(room,'a',{type:'strike',from:source.id,to:dest.id});
  // Both roll a die; equal or lower attack is correctly a defender hold.
  if(g.fx.win){assert.equal(source.fleets,0);assert.equal(dest.fleets,1);}
  else{assert.equal(source.fleets,0);assert.equal(dest.owner,'b');}
});
test('TV, phone and official guide match combat outcomes and mode rules',()=>{
  const tv=fs.readFileSync(path.join(__dirname,'../src/tv.html'),'utf8');
  const phone=fs.readFileSync(path.join(__dirname,'../src/phone.html'),'utf8');
  const guide=fs.readFileSync(path.join(__dirname,'../public/how-to-play.html'),'utf8');
  assert.match(tv,/f\.moved/);assert.match(tv,/g\.mode === 'advanced'/);
  assert.match(phone,/g\.mode !== 'advanced'/);assert.match(phone,/maximum of 1 Influence/);
  assert.match(guide,/Teach Standard in 60 seconds/);assert.match(guide,/losing side loses one Fleet/);
  assert.match(guide,/maximum penalty of 1 Influence/);
  assert.doesNotMatch(guide,/45–60 minutes/);
});
test('Phase 5 tunable values are centrally defined',()=>{
  assert.equal(app.TUNING.maxMissionPenalty,1);
  assert.equal(app.TUNING.strikeLoserLoss,1);
  assert.equal(app.TUNING.captureMove,'allButOne');
  assert.equal(app.TUNING.captureSourceReserve,1);
});
