# Asset provenance

## Current policy

The project uses no third-party images, sounds, samples, or bundled fonts. Existing interface visuals are drawn in HTML/CSS/Canvas from original shapes and gradients. The two production raster assets listed below were generated from original text prompts with the built-in OpenAI image-generation tool and no third-party reference images. Audio is synthesized at runtime with Web Audio oscillators and noise, without recordings or samples. The interface uses the system font stack. There are no external asset downloads.

## Shipped assets

| Asset or source | Creator/source | Method | Inputs and license | Status |
|---|---|---|---|---|
| CSS and Canvas game illustrations | Triseal project source | Original vector-like geometry, gradients, and procedural particles authored in code | No third-party reference images or copied game assets used | Original project work; title and commercial rights review remains before release |
| Card-flight, deal, hit, and Wake motion | Triseal project source | Original CSS keyframes and Web Animations API effects authored in code | No copied layouts, motion, graphics, or external assets | Original project work |
| Web Audio effects and ambience | Triseal project source | Original oscillator/noise synthesis authored in code | No audio samples or recordings | Original project work; title and commercial rights review remains before release |
| System font stack | Player's operating system | Native installed fonts | No bundled font files | No font asset is redistributed |
| `assets/art/battle-background.png` | OpenAI built-in image-generation tool, generated 2026-09-30 | Original text-to-image generation; final RGB PNG is 1672×941 | No reference images or third-party assets; the exact production prompt is preserved in `assets/art/PROMPTS.md`; use remains subject to the OpenAI service terms and applicable law | AI-generated project asset; manual review found no obvious copied character, logo, UI, or franchise element; commercial-release distinctiveness and title review remain |
| `assets/art/characters.png` | OpenAI built-in image-generation tool, generated and layout-revised 2026-09-30 | Original text-to-image generation followed by a built-in edit using only the immediately preceding generated atlas; final RGBA PNG is 1774×887 | No third-party reference images or assets; initial and revision prompts are preserved in `assets/art/PROMPTS.md`; use remains subject to the OpenAI service terms and applicable law | AI-generated project asset; true alpha verified and all 4×2 crop boundary strips are empty; dimensions differ from the preferred 2048×1024, so CSS scaling is required; commercial-release distinctiveness review remains |
