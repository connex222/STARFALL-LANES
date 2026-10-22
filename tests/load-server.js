'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Production still requires `ws`. This test-only loader uses a tiny inert stand-in
// so server rules can be exercised on an isolated VM without npm/network access.
module.exports = function loadServer(seed = 0x57A6FA11) {
  const filename = path.join(__dirname, '..', 'server.js');
  const intervals = [];
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
    require(id) { return id === 'ws' ? { WebSocketServer: StubWebSocketServer } : require(id); },
    module: { exports: {} }, exports: {},
    __dirname: path.dirname(filename), __filename: filename,
    process: { env: { ...process.env, FAST: '1' } },
    console, Math: math, Date, Buffer, URL,
    setTimeout, clearTimeout,
    setInterval(fn, period) { const h = setInterval(fn, period); intervals.push(h); return h; },
    clearInterval
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return { ...context.module.exports, cleanup() {
    intervals.forEach(clearInterval);
    try { context.module.exports.server.close(); } catch (_) { /* may not be listening */ }
  } };
};
