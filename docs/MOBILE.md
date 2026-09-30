# Triseal on Android

## Install and play

Open [the Android APK download](https://github.com/sethlsx/triseal/releases/latest/download/triseal-android.apk) on your phone, download it, and open it to install. Android may ask you to allow installations from the browser or file manager you used. Play in landscape orientation. English is the default; Simplified Chinese is available in the game.

The APK includes the game, artwork, and synthesized sound. It works offline immediately after installation. Run progress remains on the phone.

When the game opens online, it checks for a newer game bundle and downloads it in the background. The game never reloads itself during a turn. A finished download is staged until the next full app launch. To apply it sooner, use Android Back to open the native menu, then choose **Restart game**. An explicit restart retains the latest completed action; finish your current animation before restarting. Failed downloads leave the installed version available. Returning to the game from another app resumes the existing version.

Normal changes to cards, artwork, animation, and rules do not need another APK. Changes to the Android shell require a new signed APK. Android app updates reuse the same application ID and signing key to preserve installed data; uninstalling the app deletes its local progress.

### 中文说明

用手机打开[安卓安装包下载链接](https://github.com/sethlsx/triseal/releases/latest/download/triseal-android.apk)，下载 APK 后打开安装。安卓可能会要求允许当前浏览器或文件管理器安装应用。游戏采用横屏，支持英文和简体中文。

安装包自带游戏、美术和合成音效，安装后即可离线游玩，进度保存在手机。联网打开游戏时，会在后台下载新的游戏内容，下次完整启动应用时生效，不会自动打断当前回合。也可以用安卓返回键打开菜单，选择「重启游戏」立即应用更新；会保留最后一个已完成操作，请等当前动画结束再重启。普通卡牌、美术和玩法更新不需要重新安装 APK，只有安卓应用本身变化时才需要更新安装包。不要卸载旧版后重装，否则会清除手机上的进度。

## Publishing

### Build the Android APK

Install JDK 17 or newer, Android SDK platform 36, build-tools 36.0.0, Node 22, and the system `zip` command. No Gradle or third-party Java libraries are required.

```sh
# First build only: creates a private persistent signing key outside the repository.
node scripts/build-android.mjs --init-signing

# Subsequent builds reuse that key.
node scripts/build-android.mjs
```

The output is `dist/triseal-android.apk` with a SHA-256 file beside it. The build aligns and signs the APK, then checks its signature. Default signing material lives in `~/.config/triseal/android/`; keep a secure backup of that entire directory and use the same key on any future build machine. Never put it in Git or a release asset. `TRISEAL_ANDROID_SDK`, `TRISEAL_JAVA_HOME`, `TRISEAL_BUILD_TOOLS`, and `TRISEAL_SIGNING_DIR` can override local tool and key paths. Commit the finished source before the final build so the bundled content version matches the release commit.

### Publish game content

Every push to `main` runs `.github/workflows/publish.yml`. The workflow needs `contents: write` and publishes only `dist/site/` to the dedicated generated `mobile-channel` branch. The Android app reads the manifest and ZIP through GitHub's HTTPS raw-content service. No GitHub Pages configuration or custom domain is required.

The publishing workflow uses a separate CI worktree and an ordinary push to preserve channel history. Only pushes to `main` start the workflow, so the generated-branch push does not create a publishing loop. Concurrent publishers are serialized. Treat `mobile-channel` as generated output; author game changes on `main`.

Generate the same distribution locally with Node 22 and the system `zip` command:

```sh
node scripts/package-web.mjs
```

Run this after the release commit exists: the content version and sequence come from `HEAD`, not from uncommitted edits. The packaging command does not edit any tracked source files. `dist/` is ignored by Git.

Outputs:

| Output | Purpose |
| --- | --- |
| `dist/web/` | Clean runtime content to copy into the Android APK's bundled web assets. |
| `dist/site/` | Complete generated mobile channel, with a static website ready for separate hosting. |
| `dist/site/install/index.html` | English and Chinese Android download page. |
| `dist/site/bundle-version.json` | Version of the published game. The same file is in `dist/web/`. |
| `dist/site/mobile-update.json` | Manifest checked by the Android updater. |
| `dist/site/updates/triseal-<full-commit-sha>.zip` | Immutable-named compressed game bundle. |

The Android download button targets the stable release asset URL:

```text
https://github.com/sethlsx/triseal/releases/latest/download/triseal-android.apk
```

Publish a signed APK under that exact asset name in a non-draft, non-prerelease GitHub release. Future game-content deployments do not create a new APK or require access to the private signing key. Keep that key outside the repository and reuse it for later Android shell releases.

Check the workflow result and the live update manifest after each push before telling players that the new version is available. A source push alone does not mean the manifest has changed. The current channel contains the current bundle; if a phone sees a cached older manifest whose ZIP is no longer at the branch tip, its failed fetch must be harmless and the next update check can retry.

The generated `install/index.html` is a bilingual download page ready for a future web host. GitHub raw-content URLs deliver files, not a usable browser-play website; use the GitHub release APK link for installation until a working static host is explicitly configured.

## Runtime allowlist

The package includes only:

- `index.html`.
- Root-level `*.css`.
- `src/*.js` (one directory level).
- `assets/cards/*.webp`.
- `assets/characters/*.webp`.
- Generated `bundle-version.json`.

All selected inputs must be regular files and their parent directories must be real directories. Symbolic links are rejected. Filenames containing newlines are rejected before they reach `zip`. The command uses argument arrays rather than shell interpolation. Input ordering and ZIP file timestamps are fixed for a given commit.

Do not add runtime fonts, images, audio, JSON, or nested JavaScript modules without updating the allowlist. Artwork prompts, source documentation, credentials, native build files, local saves, and APKs are excluded. The landing page and update feed are deployment extras and are never included in the downloadable game ZIP or bundled Android web assets.

## Content version contract

`bundle-version.json`, stored at the root of each game bundle:

```json
{
  "schema": 1,
  "version": "a1b2c3d",
  "sequence": 1790784000,
  "minShellVersion": 1
}
```

`mobile-update.json`, served at `https://raw.githubusercontent.com/sethlsx/triseal/mobile-channel/mobile-update.json`:

```json
{
  "schema": 1,
  "version": "a1b2c3d",
  "sequence": 1790784000,
  "minShellVersion": 1,
  "url": "https://raw.githubusercontent.com/sethlsx/triseal/mobile-channel/updates/triseal-<full-commit-sha>.zip",
  "sha256": "<64-lowercase-hex-characters>",
  "bytes": 12345678,
  "createdAt": "2026-09-30T16:00:00.000Z"
}
```

- `schema`: the version of this manifest contract, currently `1`.
- `version`: the first seven hexadecimal characters of `HEAD`.
- `sequence`: the Git commit's Unix timestamp in seconds. Apply only bundles newer than the installed sequence; use normal commit timestamps and do not backdate a release commit.
- `minShellVersion`: minimum compatible Android shell version, initially `1`. Increase this packaging value if a future game bundle needs native features unavailable in older shells.
- `url`: HTTPS URL under this project's generated `mobile-channel` branch on `raw.githubusercontent.com`. The filename contains the full 40-character commit SHA.
- `sha256`: SHA-256 of the exact ZIP bytes served at `url`.
- `bytes`: the ZIP length in bytes.
- `createdAt`: ISO 8601 UTC representation of the commit timestamp.

The ZIP opens directly to `index.html`, `src/`, `assets/`, the stylesheets, and `bundle-version.json`; there is no wrapping directory. The app verifies the digest and byte count, requires supported metadata, rejects unsafe archive paths, and stages extraction separately from the active bundle. A failed or incompatible update must leave the current bundle intact. Before activation, the extracted bundle metadata must match the manifest version, sequence, and minimum shell version.

## Local progress and update behavior

Bundled and downloaded game files must share one stable app-local HTTPS origin. Never load different content versions at different hostnames, `file://` URLs, or versioned top-level paths: browser storage is origin-dependent. Keep the existing `spindlewake.save.v1` save key and preserve storage across updates. Any browser-hosted version is a separate origin and does not share an Android installation's save.

Downloading an update does not replace the active page. A brief bilingual native toast announces readiness. The player can explicitly accept a restart through the Android Back menu; the menu explains that the last completed action is retained. The web game already saves after completed actions. On a fresh app start, a fully staged bundle activates before the WebView loads. Retain a usable bundled fallback and avoid recursive reloads if update loading fails.
