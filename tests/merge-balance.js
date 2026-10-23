'use strict';
/** Merge the completed 300-game per-configuration samples into a release report.
 * Advanced mode is unchanged by the Quick-only lane / Standard-only target
 * tuning, so the 7 existing 300-game Advanced cohorts remain applicable.
 */
const fs=require('node:fs');
const path=require('node:path');
const {markdown}=require('./balance-sim');
const dir=path.join(__dirname,'..','docs','balance');
const parts=path.join(dir,'parts');
const read=file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
const before=read('before.json');
if(before.totalGames!==6300 || before.groups.length!==21 || before.profile!=='baseline')throw Error('Expected the untouched 6300-game baseline');
const modes=['quick','standard','advanced'];
const after=[];
for(const mode of modes)for(let n=2;n<=8;n++){
  const stem = mode==='advanced'?`baseline-advanced-${n}`
    : mode==='quick' && [4,5,6,7].includes(n)?`quickRoutes2-quick-${n}`
    : mode==='standard' && [4,6].includes(n)?`standard16-standard-${n}`
    : `after-${mode}-${n}`;
  const data=JSON.parse(fs.readFileSync(path.join(parts,stem+'.json'),'utf8'));
  if(data.totalGames!==300||data.seed!==before.seed||data.groups.length!==1)throw Error('Mismatched rerun: '+stem);
  const g=data.groups[0];
  const expectedTarget=mode==='standard'?16:mode==='quick'?10:15;
  if(g.mode!==mode||g.players!==n||g.target!==expectedTarget)throw Error('Incorrect mode/player/target: '+stem);
  after.push(g);
}
const latest={schema:'starfall.balance.v1',generatedAt:new Date().toISOString(),seed:before.seed,
  profile:'release-phase6',tuningDefaults:{quickLongLaneInfluence:2,standardTarget:16,advancedTarget:15},
  gamesPerConfig:300,totalGames:6300,
  groups:after,
  method:'300 games for every mode x players 2-8. The Advanced cohorts are reused from before because gameplay, targets and abilities are identical in Advanced. Re-run only the Quick and Standard modes after mode-specific tuning. Test-only accelerated waiting; production rules unchanged beyond the two explicit tuning values.'};
const comparisons=after.map(g=>{
  const b=before.groups.find(x=>x.mode===g.mode&&x.players===g.players);
  return {mode:g.mode,players:g.players,targetBefore:b.target,targetAfter:g.target,
    targetReachedBeforePct:b.targetReachedPct,targetReachedAfterPct:g.targetReachedPct,
    changePercentagePoints:+(g.targetReachedPct-b.targetReachedPct).toFixed(2),
    flaggedBefore:b.flags.length>0,flaggedAfter:g.flags.length>0,
    meanWinnerBefore:b.meanWinningInfluence,meanWinnerAfter:g.meanWinningInfluence,
    failRateBeforePct:b.failedCommandPct,failRateAfterPct:g.failedCommandPct};
});
const comparison={schema:'starfall.balance.comparison.v1',seed:before.seed,gamesPerConfig:300,
  beforeTuning:{quickLongLaneInfluence:1,standardTarget:15,advancedTarget:15},
  afterTuning:latest.tuningDefaults,
  beforeFlags:before.groups.filter(x=>x.flags.length).length,
  afterFlags:after.filter(x=>x.flags.length).length,
  groups:comparisons};
fs.writeFileSync(path.join(dir,'latest.json'),JSON.stringify(latest,null,2)+'\n');
fs.writeFileSync(path.join(dir,'latest.md'),markdown(latest));
fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');
const lines=[
  '# Phase 6 — Balance before and after tuning','',
  `Seed: ${before.seed}. 300 games per configuration. Baseline: 6,300 games; reruns: 4,200 Quick/Standard games; unchanged Advanced results reused.`,
  '', '**Changes applied:** Quick long hyperlanes earn 2 (was 1) Influence; Standard needs 16 (was 15) Influence to reach its target. Advanced remains unchanged. All other rules stay the same.',
  '', `Flagged configurations: **${comparison.beforeFlags}/21 before → ${comparison.afterFlags}/21 after** (target 60–95%, first-seat and house fairness ≤1.5× equal share).`,
  '', '| Mode | Players | Target before → after | Reached before | Reached after | Difference | Flag now |',
  '|---|---:|---:|---:|---:|---:|---|'];
for(const x of comparisons)lines.push(`| ${x.mode} | ${x.players} | ${x.targetBefore} → ${x.targetAfter} | ${x.targetReachedBeforePct}% | ${x.targetReachedAfterPct}% | ${x.changePercentagePoints>=0?'+':''}${x.changePercentagePoints} pp | ${x.flaggedAfter?'**Yes**':'No'} |`);
lines.push('','> **Caution:** These are deterministic bot simulations, not evidence of human fun, fairness or timing. House strength is partly entangled with bot decision-making; validate through live playtests. Simulation-specific timer acceleration does not apply to hosted games.',
  '', 'The full current-mode tables (rounds, failed commands, toll Credits, Influence-source breakdown, seat wins and Advanced house wins) are in [latest.md](latest.md) and [latest.json](latest.json). The previous-mode numbers are preserved in [before.md](before.md) and [before.json](before.json).', '');
fs.writeFileSync(path.join(dir,'comparison.md'),lines.join('\n'));
console.log(`Merged ${latest.totalGames} current-mode samples; ${comparison.beforeFlags} flagged before, ${comparison.afterFlags} flagged after; wrote latest.json/md and comparison.json/md`);
