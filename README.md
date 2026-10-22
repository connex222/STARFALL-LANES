# Starfall Lanes

A space-colony strategy game for 2–8 players. The **TV shows the star map**. Each player uses their **phone as a private command console**.

## What's in the folder

| Path | What it is |
|---|---|
| `server.js` | The game server. It holds the real game state and enforces every rule. |
| `public/tv.html` | The redesigned TV screen (self-contained: fonts, code and QR generator inlined). |
| `public/phone.html` | The redesigned phone controller (self-contained). |
| `public/art/avatars/` | Eight installed cinematic leader portraits; missing Era/Mood variations use the master portrait. |
| `src/` | Editable source for the two pages. Run `npm run build` after editing. |
| `build.py` | Inlines fonts, shared code and the QR library into `public/`. |
| `public/art/brand/` | Vector game logo, icon and preview PNG. |
| `test-sim.js` | Plays 12 full games at high speed with bots to check the rules engine (requires `npm install`). |
| `test-ui-static.js` | Checks branding, generated screens, eight portraits and key UI integration points (runs with Node only). |

## Play at home (same Wi-Fi)

1. Install **Node.js** (version 18 or newer) from nodejs.org.
2. Open a terminal in this folder and run `npm install --omit=dev`, then `npm start`.
3. The terminal prints a line like `TV: http://192.168.1.20:3000/tv.html`. Open that address on the laptop or PC connected to the TV, or cast that browser tab to the TV.
4. Click **Sound off** once to turn sound on (browsers block sound until you click).
5. Players scan the QR code on the TV with their phones. The **first phone to join is the host (★)**. The host picks the mode, can add bots, and taps **Start game**.

Phones must be on the **same Wi-Fi** as the computer running the server.

## Play online (free, Render)

1. Put this folder in a GitHub repository.
2. On render.com: **New → Web Service**, connect the repository.
3. Set **Build command** to `npm install --omit=dev` and **Start command** to `npm start`. Choose the **Free** plan.
4. Open `https://<your-app>.onrender.com/tv.html` on the TV.

Render's free plan sleeps after about 15 minutes idle and takes **30–60 seconds to wake**. Open the TV page a minute before guests arrive.

## Controls

- **TV:** press **M** to mute or unmute. The TV remembers its room, so a refresh rejoins the same game.
- **Phone:** a refresh or a locked screen rejoins the same seat automatically. If a seat is opened on a second device, the first one steps aside and offers **Use this device instead**.
- **Host menu (⋯ on the host's phone):** a bot can take over for anyone who drops out, and **Return control** hands it back. **End game now** scores the game as it stands.

## Documented v2 differences and decisions

- **Supply Drop (Phase 6):** choose the resource during Plan on the Draft screen. The server applies that choice if you receive the card; a bot, timeout or older phone defaults to the scarcest resource.
- **Era upgrades (Phase 6):** now chosen sequentially in reverse Influence order, 10 seconds per house with an automatic timeout pick. Ties use that round's first-player order. All houses may choose the same upgrade. Research buys only upgrade types no house chose in an earlier era.
- **Zib-Zob's perk** is just "Research costs 1 Credit less". "Sees 4 Upgrades" had no effect once every leftover upgrade is always buyable.
- **Build Fleet** places all new Fleets on one sector.
- **Draft ranking:** drag to reorder on touchscreen/desktop or use accessible ▲/▼ buttons as an alternative (Phase 4).
- **Unfinished-Mission penalties** (Advanced) apply to everyone at the end, including when someone hits the target early. The winner is decided on the final scores.

## Editing

Change files in `src/`, then run `npm install` (to fetch the fonts and QR library) and `npm run build`. Run `npm test` to replay 12 full bot games and confirm nothing broke.

## Visual upgrade — Phase 1 & Phase 2 (first delivery)

- Added the **Starfall Lanes** vector wordmark and eight-point stellar navigator emblem.
- Applied new branding to the TV lobby, TV game header, phone joining screen and browser favicons.
- Added eight **realistic, cinematic master portraits**, one for each existing house leader. Art appears in TV player lists, TV lobby, phone avatar selection, phone header, results and clashes through the existing shared renderer.
- Upgraded the lobby cards, command-console surfaces, typography hierarchy and buttons while preserving the underlying rules, player colours and non-colour badge cues.
- Added robust portrait fallback: `id_era_mood.png` → `id_frontier_neutral.png` → coloured initials and house badge.
- Preserved all other server code and game modes unchanged. Both files in `public/` are already generated and do not require the build step to run.

**Still to produce:** distinct Expansion and Ascension outfits and Smug/Furious expression artwork; a complete functional UI overhaul; gameplay and network acceptance tests. Mood indication currently uses the original coloured outline and movement effects when a distinct portrait file is missing. Master portraits are cropped from a generated cinematic character-reference composition and upscaled for interface use, not individually commissioned high-resolution portraits.

### Design assets

- `public/art/brand/starfall-logo.png` — selected cinematic galactic-emblem logo (background included; not a transparent wordmark).
- `public/art/brand/starfall-mark.svg` — matching navigation insignia.
- `public/art/brand/starfall-logo-preview.png` — convenient preview.
- `public/art/avatars/{id}_frontier_neutral.png` — the eight 512 × 512 master portraits.

To create an outfit or facial expression variant, save a 512×512 PNG using the existing `id_era_mood.png` format. It automatically takes priority over the neutral master portrait.

## Phase 3 — adaptive TV and phone interface

- Rebuilt the TV Draft Pool into an adaptive two-column grid to support nine cards for eight players, with compact typography at 720p and detailed descriptions on larger displays.
- Adjusted the eight-house rail sizing and scrolling and fixed the incorrect `1st` label: the first position is first to act, not the player leading on Influence.
- Added an on-map legend for controlled hexes, hyperlanes, storm sectors, and the next projected storm position (the underlying gameplay map art and mechanics are unchanged).
- Improved room HUD and map spacing, with reduced-motion and narrow-display fallbacks.
- Added a phone phase-status panel and order-count guidance, more accessible storm messages and redesigned command buttons.
- Kept game rules and WebSocket messages unchanged. No new era/expression character art has yet been produced.
- Source and pre-generated public HTML have both been updated; standard `npm run build` remains supported.

For a dependency-free interface smoke test, run `npm run test:ui`. Static checks do not replace browser or multiplayer acceptance testing.

### Verification for this delivery

- `npm run test:ui`: 6 static integration checks passed.
- Isolated Chromium renders with representative mock game data: 1280×720 TV, 1920×1080 TV, 390×844 phone joining and planning screens. Nine Draft cards and all eight house slots rendered; no JavaScript page errors or horizontal scrolling were detected in the tested layouts.
- `node --check` passed for server, tests and both embedded client scripts.
- The Chromium previews are **not** a live multiplayer acceptance test. The normal npm dependency install timed out in the build environment, so the 12-game bot simulation and real WebSocket join/reconnection tests were not rerun in this delivery.

## Phase 4 — phone gameplay interaction

- **Sector picking:** the map remains interactive, but a labelled list of legal, server-supplied sectors now provides a touch-friendly alternative for starting Outposts, founding, Spires, fleet movement, Strikes and Emergency Shields. Target highlights and confirmation are kept in sync. A shorter tactical map leaves more room for selection controls.
- **Draft ranking:** reorder the pool by drag and drop (mouse or touch) or by one-thumb ↑/↓ buttons with accessible labels. Card priorities are sent to the existing server-authoritative Plan endpoint.
- **Trading:** clearer bank exchange, improved give/receive two-column player-offer builder, stock-aware give amounts, proposed exchange summary, sent-offer statuses and server-acknowledged success feedback. The server still enforces the two-offer limit and 20-second reply window.
- **Missions:** show private progress bars for counting goals, completion counts, end-of-Reveal scoring indicators and the Advanced-mode unfinished-mission warning. Network missions continue using the server's definitive met/done state, not speculative partial pathfinding.
- **Quality:** stronger keyboard focus cues, touch targets and 320–390px layouts. TV UI, house rules, multiplayer protocol and current artwork remain unchanged.

Run `npm run test:ui` to execute both Phase 3 and Phase 4 dependency-free static checks. Browser interaction testing of the generated phone HTML was also performed in Chromium at 390 × 844 and 320 × 720 with simulated server state: Draft reorder, trade payload, Missions, legal-sector selection, server-bound command payload, no page errors or horizontal overflow. These are client interaction tests, **not** a full multi-device WebSocket acceptance test. The standalone project still requires `npm install --omit=dev` to run its real Node/WebSocket server.

## Phase 5 — Cinematic gameplay and sound

- During Phase 5, the server-authoritative game rules and WebSocket messages were unchanged. Visual effects respond to the server's `fx` notifications and known phase changes; they do not predict or change combat outcomes.
- **Solar Storm:** ambient orange energy filaments, existing high-contrast diagonal warning stripes, next-round ghost sectors, and a clear temporary on-screen warning.
- **Fleet clashes:** simulated ship salvos, shield shockwaves, a brief light bloom and the existing combat-score popup. Captures and defence still use the server's result.
- **Hyperlanes:** a travelling light-stream when a lane opens.
- **Construction:** staged light beams, rising scaffolds and orbital ring bursts for Outposts and Spires.
- **Eras and victory:** chapter title announcements, a radial colour sweep, local transition audio and a final victory cue. No game controls are blocked by the announcements.
- **Sound:** nine locally generated MP3 cues including an ambient loop, storm, clashes, movement, construction, hyperlane, income, era and victory. These are *procedural prototype cues* rather than externally mastered studio recordings. Audio is **off by default**, begins only on pressing the TV sound button, and includes volume control with a saved per-browser volume setting. Browser mute shortcuts and reduced-motion preferences are respected.
- **Sound Lab:** open `sound-lab.html` on the same service to preview each bundled sound without launching a match. No autoplay.
- **Source:** `tools/generate_audio.py` recreates the sound cues using NumPy, SciPy and ffmpeg; these are **optional art-production tools**, not runtime dependencies.

### Tests and limitations

- `npm run test:ui` runs all Phase 3, 4 and 5 source/static checks without requiring `ws` or external packages. `npm run test:phase5` runs the Phase 5 checks alone.
- Chromium screenshot tests with representative **simulated** game state passed at 1280×720 and 1920×1080 with eight houses and nine Draft cards. Client FX smoke tests and phone join/console checks did not raise JavaScript page errors.
- Chromium browser testing confirmed that all nine MP3 files decode, sound starts only after user activation, mute works and volume preference is saved.
- **Not yet verified:** live TV-plus-phones multiplayer, network recovery under packet loss, Safari audio decoding, speakers of different TV models, or the 12-game bot simulation. The npm dependency download timed out in the build environment. These remain release gates, not passed tests.
- The previous Expansion/Ascension avatar outfit and expression artwork is still outstanding.

## Phase 6 — gameplay accuracy and server resilience (current)

- **Era draft:** one house chooses at a time, lowest current Influence first; ties follow the current first-player ordering. Each turn lasts up to 10 seconds, after which a legal random choice is made. Every era upgrade remains available to every player during this draft. Only **unpicked** upgrades from the current or previous eras become purchasable with Research.
- **Supply Drop:** the Draft screen now lets each player nominate Ore, Ice, Crystal or Plasma during Plan, with no extra command slot. When Supply Drop is received, the selected resource gets +2. Missing preferences use the prior deterministic low-stock fallback, preserving old clients and AI.
- **Supernova Flash:** doubles the last-place catch-up Credit as income, matching the v2 wording “all income”.
- **Trade expiry:** the server checks the 20-second deadline again at acceptance, preventing a reply that arrives between timer ticks from trading after expiration. Server-authoritative resource checks remain in place.
- **Network/HTTP hardening:** 32 KiB WebSocket maximum message size, non-object packet rejection, malformed URL handling, root-confined static file paths, and handled WebSocket connection errors.
- **Input consistency:** Draft ranks are validated against cards actually in the round’s pool, duplicates are stripped, and Supply Drop resource preferences must be among the four production resources.
- **Testing without npm access:** `npm run test:rules` runs deterministic map, score, combat, trade, authentication and HTTP checks using a test-only WebSocket stand-in. `npm run test:phase6` additionally plays full AI games in-process at accelerated speed without opening network WebSockets.

### Known limitations

- Zib-Zob’s “shows 4 Upgrades” perk needs an explicit v2 design clarification: the current interface shows all eligible research choices. The cost reduction is active.
- Real WebSocket connections, dropped mobile network recovery, cross-device latency and Safari/device-specific behaviour still require live multiplayer acceptance testing. A stand-in connection is **not** equivalent to testing the real `ws` dependency.
- The existing `test-sim.js` / `npm test` uses the real `ws` package, and needs `npm install` in a network-enabled environment. The new Phase 6 tests do not replace that final release gate.
- The 64 additional era/expression portraits remain to be commissioned and bundled.

**Test commands:** `npm run test:ui` for the Phase 3–5 UI and audio suite; `npm run test:rules` for Phase 6 rule and resilience checks; `npm run test:phase6` for those checks plus AI simulations; `npm run test:offline` for the complete offline regression suite.
