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

3차 코멘트: "원격 저장 성공 시 삭제, 로그아웃 성공 시 전부 삭제". **둘 다 코드와 그대로 맞지는 않는다.**

**저장 쪽 — 삭제가 아니라 삭제 시도다.** `useDrafts.ts:188-189` 는 `void discardRecovery(snapshot.document.documentId, cacheToken).catch(() => {})` 다. await 하지 않고 거부도 조용히 삼킨다. 이어서 `setStatus("saved")` 가 조건 없이 돈다. 즉 **IndexedDB 삭제가 실패해도 원격 저장은 성공으로 표시되고 회수 사본은 남으며, 정리 실패를 알리는 신호가 어디에도 없다.** 따라서 「원격 저장 성공 시 삭제」는 보유 보장을 과장한다. 정확히는 **「원격 저장 성공 후 삭제 시도(best-effort, 실패 무알림)」** 다.

**로그아웃 쪽 — 두 가지가 다르다.** 첫째, 조건이 더 붙는다(아래 `writer.readOnly`). 둘째, 그리고 이것이 더 중요한데 — **Sites 경로에서 코드는 로그아웃 성공을 관측하지 않는다.**

```
useDrafts.ts:188-189  저장 성공 후 void discardRecovery(documentId, token).catch(() => {})
                  ← 해당 사본만, 그러나 await 안 함·거부 삼킴 = 삭제 "시도"
useDrafts.ts:166-170  저장 "전에" cacheRecovery(snapshot)  ← Sites 모드에서 먼저 사본을 만든다
App.tsx:243-249   logout(): onLogout() 이 true && storageMode === "sites" && !writer.readOnly 일 때만 clearRecovery()
SitesGate.tsx:71-73  onLogout = async () => {
                       window.location.assign("/signout-with-chatgpt?return_to=%2F"); return true; }
recoveryCache.ts:5  IndexedDB name = "wonboard-sites-recovery-v1"
```

`SitesGate.tsx:71-73` 은 `window.location.assign(...)` 을 부르고 **곧바로 `true` 를 반환한다.** 이후 플랫폼 사인아웃 요청이나 탐색이 성공했는지를 전혀 관측하지 않는다. `App.tsx:245-246` 은 `if (!(await onLogout())) setNotice("logoutFailed"); else if (...) await clearRecovery();` 이므로, `clearRecovery()` 의 실제 발동 조건은 「로그아웃 성공」이 아니라 **「사인아웃 리다이렉트를 시작했다」** 이다. 사인아웃 요청이나 탐색이 실패해도 `clearRecovery()` 는 이미 돌 수 있다.

데이터 보유 감사에서 이 차이는 실질적이다. 이 문서와 3차 코멘트가 말한 「로컬 회수 자료 삭제 ↔ 로그아웃 완료」의 결합을 **현재 코드는 보장하지 못한다.** 따라서 표의 이 행은 「로그아웃 성공 시 전부 삭제」가 아니라 「Sites 사인아웃 리다이렉트 시작 후 삭제 시도(성공 여부 미관측)」로 적어야 한다.

**삭제 자체도 보장이 아니라 시도다.** `recoveryCache.ts:54-57` 은 `await pending.catch(() => {})` 뒤에 `transaction<void>("readwrite", store => { store.clear(); })` 를 반환한다. IndexedDB 를 열지 못하거나 clear 트랜잭션이 abort 하면 이 Promise 는 거부되고 **사본은 그대로 남는다.** `App.tsx:241-249` 의 `logout()` 은 `try { … await clearRecovery(); } finally { setBusy(false); }` 로 **거부를 잡지 않고 삭제 완료를 확인하지 않는다.** 게다가 그 시점에는 `SitesGate.tsx:71-73` 이 이미 `window.location.assign(...)` 을 불렀으므로 **탐색이 비동기 트랜잭션과 레이스한다.**

관측되지 않는 것이 둘인데, **두 실패의 보유 결과는 같은 방향이 아니다.** `recoveryCache.ts:14-22` 의 `transaction()` 은 `tx.oncomplete` 에서 이행하고 `onabort`·`onerror` 에서 거부하며, `App.tsx:246` 은 `clearRecovery()` 를 **await** 한다. 즉 삭제 완료를 기다린 뒤에야 `logout()` 이 끝난다. 그래서 경우를 갈라야 한다.

| 경우 | 경로 | 회수 사본 | 위험 방향 |
| --- | --- | --- | --- |
| 사인아웃·탐색이 실패하고 clear 트랜잭션은 `oncomplete` | `SitesGate.tsx:71-73` 이 `location.assign()` 후 `true` 반환 → `App.tsx:246` 이 기다린 `clearRecovery()` 가 이행 | **이미 삭제됨** | **의도치 않은 삭제** — 플랫폼 사인아웃이 실패해 사용자가 아직 사인인 상태일 수 있는데 로컬 회수 자료가 없다 |
| clear 가 거부(`open()` 실패 `:11`, `onabort`·`onerror` `:19`) | `logout()` 에 catch 가 없어 예외가 전파되고 `finally` 는 `setBusy(false)` 만 실행 | **남음** | 보유 잔존 — 실패를 알리는 신호 없음 |
| 탐색이 트랜잭션 완료 전에 문서를 teardown | `location.assign()` 이 먼저 불렸으므로 레이스 | **남을 수 있음** | 보유 잔존 — 완료 여부 미관측 |

**「둘 중 하나라도 실패하면 사본이 남는다」는 틀렸다 — 첫째 경우는 반대다.** 사본이 지워진다. 데이터 보유 감사에서는 두 방향을 따로 세어야 한다: **(가) 사용자 뜻과 무관한 삭제**, **(나) best-effort 보유 잔존**. 어느 쪽이 일어났는지 사용자에게 알리는 신호는 코드에 없다. 표의 이 행은 「삭제」도 「항상 남음」도 아니고 **「리다이렉트 시작 후 삭제 시도 — 결과는 세 경우로 갈리며 어디에도 보고되지 않음」** 이다. 코드 수정은 이 문서의 범위가 아니고 `SitesGate.tsx`·`App.tsx` 는 별도 담당 소유이므로, 여기에는 관측된 계약만 기록한다.

그리고 **읽기 전용 상태에서는 로그아웃(정확히는 리다이렉트 시작)을 해도 임시 보관본을 지우지 않는다.** 표에 이 예외가 없다.

**앞서 이 문서는 여기서 「저장 권한이 없어 사본을 만들지 않았을 가능성이 높다」고 추정했는데, 그 추정은 쓰기 충돌의 경우 정반대다.** 코드로 확인한 순서는 이렇다.

```
useDrafts.ts:166-170  sites 모드면 원격 저장 "전에" cacheRecovery(snapshot) 을 await 한다
useDrafts.ts:194-206  catch 의 StorageConflict 분기는 conflicts 에 넣고 frozen=true,
                      setReadOnly(true), setError("storageConflict") 만 한다 —
                      **캐시한 사본을 discard 하지 않는다**
```

즉 **캐시 쓰기가 성공한 뒤 409 가 오면, 로그아웃이 지우지 않는 바로 그 로컬 회수 자료가 남는다.** 「사본이 없을 가능성이 높다」가 아니라 「사본이 남는 것이 정상 경로」다. 미래 스키마로 얼어붙은 초안처럼 저장 시도에 도달하기 전에 읽기 전용이 되는 경우는 사본이 없을 수 있으나, 두 경우는 구별해야 한다. 이 문서는 확인하지 않은 추정으로 한쪽을 일반화했던 것을 정정한다.

### 정정 3 — `e139408` 에서 30일 만료 판정 주체는 서버가 아니라 클라이언트다 (#18 이 보강 중, 미머지)

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

#8 결정 문구는 "서버가 요청마다 삭제 시각을 검사하므로 예약 실행이 필요 없다"인데, **`e139408` 의 구현 위치는 클라이언트다.** 즉 결정이 요구하는 서버 검사와 현재 코드 사이에 차이가 있다. #9 1단계 계획서가 "기한은 사용자 기기 시계 기준"이라고 밝혀 두어서 사용자 약속 문구 자체는 어긋나지 않지만, **#8 이 요구한 검사 주체는 충족되지 않은 상태**였다.

이 차이는 [PR #18](https://github.com/jiwonschol/wonboard/pull/18)(head `63c2a673f7437f1f85b900c0cd44d137d3b12319`)이 서버 강제로 보강했으며 **아직 머지되지 않았다.** #18 은 `worker.ts` 에 서버 측 `TRASH_RETENTION_MS` 와 SQLite `databaseNow`(서버 시계, 정수 밀리초로 경계 보존)를 넣고, `loadDocument()` 가 기한 경과 시 `410 trashExpired` 를 던지며, `/api/documents` GET 은 만료 항목을 목록에 남기되(구형 클라이언트가 정리 대상을 발견할 수 있도록 envelope·revision 유지) **title·excerpt·본문을 비워 만료된 글의 내용을 반환하지 않는다.** 조건부 쓰기에도 `unexpiredWrite` 가드를 둔다.

따라서 이 문서의 "만료 판정 주체 = 클라이언트"는 **기준 SHA `e139408` 에 한정된 사실**이다. 다만 **#18 머지 후에도 서버가 1차 판정 주체가 되는 것은 Sites 저장 모드뿐이다.**

`draftRepository.ts:23-30` 에서 `mode === "desktop"` 은 `openDesktopRepository()`, `mode === "local"` 은 IndexedDB(`openStorage`)로 가고 **둘 다 `worker.ts` 를 지나지 않는다.** 공통 `useDrafts` 경로는 계속 `trashExpired(document, Date.now())` 로 판정한다(`useDrafts.ts:114-118·370`). 즉 #18 이후에도 local·desktop 의 보유 기한은 **전적으로 사용자 기기 시계에 남는다.** 표의 서술은 「Sites = 서버(#18 이후) / local·desktop = 기기 시계」로 갈라 갱신해야 한다.

`e139408` 기준으로 파생되는 사실 둘:

- 클라이언트 만료 판정이 **사용자 기기 시계**에 의존한다. 시계를 뒤로 돌리면 복원 가능 기간이 늘어난다. (#18 의 서버 판정은 SQLite `now` 를 쓰므로 이 의존을 줄인다)
- 정리는 **저장소를 열 때** 일어난다(`useDrafts.ts:113-118`, `value.list()` → 만료분 `remove()`). 다른 브라우저·기기라도 소유자 클라이언트가 그 Site를 열면 정리를 시도한다. 반대로 **아무 소유자 클라이언트도 열지 않으면 자동 실행되지 않는다.** #8 결정의 "오래 방문하지 않은 Site는 정리가 늦어진다"가 이 뜻이다.

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
  mediaBytes     220 MiB      원본 합계 — **클라이언트 import 전용 가드.** 주석: "document.json 과
                              ZIP 컨테이너를 위해 36 MiB 를 남긴다"
  pixels          40,000,000
  images          100
  archiveBytes   256 MiB      ZIP 전체 상한
  text             2,000,000
```

상한이 맞물리는 산식은 **원본 합계 220 MiB + 메타데이터·ZIP 컨테이너 여유 36 MiB = 256 MiB** 다. `imageBytes` 20 MiB 는 **사진 하나의 상한**이고 이미 원본 합계 220 MiB 안에 들어가므로 따로 더하는 값이 아니다(`images` 100 × 20 MiB 가 아니라 합계 220 MiB 가 구속한다).

**단, 그 220 MiB 는 저장·백업 불변식이 아니라 클라이언트 UI import 가드다.** 코드에서 `limits.mediaBytes` 를 합계 검사로 쓰는 곳은 `apps/client/src/media.ts:63` (`if (incomingBytes + existing.bytes > limits.mediaBytes) throw new DocumentError("archiveLimit")`) **한 곳뿐이다** — `importImages` 안이다. `validateDocumentEnvelope` 은 `packages/document/src/index.ts:361` 에서 `Number(m.size) <= limits.imageBytes` 로 **개별 항목만** 보고 합계를 더하지 않는다. 서버 쪽 `worker.ts` 의 문서 PUT 도 각 저장 항목을 검증할 뿐 합산을 하지 않는다(`mediaBytes`·합계 계산이 없다). `apps/server/src/sites/http.ts:39` 의 `limits.archiveBytes - limits.mediaBytes`(36 MiB) 는 요청 본문 읽기 상한이지 미디어 합계 검증이 아니다.

따라서 **Sites 소유자가 API 를 직접 쓰거나 `importImages` 를 거치지 않는 클라이언트에서는 220 MiB 가 구속력이 없다.** 서버는 개별적으로 유효한 20 MiB 원본을 최대 100개까지 받을 수 있고, 그런 문서는 256 MiB 백업 상한을 만족할 수 없다. 이 표의 220 MiB 는 「정상 UI 경로의 import 가드」로 읽어야 하며 현재 저장·백업의 불변식으로 읽으면 안 된다. 그 차이는 백업 실패가 UI 가 아니라 백업 시점에 드러난다는 뜻이므로 데이터 보유 관점에서 남길 만하다. 소스 주석도 "원본 합계가 ZIP 전체 상한을 다 써 버리면 정상 초안도 백업할 수 없다. document.json 과 ZIP 컨테이너를 위해 36 MiB 를 남긴다"로 같은 뜻을 적는다. `f44ed9d3` 의 "상한은 유지"는 이 계약을 그대로 둔다는 뜻으로 읽히고, 현재 코드가 이미 그렇다.

복원·회수 경로에 이미 두 단계가 있다.

```
App.tsx:114-127   backup()           exportBackup(snapshot) → wonboard-<documentId>.zip
App.tsx:133-152   recoveryBackup()   먼저 exportBackup, 그것이 던진 **모든** 오류에서 exportRawBackup
                                     (catch 절에 조건이 없다 — bare `catch {`)
                                     → wonboard-<documentId>-original.zip
                  주석: 미래 스키마나 미지원 노드로 얼어붙은 초안은 exportBackup 이 던져서
                        사진이 든 초안에 회수 경로가 없었다. 그래서 검증 없는 원본 묶음을 추가
App.tsx:660       accept=".zip,application/zip"
```

**검증을 통과하지 못하는 초안도 원본 ZIP으로 회수된다.** 이건 데이터 유실 방지 관점에서 중요하므로 데이터 항목 표에 행으로 넣을 만하다(현재 표에는 ZIP 행이 없다).

**단, 이 폴백은 검증 전용 경로가 아니다.** `App.tsx:143` 의 `catch` 는 조건이 없는 bare catch 라 `exportBackup()` 이 던지는 **모든** 오류가 `exportRawBackup()` 으로 넘어간다 — 검증 실패만이 아니라 보관 한도 초과, 해싱 오류, ZIP 생성 오류도 같다. 구체적으로 **참조된 사진에 대응하는 Blob 이 없거나 크기가 다르면** `exportBackup()` 이 `missingMedia` 로 던진다(`packages/document/src/backup.ts:21-24`, 기존 시험 `tests/unit/document.test.ts:377` 이 이 reject 를 고정한다). 같은 함수는 `archiveBytes` 초과에서도 `archiveLimit` 을 던진다(backup.ts:20·26). 이어서 원본 수출은 **그 원본을 빼고도** 성공할 수 있다.

따라서 `wonboard-<documentId>-original.zip` 이 「검증은 실패했지만 원본은 온전하다」를 보장하지는 않는다. 이 경로는 검증 실패뿐 아니라 원본 자체가 이미 불완전한 경우에도 그 불완전한 상태로 묶음을 만들어 낼 수 있고, 사용자에게는 성공한 다운로드로 보인다. **데이터 유실 방지 보장은 앞서 적은 것보다 약하다.** `App.tsx:133` 의 코드 주석도 「검증이 막을 때만 검증 없는 원본 묶음으로 넘어간다」고 적어 실제 bare catch 와 어긋나므로, 그 주석도 함께 고쳐야 할 항목으로 남긴다(파일 소유는 별도 담당).

> **미해결 동작 — 문서 정정으로 닫히지 않는다.** 이 절의 문서 서술은 고쳤지만 **동작 자체는 그대로다.** 회수 자료가 불완전한 경우에도 `-original.zip` 이 성공한 다운로드로 보이고, 사용자는 원본이 전부 들어 있다고 알 수 없다. `App.tsx`·`SitesGate.tsx` 는 별도 담당 소유라 이 감사 문서 PR 에서 코드를 고치지 않는다. 따라서 이건 **기록된 미해결 항목**으로 남기며, 완료 처리하지 않는다.

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
             Content-Disposition: inline; filename*=UTF-8''…   ← row.filename
               출처 worker.ts:210  attachmentFilename(document, mediaId)
               attachments.ts:142-152  autoRenameAttachments === false → media.originalName
                                       그 외 → document.title 로 만든 이름
```

**이 헤더는 일반적인 메타데이터가 아니라 공개되는 구체적 데이터 필드다.** `/media/<public_id>` 분기는 `worker.ts:58-60` 에서 `oai-authenticated-user-id` 를 읽는 `worker.ts:68` **보다 앞**에 있으므로 인증 없이 도달하고, `publicImage()` 는 `row.filename` 을 `Content-Disposition` 에 실어 보낸다. 그 값은 출판 시 `attachmentFilename(document, mediaId)` 로 정해지며(`worker.ts:210`), `attachments.ts:148` 은 `document.autoRenameAttachments === false` 면 **업로드한 원본 파일명(`media.originalName`)을 그대로** 쓰고, 그렇지 않으면 **문서 제목**으로 만든 이름을 쓴다.

즉 **URL 을 가진 누구나 인증 없이 이미지 바이트와 함께 문서 제목(또는 자동 이름 바꾸기를 끈 경우 업로드 원본 파일명)을 받는다.** 공개 범위를 다룬 이 절의 표에 헤더 이름만 적고 출처를 적지 않으면, 권한 감사에서 실제로 새어나가는 필드 하나가 빠진다. 공개 가능한 것이 사진 바이트만이 아니라는 점에서 데이터·권한 항목으로 기록한다. 단 **노출 조건의 범위 한계**를 둔다 — `worker.ts:55` 주석이 "Run only behind Sites' trusted identity dispatcher" 라고 적듯 이 worker 는 플랫폼 디스패처 뒤에서 돌고, 이 문서는 **코드 분기 순서(`/media/` 가 `userId` 검사보다 앞)와 헤더 값의 기원만 정적으로 대조**했다. 플랫폼이 이 경로에 두는 실제 익명 응답은 운영 Site 에서 측정하지 않았다.

`published=0` 이 되면 `publicImage()` 가 404 를 던지므로 철회가 매 요청 검사된다. `publish` 는 `body.revision !== document.revision` 이면 409(`worker.ts:189-192`), variants 가 문서의 모든 이미지 id를 커버하지 않으면 400 `missingMedia` 다. 재발급 시 같은 `public_id` 의 `blob_key` 가 새 variant 를 가리키게 되어 "같은 주소의 사진이 바뀐다"는 3차 코멘트 서술과 일치한다.

### 정리되지 않는 공개 variant — worker 경로 사실이고 실제 보존 기간은 미확인

**`publications/<doc>/<id>/<hash>` 객체를 지우는 코드가 없다.** `apps/server/src/sites/worker.ts` 전체에서 `env.MEDIA` 호출은 `get` 세 곳(`:41·111·201`)과 `put` 두 곳(`:121·176`)뿐이고 **`delete` 는 한 곳도 없다.**

그래서 세 경로 모두 **이 worker 코드에서는 R2 객체를 삭제하지 않는다.** 아래는 코드 경로의 사실이고, 저장소에 실제로 얼마나 오래 남는지는 이 문서가 확인하지 않았다(아래 범위 한계).

| 경로 | 코드 | R2 결과 |
| --- | --- | --- |
| 새 hash 로 재출판 | `variantKey` put(`:176`) 뒤 upsert 가 `blob_key` 만 새 열쇠로 갱신(`:205-210`) | 이 경로는 이전 variant 객체를 삭제하지 않고, 갱신 뒤 어떤 행도 그 열쇠를 가리키지 않음 |
| 출판 철회 | `UPDATE publications SET published = 0`(`:186`) | 행만 숨김, 객체는 이 경로에서 삭제하지 않음 |
| 초안 삭제 | 문서·출판 행 정리 경로에 `MEDIA.delete` 없음 | 원본(`originalKey`)·variant 모두 이 경로에서 삭제하지 않음 |

**대체된 공개 렌디션은 더 이상 주소로 도달할 수 없는데도, 이 worker 경로에서는 삭제되지 않는다.** `published=0` 이 되면 `publicImage()` 가 404 를 던지므로 사용자와 수신자 입장에서는 사라진 것이 맞지만, 코드 경로만 보면 객체는 그대로다. 이는 원본(`-original` 키)과 현재 variant 와는 **별도로 세어야 하는 데이터 분류**이므로 이 감사에 행을 추가한다 — 사용자가 "철회했다"·"삭제했다"고 이해한 뒤에도 애플리케이션 코드가 지우지 않는 것이 무엇인지 세는 것이 이 문서의 목적이다.

**보존 기간은 단정하지 않는다.** `delete` 가 없다는 근거로 확정할 수 있는 것은 **이 코드 경로가 지우지 않는다**는 것까지다. R2 버킷 수명주기 규칙이나 플랫폼 쪽 외부 정리가 있는지는 확인하지 않았으므로, 객체가 실제로 얼마나 남는지는 **미확인**이다.

### 이 절의 범위 한계

- `worker.ts` 는 별도 담당 소유이므로 여기서 삭제 경로를 만들지 않는다. 이 절은 **애플리케이션 코드의 정적 대조 기록**이다.
- **R2 수명주기·외부 정리는 확인하지 않았다.** 이 워크트리에는 `wrangler.toml`·`wrangler.jsonc` 가 없고(Sites 배포는 플랫폼이 수행), 저장소 전체에서 버킷 `lifecycle`·`expiration` 설정을 찾지 못했다. `docs/planning/storage-decision.md` 에도 R2 수명주기 정책 기록이 없다. 이슈 #10 본문도 "공식 문서는 Site 삭제 때 D1·R2 데이터도 함께 지워지는지 밝히지 않는다"고 적는다.
- 따라서 **"무기한 보존"이라고 쓰지 않는다.** 확정된 것은 「현재 worker 경로에서 삭제하지 않음」이고, **실제 보존 기간은 미확인**이다. 확인하려면 운영 R2 의 객체 목록·버킷 설정을 봐야 하며 이 문서의 권한 범위 밖이다.
- 운영 R2 의 실제 잔존 객체 수·용량도 측정하지 않았다.

## 6. 하지 않은 것

- 코드를 수정하지 않았다. 이 문서는 대조 기록이다
- 실제 Sites 배포에서 실측하지 않았다. 모든 판정은 정적 코드 대조다
- 두 번째 ChatGPT 계정으로 경계를 확인하지 않았다(지원 몫으로 분리해 2장에 적었다)
- 로컬 대역 시험을 Sites 계정 경계 실측으로 쓰지 않았다
- #15 로 이미 들어간 안내(README ko L25·en L84, `locales` `sitesDataNotice` en L85·ko L365)를 다시 만들지 않았다
- `AuthGate` 제거·중앙 회원제를 도입하지 않았다. #10 확정 결정 그대로다
- 워크스페이스 편집자 차단을 코드로 시도하지 않았다(플랫폼 동작이라 불가능)
- `local-corpora/` 자료를 사용하지 않았다
- 현철 트랙 파일(`App.tsx`, `WritingLibrary.tsx`, `TrashDialog.tsx`, `packages/locales`, 저장/공유)을 **수정하지 않았다.** 파일 소유는 쓰기 충돌을 막는 경계이지 읽기 금지가 아니므로, 대조를 위해 읽고 PR #18 의 diff 도 읽었다. 인용은 전부 근거 제시용이다
- PR #18(`63c2a673`)을 검토·판정하지 않았다. 이 문서는 #18 의 서버 강제 보강을 **후속으로 연결**만 한다. 기준 SHA 는 `e139408` 이고 #18 은 미머지다
