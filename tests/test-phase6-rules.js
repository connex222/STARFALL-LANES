'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { test, after } = require('node:test');
const load = require('./load-server');
const app = load();
const I = app._internal;
after(() => app.cleanup());

function fixture() {
  const room = { code: 'TEST', phase: 'game', mode: 'advanced', hostId: 'p1', tvs: new Set(), players: [
    { id: 'p1', name: 'One', avatar: 0, isAI: false, ws: null, bot: false },
    { id: 'p2', name: 'Two', avatar: 1, isAI: false, ws: null, bot: false },
    { id: 'p3', name: 'Three', avatar: 2, isAI: false, ws: null, bot: false }
  ], touched: Date.now() };
  const mk = (id,q,r,type,owner,build='outpost',fleets=0) => ({ id, q,r,type,name:type==='station'?'Tavi Dock':null,owner,build,fleets,stormPrev:false });
  const hexes = {
    '0,0': mk('0,0',0,0,'beacon',null,null),
    '1,0': mk('1,0',1,0,'station','p1','outpost',3),
    '2,0': mk('2,0',2,0,'station','p2','spire',4),
    '2,-1': mk('2,-1',2,-1,'rock','p2','outpost',0),
    '1,-1': mk('1,-1',1,-1,'ice','p1','outpost',2),
    '0,1': mk('0,1',0,1,'crystal','p3','outpost',1),
    '-1,0': mk('-1,0',-1,0,'gas',null,null,0),
    '-1,1': mk('-1,1',-1,1,'asteroid',null,null,0),
  };
  const ps = {};
  for (const p of room.players) ps[p.id] = {
    res:{ore:6,ice:6,crystal:6,plasma:6,credits:20}, missions:[], missionOffer:[], held:[], kept:[],
    upgrades:[], bonusInf:0, plan:I.emptyPlan(), engaged:false, offersSent:0, vexUsed:false,
    surveyOffer:null, pendingMega:false, megaDone:false, round:{}, keepDone:false
  };
  room.game = { alive:true,R:3, hexes, lanes:[],mode:'advanced', M:{perks:true, events:false, plan:90, target:15,rounds:12,eras:[1,5,9]},
    storm:{axis:0,sign:1,pos:-6,label:'E'}, twin:null, event:null, round:1, era:0, firstIdx:0, order:['p1','p2','p3'],
    ps, trophies:{network:null,armada:null},log:[],fx:null,fxSeq:0,uid:0,missionDeck:[],draftDeck:[],draftDiscard:[],pool:[],
    phase:'plan',phaseEnds:Date.now()+50000,setupTurn:null,eraOffer:[],eraPicks:{},leftoverUpgrades:[],offers:[],offerSeq:0,results:null,moods:{},incomeShow:null };
  return room;
}

test('hex maps honour sector counts, station spacing and lane ranges', () => {
  for (const size of ['small','large']) for (let run=0;run<4;run++) {
    const m=app.genMap(size), spec=app.MAPS[size];
    assert.ok(m, `generated ${size} map`);
    const hs=Object.values(m.hexes);
    assert.equal(hs.length, size==='small'?37:61);
    for (const [k,n] of Object.entries(spec.counts)) assert.equal(hs.filter(h=>h.type===k).length,n,`${size} ${k}`);
    assert.equal(hs.filter(h=>h.type==='beacon').length,1);
    assert.ok(m.lanes.length>=spec.lanes[0]&&m.lanes.length<=spec.lanes[1],`${size} has ${m.lanes.length} lanes`);
    const stations=hs.filter(h=>h.type==='station');
    for (const a of stations) for (const b of stations) if(a!==b) {
      const d=(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
      assert.ok(d>1, 'stations must not be adjacent');
    }
    for(const lane of m.lanes) assert.ok(lane.len>=2&&lane.len<=5);
  }
});

test('Station influence upgrades replace rather than stack', () => {
  const r=fixture(),g=r.game;
  assert.equal(I.influence(g,'p1'),1);
  g.hexes['1,0'].build='spire';assert.equal(I.influence(g,'p1'),2);
  g.hexes['1,0'].build='mega';assert.equal(I.influence(g,'p1'),4);
  g.ps.p1.missions=[{done:true,inf:3}];g.ps.p1.upgrades.push('archive');
  assert.equal(I.influence(g,'p1'),8);
});

test('Reverse influence draft resolves ties by first-player order', () => {
  const r=fixture(),g=r.game;
  g.order=['p3','p1','p2'];
  // p1=1, p2=2, p3=0
  assert.deepEqual(Array.from(I.eraPickOrder(r)), ['p3','p1','p2']);
  g.ps.p3.bonusInf=1;
  assert.deepEqual(Array.from(I.eraPickOrder(r)), ['p3','p1','p2']);
});

test('Supply Drop awards selected resource, with deterministic fallback', () => {
  const r=fixture(),g=r.game;
  g.ps.p1.plan.supply='plasma';
  I.receiveCard(r,'p1',{key:'supply',uid:'d1'});
  assert.equal(g.ps.p1.res.plasma,8);
  g.ps.p1.plan.supply=null;
  g.ps.p1.res.ore=0;
  I.receiveCard(r,'p1',{key:'supply',uid:'d2'});
  assert.equal(g.ps.p1.res.ore,2);
});

test('Strikes capture sectors, retreat survivors, and downgrade captured Spires', () => {
  const r=fixture(),g=r.game;
  g.ps.p1.res.credits=0; // does not affect free Strikes
  g.hexes['1,0'].fleets=9;
  I.resolveStrike(r,'p1',{type:'strike',from:'1,0',to:'2,0'});
  assert.equal(g.hexes['2,0'].owner,'p1');
  assert.equal(g.hexes['2,0'].build,'outpost');
  assert.equal(g.hexes['2,0'].fleets,8);
  assert.ok(g.hexes['2,-1'].fleets>=2,'defender retreats to adjacent owned sector');
});


test('Research only offers upgrades left unpicked after earlier eras', () => {
  const r=fixture(), g=r.game;
  g.era=2;g.missionDeck=[{uid:'m1'}];g.leftoverUpgrades=['autominers','couriers'];
  const opts=I.legal(g,r,'p1').research;
  assert.ok(opts.includes('mission'));assert.ok(opts.includes('autominers'));
  assert.ok(opts.includes('couriers'));assert.ok(!opts.includes('shieldgrid'));
  I.resolveCmd(r,'p1',{type:'research',choice:'shieldgrid'});
  assert.ok(!g.ps.p1.upgrades.includes('shieldgrid'));
});

test('A failed command refunds precisely one Credit', () => {
  const r=fixture(),g=r.game;
  const before=g.ps.p1.res.credits;
  I.resolveCmd(r,'p1',{type:'spire',target:'0,1'});
  assert.equal(g.ps.p1.res.credits,before+1);
});

test('Expired trade offers cannot be accepted, including before the cleanup tick', () => {
  const r=fixture(),g=r.game;
  const o={id:'o1',from:'p1',to:'p2',give:{ore:2},get:{credits:1},expires:Date.now()-5,status:null};
  g.offers=[o]; const ore=g.ps.p1.res.ore;
  I.resolveOffer(r,o,true);
  assert.equal(o.status,'expired');assert.equal(g.ps.p1.res.ore,ore);
});


test('Era phase rejects selections from a house that is not choosing', () => {
  const r=fixture(),g=r.game;
  g.phase='era';g.eraTurn='p2';g.eraOffer=['autominers','cryo','militia'];
  const sock={room:r,role:'phone',pid:'p1',readyState:1,send(){}};
  I.onMessage(sock,{t:'eraPick',id:'autominers'});
  assert.equal(g.eraPicks.p1,undefined);
  sock.pid='p2';I.onMessage(sock,{t:'eraPick',id:'cryo'});
  assert.equal(g.eraPicks.p2,'cryo');
  I.onMessage(sock,{t:'eraPick',id:'militia'});
  assert.equal(g.eraPicks.p2,'cryo');
});

test('Messages cannot spend other houses resources and rejects invalid Draft ranks', () => {
  const r=fixture(),g=r.game;
  g.pool=[{uid:'d0',key:'cache'},{uid:'d1',key:'supply'}];
  const sock={room:r,role:'phone',pid:'p1',readyState:1,send(){}};
  I.onMessage(sock,{t:'plan',cmds:[{type:'evil'},{type:'fleet',n:99,place:'1,0'}],rank:['wrong','d1','d1','d0'],supply:'credits'});
  assert.equal(g.ps.p1.plan.cmds[0],null);
  assert.equal(g.ps.p1.plan.cmds[1].n,3);
  assert.deepEqual(Array.from(g.ps.p1.plan.rank),['d1','d0']);
  assert.equal(g.ps.p1.plan.supply,null);
  assert.equal(g.ps.p2.res.credits,20);
});

test('Old controller is revoked on reconnect and wrong credentials cannot take an active seat', () => {
  const r=fixture();app.rooms.set(r.code,r);
  r.phase='lobby';r.game=null;
  const old={readyState:1,send(){},close(){},room:null};
  I.onMessage(old,{t:'join',room:r.code,name:'Guest'});
  const p=r.players.at(-1), newSock={readyState:1,send(){},close(){}};
  const before=r.players.length;
  r.phase='game';r.game=fixture().game;
  r.game.ps[p.id]={...r.game.ps.p1,plan:I.emptyPlan()};r.game.order.push(p.id);
  I.onMessage(newSock,{t:'join',room:r.code,playerId:p.id,token:p.token});
  assert.equal(r.players.length,before);assert.equal(p.ws,newSock);assert.equal(old.room,null);
  const intruder={readyState:1,send(x){this.last=JSON.parse(x)}};
  I.onMessage(intruder,{t:'join',room:r.code,playerId:p.id,token:'WRONG'});
  assert.equal(intruder.last.t,'error');assert.equal(p.ws,newSock);
});

test('HTTP rejects malformed percent escapes and traversal attempts',async()=>{
  await new Promise(resolve=>app.server.listen(0, '127.0.0.1',resolve));
  const request=url=>new Promise((resolve,reject)=>{
    http.get({hostname:'127.0.0.1',port:app.server.address().port,path:url},res=>{
      res.resume();res.on('end',()=>resolve(res.statusCode));
    }).on('error',reject);
  });
  assert.equal(await request('/%ZZ'),400);
  assert.equal(await request('/%2e%2e/%2e%2e/server.js'),403);
  await new Promise(resolve=>app.server.close(resolve));
});
