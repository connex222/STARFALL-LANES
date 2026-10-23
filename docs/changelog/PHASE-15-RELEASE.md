# Starfall Lanes — Phase 15: Release gate and premium audio verification

## Findings confirmed 23 October 2026

The connected `connex222/STARFALL-LANES` GitHub `main` repository contained nine
premium Mirelo MP3 files, all nine original backup files, and the Command Bridge
Theme. The nine premium file sizes match the earlier generation results. They
are *present in GitHub*, not yet verified in a live Render deployment or on
physical TVs/PCs/phones. A premium installer receipt was not in the inspected
GitHub tree, so this is file-presence evidence, not a full provenance audit.

The locally packaged Phase 14 game still ships procedural fallback effects,
with optional install scripts. This remains a valid offline build; it should
not overwrite the newer GitHub premium audio files during an upload.

## Added release gates

- `node test-phase15-release.js`: 72 exact 512×512 portraits, both generated
  pages, local MP3 signatures, logo, readily accessible How to Play and Lore,
  phone/TV sound controls, server health, WebSocket payload cap and asset paths.
- `node test-phase15-release.js --require-premium`: requires the nine precise
  Mirelo-generated MP3 file sizes. This strict mode is designed for the live
  GitHub deployment branch. File sizes are **not** a cryptographic proof.
- GitHub Actions workflow `phase15-checks.yml`: runs the existing offline test
  suite and the strict release gate on push/PR; no Render deploy is triggered.

## Release acceptance still outstanding

1. Confirm which Render workspace owns Starfall Lanes, then inspect the
   service's connected repo/branch, auto-deploy setting and last live commit.
2. Check the live Sound Lab and all nine MP3 endpoints, with correct MIME and
   no HTML error pages (200 status alone is insufficient).
3. Test simultaneous TV and phone gameplay with two real devices, connection
   drops, WebSocket reconnection, and no accidental audio autoplay.
4. Listen on actual television and phone speakers at safe initial volume;
   check peak levels, transition ducking and absence of audible clicks.
5. Run full 2–8 player multiplayer acceptance before calling this a release.

**Important:** The local Chromium smoke test could not run: browser navigation was blocked by
the execution environment for both localhost and file URLs. This is not
a passed browser test.

The automated tests do not certify audible quality or live
multiplayer performance. This work is an automated *release gate*, not a
completed production release.
