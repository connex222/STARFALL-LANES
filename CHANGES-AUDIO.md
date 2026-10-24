# Audio upgrade — 24 October 2026

**Players:** Smoother and more consistent previously generated Mirelo sound effects; much shorter phone responses; cleaner ambience loop; quieter background music under cinematic events; less overlap when several commands resolve quickly. Existing music and sound opt-in remain.

**Hosts:** Sound Lab now includes all 18 tracks (9 game effects, 8 phone cues, 1 music track), with one play/stop control and volume. All resources stay on the same server.

**Engineering:** Mastering tools, immutable originals, hashes, measurements, mixing fixes, audio QA. No gameplay balance changes or extra runtime dependencies.

**Provider:** Mirelo account connection is currently unavailable, so no new AI generations are claimed. See `docs/audio/MIRELO-AUDIO-UPGRADE.md` for a generation brief if reconnected.

## Phase 18 — Provider delivery hardening

All 13 hosted recordings are indexed for optional local installation. Installer now validates the *whole* collection before replacing game audio, checks MP3 format, duration and SHA-256, and can verify a completed transfer. No audio is streamed from external domains during gameplay. The Sound Lab reports unavailable sounds rather than appearing to play them. Existing audio is preserved until a complete replacement pack is available.
