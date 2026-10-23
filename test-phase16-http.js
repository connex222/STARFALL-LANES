'use strict';
/* Phase 16 local-HTTP preflight. WebSockets are stubbed; this is NOT live multiplayer QA. */
const assert=require('node:assert/strict');
const {once}=require('node:events');
const loadServer=require('./tests/load-server');
(async()=>{
  const game=loadServer();
  try {
    game.server.listen(0,'127.0.0.1');
    await once(game.server,'listening');
    const base='http://127.0.0.1:'+game.server.address().port;
    const tests=[
      ['/',302,'location','/tv.html'],
      ['/health',200,'text','ok'],
      ['/info',200,'json'],
      ['/tv.html',200,'html','HOW TO PLAY'],
      ['/phone.html',200,'html','How to Play'],
      ['/how-to-play.html',200,'html','How to Play'],
      ['/lore.html',200,'html'],
      ['/sound-lab.html',200,'html'],
      ['/audio/command-bridge-theme.mp3',200,'audio',100000],
      ['/audio/solar-storm.mp3',200,'audio',5000],
      ['/art/brand/starfall-logo.png',200,'image',10000],
      ['/art/avatars/kaia_frontier_neutral.png',200,'image',10000],
      ['/art/avatars/oolu_expansion_smug.png',200,'image',10000],
      ['/art/avatars/bramble_ascension_furious.png',200,'image',10000],
      ['/definitely-not-present',404],
      ['/..%2F..%2F..%2Fetc%2Fpasswd',403],
      ['/%GG',400]
    ];
    let passed=0;
    for(const [url,status,kind,value] of tests){
      const r=await fetch(base+url,{redirect:'manual',signal:AbortSignal.timeout(3000)});
      assert.equal(r.status,status,url+' HTTP status');
      if(kind==='location')assert.equal(r.headers.get('location'),value);
      if(kind==='text')assert.equal(await r.text(),value);
      if(kind==='json')assert.ok(Array.isArray((await r.json()).ips));
      if(kind==='html'){
        assert.match(r.headers.get('content-type')||'',/^text\/html/);
        if(value)assert.ok((await r.text()).includes(value),url+' page text');
      }
      if(kind==='image'||kind==='audio'){
        assert.match(r.headers.get('content-type')||'',kind==='image'?/^image\//:/^audio\//);
        assert.ok((await r.arrayBuffer()).byteLength>=value,url+' asset size');
      }
      passed++;
    }
    console.log('Phase 16 HTTP preflight passed: '+passed+' checks');
    console.log('Does NOT test live Render, browsers, real WebSockets or physical-device audio');
  }finally{game.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
