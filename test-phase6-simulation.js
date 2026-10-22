'use strict';
const assert = require('node:assert/strict');
const {test,after}=require('node:test');
const load=require('./tests/load-server');
const app=load(0xFACE1234), I=app._internal;
after(()=>app.cleanup());
const pause=t=>new Promise(r=>setTimeout(r,t));
async function simulatedGame(mode,n){
  const room=I.makeRoom(); room.mode=mode;
  room.players=Array.from({length:n},(_,i)=>({id:'bot'+i,token:'T'+i,name:'Bot '+i,avatar:i,isAI:true,bot:true,ws:null}));
  I.startGame(room);
  const start=Date.now();
  while(room.game.phase!=='over' && Date.now()-start<40000) await pause(15);
  assert.equal(room.game.phase,'over',`game ${mode} ${n} players timed out`);
  const g=room.game;
  assert.ok(g.round<=g.M.rounds);
  assert.equal(g.results.rows.length,n);
  for(const r of g.results.rows){
    assert.ok(Number.isInteger(r.final));
    assert.ok(r.credits>=0);
    const inventory=g.ps[r.pid].res;
    for(const value of Object.values(inventory)) assert.ok(Number.isInteger(value)&&value>=0);
  }
  assert.ok(g.results.winners.length>=1);
  g.alive=false;app.rooms.delete(room.code);
  return {mode,n,round:g.round,winners:g.results.winners,score:g.results.rows[0].final};
}

test('full bot games finish consistently across modes and map sizes',async()=>{
  const results=[];
  for(const mode of ['quick','standard','advanced']) for(const n of [2,4,8]) {
    const result=await simulatedGame(mode,n);results.push(result);
    console.log(`SIM: ${mode.padEnd(8)} ${n} players, round ${result.round}, winning Influence ${result.score}`);
  }
  assert.equal(results.length,9);
},{timeout:180000});
