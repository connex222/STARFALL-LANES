# Shared TV + phone engine — Phase 8

This codebase retains one server-authoritative game referee (`server.js`) and separates its **reusable transport, room lifecycle and browser reconnection** into two modules. Starfall-specific orders, resources, scoring, map generation, house abilities, AI strategy and reveal timing remain in `server.js`.

## Server-side reusable module

`lib/room-engine.js` has no runtime dependencies. `server.js` injects its current room registry, RNG, token generator and callbacks. It supports:

| Function | Inputs and responsibility |
|---|---|
| `makeRoom({rooms,rnd,token})` | Generate an unused 4-letter code, room tokens, lobby defaults and room state |
| `handleHandshake(ws,msg,{rooms,makeRoom,token,avatars,consts,sync,send})` | Attach TV, add phone, reconnect the same seat by token, replace an older device, reject full/unknown rooms; returns `true` if handled |
| `sync(room,publicState,privateState)` | Repair host, send one public snapshot to TV, public+private snapshots to each current phone |
| `handleLobbyAction(room,actor,msg,hooks)` | Change lobby name/avatar, add bots, kick other seats (host only); no game-specific rules |
| `toggleBotSeat(room,actorId,targetId,onBotEnabled)` | Host-controlled handover and return to/from AI, invoking the injected bot planner when applicable |
| `disconnect(ws,sync)` | Mark disconnected seat, remove TV socket, re-sync room; **does not automatically switch it to a bot** |
| `createHttpServer({http,fs,path,publicDir,port,os})` | Serve static assets within public root, `/health`, `/info`, MIME and HTTP errors |
| `attachWebSockets({WebSocketServer,server,rooms,onMessage,sync,setTimer})` | Bound packets (32 KiB), parse safely, dispatch intents, ping/pong and stale-room expiry |
| `send(ws,obj)` | Serialize only to an open connection |

The server injects these **game-specific hooks**:

- `startGame(room)` creates Starfall rules/state and starts the asynchronous phases (the equivalent of `createGame`/`tick`).
- `onMessage(ws,msg)` is the authoritative intent handler (`handleIntent`) and calls the shared handshake adapter first.
- `pubState(room)` produces the shared public view and `privState(room,p)` the individual private view.
- `aiPlan(room,pid)` chooses a bot turn (`botAct`). Bot takeover and return remain host-controlled in the game dispatcher.
- Room-scoped settings (mode, playtest logging, reveal speed), game-over processing and all gameplay remain in the Starfall game dispatcher, **not** in the transport.

**Reuse checklist for another game:** supply a fresh room registry and RNG/token function; provide its own avatars, constants and `sync` callback, route its own `onMessage` to `handleHandshake` first; supply game-specific public/private serializers; use the shared HTTP and WebSocket transport; keep any game-specific state transitions outside the shared code. `handleHandshake` currently assumes one distinct avatar per seat. Other games can adapt this without changing its wire protocol.

## Client-side reusable connection module

`src/connection.js` implements `Conn(onMessage,onOpen,onConnectionStatus)` for both TVs and phones. It owns:

- Same-origin `ws://` or `wss://`, 20-second ping interval, 1.5-second reconnection delay.
- Safe JSON parsing and rejection of invalid JSON/arrays.
- Stop/restart, with stale-socket events and scheduled retries cancelled. A device that receives `replaced` calls `stop()` and remains stopped.

The **caller** decides which `tvCreate`/`tvJoin`/`join` message to send and which local credentials to retain. `build.py` inlines this module at `/*CONNJS*/` in both generated pages: it does **not** fetch a new script from a CDN, and no browser dependency is added.

## TV/phone wire protocol (unchanged)

- TV: `tvCreate` or `tvJoin`, then `welcome {role:'tv',room,tvToken,consts}` and `state {pub}`.
- Phone: `join {room,name}` or `join {room,playerId,token}`, then `welcome {role:'phone',room,playerId,token,consts}` and `state {pub,priv}`.
- Disconnection: reconnect with saved token; a second socket with the same credentials receives the seat, and the older socket receives `replaced`.
- Other messages and validation, including planning, trades, host commands, scores and game over, stay in the Starfall server. No client may award resources or calculate authoritative results.

## Tests and limits

`npm test` covers gameplay and shared room/HTTP/connection unit tests. `npm run test:release` adds a built-file/asset audit. `npm run test:live` requires real `ws` installed and tests actual eight-phone WebSockets; no static/unit test is a substitute. Neither the refactor nor the added checks establish real Safari, Android, TV audio or human-play balance.
