'use strict';
const assert=require('node:assert/strict');
const load=require('./load-server');
const app=load(0x434342);
const I=app._internal;
async function run(n,mode){
 const room=I.makeRoom();room.mode=mode;
 room.players=Array.from({length:n},(_,i)=>({id:'b'+i,token:'test'+i,name:'House '+i,avatar:i,isAI:true,bot:true,ws:null}));room.hostId='b0';
 I.startGame(room);
 const began=Date.now();while(room.game.phase!=='over'&&Date.now()-began<30000) await new Promise(r=>setTimeout(r,10));
 assert.equal(room.game.phase,'over',`${n} bot ${mode} game incomplete`);
 const g=room.game;
 assert.ok(g.results.rows.every(x=>Number.isFinite(x.final)));
 const summary={players:n,mode,rounds:g.round,commands:I.commandSlots(mode),winners:g.results.winners.length,score:g.results.rows[0].final};
 room.game.alive=false;app.rooms.delete(room.code);
 return summary;
}
(async()=>{try{for(const [n,m] of [[2,'quick'],[4,'quick'],[8,'quick'],[4,'standard'],[8,'advanced']])console.log(JSON.stringify(await run(n,m)));}finally{app.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1;});
