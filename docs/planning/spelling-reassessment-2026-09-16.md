# #6 재점검 대조와 남은 결함 재현 (2026-09-16)

기준 `main` = `e139408274d76a507eab397f1ebca7ac1d3fc395`. 이 문서는 2026-09-15 재점검(issue #6 코멘트 `5675909799`, 검사 코드 `aa85253`)의 미달·미확인 항목을 현재 코드와 대조한 결과다. **새 완료 선언이 아니고 품질 목표도 바꾸지 않았다.** 엔진·데이터·평가 답안을 수정하지 않았다. §7 단계는 착수하지 않았다.

이 문서는 공개 저장소 기록이므로 `local-corpora/`의 원문을 복사하지 않는다. 인용한 예문은 모두 추적된 `tests/fixtures/spelling/` 자료다.

## 1. 실행 환경

```
uname -a    Darwin Jiui-iMac.local 27.0.0 Darwin Kernel Version 27.0.0 xnu-13432.1.9~1/RELEASE_ARM64_T6000 arm64
sw_vers     macOS 27.0 (26A428)
node        v24.18.0  execPath "/Users/jiwon/Library/Application Support/Buzz/runtimes/node/v24.18.0/darwin-arm64/bin/node"  (공백 포함)
pnpm        11.19.0 (corepack, 저장소 packageManager 고정값)
작업 공간    <repo>/.claude/worktrees/buzz-6  (전용 워크트리, main 체크아웃 미사용)
local-corpora  이 Mac에 실재(5.6GB, Git 제외). 평가에 사용하지 않았고 원문을 인용하지 않았다
codex CLI   /opt/homebrew/bin/codex 설치·로그인 상태. 이 문서의 어떤 수치도 실제 모델 호출로 만들지 않았다
```

동준의 실행 환경(Linux VPS)과 다르다. 아래 9장의 격리 결함은 이 차이에서만 드러난다.

## 2. 코드 변경 범위 — 재점검 표는 현재 main에서도 그대로 참이다

재점검의 base는 `aa85253`이었다. 그 사이 main에 PR #14(글 휴지통)와 PR #15(Sites 안내 문서)가 병합됐다. 검사 코드 변경 여부를 **명령을 나눠서** 쟀다. 앞의 것은 검사 경로 자체, 뒤의 것은 그 경로를 포함한 패키지 전체다.

```
# 맞춤법·평가 경로 — 출력 없음, exit 1
$ git diff --name-only aa85253 e139408 | grep -E "proofreading|scripts/eval|fixtures/spelling"

# 데이터·평가 자산·스크립트 — 출력 없음, exit 1
$ git diff --name-only aa85253 e139408 | grep -E "third_party|tests/fixtures|scripts/"

# editor 패키지 전체로 넓히면 아이콘 하나만 나온다, exit 0
$ git diff --name-only aa85253 e139408 | grep -E "packages/editor|third_party/spelling"
packages/editor/src/icons.tsx
```

첫 두 명령의 출력이 비어 있는 것이 검사 경로 무변경의 근거다. 세 번째 명령은 그 범위를 패키지 전체로 넓혔을 때 남는 것이 아이콘 하나뿐임을 보여 준다.

`icons.tsx`의 차이는 trash 아이콘 한 줄이다(`+  trash: <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />`). 즉 `packages/editor/src/proofreading/*`, `scripts/eval-spelling.mjs`, `scripts/spelling-prototype.mjs`, `tests/fixtures/spelling/*`, `third_party/spelling/generated/*` 는 **변경이 없다.**

따라서 평가 전체를 재실행할 근거가 없다. 대신 같은 명령을 현재 main에서 한 번 돌려 기록과 대조했다.

## 3. 재현 결과 — 바이트 동일

```
$ node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs
$ node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs --cases tests/fixtures/spelling/fresh-v4.json

200문장   sha256 05a6cf5848f943c1e0a4b982195a58ccf60f152dd63152aaa450ab1fbd0c10bb   481행
재사용 20문장 sha256 69a18a1016b38d04e2c8ec8692b8d95df8603890e6e6a7e5ac162df4ddd83bd5    41행
```

두 출력 모두 `60b22bc`의 `docs/planning/spelling-reassessment-2026-09-15-evaluation.txt` 및 `-reused-fresh.txt`와 `diff` 0줄, sha256 일치다. 표의 모든 행과 `Early gate (holdout): Korean detection 18/20 … PASS`, 실패 목록까지 같다.

`60b22bc`는 **push되지 않은 로컬 브랜치 `codex/spelling-reassessment`(ahead 1 / behind 11)의 커밋**이므로 main에서는 그 기록 파일을 찾을 수 없다. 대조 사본은 `git show 60b22bc:docs/planning/spelling-reassessment-2026-09-15-evaluation.txt`로 꺼냈다. 2026-09-15 재점검의 항목 표 자체는 issue #6 코멘트 `5675909799`에 전문이 있어 공개되어 있다.

`scripts/spelling-prototype.mjs`는 5줄 어댑터로 `packages/editor/src/proofreading/engine.mjs`와 `third_party/spelling/generated/{lexicon,morphology}.json`을 그대로 읽는다. `review.worker.ts`도 같은 `createChecker`에 같은 두 자산을 넘긴다. 차이는 Worker가 `segment.from`으로 문단 좌표를 더하고 `afterProtected`를 넘긴다는 점뿐이며, 이는 재점검이 이미 "별도 E2E 범위"로 분리한 항목이다.

옛 Hunspell 구현은 현재 코드가 아니다. 추적된 `ko.aff`/`ko.dic`/hunspell/wasm 파일은 없다.

## 4. §8 게이트 판정 — 숫자 게이트를 막는 것은 문장 하나다

```
                          재현율        §8 정확도2 (각각 90% 이상)
전체 ko/spelling   24/25 = 96.0%       통과
분리 ko/spelling    7/8  = 87.5%       실패  ← 유일하게 막고 있는 숫자
전체 ko/spacing    34/35 = 97.1%       통과
분리 ko/spacing    11/12 = 91.7%       통과
전체 en/spelling   28/30 = 93.3%       통과 (§8 정확도9)
분리 en/spelling    9/10 = 90.0%       통과
```

분리 띄어쓰기 11/12는 91.7%로 **통과**다. 재점검 표가 "철자 분리 게이트 미달"이라고만 적은 것이 정확하다.

분모에 대한 기록: 분리 철자 세트는 8문장이라 한 문장이 12.5%포인트다. **일반화 근거로는 약하지만 기존 회귀로서 의미는 있다** — 이 8문장은 예측 전에 갈라 둔 세트이므로 되돌아가는 것을 잡는다. 그러므로 이 문장 하나를 올려 게이트를 초록으로 만드는 것을 완료로 취급하지 않는다. §8도 "실패하면 수치를 낮춰 통과 처리하지 말고 지원에게 범위/비용 판단을 요청한다"고 적고 있다.

## 5. 미달 4건의 엔진 재현과 성격 구분

네 건을 현재 `engine.mjs`에 직접 넣어 재현했다. `check(text, [], {})`, 개인 사전은 비웠다.

```
ko-spelling-8  "두 사람은 연애인이 아닙니다."
  findings 1건: [6,9) "연애인" language=ko type=unknown applicable=false
                suggestions=[] reason="Not in the selected vocabulary"
  어휘: 연예인 ∈ morphology.recognizedNouns(215,810)
        연애인 ∉ 어디에도 없음
        연애   ∈ recognizedNouns 이자 actionNouns

ko-spacing-2   "우리는 함께책을 읽어요."
  findings 1건: [4,7) "함께책" language=ko type=unknown applicable=false
                suggestions=[] reason="Not in the selected vocabulary"
  어휘: 함께 ∈ lexicon.ko.adverb(5,539) 이자 morphology.adverbs
        책   ∈ lexicon.ko.noun(26,498)

en-spelling-7  "It was an accidently deleted file."   findings 0건
en-spelling-15 "Check your calender."                 findings 0건
  어휘: accidently ∈ lexicon.en(198,499)
        calender   ∈ lexicon.en(198,499)
```

§8 정확도2는 "후보 없는 탐지도 분모에 포함한다"고 적지만, `applicable=false`인 미등록 안내는 탐지로 세지 않는다(`emit()`은 `applicable:suggestions.length>0`). 정상 문장 오제안 0건과 미등록 안내는 별도 집계이며, 재점검 기록대로 `all/ko/normal 30`·`all/en/normal 15`·`all/ko/protected 30`의 오제안은 0건이다.

### 5-1. `연애인` — 게이트를 막는 유일한 건

목표어 `연예인`은 이미 인식 명사에 있다. 없는 것은 ㅐ/ㅔ 혼동 후보를 만드는 경로다. 재점검 코멘트가 경고한 대로 **예문별 치환을 추가하는 방식은 안 된다** — 그건 8문장 세트를 통과시키지만 일반화는 재지 못한다. 필요한 것은 근거 있는 규칙(모음 혼동 치환이 어떤 명사류에서 성립하는지)과 그 규칙의 반례 검증이다. 이건 §7 구현 범위이고 지원의 범위 결정 전에는 착수하지 않는다.

### 5-2. `함께책` — 2026-09-16 제 앞선 보고 정정

**제가 채널에서 "책 이 recognizedNouns 에 없으므로 기본 명사 어휘 확장이 필요하고 자산 예산 114KB와 상충한다"고 한 것은 틀렸습니다.** 제 조사 스크립트가 `lexicon.ko`의 한 수준 아래(`ko.noun`)를 들어가지 않아 `책`을 absence로 잘못 보고했습니다. 실제로는:

- `책` ∈ `lexicon.ko.noun` (26,498항목)
- `함께` ∈ `lexicon.ko.adverb` (5,539항목)

**두 낱말 모두 이미 배포 자산에 들어 있으므로 데이터 증가량은 0바이트입니다.** 자산 예산과의 상충은 성립하지 않으며 그 주장을 철회합니다.

실제 원인은 규칙 형태다. `korean-morphology.mjs:785-786`:

```js
const independentAdverb=sets.adverb.has(left)||left.length===2&&left[0]===left[1]&&adverbs.has(left);
if(left.length>=2&&independentAdverb&&!right.startsWith(left)&&tail&&!['하','이','되','시키'].includes(tail.root)&&!predicate(left))
  return {text:left+' '+right,ambiguous:true,rule:'2'};
```

`tail=predicate(right)`가 필수라서 **오른쪽이 서술어일 때만** 분할한다. `함께책`의 오른쪽 `책`은 명사이므로 `predicate('책')`은 null이고 규칙이 멈춘다. 조건을 항목별로 재면:

```
left.length>=2            true   (함께)
sets.adverb.has(left)     true
!right.startsWith(left)   true
tail=predicate(right)     null   ← 여기서 멈춤
knownNominal(right)       true   (책)
```

즉 부사+명사 경계 규칙이 없는 것이지 어휘가 없는 것이 아니다. `knownNominal`은 이미 여러 경로(408, 431, 438, 444, 448, 462, 464, 477, 482행)에서 쓰이므로 재료는 있다.

남은 미확정 사항 — **넓히면 얼마나 터지는지 아직 재지 않았다.** 2음절 부사가 1,083개, 명사가 26,498개라 잠재 좌변 규모가 크고, `spelling-progress.md`는 같은 모양의 회귀를 반복 기록한다(여러분/한쪽을 수량으로 오해, `저+모든 명사` 오분절, 완전 사전 명사를 의존 명사로 재분절). 그래서 "0바이트니까 싸다"고도 말할 수 없다. 착수 전에 (a) 기존 200문장과 (b) 노출 개발 자료 2,122 고유행에서 새 분할이 몇 건 생기는지, (c) 정상 오제안 19/1028이 움직이는지를 먼저 재어야 한다. 그 측정 없이 규칙을 넣는 것이 이 저장소가 반복해서 막아 온 방식이다.

### 5-3. 영어 두 건 — 사전 수록과 그 문맥의 정답은 다른 문제다

`accidently`와 `calender`는 findings가 0건이다. 엔진 결함이 아니라 **두 낱말이 영어 어휘에 실제로 들어 있기 때문**이다. `calender`는 제지·섬유 가공의 캘린더 기계라는 별개 어휘이고, `accidently`는 `accidentally`의 변형 철자로 실리는 사전이 있다. 현재 영어 목록은 Wordnik wordlist(MIT, revision `46e6215d0f90356afe9c8ba4be347e7e98cb425c`, `wordlist-20210729.txt` sha256 `bfd1b4eb…`)에 Wonboard 원작 기본형 76개를 더한 것이다.

그래서 세 갈래가 모두 비용을 가진다.

| 선택 | 효과 | 대가 |
| --- | --- | --- |
| 두 낱말을 영어 목록에서 제거 | 이 2건이 탐지로 바뀜 | `calender`의 실제 용례(제지 기계)가 오탐이 됨. Wordnik 원본 목록을 수정하는 것이라 출처 기록·해시·정책 검사를 다시 거쳐야 함 |
| 문맥 판별 계층 추가 | 두 뜻의 `calender`를 구분 | 엔진 방향 변경. §6의 "AI 문장 재작성·문체 순화 프리셋 제외" 경계와 §9 승인 범위를 넘음 |
| 평가 답안 수정 | 게이트가 통과로 바뀜 | **점수를 올리려고 답을 바꾸는 것**이라 하지 않음 |

영어 게이트는 이미 통과(28/30 = 93.3%, 분리 9/10 = 90.0%)라서 이 두 건은 완료를 막지 않는다. **미달로 기록만 되고 게이트를 막지 않는 항목**이다. 재점검 코멘트가 "정상 단어의 문맥 중의성이 있는 항목을 검토 없이 강제 교정 규칙으로 만들지 않는다"고 적은 것과 같은 판단이다. 사전 수록 사실과 이 문맥에서의 정답은 구분해서 기록하고, **평가 답안은 유지하기로 정해졌으므로** 건드리지 않는다. 즉 이 두 건은 결정 대기 사항이 아니라 **미해결 품질 항목**으로 남는다.

## 6. 독립 평가 부재 — 위 미달과 별개이며 코드로 고칠 수 없다

```
$ node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs | head -1
Cases: 200. Independent evaluation: false. Engine: scripts/spelling-prototype.mjs
```

채점기가 매 실행 첫 줄에 `independent:false`를 출력한다. 200문장과 분리 세트 모두 재사용된 자체 자료다. §8 정확도8("구현 후 새 20개")은 기존 fresh-v4를 재사용 회귀로 돌려서 **미확인**으로 남는다.

실제 독립 기록은 `proofreading-quality-goal.md`와 `proofreading-method-decision-2026-09-13.md`에 있다.

```
173 동결본, 새 클리앙 60글 첫 독립 평가
  첫 후보          304/408  = 74.51%    목표 98%
  필수 수정 상위3   288/803  = 35.87%    목표 95%
  정상 판정 오제안    36/1028 =  3.50%    목표 ≤1%
  검토              87/162  = 53.70%    목표 95%

179 (노출 개발 자료 2,122 고유행 재측정)
  정상 오제안 19/1028 = 1.85% · 필수 후보 291/803 = 36.2%
  첫 후보 309/391 = 79.0% · 검토 87/162 유지
  문서 원문: "원래 품질 게이트는 여전히 미달이다"
```

두 눈금을 섞지 않는다. §8의 200문장 게이트(재현율 90%, top3 85%)와 품질 목표의 독립 게이트(98%/95%/≤1%/95%)는 다른 자료·다른 분모다. **5-1의 문장 하나를 고쳐도 독립 게이트 수치는 움직이지 않는다.**

막고 있는 것은 코드가 아니라 판정이다. `proofreading-quality-goal.md` 기준: 4,206행 보류 자료에 미판정 641행(2026-09-13 재확인), 정상 문장 후보 325개, 최종 판정 행 0개, 예측 미실행. 최신 컴파일본은 `local-corpora/holdouts/next-2026-09-10/compiled-provisional-244.json`. 주석 컴파일러는 모든 행에 `completeGold:false`를 출력하고, **평가기는 미완료 행이 들어오면 전체 입력을 거부**한다(쉬운 행만 골라 점수를 올리는 것을 막는 설계). 즉 판정을 끝내야 독립 평가가 한 번 돌아간다.

이미 소비된 독립 표본은 `clien-independent-075-2026-09-12`와 `clien-independent-173-2026-09-13` 두 개다. 세 번째 표본을 같은 방식으로 뽑으면 노출되어 개발 자료가 된다. **기존 자료를 노출시키지 않는 판정 계획**이 먼저 필요하며, 이건 별도 산출물로 가져온다.

## 7. 자산 예산 실측

```
node zlib gzipSync, main e139408 의 추적 데이터:
  third_party/spelling/generated/lexicon.json      raw 2,810,026   gzip   666,476
  third_party/spelling/generated/morphology.json   raw 4,679,129   gzip 1,218,652
  합계 (stage-proofreading-bundle.mjs 의 산식과 동일)              1,885,128
  코드 하드 상한  if(gzipBytes>2_000_000)throw      → 여유 114,872 bytes (5.7%)
  §8 성능2 목표 1.0MB                               → 885,128 bytes 초과
```

`third_party/spelling/README.md`는 2026-09-12 기준 combined gzip 1,861,303 bytes를 기록한다. 측정 시점과 산식(개별 gzip 합 vs 결합 후 gzip)이 달라 수치가 조금 다르며, **둘 다 상한 안·1MB 목표 초과**라는 결론은 같다. 재점검 코멘트의 1,859,445/1,850,339는 stage된 후보 자산 기준이라 역시 측정 대상이 다르다.

§8 성능2의 1MB 목표는 현재 데이터로 이미 달성되지 않았다. 남은 것은 하드 상한까지 5.7%다. 5-2에서 정정한 대로 `함께책`은 이 예산을 쓰지 않지만, 앞으로 어휘를 늘리는 방향의 개편은 전부 이 114KB 안에서 경쟁한다.

## 8. `stage-proofreading-bundle.mjs`의 해시 상수 drift

이 스크립트는 데이터 sha256를 상수로 박아 두고 다르면 던진다.

```
lexicon.json     실측 582a81dcf351da3b369eb4d7cb4b8f3410612dadf60ded14f35af74ffd8000cc
                 상수 582a81dcf351da3b369eb4d7cb4b8f3410612dadf60ded14f35af74ffd8000cc   일치
morphology.json  실측 38a8386eace92d1e1ecff9c9a2f2c40989c851651305511f537314885d9f257a
                 상수 d6bc76d4a6cbcff44388fdd8c42677cdbb294927f416cfc2af883da20e3eaa23   불일치
→ throw Error('Current Korean data needs a fresh provenance review')
```

### morphology 출처 판단 — 원문 권한은 불명확하지 않다

지시대로 변경 이력·생성기·원문 LICENSE/NOTICE·재현 해시를 조사했다. 결론은 **출처 검토는 이미 되어 있고 권한도 명확하다**이며, 따라서 라이선스 문제로 올리지 않는다.

```
해시 이력   715319d (2026-09-14) 38a8386e…  ← 현재
            19ef8f2 (2026-09-11) d6bc76d4…  ← staging 상수가 고정된 판
            6ff8520 (2026-09-10) f60fcf5e…
            b629d4a (2026-09-10) 1ff3223c…
            → 상수는 정확히 한 판(19ef8f2) 뒤처져 있다

검토 기록   third_party/spelling/README.md 의 2026-09-13 지명 증분 문단이
            "The current morphology SHA-256 is 38a8386e…" 를 명시. 같은 문단이
            pinned revision 12439fb3… 의 COPYING 재취득·바이트 동일, Apache-2.0,
            Place.csv 30,240 surface, 12필드·NNP·지명 의미태 조건을 기록

빌드 게이트  scripts/check-spelling-data-policy.mjs 가 morphology sha256 를
            38a8386e… 로 고정. 현재 main에서 실행하면
            {"passed": true, "problems": []}  종료 0
            이 검사는 build·build:sites·build:desktop 앞에 붙어 있다

원문 고지   third_party/spelling/mecab-ko-dic/COPYING = Apache-2.0 전문(11,357 bytes)
            third_party/spelling/mecab-ko-dic/README.md = lindera/mecab-ko-dic
            revision 12439fb3…, 취득 2026-09-10, NOTICE 파일 부재 확인,
            엔진 소스·바이너리·런타임 의존성 미사용, 파생 JSON은 수정 자료임을 명시
```

즉 `check-spelling-data-policy.mjs`(빌드 게이트)와 README는 현재 데이터를 **검토済み**로 보고 같은 해시를 고정하는데, `stage-proofreading-bundle.mjs`만 옛 해시를 들고 있다. 같은 페이로드의 해시를 두 곳이 따로 고정해서 생긴 drift다.

**그러므로 해시를 바꿔 통과시키는 것은 해법이 아니다.** 상수를 새 값으로 갈아끼우면 다음 데이터 갱신에서 같은 일이 다시 생긴다. 맞는 방향은 staging 쪽이 policy 검사와 같은 단일 출처를 읽게 하거나 그 검사를 호출하게 하는 것이다. `check-spelling-data-policy.mjs` 는 이미 `checkSpellingDataPolicy(read, records=reviewedAssets)` 형태로 읽기 함수와 기록 목록을 주입받으므로, 그 seam 을 재사용하면 저장소 원본을 바꾸지 않고 임시 fixture로 대조 시험을 만들 수 있다. **이 수정은 닝닝 담당·PR #19와 별도 PR로 배정되었고 아직 코드는 고치지 않았다.** 이 문서에는 판단과 근거만 기록한다.

추가로: 이 저장소에는 `.github/workflows`가 없고 `stageProofreadingBundle`을 부르는 시험·빌드도 없다(자기 CLI 진입점뿐). 그래서 Worker 자격 심사 경로가 main에서 죽어 있는데도 아무것도 잡지 못했다.

재현 해시(원본 CSV에서 `morphology.json`을 다시 만들어 38a8386e…를 얻는 것)는 **이번에 실행하지 않았다.** `build-korean-morphology-data.mjs`가 pinned revision의 CSV를 네트워크로 받는데, 그 입력은 공개 고정값이라 임시 공간에서 재현하는 데 새 승인이 필요하지는 않다. 위 출처 판단은 추적된 README·COPYING·정책 게이트 해시 대조로 충분하다고 봐서 이번 범위에 넣지 않았다는 뜻이다. 재현하면 그 결과를 이 문서에 추가로 기록한다.

## 9. Luna 회귀 시험의 격리 결함 (별도 PR #19)

`tests/unit/proofreading-lab-codex.test.mjs`는 임시 디렉터리에 가짜 `codex`를 만들어 PATH 앞에 거는 격리 설계였다. 가짜의 shebang이 ``#!${process.execPath}`` 였고, node 경로에 공백이 있으면(위 1장의 execPath) 커널이 shebang을 첫 공백에서 잘라 `bad interpreter`가 된다. 실행 불가 파일이 되면 execvp의 PATH 탐색이 다음 항목으로 넘어가 **실제 로그인된 `/opt/homebrew/bin/codex`를 집는다.**

그 결과 가짜 **안에** 있던 격리 assert(`--ignore-user-config`, `--ephemeral`, `features.shell_tool=false`, `forced_login_method="chatgpt"`, API 키 제거, 격리 cwd, 출력 스키마 `additionalProperties:false`, stdin 원문)가 하나도 실행되지 않았고, 바깥 assert는 실제 모델이 대신 통과시켰다. **초록인데 아무것도 재지 않은 상태**였다. 드러난 증상은 `line 61`의 `assert.equal(failed.status,1)` 실패 하나였다.

수정과 검증은 [PR #19](https://github.com/jiwonschol/wonboard/pull/19)에 있으며 최종 head는 `fabd8e657bbadc394e9f32e3150a90ec01da0d6e`다. 요지:

```
resolveRunner(binary)   절대 경로만 허용, 시작 전 X_OK 확인. 슬래시가 있으면 execvp가
                        PATH를 탐색하지 않으므로 실행 불가·경로 없음은 실패로 끝난다
createCodex({binary})   인증(login status)과 생성(execFile) 양쪽에 같은 command 사용
run.mjs --codex-bin     luna 전용 주입. manifest.execution.runner 가 주입 여부 기록
가짜 실행기             POSIX sh 래퍼로 두 경로를 따옴표 처리. 매 호출을 기록하고
                        부모 시험이 argv·-c 설정 10종·cwd 유일성·환경 allow-list·
                        자격증명 변수 부재·stdin 원문·출력 스키마를 감사
보조 신호               응답 usage.input_tokens 가 픽스처값 100이고 thread.started 없음
                        → "이 응답 파일은 가짜가 만들었다"까지만 보인다. 핵심 증거는 호출 기록
양성 대조               --codex-bin 없이 실행하면 이름 조회가 통제된 PATH의 감시 실행기에
                        닿아 99로 끝난다 → "감시 0건"이 빈 파일이 아니라 관측 가능함을 보임
```

판별력 보강(`1fe19d0b`): 최초 판은 주입 가짜 디렉터리를 PATH 맨 앞에도 넣고 있어서, `run(command,…)`이나 `execFile(command,…)`을 리터럴 `'codex'`로 되돌려도 같은 가짜가 집히므로 회귀가 통과했다. 성공·turn.failed·실행 불가·없는 경로 네 시험의 PATH에서 주입 디렉터리를 빼고 감시 실행기만 남겼다.

```
최초 결과 (head 08e7424c, 시험 9개) — 닝닝 실행
  --test 9/9 2.4초 · pnpm test 346/346 종료 0 · typecheck 종료 0
  실행 후 새 임시 디렉터리 6개에 실제 CLI 응답 0건, 감시 실행기 기록 파일 미생성
  수정 전 동일 파일: 1실패 · 46.9초 · 실제 호출 6회

최종 결과 (head fabd8e65, 시험 10개) — 코드·시험은 1fe19d0b 와 동일하고 fabd8e65 는 README 한 줄
  닝닝 실행   --test 10/10 · pnpm test 347/347 종료 0 · typecheck 종료 0 · 격리 시험 10/10
  동준 실행   Linux 에서 1fe19d0b 기준 격리 회귀 10/10 종료 0, 정상·양성 대조 시험과 소스 연결 확인
              최종 head 에서는 코드·시험 동일성 확인(문서만 변경되어 재실행하지 않음)

파괴 검증 (동준 요청, 닝닝 실행 — 실제 CLI는 대조군으로 사용하지 않음)
  파괴 1  run(command,…)      → run('codex',…)        10개 중 2개 실패
  파괴 2  execFile(command,…) → execFile('codex',…)   10개 중 2개 실패
          실패한 시험은 둘 다 동일: "Luna CLI uses the injected stub…" · "A failed turn stops the run…"
          복원 후 10/10. 두 파괴에서 실행 불가·없는 경로 시험은 계속 통과한다(X_OK 사전 검사에서 막힘)
  → 이 파괴 둘은 닝닝 실행 증거이고, 동준의 확인 범위(정상·양성 대조·소스 연결)와 구분해 기록한다
```

실제 모델 호출 기록과 가짜 실행기 시험 결과는 이렇게 분리해 기록한다. 이 결함은 node 경로에 공백이 있는 환경에서만 드러나므로, **과거 실행이 실제 호출을 했는지는 임시 디렉터리의 `failed/` 응답 개수가 아니라 응답 본문의 `usage.input_tokens`와 `thread.started` 유무로 판정해야 한다.** 그 기준으로 확인한 결과:

```
2026-09-16 제 세션   wonboard-luna-test-BKEZYx 6건 + 제 재현 6건 = 12건
                     input 162,254 (cached 13,568) · output 1,219 (reasoning 551)
                     thread_id 12개 상이 · billing chatgpt-subscription · estimatedUsd null
2026-09-15 임시본 8개  응답 24건 전부 input_tokens=100 이고 thread.started 없음 → fixture 판정
```

지원 확인(2026-09-16)으로 구독 사용 자체는 허용됐다. 그럼에도 이 수정이 필요한 이유는 사용량이 아니라 **검증해야 할 가짜를 거치지 않고 시험이 통과할 수 있었다는 것**이다.

과거 실행 판정의 근거 강도도 구분해 둔다. **핵심 증거는 가짜 실행기가 남긴 호출 기록**이고, 응답의 `usage.input_tokens=100`과 `thread.started` 부재는 **보조 신호**다. 그 두 값은 "이 응답 파일들은 가짜가 만든 것"까지는 보이지만, **그 세션에서 다른 경로로 외부 호출이 0회였음**까지 증명하지는 않는다. 2026-09-15 임시본의 `failed/` 응답이 0개라는 사실 역시 마찬가지다. 위 24건 fixture 판정은 그 응답 파일들의 성격에 한정해 읽는다.

## 10. 남은 구현 범위

**측정 없이 착수하면 안 되는 것 (순서대로)**

1. 부사+명사 경계 규칙의 폭발 반경 측정 — 기존 200문장·노출 개발 자료 2,122 고유행에서 새 분할 건수와 정상 오제안 19/1028의 변화. 데이터 증가 0바이트지만 규칙 범위는 미확정(5-2). **보류 독립 자료는 이 실험에 섞지 않는다**
2. ㅐ/ㅔ 혼동 후보 경로의 근거와 반례 — `연애인` 한 문장 치환 금지(5-1)
3. 독립 평가의 판정 계획 — 기존 자료를 노출시키지 않는 방식. 보류 4,206행 중 미판정 641행(6장)

**미해결 품질 항목 (결정 대기 아님)**

- 영어 `accidently`·`calender`: **평가 답안은 유지하기로 정해졌다.** 사전 수록 사실과 이 문맥의 정답이 다르다는 기록만 남기고 점수를 올리기 위한 답안 수정은 하지 않는다. 영어 게이트(28/30, 분리 9/10)는 이미 통과라 이 둘은 완료를 막지 않으며, 미검출로 남는 상태 자체가 미해결 품질 항목이다(5-3)

**닝닝 담당으로 배정되어 별도 PR로 진행하는 것 (아직 코드 미수정)**

- `stage-proofreading-bundle.mjs`의 해시 상수 drift. 기존 `checkSpellingDataPolicy(read, records=reviewedAssets)` 를 재사용해 허용 라이선스·원문 고지·검토 해시 기준을 그대로 유지하고, 상수만 최신 값으로 갈아끼우지 않으며, 검증한 바이트와 실제 staging이 쓰는 바이트가 같아야 한다. 대조 시험은 저장소 원본을 바꾸는 대신 임시 fixture에서 정상 통과와 데이터·고지 변조·누락 시 **네트워크 취득·산출물 생성 이전 실패**를 확인한다. PR #19와는 별도다(8장)

**지원의 판단이 남는 것**

- §8 성능2의 1MB 목표: 현재 1,885,128 bytes로 이미 초과. 목표를 다시 정할지, 하드 상한 2MB 기준으로만 볼지(7장)

**이어서 할 것**

- 현철이 전달한 일반 Chromium 맞춤법 실패 두 건(`conditional intention with lexical rieul preservation`, `유의미하다까씬`)의 기준선 확인과 원인 분리

## 11. 하지 않은 것

- 엔진·데이터·평가 답안·품질 목표를 변경하지 않았다
- §7 단계를 착수하지 않았다
- 평가 전체를 무작정 재실행하지 않았다. 코드 변경 범위를 먼저 확인하고 두 명령만 돌렸다
- 실제 모델을 품질 근거로 쓰지 않았다. 이 문서의 모든 언어 수치는 로컬 어댑터와 추적 fixture에서 나왔다
- `local-corpora/` 원문을 채널·PR·이 문서에 복사하지 않았다
- macOS Electron 실제 저장·재실행, Windows 실기기, 실제 OS 한글 조합 입력을 실행하지 않았다. 재점검의 미확인 상태 그대로다
- 성능1의 입력 지연 200ms·취소 500ms·메모리는 측정하지 않았다
- morphology 재현 해시(원본 CSV → 38a8386e…)는 이번에 만들지 않았다. 입력이 공개 pinned 값이라 재현 자체에 새 승인이 필요한 것은 아니고, 이번 범위(재점검 대조)에 넣지 않았다는 뜻이다
- `stage-proofreading-bundle.mjs`의 해시 상수를 고치지 않았다. 닝닝 담당·별도 PR로 배정된 상태이고 아직 코드는 그대로다
