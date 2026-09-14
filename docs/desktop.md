# Desktop client

The Windows and macOS clients share `apps/desktop`. Its renderer imports the existing `apps/client/src/App.tsx`; the editor, document format, renderer, and translations remain shared with the web app.

## Build and run

```sh
pnpm install
# If package install scripts are disabled, explicitly install the Electron binary:
node node_modules/electron/install.js
pnpm build:desktop
pnpm desktop
pnpm package:desktop
```

Packaging creates a local application under `dist/desktop` for the current OS and architecture. The first target is macOS 13+ (Apple Silicon and Intel) and Windows 10/11 x64. Other platform builds and signed distribution require separate verification. These commands do not publish or deploy anything.

## Storage and privacy

Electron's user-data directory contains `library/documents.sqlite` and `library/images/<sha256>`. On macOS this is normally `~/Library/Application Support/Wonboard/`. The renderer has no filesystem access: a sandboxed preload exposes only document list, load, and save operations. The main process validates documents, checks photo hashes, and rejects stale revisions. Photos are written before the SQLite transaction commits. Unreferenced photos are retained for now rather than risking deletion of a needed file.

Documents save automatically and through the existing Save button. The status says “Saved to this device”, not saved to Sites. Closing with pending changes keeps the window open. Local data is not encrypted; the OS account controls access. Export backups using the editor's existing backup command.

Sites synchronization and public image hosting are not connected in this first desktop milestone. Publication remains disabled; installing this app does not silently upload documents or photos. The browser and desktop currently have separate libraries.

## Acceptance

Run the packaged macOS app, create a document with Korean and English text, wait for the device-save status, quit, relaunch the same app, and confirm the document restores. Storage unit tests also cover binary photos, stale revisions, and rejected missing/altered photos. A successful build alone does not satisfy this acceptance check.

### Local verification, 2026-09-09

- Packaged and launched `dist/desktop/Wonboard-darwin-arm64/Wonboard.app` (Electron 44.3.0 / Node 24.20.0).
- Entered a Korean title and Korean/English paragraphs through the native app. Attached one JPEG through the macOS file picker. Observed “이 기기에 저장됨”.
- Quit with Command-Q, confirmed the executable was no longer running, and opened the packaged app again. The title, paragraphs, attachment count, and rendered photo returned.
- TypeScript check, 139 unit tests, and all 5 Chromium writer tests passed. The unit count includes existing uncommitted whitespace tests; those files were preserved, not part of this implementation.
- Windows, Intel Mac, signing/notarization, Korean keyboard composition on a physical keyboard, and Sites synchronization are not verified by this run. Korean text was entered through native clipboard paste because the automation's typing API did not transmit Korean characters.
