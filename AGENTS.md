# Triseal project guide

- This is a separate game from Pixel Expedition. Keep all work in this repository.
- The current working title is Triseal (Simplified Chinese: 三印唤潮). Treat it as provisional until a name and trademark review is done before release.
- Player-facing language defaults to English and must also be available in Simplified Chinese. Keep translations in the same localization dictionary and verify both in the UI.
- Make the game browser-first, responsive, keyboard-usable, and playable without a network connection.
- Keep the first version focused on a distinctive card loop, readable rules, visible enemy intent, and a short resumable run.
- New art and audio must be made from scratch or use assets with explicit licenses that allow the intended game use. Record every shipped asset and its source in `assets/PROVENANCE.md`.
- Do not use Balatro, Slay the Spire, or other games' character art, card art, sound recordings, screen layouts, logos, names, or melodies. Study them only for broad design principles.
- After each completed change round, commit and push this repository to GitHub, as requested by the user. Keep credentials, local save data, and build artifacts out of commits.
