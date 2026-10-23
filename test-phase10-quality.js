'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {test,after}=require('node:test');
const load=require('./tests/load-server');
const app=load(0x10202610), I=app._internal;
after(()=>app.cleanup());
function fixture(){
  const room=I.makeRoom();room.mode='advanced';
  room.players=[{id:'p1',name:'Kaia',avatar:0,isAI:true,bot:true,ws:null},{id:'p2',name:'Zib-Zob',avatar:1,isAI:true,bot:true,ws:null}];
  const map=app.genMap('small');
  const ps={};for(const p of room.players)ps[p.id]={res:{ore:8,ice:8,crystal:8,plasma:8,credits:24},missions:[],missionOffer:[],held:[],kept:[],upgrades:[],bonusInf:0,plan:I.emptyPlan(),engaged:false,offersSent:0,vexUsed:false,surveyOffer:null,pendingMega:false,megaDone:false,round:{},keepDone:false};
  room.game={alive:true,R:map.R,hexes:map.hexes,lanes:map.lanes,M:{perks:true,events:false,rounds:12,eras:[1,5,9],target:15,plan:90},mode:'advanced',round:1,era:0,phase:'plan',phaseEnds:0,ps,
    storm:{axis:0,sign:1,pos:-10,label:'N'},twin:null,event:null,firstIdx:0,order:['p1','p2'],trophies:{network:null,armada:null},log:[],fx:null,fxSeq:0,uid:0,missionDeck:[],draftDeck:[],draftDiscard:[],pool:[],setupTurn:null,eraOffer:[],eraPicks:{},leftoverUpgrades:[],offers:[],offerSeq:0,results:null,moods:{},incomeShow:null};
  return room;
}
test('Bot mission choice keeps exactly two attainable objectives without rule change',()=>{
  const room=fixture(), g=room.game;
  const missions=[{uid:'m1',type:'hold',world:'rock',inf:2},{uid:'m2',type:'spires',inf:3},{uid:'m3',type:'link',inf:4}];
  const keep=I.botKeepMissions(g,'p1',missions);
  assert.equal(keep.length,2);assert.deepEqual(keep.map(x=>x.uid),['m1','m2']);
  assert.equal(missions.length,3);
});
test('Bot upgrade choice prioritises fleet economy and profitable routes',()=>{
  const room=fixture(),g=room.game;
  assert.equal(I.botEraChoice(room,'p1',['autominers','cryo','militia']),'militia');
  const st=Object.values(g.hexes).find(h=>h.type==='station');st.owner='p1';st.build='outpost';
  const lane=g.lanes.find(l=>l.a===st.id||l.b===st.id);assert.ok(lane);lane.owner='p1';
  assert.equal(I.botEraChoice(room,'p1',['couriers','lattice','shieldgrid']),'couriers');
});
test('Bot setup chooses a legal productive hex and diversifies start',()=>{
  const room=fixture(),g=room.game;
  const available=Object.values(g.hexes).filter(h=>['rock','ice','gas','crystal'].includes(h.type));
  const legal=available.slice(0,14).map(h=>h.id);
  const first=I.botSetupChoice(g,'p1',legal);
  assert.ok(legal.includes(first));g.hexes[first].owner='p1';
  const next=I.botSetupChoice(g,'p1',legal.filter(id=>id!==first));
  assert.ok(legal.includes(next));assert.notEqual(first,next);
});
test('Bot planning uses the standard legal cost system and fills at most two slots',()=>{
  const room=fixture(),g=room.game;
  const near=Object.values(g.hexes).find(h=>h.type==='rock'||h.type==='ice');
  assert.ok(near);near.owner='p1';near.build='outpost';
  const legal=I.legal(g,room,'p1');
  I.aiPlan(room,'p1');const plan=g.ps.p1.plan;
  assert.equal(plan.cmds.length,2);assert.ok(g.ps.p1.engaged);
  for(const cmd of plan.cmds.filter(Boolean)){
    if(cmd.type==='found') assert.ok(legal.found.includes(cmd.target));
    if(cmd.type==='lane') assert.ok(legal.lane.includes(cmd.lane));
    if(cmd.type==='fleet') assert.ok(legal.fleetPlace.includes(cmd.place));
    if(cmd.type==='strike') assert.ok(legal.strike.some(([a,b])=>a===cmd.from&&b===cmd.to));
    if(cmd.type==='research') assert.ok(legal.research.includes(cmd.choice));
  }
});
test('Endgame breakdown adds up to the established Influence and final score',()=>{
  const room=fixture(),g=room.game;const ps=g.ps.p1;
  const st=Object.values(g.hexes).find(h=>h.type==='station');st.owner='p1';st.build='spire';
  ps.missions=[{uid:'m1',done:true,inf:3},{uid:'m2',done:false,inf:2}];ps.bonusInf=1;
  g.trophies.armada='p1';
  I.endGame(room);
  const row=g.results.rows.find(x=>x.pid==='p1'), b=row.breakdown;
  assert.equal(b.stations,2);assert.equal(b.missions,3);assert.equal(b.trophies,2);assert.equal(b.bonuses,1);assert.equal(b.penalty,1);
  assert.equal(b.stations+b.missions+b.trophies+b.bonuses+b.barons,row.inf);
  assert.equal(row.inf-b.penalty,row.final);
  assert.equal(row.final,I.influence(g,'p1')-1);
});
test('Phone and TV explain scoring and preserve help, lore and sound features',()=>{
  for(const screen of ['phone','tv'])for(const folder of ['src','public']){
    const html=fs.readFileSync(`${folder}/${screen}.html`,'utf8');
    assert.ok(html.includes('breakdown'),`${folder}/${screen} should use score breakdown`);
  }
  assert.match(fs.readFileSync('src/phone.html','utf8'),/Where the Influence came from/);
  assert.match(fs.readFileSync('public/phone.html','utf8'),/score-detail summary/);
  assert.ok(fs.existsSync('public/how-to-play.html'));
  assert.ok(fs.existsSync('public/lore.html'));
  assert.equal(fs.readdirSync('public/audio').filter(f=>f.endsWith('.mp3')).length,10);
});
