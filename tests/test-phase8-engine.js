'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const Engine = require('../lib/room-engine');
const PUBLIC = path.join(__dirname, '..','public');
function socket(){return {readyState:1, messages:[], send(m){this.messages.push(JSON.parse(m));},close(){this.closed=true;}};}
function fixtures(){
 const rooms=new Map();let k=0;
 const makeRoom=()=>Engine.makeRoom({rooms,rnd:()=>k++%24,token:()=>`test-token-${k}`});
 const sync=(r)=>Engine.sync(r,(room)=>({room:room.code,hostId:room.hostId,players:room.players.map(p=>({id:p.id}))}),()=>({hidden:42}));
 const opts={rooms,makeRoom,token:()=>`${(++k).toString(16).padStart(8,'0')}cafefeed1234`,avatars:Array.from({length:8},(_,i)=>({short:'A'+i})),consts:{modes:['quick']},sync,send:Engine.send};
 return {rooms,opts,makeRoom,sync};
}
test('room codes stay unique and contain no ambiguous characters',()=>{
 const x=fixtures(),a=x.makeRoom(),b=x.makeRoom();
 assert.match(a.code,/^[A-HJ-NP-Z]{4}$/);
 assert.notEqual(a.code,b.code);
 assert.equal(a.revealSpeed,'normal');
 assert.equal(a.phase,'lobby');
});
test('TV, join, reconnect, second-device takeover and private state',()=>{
 const {opts}=fixtures();const tv=socket();
 assert.equal(Engine.handleHandshake(tv,{t:'tvCreate'},opts),true);
 const code=tv.messages[0].room;
 const phone=socket();Engine.handleHandshake(phone,{t:'join',room:code,name:'Someone'},opts);
 assert.equal(phone.messages[0].t,'welcome');
 assert.equal(phone.messages.at(-1).priv.hidden,42);
 const {playerId,token}=phone.messages[0];
 const other=socket();Engine.handleHandshake(other,{t:'join',room:code,playerId,token},opts);
 assert.equal(phone.messages.at(-1).t,'replaced');
 assert.equal(phone.room,null);
 assert.equal(other.messages[0].playerId,playerId);
 assert.equal(other.room.players.length,1);
 Engine.disconnect(other,opts.sync);
 assert.equal(other.room.players[0].ws,null);
 const recovered=socket();Engine.handleHandshake(recovered,{t:'join',room:code,playerId,token},opts);
 assert.equal(recovered.messages[0].playerId,playerId);
});
test('host repair and full/unknown-room handling',()=>{
 const {opts}=fixtures();
 const noRoom=socket();Engine.handleHandshake(noRoom,{t:'join',room:'AAAA'},opts);
 assert.match(noRoom.messages[0].text,/No game/);
 const tv=socket();Engine.handleHandshake(tv,{t:'tvCreate'},opts);
 const code=tv.messages[0].room;
 const phones=Array.from({length:8},()=>socket());
 for(const p of phones)Engine.handleHandshake(p,{t:'join',room:code},opts);
 assert.equal(tv.room.players.length,8);
 assert.equal(phones[0].messages.at(-1).pub.hostId,phones[0].pid);
 Engine.disconnect(phones[0],opts.sync);
 assert.equal(tv.room.hostId,phones[1].pid);
 const extra=socket();Engine.handleHandshake(extra,{t:'join',room:code},opts);
 assert.match(extra.messages[0].text,/full/);
});
test('reusable lobby handles bot seat, avatar changes and kick; handover stays host-only',()=>{
 const {opts}=fixtures(),tv=socket();Engine.handleHandshake(tv,{t:'tvCreate'},opts);
 const code=tv.messages[0].room, host=socket(),guest=socket();
 Engine.handleHandshake(host,{t:'join',room:code},opts);
 Engine.handleHandshake(guest,{t:'join',room:code},opts);
 const room=tv.room;
 const hostSeat=room.players.find(x=>x.id===host.pid),guestSeat=room.players.find(x=>x.id===guest.pid);
 assert.equal(room.hostId,host.pid);
 assert.equal(Engine.handleLobbyAction(room,guestSeat,{t:'avatar',id:3},opts),true);
 assert.equal(room.players.find(x=>x.id===guest.pid).avatar,3);
 assert.equal(Engine.handleLobbyAction(room,hostSeat,{t:'addBot'},opts),true);
 const ai=room.players.find(x=>x.bot);assert.ok(ai);assert.equal(ai.isAI,true);
 assert.equal(Engine.handleLobbyAction(room,guestSeat,{t:'kick',pid:host.pid},opts),false);
 assert.equal(room.players.length,3);
 let planned=false;
 room.game={phase:'plan'};
 assert.equal(Engine.toggleBotSeat(room,guest.pid,ai.id,()=>{planned=true;}),false);
 assert.equal(Engine.toggleBotSeat(room,host.pid,guest.pid,()=>{planned=true;}),true);
 assert.equal(planned,true);assert.equal(room.players.find(x=>x.id===guest.pid).isAI,true);
 assert.equal(Engine.toggleBotSeat(room,host.pid,guest.pid,()=>{}),true);
 assert.equal(room.players.find(x=>x.id===guest.pid).isAI,false);
 room.game=null;
 assert.equal(Engine.handleLobbyAction(room,hostSeat,{t:'kick',pid:guest.pid},opts),true);
 assert.equal(room.players.length,2);assert.equal(guest.messages.at(-1).t,'kicked');
});
test('shared HTTP serves health, media and rejects unsafe paths',async()=>{
 const server=Engine.createHttpServer({http,fs,path,publicDir:PUBLIC,port:3000,os:require('node:os')});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const cases=[['/',302],['/health',200],['/info',200],['/tv.html',200],['/phone.html',200],
   ['/audio/command-bridge-theme.mp3',200],['/art/avatars/kaia_frontier_neutral.webp',200],
   ['/missing_file',404],['/%GG',400],['/..%2F..%2F..%2Fetc%2Fpasswd',403]];
  for(const [pathname,status]of cases){
   const response=await new Promise((resolve,reject)=>{
    http.get({hostname:'127.0.0.1',port:server.address().port,path:pathname},r=>{
      const data=[];r.on('data',c=>data.push(c));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(data)}));
    }).on('error',reject);
   });
   assert.equal(response.status,status,pathname);
   if(pathname==='/info')assert.ok(Array.isArray(JSON.parse(response.body.toString()).ips));
   if(pathname.endsWith('.mp3'))assert.match(response.headers['content-type'],/^audio\//);
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
});
