'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','src/connection.js'),'utf8');
function setup(){
 const sockets=[],timers=new Map(),intervals=new Map();let next=0;
 class MockWebSocket{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}
  send(s){this.sent.push(JSON.parse(s));}
  close(){this.readyState=3;this.onclose?.();}
  opened(){this.readyState=1;this.onopen?.();}
  incoming(s){this.onmessage?.({data:s});}
  dropped(){this.readyState=3;this.onclose?.();}
 }
 const status=[],messages=[];let connected=0;
 const ctx={
  WebSocket:MockWebSocket,location:{protocol:'https:',host:'game.example'},JSON,
  setTimeout(fn){let id=++next;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
  setInterval(fn){let id=++next;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);}
 };
 vm.createContext(ctx);vm.runInContext(code+';globalThis.Conn=Conn;',ctx);
 const conn=ctx.Conn(m=>messages.push(m),send=>{connected++;send({t:'join',room:'ABCD'});},ok=>status.push(ok));
 return {conn,sockets,timers,intervals,status,messages,get connected(){return connected;},flush(){const x=[...timers.entries()];timers.clear();for(const [,fn]of x)fn();}};
}
test('phones and TVs receive the same guarded WebSocket transport',()=>{
 const x=setup();const s=x.sockets[0];assert.equal(s.url,'wss://game.example');
 s.opened();assert.equal(x.connected,1);assert.equal(s.sent[0].room,'ABCD');
 assert.equal(s.sent[0].t,'join');s.incoming('{bad');s.incoming('[]');s.incoming('{"t":"state"}');
 assert.equal(x.messages.length,1);assert.equal(x.messages[0].t,'state');
 assert.equal(x.intervals.size,1);
 x.conn.stop();assert.equal(x.intervals.size,0);assert.equal(x.timers.size,0);
});
test('retry is cancelled when a replaced controller stops',()=>{
 const x=setup();const s=x.sockets[0];s.opened();s.dropped();
 assert.equal(x.timers.size,1);
 x.conn.stop();x.flush();assert.equal(x.sockets.length,1);
 assert.equal(x.status.at(-1),false);
 x.conn.restart();assert.equal(x.sockets.length,2);
 x.sockets[1].opened();assert.equal(x.connected,2);
 x.conn.stop();
});
test('stale socket callbacks cannot create duplicate connection loops',()=>{
 const x=setup();const first=x.sockets[0];first.opened();first.dropped();x.flush();
 assert.equal(x.sockets.length,2);
 first.onclose?.();assert.equal(x.timers.size,0);
 x.sockets[1].opened();assert.equal(x.intervals.size,1);
 x.conn.stop();assert.equal(x.timers.size,0);
});
