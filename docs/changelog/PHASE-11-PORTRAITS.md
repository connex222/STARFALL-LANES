# Starfall Lanes — Portrait Integration (Expansion + Ascension)

**Production status:** 24 of 72 portrait files integrated (8 Frontier Neutral, 8 Expansion Neutral, 8 Ascension Neutral).

## Completed
- Eight distinct generated Expansion Neutral portraits have been converted to optimised 512×512 PNGs, preserving the named cast.
- Eight separate Ascension Neutral variants are supplied as individually tailored visual composites based on the Expansion portrait for the corresponding character. They are **not eight independently generated Ascension costume paintings**, despite their unique frames and special effects.
- Installed under the runtime naming scheme and updated client fallback to retain era-appropriate neutral artwork when Smug/Furious expressions are not yet supplied.
- Added automated 24-image validation and generated-client checks.

## Asset naming
All three neutral variants: `public/art/avatars/<id>_<frontier|expansion|ascension>_neutral.png`. IDs: kaia, zibzob, oolu, vex, pyrrhus, nim, skrill, bramble.

## Still outstanding
- 48 expression-specific images across Frontier, Expansion and Ascension.
- Eight separately illustrated Ascension outfits, should production require genuinely different garments/silhouettes instead of composited portraits.
- Independent visual acceptance and live multiplayer audio/TV/phone tests.

## Test
`npm run test:portraits`, `npm run audit:avatars`, `npm run test:offline`.
