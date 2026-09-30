# Asset provenance

## Current policy

The first playable slice uses no third-party images, sounds, samples, or fonts. Visuals are drawn in HTML/CSS/Canvas from original shapes and gradients. Audio is synthesized at runtime with Web Audio oscillators and noise, without recordings or samples. The interface uses the system font stack. There are no external asset downloads.

## Shipped assets

| Asset or source | Creator/source | Method | Inputs and license | Status |
|---|---|---|---|---|
| CSS and Canvas game illustrations | Triseal project source | Original vector-like geometry, gradients, and procedural particles authored in code | No third-party reference images or copied game assets used | Original project work; title and commercial rights review remains before release |
| Card-flight, deal, hit, and Wake motion | Triseal project source | Original CSS keyframes and Web Animations API effects authored in code | No copied layouts, motion, graphics, or external assets | Original project work |
| Chartkeeper and six sea creatures (`src/combat-art.js`) | Triseal project source | Original inline SVG paths, shapes, shading, and CSS idle poses | Drawn from scratch in code; no third-party character images or traced assets | Original project work |
| Combat staging and spell effects (`combat.css`, `src/combat-motion.js`) | Triseal project source | Original layered scenery, procedural SVG projectiles, shields, particles, and timed Web Animations API sequences | Broad card-combat readability reference: [Mega Crit official Slay the Spire press kit](https://www.megacrit.com/press-kits/slay-the-spire/). No downloaded art, recordings, or reproduced animation files | Original project work |
| Web Audio effects and ambience | Triseal project source | Original oscillator/noise synthesis authored in code | No audio samples or recordings | Original project work; title and commercial rights review remains before release |
| System font stack | Player's operating system | Native installed fonts | No bundled font files | No font asset is redistributed |
