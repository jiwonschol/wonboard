# wonboard
Wonboard is a human-first writing and publishing system, with a customizable board server and client in one monorepo.

## Local editor preview

Requires Node.js 22.12+ and pnpm 11.19.0.

```sh
pnpm install
# Copy .env.example to .env.local and set the single test account there.
pnpm dev
```

Open http://127.0.0.1:5173. Korean/English writing, a collapsible document list, image insertion and resizing, an attachment sidebar, YouTube/Vimeo links, browser draft storage, preview, and ZIP backup/restore are implemented locally. Browser data can be removed by the browser or user: download backups of important drafts.

Attachment filenames follow the current document title by default; switching this off preserves the original filename. These are publishing names, not an upload: cloud hosting is not connected. Video playback options are saved with the document; external players load only in Preview and remain subject to the provider's embed permissions and browser autoplay policy.

Single-user test login is implemented through a loopback-only local server. Set `WONBOARD_LOGIN_ID` and `WONBOARD_LOGIN_PASSWORD` in the ignored `.env.local` file, then restart the server. Missing configuration denies login. Credentials are checked on the server; an HttpOnly cookie maintains an 8-hour session. Restarting the server invalidates sessions. Logout saves the current draft first; it does not delete local writing. This is an editor access gate, not encryption: someone with access to this browser's storage can still read its documents.

Both `pnpm dev` and `pnpm preview` include this temporary local authentication service. A static `dist` upload alone cannot log in. Do not expose this development/preview server publicly. Production authentication, social login, the board server, public image storage, community export, and MCP are not implemented yet. This preview does not publish or upload documents. The embedded editor example is at `/examples/embedded-editor/`; its host deliberately has no persistence or image storage.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Public image hosting is an open product decision: user ownership, account/API costs, durable URLs, and the need for a relay are not settled. No provider has been selected for implementation. See the [storage decision record](docs/planning/storage-decision.md).

See [implementation plan](docs/planning/web-first-plan.md), [progress and remaining checks](docs/planning/progress.md), and [Gnuboard dependency research](docs/reference/gnuboard-open-source.md). Wonboard code is MIT; bundled dependency notices are in `public/THIRD_PARTY_NOTICES.txt`.
