process.env.FAST='1';
const WebSocket=require('ws');
const {server}=require('../server.js');
const pick=a=>a[Math.floor(Math.random()*a.length)];
function play(port, mode, bots){ return new Promise((resolve,reject)=>{
  const tv=new WebSocket('ws://localhost:'+port); let code;
  const to=setTimeout(()=>reject(new Error('timeout '+mode+bots)),120000);
  tv.on('open',()=>tv.send(JSON.stringify({t:'tvCreate'})));
  tv.on('message',d=>{const m=JSON.parse(d); if(m.t==='welcome'){code=m.room; phone();}
    if(m.t==='state'&&m.pub.game&&m.pub.game.phase==='over'){clearTimeout(to); const r=m.pub.game.results; tv.close(); ph&&ph.close(); resolve({mode,bots,round:m.pub.game.round,rows:r.rows.map(x=>x.final), log:m.pub.game.log.slice(-2)});}});
  let ph, started=false, lastPlanRound=-1, lastPlace=null, offered=0;
  function phone(){ ph=new WebSocket('ws://localhost:'+port);
    ph.on('open',()=>ph.send(JSON.stringify({t:'join',room:code,name:'Tester'})));
    ph.on('message',d=>{const m=JSON.parse(d); if(m.t==='error')return reject(new Error(m.text)); if(m.t!=='state')return;
      const pub=m.pub, pr=m.priv, s=o=>ph.send(JSON.stringify(o));
      if(pub.phase==='lobby'&&!started){ if(pub.players.length<bots+1){s({t:'addBot'});return;} started=true; s({t:'mode',mode}); s({t:'start'}); return;}
      const g=pub.game; if(!g)return;
      if(g.phase==='missions'&&!pr.keepDone) s({t:'keepMissions',discard:pr.missionOffer[0].uid});
      if(g.phase==='setup'&&pr.setupLegal&&lastPlace!==g.setupTurn+pr.setupLegal.length){lastPlace=g.setupTurn+pr.setupLegal.length; s({t:'place',hex:pick(pr.setupLegal)});}
      if(g.phase==='era'&&!pr.eraPick) s({t:'eraPick',id:pick(g.eraOffer)});
      if(g.phase==='plan'&&lastPlanRound!==g.round){ lastPlanRound=g.round; const L=pr.legal;
        const opts=[]; if(L.found.length)opts.push({type:'found',target:pick(L.found)}); if(L.spire.length)opts.push({type:'spire',target:pick(L.spire)});
        if(L.lane.length)opts.push({type:'lane',lane:pick(L.lane)}); if(L.strike.length){const[a,b]=pick(L.strike);opts.push({type:'strike',from:a,to:b});}
        opts.push({type:'fleet',n:2,place:pick(L.fleetPlace)||'x',move:L.move.length?{from:L.move[0][0],to:L.move[0][1],n:1}:null});
        if(L.research.length)opts.push({type:'research',choice:pick(L.research)});
        if(pr.surveyOffer) s({t:'survey',uid:pr.surveyOffer[0].uid});
        s({t:'exchange',give:'credits',get:'ore'});
        const other=pub.players.find(p=>p.id!==pr.pid); if(other) s({t:'offer',to:other.id,give:{credits:1},get:{ore:1}});
        s({t:'plan',cmds:[pick(opts),pick(opts)],rank:g.pool.map(c=>c.uid).reverse(),play:pr.held.map(c=>({uid:c.uid,target:(pr.legal.shields[0]||null)})),engage:true});
      }
      if(pr.offersIn&&pr.offersIn.length) for(const o of pr.offersIn) s({t:'offerReply',id:o.id,accept:Math.random()<.5});
    });}
});}
server.listen(0, async()=>{ const port=server.address().port; const results=[];
  try{ for(const mode of ['quick','standard','advanced']) for(const bots of [1,3,5,7]) results.push(await play(port,mode,bots)); }
  catch(e){ console.error('FAIL',e); process.exit(1); }
  for(const r of results) console.log(r.mode, 'players', r.bots+1, 'ended round', r.round, 'scores', r.rows.join(','), '|', r.log.join(' / '));
  process.exit(0);});
