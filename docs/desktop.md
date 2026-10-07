# Desktop client

The desktop edition lives in `apps/desktop`. Its renderer imports the existing `apps/client/src/App.tsx`; the editor, document format, renderer, and translations remain shared with the web app.

Status in 0.1.0-beta.1: the desktop edition is a companion for ChatGPT subscribers who need a desktop app, and during the beta it is for people who build it themselves. No installer, signed build or notarized build is distributed, and it is not published to the Mac App Store. Windows is excluded from the beta because it has never been checked on a real device.

## Build and run

```sh
pnpm install
# If package install scripts are disabled, explicitly install the Electron binary:
node node_modules/electron/install.js
pnpm build:desktop
pnpm desktop
pnpm package:desktop
```

Requires Node.js 22.13+ and pnpm 11.19.0. Packaging creates an unsigned local application under `dist/desktop` for the current OS and architecture. The only checked target is an Apple Silicon Mac (see the verification record below); Intel Mac and Windows builds are unverified. These commands do not publish or deploy anything. CI runs `pnpm build:desktop` on every pull request; it does not package or launch the app.

## Storage and privacy

Electron's user-data directory contains `library/documents.sqlite` and `library/images/<sha256>`. On macOS this is normally `~/Library/Application Support/Wonboard/`. The renderer has no filesystem access: a sandboxed preload exposes only document list, load, and save operations. The main process validates documents, checks photo hashes, and rejects stale revisions. Photos are written before the SQLite transaction commits. Unreferenced photos are retained for now rather than risking deletion of a needed file.

Documents save automatically and through the existing Save button. The status says “Saved to this device”, not saved to Sites. Closing with pending changes shows a warning in the current interface language and keeps the window open unless the user chooses to quit. Local data is not encrypted; the OS account controls access.

The desktop edition uploads nothing. The Share button is visible, but outside the Sites edition it only shows a notice that sharing works in Wonboard installed on a ChatGPT site. Save to PC writes PDF, text, Markdown or a ZIP backup to this computer.

The desktop library and a Sites installation are separate and are not synchronized. To move a document, download a backup (.zip) from Save to PC on one side and open it with Restore backup on the other. `tests/unit/desktop-backup-restore.test.ts` checks that a backup made from the desktop store opens through the browser-side restore with the same title, body and photo. The user-facing description of what is stored and what leaves is the [privacy and storage guide](https://jiwonschol.github.io/wonboard/privacy.html#english).

## Acceptance

Run the packaged macOS app, create a document with Korean and English text, wait for the device-save status, quit, relaunch the same app, and confirm the document restores. Storage unit tests also cover binary photos, stale revisions, and rejected missing/altered photos. A successful build alone does not satisfy this acceptance check.

### Local verification, 2026-09-09

- Packaged and launched `dist/desktop/Wonboard-darwin-arm64/Wonboard.app` (Electron 44.3.0 / Node 24.20.0).
- Entered a Korean title and Korean/English paragraphs through the native app. Attached one JPEG through the macOS file picker. Observed “이 기기에 저장됨”.
- Quit with Command-Q, confirmed the executable was no longer running, and opened the packaged app again. The title, paragraphs, attachment count, and rendered photo returned.
- TypeScript check, 139 unit tests, and all 5 Chromium writer tests passed. The unit count includes existing uncommitted whitespace tests; those files were preserved, not part of this implementation.
- Windows, Intel Mac, signing/notarization, Korean keyboard composition on a physical keyboard, and Sites synchronization are not verified by this run. Korean text was entered through native clipboard paste because the automation's typing API did not transmit Korean characters.
