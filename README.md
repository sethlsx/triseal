# Triseal

**Simplified Chinese title: 三印唤潮**

**A compact card roguelite about choosing a resonance, then braiding three currents into one decisive wake.**

Triseal is an original, browser-first prototype for players who enjoy planning a turn, shaping a run, and discovering surprising card combinations. The first two different sigils played each turn choose a **Resonance**: Tide + Ember weakens foe attacks, Ember + Glass empowers your next attack card, and Glass + Tide grants guard. Play the third sigil to trigger a **Wake**: strike all foes, gain guard, and draw a card.

The game takes place in a drowned observatory whose charts are woven from living thread. Each expedition follows a short route through shifting sea creatures and broken instruments. Enemy intentions stay visible while you plan, and every card explains its effect in plain language.

## Play

This is an early playable slice. Start a local server from this folder and open `http://localhost:4173`:

```sh
python3 -m http.server 4173
```

No account, download, external asset host, or build step is required.

Begin on the route map, enter the Chalk Shoal, choose a sheltered or dangerous passage, and face the Missing Horizon. The illustrated Chartkeeper stands on the left of the battlefield; enemies stand on the right with their next actions above them and health bars below. Cards and energy sit along the bottom. Click a card, then click an enemy when a target is required.

Press **1–5** to play a card, **← / →** to choose a foe, **Enter** to confirm a target, **E** to end a turn, **R** to reweave, **M** to inspect the route, and **Esc** to cancel targeting or pause. After each battle, choose a card reward and then the next available map node. The run autosaves locally, and the opening hand always contains all three sigils. Existing prototype saves remain supported.

The combat scene includes original character illustrations, idle movement, casting projectiles, enemy attacks, damage and guard feedback, and a three-sigil Wake burst. The reduced-motion setting (or operating-system preference) removes travel and continuous animation. All art and audio are served locally.

## Local development

On Windows, run `py -m http.server 4173 --bind 127.0.0.1` from this folder and open `http://127.0.0.1:4173/`. No package installation is needed. Use the same browser address to retain a local save.

Run the dependency-free gameplay regression checks with:

```sh
node scripts/gameplay-checks.mjs
```

After UI changes, verify English and Simplified Chinese, both route branches, card targeting, the complete boss victory flow, reload/resume, reduced motion, and narrow screens in a browser. Asset-generation prompts and provenance are recorded under `assets/`.

## Design goals

- Explain the central rule in the first minute, then leave room to master it.
- Let the first two sigils create a tactical choice shaped by visible enemy intent; the third pays off with the Wake.
- Make card order and enemy intent visible before the player commits.
- Show the player and enemies in one illustrated arena, with readable intents, card-cast motion, visible hits, and a larger three-sigil Wake burst.
- Keep early choices viable across several builds; random rewards should create variety without deciding the run by themselves.
- Let a run fit a short session and resume after a tab is closed.
- Treat animation, sound, reduced motion, keyboard control, and localization as part of the core experience.

## Languages

English is the default. Simplified Chinese is available from the in-game language control. Both translations live in the same localization dictionary so rules and tooltips stay in sync.

## Project notes

- [Player feedback research](docs/FEEDBACK-RESEARCH.md)
- [Design brief](docs/DESIGN.md)
- [Asset provenance](assets/PROVENANCE.md)

The research note is a targeted qualitative scan of public discussions, not a representative player survey. Triseal is the current working title and an experimental prototype, not a released commercial game. Complete a name and trademark review before release.
