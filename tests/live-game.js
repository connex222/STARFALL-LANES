'use strict';
/**
 * Starfall Lanes Phase 7 — real TCP/WebSocket acceptance test.
 * Connects to the production server as one TV plus eight independent phones.
 * Never imports the VM-based tests/load-server stub: this is a real socket test.
 * Run: npm install && npm run test:live
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
let WebSocket;
try { WebSocket = require('ws'); }
catch { console.error('Phase 7 live test needs the real ws dependency. Run npm install first.'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const MAX_MS = Number(process.env.LIVE_TEST_TIMEOUT_MS || 45000);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (condition, label, timeout = 7000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await condition();
    if (result) return result;
    await delay(8);
  }
  throw new Error(`Timed out: ${label}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject); s.listen(0, '127.0.0.1', () => {
    const port = s.address().port; s.close(() => resolve(port));
  });
});
const health = port => new Promise(resolve => {
  const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 800 }, res => {
    let data = ''; res.on('data', chunk => { data += chunk; });
    res.on('end', () => resolve(res.statusCode === 200 && data === 'ok'));
  });
  req.once('error', () => resolve(false)); req.once('timeout', () => { req.destroy(); resolve(false); });
});

class Client {
  constructor(socket, label, registry) {
    this.socket = socket; this.label = label; this.messages = []; this.welcome = null;
    this.state = null; this.replaced = false; this.closed = false;
    this.sentKeep = false; this.setupKey = null; this.planKey = null;
    socket.on('message', raw => {
      let data; try { data = JSON.parse(raw.toString()); }
      catch (error) { registry.errors.push(new Error(`${label}: malformed server JSON: ${error.message}`)); return; }
      this.messages.push(data);
      if (data.t === 'welcome') this.welcome = data;
      if (data.t === 'state') this.state = data;
      if (data.t === 'replaced') this.replaced = true;
    });
    socket.on('error', error => registry.errors.push(new Error(`${label} socket: ${error.message}`)));
    socket.on('close', code => { this.closed = true; this.closeCode = code; });
  }
  send(data) {
    if (this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(data)); return true;
  }
  async welcomeSoon() { return until(() => this.welcome, this.label + ' welcome'); }
  async stateSoon(predicate, label, timeout) { return until(() => this.state && predicate(this.state) && this.state, label || this.label + ' state', timeout); }
  close() { try { this.socket.close(); } catch (_) { /* nothing */ } }
}

async function main() {
  const port = await freePort();
  const registry = { errors: [], clients: [], serverOutput: '', child: null };
  const timeout = setTimeout(() => registry.child?.kill('SIGKILL'), MAX_MS);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), FAST: '1' }, stdio: ['ignore','pipe','pipe']
  });
  registry.child = child;
  child.stdout.on('data', b => { registry.serverOutput += b.toString(); });
  child.stderr.on('data', b => { registry.serverOutput += b.toString(); });
  const url = `ws://127.0.0.1:${port}`;
  const connect = label => new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { perMessageDeflate: false });
    let settled = false;
    const t = setTimeout(() => { ws.terminate(); if (!settled) reject(new Error('WebSocket connection timeout: '+label)); }, 3000);
    ws.once('open', () => {
      settled = true; clearTimeout(t);
      const c = new Client(ws, label, registry); registry.clients.push(c); resolve(c);
    });
    ws.once('error', error => { if (!settled) { settled = true; clearTimeout(t); reject(error); } });
  });
  const check = (ok, label) => { assert.ok(ok, label); console.log('PASS '+label); };

  try {
    await until(async () => await health(port), 'server HTTP health', 5000); // async condition supported below
    // The HTTP server is the actual production server. Validate readiness before test traffic.
    check(await health(port), 'production server HTTP health');
    const tv = await connect('TV'); tv.send({ t:'tvCreate' });
    const tvWelcome = await tv.welcomeSoon();
    const room = tvWelcome.room;
    check(/^[A-Z]{4}$/.test(room), 'TV creates four-letter room code');

    const phones = [];
    for (let i = 0; i < 8; i++) {
      const c = await connect('Phone '+(i+1));
      c.send({ t: 'join', room, name: 'Test'+(i+1) });
      await c.welcomeSoon(); phones.push(c);
    }
    await tv.stateSoon(s => s.pub.players.length === 8, 'eight phones joined');
    check(new Set(phones.map(c => c.welcome.playerId)).size === 8, 'eight unique phone seats and tokens');
    const host = phones[0];
    check(tv.state.pub.hostId === host.welcome.playerId, 'first phone is host');

    // The live server must not interpret malformed JSON as an action.
    const malformed = await connect('Malformed probe');
    malformed.socket.send('{bad json');
    malformed.send({ t:'ping' });
    await until(() => malformed.messages.some(m => m.t === 'pong'), 'server accepts good packet after malformed JSON');
    malformed.close();
    check(true, 'malformed JSON ignored without taking down the room');

    // Oversize > ws.maxPayload=32KiB: the server must close this offender only.
    const oversized = await connect('Oversized probe');
    oversized.socket.send(JSON.stringify({ t:'ping', padding:'x'.repeat(40000) }));
    await until(() => oversized.closed, 'oversized packet closes offending WebSocket');
    check(oversized.closeCode === 1009 || oversized.closeCode === 1006,
      'oversized payload rejected by the real ws server');
    check(await health(port), 'server remains healthy after oversized packet');

    host.send({ t:'mode', mode:'quick' });
    host.send({ t:'revealSpeed', speed:'fast' });
    host.send({ t:'playtestToggle', enabled:true });
    await host.stateSoon(s => s.pub.mode === 'quick' && s.pub.revealSpeed === 'fast' && s.pub.playtestEnabled,
      'host mode and settings');
    check(true, 'host configures Quick, Fast reveal and opt-in playtest');
    phones[1].send({t:'mode',mode:'advanced'}); // unauthorised host-only change
    await delay(12);
    check(tv.state.pub.mode === 'quick', 'non-host cannot change game mode');

    // Start eight REAL phone connections; script mission and setup picks on the wire.
    host.send({ t:'start' });
    await tv.stateSoon(s => s.pub.game && s.pub.game.phase === 'missions', 'game begins');
    check(tv.state.pub.players.length === 8, 'eight-phone game starts');

    let scenarioDone = false;
    let scenarioRunning = false;
    let reconnectionChecked = false;
    let takeoverChecked = false;
    let botChecked = false;
    let activePhones = phones.slice();
    let highestRound = 0;
    let planMessageSent = 0;
    let setupMessagesSent = 0;
    let quit = false;

    const performPlanScenarios = async () => {
      if (scenarioRunning || scenarioDone) return;
      scenarioRunning = true;
      try {
        // Disconnect during Plan then rejoin with the stored credentials.
        const target = activePhones[2]; const saved = target.welcome;
        target.close(); await until(() => target.closed,'disconnected controller closes',900);
        const reconnect = await connect('Phone 3 reconnected');
        reconnect.send({ t:'join',room,playerId:saved.playerId,token:saved.token });
        await reconnect.welcomeSoon();
        check(reconnect.welcome.playerId===saved.playerId,'phone reconnect keeps seat and identity');
        activePhones[2] = reconnect; reconnectionChecked = true;
        // Simultaneous second device presents identical credentials: old socket replaced.
        const previous = activePhones[3], prevWelcome = previous.welcome;
        const replacement = await connect('Phone 4 second device');
        replacement.send({t:'join',room,playerId:prevWelcome.playerId,token:prevWelcome.token});
        await replacement.welcomeSoon();
        await until(()=>previous.replaced,'original device receives replaced notice',900);
        activePhones[3]=replacement; takeoverChecked=true;
        check(replacement.welcome.playerId===prevWelcome.playerId,'second device replaces same seat');
        // Disconnect the seat, transfer it to a bot, then hand control back.
        const dropped=activePhones[4], savedBot=dropped.welcome;
        const botPid=savedBot.playerId;
        dropped.close();
        await until(()=>dropped.closed,'dropped phone for bot handover',900);
        host.send({t:'toAI',pid:botPid});
        await host.stateSoon(s => s.pub.players.some(p=>p.id===botPid && p.isAI), 'AI handover', 900);
        host.send({t:'toAI',pid:botPid});
        await host.stateSoon(s => s.pub.players.some(p=>p.id===botPid && !p.isAI), 'return from AI', 900);
        const returned = await connect('Phone 5 returns after bot handover');
        returned.send({t:'join',room,playerId:savedBot.playerId,token:savedBot.token});
        await returned.welcomeSoon();
        activePhones[4]=returned;
        botChecked=true;
        check(returned.welcome.playerId===botPid, 'host returns dropped bot seat to phone');
        scenarioDone=true;
        // Bots can finish the game rapidly while still receiving state on eight phones.
        // Leave host scripted human; switch all seven others to server bots.
        for (const c of activePhones.slice(1)) host.send({ t:'toAI', pid:c.welcome.playerId });
        await host.stateSoon(s=>s.pub.players.filter(p=>p.isAI).length===7,'seven server bots');
      } finally { scenarioRunning=false; }
    };

    // We deliberately use the actual socket messages, not direct server function calls.
    const driver = setInterval(() => {
      if (quit || registry.errors.length) return;
      const s = tv.state, g=s?.pub?.game;
      if (!g || g.phase === 'over') return;
      highestRound=Math.max(highestRound,g.round||0);
      if (g.phase==='plan' && g.round===1 && !scenarioDone && !scenarioRunning) {
        performPlanScenarios().catch(e=>registry.errors.push(e));
      }
      for (const c of activePhones) {
        if (!c || c.closed || !c.welcome || !c.state?.priv) continue;
        const mine=c.state.priv,pid=c.welcome.playerId;
        const pub=c.state.pub, game=pub.game;
        if (!game) continue;
        const p=pub.players.find(p=>p.id===pid);
        if (p?.isAI) continue;
        if(game.phase==='missions' && !mine.keepDone && !c.sentKeep) {
          c.sentKeep=true; c.send({t:'keepMissions'});
        }
        if(game.phase==='setup' && game.setupTurn===pid && mine.setupLegal?.length) {
          const owned=game.hexes.filter(h=>h.owner===pid).length;
          const key=`${pid}:${owned}`;
          if(c.setupKey!==key) { c.setupKey=key; c.send({t:'place',hex:mine.setupLegal[0]}); setupMessagesSent++; }
        }
        if(game.phase==='plan' && (scenarioDone || game.round>1)) {
          const key=game.round;
          if(c.planKey!==key) {
            c.planKey=key;
            const loc=mine.legal?.fleetPlace?.[0];
            // A scripted human provides a valid command when Credits permit.
            const cmd=loc && mine.res.credits>0 ? {type:'fleet',place:loc,n:1}:null;
            c.send({t:'plan',cmds:[cmd,null,null],backup:null,rank:game.pool.map(d=>d.uid),engage:true});
            planMessageSent++;
          }
        }
      }
    }, 4);

    try {
      await until(() => {
        if (registry.errors.length) throw registry.errors[0];
        return tv.state?.pub?.game?.phase === 'over' && tv.state.pub.game.results;
      }, 'complete Quick match with eight seats', 22000);
    } finally { quit=true; clearInterval(driver); }
    check(reconnectionChecked && takeoverChecked && botChecked, 'reconnection, device takeover, bot handover all exercised');
    check(highestRound>=1 && highestRound<=8,'Quick completes in at most eight rounds');
    check(setupMessagesSent>=8 && planMessageSent>=1,'scripted setup and planning occurred over real sockets');
    const results=tv.state.pub.game.results;
    check(Array.isArray(results.rows)&&results.rows.length===8&&results.winners.length>=1,
      'game finishes with eight score rows and winner');
    const playtest = tv.state.pub.game.playtest?.report;
    check(playtest?.json?.schema === 'starfall.playtest.v1' && playtest.json.finalScores.length === 8
      && typeof playtest.markdown === 'string', 'opt-in JSON and Markdown playtest reports generated');
    check(registry.errors.length===0, 'no WebSocket protocol errors');
    check(await health(port), 'game server healthy after match');
    console.log('PHASE 7 LIVE MULTIPLAYER: PASS');
  } catch(error) {
    console.error('PHASE 7 LIVE MULTIPLAYER: FAIL:',error.stack||error);
    if (registry.serverOutput) console.error('Server output:\n'+registry.serverOutput.slice(-5000));
    process.exitCode=1;
  } finally {
    clearTimeout(timeout);
    for (const c of registry.clients) c.close();
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)), delay(2000)]);
    if(child.exitCode===null) child.kill('SIGKILL');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
