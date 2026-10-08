# Wonboard

**공들여 쓴 글을, 내가 활동하는 커뮤니티로.**

Wonboard는 글과 사진을 한곳에서 작성하고 보관한 뒤, 원하는 커뮤니티로 옮기기 위한 오픈소스 글쓰기 작업 공간입니다. 한국어와 영어를 함께 쓰는 사람, 사진이 많은 공략·사용기·여행기처럼 오래 남길 글을 쓰는 사람을 위해 만들고 있습니다.

> **베타입니다 (0.1.0-beta.1).** 안내를 따라 자신의 ChatGPT 사이트에 직접 설치할 수 있는 사람을 위한 첫 공개 버전입니다. 정식 버전은 1.0.0이고, 간편 설치는 정식 버전에서 다룹니다. 아래 [베타에서 되는 것과 안 되는 것](#베타에서-되는-것과-안-되는-것)을 먼저 읽어 주세요.

## 베타에서 되는 것과 안 되는 것

- **무료입니다.** 원보드는 전면 무료이고 앞으로도 유료로 바꾸지 않습니다. 가입도 없습니다. ChatGPT 요금은 OpenAI에 내는 것이며 원보드와 관계가 없습니다.
- **ChatGPT 유료 요금제가 있어야 씁니다.** 원보드는 ChatGPT 사이트(Sites)에 설치하는데, Sites는 유료 요금제에서만 쓸 수 있습니다. 무료 요금제(Free·Go)에서는 베타 동안 원보드를 쓸 방법이 없습니다.
- **데스크톱판은 구독자의 보조용입니다.** ChatGPT를 구독하는 사람이 데스크톱 앱이 필요할 때 쓰는 용도이고, 베타 동안에는 설치 파일을 배포하지 않아 직접 빌드해야 합니다. Mac App Store에는 올리지 않습니다.
- **Windows는 베타에서 뺍니다.** 실제 Windows 기기에서 확인한 적이 없습니다.
- **글을 옮기는 길은 ZIP 백업입니다.** 데스크톱판과 Sites판 사이에는 자동 동기화가 없습니다. 한쪽에서 「PC 저장」의 백업(.zip)을 받아 다른 쪽의 「백업 가져오기」로 엽니다.
- **다른 계정에서의 설치는 아직 확인되지 않았습니다.** 지금까지 실제 설치는 만든 사람의 계정에서 한 번 한 것이 전부입니다.
- 글과 사진이 어디에 저장되고 무엇이 밖으로 나가는지는 [개인정보·저장 안내](https://jiwonschol.github.io/wonboard/privacy.html)에, 문의와 문제 제기는 [GitHub Issues](https://github.com/jiwonschol/wonboard/issues)에 있습니다. 두 곳 모두 앱의 「더 보기」에서 열 수 있습니다.

## 왜 원보드인가

좋은 글을 쓰는 일에는 이미 충분한 시간과 정성이 들어갑니다. 그런데 게시판마다 다른 편집기, 첨부 개수 제한, 사진을 외부에 올리고 주소를 붙이는 작업, 붙여넣은 뒤 다시 맞추는 줄바꿈까지 작성자의 몫이 되곤 합니다.

원보드는 그 반복 작업을 줄이려 합니다. 익숙한 커뮤니티와 독자는 그대로 두고, 글을 쓰는 공간을 더 편하게 만드는 것이 목적입니다. 새 커뮤니티로 이주하거나 개인 블로그를 운영할 필요 없이 자신의 글과 사진을 관리하면서 원하는 곳에 게시할 수 있는 도구를 지향합니다.

## 설치하기

원보드는 자신의 ChatGPT 사이트(Sites)에 설치해 글과 사진을 보관합니다. **원보드는 무료이고 가입이 없습니다.** 로그인은 ChatGPT 로그인 하나입니다.

1. [원보드 소개 페이지](https://jiwonschol.github.io/wonboard/)에서 설치 버튼을 누르면 설치 문장이 복사되고 ChatGPT가 열립니다. 버튼 없이 하려면 [설치 문장](docs/install/install-prompt.txt)을 통째로 복사합니다.
2. 자신의 ChatGPT에 붙여넣으면 ChatGPT가 설치 문장에 적힌 버전(태그)의 코드를 가져와 내 사이트에 배포하고, 소유자 연결까지 안내합니다. 같은 설치 문장으로 설치한 사람은 같은 버전을 받습니다.
3. 각 단계에서 보게 될 화면, 막혔을 때 할 일, 그만 쓰는 방법은 [단계별 설치 안내](docs/install/README.md)에 있습니다.

이미 설치한 사이트를 새 버전으로 바꾸려면 [새 버전으로 올리기](docs/install/README.md#새-버전으로-올리기)를 따르세요. 올리기 전에 ZIP 백업을 받고, 새 사이트를 만들지 않고 지금 사이트에 배포합니다. 이 절차는 아직 실제 사이트에서 해 본 적이 없습니다.

**ChatGPT Plus·Pro·Business·Enterprise·Edu 유료 요금제가 필요합니다. Free·Go에서는 Sites를 사용할 수 없습니다.** 무료 요금제에서는 베타 동안 원보드를 쓸 방법이 없습니다. [데스크톱판](#데스크톱판)은 구독자의 보조용이고 베타 동안 설치 파일을 배포하지 않습니다. 제공 여부와 한도는 [공식 앱 문서](https://learn.chatgpt.com/docs/sites?surface=app)를 확인하세요. 출시 시점 EEA·스위스·영국에서는 Sites 사용이나 공개 게시에 제한이 있었고, 제한 범위는 요금제에 따라 다를 수 있습니다. [공식 도움말](https://help.openai.com/en/articles/20001339-creating-and-managing-chatgpt-sites)의 지역 안내를 확인하세요.

**다른 계정에서 확인되지 않음.** 지금까지 실제 설치는 만든 사람의 계정에서 한 번 한 것이 전부입니다. 다른 계정에서의 설치는 베타 참가자의 첫 설치로 확인합니다.

### 내 글과 공개 사진

원보드의 글 목록·초안·원본 사진은 소유자 계정으로 접근을 제한합니다. 「공유하기」에서 공개를 확인한 게시용 사진만 외부 주소로 제공하며, 주소를 아는 사람은 보거나 복사할 수 있습니다. 계정의 Sites 한도에 닿으면 공개 사진이 표시되지 않을 수 있으므로 별도 ZIP 백업을 보관하세요.

**워크스페이스 편집자로 초대한 사람은 Site의 실제 DB와 초안을 읽을 수 있습니다.** 원보드의 소유자 검사는 플랫폼 편집자의 접근을 막지 않습니다. 신뢰할 수 있는 사람에게만 편집 권한을 주세요. [공동 편집 안내](https://learn.chatgpt.com/docs/sites?surface=app#collaborate-on-a-site)

### 소유자 연결과 개인정보

Sites판은 ChatGPT 로그인을 사용합니다. 설치 뒤 연결 화면에서 확인한 계정 ID를 `WONBOARD_OWNER_ID`에 설정하고 다시 배포한 뒤 설치 상태를 확인합니다. 순서는 [단계별 설치 안내](docs/install/README.md)를 따르세요. 환경 값 설정 방법은 [공식 설정 안내](https://learn.chatgpt.com/docs/sites?surface=app#configure-runtime-environment-values)를 따르세요. 이름·이메일로 소유자를 지정하지 않습니다.

원보드는 중앙 서버, 회원 DB, 분석 도구를 두지 않습니다. 판별 저장 위치, 밖으로 나가는 것, 수집하지 않는 것은 [개인정보·저장 안내](https://jiwonschol.github.io/wonboard/privacy.html)(한국어·영어) 한 페이지에 모았습니다. 사이트를 다른 사람이 방문하게 한다면 방문자에게 정보의 수집·이용을 설명할 책임은 설치한 본인에게 있습니다.

### 그만 쓰기

삭제 전에 중요한 글과 사진을 ZIP으로 백업하세요. [Site 삭제 안내](https://learn.chatgpt.com/docs/sites?surface=app#take-down-or-delete-a-site)를 따라 삭제한 Site는 복원할 수 없습니다. 연결된 저장소의 삭제 범위는 별도로 확인해야 합니다. 이미 게시판에 붙인 사진이나 다른 사람이 내려받은 사본은 회수되지 않습니다.

### Sites 기능별 공식 안내

Sites 기능은 다음 문서를 정본으로 참조합니다. 원보드의 저장·공유 동작과 플랫폼의 공개 설정은 함께 확인하세요.

| 필요한 안내 | 공식 문서 절 |
| --- | --- |
| 시작하기 | [Get started with Sites](https://learn.chatgpt.com/docs/sites?surface=app#get-started-with-sites) |
| 버전·배포 | [Understand projects, versions, and deployments](https://learn.chatgpt.com/docs/sites?surface=app#understand-projects-versions-and-deployments) |
| 글·사진 저장소 | [Choose a supported site shape](https://learn.chatgpt.com/docs/sites?surface=app#choose-a-supported-site-shape) |
| ChatGPT 로그인 | [Add Sign in with ChatGPT](https://learn.chatgpt.com/docs/sites?surface=app#add-sign-in-with-chatgpt) |
| 접근·공개 범위 | [Control access and secrets](https://learn.chatgpt.com/docs/sites?surface=app#control-access-and-secrets) |
| 공유 전 점검 | [Review before you share](https://learn.chatgpt.com/docs/sites?surface=app#review-before-you-share) |
| 한도·지원 범위 | [Understand limits and unsupported uses](https://learn.chatgpt.com/docs/sites?surface=app#understand-limits-and-unsupported-uses) |

## 데스크톱판

데스크톱판은 ChatGPT를 구독하는 사용자가 데스크톱 앱이 필요할 때 쓰는 보조용입니다. 로그인 없이 글과 사진을 이 컴퓨터에만 저장하고, 공유 기능은 없습니다.

- 베타 동안 설치 파일을 배포하지 않습니다. 서명한 설치 파일은 정식 버전 때 다시 정합니다. 쓰려면 [데스크톱 문서](docs/desktop.md)를 따라 직접 빌드합니다.
- 확인된 것은 2026-09-09에 Apple Silicon Mac에서 수동으로 한 번 한 작성·저장·재실행 복원이 전부입니다. Intel Mac과 실제 키보드의 한글 조합 입력은 확인된 적이 없습니다.
- Windows는 실기기에서 확인한 적이 없어 베타에서 뺍니다.
- Sites판과 글을 주고받으려면 「PC 저장」의 백업(.zip)과 「백업 가져오기」를 씁니다. 자동 동기화는 정식 버전 이후의 일입니다.

## 우리가 만들고 싶은 경험

1. **내 글을 모아 둡니다.** 글 목록에서 초안을 찾고 이어 씁니다.
2. **글에 집중합니다.** 워드프로세서처럼 서식을 지정하고 사진을 원하는 위치에 넣어 크기를 조절합니다.
3. **필요한 만큼만 다듬습니다.** 한영 통합 맞춤법 검사는 수정안을 제시하되 문체를 대신 결정하지 않습니다. 그대로 두고 넘어가는 것도 자연스러운 선택입니다.
4. **원하는 곳으로 옮깁니다.** 「공유하기」가 게시용 이미지 URL과 HTML을 준비해 같은 글을 여러 커뮤니티에 옮기는 수고를 줄입니다. 「PC 저장」은 글을 PDF·워드·텍스트·마크다운 파일이나 백업(.zip)으로 남깁니다.

외부 사이트가 허용하는 HTML·글꼴·이미지 정책은 서로 다릅니다. 문단과 사진 배치를 가능한 한 잘 유지하는 것이 목표이며 모든 커뮤니티에서 완전히 동일한 표시를 보장하지 않습니다.

## 사람을 위한 편집기, 공유하는 코드

글을 쓰는 주체는 사람입니다. AI가 없어도 기본적인 작성 경험이 성립해야 하며, 문장 재작성이나 외부 AI API 키 입력을 필수로 요구하지 않습니다.

Sites판, 데스크톱판, 개발자용 로컬 웹은 편집기·문서 형식·렌더링·번역을 공유하는 monorepo로 개발합니다. Wonboard Core는 저장과 공개를 이어 주며, 장기적으로 쉽게 수정할 수 있는 게시판 기반을 지향합니다. 에이전트가 설치와 수정을 돕기 좋은 구조와 MCP 지원도 방향에 포함되지만 아직 완성된 기능은 아닙니다.

## 개발 상태

- **버전:** 0.1.0-beta.1. 화면 위쪽 막대와 「더 보기」에 베타 표시와 버전 번호가 나옵니다.
- **편집기(세 판 공통):** 글 목록, 서식, 글상자·표, 사진 삽입·크기 조절, 영상 링크, 미리보기, 휴지통, 파일 보관함, 「PC 저장」(PDF·워드·텍스트·마크다운·ZIP 백업)과 「백업 가져오기」를 구현했습니다.
- **Sites판:** 개인 문서 저장, 비공개 원본과 공개 게시 이미지 분리, 「공유하기」(사진 공개와 HTML 준비)를 구현했습니다. 실제 설치와 동작은 만든 사람의 계정에서만 확인했고, 다른 계정과 운영 안정성 검증은 남아 있습니다.
- **데스크톱판:** 공유 편집기와 이 컴퓨터 저장을 구현했습니다. 확인 범위와 빠진 것은 [데스크톱판](#데스크톱판)에 적었습니다.
- **한영 통합 검사:** 자체 검사기가 한국어 철자·띄어쓰기와 영어 철자·일부 문법 수정안을 제공합니다. [정확도 재점검](https://github.com/jiwonschol/wonboard/issues/6)이 진행 중이며 문맥 전체를 판단하지는 못합니다.
- **설치:** 설치 문장과 단계별 안내, 소개 페이지를 마련했습니다. 다른 계정에서의 설치는 아직 확인되지 않았습니다.
- **향후 작업:** 게시판 프리셋, MCP, 저장·게시의 운영 안정성 검증이 남아 있습니다.

로컬 웹·데스크톱판·Sites판의 글은 자동으로 맞춰지지 않습니다. 판 사이로 글을 옮길 때는 ZIP 백업과 「백업 가져오기」를 쓰고, 중요한 글은 별도로 백업해 주세요.

## English

Wonboard is an open-source workspace for people who write thoughtful, image-rich posts and publish them to their communities. Write in a familiar editor, keep drafts together, and reduce repeated formatting and attachment work across forums.

Wonboard is in beta (0.1.0-beta.1). It is free and will stay free, and it has no sign-up of its own. You install it on your own ChatGPT site (Sites), which requires a paid ChatGPT plan; during the beta there is no way to use Wonboard on a free plan. Wonboard restricts drafts and originals to the owner; invited workspace editors can read the live database. Images you confirm in Share receive public URLs for the HTML you paste into a community. Installation starts from the [introduction page](https://jiwonschol.github.io/wonboard/) and a Korean [step-by-step guide](docs/install/README.md); it has not yet been verified on an account other than the maintainer's.

The desktop edition is a companion for ChatGPT subscribers who need a desktop app. It stores writing on the computer without sign-in and has no sharing. No installer is distributed during the beta, so you [build it yourself](docs/desktop.md); it has been checked by hand once on an Apple Silicon Mac, and Windows is excluded from the beta because it has never been checked on a real device. Documents move between the desktop edition and the Sites edition through ZIP backup and restore; there is no automatic synchronization. Where data is stored and what leaves is described in the [privacy and storage guide](https://jiwonschol.github.io/wonboard/privacy.html#english). Permanent hosting and identical rendering across all communities are not guaranteed.

## 개발자용 로컬 실행 / Developer preview

Requires Node.js 22.13+ and pnpm 11.19.0.

```sh
pnpm install
# Copy .env.example to .env.local and set the single test account there.
pnpm dev
```

Open http://127.0.0.1:5173. Korean/English writing, a collapsible document list, image insertion and resizing, an attachment sidebar, YouTube/Vimeo links, browser draft storage, preview, Save to PC (PDF, Word, text, Markdown) and ZIP backup/restore are implemented locally. Share works only in the Sites edition. Browser data can be removed by the browser or user: download backups of important drafts.

Attachment filenames follow the current document title by default; switching this off preserves the original filename. These are publishing names, not an upload: cloud hosting is not connected. Video playback options are saved with the document; external players load only in Preview and remain subject to the provider's embed permissions and browser autoplay policy.

Single-user test login is implemented through a loopback-only local server. Set `WONBOARD_LOGIN_ID` and `WONBOARD_LOGIN_PASSWORD` in the ignored `.env.local` file, then restart the server. Missing configuration denies login. Credentials are checked on the server; an HttpOnly cookie maintains an 8-hour session. Restarting the server invalidates sessions. Logout saves the current draft first; it does not delete local writing. This is an editor access gate, not encryption: someone with access to this browser's storage can still read its documents.

Both `pnpm dev` and `pnpm preview` include this temporary local authentication service. A static `dist` upload alone cannot log in. Do not expose this development/preview server publicly. This local preview does not publish or upload documents; the separate Sites test deployment has different authentication and storage requirements. The Sites edition uses ChatGPT sign-in. The board server and MCP remain unfinished. The embedded editor example is at `/examples/embedded-editor/`; its host deliberately has no persistence or image storage.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm build:desktop
pnpm exec playwright install
pnpm test:e2e
```

Personal ChatGPT Sites is the current direction for hosted writing and images. General installation, quotas, durability, and operating responsibilities still need validation. The earlier [storage decision record](docs/planning/storage-decision.md) preserves historical alternatives, not the current installation experience.

## 소식과 문제 제기

문의 창구는 [GitHub Issues](https://github.com/jiwonschol/wonboard/issues)입니다. 문제와 제안을 남겨 주세요. 새 버전 소식은 [Releases](https://github.com/jiwonschol/wonboard/releases)와 [릴리스 RSS](https://github.com/jiwonschol/wonboard/releases.atom)에 올라옵니다.

See [implementation plan](docs/planning/web-first-plan.md), [progress and remaining checks](docs/planning/progress.md), and [Gnuboard dependency research](docs/reference/gnuboard-open-source.md). Wonboard's own code is MIT; third-party components retain their respective licenses. See `public/THIRD_PARTY_NOTICES.txt` and any component-specific notices included with the version you use.
