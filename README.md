# Wonboard

**공들여 쓴 글을, 내가 활동하는 커뮤니티로.**

Wonboard는 글과 사진을 한곳에서 작성하고 보관한 뒤, 원하는 커뮤니티로 내보내기 위한 오픈소스 글쓰기 작업 공간입니다. 한국어와 영어를 함께 쓰는 사람, 사진이 많은 공략·사용기·여행기처럼 오래 남길 글을 쓰는 사람을 위해 만들고 있습니다.

> 현재 개발 중입니다. 제품 방향과 구현 상태를 구분해 읽어 주세요. 시험 배포와 개발 브랜치의 기능이 기본 브랜치에 모두 포함된 것은 아닙니다.

## 왜 원보드인가

좋은 글을 쓰는 일에는 이미 충분한 시간과 정성이 들어갑니다. 그런데 게시판마다 다른 편집기, 첨부 개수 제한, 사진을 외부에 올리고 주소를 붙이는 작업, 붙여넣은 뒤 다시 맞추는 줄바꿈까지 작성자의 몫이 되곤 합니다.

원보드는 그 반복 작업을 줄이려 합니다. 익숙한 커뮤니티와 독자는 그대로 두고, 글을 쓰는 공간을 더 편하게 만드는 것이 목적입니다. 새 커뮤니티로 이주하거나 개인 블로그를 운영할 필요 없이 자신의 글과 사진을 관리하면서 원하는 곳에 게시할 수 있는 도구를 지향합니다.

## 내 ChatGPT Sites가 내 글쓰기 공간이 됩니다

원보드는 **ChatGPT 구독자가 자신의 Sites에 원보드를 배포해 사용하는 방식**을 중심으로 개발하고 있습니다. Sites를 이용할 수 있는 사용자가 별도의 NAS, 개인 도메인, 클라우드 API 키를 준비하지 않고 자기 계정의 사이트를 글과 사진을 위한 공간으로 사용하는 것이 목표입니다.

작성 중인 글과 원본 사진은 비공개로 보관하고, 외부 커뮤니티에 게시할 사진만 공개 URL로 제공합니다. 원보드에서 글을 HTML로 내보내면 커뮤니티의 독자는 사용자 사이트에 저장된 게시용 사진을 볼 수 있습니다. 사이트의 공개 접근과 초안·원본의 접근 권한은 별도로 관리합니다.

현재 개인 Sites 시험 배포에서 문서 저장과 공개 이미지 표시를 검증하고 있습니다. 일반 사용자용 간편 설치와 데스크톱 동기화는 개발 중이며, 모든 ChatGPT 구독자에게 이용 가능하다는 보장은 아닙니다. 이용 자격과 저장·호스팅 조건은 ChatGPT Sites의 제공 정책을 따릅니다. 공개 이미지의 지속성도 사용자 사이트와 호스팅이 유지되는 조건에 달려 있습니다.

## 우리가 만들고 싶은 경험

1. **내 글을 모아 둡니다.** 글 목록에서 초안을 찾고 이어 씁니다.
2. **글에 집중합니다.** 워드프로세서처럼 서식을 지정하고 사진을 원하는 위치에 넣어 크기를 조절합니다.
3. **필요한 만큼만 다듬습니다.** 한영 통합 맞춤법 검사는 수정안을 제시하되 문체를 대신 결정하지 않습니다. 그대로 두고 넘어가는 것도 자연스러운 선택입니다.
4. **원하는 곳으로 내보냅니다.** 게시용 이미지 URL과 HTML을 준비해 같은 글을 여러 커뮤니티에 옮기는 수고를 줄입니다.

외부 사이트가 허용하는 HTML·글꼴·이미지 정책은 서로 다릅니다. 문단과 사진 배치를 가능한 한 잘 유지하는 것이 목표이며 모든 커뮤니티에서 완전히 동일한 표시를 보장하지 않습니다.

## 사람을 위한 편집기, 공유하는 코드

글을 쓰는 주체는 사람입니다. AI가 없어도 기본적인 작성 경험이 성립해야 하며, 문장 재작성이나 외부 AI API 키 입력을 필수로 요구하지 않습니다.

웹과 macOS·Windows 클라이언트는 편집기·문서 형식·렌더링·번역을 공유하는 monorepo로 개발합니다. Wonboard Core는 저장과 공개를 이어 주며, 장기적으로 쉽게 수정할 수 있는 게시판 기반을 지향합니다. 에이전트가 설치와 수정을 돕기 좋은 구조와 MCP 지원도 방향에 포함되지만 아직 완성된 기능은 아닙니다.

## 개발 상태

- **웹 편집기:** 글 목록, 서식, 사진 삽입·크기 조절, 영상 링크, 미리보기, 로컬 초안 및 ZIP 백업을 구현했습니다.
- **Sites 시험 배포:** 개인 문서 저장, 비공개 원본과 공개 게시 이미지 분리, HTML 내보내기와 외부 이미지 표시를 검증하고 있습니다. 범용 설치 패키지의 완성을 뜻하지 않습니다.
- **데스크톱 개발 브랜치:** 공유 편집기와 로컬 저장을 구현하고 macOS에서 작성·저장·재실행 복원을 확인했습니다. Windows 검증과 기기 간 동기화는 남아 있습니다.
- **한영 통합 검사:** 실제 수정안을 제공하는 자체 검사기로 교체하는 [계획 단계](https://github.com/jiwonschol/wonboard/issues/6)입니다. 영어 문법은 후속 범위입니다.
- **향후 작업:** 간편 설치, 게시판 프리셋, MCP, 저장·게시의 운영 안정성 검증이 남아 있습니다.

로컬 웹·데스크톱·Sites의 문서가 이미 자동 동기화되는 상태는 아닙니다. 중요한 글은 별도로 백업해 주세요.

## English

Wonboard is an open-source workspace for people who write thoughtful, image-rich posts and publish them to their communities. Write in a familiar editor, keep drafts together, and reduce repeated formatting and attachment work across forums.

The intended hosting model is a personal Wonboard deployment on the user's own ChatGPT Sites, subject to Sites availability and terms. Drafts and original images stay private; explicitly published images receive public URLs for exported HTML. A personal test deployment exists, but general installation and desktop synchronization remain under development. Permanent hosting and identical rendering across all communities are not guaranteed.

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

Both `pnpm dev` and `pnpm preview` include this temporary local authentication service. A static `dist` upload alone cannot log in. Do not expose this development/preview server publicly. This local preview does not publish or upload documents; the separate Sites test deployment has different authentication and storage requirements. General-purpose production authentication, social login, the board server, and MCP remain unfinished. The embedded editor example is at `/examples/embedded-editor/`; its host deliberately has no persistence or image storage.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Personal ChatGPT Sites is the current direction for hosted writing and images. General installation, quotas, durability, and operating responsibilities still need validation. The earlier [storage decision record](docs/planning/storage-decision.md) preserves historical alternatives, not the current installation experience.

See [implementation plan](docs/planning/web-first-plan.md), [progress and remaining checks](docs/planning/progress.md), and [Gnuboard dependency research](docs/reference/gnuboard-open-source.md). Wonboard's own code is MIT; third-party components retain their respective licenses. See `public/THIRD_PARTY_NOTICES.txt` and any component-specific notices included with the version you use.
