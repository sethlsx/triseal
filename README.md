# Triseal

**Simplified Chinese title: 三印唤潮**

**A compact card roguelite about choosing a resonance, then braiding three currents into one decisive wake.**

Triseal is an original, browser-first prototype for players who enjoy planning a turn, shaping a run, and discovering surprising card combinations. The first two different sigils played each turn choose a **Resonance**: Tide + Ember weakens foe attacks, Ember + Glass empowers your next attack card, and Glass + Tide grants guard. Play the third sigil to trigger a **Wake**: strike all foes, gain guard, and draw a card.

The game takes place in a drowned observatory whose charts are woven from living thread. Each expedition follows a short route through shifting sea creatures and broken instruments. Enemy intentions stay visible while you plan, and every card explains its effect in plain language.

## Play

### Android

Download the [Android APK](https://github.com/sethlsx/triseal/releases/latest/download/triseal-android.apk) on your phone and install it once. Android 8.0 or later is required. The app opens in landscape and includes the full game for offline play.

New game content downloads in the background when you open or resume the app online. A downloaded update is used on the next launch; Android Back opens a menu with **Restart game** when an update is ready. Updates keep the same local save location and never replace files in the middle of a battle. A change to the native Android shell still requires an APK update.

Each push to `main` automatically publishes a content bundle through the dedicated `mobile-channel` branch. The download connection must be able to reach GitHub. For the format, build instructions, and update behavior, see [Mobile delivery](docs/MOBILE.md).

### Browser

This is an early playable slice. Start a local server from this folder and open `http://localhost:4173`:

```sh
python3 -m http.server 4173
```

No account, download, external asset host, or build step is required.

On a phone, turn the device **sideways**. Combat fills the screen: characters stand in a quiet, low-contrast scene, enemy intentions float overhead, and cards sit half-tucked below the bottom edge. Slide a finger across the hand or tap a card to raise and read it; tap it again or choose a foe to cast. Sliding only inspects cards. Hands of eight or more cards scroll horizontally and use tap-to-inspect. On desktop, hover to raise a card and click to play. Tap Energy or Health for a plain-language resource guide, the three seals for combination details, or either card pile to inspect its contents.

New players are offered a **Training battle** before their first expedition. It guides a real encounter through enemy intent, Energy, Block, attacks, two-seal reactions, a three-seal Wake, and the next turn. The lesson can also be opened from the main menu or journal. It keeps any existing expedition separately and restores it when you leave; a lesson in progress resumes after reopening the app. English and Chinese instructions follow the same seven steps.

Play through the Chalk Shoal, choose a passage, and face the Missing Horizon. Read the enemy intents, then choose which pair of currents best fits the turn. Tap a card, then choose a foe when asked. Press **1–5** to play a card, **← / →** to choose a foe, **Enter** to confirm a target, **E** to end a turn, **R** to reweave, and **Esc** to pause. The run autosaves locally, and the opening hand always contains all three sigils so both Resonance and Wake can be learned immediately.

## Design goals

- Explain the central rule in the first minute, then leave room to master it.
- Let the first two sigils create a tactical choice shaped by visible enemy intent; the third pays off with the Wake.
- Make card order and enemy intent visible before the player commits.
- Stage combat around an original chartkeeper and six animated sea creatures. Cards fly to the caster, spells travel to their targets, and impact, blocked damage, shield gain, and defeat each have a visible cue.
- Resolve enemies one at a time, with an action banner, anticipation, attack, and recovery. Discard the old hand and deal the next only after the enemy sequence finishes.
- Keep early choices viable across several builds; random rewards should create variety without deciding the run by themselves.
- Let a run fit a short session and resume after a tab is closed.
- Treat animation, sound, reduced motion, keyboard control, and localization as part of the core experience.

## Languages

English is the default. Simplified Chinese is available from the in-game language control. Both languages share the same localization keys so rules and tooltips stay in sync.

## Combat presentation

The main menu opens inside a painted, drowned observatory: a bronze celestial instrument, distant ruins, and the Chartkeeper on the steps. Drifting waterlight, fog, and plankton animate the scene. Continue, a new expedition, the journal, and settings sit directly over the environment; custom seeds live in a secondary dialog. Opening the app returns to this menu, with **Continue** restoring the last completed action. The background is an original generated painting shipped locally, with its prompt recorded in `assets/scenes/title-prompts.json`.

All eleven cards have individual original AI-generated illustrations: copper and embers, turquoise currents, and violet glass. Open **Help → Card atlas** to browse the complete set and read each effect in English or Simplified Chinese. Images ship locally as WebP; the prompts and asset origins are recorded in [Asset provenance](assets/PROVENANCE.md).

The Chartkeeper and six enemies use original transparent AI-generated paintings, with distinct silhouettes and materials. Open **Help → Field guide** to browse and enlarge each figure. Breathing, floating, casting, lunges, and recoil remain separate animation layers; the illustrations stand directly in the battlefield.

Scenery and combat effects use original SVG, CSS, and Web Animations API work. No external image or sound service is required. **Reduce motion** in Settings (or the system preference) removes travel, shaking, and idle movement while preserving readable combat numbers.

The game saves after complete player actions and enemy turns. If a tab closes during a sequence, reopening restores the last complete action. Controls unlock when the visible sequence finishes.

## Project notes

- [Player feedback research](docs/FEEDBACK-RESEARCH.md)
- [Design brief](docs/DESIGN.md)
- [Asset provenance](assets/PROVENANCE.md)

The research note is a targeted qualitative scan of public discussions, not a representative player survey. Triseal is the current working title and an experimental prototype, not a released commercial game. Complete a name and trademark review before release.
