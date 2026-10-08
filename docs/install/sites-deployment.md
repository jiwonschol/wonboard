# Sites 배포 설정과 DB 경로

새 설치는 저장소의 코드를 수정하지 않고 `pnpm install --frozen-lockfile`과 `pnpm build:sites`로 준비한다. Node.js 22.13 이상과 저장소가 정한 pnpm을 사용한다.

- `.openai/hosting.json`: D1 `DB`, R2 `MEDIA`의 논리 이름. 프로젝트 ID는 없다. Sites가 새 프로젝트를 연결할 때 해당 설치의 ID를 추가한다.
- `vite.sites-worker.config.ts`: 공식 `@openai/sites-vite-plugin`이 설정과 마이그레이션을 `dist/.openai`에 복사한다. 플러그인은 Worker 빌드에서만 사용하므로 로컬 로그인과 화면 빌드를 바꾸지 않는다.
- `wrangler.json`: Worker 진입점 `dist/server/index.js`, 정적 파일 디렉터리 `dist/client`와 `ASSETS` 이름을 선언한다. Worker가 먼저 요청을 처리한다. 실제 Cloudflare 리소스 생성·연결은 Sites가 소유한다. 이 파일로 별도 Cloudflare 배포를 실행하지 않는다.
- `apps/server/src/sites/db/schema.ts`와 `drizzle.config.ts`: Drizzle의 SQLite 표 정의와 생성 설정.
- `drizzle/`: 새 DB용 생성 SQL, snapshot, journal. 첫 SQL에는 Drizzle이 표로 표현하지 못하는 참조 무결성 트리거와 backfill 시작 행도 포함한다. 표 14개에는 휴지통 시각, 파일 보관함, 사진 객체, 파일 공유, 글 공유와 참조 목록이 포함된다.

빌드 마지막 검사는 Worker의 `default.fetch`, 화면 파일, 선언한 연결 이름, 원본과 빌드된 설정·마이그레이션의 바이트 일치를 확인한다. `pnpm build:site`도 설치 문장이 가리키는 설정 파일과 연결 이름을 검사한다. Worker 빌드는 React의 `react-dom/server.edge`를 사용해 Node 전용 스트림 의존성을 넣지 않는다. 실제 Sites의 저장·배포 도구와 다른 계정 로그인까지 로컬 빌드가 증명하지는 않는다.

## 새 설치

빈 DB에는 `dist/.openai/drizzle`의 초기 마이그레이션을 Sites가 적용한다. 별도 `schema.sql`이나 기존 설치용 `0001`·`0002`를 중복 적용하지 않는다. 저장·배포 전에 초기 SQL과 메타데이터가 포함됐는지 확인한다. `WONBOARD_OWNER_ID`는 지금 소유자 연결 방식 그대로 Sites 환경 값으로 저장한다. 프로젝트 ID·소유자 ID·사이트 주소·비밀값을 원본 저장소로 커밋하지 않는다.

## 설치 문장으로 만든 사이트를 새 버전으로 올리기

설치 문장은 `package.json`의 `version`에 `v`를 붙인 태그의 코드를 가져온다. 이렇게 설치한 사이트의 DB에는 `drizzle/`의 초기 마이그레이션만 적용돼 있다. 새 버전은 같은 Sites 프로젝트(기존 프로젝트 ID와 `DB`·`MEDIA` 연결)에 저장·배포한다. 태그의 `.openai/hosting.json`에는 프로젝트 ID가 없으므로 올릴 때 기존 사이트의 `project_id`만 넣고, 그 값은 원본 저장소로 커밋하지 않는다. 그리고 기존 사이트의 적용 이력에 없는 `drizzle/` SQL만 적용 대상으로 삼는다. `0000_sites-initial.sql`은 다시 적용하지 않는다. 사용자용 절차와 ChatGPT에 보내는 요청은 [설치 안내의 새 버전으로 올리기](./README.md#새-버전으로-올리기)에 있다. 이 절차는 실제 사이트에서 검증되지 않았다.

## 새 버전 내보내기(관리자)

태그 이름은 `package.json`의 `version` 한 곳에서 정한다. 설치 문장(`docs/install/install-prompt.txt`)의 저장소 줄과 ZIP 주소가 그 태그를 적고, 소개 페이지는 빌드 때 같은 태그를 넣는다. 설치 안내는 태그를 직접 적지 않는다.

1. `package.json`의 `version`을 새 버전으로 바꾼다.
2. `pnpm build:site --write-tag`로 설치 문장의 태그와 작업공간(`pnpm-workspace.yaml`의 `apps/*`·`packages/*`·`examples/*`) manifest의 버전을 맞춘다. 데스크톱판 패키징은 `apps/desktop/package.json`의 버전을 쓴다. 태그나 버전이 어긋난 채로 두면 `pnpm build:site`(CI의 `check`)가 실패한다.
3. 이 변경이 main에 들어가면 그 커밋에 `v<version>` 태그를 만든다.
4. main push로 도는 pages 워크플로는 원격에 그 태그가 없으면 `build-site.mjs`에서 실패하고 배포하지 않는다. 그동안 소개 페이지는 이미 있는 이전 태그를 가리키는 지난 판으로 남는다. 태그를 만든 뒤 pages 워크플로를 다시 실행(Run workflow)해 새 태그의 소개 페이지를 배포한다.

## 기존 설치 업그레이드

`drizzle/0000_sites-initial.sql`은 빈 DB 전용이다. 이미 표가 있는 DB에는 적용하지 않는다. 기존 배포에서 적용한 Drizzle SQL과 journal/snapshot을 보존하고, 이 저장소의 빈 DB용 `drizzle/`로 덮어쓰지 않는다. 이 저장소의 새 설치 꾸러미를 기존 사이트에 바로 배포하지 않는다.

기존 9월 초기 구조를 올리는 SQL은 `apps/server/src/sites/migrations/0001-trash-provenance.sql`과 `0002-storage-sharing.sql`이다. 적용 여부를 확인한 뒤 미적용 SQL만 순서대로 기존 설치의 공식 마이그레이션 이력에 추가한다. `0001`은 한 번만 적용한다. `0002`는 기존 공개 주소와 자료를 지우지 않고 참조 추적을 추가하며, backfill은 서버의 기존 분할 처리 경로를 따른다. 원격 DB 적용은 로컬 검증과 별개다.

실제 배포 원본을 확보하지 못했으므로 기존 사이트의 마이그레이션 이력까지 자동으로 변환하거나 추정하지 않는다. 로컬 테스트는 기존 SQL 두 파일의 적용과 데이터 보존을 검증한다.

## 스키마를 바꿀 때

표 정의를 바꾸면 `pnpm exec drizzle-kit generate`로 다음 SQL과 메타데이터를 생성하고 검토한다. SQLite 트리거는 표 snapshot에 표현되지 않으므로 변경이 필요하면 새 SQL에 명시한다. 적용된 SQL과 메타데이터를 다시 생성하거나 고치지 않는다. `schema.sql` 로컬 fixture와 배포 SQL의 동작을 함께 검증한다.

공식 근거: [Sites 프로젝트와 저장소 설정](https://learn.chatgpt.com/docs/sites?surface=app), [OpenAI Sites Vite 플러그인](https://github.com/openai/sites/tree/main/packages/sites-vite-plugin), [Cloudflare 정적 파일 바인딩](https://developers.cloudflare.com/workers/static-assets/binding/).
