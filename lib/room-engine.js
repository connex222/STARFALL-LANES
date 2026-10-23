'use strict';
/**
 * Starfall-agnostic room transport: room codes, seat reconnection and takeover,
 * host repair, static HTTP, heartbeat, safe packet parsing and stale-room cleanup.
 * Game rules and private/public state remain owned by the caller.
 * Future games can inject their own constants, avatars, state and intent handlers.
 */
const MIME = Object.freeze({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2',
  '.mp3':'audio/mpeg','.ogg':'audio/ogg','.json':'application/json'});
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeRoom({rooms, rnd, token}) {
  let code;
  do { code = Array.from({length:4},()=>CODE_ALPHABET[rnd(CODE_ALPHABET.length)]).join(''); }
  while (rooms.has(code));
  const room={code,tvToken:token(),tvs:new Set(),players:[],hostId:null,mode:'standard',game:null,
    phase:'lobby',playtestEnabled:false,revealSpeed:'normal',touched:Date.now(),seq:0};
  rooms.set(room.code,room);
  return room;
}
function send(ws,o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function sync(room,pubState,privState) {
  room.touched=Date.now();
  const host=room.players.find(p=>p.id===room.hostId);
  if(!host || (!host.ws && !host.bot)) {
    const h=room.players.find(p=>!p.bot&&p.ws);
    if(h) room.hostId=h.id;
    else if(!host) room.hostId=null;
  }
  const pub=pubState(room);
  for(const ws of room.tvs)send(ws,{t:'state',pub});
  for(const p of room.players)if(p.ws)send(p.ws,{t:'state',pub,priv:privState(room,p)});
}
// Return true for connection/setup packets; false lets the game-specific dispatcher run.
function handleHandshake(ws,msg,{rooms,makeRoom,token,avatars,consts,sync,send:sendMsg=send}) {
  const t=msg.t;
  if(t==='tvCreate'||t==='tvJoin') {
    let room=t==='tvJoin'&&rooms.get(String(msg.room||'').toUpperCase());
    if(!room)room=makeRoom();
    room.tvs.add(ws);ws.room=room;ws.role='tv';
    sendMsg(ws,{t:'welcome',role:'tv',room:room.code,tvToken:room.tvToken,consts});
    sync(room);return true;
  }
  if(t==='join') {
    const room=rooms.get(String(msg.room||'').toUpperCase().trim());
    if(!room){sendMsg(ws,{t:'error',text:'No game with that code. Check the code on the TV.'});return true;}
    let p=msg.playerId&&room.players.find(x=>x.id===msg.playerId&&x.token===msg.token);
    if(!p){
      if(room.phase!=='lobby'){sendMsg(ws,{t:'error',text:'That game has already started.'});return true;}
      if(room.players.length>=avatars.length){sendMsg(ws,{t:'error',text:'That game is full (8 players).'});return true;}
      const taken=new Set(room.players.map(x=>x.avatar));
      const av=avatars.findIndex((_,i)=>!taken.has(i));
      const name=String(msg.name||'').trim().slice(0,14)||avatars[av].short;
      p={id:'p'+token().slice(0,8),token:token(),name,avatar:av,isAI:false,bot:false,ws:null};
      room.players.push(p);
      if(!room.hostId||!room.players.find(x=>x.id===room.hostId))room.hostId=p.id;
    }
    if(p.ws&&p.ws!==ws){
      const old=p.ws;sendMsg(old,{t:'replaced'});old.room=null;
      setTimeout(()=>{try{old.close();}catch(_){/* already closed */}},200);
    }
    p.ws=ws;if(!p.bot)p.isAI=false;
    ws.room=room;ws.role='phone';ws.pid=p.id;
    sendMsg(ws,{t:'welcome',role:'phone',room:room.code,playerId:p.id,token:p.token,consts});
    sync(room);return true;
  }
  return false;
}
function handleLobbyAction(room, actor, msg, {avatars,token,sync,send:sendMsg=send}) {
  const isHost=room.hostId===actor.id;
  const t=msg.t;
  if(room.phase!=='lobby') return false;
  if(t==='avatar') {
    const i=msg.id|0;
    if(i>=0&&i<avatars.length&&!room.players.some(x=>x.avatar===i&&x!==actor)){
      if(actor.name===avatars[actor.avatar].short)actor.name=avatars[i].short;
      actor.avatar=i;
    }
    sync(room);return true;
  }
  if(t==='name') {
    const name=String(msg.name||'').trim().slice(0,14);
    if(name)actor.name=name;
    sync(room);return true;
  }
  if(t==='addBot'&&isHost&&room.players.length<avatars.length){
    const taken=new Set(room.players.map(x=>x.avatar));
    const avatar=avatars.findIndex((_,i)=>!taken.has(i));
    room.players.push({id:'b'+token().slice(0,8),token:token(),name:avatars[avatar].short+' (bot)',avatar,isAI:true,bot:true,ws:null});
    sync(room);return true;
  }
  if(t==='kick'&&isHost){
    const kicked=room.players.find(x=>x.id===msg.pid);
    if(kicked&&kicked!==actor){
      room.players=room.players.filter(x=>x!==kicked);
      if(kicked.ws){sendMsg(kicked.ws,{t:'kicked'});kicked.ws.room=null;}
    }
    sync(room);return true;
  }
  return false;
}
function toggleBotSeat(room, actorId, targetId, onBotEnabled){
  const g=room.game;
  if(!g||room.hostId!==actorId) return false;
  const target=room.players.find(x=>x.id===targetId);
  if(!target||target.id===actorId) return false;
  target.isAI=!target.isAI;
  if(target.isAI)onBotEnabled(target.id);
  return true;
}
function disconnect(ws,syncRoom) {
  const room=ws.room;if(!room)return;
  if(ws.role==='tv')room.tvs.delete(ws);
  if(ws.role==='phone'){
    const p=room.players.find(x=>x.id===ws.pid);
    if(p&&p.ws===ws)p.ws=null;
  }
  syncRoom(room);
}
function lanIPs(os=require('node:os')) {
  const out=[];
  for(const list of Object.values(os.networkInterfaces()))for(const i of list||[])
    if(i.family==='IPv4'&&!i.internal)out.push(i.address);
  return out;
}
function createHttpServer({http,fs,path,publicDir,port,os}) {
  return http.createServer((req,res)=>{
    let url;
    try{url=decodeURIComponent((req.url||'/').split('?')[0]);}
    catch(_){res.writeHead(400);return res.end('Invalid URL');}
    if(url==='/'){res.writeHead(302,{Location:'/tv.html'});return res.end();}
    if(url==='/info'){res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(JSON.stringify({ips:lanIPs(os),port}));}
    if(url==='/health'){res.writeHead(200);return res.end('ok');}
    const file=path.resolve(publicDir,'.'+url);
    if(file!==publicDir&&!file.startsWith(publicDir+path.sep)){res.writeHead(403);return res.end();}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404);return res.end('Not found');}
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
      res.end(data);
    });
  });
}
function attachWebSockets({WebSocketServer,server,rooms,onMessage,sync,logger=console,setTimer=setInterval}){
  const wss=new WebSocketServer({server,maxPayload:32*1024});
  wss.on('connection',ws=>{
    ws.isAlive=true;
    ws.on('pong',()=>{ws.isAlive=true;});
    ws.on('message',raw=>{
      let msg;try{msg=JSON.parse(raw);}catch(_){return;}
      if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
      try{onMessage(ws,msg);}catch(e){logger.error('message error',e);}
    });
    ws.on('error',err=>logger.warn('WebSocket connection error:',err.message));
    ws.on('close',()=>disconnect(ws,sync));
  });
  const heartbeat=setTimer(()=>{
    for(const ws of wss.clients){
      if(!ws.isAlive){ws.terminate();continue;}
      ws.isAlive=false;try{ws.ping();}catch(_){/* socket closed */}
    }
  },25000);
  const cleanup=setTimer(()=>{
    const now=Date.now();
    for(const [code,room]of rooms){
      const anyone=room.tvs.size||room.players.some(p=>p.ws);
      if(!anyone&&now-room.touched>3*3600*1000){if(room.game)room.game.alive=false;rooms.delete(code);}
    }
  },10*60*1000);
  // Keep timers from preventing clean test process exit in lightweight test runners.
  if(process.env.NODE_ENV==='test'){heartbeat.unref?.();cleanup.unref?.();}
  return wss;
}
module.exports={MIME,makeRoom,send,sync,handleHandshake,handleLobbyAction,toggleBotSeat,disconnect,lanIPs,createHttpServer,attachWebSockets};
