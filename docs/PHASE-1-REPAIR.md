# Review programme — Phase 1

- Repaired 23 missing portraits by merging the older `public/avatars/` source with `public/art/avatars/`, converted all 72 to 256px WebP and updated game renderer + server MIME.
- Archived original 512px PNGs outside public in local, ignored `art-source/avatars/`.
- Rebuilt command-bridge score at true 48 kHz stereo, without merely upsampling.
- Removed duplicate branding, obsolete audio download scripts and unreferenced audio backup folder from public.
- Moved phase history to docs/changelog and consolidated test scripts in tests/.
- `npm run build` has offline fallback using the checked-in font/QR bundles; fresh install `npm install` is still recommended.
- Phase 2 will add playtest telemetry; no balance or rules changes in this phase.
