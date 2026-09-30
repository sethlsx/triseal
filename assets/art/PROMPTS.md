# Triseal raster-art generation record

Generated on 2026-09-30 with the built-in OpenAI image-generation tool. No third-party reference images were supplied. These are the actual prompts used for the selected project assets.

## `battle-background.png`

```text
Use case: stylized-concept
Asset type: production raster background for a side-on 2D fantasy deckbuilding battle scene
Primary request: an original wide landscape painting of a dark fantasy underwater ruined observatory, designed as a readable combat stage.
Scene/backdrop: ancient submerged observatory ruins with monumental stone arches, a large intricate brass astrolabe, warm gold light from old instruments and lamps, a deep turquoise abyss beyond, and a few luminous distant jellyfish. A broad, flat stone bridge or platform spans the lower middle horizontally and provides a clear stage for combatants.
Style/medium: richly detailed hand-painted fantasy game environment, painterly texture, original visual design, strong atmospheric depth, restrained dark ink accents, no imitation of any existing game or artist.
Composition/framing: 16:9 wide landscape, strict side-on 2D battle-stage perspective. Environment is recognizable and detailed, but the combat plane has clean silhouettes and low visual clutter. Keep the lower-middle platform broad and uninterrupted; reserve readable empty areas above it for characters and combat effects.
Lighting/mood: mysterious underwater gloom with warm amber-gold focal light against cool turquoise and indigo depths.
Color palette: deep navy, turquoise, aged brass, amber-gold, muted stone.
Materials/textures: worn wet stone, oxidized brass, drifting particulate, soft bioluminescence.
Constraints: background only; no characters, creatures, text, symbols that resemble a logo, cards, interface, frames, meters, watermark, or border. No copied game designs, assets, screen layouts, or recognizable franchise imagery. Production-ready polished raster artwork.
```

Built-in transparency setting: `false`.

## `characters.png` initial generation

```text
Use case: stylized-concept
Asset type: production transparent sprite atlas for CSS background-position cropping in a side-on 2D fantasy deckbuilding game
Primary request: create ONE genuinely transparent PNG sprite atlas with EXACTLY 4 columns × 2 rows of equal-size cells, preferably 2048×1024 pixels. There are exactly eight full-body standees, one centered in each cell, in this exact order.
Row 1, column 1: HERO — human chartkeeper facing RIGHT, long navy and cyan coat, brass goggles, pale face, luminous compass staff, clearly no hood.
Row 1, column 2: DRIFTLING — small turquoise jellyfish ghost with trailing tentacles, facing LEFT.
Row 1, column 3: BRINEBACK — bulky amber coral-armored crab-tortoise creature, facing LEFT.
Row 1, column 4: MIRRORFIN — lilac winged glass manta creature, facing LEFT.
Row 2, column 1: INKLING — purple ink octopus creature, facing LEFT.
Row 2, column 2: BELLWETHER — tall antique brass diving-bell golem with an algae cape, facing LEFT.
Row 2, column 3: HORIZON — huge spectral deep-sea serpent boss, curled body, celestial ring horns, indigo and cyan, facing LEFT. Keep the entire curled silhouette inside the cell.
Row 2, column 4: WAYPOINT — small golden observatory lantern, a readable magical object standee.
Style/medium: original stylized hand-painted fantasy game creatures, bold distinctive silhouettes, dark ink contours, painterly internal color, consistent three-quarter side-view and consistent lighting. Original visual designs only; no imitation of an existing game, artist, franchise, or recognizable character.
Composition/framing: mathematically regular 4×2 atlas. Four equal-width columns and two equal-height rows. Every subject centered within its own exact equal cell with generous blank transparent margins on ALL sides. Baselines aligned within each row. No subject may cross or touch a cell boundary. Full body visible, no cropping, no cut-off weapons, horns, wings, tentacles, cape, tail, or glow. Maintain extra transparent padding around the giant serpent by scaling it down to fit.
Scene/backdrop: none; actual transparent alpha around every sprite.
Lighting/mood: consistent cool underwater rim light with restrained warm brass highlights.
Constraints: exactly 8 subjects and no extras; exact order above; genuine transparent background; no colored field, checkerboard, pedestal, floor, shadow rectangle, frame, grid lines, dividers, labels, numbers, text, UI, watermark, border, or decorative particles outside each subject. Sprite silhouettes must not overlap neighboring cells. This is functional game production art for direct equal-cell cropping.
```

Built-in transparency setting: `true`. The initial result had nontransparent pixels across crop boundaries and was not selected as the project asset.

## `characters.png` layout revision

The only image input was the immediately preceding AI-generated atlas from the initial prompt above.

```text
Edit the immediately preceding transparent character atlas. Preserve the same eight original character designs, painting style, colors, orientations, and exact order. Change ONLY the scale, placement, and transparent spacing so it functions as a strict CSS sprite sheet.

Create an exact 4-column × 2-row equal-cell atlas on a genuine transparent canvas with a 2:1 aspect ratio, preferably 2048×1024. Keep exactly one sprite centered in each cell:
top: hero, driftling, brineback, mirrorfin
bottom: inkling, bellwether, horizon, waypoint.

Hard layout repair:
- Each sprite including all glow, coral, wings, tentacles, cape, tail, horns, staff and particles must fit within the INNER 70% width and INNER 76% height of its own cell.
- Leave a completely empty transparent gutter at every vertical quarter boundary and across the horizontal center boundary. Every gutter must be at least 6% of one cell dimension wide.
- Scale down brineback, mirrorfin, bellwether and horizon substantially. Horizon must be compact and fully inside row 2 column 3.
- Align row baselines while preserving generous clear alpha margins on all four sides of every cell.
- No sprite may touch or cross any 25%, 50%, or 75% vertical boundary or the 50% horizontal boundary.
- Exactly eight subjects, no extras.
- Keep the hero clearly facing right; all creatures except waypoint face left.
- No background, colored field, checkerboard, floor, pedestal, cast shadow field, grid, divider, label, text, UI, border or watermark.
- Preserve actual transparency and clean cutout edges.
This is a functional production sprite atlas; grid precision and empty boundary gutters take priority over making characters large.
```

Built-in transparency setting: `true`.

## Verification notes

- `battle-background.png`: 1672×941, RGB.
- `characters.png`: 1774×887, RGBA with alpha range 0–255.
- The atlas retains a strict 2:1 aspect ratio, although the built-in generator did not honor the preferred 2048×1024 pixel dimensions.
- At alpha threshold 8, the 5-pixel strips centered on all three vertical quarter boundaries and the horizontal center boundary contain zero nontransparent pixels. This leaves safe gutters for direct 4×2 CSS background-position cropping after scaling.
