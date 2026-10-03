# Triseal project guide

- This is a separate game from Pixel Expedition. Keep all work in this repository.
- The current working title is Triseal (Simplified Chinese: 三印唤潮). Treat it as provisional until a name and trademark review is done before release.
- Player-facing language defaults to English and must also be available in Simplified Chinese. Keep translations in the same localization dictionary and verify both in the UI.
- Make the game browser-first with phone landscape as the primary play layout, touch and keyboard controls, responsive desktop support, and offline play. Keep combat on a single continuous scene with controls placed around it; avoid stacks of dashboard panels. Prompt portrait phone users to rotate their device.
- Keep the first version focused on a distinctive card loop, readable rules, visible enemy intent, and a short resumable run.
- New art and audio must be made from scratch or use assets with explicit licenses that allow the intended game use. Record every shipped asset and its source in `assets/PROVENANCE.md`.
- Do not use Balatro, Slay the Spire, or other games' character art, card art, sound recordings, screen layouts, logos, names, or melodies. Study them only for broad design principles.
- Conserve GitHub Actions quota: develop and validate locally, commit useful checkpoints, and batch completed work into a single push at a meaningful milestone or when the user asks to synchronize. Do not push every small edit. Keep credentials, local save data, and build artifacts out of commits.
- Source synchronization and phone publication are separate. Ordinary pushes must not trigger packaging or publishing. Run the manual `Publish Android content updates` workflow on `main` only when the user explicitly requests a phone content release; do not run it merely to validate a source or workflow change.
- Android uses a persistent local web origin and versioned content bundles. A manual publication updates the generated `mobile-channel` branch through GitHub Actions. Keep the packaging allowlist current when adding runtime files. Verify the workflow result and live manifest before claiming phones can update; report publication failures as pending.
- Reuse the private Android signing key for future APKs; never commit it. Increment the native version code when changing the Android shell. Ordinary card, art, animation, and game changes ship through the content update feed and do not require a new APK.
