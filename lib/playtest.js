'use strict';
// Optional, in-memory, server-side playtest telemetry. No tokens, network calls or persistence.
const COMMANDS = ['found', 'spire', 'lane', 'fleet', 'research', 'strike'];
const now = () => Date.now();
const iso = n => new Date(n).toISOString();
const phaseLabel = { missions: 'Missions', setup: 'Landing', era: 'Era', income: 'Income', plan: 'Plan', reveal: 'Reveal', over: 'Over' };
const clone = obj => JSON.parse(JSON.stringify(obj));
const average = nums => nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
const formatSeconds = ms => (ms / 1000).toFixed(1) + 's';
function create(room, game, scores) {
  if (!room.playtestEnabled) return null;
  const ts = now();
  return {
    schema: 'starfall.playtest.v1', enabled: true,
    session: { room: room.code, mode: room.mode, map: game.R <= 3 ? 'small' : 'large', radius: game.R, playerCount: room.players.length, beganAt: iso(ts), beganMs: ts,
      players: room.players.map((p, seat) => ({ pid: p.id, seat: seat + 1, name: p.name, avatar: p.avatar, botAtStart: !!p.isAI })) },
    phases: [], rounds: [], commands: [], trades: [], strikes: [], tolls: [],
    _phaseOpen: null, _roundOpen: null, _report: null
  };
}
function setPhase(g, phase) {
  const t = g.playtest;
  if (t) {
    const ts = now();
    if (t._phaseOpen) {
      const p = t._phaseOpen;
      t.phases.push({ round: p.round, phase: p.phase, startedAt: iso(p.began), durationMs: Math.max(0, ts - p.began) });
    }
    t._phaseOpen = { round: g.round, phase, began: ts };
  }
  g.phase = phase;
}
function beginRound(room, influence) {
  const g = room.game, t = g.playtest;
  if (!t) return;
  const ts = now();
  t._roundOpen = { round: g.round, began: ts, before: Object.fromEntries(room.players.map(p => [p.id, influence(g, p.id)])) };
}
function endRound(room, influence) {
  const g = room.game, t = g.playtest;
  if (!t || !t._roundOpen) return;
  const p = t._roundOpen, end = now();
  t.rounds.push({ round: p.round, startedAt: iso(p.began), durationMs: Math.max(0, end - p.began),
    influenceBefore: p.before, influenceAfter: Object.fromEntries(room.players.map(x => [x.id, influence(g, x.id)])) });
  t._roundOpen = null;
}
function command(g, pid, slot, cmd, failure, extra = null) {
  const t = g.playtest;
  if (!t) return;
  t.commands.push({ round: g.round, pid, slot, type: cmd.type, target: cmd.target || cmd.lane || cmd.place || cmd.to || null,
    result: failure ? 'failed' : 'success', reason: failure || null, outcome: extra || null });
}
function trade(g, kind, data) {
  if (!g.playtest) return;
  g.playtest.trades.push(Object.assign({ round: g.round, kind }, clone(data)));
}
function strike(g, details) { if (g.playtest) g.playtest.strikes.push(Object.assign({ round: g.round }, clone(details))); }
function finish(room, influence, results) {
  const g = room.game, t = g.playtest;
  if (!t || t._report) return t?._report || null;
  endRound(room, influence);
  setPhase(g, 'over');
  const ended = now();
  const counts = Object.fromEntries(COMMANDS.map(type => [type, t.commands.filter(c => c.type === type).length]));
  const failures = t.commands.filter(c => c.result === 'failed');
  const failedPerPlayerRound = {};
  for (const c of failures) {
    const key = `${c.pid}:${c.round}`;
    failedPerPlayerRound[key] = (failedPerPlayerRound[key] || 0) + 1;
  }
  const proposals = t.trades.filter(e => e.kind === 'offer_proposed').length;
  const accepted = t.trades.filter(e => e.kind === 'offer_resolved' && e.status === 'accepted').length;
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const summary = {
    averageRoundSeconds: +(average(t.rounds.map(r => r.durationMs)) / 1000).toFixed(2),
    failureRate: t.commands.length ? +(failures.length / t.commands.length).toFixed(4) : 0,
    totalCommands: t.commands.length, failedCommands: failures.length, failedPerPlayerRound,
    commandCounts: counts, mostUsed: sorted[0]?.[0] || null, leastUsed: sorted.at(-1)?.[0] || null,
    tradeOffersProposed: proposals, tradeOffersAccepted: accepted,
    bankExchanges: t.trades.filter(e => e.kind === 'bank_exchange' && e.success).length,
    strikes: t.strikes.length, tollCreditsPaid: (t.tolls || []).reduce((n,x)=>n+x.credits,0)
  };
  const report = {
    schema: t.schema,
    session: Object.assign({},t.session, { endedAt: iso(ended), durationMs: ended-t.session.beganMs }),
    phases: t.phases, rounds: t.rounds, commands: t.commands, trades: t.trades, strikes: t.strikes, tolls: t.tolls || [],
    finalScores: clone(results.rows), winners: clone(results.winners), summary
  };
  delete report.session.beganMs;
  const md = [
    '# Starfall Lanes — Playtest Summary',
    '', `Mode: **${t.session.mode}** · Players: **${t.session.playerCount}** · Map: **${t.session.map}**`,
    `Played: ${t.session.beganAt} · Rounds: ${t.rounds.length}`,
    `Average round: **${formatSeconds(summary.averageRoundSeconds * 1000)}** · Failed commands: **${failures.length} / ${t.commands.length} (${(summary.failureRate*100).toFixed(1)}%)**`,
    `Trades: **${accepted} / ${proposals} offers accepted**, ${summary.bankExchanges} bank exchanges · Strikes: ${t.strikes.length} · Hyperlane tolls paid: ${summary.tollCreditsPaid} Credits`,
    '', '## Time spent in each phase', '', '| Phase | Total |', '|---|---:|',
    ...Object.entries(phaseLabel).filter(([k]) => k!=='over').map(([key,label]) => `| ${label} | ${formatSeconds(t.phases.filter(p=>p.phase===key).reduce((s,p)=>s+p.durationMs,0))} |`),
    '', '## Influence by round', '',
    `| Round | ${room.players.map(p=>p.name.replaceAll('|','/')).join(' | ')} |`,
    `|---|${room.players.map(()=> '---:|').join('')}`,
    ...t.rounds.map(r=>`| ${r.round} | ${room.players.map(p=>r.influenceAfter[p.id] ?? 0).join(' | ')} |`),
    '', '## Command use', '', '| Command | Used | Failed |', '|---|---:|---:|',
    ...COMMANDS.map(k=>`| ${k} | ${counts[k]} | ${failures.filter(c=>c.type===k).length} |`),
    '', '## Failed commands by player and round', '', '| Player | Round | Failures |', '|---|---:|---:|',
    ...(Object.entries(failedPerPlayerRound).length ? Object.entries(failedPerPlayerRound).map(([k,v])=>{const at=k.lastIndexOf(':');const pid=k.slice(0,at);return `| ${room.players.find(p=>p.id===pid)?.name.replaceAll('|','/') || pid} | ${k.slice(at+1)} | ${v} |`;}) : ['| None | — | 0 |']),
    '', '## Final scores', '', '| Player | Final Influence | Stations | Long Lanes | Trade Routes | Missions | Trophies | Bonuses | Baron cards | Penalty |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...results.rows.map(r=> {const b=r.breakdown;return `| ${room.players.find(p=>p.id===r.pid)?.name.replaceAll('|','/')||r.pid} | ${r.final} | ${b.stations} | ${b.lanes || 0} | ${b.tradeRoutes || 0} | ${b.missions} | ${b.trophies} | ${b.bonuses} | ${b.barons} | ${b.penalty} |`;}),
    '', '> Real-player notes (boredom, rules questions, laughs) must be recorded separately on the printable playtest sheet. Simulated timings are not representative of human sessions.',
    ''
  ].join('\n');
  t._report = { json: report, markdown: md };
  return t._report;
}
module.exports = { create, setPhase, beginRound, endRound, command, trade, strike, finish };
