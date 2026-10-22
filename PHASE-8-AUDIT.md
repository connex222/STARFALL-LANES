# Starfall Lanes — Phase 8 engineering and accessibility audit

Date: 22 October 2026 · Static code inspection, deterministic automated tests, and isolated Chromium rendering checks

## Scope and limitations

Reviewed the Phase 7 code and generated pages against Design Doc v2 and prior release notes. The game server is unchanged. This is an internal code and browser review, **not** an independent third-party accessibility certification. Browser rendering tests used an isolated HTML environment with no live WebSocket session. Artwork loaded into the portrait preview via inline image data, while the isolated page checks did not fetch external artwork. Real-network multiplayer, physical-device audio and assistive-technology tests are outstanding.

## Fixes shipped in Phase 8

1. **High — keyboard focus can leave a trade or host dialog.** The phone now labels dialogs, traps Tab and Shift+Tab, moves focus into the dialog on opening, sets the page behind it inert, restores focus when closed and lets Escape dismiss host actions. Incoming offers still require an explicit decision.
2. **High — focus loss on Draft reorder or legal map selection.** Draft arrow buttons now retain keyboard focus after reordering and announce the new priority. Legal sectors remain selectable by buttons below the map; focus is restored after a selection and the selection is announced. The Canvas map has a descriptive alternative.
3. **Medium — house visual changes are only conveyed by colour.** Existing distinct shape badges remain, and portraits now receive Frontier I, Expansion II, Ascension III era chips on larger profile displays, plus ★/! for celebrating/under-pressure states and spoken accessible labels. Master artwork is unchanged; missing character portraits are not misrepresented as rendered variants.
4. **Medium — learning pages lack direct keyboard bypass links.** Both How to Play and Lore now offer skip navigation, visible keyboard focus, and the How to Play FAQ explains alternative controls.
5. **Low — selected phone sections were visually clear but not announced.** Command sections now expose a pressed state and include alert counts in accessible button labels.

## Tests actually performed

- 6 baseline UI static checks + 7 Phase 4 UI checks + 7 Phase 5 cinematic checks, all pass.
- 12 Phase 6 rules/network tests pass; nine in-process simulated bot games finish without crashes or invalid resource balances.
- 6 Phase 7 onboarding checks and 7 new Phase 8 integration checks, all pass.
- Isolated Chromium content rendering at 320/390/1280 phone widths; 1280×720 and 1920×1080 TV; 320/1440 learning guide; and 390 lore. No page JavaScript exceptions or horizontal overflow reported. Host dialog opening, focus, Escape and return of focus were exercised in the isolated browser.
- All nine bundled MP3 cues were checked with ffprobe; each has a readable duration.
- The server.js SHA-256 matches the untouched Phase 7 server exactly.

## Open release risks (not silently changed)

| Priority | Finding | Recommended action |
|---|---|---|
| High | No real 2–8-device Wi-Fi or Render multiplayer acceptance; reconnect, background/sleep and TV-PC split-screen workflows unverified | Perform the planned physical multiplayer session; include abrupt disconnects and reconnect tokens |
| High | Core star map is still graphics-first; the legal-target picker helps, but not all galaxy ownership and lane information has an equivalent complete screen-reader description | Conduct an actual VoiceOver, TalkBack and keyboard-only playthrough; add a complete structured map list if needed |
| Medium | Design Doc v2 describes Zib-Zob seeing four Upgrades, while current server has three normal era offers and only the Research discount | Make an explicit product decision, then separately implement and regression-test any rules change |
| Medium | Only eight Frontier/Neutral cinematic portraits are bundled; 64 era/expression variants are still missing | Commission consistent per-character image variants from the same reference artwork, and verify each filename and appearance on TV and phone |
| Medium | In the nine sample bot simulations, several Quick games end below the 10-Influence target, while Standard games can end below 15 | Run many seeded balance simulations and real player tests before altering thresholds or economy |
| Medium | Phone and TV audio are opt-in and work in simulated/browser checking, but television speakers, Bluetooth latency, audio mixing and actual mobile gesture policies are unverified | Test on physical devices; optionally commission professionally mastered cues |
| Medium | Contrast, focus ordering and narration have not been tested with real assistive technology | WCAG 2.2 AA manual review with keyboard, screen reader, zoom and reduced-motion settings |
| Low | Server uses an HTML Canvas for a complex board; smaller TVs can require reading at a distance | Test 720p television legibility at typical couch distance, not just browser viewport emulation |

## Product-design guardrails

- Retain all eight established names, species, house colours, shape badges and Advanced perks.
- Preserve server-authoritative TV-and-phone play and Design Doc v2 rules unless an agreed rules change is explicitly recorded.
- Preserve locally bundled artwork/audio, accessible legal-target lists, UK English, and clear How to Play/Lore links.
- Never call a cosmetic portrait ring an independent Era Outfit PNG. Those 64 assets remain open work.
