# The Third Current

**Simplified Chinese title: 三印唤潮**

**A compact card roguelite about braiding three currents into one decisive wake.**

The Third Current is an original, browser-first prototype for players who enjoy planning a turn, shaping a run, and discovering surprising card combinations. Its central rule is called a **Wake**: play cards carrying three different sigils in one turn to create a burst of shared momentum.

The game takes place in a drowned observatory whose charts are woven from living thread. Each expedition follows a short route through shifting sea creatures and broken instruments. Enemy intentions stay visible while you plan, and every card explains its effect in plain language.

## Play

This is an early playable slice. Start a local server from this folder and open `http://localhost:4173`:

```sh
python3 -m http.server 4173
```

No account, download, external asset host, or build step is required.

Play through the Chalk Shoal, choose a passage, and face the Missing Horizon. Click a card, then choose a foe when asked. Press **1–5** to play a card, **← / →** to choose a foe, **Enter** to confirm a target, **E** to end a turn, **R** to reweave, and **Esc** to pause. The run autosaves locally, and the opening hand always contains all three sigils so the Wake can be learned immediately.

## Design goals

- Explain the central rule in the first minute, then leave room to master it.
- Make card order and enemy intent visible before the player commits.
- Keep early choices viable across several builds; random rewards should create variety without deciding the run by themselves.
- Let a run fit a short session and resume after a tab is closed.
- Treat animation, sound, reduced motion, keyboard control, and localization as part of the core experience.

## Languages

English is the default. Simplified Chinese is available from the in-game language control. Both translations live in the same localization dictionary so rules and tooltips stay in sync.

## Project notes

- [Player feedback research](docs/FEEDBACK-RESEARCH.md)
- [Design brief](docs/DESIGN.md)
- [Asset provenance](assets/PROVENANCE.md)

The research note is a targeted qualitative scan of public discussions, not a representative player survey. The Third Current is the current working title and an experimental prototype, not a released commercial game. Complete a name and trademark review before release.
