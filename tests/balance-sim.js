'use strict';
/**
 * Seeded, local-only 2–8 player all-bot balance cohort. No network, no ws package.
 * Usage: node tests/balance-sim.js [--games 300] [--seed 61803]
 *    [--mode quick|standard|advanced] [--players 2..8]
 *    [--profile baseline|routes2|routes3] [--output docs/balance/latest]
 *
 * Uses production rules in an isolated VM. Timer acceleration is TEST ONLY; no
 * gameplay or resource shortcuts. Each game is deterministic for its seed.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const loadServer = require('./load-server');
const MODES = ['quick','standard','advanced'];
const HOUSES = ['kaia','zibzob','oolu','vex','pyrrhus','nim','skrill','bramble'];
// The same authoritative server TUNING object defines simulation defaults.
const DEFAULT_TUNING=(()=>{const app=loadServer(0x6B18);try{return app.TUNING;}finally{app.cleanup();}})();
const PROFILES = {
  baseline: {},
  beforeTuning: {quickLongLaneInfluence:1,standardTarget:15},
  quickRoutes2: {quickLongLaneInfluence:2},
  standard16: {standardTarget:16},
  advanced16: {advancedTarget:16},
};
const statsAvg = vals => vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
const round = (n, dp=4) => +n.toFixed(dp);
const hash = (str) => {let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function parseArgs(args){
  const flags={games:DEFAULT_TUNING.balanceGamesPerConfiguration,seed:61803,profile:'baseline',output:null};
  for(let i=0;i<args.length;i++){
    const a=args[i];
    if(!a.startsWith('--'))throw Error(`Unexpected argument ${a}`);
    if(a==='--help'){console.log('node tests/balance-sim.js [--games 300] [--seed 61803] [--mode quick|standard|advanced] [--players 2..8] [--profile baseline|routes2|routes3] [--output docs/balance/latest]');process.exit(0);}
    if(!['games','seed','mode','players','profile','output'].includes(a.slice(2)))throw Error(`Unknown option ${a}`);
    if(++i>=args.length)throw Error(`Missing value for ${a}`);
    flags[a.slice(2)]=args[i];
  }
  flags.games=Number(flags.games);flags.seed=Number(flags.seed);flags.players=flags.players==null?null:Number(flags.players);
  if(!Number.isSafeInteger(flags.games)||flags.games<1||flags.games>20000)throw Error('games must be 1..20000');
  if(!Number.isSafeInteger(flags.seed)||flags.seed<0||flags.seed>0xffffffff)throw Error('seed must be uint32');
  if(flags.players!==null&&(!Number.isInteger(flags.players)||flags.players<2||flags.players>8))throw Error('players must be 2..8');
  if(flags.mode&&!MODES.includes(flags.mode))throw Error('invalid mode');
  if(!Object.prototype.hasOwnProperty.call(PROFILES,flags.profile))throw Error('invalid profile');
  if(!flags.output) flags.output=flags.mode||flags.players?`docs/balance/adhoc-${flags.profile}-${flags.mode||'all'}-${flags.players||'all'}`:'docs/balance/latest';
  return flags;
}
function percentile(sorted, p){ if(!sorted.length)return null;const i=(sorted.length-1)*p;return sorted[Math.floor(i)]*(1-(i%1))+sorted[Math.ceil(i)]*(i%1); }
function summarise(games, mode, n){
  const target=games[0]?.target??(mode==='quick'?10:15);
  const winsBySeat=Array(n).fill(0), exposures=Object.fromEntries(HOUSES.map(h=>[h,0])), winsByHouse=Object.fromEntries(HOUSES.map(h=>[h,0]));
  const sources=['stations','lanes','tradeRoutes','missions','trophies','bonuses','barons','penalty'];
  const total=Object.fromEntries(sources.map(s=>[s,0]));
  for(const game of games){
    for(const a of game.appearances)exposures[a.house]++;
    for(const v of game.wins){winsBySeat[v.seat] += v.share;winsByHouse[v.house] += v.share;}
    for(const r of game.scores)for(const source of sources)total[source] += r.breakdown[source]||0;
  }
  const winRatesBySeat=winsBySeat.map(x=>round(x/games.length));
  const winRatesByHouse=Object.fromEntries(HOUSES.map(h=>[h,exposures[h]?round(winsByHouse[h]/exposures[h]):null]));
  const targetHit=games.filter(g=>g.metTarget).length/games.length;
  const meanFailures=games.reduce((s,g)=>s+g.failCount,0);
  const meanCommands=games.reduce((s,g)=>s+g.cmdCount,0);
  const metrics={mode,players:n,games:games.length,target,targetReachedPct:round(100*targetHit,2),meanRounds:round(statsAvg(games.map(g=>g.round))),medianRounds:round(percentile(games.map(g=>g.round).sort((a,b)=>a-b),0.5)),meanWinningInfluence:round(statsAvg(games.map(g=>g.best))),firstPlayerWinPct:round(100*statsAvg(games.map(g=>g.wins.some(w=>w.seat===g.firstSeat)?g.wins.filter(w=>w.seat===g.firstSeat).reduce((s,w)=>s+w.share,0):0)),2),winRatesBySeat,winRatesByHouse,houseAppearances:exposures,failedCommandPct:meanCommands?round(100*meanFailures/meanCommands,2):0,meanTollCreditsPaid:round(statsAvg(games.map(g=>g.tolls))),meanInfluenceBySource:Object.fromEntries(sources.map(s=>[s,round(total[s]/(games.length*n))]))};
  const fair=1/n;
  const flagged=[];
  if(targetHit<DEFAULT_TUNING.balanceTargetMinPct/100) flagged.push(`Target reached in ${round(targetHit*100,2)}%, below ${DEFAULT_TUNING.balanceTargetMinPct}%`);
  if(targetHit>DEFAULT_TUNING.balanceTargetMaxPct/100) flagged.push(`Target reached in ${round(targetHit*100,2)}%, above ${DEFAULT_TUNING.balanceTargetMaxPct}%`);
  if(metrics.firstPlayerWinPct/100 >DEFAULT_TUNING.balanceFairnessMultiplier*fair)flagged.push(`First-player win ${metrics.firstPlayerWinPct}% > ${(100*DEFAULT_TUNING.balanceFairnessMultiplier/n).toFixed(1)}%`);
  if(mode==='advanced')for(const h of HOUSES){if(exposures[h]>=DEFAULT_TUNING.balanceMinHouseAppearances && winsByHouse[h]/exposures[h]>DEFAULT_TUNING.balanceFairnessMultiplier*fair) flagged.push(`${h} win ${round(100*winsByHouse[h]/exposures[h],1)}% > ${(100*DEFAULT_TUNING.balanceFairnessMultiplier/n).toFixed(1)}% (n=${exposures[h]})`);}
  metrics.flags=flagged;
  return metrics;
}
async function runGroup(mode,n,count,seed,tuning){
  const s=(seed^hash(`${mode}:${n}`))>>>0;
  const app=loadServer(s,{instant:true,simulation:true,tuning});const I=app._internal;
  const games=[];
  try {
    for(let iteration=0;iteration<count;iteration++){
      // Rotate house choice across seats for smaller tables; all 8 houses
      // appear once per match when n=8. House rates count appearances.
      const room=I.makeRoom();room.mode=mode;room.playtestEnabled=true;
      room.players=Array.from({length:n},(_,i)=>({id:`seat-${i}`,token:`tok-${i}`,name:`Sim ${i+1}`,avatar:(i+iteration)%8,isAI:true,bot:true,ws:null}));
      I.startGame(room);
      const game=room.game;
      const firstSeat=game.firstIdx;
      let countTicks=0;
      while(game.phase!=='over'){
        if(++countTicks>200000)throw Error(`Game stuck: ${mode}/${n}/${iteration} phase=${game.phase}`);
        await new Promise(resolve=>setImmediate(resolve));
      }
      if(!game.results?.rows || game.results.rows.length!==n) throw Error(`Missing final scores ${mode} ${n}`);
      const report=game.playtestReport?.json;
      if(!report||!report.summary||!Array.isArray(report.commands))throw Error(`Missing playtest data for ${mode}/${n}`);
      const rows=game.results.rows;
      for(const r of rows){
        const b=r.breakdown;
        const expected=b.stations+b.lanes+b.tradeRoutes+b.missions+b.trophies+b.bonuses+b.barons-b.penalty;
        assert.equal(r.final,expected,`score breakdown ${mode}/${n}`);
      }
      const winners=game.results.winners;
      const wins=winners.map(pid=>{
        const seat=room.players.findIndex(p=>p.id===pid);
        return {seat,house:HOUSES[room.players[seat].avatar],share:1/winners.length};
      });
      const appearances=room.players.map((p,seat)=>({seat,house:HOUSES[p.avatar]}));
      const best=rows[0].final;
      games.push({round:game.round,firstSeat,best,metTarget:best>=game.M.target,appearances,wins,
        target:game.M.target, scores:rows.map(r=>({seat:room.players.findIndex(p=>p.id===r.pid),final:r.final,breakdown:r.breakdown})),
        failCount:report.summary.failedCommands,cmdCount:report.summary.totalCommands,tolls:report.summary.tollCreditsPaid});
      game.alive=false;app.rooms.delete(room.code);
    }
  } finally {app.cleanup();}
  return summarise(games,mode,n);
}
function markdown(report){
  const lines=['# Starfall Lanes — Seeded bot balance report','',`Generated: ${report.generatedAt} · Seed: \`${report.seed}\` · Games per configuration: **${report.gamesPerConfig}** · Profile: **${report.profile}**`,
    '',`Total completed: **${report.totalGames}** · In-process production rules, test-only accelerated timers.`,
    '', '> **Not human balance evidence.** AI choices, simulated timing and small samples may distort results. A threshold reached below 60%, above 95%, or first/house seat exceeding 1.5× equal share is flagged.',
    '', '| Mode | Players | Games | Target hit | Mean rounds | Median | Winner Influence | First seat win | Failed orders | Avg toll Credits | Flags |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  for(const x of report.groups)lines.push(`| ${x.mode} | ${x.players} | ${x.games} | ${x.targetReachedPct}% | ${x.meanRounds} | ${x.medianRounds} | ${x.meanWinningInfluence} | ${x.firstPlayerWinPct}% | ${x.failedCommandPct}% | ${x.meanTollCreditsPaid} | ${x.flags.length?'**'+x.flags.join('; ')+'**':'—'} |`);
  lines.push('', '## Influence source mix (mean per player)', '', '| Mode | Players | Stations | Long lanes | Trade routes | Missions | Trophies | Bonuses | Baron cards | Penalty |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for(const x of report.groups){const v=x.meanInfluenceBySource;lines.push(`| ${x.mode} | ${x.players} | ${v.stations} | ${v.lanes} | ${v.tradeRoutes} | ${v.missions} | ${v.trophies} | ${v.bonuses} | ${v.barons} | -${v.penalty} |`);}
  lines.push('','## Win rate by starting seat', '', '| Mode | Players | Winning shares by seat (1–N) |', '|---|---:|---|');
  for(const x of report.groups)lines.push(`| ${x.mode} | ${x.players} | ${x.winRatesBySeat.map(v=>(v*100).toFixed(1)+'%').join(' · ')} |`);
  lines.push('', '## Advanced — win rate per house leader', '', '| Players | '+HOUSES.join(' | ')+' |','|---:|'+HOUSES.map(()=>'---:|').join(''));
  for(const x of report.groups.filter(x=>x.mode==='advanced'))lines.push(`| ${x.players} | ${HOUSES.map(h=>x.winRatesByHouse[h]==null?'—':(x.winRatesByHouse[h]*100).toFixed(1)+'% (n='+x.houseAppearances[h]+')').join(' | ')} |`);
  lines.push('', '## Interpretation', '', 'Seat and house rates are per eligible seat/house appearance, split proportionally for tied winners. Trophies and other sources are final-score contributions, **not** per-round flows. “Reached target” means final winning Influence equals or exceeds the mode target.', '', '## Simulation methodology', '', 'Each configuration runs a single seeded VM with the production game server and its existing AI. Bot starting houses rotate across seats; the rules still use the actual map generator, drafts, events and command-resolution order. Only artificial wait timers are skipped. The production server never reads simulator tuning values unless explicitly launched with a test-only environment flag; normal `npm start` is unaffected. No real player inputs, real WebSockets or device interaction is measured.', '');
  return lines.join('\n');
}
async function main(){
  const flags=parseArgs(process.argv.slice(2));
  const groups=[];const start=Date.now();
  for(const mode of flags.mode?[flags.mode]:MODES)for(const n of flags.players?[flags.players]:[2,3,4,5,6,7,8]){
    const t=Date.now(),v=await runGroup(mode,n,flags.games,flags.seed,PROFILES[flags.profile]);
    groups.push(v);
    console.log(`[${flags.profile}] ${mode.padEnd(8)} ${n} players × ${flags.games} games: target ${v.targetReachedPct}% | winner ${v.meanWinningInfluence} | failures ${v.failedCommandPct}% | ${v.flags.length} flags | ${((Date.now()-t)/1000).toFixed(1)}s`);
  }
  const report={schema:'starfall.balance.v1',generatedAt:new Date().toISOString(),seed:flags.seed,profile:flags.profile,tuningOverrides:PROFILES[flags.profile],gamesPerConfig:flags.games,totalGames:groups.reduce((s,g)=>s+g.games,0),groups,elapsedSeconds:round((Date.now()-start)/1000,2)};
  const basename=path.resolve(__dirname,'..',flags.output);
  fs.mkdirSync(path.dirname(basename),{recursive:true});fs.writeFileSync(basename+'.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(basename+'.md',markdown(report));
  console.log(`Saved ${basename}.{json,md} in ${report.elapsedSeconds}s`);
}
if(require.main===module)main().catch(err=>{console.error(err);process.exitCode=1;});
module.exports={parseArgs,summarise,markdown,PROFILES,HOUSES};
