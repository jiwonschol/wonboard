# 계정 데이터·권한 표 대조 기록 (2026-09-16, main e139408)

issue #10의 [3차 코멘트 `5674414667`](https://github.com/jiwonschol/wonboard/issues/10#issuecomment-5674414667)(2026-09-15)에 있는 데이터 항목 표·권한 표를 현재 `main`과 대조한 기록이다. **새 결정이 아니고 정책을 바꾸지 않는다.** 코드도 수정하지 않았다.

3차 코멘트는 PR #14(#9 1단계 휴지통)와 PR #15(#13 Sites 안내)가 병합되기 **전** 기준이고, 그 뒤 지원 원문 `f44ed9d3`(2026-09-16)이 초안과 배포물의 관계를 다시 정했다. 그래서 이 문서는 세 층을 섞지 않고 분리해 적는다.

| 층 | 뜻 |
| --- | --- |
| **현재 구현** | main `e139408` 의 코드에서 확인한 동작. 파일·행 번호로 근거를 단다 |
| **정리 대상** | `f44ed9d3` 로 기준이 바뀌어 앞으로 걷거나 옮겨야 하는 것 |
| **2단계 예정** | 결정만 있고 라우트 자체가 없는 것(#9 2단계) |

대조 기준 SHA와 실측 여부도 행마다 구분한다. **실측하지 않은 것을 실측으로 올리지 않는다.**

```
기준 main          e139408274d76a507eab397f1ebca7ac1d3fc395
대조 대상 코멘트    5674414667 (2026-09-15)
추가 기준          지원 원문 이벤트 f44ed9d31694e26a509c57e6408baa3300c48c733cff9416405b568cfa43bc2a (2026-09-16)
                   → "파일은 삭제해도 공유한 주소는 남겨야 해 … 공유한 글은 독립보존 …
                      원보드는 커뮤니티에 글을 쓰기 전 초안을 작성하는 개인의 워드프로세서"
확인 방식          정적 코드 대조. 실제 Sites 배포와 두 번째 ChatGPT 계정으로는 확인하지 않았다
```

## 1. 데이터 항목 표 대조

### 일치 확인 (현재 구현)

| 항목 | 3차 코멘트 | main `e139408` 근거 | 판정 |
| --- | --- | --- | --- |
| Site별 사용자 ID | 설치자 Site의 서버 비밀 설정, `installation.owner_id` | `worker.ts:69-71` `env.WONBOARD_OWNER_ID` 와 헤더 `oai-authenticated-user-id` 비교, `installation()` 이 `owner_id` 조회 | 일치 |
| 이메일·표시 이름 | 저장하지 않음, 요청마다 플랫폼 헤더로 전달 | `worker.ts:29-36` `displayName(request)` 가 `oai-authenticated-user-full-name`(percent-encoded 처리)과 `-email` 헤더만 읽음. **어떤 표에도 컬럼이 없다.** `worker.ts:75` 에서 소유자일 때만 응답에 실음 | 일치 |
| 사용자명·프로필 사진 | 코드가 읽지 않음 | 위 두 헤더 외 사용자 프로필 헤더 참조 없음 | 일치 |
| 동의 시각·언어 | `installation` 표 | `schema.sql` `installation(singleton, owner_id, accepted_at, locale CHECK IN ('ko','en'))`, `worker.ts:86-92` setup 에서 기록 | 일치 |
| 게시용 사진 공개 범위 | 주소를 아는 누구나 | `worker.ts:59-61` `/media/<public_id>` 가 **인증 검사보다 앞**에서 분기, `publicImage()` 가 `publications.published = 1` 을 요구 | 일치 |
| 사진 원본 보존 | 글을 영구 삭제해도 남음 | `schema.sql` 끝 주석 `Publications deliberately have no cascading document/media deletion.` + `worker.ts:141-143` 이 `documents` 행 삭제와 `publications.published=0` 만 수행. `media` 표와 R2 `originals/` 객체는 건드리지 않음 | 일치 |
| 플랫폼 방문 통계 | 원보드가 받지 않음·끄지 못함 | 코드에 analytics 수신·전송 경로 없음 | 일치(부재 확인) |
| 언어 설정 | 브라우저 `localStorage` | `apps/client/src/locale.ts` | 일치 |
| 로컬 모드 초안·계정 | IndexedDB + Git 제외 `.env.local` | `apps/server/src/local-auth.ts`, `.gitignore` | 일치 |

### 정정 1 — `trashedAt` 의 저장 위치

3차 코멘트는 문서 행의 저장 위치를 "Site D1 `documents`" 로 적고 "휴지통 이동 시 `trashedAt` 기록"이라고만 한다. 실제는 **전용 컬럼이 아니라 `documents.body` JSON 안의 필드**다.

```
schema.sql     documents(id, revision, title, locale, excerpt, body, updated_at)  ← trashedAt 컬럼 없음
worker.ts:98   SELECT … json_extract(body, '$.trashedAt') AS trashed_at …
worker.ts:102  …(row.trashed_at === null ? {} : { trashedAt: row.trashed_at })
```

저장 위치 표기에 "문서 JSON 본문 안"을 명시해야 한다. 마이그레이션·색인·조회 비용이 컬럼과 다르기 때문이다. 반대로 좋은 점도 있다: 스키마 마이그레이션 없이 휴지통이 들어갔다(`schema.sql` 변경 없음).

### 정정 2 — Sites 브라우저 임시 보관본의 삭제 조건에 예외가 있다

3차 코멘트: "원격 저장 성공 시 삭제, 로그아웃 성공 시 전부 삭제". 코드는 둘 다 맞지만 로그아웃 쪽에 조건이 더 붙는다.

```
useDrafts.ts:189  저장 성공 후 discardRecovery(documentId, token)   ← 해당 사본만
App.tsx:243-249   logout(): onLogout() 성공 && storageMode === "sites" && !writer.readOnly 일 때만 clearRecovery()
recoveryCache.ts:5  IndexedDB name = "wonboard-sites-recovery-v1"
```

즉 **읽기 전용 상태에서는 로그아웃해도 임시 보관본을 지우지 않는다.** 표에 이 예외가 없다. `writer.readOnly` 는 다른 탭의 쓰기 충돌이나 미래 스키마로 얼어붙은 초안에서 발생하므로, 저장 권한이 없어 사본을 만들지 않았을 가능성이 높다 — 그러나 그 추정은 코드로 확인하지 않았으니 "예외가 있다"까지만 기록한다.

### 정정 3 — 30일 만료 판정 주체는 서버가 아니라 클라이언트다

```
apps/client/src/trash.ts:4-10   TRASH_RETENTION_MS = 30 * 86400000
                                trashExpired(document, now = Date.now())
                                trashDaysRemaining(document, now = Date.now())
사용처  useDrafts.ts:114-117    열 때 만료분을 value.remove() 로 영구 삭제, 실패하면 보존 후 다음 열기 때 재시도
        useDrafts.ts:118        목록에서 만료분 제외
        useDrafts.ts:370        복원 시 만료 확인
        WritingLibrary.tsx:59,81 화면 목록·남은 일수 표시
서버    worker.ts 의 /api/documents GET(:95-105) 에 만료 필터 없음
        → 만료된 휴지통 글도 trashedAt 과 함께 그대로 반환되고, 판단은 클라이언트가 한다
```

#8 결정 문구는 "서버가 요청마다 삭제 시각을 검사하므로 예약 실행이 필요 없다"인데, 구현 위치는 클라이언트다. **사용자에게 한 약속 자체는 어긋나지 않는다** — #9 1단계 계획서가 "기한은 사용자 기기 시계 기준"이라고 이미 밝혔고, #8 결정도 "실제 파일 정리는 소유자가 원보드를 열 때 하며, 오래 방문하지 않은 Site는 정리가 늦어진다"고 적었다. 고칠 것은 약속이 아니라 **표의 서술(검사 주체)**이다.

따라서 파생되는 사실 둘도 표에 적어야 한다.

- 만료 판정이 **사용자 기기 시계**에 의존한다. 시계를 뒤로 돌리면 복원 가능 기간이 늘어난다.
- **다른 브라우저·기기는 만료 정리를 하지 않는다.** 소유자가 그 Site를 열 때만 정리된다.

### 2단계 예정 (현재 구현 없음)

`worker.ts` 의 전체 API 표면은 이것뿐이다. 보관함 파일·파일 공유 링크·공유 스냅샷 페이지의 라우트가 없다.

```
/media/<public_id>                          GET·HEAD  공개 (인증 앞 분기)
/api/sites/session                          GET
/api/sites/identity                         GET       로그인한 아무 계정에게 자기 userId
/api/sites/setup                            POST      소유자
/api/documents                              GET       소유자
/api/media/<id>                             GET·PUT   소유자 (비공개 원본)
/api/documents/<id>                         GET·PUT·DELETE
/api/documents/<id>/publications            GET·DELETE
/api/documents/<id>/publish                 POST
/api/documents/<id>/media/<id>/variant      PUT
```

3차 코멘트의 보관함 파일·공유 스냅샷 행은 "구현 전"으로 정확히 표기되어 있다.

## 2. 권한 표 대조

| 대상 | 3차 코멘트 | main `e139408` 근거 | 판정 |
| --- | --- | --- | --- |
| 문서 목록·본문·사진 원본 | 익명 401 / 다른 계정 403 / 소유자 허용 | `worker.ts:83` `if (!owner) throw new HttpError(userId ? 403 : 401, "signInRequired")` — 로그인 여부로 401/403 이 갈린다. `/api/media/<id>` 는 이 문 뒤(:106) | **코드 일치** |
| CSRF | (표에 없음) | `worker.ts:84-85` GET·HEAD 외에는 `origin !== url.origin` 이면 403 | 표에 없는 보호. 추가 기록 |
| 설치 전 접근 | (표에 없음) | `worker.ts:94` `if (!installed) throw 403 "setupRequired"` — 소유자여도 동의 전에는 문서 경로가 막힘 | 표에 없는 보호. 추가 기록 |
| 저장·업로드 | 익명 401 / 다른 계정 403 / 소유자 허용 | 위와 같은 문 뒤의 PUT 경로 | 코드 일치 |
| 휴지통 이동 | "1단계 구현 전" | **이미 구현됨.** 휴지통 이동은 문서 저장과 같은 PUT 경로(`useDrafts.ts` + `worker.ts:152-169`), 본문 JSON의 `trashedAt` 으로 표현 | **표가 낡음** |
| 영구 삭제 | 익명 401 / 다른 계정 403 / revision 일치 시 허용 | `worker.ts:134-150` `body.revision` 정수·음수 검증, `DELETE FROM documents WHERE id=? AND revision=?`, 변경 행 수가 1이 아니면 남은 revision 을 조회해 409 `storageConflict` | 코드 일치 |
| 게시용 사진 `/media/<id>` | 모두 허용 | `worker.ts:59-61` 인증 앞 분기 + `published=1` + `Cache-Control: no-store` | 코드 일치 |
| 게시용 사진 철회 | "미검증" | `worker.ts:185-187` `publications DELETE` → `published=0`. `publicImage()` 에 주석 `Never cache a visibility decision. Withdrawal is checked on every request.` 와 `no-store` | **"코드 경로 확인됨(실측 아님)"으로 올릴 수 있음** |
| Site별 ID 조회 | 익명 401 / 다른 계정 자기 ID만 | `worker.ts:79-82` `if (!userId) throw 401` 후 `{userId}` 반환. **owner 검사(:83)보다 앞**에 있다 | 코드 일치. 단 아래 미실측 참조 |
| 브라우저 임시 보관본 | 서버 권한과 무관, 같은 브라우저 사용자 | `recoveryCache.ts` IndexedDB `wonboard-sites-recovery-v1` | 코드 일치 |
| 보관함 파일 공유 링크 | 2단계 | 라우트 없음 | 구현 전 (표 정확) |
| 공유 스냅샷 페이지 | 2단계 | 라우트 없음 | 구현 전 (표 정확) |
| 워크스페이스 편집자 | DB를 직접 읽을 수 있음(원보드 검사 밖) | 코드로 막을 수 없음. 안내는 이미 들어갔다(아래 3장) | 일치 |

### 미실측 — 두 번째 ChatGPT 계정이 필요한 항목

코드 대조로 확인할 수 있는 것과 실제 계정 경계 확인은 다르다. 아래는 **코드는 일치하지만 실측이 없는** 항목이다.

```
익명 401                        코드 확인. 3차 코멘트도 "익명 거절만 실측"
로그인한 다른 계정 403           코드 확인, 실측 없음 → 두 번째 ChatGPT 계정 필요 (지원 몫)
/api/sites/identity 의 "자기 ID만"  코드 확인(owner 검사 앞 분기), 실측은 소유자만
게시용 사진 철회 후 404          코드 확인(no-store + published=1 매 요청 검사), 라이브 Site 실측 없음
워크스페이스 편집자의 실제 DB 열람  플랫폼 동작이라 원보드 코드에서 검증 불가
```

**로컬 대역 시험과 실제 ChatGPT 계정 확인은 구분한다.** `pnpm dev`·`pnpm preview` 의 로컬 로그인(`local-auth.ts`, `WONBOARD_LOGIN_ID`/`WONBOARD_LOGIN_PASSWORD`, HttpOnly 쿠키 8시간 세션, loopback 전용)은 Sites 의 `oai-authenticated-user-*` 헤더 경로와 완전히 별개다. 로컬 대역에서 401/403 을 확인한 것을 Sites 계정 경계 실측으로 쓰면 안 된다.

## 3. `f44ed9d3` 기준 삭제·보존 대조

지원 원문의 기준: **원보드에서 초안(파일)을 삭제해도 사용자가 커뮤니티로 배포한 주소는 남는다.** 배포물 정리는 사용자가 보관함에서 따로 한다. 공유한 글은 초안과 독립 보존이다.

### 이미 맞는 것

```
초안 영구 삭제 alone → 배포 주소 유지
  worker.ts:136-138   body.withdrawPublications 가 true 일 때만 publications.published=0
  draftRepository.ts:87  options?.withdrawPublications ?? false   ← 기본값 false

30일 만료 자동 정리 → 배포 주소 유지
  useDrafts.ts:114-117  value.remove(documentId, revision) 만 호출, 세 번째 인자 없음 → 기본값 false

사진 원본·R2 객체 → documents 행 삭제와 무관하게 보존
  schema.sql 주석 + worker.ts:141-143

명시적 철회 경로는 이미 존재
  PublicationPanel.tsx:70-73  "withdrawImages" 가 /api/documents/<id>/publications DELETE 를 호출
```

### 정리 대상

```
삭제·휴지통 확인 대화상자의 "공유 주소도 끊기" 체크박스
  App.tsx:260-269   executeTrash(action, value, withdraw)
  App.tsx:267       if (withdraw) await withdrawPhotos(moved.document.documentId)   ← 휴지통 이동에서도 걸림
  App.tsx:254-258   withdrawPhotos() → publications DELETE
  App.tsx:286       확인 대화상자에 공개 중인 사진 수를 보여 줌
  TrashDialog.tsx   체크박스 UI
```

**휴지통 이동에서도 배포 사진 주소가 404가 될 수 있다.** 원문 "원보드에서는 삭제할 필요도 없고 유저가 알아서보관함 내에서 삭제하면 된다"와 정면으로 어긋난다. `f44ed9d3` 기준으로는 이 체크박스를 걷고 철회·삭제를 보관함의 명시적 경로로 옮겨야 한다.

`PublicationPanel` 의 철회는 이미 "명시적 철회"의 원형이지만 **문서 패널에 있고 문서 단위**다. 새 기준이 요구하는보관함 단위 관리 경로와는 위치·범위가 다르다. 동준 지시대로 **철회 버튼만 먼저 없애고 관리 경로 없이 두는 변경은 하지 않는다.**

이 파일들은 현철 트랙(`App.tsx`, `WritingLibrary.tsx`, `TrashDialog.tsx`, 저장/공유)이라 이 문서는 **읽기 전용 대조**이고 수정하지 않았다.

### 2단계로 넘어가는 것

공유 글의 초안 독립 보존, 만료·철회 후 고정본의 비공개 보관, 공유본 삭제의 분리, 보관함 파일·개별 다운로드(전체 일괄 백업은 첫 버전 제외)는 모두 라우트가 없다. 결정만 있는 상태다.

## 4. ZIP·용량 계약

3차 코멘트에는 없고 `f44ed9d3` 에서 "상한은 유지하면서"로 확정한 부분이다. 현재 구현:

```
packages/document/src/index.ts:36-50
  title           10,000
  attributeText   10,000      (alt/caption/language/type — validateDocument 와 입력 필드가 같은 상수)
  imageBytes      20 MiB      사진 하나
  mediaBytes     220 MiB      원본 합계. 주석: "document.json 과 ZIP 컨테이너를 위해 36 MiB 를 남긴다"
  pixels          40,000,000
  images          100
  archiveBytes   256 MiB      ZIP 전체 상한
  text             2,000,000
```

20 + 220 + 36 ≈ 256 MiB 로 상한이 맞물려 있다. `f44ed9d3` 의 "상한은 유지"는 이 계약을 그대로 둔다는 뜻으로 읽히고, 현재 코드가 이미 그렇다.

복원·회수 경로에 이미 두 단계가 있다.

```
App.tsx:114-127   backup()           exportBackup(snapshot) → wonboard-<documentId>.zip
App.tsx:133-152   recoveryBackup()   먼저 exportBackup, 검증이 막을 때만 exportRawBackup
                                     → wonboard-<documentId>-original.zip
                  주석: 미래 스키마나 미지원 노드로 얼어붙은 초안은 exportBackup 이 던져서
                        사진이 든 초안에 회수 경로가 없었다. 그래서 검증 없는 원본 묶음을 추가
App.tsx:660       accept=".zip,application/zip"
```

**검증을 통과하지 못하는 초안도 원본 ZIP으로 회수된다.** 이건 데이터 유실 방지 관점에서 중요하므로 데이터 항목 표에 행으로 넣을 만하다(현재 표에는 ZIP 행이 없다).

## 5. 비공개 원본과 공개 사진의 경계

두 경로가 헤더로 분리되어 있다.

```
비공개 원본  /api/media/<id>          worker.ts:106-129   소유자 검사(:83) 뒤
             R2 key originals/<id>/<hash>                  (originalKey, worker.ts:11)
             Cache-Control: no-store
             Cross-Origin-Resource-Policy: same-origin     ← 교차 출처 embed 불가

공개 사진    /media/<public_id>       worker.ts:37-52, 59-61   인증 앞 분기
             R2 key publications/<doc>/<id>/<hash>             (variantKey, worker.ts:12)
             publications.published = 1 필수
             Cache-Control: no-store + "Never cache a visibility decision"
             Cross-Origin-Resource-Policy: cross-origin    ← 커뮤니티에서 embed 가능
             Content-Disposition: inline; filename*=UTF-8''…
```

`published=0` 이 되면 `publicImage()` 가 404 를 던지므로 철회가 매 요청 검사된다. `publish` 는 `body.revision !== document.revision` 이면 409(`worker.ts:189-192`), variants 가 문서의 모든 이미지 id를 커버하지 않으면 400 `missingMedia` 다. 재발급 시 같은 `public_id` 의 `blob_key` 가 새 variant 를 가리키게 되어 "같은 주소의 사진이 바뀐다"는 3차 코멘트 서술과 일치한다.

## 6. 하지 않은 것

- 코드를 수정하지 않았다. 이 문서는 대조 기록이다
- 실제 Sites 배포에서 실측하지 않았다. 모든 판정은 정적 코드 대조다
- 두 번째 ChatGPT 계정으로 경계를 확인하지 않았다(지원 몫으로 분리해 2장에 적었다)
- 로컬 대역 시험을 Sites 계정 경계 실측으로 쓰지 않았다
- #15 로 이미 들어간 안내(README ko L25·en L84, `locales` `sitesDataNotice` en L85·ko L365)를 다시 만들지 않았다
- `AuthGate` 제거·중앙 회원제를 도입하지 않았다. #10 확정 결정 그대로다
- 워크스페이스 편집자 차단을 코드로 시도하지 않았다(플랫폼 동작이라 불가능)
- `local-corpora/` 자료를 사용하지 않았다
- 현철 트랙 파일(`App.tsx`, `WritingLibrary.tsx`, `TrashDialog.tsx`, `packages/locales`, 저장/공유)을 수정하지 않았다. 인용은 전부 근거 제시용이다
