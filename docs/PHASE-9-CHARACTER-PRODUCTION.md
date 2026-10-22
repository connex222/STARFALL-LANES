# Starfall Lanes — production character matrix (not finished artwork)

The canonical eight master portraits are located under `public/art/avatars/*_frontier_neutral.png`. Their species and likeness must be kept consistent across all additional variants. The UI currently uses era/status overlays to signal events, **not independently painted costumes or expressions**.

## File contract

Each leader requires exactly nine real 512 × 512 PNG portraits: `{id}_{frontier|expansion|ascension}_{neutral|smug|furious}.png`. Existing Frontier/Neutral images count as eight completed. **64 further individual images are missing**. The app will display each real master portrait if a requested variant is unavailable.

## Locked costume progression from Design Doc v2

| Leader | Frontier | Expansion | Ascension |
|---|---|---|---|
| Kaia Rho | Flight suit | Officer coat | Admiral cape and glowing insignia |
| Zib-Zob | Goggles | Tool belt | Floating gadget crown |
| Matriarch Oolu | Plain robe | Shell jewellery | Luminous coral halo |
| Vex Halloran | Patched coat | Long duster | Sleek black suit and holo-rings |
| Archon Pyrrhus | Bronze armour | Gold armour | Flaming plasma crest |
| Dr. Nim Okafor | Lab coat | Field suit | Hovering lab rig |
| Skrill | Bare carapace | Patterned shell | Jewelled wing-plates |
| Captain Bramble | Sprouts | Sunflowers | Blossoming tree crown |

Each outfit requires three independently distinguishable expressions: **neutral**, **smug** (successful), and **furious** (setback). Smug and furious must change the *face*, not just the border hue. Preserve species, head silhouette, lighting direction and eye position between variations. No text or additional logos in portrait PNGs; house badges and information are provided in HTML for accessibility.

## Review requirements

1. Facial likeness and alien species consistent with the eight existing masters.
2. All 72 files present, 512 × 512, RGB/RGBA PNG, each correctly named and decodable.
3. Art remains legible at 44px (phone) and 120px (TV victory screen).
4. Each era outfit reads distinctly without relying solely on a hue change.
5. The UI keeps the canonical house-colour and shape badges; never change mechanics or perk identity to suit the artwork.
6. Run `npm run audit:avatars` and manually review each character in all nine states on TV and phone.
