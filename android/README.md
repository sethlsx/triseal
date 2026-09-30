# Triseal for Android

The Android shell is plain Java with no third-party dependencies. Build assets are supplied from the packaged web game as `www/`; generated assets, signed APKs, build outputs, and signing credentials stay outside this source folder. The minimum Android version is 8.0 (API 26).

## Play and updates

- The app opens immediately in landscape and works offline using its bundled game or the last verified download.
- Every game version uses `https://appassets.androidplatform.net/`, so normal content updates preserve the same WebView local storage and saved run.
- On launch and foreground, the shell checks the GitHub `mobile-channel` update feed in the background, throttled to once per 15 minutes in the process.
- A verified download becomes active when the player next opens the app. It never replaces assets in an ongoing game. A brief English or Chinese toast announces readiness.
- Android Back opens the native menu. When an update is ready, **Restart game** loads it immediately; **Later** continues the current version. The game saves after completed actions, so the menu explains that the latest completed action is retained.
- Closing and reopening applies the downloaded update. Merely returning from another app resumes the current version.

## Content contract

Feed: `https://raw.githubusercontent.com/sethlsx/triseal/mobile-channel/mobile-update.json`

```json
{
  "schema": 1,
  "version": "0123456789ab",
  "sequence": 1790720000,
  "minShellVersion": 1,
  "url": "https://raw.githubusercontent.com/sethlsx/triseal/mobile-channel/updates/triseal-0123456789abcdef0123456789abcdef01234567.zip",
  "sha256": "64 lowercase hexadecimal characters",
  "bytes": 1234567
}
```

The ZIP contains the web files directly at its root. `index.html` and `bundle-version.json` must exist. The latter contains matching `schema`, `version`, and `sequence` values. Versions are lowercase Git hashes, 7–40 characters; the URL uses the full 40-character hash. Sequence is the commit Unix timestamp and must increase. Native changes require a new APK and an incremented shell version; a feed requiring a newer shell is ignored.

HTTPS uses Android certificate validation with redirects disabled. Updates are limited to the fixed GitHub raw-content host and repository branch path, 20 MiB compressed, 64 MiB expanded, and 500 ZIP entries. Exact length, SHA-256, paths, duplicate entries, and metadata are checked before a private staging folder is renamed and selected with committed preferences. Extraction creates ordinary files and never applies ZIP symlink attributes. A failed download leaves active content untouched. The previous complete bundle is retained as a fallback if active metadata or its entry page is missing.

The WebView has no JavaScript/native bridge, no file or content access, and no remote navigation or resource loading. App requests are intercepted and served only from the immutable selected local directory or bundled assets. No native executable code is downloaded. The launcher vector is an original drawing in `res/drawable/ic_launcher.xml`.
