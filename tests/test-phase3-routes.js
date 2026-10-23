'use strict';
const assert = require('node:assert/strict');
const {test, after} = require('node:test');
const load = require('./load-server');
const app = load(0x3a911f1);
const I = app._internal;
after(()=>app.cleanup());
function fixture() {
  const mk=(id,type,owner,build=null)=>{const [q,r]=id.split(',').map(Number);return {id,q,r,type,owner,build,fleets:0,name:id,stormPrev:false};};
  const room={code:'TEST',mode:'standard',phase:'game',tvs:new Set(),hostId:'a',touched:Date.now(),players:[
    {id:'a',name:'Alice',avatar:0,isAI:false,bot:false,ws:null},
    {id:'b',name:'Bob',avatar:1,isAI:false,bot:false,ws:null},
    {id:'c',name:'Cat',avatar:2,isAI:false,bot:false,ws:null}]};
  const hexes={};
  for(const [id,type,owner] of [['0,0','station','a'],['1,0','rock',null],['2,0','station','b'],['3,0','ice',null],['4,0','station','a'],['2,-1','crystal',null],['0,1','ice',null]])hexes[id]=mk(id,type,owner,owner?'outpost':null);
  const lanes=[{id:'L0',a:'0,0',b:'2,0',path:['1,0'],len:2,owner:'b'},
    {id:'L1',a:'2,0',b:'4,0',path:['3,0'],len:3,owner:'a'}];
  const ps={};for(const p of room.players) ps[p.id]={res:{ore:10,ice:10,crystal:10,plasma:10,credits:8},missions:[],missionOffer:[],held:[],kept:[],upgrades:[],bonusInf:0,round:{},plan:I.emptyPlan(),engaged:false,keepDone:false};
  room.game={alive:true,mode:'standard',M:{perks:false,events:false,rounds:12,target:15,plan:90,eras:[1,5,9]},R:4,hexes,lanes,ps,round:2,era:0,phase:'plan',order:['a','b','c'],trophies:{network:null,armada:null},missionDeck:[],draftDeck:[],pool:[],draftDiscard:[],storm:{axis:0,sign:1,pos:-8,label:'E'},twin:null,event:null,log:[],fx:null,fxSeq:0,moods:{},offers:[],offerSeq:0,eraOffer:[],eraPicks:{},leftoverUpgrades:[],setupTurn:null,uid:0,playtest:null};
  return room;
}
test('stations scale from 6 up to 10 across 2–8 players, with valid hex totals',()=>{
  for(let players=2;players<=8;players++) {
    const size=players<=4?'small':'large';
    for(let run=0;run<5;run++) {
      const m=app.genMap(size,players),hs=Object.values(m.hexes);
      assert.equal(hs.filter(h=>h.type==='station').length,Math.max(6,players+app.TUNING.extraStations),`count ${players}`);
      assert.equal(hs.length,players<=4?37:61);
      assert.ok(m.lanes.length>=app.MAPS[size].lanes[0]);
      assert.equal(hs.filter(h=>h.type==='void').length,app.MAPS[size].counts.void+app.MAPS[size].counts.station-Math.max(6,players+2));
    }
  }
});
test('own territory and own lane access are free; a reachable rival lane costs one Credit',()=>{
  const r=fixture(),g=r.game;
  assert.equal(I.foundRoute(g,'a',g.hexes['0,1']).cost,0);
  assert.equal(I.foundRoute(g,'a',g.hexes['1,0']).cost,0); // adjacent to Alice's station
  assert.equal(I.foundRoute(g,'a',g.hexes['2,-1']).cost,0); // Alice's L1
  g.lanes[1].owner='b';
  assert.equal(I.foundRoute(g,'a',g.hexes['2,-1']).cost,1);
  assert.equal(I.legal(g,r,'a').foundTolls['2,-1'],1);
});
test('paid rival Found transfers funds exactly once at authoritative resolution',()=>{
  const r=fixture(),g=r.game;g.lanes[1].owner='b';
  const a=g.ps.a.res,b=g.ps.b.res;
  const oldA=a.credits,oldB=b.credits;
  I.resolveCmd(r,'a',{type:'found',target:'2,-1'});
  assert.equal(g.hexes['2,-1'].owner,'a');
  assert.equal(a.credits,oldA-1); assert.equal(b.credits,oldB+1);
  assert.match(g.log.join(' '),/paid 1 Credit toll/);
});
test('insufficient Credits for a rival Found gives the existing failed-order refund, no owner payment',()=>{
  const r=fixture(),g=r.game;g.lanes[1].owner='b';g.ps.a.res.credits=0;
  const before=g.ps.b.res.credits;
  I.resolveCmd(r,'a',{type:'found',target:'2,-1'});
  assert.equal(g.hexes['2,-1'].owner,null);assert.equal(g.ps.b.res.credits,before);
  assert.equal(g.ps.a.res.credits,1);
});
test('own lanes cost no toll and long lanes score; owned station pairs score via own-only connections',()=>{
  const r=fixture(),g=r.game;
  assert.equal(I.routeScores(g,'a').lanes,1);
  assert.equal(I.routeScores(g,'a').tradeRoutes,0);
  assert.equal(I.influence(g,'a'),3); // two stations + long lane
  g.lanes[0].owner='a';
  assert.equal(I.tradeRouteCount(g,'a'),1);
  assert.equal(I.routeScores(g,'a').tradeRoutes,1);
  assert.equal(I.influence(g,'a'),4);
  assert.equal(I.missionRoute(g,'a',{type:'link',a:'0,0',b:'4,0'}).cost,0);
});
test('Missions can use rival lanes, paying every lane once; cannot complete when Credit-poor',()=>{
  const r=fixture(),g=r.game;
  const m={type:'link',a:'0,0',b:'4,0',done:false,inf:3};
  g.ps.a.missions=[m];
  const route=I.missionRoute(g,'a',m);
  assert.equal(route.cost,1);assert.deepEqual([...route.lanes],['L0']);
  assert.equal(I.missionMet(g,'a',m),true);
  g.ps.a.res.credits=0;assert.equal(I.missionMet(g,'a',m),false);
  assert.equal(I.settleTolls(r,'a',route,'Mission route'),false);
  g.ps.a.res.credits=2;
  assert.equal(I.settleTolls(r,'a',route,'Mission route'),true);
  assert.equal(g.ps.a.res.credits,1);assert.equal(g.ps.b.res.credits,9);
});
test('breakdown rows add up to Influence for network scoring',()=>{
  const r=fixture(),g=r.game;
  g.lanes[0].owner='a';
  I.endGame(r);
  for(const row of g.results.rows) {
    const b=row.breakdown;
    assert.equal(b.stations+b.lanes+b.tradeRoutes+b.missions+b.trophies+b.bonuses+b.barons,row.inf);
    assert.equal(row.inf-b.penalty,row.final);
  }
  assert.equal(g.results.rows.find(x=>x.pid==='a').breakdown.tradeRoutes,1);
});
test('public register shows lane owner, scoring and toll; private legal list previews costs',()=>{
  const r=fixture(),g=r.game;
  const pub=I.pubState(r),priv=I.privState(r,r.players[0]);
  assert.equal(pub.game.lanes.find(l=>l.id==='L0').toll,1);
  assert.equal(pub.game.lanes.find(l=>l.id==='L1').scores,true);
  assert.equal(priv.legal.foundTolls['3,0'],0);
  assert.equal(pub.game.routeTuning.tollPerLane,1);
});
