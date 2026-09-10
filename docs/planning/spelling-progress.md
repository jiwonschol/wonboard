# 통합 맞춤법 검사 실행 기록

## 2026-09-10 — 착수 / 복구 지점

사용자 실행 승인으로 issue #6의 2026-09-09 개정 계획을 수행한다. PR 생성과 배포는 승인 범위가 아니다. 자체 시험지의 수치는 독립 평가가 아니다.

작업 경로: `/Users/jiwon/develop/projects/wonboard`.

`git rev-parse HEAD`:
```
1deaddf1d51125ec22d04ba0f43eb640cc1824af
```
`git branch --show-current`:
```
codex/desktop-local-storage
```
`git log --oneline -5`:
```
1deaddf Add shared Electron desktop client with local SQLite storage
0c3c3b4 Add local Korean spelling review and personal dictionary
fde2b8b Merge main safety fixes and align editor mark validation
431ad1b feat: refine writing toolbar fonts and Sites client integration
3d73a67 feat: 웹 작성기 초기 구현과 저장소 결정 보류 기록 (#2)
```
`git status --short`:
```
 M packages/editor/src/SpellcheckTool.tsx
 M packages/editor/src/spelling.css
 M packages/editor/src/style.css
 M packages/locales/src/index.ts
 M tests/e2e/spelling.spec.ts
?? docs/.DS_Store
?? docs/planning/korean-proofreading-plan.md
?? docs/spelling-engine-evaluation.md
?? packages/editor/src/WhitespaceTool.tsx
?? packages/editor/src/whitespace.ts
?? tests/e2e/whitespace.spec.ts
?? tests/unit/whitespace.test.ts
```

복구 커밋은 SpellcheckTool, spelling.css, spelling E2E 및 계획/조사 문서에 한정한다. style.css와 locales의 미커밋 diff는 문단 정리 트랙이므로 그대로 보존하고 포함하지 않는다. 기존 엔진과 사용자 데이터는 변경하지 않았다.

## 2026-09-10 — A: 평가 기반과 기존 실패

복구 커밋: `2ba4805`. 시험지 및 라이선스 사용 전 커밋: `56960ab`.

`tests/fixtures/spelling/cases.json`: 직접 작성한 200문장. 한국어 120, 영어 60, 혼용 20. 분리 평가용 40/20/10. 엔진 구현 전에 커밋했다. 원문 대괄호가 기대 범위이며 `compileCases`가 UTF-16 위치와 허용 최종 문자열로 변환한다. 같은 실행자가 작성했으므로 독립 평가가 아니다. 원문 규정 조회 실패로 철자/띄어쓰기의 basis는 unverified이며 분모에서 제외하지 않았다. 특히 보조 용언 붙여쓰기 등 허용 표기는 규범 재확인이 필요하므로 이 시험지 자체도 최종 판정 자료로 확정된 것은 아니다.

`node scripts/eval-spelling.mjs > docs/planning/spelling-empty-evaluation.txt` 실행. 표준출력 전문은 해당 파일에 보존했다. 200문장, 한국어 분리 평가 오류 이벤트 21개, 빈 엔진 탐지 0/21. 이는 A단계의 채점기 동작 확인이지 B단계 엔진 판정이 아니다.

기존 Worker와 같은 loadModule/mountBuffer/create/spell/suggest 순서로 사용자 기준 문장을 읽기 전용 검사했다. 원문은 직접 코드에 제공한 사용자 공개 예문이며 로컬 초안을 읽지 않았다.
```
{"word":"평소에","valid":true,"suggestions":["평소에","병소에","병소네","평소네","평소엔"]}
{"word":"질게에서답변하시는걸","valid":false,"suggestions":[]}
{"word":"뵌걸로보면","valid":false,"suggestions":["보궐선거면"]}
{"word":"제가","valid":true,"suggestions":["제가","재가","쟤가","채가","체가"]}
{"word":"조언할","valid":true,"suggestions":["조언할","조인할","제언할","조언한","조언잘"]}
{"word":"수준은","valid":true,"suggestions":["수준은","수주는","수준인","수준엔","수순은"]}
{"word":"아닌것","valid":false,"suggestions":["아닌 것"]}
{"word":"같지만","valid":true,"suggestions":["같지만","갔지만","갖지만","깠지만","가지만"]}
```

## 2026-09-10 — 데이터 취득

`git ls-remote <upstream> HEAD`로 고정 버전을 확인하고 LICENSE/Copyright 원문을 curl로 취득했다. 각 출처, SHA-256, 원본/가공 크기와 취득 시각 전문은 `third_party/spelling/generated/manifest.json`에 기록했다. NOTICE가 없는 것은 재귀 트리 조회 결과이며 임의의 upstream NOTICE를 만들지 않았다. 원문 라이선스는 사용 전에 커밋했다.

실행: `node scripts/build-spelling-data.mjs`. 새 런타임 라이브러리 추가 없음. 가공한 데이터는 `third_party/spelling/generated/lexicon.json`에 있으며 public/으로 배포하지 않는다.
```
bytes: 1739636
gzipBytes: 439759
ko noun: 26498
ko adverb: 5539
ko verb: 3242
ko adjective: 2518
ko josa: 506
ko ending: 1236
ko preEnding: 69
englishWords: 112742
```
압축 목표와 하드 상한 안이다. 기본 한국어 목록에도 구어적 어미가 있으므로 목록 존재가 올바른 표기라는 보증은 아니다. 영어는 US/UK를 배제하지 않는 원시 목록 추출이며 upstream의 완전한 활용형 생성 절차를 실행한 것이 아니다.

규범 조회: `curl -fsSL https://korean.go.kr/kornorms/m/m_regltn.do` → HTTP 403. 웹 열기도 실패. 조항 번호나 인용을 추측해 채우지 않았다. 이 때문에 규칙의 근거 확인은 미완료다.

## 2026-09-10 — B: 조기 게이트 실패, C 진입 중단

`packages/editor/src/proofreading/engine.mjs`는 어휘/POS 기반 분절과 편집 거리 후보를 시험하는 자체 MIT 프로토타입이다. production Worker에서 import하지 않는다. 초안 전송이나 사용자 사전 저장 변경 없이 caller가 전달한 문자열만 검사한다.

실행: `node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs > docs/planning/spelling-prototype-evaluation.txt`. 표준출력 전문(모든 실패 원문·추천 포함)은 해당 파일에 보존했다.
```
Early gate (holdout): Korean detection 9/21; normal false-recommendation cases 2; FAIL
```
전체 자료의 결과는 위 출력 파일 참조. 한국어 정상 30문장 중 오추천이 있는 문장은 5개다. 게이트를 본 뒤 엔진을 변경하거나 기준을 낮추지 않았다. 분리 자료는 이제 사용된 평가 자료다.

필수 문장과 사전 등록 전/후/삭제 후, 약칭 변형 10개의 출력 전문: `spelling-required-evaluation.jsonl`. 실제 출력은 `질게에서 답변하시는걸`로 앞 경계만 제안하며 `하시는 걸`을 놓친다. `조언할`을 `조언`으로 바꾸는 잘못된 추천도 생긴다. 미등록 `질게에`를 `질 게에`로 나누는 오탐 역시 기록됐다. 따라서 기준 문장도 통과하지 못한다.

원인: (1) 축약/불규칙/관형 활용형 복원이 부족하다. (2) 미등록 명사+조사와 기성 어휘 분절 간 판단이 단순 비용에 의존한다. (3) 사전 표제어의 편집 거리만으로 문장 속 철자를 추천하면 조사·어미를 잘라내기도 한다. (4) 영어 추출에서도 일부 활용형이 빠져 정상 표현을 오인한다.

추천: 다음 승인 작업을 한국어 활용형 복원과 품사 연결 모델 보강으로 한정한다. 규범 접근 및 평가 정답 검토를 먼저 완료하고 새로운 미사용 평가 자료로 다시 측정한다. 사전만 교체하면 해결된다고 전제하지 않는다. 대가는 별도의 엔진 구현/검증 시간이 필요하다는 점이며 UI 변경으로 이 비용을 줄일 수 없다.

## 2026-09-10 — 검증과 보존

`node --test tests/unit/spelling-evaluator.test.mjs`: 5 passed / 0 failed. 전문은 `spelling-evaluator-tests.txt`. 누락 분모, 미등록 안내 분리, 넓은 범위의 동치 수정/추가 오수정, UTF-16 위치, 자료 수를 확인했다.

`node node_modules/vitest/vitest.mjs run tests/unit/spelling-evaluator.test.mjs`는 기존 설정이 `**/*.test.ts`만 포함하므로 "No test files found"로 실패했다. Node 채점기 시험은 node:test로 별도 실행하고 제품 테스트 설정은 바꾸지 않았다.

`node node_modules/vitest/vitest.mjs run`:
```
Test Files  9 passed (9)
Tests  139 passed (139)
```
`node node_modules/typescript/bin/tsc --noEmit`: exit 0, 출력 없음.

미실행: C의 공유 UI 통합, Worker 교체, 실제 편집 적용/undo/IME/브라우저/네이티브 앱 시험, D의 장문 성능과 빌드/배포 자산 제거. B 게이트에서 중단했기 때문이다. 기존 엔진·고지·사용자 초안·개인 사전·문단 정리 변경은 유지했다. 새 자료는 아직 공개 배포 자산이 아니므로 public/ 고지를 교체하지 않았다. 기존 자산 제거가 없으므로 제거 전 전수 검사도 아직 실행하지 않았다. PR 생성·merge·배포·설치 앱 교체 없음.

## 2026-09-10 — 재개 승인, 두 번째 프로토타입

지원의 “해봐”로 평가 자료 수정과 활용형 보강을 재개했다. 시작 HEAD `cbc15532462d5ec99524e5c37f4ff8e110728d36`. style.css/locales와 WhitespaceTool 트랙의 사용자 변경은 그대로 남겼다.

`spelling-rules-v2.md`에 이번에 실제 조회한 국립국어원 규정/상담 출처와 확인 범위를 기록했다. 보조 용언 붙여쓰기가 허용되는 `열어주세요`를 오류 사례에서 빼고 정상 사례로 넣었다. 오류 사례는 `열고있어요`로 변경했다. 200문장 전체 정답 검토가 끝난 것은 아니며 미확인 표시는 유지한다.

`korean-morphology.mjs`: 어간·존대·관형형·모음 축약·과거형을 분석한다. 가능한 모든 어미 결합을 메모리에 펼치지 않고 어간/어미 경계를 조회한다. 미등록 명사에는 명시한 조사 집합만 허용한다. `-걸`은 해석이 모호함을 결과에 표시한다. 철자 후보는 원문 위치를 유지하면서 한글 자모로 비교한다. 기존 한국어 분절 코드는 제거했으나 배포 Worker는 교체하지 않았다.

회귀 검사에서 `질게에서답변하시는걸 → 질게에서 답변하시는 걸`, 사전 등록 전/후/삭제 후, 별도 약칭 10종, 수정 후 `질게` 미등록 안내가 통과했다. 문장 전체를 정확하게 교정한다는 뜻은 아니다.

### 동일 시험지 전후 평가

실행 명령:
```
git show cbc1553:packages/editor/src/proofreading/engine.mjs > /private/tmp/wonboard-engine-v1.mjs
node scripts/eval-spelling.mjs --engine /private/tmp/wonboard-eval-v1.mjs > docs/planning/spelling-v1-corrected-evaluation.txt
node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs > docs/planning/spelling-v2-evaluation.txt
node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs --cases tests/fixtures/spelling/fresh-v2.json > docs/planning/spelling-v2-fresh-evaluation.txt
```
임시 구버전 adapter는 보존된 구버전 createChecker에 현재와 같은 lexicon.json을 전달했다. 각 출력 전문은 위 파일에 있다.

| 항목 | 구버전 / 수정된 시험지 | 두 번째 버전 |
| --- | --- | --- |
| 분리 한국어 탐지 | 9/21 | 11/21 |
| 분리 정상 문장 변경추천 | 2/10 | 1/10 |
| 전체 한국어 철자 탐지 | 1/25 | 5/25 |
| 전체 한국어 띄어쓰기 탐지 | 23/36 | 21/36 |
| 전체 정상 문장 변경추천 | 6/30 | 8/30 |

조기 게이트 FAIL. 성능이 전반적으로 개선됐다고 판단할 수 없다. 이전 시험지에서 정상 오탐은 5건이었지만 수정된 같은 시험지의 구버전은 6건이다. 진행 메시지에서 잠시 5→8로 언급한 수치를 6→8로 정정한다. 정상 변경추천에는 허용 표기를 불필요하게 바꾸라는 것도 포함한다.

실패 예: `남았어요 → 남 았 어요`, `시작합니다 → 시작 합 니다`, `기다릴게요 → 기다릴 게요`. 축약형을 일부 추가했으나 받침과 결합하는 어미(예: -ㅂ니다), 연결 어미와 과거 선어말어미의 조합, 문법적 연결 제약이 불완전하다. 데이터에서 인정되는 짧은 조각을 분절 후보로 쓰는 방식이 여전히 정상 활용형을 쪼갠다. 이 결과를 본 뒤 엔진을 수정하지 않고 중단했다.

새 20문장은 한국어 띄어쓰기 4/5 탐지, 정상 5문장 오탐 0; 영어 철자 상위3 5/5; 혼용 정상 5문장 중 변경추천 2건이다. 작은 부분집합의 출력에 PASS가 표시되지만 전체 계획 게이트 통과를 뜻하지 않는다. 새 자료도 이제 사용된 자료이며 독립 평가가 아니다.

### 검증 / 인계

`node --test tests/unit/korean-morphology.test.mjs tests/unit/spelling-evaluator.test.mjs`: 11 passed, 0 failed.
`node node_modules/typescript/bin/tsc --noEmit`: exit 0.
`node node_modules/vitest/vitest.mjs run`: 최초 권한 제한으로 .vite-temp 생성 EPERM; 승인된 경로 쓰기 권한으로 다시 실행해 9 files / 139 tests passed.
`git diff --check`: exit 0.

기존 어휘 자산과 라이선스는 변경하지 않았다. UI/Worker 통합, 새 빌드, 배포, 설치 앱 교체, 데이터 변경은 하지 않았다. 전체 규범 검증과 완성된 문맥 분석, 장문 성능은 미완료다.

다음 추천은 문법 조각을 더 임의로 추가하는 것보다, 허용된 형태소 데이터의 활용/연결 정보를 조사해 자체 분석기의 표현 방식을 먼저 확정하는 것이다. 그 연구·구현 비용을 별도 작업으로 잡아야 한다. 이번 결과를 실제 맞춤법 검사 완료로 취급하지 않는다.
