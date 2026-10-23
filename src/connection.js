/* Shared TV/phone WebSocket adapter. Game UIs supply the role-specific
 * join/rejoin message; the transport never interprets game state.
 */
function Conn(onMsg, onOpen, onStatus) {
  let ws = null, ping = null, retry = null, stopped = false, generation = 0;
  function clearTimers() {
    if (ping !== null) { clearInterval(ping); ping = null; }
    if (retry !== null) { clearTimeout(retry); retry = null; }
  }
  function send(o) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(o));
  }
  function open() {
    if (stopped) return;
    clearTimers();
    const current = ++generation;
    try {
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    } catch (_) {
      onStatus && onStatus(false);
      retry = setTimeout(() => { retry = null; open(); }, 1500);
      return;
    }
    ws.onopen = () => {
      if (stopped || current !== generation) return;
      onStatus && onStatus(true);
      onOpen(send);
      if (ping !== null) clearInterval(ping);
      ping = setInterval(() => send({ t: 'ping' }), 20000);
    };
    ws.onmessage = e => {
      if (stopped || current !== generation) return;
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m && typeof m === 'object' && !Array.isArray(m)) onMsg(m);
    };
    ws.onclose = () => {
      if (current !== generation) return;
      clearTimers();
      if (stopped) return;
      onStatus && onStatus(false);
      retry = setTimeout(() => { retry = null; open(); }, 1500);
    };
    ws.onerror = () => { /* The close handler owns the retry. */ };
  }
  function stop() {
    stopped = true;
    generation++;
    clearTimers();
    try { if (ws) ws.close(); } catch (_) { /* may already be closed */ }
    ws = null;
  }
  function restart() {
    if (!stopped) return;
    stopped = false;
    open();
  }
  open();
  return { send, stop, restart };
}
