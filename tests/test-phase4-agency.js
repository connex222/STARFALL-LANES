'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-server');
const app = load(0x444111);
const I = app._internal;
after(()=>app.cleanup());
function fixture(mode='standard') {
  const make=(id,type,owner=null,build=null)=>{const [q,r]=id.split(',').map(Number);return{id,q,r,type,owner,build,fleets:0,name:id,stormPrev:false};};
  const room={code:'QA12',mode,phase:'game',revealSpeed:'normal',tvs:new Set(),hostId:'a',touched:Date.now(),players:[
    {id:'a',name:'Alice',avatar:0,isAI:false,bot:false,ws:null},
    {id:'b',name:'Bob',avatar:1,isAI:false,bot:false,ws:null}]};
  const ps={};for(const p of room.players)ps[p.id]={res:{ore:20,ice:20,crystal:20,plasma:20,credits:20},missions:[],missionOffer:[],held:[],kept:[],upgrades:[],bonusInf:0,round:{},plan:I.emptyPlan(mode),engaged:false,keepDone:true,backupUsed:false};
  room.game={alive:true,mode,M:{plan:90,eras:[1,5,9],perks:false,events:false,rounds:12,target:15},R:4,
    hexes:{'0,0':make('0,0','station','a','outpost'),'1,0':make('1,0','rock'),'2,0':make('2,0','station','b','outpost'),'0,1':make('0,1','ice')},
    lanes:[{id:'L0',a:'0,0',b:'2,0',path:['1,0'],len:2,owner:null}],ps,round:2,era:0,phase:'plan',order:['a','b'],trophies:{network:null,armada:null},missionDeck:[],draftDeck:[],pool:[],draftDiscard:[],storm:{axis:0,sign:1,pos:-8,label:'E'},twin:null,event:null,log:[],fx:null,fxSeq:0,moods:{},offers:[],offerSeq:0,eraOffer:[],eraPicks:{},leftoverUpgrades:[],setupTurn:null,uid:0,playtest:null};
  return room;
}
const sock=(room,id)=>({room,role:'phone',pid:id,readyState:1,send(){}});
test('Quick gets three primary commands; Standard/Advanced get two',()=>{
  assert.equal(I.commandSlots('quick'),3);
  assert.equal(I.commandSlots('standard'),2);
  assert.equal(I.commandSlots('advanced'),2);
  assert.equal(I.emptyPlan('quick').cmds.length,3);
  assert.equal(I.emptyPlan().cmds.length,2);
  for (const mode of ['quick','standard']) {
    const r=fixture(mode);
    I.onMessage(sock(r,'a'),{t:'plan',cmds:[{type:'fleet',n:1,place:'0,0'},{type:'fleet',n:1,place:'0,0'},{type:'fleet',n:1,place:'0,0'},{type:'fleet',n:1,place:'0,0'}],backup:{type:'spire',target:'0,0'},engage:true});
    assert.equal(r.game.ps.a.plan.cmds.length,I.commandSlots(mode));
    assert.equal(r.game.ps.a.plan.backup.type,'spire');
    assert.equal(r.game.ps.a.engaged,true);
    assert.equal(I.privState(r,r.players[0]).commandSlots,I.commandSlots(mode));
  }
});
test('a successful primary does not spend or consume the queued Backup',()=>{
  const r=fixture(),ps=r.game.ps.a;
  ps.plan.backup={type:'spire',target:'0,0'};
  const before=ps.res.credits;
  const result=I.executePlannedOrder(r,'a',{type:'fleet',n:1,place:'0,0'},1);
  assert.equal(result.success,true);assert.equal(result.backupUsed,false);
  assert.equal(ps.backupUsed,false);assert.equal(r.game.hexes['0,0'].build,'outpost');
  assert.ok(ps.res.credits<before);
});
test('failed primary immediately runs affordable Backup at same slot, no failed-order refund',()=>{
  const r=fixture(),ps=r.game.ps.a;
  ps.plan.backup={type:'spire',target:'0,0'};
  const before=ps.res.credits;
  const result=I.executePlannedOrder(r,'a',{type:'found',target:'999,999'},1);
  assert.equal(result.success,true);assert.equal(result.backupUsed,true);
  assert.equal(ps.backupUsed,true);assert.equal(r.game.hexes['0,0'].build,'spire');
  assert.ok(ps.res.credits<=before,'Backup spends cost but failed command gives no Credit');
  assert.match(r.game.log.join(' '),/Backup succeeded in slot 1/);
});
test('if both primary and Backup fail only one Credit is awarded',()=>{
  const r=fixture(),ps=r.game.ps.a;
  ps.plan.backup={type:'spire',target:'not-here'};
  const before=ps.res.credits;
  const result=I.executePlannedOrder(r,'a',{type:'found',target:'999,999'},2);
  assert.equal(result.success,false);assert.equal(result.backupUsed,true);
  assert.equal(ps.res.credits,before+1);
});
test('a second failed command cannot trigger the same Backup twice',()=>{
  const r=fixture(),ps=r.game.ps.a;
  ps.plan.backup={type:'spire',target:'0,0'};
  I.executePlannedOrder(r,'a',{type:'found',target:'999,999'},1);
  const before=ps.res.credits;
  const second=I.executePlannedOrder(r,'a',{type:'found',target:'999,999'},2);
  assert.equal(second.backupUsed,false);assert.equal(ps.res.credits,before+1);
});
test('without a Backup the original +1 Credit failure rule is unchanged',()=>{
  const r=fixture(),ps=r.game.ps.a;const before=ps.res.credits;
  const result=I.executePlannedOrder(r,'a',{type:'found',target:'999,999'},1);
  assert.equal(result.backupUsed,false);assert.equal(result.success,false);
  assert.equal(ps.res.credits,before+1);
});
test('host alone changes reveal speed, input whitelist and public speed are enforced',()=>{
  const r=fixture();
  I.onMessage(sock(r,'b'),{t:'revealSpeed',speed:'fast'});assert.equal(r.revealSpeed,'normal');
  I.onMessage(sock(r,'a'),{t:'revealSpeed',speed:'turbo'});assert.equal(r.revealSpeed,'normal');
  I.onMessage(sock(r,'a'),{t:'revealSpeed',speed:'fast'});assert.equal(r.revealSpeed,'fast');
  assert.equal(I.pubState(r).revealSpeed,'fast');
  assert.equal(I.revealPause(r),app.TUNING.revealFastCommandMs);
  assert.equal(I.revealPause(r,true),app.TUNING.revealFastStrikeMs);
  I.onMessage(sock(r,'a'),{t:'revealSpeed',speed:'normal'});
  assert.equal(I.revealPause(r),600);
  assert.equal(I.revealPause(r,true),1500);
});
test('independent animation groups refuse shared sectors and complex commands',()=>{
  const r=fixture(),g=r.game;
  const a=I.independentFootprint(g,{type:'fleet',place:'0,0',n:1});
  const b=I.independentFootprint(g,{type:'fleet',place:'2,0',n:1});
  assert.equal([...a].some(x=>b.has(x)),false);
  const lane=I.independentFootprint(g,{type:'lane',lane:'L0'});
  assert.ok(lane.has('0,0')&&lane.has('2,0'));
  assert.equal(I.independentFootprint(g,{type:'research',choice:'mission'}),null);
  assert.equal(I.independentFootprint(g,{type:'fleet',place:'0,0'},{type:'found',target:'1,0'}),null);
});
test('UI, local instructions and server share the backup/speed/three-order protocol',()=>{
  const phone=fs.readFileSync(path.join(__dirname,'../src/phone.html'),'utf8');
  const guide=fs.readFileSync(path.join(__dirname,'../public/how-to-play.html'),'utf8');
  const tv=fs.readFileSync(path.join(__dirname,'../src/tv.html'),'utf8');
  for(const term of ['ui.plan.backup','commandSlots','data-slot="backup"','revealSpeed'])assert.ok(phone.includes(term),term);
  assert.ok(guide.includes('optional Backup'));
  assert.ok(guide.includes('three commands'));
  assert.ok(tv.includes('g.fxBatch'));
});
test('the real Quick reveal phase executes the third command slot',async()=>{
  const r=fixture('quick'),g=r.game,ps=g.ps.a;
  ps.plan.cmds=Array.from({length:3},()=>({type:'fleet',place:'0,0',n:1}));
  g.phase='reveal';
  await I.revealPhase(r);
  assert.equal(g.hexes['0,0'].fleets,3);
  assert.equal(ps.res.credits,20-3*I.costs(g,r,'a').fleetEach);
  assert.equal(g.fxBatch?.events?.some(e=>e.k==='fleet'),true);
});
test('full reveal executes a Backup in the failed order position and leaves subsequent orders intact',async()=>{
  const r=fixture('standard'),g=r.game,ps=g.ps.a;
  ps.plan.cmds=[{type:'found',target:'not-there'},{type:'fleet',n:1,place:'0,0'}];
  ps.plan.backup={type:'spire',target:'0,0'};
  g.phase='reveal';
  await I.revealPhase(r);
  assert.equal(ps.backupUsed,true);
  assert.equal(g.hexes['0,0'].build,'spire');
  assert.equal(g.hexes['0,0'].fleets,1);
  assert.match(g.log.join(' '),/Backup succeeded in slot 1/);
});
