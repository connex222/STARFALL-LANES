'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {parseArgs,summarise,PROFILES}=require('./balance-sim');
const loadServer=require('./load-server');
const {readFileSync,mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os');

test('batch simulation defaults to 300 seeded games per setup',()=>{
  const o=parseArgs([]);assert.equal(o.games,300);assert.equal(o.seed,61803);
  assert.equal(o.players,null);assert.equal(o.mode,undefined);
  assert.equal(o.output,'docs/balance/latest');
  assert.match(parseArgs(['--mode','quick','--players','2']).output,/adhoc-baseline-quick-2$/);
  assert.deepEqual(parseArgs(['--mode','advanced','--players','8','--games','35']).games,35);
});
test('reject invalid cohorts and profile names',()=>{
  for(const args of [['--players','1'],['--games','0'],['--games','-1'],['--mode','expert'],['--profile','unknown'],['--players','9'],['--seed','-1']])
    assert.throws(()=>parseArgs(args));
});
test('simulation balancing settings cannot leak into ordinary production server',()=>{
  const prod=loadServer(42);
  try {assert.equal(prod.TUNING.longLaneInfluence,1);assert.equal(prod.TUNING.quickLongLaneInfluence,2);assert.equal(prod.TUNING.standardTarget,16);assert.equal(prod.TUNING.advancedTarget,15);}finally{prod.cleanup();}
  const sim=loadServer(42,{instant:true,simulation:true,tuning:PROFILES.advanced16});
  try {assert.equal(sim.TUNING.advancedTarget,16);assert.equal(sim.TUNING.standardTarget,16);}finally{sim.cleanup();}
});
test('summary uses each seat, fractional tied wins, total command denominator and exact breakdown',()=>{
  const b={stations:2,lanes:1,tradeRoutes:0,missions:0,trophies:0,bonuses:0,barons:0,penalty:0};
  const game={round:8,firstSeat:0,best:10,metTarget:true,appearances:[{seat:0,house:'kaia'},{seat:1,house:'zibzob'}],wins:[{seat:0,house:'kaia',share:.5},{seat:1,house:'zibzob',share:.5}],scores:[{breakdown:b},{breakdown:b}],failCount:1,cmdCount:4,tolls:3};
  const result=summarise([game,game],'quick',2);
  assert.equal(result.targetReachedPct,100);
  assert.equal(result.firstPlayerWinPct,50);
  assert.deepEqual(result.winRatesBySeat,[.5,.5]);
  assert.equal(result.failedCommandPct,25);
  assert.equal(result.meanTollCreditsPaid,3);
  assert.equal(result.meanInfluenceBySource.stations,2);
  assert.ok(result.flags.some(x=>x.includes('above 95%')));
});
test('full game cohort is reproducible for the same seed',()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'starfall-balance-test-'));
  try {
    const cli=path.join(__dirname,'balance-sim.js');
    const args=['--mode','quick','--players','2','--games','4','--seed','777'];
    execFileSync(process.execPath,[cli,...args,'--output',path.join(tmp,'a')],{timeout:15000});
    execFileSync(process.execPath,[cli,...args,'--output',path.join(tmp,'b')],{timeout:15000});
    const a=JSON.parse(readFileSync(path.join(tmp,'a.json'))),b=JSON.parse(readFileSync(path.join(tmp,'b.json')));
    assert.deepEqual(a.groups,b.groups);
    assert.equal(a.totalGames,4);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
