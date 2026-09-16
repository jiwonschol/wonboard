# Sites 휴지통 30일 서버 제한 보강

2026-09-16. 담당 현철. 동준이 확정된 #8/#9 계약 누락의 수정·시험을 승인했다. 파일 보관함 2단계의 미결정 제품 정책과 독립한다.

## 재현과 수정

기준 HEAD는 `e139408274d76a507eab397f1ebca7ac1d3fc395`, 브랜치는 `buzz/9-trash-expiry`, 전용 작업 위치는 `.claude/worktrees/buzz-9-trash-expiry`다. 아래 결과는 이 HEAD 위 미커밋 수정본에서 얻었다. HEAD 자체가 수정본이라는 뜻이 아니다.

기존 `apps/server/src/sites/worker.ts`에서 세 반례를 먼저 추가하고 `pnpm test`를 실행했다. 30일 정각의 GET이 410 대신 200, 초기 읽기 후 정각에 실행된 복원 UPDATE가 409 대신 200, 정각의 게시 트랜잭션이 409 대신 200이었다. Vitest 결과 3 실패/163 통과. 그 실패 때문에 뒤의 Node 시험은 첫 실행에서 시작되지 않았다.

저장된 trashedAt을 읽고 기존 Date.parse 계약으로 기한을 계산한다. GET은 DB의 읽기 시각으로 기한을 검사한다. UPDATE는 revision·DB의 trashedAt 원문 일치·기한을 같은 SQL 조건에서 검사한다. 요청의 timestamp 삭제/미래 변경이나 revision 0으로 기존 행을 덮어쓰는 우회를 막는다. 기한 전에 읽어도 쓰기 시각이 정각이면 변경하지 않는다. 처음부터 만료이면 410/trashExpired, 읽은 뒤 경계 또는 revision이 바뀌면 409/storageConflict다.

DB 시각은 SQLite strftime의 정수 밀리초로 비교한다. Julian 실수 반올림으로 1ms 경계가 달라지는 것을 피한다. 기존 Date.parse가 받는 RFC 날짜도 계속 해석하며 incoming 값으로 기한을 계산하지 않는다. 저장된 timestamp와 revision이 달라졌으면 최종 SQL이 실패한다.

다중 사진 게시를 json_each를 사용하는 단일 조건부 INSERT/UPSERT로 묶었다. 사진마다 별도 SQL을 실행하면 그 사이 기한이 지나 일부 주소만 변경될 수 있기 때문이다. 한 문장의 시각 판단으로 전부 갱신하거나 아무것도 바꾸지 않는다. 성공 뒤 다른 저장이 생기는 기존 경쟁 시험도 유지한다.

## 목록과 구형 클라이언트

기존 useDrafts는 목록에서 만료 문서를 찾아 DELETE한다. 따라서 만료 문서를 목록에서 제거하지 않는다. 기존 검증기가 읽을 수 있는 문서 봉투에 ID·revision·trashedAt·locale·updatedAt은 남기고 제목과 발췌는 비운다. 그 봉투는 정리용 메타데이터이며 본문 GET 허용이 아니다. 새 API나 클라이언트 배포를 먼저 요구하지 않는다.

현재 client 코드는 수정하지 않았다. 브라우저 통합 시험에서 서버가 만료 봉투를 반환하고 첫 DELETE가 503이면 UI에 만료 글이 나타나지 않으며 서버에 정리 대상은 남는다. 다시 접속하면 기존 client가 다시 DELETE해 404가 된다. 체크하지 않은 기존 공개 사진 URL은 전후 모두 200이다. 사진 원본 삭제·공개 철회 계약·DB 스키마는 바꾸지 않았다.

## 검증

환경: Linux VPS, Node v22.23.2, pnpm 11.19.0, 잠금 파일 유지, Playwright Chromium 1243. 실제 Sites/ChatGPT 인증이 아니라 실제 SQLite와 R2·인증 대역이다.

| 명령 | 결과 |
| --- | --- |
| `git rev-parse HEAD` | 위 40자 SHA. 각 시험 시작 시 같은 작업 위치에서 확인 |
| `pnpm typecheck` | 통과. 초기 시험 시 clock callback 타입 오류 1개를 고친 뒤 재검증 |
| `pnpm test` | Vitest 169/169 + Node 341/341 = 510 통과 |
| `pnpm build:sites` | client/server 빌드 통과 |
| `pnpm test:sites --project=chromium` | 전체 9/9 통과. 신규 정리 재시도 1개 포함 |
| `WONBOARD_LOGIN_ID=expiry-fixture WONBOARD_LOGIN_PASSWORD=local-only-expiry-test pnpm test:e2e --project=chromium` | 종료 1, 167 통과/3 실패 (9.1분). 아래 실패 분리 |
| `git diff --check` | 통과 |

일반 작성기 첫 실행은 로컬 합성 로그인 환경값이 없어 fixture 로그인에서 예상 200/실제 503으로 반복 실패했다. 그 실행을 중단하고 위 합성값으로 전체를 재실행했다. 실제 계정 정보는 사용하지 않았다. 기본 설정 파일이나 운영 환경변수도 변경하지 않았다.

전체 작성기 재실행 실패 3개: `spelling.spec.ts:506` conditional intention with lexical rieul preservation, `spelling.spec.ts:540` 유의미하다까진, `writing-tools.spec.ts:3` 글꼴 안내. 앞의 둘은 맞춤법 결과/대화상자 기대값 불일치이고 세 번째는 `/private/tmp/wonboard-nanum-default.png`의 ENOENT다. 해당 제품 코드와 시험은 이번 diff에 없다. 수정 전 전체 브라우저 기준선에서 같은 실패를 확인한 상태는 아니므로 '기존 실패로 입증됨'이라고 쓰지 않는다. 별도 기준선 대조가 필요하며 닝닝/동준에게 넘긴다. Sites Chromium 9/9 통과와 일반 작성기 실패를 합쳐 성공으로 표시하지 않는다.

종료 코드: 최초 반례 `pnpm test` 1, 최종 `pnpm typecheck && pnpm test && pnpm build:sites` 0, Sites Chromium 0, 일반 Chromium 첫 실행 중단 130, 합성값을 지정한 일반 Chromium 1. 원본 로그: `/tmp/wonboard-expiry-red.log`, `/tmp/wonboard-expiry-final-unit.log`, `/tmp/wonboard-expiry-build.log`, `/tmp/wonboard-expiry-sites.log`, `/tmp/wonboard-expiry-e2e.log`, `/tmp/wonboard-expiry-e2e-configured.log`. Typecheck stdout은 도구 실행 기록에 있고 별도 로그 파일은 만들지 않았다. 검토 사본에는 이 로그들과 변경 파일을 함께 넣는다.

추가 단위 반례는 만료 직전 복원 성공, stale revision 충돌, 정각/직후, timestamp 제거/미래 변경, revision 0 우회, Date.parse의 기존 날짜 형식, 다중 사진의 한 번짜리 기한 판단이다. SQL 시각 경계는 시험 DB의 strftime 함수를 제어해 재현하며, 기존 시험과 Chromium은 실제 SQLite 시계를 쓴다.

실제 D1/Sites 배포, CDN, 두 번째 실제 계정, Firefox/WebKit, 패키징한 macOS/Windows는 이번 확인 범위가 아니다. 서버 수정으로 원격·기기 동기화나 물리 파일 정리를 추가하지 않았다.

## 남은 인계

전체 단위 실행 뒤 동준이 Luna 시험의 PATH 기반 격리 문제를 알렸다. 이후 `pnpm test` 및 lab 실행을 재실행하지 않았다. 이 계정에서 두 실행의 `/tmp/wonboard-luna-test-EUeK8G`와 `/tmp/wonboard-luna-test-CDEHi8`를 읽기만 했다. 각 성공 응답 3개가 가짜 실행기의 고정 `reason: fixture`, 토큰 100/30/20과 일치하고 실패 진단 stdout도 가짜의 `{"type":"turn.failed"}` 한 줄과 일치했다. 가짜 파일의 shebang은 `/usr/bin/node`다. 이는 이 두 실행이 fixture 출력을 사용했다는 근거이나, 부모 시험의 호출 감사 로그가 없어 모든 경로의 외부 호출 0회를 증명하지는 않는다. 격리 수정은 닝닝 담당이며 해당 수정을 받기 전 전체 Node 시험을 다시 돌리지 않는다. 원본 시험 자료는 비공개 디렉터리에 보존한다.

읽기 검색 범위 `tests/e2e`, `tests/sites-e2e`, `tests/helpers`, `packages/editor/src/proofreading`, `apps/server/src/sites`에서 `codex|proofreading-lab|--live` 매치는 없었다. 해당 브라우저 시험은 이미 종료됐으며 이 검색 결과를 저장소 전체의 무외부호출 보증으로 확대하지 않는다.

처음에는 로컬/global git user.name/email이 없어 커밋을 보류했다. 지원이 2026-09-16 채널 이벤트 `f44ed9d31694e26a509c57e6408baa3300c48c733cff9416405b568cfa43bc2a`에서 VPS 커밋 작성자를 기존 규칙대로 유지하라고 확정했다. 따라서 전역 설정은 바꾸지 않고 커밋 명령에 `Ji Won Chung <noname2k@naver.com>`을 적용하며, `Co-authored-by: Codex <noreply@openai.com>`과 기존 규칙의 Signed-off-by를 기록한다. merge·운영 배포는 하지 않는다.

## main 기준선 대조와 독립 검토

앞의 '기준선 미확인'은 최초 전체 실행 시점의 상태다. 이후 수정 전 main `e139408274d76a507eab397f1ebca7ac1d3fc395`의 별도 전용 워크트리에서 아래 세 사례만 대조했다. 같은 셸에서 HEAD를 확인했으며 이 실행 시점에는 제품 수정이 없었다.

```sh
WONBOARD_LOGIN_ID=expiry-fixture WONBOARD_LOGIN_PASSWORD=local-only-expiry-test pnpm test:e2e --project=chromium -g 'conditional intention with lexical rieul preservation|uncertain lexical candidate can be skipped without rewriting 유의미하다까진|new drafts use Nanum Myeongjo'
```

결과는 종료 1, 세 사례 모두 실패다. 원본 로그는 `/tmp/wonboard-expiry-baseline-three.log`다. 글꼴 시험은 CSS 확인 뒤 `page.screenshot`이 Linux에 없는 `/private/tmp/wonboard-nanum-default.png`를 열다가 같은 ENOENT로 실패했다. 두 번째 맞춤법 사례는 수정본 전체 실행의 563행과 달리 기준선에서 555행의 `Skip once` 찾기에서 실패했다. 따라서 같은 사례의 실패는 확인했지만 같은 assertion 또는 같은 원인이라고 입증하지 않았다. 전체 main 브라우저 기준선도 실행하지 않았다. 이 대조는 위험한 Luna/Node 단위 시험을 실행하지 않았다.

동준은 PR #18의 `fc2b4568214b7311a10c87b1bf1f0c80154cd440`을 독립 검토해 코드·SQL 범위의 차단 결함 0개를 보고했다. 실제 SQL을 SQLite에서 실행해 밀리초 .000/.123/.999 및 다음 초, 정각 0행/직전 2행, 두 번째 사진 ABORT 시 전체 롤백을 확인했다는 검토다. 전체 통합·운영·머지 승인이 아니며 이 문서 작성자가 재실행한 결과로 합산하지 않는다. 자동 체크 목록은 비어 있어 CI 통과로 표현하지 않는다. 안전한 전체 단위 재실행은 닝닝의 실행기 격리 수정 이후 남아 있다.

PR 제목안: `fix: enforce Sites trash expiry at server write boundaries`.
PR은 `Refs #8, #9`로 연결한다. 파일 보관함 2단계가 남아 이슈를 닫지 않는다.

## 격리 복구 후 전체 단위 재실행

동준의 2026-09-16 지시에 따라 #19의 `08e7424c60be346dd8191841fb765b2b6f866e3b`, `1fe19d0b2bc5fa2e68e4db4a6768313a0da75113`을 이 브랜치에 cherry-pick했다. 원 저자의 Co-authored-by와 DCO를 그대로 보존했다. 절대 경로 가짜 실행기와 별도 PATH 감시 실행기, 의도적인 이름 조회 양성 대조를 포함한다. 제품 서버 코드는 이 반영으로 바뀌지 않았다.

같은 셸의 `git rev-parse HEAD`는 `662bc7af0aa7130967c85dc7948d95e8f5ef4d40`이었다. 이 HEAD에서 `pnpm typecheck && pnpm test`를 실행해 종료 0, Vitest 169/169 + Node 347/347 = 516개 통과를 확인했다. 로그는 `/tmp/wonboard-expiry-safe-final-unit.log`다. 이는 이 VPS에서 직접 실행한 결과이며 닝닝의 전체 시험이나 동준의 격리 10개 결과를 대신 인용한 것이 아니다. 앞의 격리 수정 전 510개와 구분한다.

최종 검증 기록 커밋은 문서만 바꾸며 `[skip ci]`를 붙이지 않는다. 일반 Chromium의 세 실패와 실제 플랫폼 미검증은 여전히 남는다. 자동 체크가 없다는 사실을 CI 성공이나 머지 승인으로 바꾸지 않는다. #19 README의 양성 대조 문구 보완은 원 담당자가 별도로 진행 중이다.
# P1 후속: 휴지통 시각의 서버 정본

리뷰 코멘트 4026253742의 반례를 실제 PUT API와 메모리 SQLite로 재현했다. `pnpm exec vitest run`은 새 반례 2개가 실패했다(171개 중 169 통과): 최초/활성 문서의 미래 시각이 그대로 저장되고, 기존 시각 교체가 409 대신 200이었다. 로그 `/tmp/wonboard-expiry-p1-red.log`.

최초 휴지통 진입( revision 0 포함)은 DB 시각으로 정규화하고 그 값을 응답한다. 이미 휴지통인 문서의 다른 시각 입력은 409이며, 동일 시각 저장과 속성 생략 복원은 기존 revision·만료 검사를 유지한다. 기존 만료 fixture는 테스트 전용 loopback 모듈에서 DB에 넣으며 운영 API로 기한을 조작하지 않는다. 구형 비 ISO DB 값 fixture도 직접 유지해 검사했다.

수정본은 `63c2a673f7437f1f85b900c0cd44d137d3b12319` 위 미커밋 변경으로 `pnpm typecheck && pnpm test` 종료 0 (Vitest 171 + Node 347 = 518), `pnpm test:sites --project=chromium` 종료 0 (9/9). 로그 `/tmp/wonboard-expiry-p1-green.log`, `/tmp/wonboard-expiry-p1-sites.log`. 전체 일반 작성기·운영 시험 통과로 확장하지 않는다. 2단계 배포물 관리 정책은 별도 #23에 남긴다.
# P1 후속: 기기 시계와 자동 영구 삭제 분리

동준이 기기 시계 +31일에서 정규화된 새 휴지통이 즉시 자동 삭제되는 회귀를 재현했다. 새 API 반례는 수정 전 200(예상 409)으로 실패했다. 로그 `/tmp/wonboard-expiry-clock-red.log`.

DELETE는 `deletionIntent: "manual" | "expired"`를 구분한다. 의도가 없는 구형 요청은 자동 정리와 구별할 수 없으므로 서버상 만료 전 409로 보존한다. 그 결과 구형 클라이언트의 기한 전 수동 영구 삭제도 충돌로 남는다. 새 클라이언트의 수동 삭제/휴지통 비우기는 manual을 보내 정상 동작한다. 자동 정리는 stored timestamp·revision·DB 현재 시각을 최종 DELETE 조건에서 함께 검사한다. 사진 철회 SQL에도 동일 조건을 적용해 실패한 삭제가 사진부터 철회하지 않게 한다. 만료 후 재시도는 멱등이며, 철회하지 않은 공개 사진은 유지한다.

목록에 `serverNow`를 추가했다. Sites 저장소는 이 값을 응답 수신 시각의 monotonic performance clock에 고정하고, 목록/자동 정리·복원·휴지통 남은 일수는 그 시계를 사용한다. 기기 Date.now 변경에 따라 기준을 이동하지 않는다. 목록 서버 시각이 없는 응답은 실패로 처리하며 기기 시계로 정리를 강행하지 않는다. 로컬/데스크톱 모드는 기존 로컬 시계를 유지한다.

검증 SHA `5092ee450bf71ba1bc07079c0632fa538027ce9e`에서 같은 셸의 `git rev-parse HEAD` 후 `pnpm typecheck && pnpm test && pnpm test:sites --project=chromium`: 종료 0. Vitest 172 + Node 347 = 519개, Sites Chromium 11/11. 로그 `/tmp/wonboard-expiry-clock-immutable-unit.log`, `/tmp/wonboard-expiry-clock-immutable-sites.log`. 브라우저는 기기 ±31일, 휴지통 진입→재열기→복원→재진입→명시적 영구 삭제와 사진 보존을 검증했다. 서버 시험은 구형/자동 요청, 기한 직전/정각, 실패 후 재시도와 사진 보존을 포함한다. 첫 브라우저 시행의 버튼 이름 오기와 비동기 복원 대기 누락은 시험에서 수정했고 최종 전체 실행으로 확인했다.
# P1/P2 후속: 기존 미래 시각과 구형 철회의 원자성

Codex 4027134412의 과거 `trashedAt=2099` 행은 서버가 기록한 DB `updated_at`보다 늦은 휴지통 시각을 그 기록으로 제한한다. GET·목록의 정본, PUT 최종 기한, variant/publish, 자동 DELETE가 같은 기한을 사용한다. 내부 읽기 결과는 원본 DB timestamp와 정규화 문서를 구분하므로 CAS는 저장된 원본을 검사하고 성공 저장은 정규화 값을 고정한다. 따라서 후속 저장의 updated_at이 바뀌어도 기한이 다시 늘어나지 않는다. 아직 한 번도 저장하지 않은 기존 행도 만료 판단과 자동 정리가 된다. 운영 마이그레이션은 실행하지 않았다.

구형 withdraw 요청은 DELETE를 배치 첫 SQL로 실행해 기한을 한 번만 판정한다. 후속 사진 UPDATE는 `changes() = 1`일 때만 수행한다. [SQLite changes()](https://www.sqlite.org/lang_corefunc.html#changes)와 [D1 sequential transaction batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) 계약을 확인했고, 두 SQL 사이 시계가 만료 정각을 넘어도 둘 다 거부되거나 둘 다 성공함을 시험했다. 철회 UPDATE에 강제 ABORT를 넣으면 문서 DELETE까지 롤백된다.

수정 전 두 반례는 각각 실패했다: 미래 timestamp가 그대로 반환됨(`/tmp/wonboard-expiry-legacy-red.log`), 첫 SQL 직전/둘째 정각에서 삭제만 200(`/tmp/wonboard-expiry-delete-atomic-red.log`). 최종 코드 SHA `be867acc06cd1f0335a932a05c11dad18e01b0ed`에서 같은 셸 `git rev-parse HEAD` 뒤 타입·전체 단위 523개(Vitest 176+Node 347)·Sites Chromium 11/11 종료 0. 로그 `/tmp/wonboard-expiry-legacy-immutable-unit.log`, `/tmp/wonboard-expiry-legacy-immutable-sites.log`. 새 문서 커밋에서는 코드 동일성을 검사한다. 실제 D1 계정 실행·운영 적용·머지는 별도다.

## P2 후속: 최초 정본 일치와 절전 복귀 재동기화

앱 Date가 `.123`, DB 시각이 `.124`인 별도 대역에서 최초 저장 응답과 다음 GET의 trashedAt이 달라지는 반례를 먼저 고정했다. 수정 전 전체 Vitest 177개 중 해당 1개가 실패했다(`/tmp/wonboard-expiry-canonical-red.log`). PUT은 updatedAt과 새 trashedAt, 응답에 동일한 DB 시각을 사용한다. revision 0/활성 문서 모두 최초 PUT=GET=목록이고 응답으로 내용을 변경해 재저장하면 성공함을 검증한다.

Codex 4027281619: Sites는 focus/pageshow/visibilitychange에서 기존 추정 시각을 무효화하고 서버 목록을 다시 읽는다. 모든 페이지를 정상 수신해야 새 시각을 채택한다. 실패하면 추정 시각을 확인한 것으로 취급하지 않고 복원을 잠그며 저장소 오류를 표시한다. 복귀 동기화는 진행 중 저장/사용자 작업과 충돌하면 재시도하고 미저장 편집본을 목록에서 덮어쓰지 않는다. 로컬/데스크톱은 이 경로를 사용하지 않는다.

브라우저에서는 performance.now를 정지시키고 테스트 DB 시각만 31일 앞으로 이동했다. 목록 요청 실패 뒤 휴지통 항목 보존·복원 비활성화, focus 재시도 뒤 서버 만료 정리·공개 사진 보존을 확인했다. 테스트 시계 경로는 loopback 전용 Vite 대역에만 있다.

코드 SHA `a16e7ed6675f2567deca51b2920ac991a966aa66`에서 같은 셸 `git rev-parse HEAD` 후 `pnpm typecheck && pnpm test && pnpm test:sites --project=chromium`: 종료 0. 전체 단위 524개(Vitest 177+Node 347), Sites Chromium 12/12. 로그 `/tmp/wonboard-expiry-resume-immutable-unit.log`, `/tmp/wonboard-expiry-resume-immutable-sites.log`. 후속 문서 커밋은 코드 동일성으로 연결한다. 일반 작성기 기존 세 실패·실제 운영 미검증과 #19 Windows/dry-run 후속 통합 대기는 별개다.

## #19 실행기 후속 통합 — 2026-09-17

닝닝의 원본 코드 `ce1d57db732362dfb4021bab96d3ecf534ad967f`와 문서 `054a119a6ec98697d04fe86f759ba4c5ba81c5b8`를 중복 수정 없이 cherry-pick했다. 통합 SHA `177f56f465cb7ded425a0410c4a817cb784ea423`에서 같은 셸 HEAD 확인 후 `pnpm typecheck && pnpm test` 종료 0, Vitest 177 + Node 354 = 531개. 로그 `/tmp/wonboard-expiry-runner-integration.log`.

dry-run도 주입 경로를 검증하며 인증/생성을 호출하지 않는다. 플랫폼 무관 계약 9개와 POSIX 8개를 분리한 원본 변경을 포함한다. 이번 실행은 Linux이며 macOS 담당자의 결과·파괴 시험이나 실제 Windows 실행을 대신 주장하지 않는다. 실제 Windows는 미검증이다. 앱/편집기/브라우저 시험 소스는 e00dfab과 동일하며 브라우저 재실행은 하지 않았다. 기존 12개 Chromium 증거는 a16e7ed에 그대로 묶인다. 머지·운영·일반 작성기 미해결 범위는 별개다.
