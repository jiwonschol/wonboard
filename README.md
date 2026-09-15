# Wonboard

**공들여 쓴 글을, 내가 활동하는 커뮤니티로.**

Wonboard는 글과 사진을 한곳에서 작성하고 보관한 뒤, 원하는 커뮤니티로 내보내기 위한 오픈소스 글쓰기 작업 공간입니다. 한국어와 영어를 함께 쓰는 사람, 사진이 많은 공략·사용기·여행기처럼 오래 남길 글을 쓰는 사람을 위해 만들고 있습니다.

> 현재 개발 중입니다. 제품 방향과 구현 상태를 구분해 읽어 주세요. 시험 배포와 개발 브랜치의 기능이 기본 브랜치에 모두 포함된 것은 아닙니다.

## 왜 원보드인가

좋은 글을 쓰는 일에는 이미 충분한 시간과 정성이 들어갑니다. 그런데 게시판마다 다른 편집기, 첨부 개수 제한, 사진을 외부에 올리고 주소를 붙이는 작업, 붙여넣은 뒤 다시 맞추는 줄바꿈까지 작성자의 몫이 되곤 합니다.

원보드는 그 반복 작업을 줄이려 합니다. 익숙한 커뮤니티와 독자는 그대로 두고, 글을 쓰는 공간을 더 편하게 만드는 것이 목적입니다. 새 커뮤니티로 이주하거나 개인 블로그를 운영할 필요 없이 자신의 글과 사진을 관리하면서 원하는 곳에 게시할 수 있는 도구를 지향합니다.

## Sites에 설치하기 전에

**ChatGPT Plus·Pro·Business·Enterprise·Edu 유료 요금제가 필요합니다. Free·Go에서는 Sites를 사용할 수 없습니다.** 무료 계정 사용자는 [데스크톱 앱](#데스크톱-앱)을 이용하세요. 제공 여부와 한도는 [공식 앱 문서](https://learn.chatgpt.com/docs/sites?surface=app)를 확인하세요. [공식 도움말](https://help.openai.com/en/articles/20001339-creating-and-managing-chatgpt-sites)의 지역 안내에 따르면 출시 시점 EEA·스위스·영국에서는 사용할 수 없습니다. (2026-09-15 확인)

원보드는 자신의 ChatGPT Site에 설치해 글과 사진을 보관합니다. 설치·배포 방법은 아래 공식 문서로 안내하며, 일반 사용자용 간편 설치는 준비 중입니다.

### 내 글과 공개 사진

원보드의 글 목록·초안·원본 사진은 소유자 계정으로 접근을 제한합니다. 내보내기에서 공개를 확인한 게시용 사진만 외부 주소로 제공하며, 주소를 아는 사람은 보거나 복사할 수 있습니다. 계정의 Sites 한도에 닿으면 공개 사진이 표시되지 않을 수 있으므로 별도 ZIP 백업을 보관하세요.

**워크스페이스 편집자로 초대한 사람은 Site의 실제 DB와 초안을 읽을 수 있습니다.** 원보드의 소유자 검사는 플랫폼 편집자의 접근을 막지 않습니다. 신뢰할 수 있는 사람에게만 편집 권한을 주세요. [공동 편집 안내](https://learn.chatgpt.com/docs/sites?surface=app#collaborate-on-a-site)

### 소유자 연결과 개인정보

Sites판은 ChatGPT 로그인을 사용합니다. 설치 뒤 연결 화면에서 확인한 계정 ID를 `WONBOARD_OWNER_ID`에 설정하고 다시 배포한 뒤 설치 상태를 확인합니다. 환경 값 설정 방법은 [공식 설정 안내](https://learn.chatgpt.com/docs/sites?surface=app#configure-runtime-environment-values)를 따르세요. 이름·이메일로 소유자를 지정하지 않습니다.

이 Site는 로그인한 방문자의 ChatGPT 사용자 ID를 소유자 확인에, 제공되는 이름·이메일을 화면 표시에 사용합니다. 글·사진·안내 확인 기록은 이 Site에 저장하며 Onsoon Labs 중계 서버로 전송하지 않습니다. 설치자는 방문자에게 정보의 수집·이용을 설명할 책임이 있습니다. 플랫폼의 방문 통계는 [공식 Analytics 안내](https://learn.chatgpt.com/docs/sites?surface=app#review-site-analytics)를 확인하세요.

### 그만 쓰기

삭제 전에 중요한 글과 사진을 ZIP으로 백업하세요. [Site 삭제 안내](https://learn.chatgpt.com/docs/sites?surface=app#take-down-or-delete-a-site)를 따라 삭제한 Site는 복원할 수 없습니다. 연결된 저장소의 삭제 범위는 별도로 확인해야 합니다. 이미 게시판에 붙인 사진이나 다른 사람이 내려받은 사본은 회수되지 않습니다.

### Sites 기능별 공식 안내

Sites 기능은 다음 문서를 정본으로 참조합니다. 원보드의 저장·내보내기 동작과 플랫폼의 공개 설정은 함께 확인하세요.

| 필요한 안내 | 공식 문서 절 |
| --- | --- |
| 시작하기 | [Get started with Sites](https://learn.chatgpt.com/docs/sites?surface=app#get-started-with-sites) |
| 버전·배포 | [Understand projects, versions, and deployments](https://learn.chatgpt.com/docs/sites?surface=app#understand-projects-versions-and-deployments) |
| 글·사진 저장소 | [Choose a supported site shape](https://learn.chatgpt.com/docs/sites?surface=app#choose-a-supported-site-shape) |
| ChatGPT 로그인 | [Add Sign in with ChatGPT](https://learn.chatgpt.com/docs/sites?surface=app#add-sign-in-with-chatgpt) |
| 접근·공개 범위 | [Control access and secrets](https://learn.chatgpt.com/docs/sites?surface=app#control-access-and-secrets) |
| 공유 전 점검 | [Review before you share](https://learn.chatgpt.com/docs/sites?surface=app#review-before-you-share) |
| 한도·지원 범위 | [Understand limits and unsupported uses](https://learn.chatgpt.com/docs/sites?surface=app#understand-limits-and-unsupported-uses) |

## 데스크톱 앱

데스크톱판은 ChatGPT 구독과 로그인 없이 기기에 글과 사진을 저장합니다. 배포 파일이 제공되는 버전은 [Releases](https://github.com/jiwonschol/wonboard/releases)에서 확인하세요. macOS·Windows 패키징은 개발 중이며 현재 이용 가능한 설치 파일은 릴리스별로 확인해야 합니다. Sites와 기기 간 자동 동기화는 제공하지 않습니다. 개발자가 직접 빌드하려면 [데스크톱 문서](docs/desktop.md)를 참고하세요.

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
- **Sites 개발판:** 개인 문서 저장, 비공개 원본과 공개 게시 이미지 분리, HTML 내보내기를 구현했습니다. 실제 배포 계정의 동작과 운영 안정성 검증은 별도로 필요합니다.
- **데스크톱:** 공유 편집기와 로컬 저장을 구현하고 macOS에서 작성·저장·재실행 복원을 확인했습니다. Windows 실기기 검증은 남아 있습니다. 기기 간 동기화는 제공하지 않습니다.
- **한영 통합 검사:** 자체 검사기가 철자·띄어쓰기 수정안을 제공합니다. [정확도 재점검](https://github.com/jiwonschol/wonboard/issues/6)이 진행 중이며 영어 문법은 검사하지 않습니다.
- **향후 작업:** 간편 설치, 게시판 프리셋, MCP, 저장·게시의 운영 안정성 검증이 남아 있습니다.

로컬 웹·데스크톱·Sites의 문서가 이미 자동 동기화되는 상태는 아닙니다. 중요한 글은 별도로 백업해 주세요.

## English

Wonboard is an open-source workspace for people who write thoughtful, image-rich posts and publish them to their communities. Write in a familiar editor, keep drafts together, and reduce repeated formatting and attachment work across forums.

The intended hosting model is a personal Wonboard deployment on the user's own ChatGPT Sites, subject to Sites availability and terms. Wonboard restricts drafts and originals to the owner; invited workspace editors can read the live database. Explicitly published images receive public URLs for exported HTML. General installation is still being prepared. The desktop app uses local storage without sign-in; automatic synchronization with Sites is not provided. Permanent hosting and identical rendering across all communities are not guaranteed.

## 개발자용 로컬 실행 / Developer preview

Requires Node.js 22.12+ and pnpm 11.19.0.

```sh
pnpm install
# Copy .env.example to .env.local and set the single test account there.
pnpm dev
```

Open http://127.0.0.1:5173. Korean/English writing, a collapsible document list, image insertion and resizing, an attachment sidebar, YouTube/Vimeo links, browser draft storage, preview, and ZIP backup/restore are implemented locally. Browser data can be removed by the browser or user: download backups of important drafts.

Attachment filenames follow the current document title by default; switching this off preserves the original filename. These are publishing names, not an upload: cloud hosting is not connected. Video playback options are saved with the document; external players load only in Preview and remain subject to the provider's embed permissions and browser autoplay policy.

Single-user test login is implemented through a loopback-only local server. Set `WONBOARD_LOGIN_ID` and `WONBOARD_LOGIN_PASSWORD` in the ignored `.env.local` file, then restart the server. Missing configuration denies login. Credentials are checked on the server; an HttpOnly cookie maintains an 8-hour session. Restarting the server invalidates sessions. Logout saves the current draft first; it does not delete local writing. This is an editor access gate, not encryption: someone with access to this browser's storage can still read its documents.

Both `pnpm dev` and `pnpm preview` include this temporary local authentication service. A static `dist` upload alone cannot log in. Do not expose this development/preview server publicly. This local preview does not publish or upload documents; the separate Sites test deployment has different authentication and storage requirements. The Sites edition uses ChatGPT sign-in. The board server and MCP remain unfinished. The embedded editor example is at `/examples/embedded-editor/`; its host deliberately has no persistence or image storage.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Personal ChatGPT Sites is the current direction for hosted writing and images. General installation, quotas, durability, and operating responsibilities still need validation. The earlier [storage decision record](docs/planning/storage-decision.md) preserves historical alternatives, not the current installation experience.

## 소식과 문제 제기

[GitHub Issues](https://github.com/jiwonschol/wonboard/issues)에서 문제와 제안을 남기고, [Releases](https://github.com/jiwonschol/wonboard/releases)와 [릴리스 RSS](https://github.com/jiwonschol/wonboard/releases.atom)에서 소식을 확인할 수 있습니다.

See [implementation plan](docs/planning/web-first-plan.md), [progress and remaining checks](docs/planning/progress.md), and [Gnuboard dependency research](docs/reference/gnuboard-open-source.md). Wonboard's own code is MIT; third-party components retain their respective licenses. See `public/THIRD_PARTY_NOTICES.txt` and any component-specific notices included with the version you use.
