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
| `test-sim.js` | Plays 12 full games at high speed with bots to check the rules engine. |

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

## Where the build differs from the v2 design doc

- **Supply Drop** gives +2 of your *scarcest* resource automatically. Cards arrive mid-Reveal, when there's no chance to ask.
- **Era upgrades** are chosen at the same time rather than in reverse Influence order. Any number of houses can own the same upgrade, so the order made no difference.
- **Zib-Zob's perk** is just "Research costs 1 Credit less". "Sees 4 Upgrades" had no effect once every leftover upgrade is always buyable.
- **Build Fleet** places all new Fleets on one sector.
- **Draft ranking** uses ▲/▼ buttons instead of dragging. This is more reliable one-handed.
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

- `public/art/brand/starfall-logo.png` — transparent primary wordmark.
- `public/art/brand/starfall-mark.svg` — matching navigation insignia.
- `public/art/brand/starfall-logo-preview.png` — convenient preview.
- `public/art/avatars/{id}_frontier_neutral.png` — the eight 512 × 512 master portraits.

To create an outfit or facial expression variant, save a 512×512 PNG using the existing `id_era_mood.png` format. It automatically takes priority over the neutral master portrait.
