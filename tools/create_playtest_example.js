'use strict';
// Demonstration only. FAST simulated timings are not representative of human play.
const fs=require('node:fs');const path=require('node:path');
const load=require('../tests/load-server');
const app=load(0x4c414e45),I=app._internal;
const room=I.makeRoom();room.mode='quick';room.playtestEnabled=true;
room.players=Array.from({length:4},(_,i)=>({id:'bot'+i,token:'local-test-only',name:'Bot '+(i+1),avatar:i,isAI:true,bot:true,ws:null}));
room.hostId='bot0';I.startGame(room);
(async()=>{
  const began=Date.now();
  while(room.game.phase!=='over' && Date.now()-began<30000) await new Promise(r=>setTimeout(r,10));
  if(room.game.phase!=='over') throw Error('Demo game timed out');
  const output=path.join(__dirname,'../docs/playtest');fs.mkdirSync(output,{recursive:true});
  const {json,markdown}=room.game.playtestReport;
  fs.writeFileSync(path.join(output,'example-quick-4-bots.json'),JSON.stringify(json,null,2)+'\n');
  fs.writeFileSync(path.join(output,'example-quick-4-bots.md'),markdown+'\n');
  console.log('Generated 4-bot demo:',json.rounds.length,'rounds,',json.commands.length,'commands,',json.summary.failedCommands,'failures');
  room.game.alive=false;app.rooms.delete(room.code);app.cleanup();
})().catch(e=>{console.error(e);app.cleanup();process.exitCode=1;});
