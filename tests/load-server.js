'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('node:module');

// Production still requires `ws`. This test-only loader uses a tiny inert stand-in
// so server rules can be exercised on an isolated VM without npm/network access.
module.exports = function loadServer(seed = 0x57A6FA11, opts = {}) {
  const filename = path.join(__dirname, '..', 'server.js');
  const intervals = [];
  const serverRequire = createRequire(filename);
  const math = Object.create(Math);
  math.random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  class StubWebSocketServer {
    constructor() { this.clients = new Set(); }
    on() { return this; }
  }
  const context = {
    require(id) { return id === 'ws' ? { WebSocketServer: StubWebSocketServer } : serverRequire(id); },
    module: { exports: {} }, exports: {},
    __dirname: path.dirname(filename), __filename: filename,
    process: { env: { ...process.env, FAST: '1', ...(opts.simulation ? { STARFALL_SIMULATION: '1', STARFALL_SIM_TUNING: JSON.stringify(opts.tuning || {}) } : {}) } },
    console, Math: math, Date, Buffer, URL,
    setTimeout: opts.instant ? (fn, _delay, ...args) => setImmediate(fn, ...args) : setTimeout,
    clearTimeout: opts.instant ? clearImmediate : clearTimeout,
    setInterval(fn, period) {
      const h = opts.instant && period === 5 ? setImmediate(fn) : setInterval(fn, period);
      intervals.push(h); return h;
    },
    clearInterval(h) { if (opts.instant) { clearImmediate(h); clearInterval(h); } else clearInterval(h); }
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return { ...context.module.exports, cleanup() {
    intervals.forEach(clearInterval);
    try { context.module.exports.server.close(); } catch (_) { /* may not be listening */ }
  } };
};
