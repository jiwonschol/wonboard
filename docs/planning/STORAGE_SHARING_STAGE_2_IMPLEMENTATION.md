# 저장·공유 2단계 구현 기록

담당 현철. 기준 main `e139408274d76a507eab397f1ebca7ac1d3fc395`. 전용 브랜치 `buzz/9-storage-sharing`. 2단계 전체 완료 문서가 아니라 진행 중인 구현·검증 기록이다.

정본은 #9와 [작성/배포 분리 계약 PR #17](https://github.com/jiwonschol/wonboard/pull/17), [실행 계획 PR #16](https://github.com/jiwonschol/wonboard/pull/16)이다. 초안 삭제와 배포물 철회를 분리한다. 기존 철회 UI는 보관함의 대체 관리 경로를 제공할 때 함께 변경한다. 실제 운영 DB·업로드·삭제·배포는 하지 않는다.

## 현재 구현

문서의 선택적 `files` 메타데이터와 인라인 `fileRef` 노드를 추가했다. 범용 파일은 파일명으로, PNG/JPEG는 기존 이미지 노드로 삽입한다. ZIP은 `files/<id>`를 추가하고 파일별 크기·해시를 검사한다. 기존 ZIP 읽기와 256MiB 상한은 유지한다. 미공개 fileRef가 있으면 HTML 내보내기를 `privateFile`로 거절한다. 사용자 업로드 HTML/SVG를 렌더러로 실행하지 않는다.

브라우저 보관함은 별도 IndexedDB에 독립 원본을 저장한다. 문서는 첨부의 이동 가능한 사본을 기존 drafts 레코드에 보관하므로 보관함 원본 삭제와 다른 문서 삭제가 남은 문서의 바이트를 지우지 않는다. 이 어댑터는 바이트 중복 제거를 하지 않는다. 물리 참조 장부를 공유하는 Sites와 구분하며, 같은 바이트 여러 사본은 실제 저장 사용량에 포함된다. 데스크톱 문서 저장·복원도 files 바이트를 기존 불변 해시 저장 경로로 처리하도록 확장했다. 데스크톱 독립 보관함 IPC는 아직 미구현이다.

로컬 보관함 UI의 다중 업로드·부분 실패 재시도·이름 검색/변경·휴지통/30일 경계·복원·개별 다운로드·다중 선택을 연결했다. 작성 중에는 문서 ID와 ProseMirror selection bookmark를 보관하고 편집 트랜잭션으로 위치를 매핑한다. 취소는 원래 선택/서식을 복원한다. 파일 다중 삽입 앞뒤를 명시적인 history 경계로 분리한다. 언어는 ko/en, 화면은 옆 패널/390px 시트다. Sites/desktop 보관함 버튼은 아직 노출하지 않는다.

## 지금까지 실행한 시험

각 실행의 HEAD는 위 main이고 결과는 그 위 미커밋 변경본이다. `pnpm typecheck` 통과, `pnpm exec vitest run` 전체 TS 시험 14파일/173개 통과. Node lab 시험은 격리 수정 반영 전 실행하지 않았다. 로그 `/tmp/wonboard-sharing-vitest.log`.

추가 `tests/e2e/file-library.spec.ts`로 1440/390px 본문 중간 삽입·취소·undo/redo·저장 재열기·HTML 다운로드를 확인 중이다. 최초 시험은 Home 입력이 실제 DOM 커서를 이동하지 않아 거짓 전제로 실패했다. 패널 진입 전 DOM 커서 위치 assertion을 추가했다. 그 뒤 실제 결함인 '직전 타이핑과 파일 삽입의 undo 그룹 결합'을 재현하고 closeHistory 경계로 수정했다. 모바일 재열기에서 기존 설정 패널이 다운로드 링크를 가리는 경우는 사용자가 설정을 닫는 흐름으로 시험한다. 최종 결과는 후속 기록으로 남긴다.

## 남은 완료 게이트

Sites의 예약 업로드·참조 보존·정리 재시도와 동시성, 공개 파일 만료/철회/재발급, 독립 공유 글과 고정 자산·원자적 갱신, 배포물 관리 UI 및 기존 사진 관리 이동, 데스크톱 보관함 IPC, 통합 휴지통, 전체 회귀와 실제 플랫폼 증거가 남아 있다. 이 기록을 2단계 완료로 해석하면 안 된다.

Workers 구현에는 [공식 best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [R2 바인딩 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)와 최신 workers-types를 확인했다. 기존 Sites 어댑터 경계는 유지하고 새 계정·서비스·운영 설정을 도입하지 않는다.

## 후속 체크포인트 — 2026-09-16

위 초기 진행 상황 중 Sites/desktop 미구현 표시는 이 절로 갱신한다. 기준 HEAD는 `011fd1c00babae97ccf136e4c5b09623a6b2c6d2`이며 아래 결과는 그 위 미커밋 변경본에서 얻었다. 이 HEAD 자체의 통과라고 주장하지 않는다. #18 휴지통 보강과 #19 최종 실행기 격리 코드를 포함했다.

Sites 보관함의 예약 업로드, 문서 저장과 같은 SQL 트랜잭션의 파일 참조 트리거, 독립 파일 공유와 만료/철회/재발급을 구현했다. 정리는 소유자의 명시적 요청으로 최대 20건씩 처리한다. 활성 보관함·문서·철회된 공유라도 남은 참조가 있으면 보존한다. 삭제 응답 유실 및 임대 만료 뒤 업로드 완료는 삭제 상태의 객체에 재참조를 금지하고 tombstone을 재정리한다. 기존 사진 객체는 새 파일 정리 대상에 넣지 않았다. tombstone 재삭제 횟수는 새로 확보한 용량으로 표시하지 않는다.

데스크톱은 기존 IPC 발신자 검사 안에 파일 보관함 연산을 추가했다. SQLite의 독립 BLOB과 문서의 기존 불변 파일 사본은 중복 저장하며, 보관함 삭제가 문서 사본을 지우지 않는다. 이름 변경·revision 충돌·바이트 해시·20MiB 상한은 메인 프로세스에서 검사한다. 실제 Electron 창 및 macOS/Windows 실행은 미확인이다.

글 삭제의 사진 철회 체크박스와 내보내기 패널의 일괄 철회 버튼을 없애면서 보관함에 기존 사진을 포함한 배포물 관리 경로를 제공했다. 구형 클라이언트가 문서 DELETE에 `withdrawPublications: true`를 보내도 배포물은 보존한다. 글 휴지통에서도 보관함으로 이동할 수 있다. 명시적인 보관함 철회만 기존 사진 주소를 끊는다.

실행 결과:

- `pnpm typecheck && pnpm test`: 종료 0, Vitest 187개 + Node 347개 = 534개. 로그 `/tmp/wonboard-sharing-full-unit.log`. 이 실행 뒤 WritingLibrary 휴지통의 보관함 버튼 한 곳을 추가했고, 아래 Chromium과 세 빌드는 그 변경을 포함한다.
- `pnpm test:sites`: 종료 1. Chromium 10/11, 휴지통에서 보관함 진입점 누락으로 1개 실패. Firefox/WebKit 22개는 브라우저 실행 파일 없음으로 시작 실패다. 로그 `/tmp/wonboard-sharing-sites-browser.log`. 코드 결함과 환경 실패를 구분한다.
- 진입점 수정 후 `pnpm test:sites --project=chromium`: 종료 0, 전체 Sites Chromium 11/11. 로그 `/tmp/wonboard-sharing-sites-chromium.log`. 익명 HTML 강제 다운로드와 CSP, 철회/재발급, 문서 삭제 후 사진 보존과 별도 철회, 파일 선택만으로 공개되지 않는 것을 실제 Chromium에서 확인했다.
- `pnpm build && pnpm build:sites && pnpm build:desktop`: 종료 0. 로그 `/tmp/wonboard-sharing-build.log`, `/tmp/wonboard-sharing-build-sites.log`, `/tmp/wonboard-sharing-build-desktop.log`. 빌드는 실제 계정 배포나 데스크톱 실행 증거가 아니다.
- 앞선 로컬 작성기 파일 시험은 Chromium 3/3, `/tmp/wonboard-file-library-browser.log`. 전체 작성기 회귀는 이번 변경본에서 아직 재실행하지 않았다.

공유 글 스냅샷, 고정 사진 자산의 원자적 갱신, 통합 휴지통 필터, 기존 데이터 마이그레이션 및 총량/정리 상태 표시, 전체 작성기 회귀는 여전히 남아 있다. 운영 적용과 배포는 하지 않았다.

## 첨부 예산 및 승인 반영

2026-09-16 승인 전달 이벤트 `a10e7b16feb91b3c896e932d3f1f6d6252ca400e182151970c451fdc1195dc94`에 따라 옛 자산 URL의 공개 유예는 갱신 성공 시각부터 최대 5분으로 확정됐다. 옛 주소를 아는 누구나 접근 가능하며 부모 공유 철회·만료·재발급이 우선한다. 원본의 강제 삭제 기한은 아니다. 스냅샷 구현 자체는 아직 남았다.

문서 사진+일반 첨부는 기존 `limits.mediaBytes` 220MiB 합계 예산을 공유한다. 파일당 20MiB 및 보관함 전체 총량과 구분한다. 공통 문서 검증과 삽입 전에 적용하며, JSON은 32MiB 이하여서 256MiB ZIP 상한 안에 컨테이너 여유 4MiB를 남긴다. 최종 ZIP 실제 크기 검사도 유지한다. 동일 ID 반복 참조는 한 번, 다른 ID는 별도로 센다. 실행 취소용으로 문서 메타데이터에 남은 첨부도 세므로 한도를 넘는 추가 삽입은 저장 전에 거절한다.

220MiB 혼합 정각/1바이트 초과, 20MiB 파일 13개, JSON 정각/초과 및 기존 ZIP 컨테이너 경계 시험을 확인했다. `33a63c6`(#18 P1 반영) 위 미커밋 예산 변경에서 `pnpm typecheck && pnpm test` 종료 0, Vitest 191 + Node 347 = 538개. 로그 `/tmp/wonboard-sharing-budget-final-unit.log`. 바로 앞 예산 변경에서 전체 Sites Chromium 11/11 종료 0(`/tmp/wonboard-sharing-budget-sites.log`); 이후 변경은 공통 JSON 크기 검사와 그 단위 시험이며 브라우저 전체 재실행은 다음 최종 게이트에 포함한다.

P1 cherry-pick 시 테스트 라우팅 충돌은 `/shared/`와 `/__sites-test/`를 모두 보존했고 검증 문서도 양쪽 기록을 유지했다. proofreading 파일은 별도로 수정하지 않았다.

## PR #23 리뷰 반례 수정 — 2026-09-17

코드 SHA `3bb4df0fcccb5eb6c1db80deb00dec317633e6bd`에서 같은 셸 HEAD 확인 뒤 타입·전체 단위 542개(Vitest 195+Node 347), 전체 Sites Chromium 14/14 종료 0. 로그 `/tmp/wonboard-sharing-review-immutable-unit.log`, `/tmp/wonboard-sharing-review-immutable-sites.log`.

업로드 응답 유실 후 동일 File 재시도는 준비한 파일 ID를 재사용한다(4027022213). 동일 Site의 삭제·정리된 파일이 들어 있는 ZIP 복원은 새 파일 ID와 내부 참조를 함께 배정해 tombstone이나 옛 공유를 되살리지 않는다(4027022222). 공유 활성 상태는 서버 응답에서 계산해 기기 시계 +31일에도 유효 링크가 사라지지 않는다(4027190011). 공유 삭제 응답 유실 뒤 반복 DELETE는 성공한다(4027190024). HTML 재준비 시작 때 이전 HTML과 복사 상태를 지워 실패 뒤 철회된 주소를 복사하지 못하게 한다(4027190033). 실제 Chromium에서 기기 시계 오차→공유 HTML 준비→서버 철회→재준비 실패 및 이전 HTML 제거까지 확인했다.

4027022202의 첨부 총량은 앞선 220MiB 합계 예산으로 처리했다. 공개 사진 삭제 시 R2 바이트/재시도 장부 보존(4027022193)은 아직 미해결이며 다음 수정 대상이다. 스냅샷·통합 휴지통·최종 회귀도 완료하지 않았다. #18의 최신 정본/절전 시각 보강은 이 SHA 뒤 통합한다.

## 공개 사진 정리 및 문서 시계 통합

4027022193은 `f0ae4f37a26bab17fdd337e7fdc000a15ae086b6`에서 수정했다. 사진 삭제는 기존 키까지 객체 장부에 먼저 남기는 DB 트랜잭션으로 주소를 제거하고, 소유자의 정리 요청이 R2 삭제를 수행한다. 논리 삭제와 물리 회수는 별개이며 실패하면 장부·재시도 시각을 보존한다. 다른 publication이 같은 바이트를 쓰면 철회된 주소라도 명시적으로 삭제하기 전까지 보존한다. 개인 원본은 이 수집 대상에 넣지 않는다.

새 변형 사진은 put 전에 예약하고 업로드마다 불변 키를 새로 배정한다. 예약 만료 후 늦게 완료된 put은 ready/참조로 승격되지 않고 tombstone 재시도가 회수한다. 게시 트리거가 정리 중/완료된 객체의 새 참조를 거부하며 기존 키는 게시/갱신/명시적 삭제 때 등록한다. 과거 미등록 R2 전체 inventory/운영 정리는 실행하지 않았다. 미게시 예약은 한 시간 보호 뒤 정리 대상이 된다.

두 누수 반례를 수정 전에 실패 확인했다(`/tmp/wonboard-photo-cleanup-red.log`). 삭제 실패 재시도·공유 바이트 최종 참조·원본 보존·늦은 업로드·정리 중 게시·구형 행·장부 실패 롤백을 검증했다. 최초 수정의 UPSERT/트리거 충돌은 명시적 ON CONFLICT DO NOTHING으로 고쳤다. 기존 게시 경쟁 시험은 새 업로드 배치가 아니라 원래 게시 직후에 변경을 주입하도록 맞췄다.

위 고정 SHA에서 같은 셸 HEAD 확인 후 타입·전체 단위 552개(Vitest 205+Node 347)·Sites Chromium 15/15 종료 0. 로그 `/tmp/wonboard-photo-cleanup-immutable-unit.log`, `/tmp/wonboard-photo-cleanup-immutable-sites.log`. #18의 기존 미래 행 보정·정본 시각·복귀 시계도 통합했다. 충돌한 DELETE의 구형 철회는 가져오지 않고 2단계 배포물 독립 보존을 유지했으며 관련 시험도 양쪽 기한에서 사진 보존으로 변경했다. `TRASH_EXPIRY_SERVER_VERIFICATION.md`의 철회 기록은 #18 당시 증거이지 현재 2단계 동작이 아니다.

새 Codex 4027619911/4027619919(파일 만료 다운로드·UI 시각)는 다음 수정 대상이다. 스냅샷과 다른 남은 게이트도 아직 완료하지 않았다.

## 파일 휴지통 서버 시계 보강

4027619911/4027619919는 코드 `b73effa88df163591d1e69d30e11f34f26b6d8a2`에서 수정했다. 보관함의 GET/HEAD 다운로드는 DB 시각의 30일 정각부터 410이고 새 휴지통 시각도 DB에서 정한다. 독립 공유 경로는 이 기한에 묶지 않는다. 문서 참조는 `/api/documents/:id/files/:fileId`에서 소유자·유효 문서·실제 참조를 확인해 읽으므로 보관함 삭제/만료가 남은 글의 재열기를 깨지 않는다.

파일 목록은 기존 배열 응답을 유지하면서 서버 시각 헤더를 제공한다. Sites 어댑터는 monotonic 시계에 고정하고 복귀 때 무효화·재동기화한다. 겹친 옛 요청은 최신 시각을 덮지 못한다. 보관함 복원/다운로드는 1초마다 기한을 갱신하고 실패한 동기화에는 비활성화한다. 로컬/데스크톱은 기존 로컬 시계를 유지한다.

소유자 만료 반례는 수정 전 200(예상 410)으로 실패(`/tmp/wonboard-file-clock-red.log`). 위 고정 SHA에서 같은 셸 HEAD 확인 후 타입·전체 단위 553개(Vitest 206+Node 347)·Sites Chromium 17/17 종료 0. 로그 `/tmp/wonboard-file-clock-immutable-unit.log`, `/tmp/wonboard-file-clock-immutable-sites.log`. 브라우저 ±31일 오차·활성 화면의 만료 진행·복귀 실패 및 재시도 오류 해소, API 정각/직전·공개 공유·유효 문서 첨부 보존을 확인했다. 스냅샷/전체 작성기·운영 게이트는 여전히 남았다.

## 독립 공유 글 스냅샷

코드 `f35ac1ba40d0447415edb6e4b763c601ccd1f48d`에 스냅샷 생성과 보관함의 명시적 갱신·만료 변경·철회·재발급·삭제·비공개 보관본 보기를 연결했다. 초안과 현재 HTML 버전은 독립이며 초안 삭제도 공유를 지우지 않는다. HTML은 공통 렌더러로 한 번 생성해 저장한다. 공유 글만 영상을 원래 링크로 표시하고 기존 편집기/HTML 내보내기의 iframe 동작은 바꾸지 않았다.

자산은 불변 사진 객체를 참조하고 가변 `/media/:id`를 넣지 않는다. HTML의 상대 자산 URL은 재발급된 토큰에서도 현재 버전을 읽게 한다. 갱신은 문서 revision/기한·공유 revision·첨부 공유 활성 상태를 최종 SQL에서 확인하고 새 버전/자산 참조와 포인터 교체를 한 트랜잭션에 넣는다. 자산 쓰기 실패 시 이전 HTML/버전으로 롤백한다. 다른 글·공개 사진·현재/유예 중 스냅샷의 객체는 정리가 보존한다.

이전 버전 자산은 갱신 성공 시각부터 5분 미만일 때 옛 URL을 아는 누구나 읽는다. 5분 정각에는 404이며 부모 철회/만료/재발급의 옛 토큰은 유예보다 우선한다. 현재 고정본은 만료/철회 뒤에도 소유자 경로에서 유지한다. 공개/오류 응답 no-store, noindex, 스크립트/프레임/폼 금지 CSP를 사용한다. 이미 받은 바이트를 회수한다는 보장은 하지 않는다.

기본 두 API 반례는 구현 전 실패(`/tmp/wonboard-snapshots-red.log`). 추가 시험은 자산 실패 롤백·최종 문서 revision 경쟁·파일 공개 거절/독립 철회·영상 링크·기한 정각/HEAD·익명 소유자 접근 거절을 포함한다. 영상 fixture의 privacyHash 누락과 한국어 버튼 fixture 오기를 고친 뒤 고정 SHA에서 재실행했다.

같은 셸 HEAD 확인 후 타입·전체 단위 558개(Vitest 211+Node 347), 전체 Sites Chromium 18/18, Sites 빌드와 데스크톱 빌드 종료 0. 로그 `/tmp/wonboard-snapshots-immutable-unit.log`, `/tmp/wonboard-snapshots-immutable-sites.log`, `/tmp/wonboard-snapshots-immutable-build.log`, `/tmp/wonboard-snapshots-immutable-desktop-build.log`. Chromium은 실제 생성→초안 편집 뒤 불변→보관함 갱신→옛 자산 유지→철회→재발급 후 사진 표시를 확인했다. 한영 390px 및 영어 1440px, Escape 닫기, 페이지 오류 0과 모바일 가로 넘침 없음도 확인했다. 한영 모바일 스크린샷을 직접 읽었다. 실제 계정/CDN·macOS/Windows 실행이나 전체 일반 작성기 통과로 확장하지 않는다.

통합 휴지통 필터, 정리 용량/상태 표시와 로컬 마이그레이션·호환 시험, 일반 작성기 전체 회귀는 남은 게이트다. #19 후속 통합도 담당자의 SHA를 기다린다.

## 실행기 후속 통합 및 일반 작성기 결과

#19 원본 `ce1d57db732362dfb4021bab96d3ecf534ad967f`·`054a119a6ec98697d04fe86f759ba4c5ba81c5b8`를 통합했다. `fd6bdde127be878c6f3c4e6d220f933b42a556c6`에서 같은 셸 HEAD 후 타입·전체 단위 565개(Vitest 211+Node 354) 종료 0. 로그 `/tmp/wonboard-sharing-runner-integration.log`. Linux 실행이며 Windows 실제 실행은 미검증이다. 앱 코드는 ab1afd2와 같고 브라우저 재실행은 하지 않았다.

앞서 clean `ab1afd2e2377f04c5e098aa26edb2a9b339dfbc2`에서 실행한 전체 일반 작성기 Chromium은 170 통과/3 실패·종료 1이었다(`/tmp/wonboard-stage2-full-writer.log`). 실패는 resilience의 unsupported newest draft 복원, spelling 저렴이 개인 표현, writing-tools의 `/private/tmp/wonboard-nanum-default.png` ENOENT다. 이번 결과를 과거 세 실패와 동일한 assertion이라고 보지 않는다. 특히 복원 실패는 현재 트랙에서 원인을 확인해야 한다. 맞춤법/스크린샷 경로는 닝닝의 후속 소유와 조율한다. 통합 휴지통·정리 상태/마이그레이션·전체 회귀 완료를 아직 주장하지 않는다.
# 읽기 전용 화면 회귀 보강 (2026-09-17)

기준 HEAD `b47bd75bba38b301e99fac63b49a1de99a1f7d6d`의 일반 작성기 실패를 좁혀 재현했다.
`pnpm test:e2e --project=chromium tests/e2e/resilience.spec.ts --grep 'unsupported newest'`
는 종료 1이었다. App의 첨부 수 계산이 미지원 문서의 `content: null`에
`referencedFileIds`를 호출해 `Cannot read properties of null (reading 'type')`로
화면을 중단했다. ZIP 복원 자체가 아니라 최초 읽기 전용 화면의 회귀다.

파일 수 계산에도 기존 `writer.readOnly` 보호를 적용했다. 본문을 임의로 정규화하거나
미지원 데이터를 수정하지 않는다. 기존 실패 시험이 회귀 시험이며, 수정한 작업 트리에서
`pnpm test:e2e --project=chromium tests/e2e/resilience.spec.ts`는 Chromium 9/9,
종료 0이었다. 이 결과는 전체 작성기 통과가 아니다. 맞춤법 및 스크린샷 경로 실패와
기존 stage 2 미완료 항목은 별도다. Browser plugin not available: 저장소 Playwright를 사용했다.
## 실행기 후속 통합 및 남은 리뷰 (2026-09-17)

실행기 원본 c2acc52896b7180f487e6ff23dbb4f19f71311ca를 90d099afb1cf935ab096986b8124dbdc7ea63943로 통합. 같은 셸 HEAD 확인 후 타입·전체 단위 종료 0. 로그 /tmp/buzz-9-storage-sharing-runner-final.log. 실제 Windows 미검증. 최신 미해결 Codex: 4031781685(유예가 끝난 옛 스냅샷 HTML/자산 메타데이터 정리). 기존 stage 2 미완료 항목과 별개이며 머지하지 않음.
