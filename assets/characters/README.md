# Character paintings

Seven original transparent portraits created for Triseal with the built-in OpenAI image generation tool on 2026-09-30. Six use the project's generated Thread Needle painting as a material and lighting reference; the Missing Horizon was generated from its original text description. No third-party character reference images were supplied.

| File | Subject |
|---|---|
| `hero.webp` | The Chartkeeper, a hooded ocean cartographer with a sea-glass surveyor staff |
| `driftling.webp` | A translucent jellyfish spirit beneath a scalloped coral bell |
| `brineback.webp` | A heavy sea tortoise with a weathered brass and stone shell |
| `mirrorfin.webp` | A reflective glass manta ray |
| `inkling.webp` | An amethyst ink spirit with curling tentacles |
| `bellwether.webp` | A floating ancient brass diving bell and luminous crystal |
| `horizon.webp` | The Missing Horizon, an enormous eye inside a broken astrolabe |

Exact prompts and original generation filenames are retained in `keeper-horizon-prompts.json`, `sea-creatures-prompts.json`, and `arcane-creatures-prompts.json`. WebP exports preserve alpha transparency. Exporting only changes resolution and encoding; no compositing or content painting was performed outside image generation.

`src/combat-art.js` supplies the portraits; `portrait-art.css` gives their inner layer a restrained idle pose and a separate ground shadow. The existing combat wrapper supplies casting, attacks, and recoil. Images contain no UI labels, so names, health, and move cycles remain localized text.
