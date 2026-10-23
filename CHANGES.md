# STARFALL LANES — Review Programme, Phase 1

## Players
- All eight established leaders display the correct Frontier, Expansion and Ascension expression portraits: 72/72. The public portrait set is now 256px WebP, drastically reducing loading size.
- Sound Lab no longer lists the backing music twice; the existing premium sound cues are retained. The backing composition has been regenerated from synthesiser code in true 48 kHz stereo at 192 kbps, rather than upsampled.
- No changes to modes, resource costs, scoring, combat, or turns.

## Hosts
- The server is still authoritative; original QR joining, reconnect and bot takeover are unchanged.
- Game can start at home over Wi-Fi or from Render. This working folder has not been deployed to Render or committed to GitHub.
- Local `npm test` succeeds without fetching packages; clean production runtime still requires `npm install` for `ws`.

## Developers
- Consolidated all 72 images in `public/art/avatars/`, removed duplicate public paths, and added WebP HTTP MIME support.
- Original 512px PNG masters are held in ignored `art-source/avatars/` for safekeeping. They are included in the complete download but will **not** be pushed by Git by default; back them up privately.
- Moved phase/batch notes into `docs/changelog/` and test scripts into `tests/`, while preserving their relative imports.
- Rebuilt public screens from `src/`. Offline build uses already-embedded fonts and QR code if optional npm developer packages cannot be fetched.
- Removed obsolete expiring-link installers and relocated old procedural audio backups outside `public`.
- Web-served `public/` is approximately 8.2 MiB, reduced from roughly 67 MiB.

## Commands
- `npm start` — host game (after `npm install`, which needs access to npm registry).
- `npm run build` — generate public pages from editable source.
- `npm test` — build and run the full **fast offline regression** suite (passing).
- `npm run test:sim` — nine seeded in-process games (included in suite).
- `npm run test:balance` — historical 27-game diagnostic cohort (long-running, not part of fast suite; this environment timed out).
- `npm run test:live` — not implemented until the review's Phase 7; deliberately fails to prevent false release sign-off.
- `python3 tools/audit_portraits.py` — audit 72 production files.

## Still outstanding
- Real TV + phone WebSocket multiplayer acceptance tests and browser-device audio.
- Gameplay identity / 8-player scoring / Advanced-mode balance, scheduled for later review phases.
- Normal npm dependency install could not be verified in this sandbox (external registry unavailable); existing server tests use a stub.
- No GitHub push or Render deployment performed.
