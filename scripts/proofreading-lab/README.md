# Luna 페르소나 검증 실행기

원보드 제품 검사기를 교체하지 않는 비공개 개발 도구다. 같은 원문에 대해 현재 공통 검사기와 선택한 모델의 세 역할의 출력을 기록한다. 소설 워크스테이션의 확장/절제 프롬프트를 가져오지 않는다. 원보드 웹·Windows·macOS UI는 변경하지 않는다.

## 기본 경로: ChatGPT 로그인 + GPT-5.6 Luna

지원의 결정으로 기본 공급자를 `luna`로 변경했다. 설치된 공식 Codex CLI를 재사용하며 새 OAuth 앱·토큰 복사·OpenAI API 키가 필요하지 않다. `codex login status`가 ChatGPT 로그인을 확인해야 실제 실행한다. 호출 프로세스에는 API 키와 Google 서비스 계정 환경변수를 전달하지 않고 `forced_login_method="chatgpt"`를 설정한다. 일반 OpenAI API나 Railway 서버 인증을 구독으로 대체하는 구현은 아니다.

```sh
# 원문/요청을 확인하는 준비 실행: 네트워크 0회
node scripts/proofreading-lab/run.mjs --input local-corpora/luna-persona-pilot/input.json --out local-corpora/luna-persona-pilot/dry-NEW --max-calls 9
# 현재 ChatGPT 구독 사용량으로 실행
node scripts/proofreading-lab/run.mjs --input local-corpora/luna-persona-pilot/input.json --out local-corpora/luna-persona-pilot/live-NEW --live --max-calls 9
```

모델은 `gpt-5.6-luna`, reasoning effort는 `medium`이다. 각 문장×각 역할마다 별도 임시 작업 디렉터리와 새 ephemeral 대화를 사용한다. 기존 사용자 config를 불러오지 않으며 셸·웹검색·앱·다중 에이전트 도구를 끄고 read-only/승인 거부로 실행한다. 원문은 명령줄 대신 stdin으로 보낸다. 결과에 도구 실행이 있으면 거부한다. 임시 프롬프트와 스키마는 실행 후 제거한다. 모델 추론은 원격에서 수행하며 로컬은 CLI 실행과 결과 처리를 맡는다.

### 실행기 경로 주입 (`--codex-bin`)

기본값은 PATH에서 찾은 설치된 공식 CLI다. `--codex-bin /절대/경로/codex`를 주면 **인증(`codex login status`)과 생성 호출 양쪽 모두** 그 절대 경로만 사용한다. 경로에 슬래시가 있으면 execvp가 PATH를 탐색하지 않으므로, 주입한 실행기가 없거나 실행 불가면 **설치된 실제 CLI로 조용히 넘어가지 않고 실패한다.** 상대 경로·실행 불가 파일·**디렉터리**는 시작 전에 거부된다. 디렉터리에 대한 `X_OK`는 「탐색 가능」이지 「프로그램으로 실행 가능」이 아니므로, `statSync`로 일반 파일 여부까지 확인한다. `statSync`는 심링크를 따라가므로 **정상 실행 파일로 가는 심링크는 거부하지 않는다.** `--codex-bin`은 `luna` 공급자 전용이며 `gemini`와 함께 쓰면 거부된다. `manifest.json`의 `execution.runner`가 `injected-absolute-path`인지 `installed CLI on PATH`인지를 기록한다.

**이 검증은 `--live`와 무관하게 돈다.** 준비 실행(dry-run)도 같은 경로를 resolve·검증하므로, 실제 실행이라면 거부됐을 구성으로 준비가 성공하는 일이 없고 `execution.runner`에 검증되지 않은 `injected-absolute-path`가 기록되는 일도 없다. 준비 실행은 경로 존재·실행 가능성만 확인하고 프로세스를 띄우지 않으므로 인증·생성 호출은 0건이며, 준비 출력에 `networkCalls:0`·`authCalls:0`·`generationCalls:0`과 채택한 `runner`를 함께 기록한다. 주입이 없으면 준비 실행은 CLI를 찾지도 요구하지도 않는다 — Codex CLI가 없는 깨끗한 Windows·CI 기계에서도 준비는 성공한다.

이 인자는 회귀 시험이 구독을 쓰지 않게 하는 장치다. `tests/unit/proofreading-lab-codex.posix.test.mjs`는 이 경로로 가짜 실행기를 주입하고, 가짜가 받은 argv·cwd·환경·stdin을 호출 기록으로 남겨 부모 시험이 감사한다. PATH 뒤쪽에 심어 둔 감시 실행기는 호출 0건이어야 한다. **일반 회귀는 전부 절대 경로 주입으로 실행하고, 이름 조회 경로는 통제된 PATH에 감시 실행기만 남겨 둔 양성 대조 시험 하나로만 확인한다.** 감시 실행기 디렉터리만 PATH에 있고 주입한 stub의 디렉터리는 PATH에 없으므로, 호출 부위를 절대 경로에서 이름 조회로 되돌리면 시험이 통과하지 못하고 감시에 걸려 실패한다. 그 양성 대조도 감시 실행기에서 99로 끝나므로 실제 구독에 닿지 않는다. 실제 실행은 주입 없이 PATH의 설치된 CLI를 쓰는 그대로다.

호출 수는 기본48, 명시적으로 최대300까지 제한한다. 문장 하나는3호출이다. 호출당180초·프로세스 출력2MiB 제한이며 실행기 자체 재시도는 없다. 공식 CLI 내부의 네트워크 재연결 정책은 별개다. CLI에 출력 토큰 상한을 설정한 것은 아니며 호출 수·시간 제한을 구독 사용량의 정확한 상한이라고 주장하지 않는다. 실제 입력/캐시/출력 토큰을 기록하고 API 달러 비용은 `null`로 남긴다. 구독 한도에 도달하면 중단하며 유료 API로 자동 전환하지 않는다.

Codex 이벤트가 실제 모델 버전을 제공하지 않아 manifest의 모델은 요청한 모델명이다. 새 실행 결과는 `modelVersion:null` 및 해당 한계를 기록한다. 초기 live-003은 요청 모델명을 modelVersion으로 기록한 초기 구현 결과이므로 실제 버전 확인 증거로 사용하지 않는다. 성공 응답의 원본 이벤트와 실패의 진단 출력은 비공개 결과 폴더에 저장한다. 초기 live-001/002는 샌드박스의 내부 실행기 초기화 거부로 생성 결과0개였으며 live-003은 샌드박스 밖 실행으로 확인했다.

공식 계약: [비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode), [인증](https://learn.chatgpt.com/docs/auth). 구독 사용량은 일반 Codex 작업과 공유되므로 무제한 무료로 표현하지 않는다.

### Windows 검증 범위와 POSIX 전용 시험 분리

`scripts/test-node-units.mjs`는 셸 glob 없이 `tests/unit/`의 모든 `.test.mjs`를 나열하므로 Windows에서도 같은 목록이 그대로 돈다. 실행기 시험은 그 사실에 맞게 두 파일로 갈랐다.

- `proofreading-lab-codex.test.mjs` — **플랫폼 무관 계약 9건. Windows에서도 전부 실행된다.** 프롬프트 격리와 strict 스키마 변환, 이벤트 스트림 해석과 사용량 회계, 공급자 키 제거, 절대경로 해석, 그리고 준비 실행의 주입 검증 전부(거부 4종 — bare name·상대·없는 절대경로·디렉터리 — 와 채택·주입 없음·`gemini` 결합 거부)가 여기 있다. 가짜 실행기를 띄우지 않고 순수와 `node run.mjs` 호출만으로 판정한다.
- `proofreading-lab-codex.posix.test.mjs` — **POSIX 커널이 필요한 8건.** `#!/bin/sh` stub 실행, chmod로 모드 비트를 벗긴 실행기, symlink, 감시 실행기 PATH 조회, spaced shebang 재현이 여기 있다. `process.platform==='win32'`에서 **건마다 이유가 적힌 SKIP**으로 남는다(TAP에 `# SKIP ...` 8줄). 파일 전체를 조용히 건너뛰지 않고, 모듈 최상위는 파일시스템을 건드리지 않아 win32에서도 로드 자체는 안전하다.

**분리 중 시험이 강제하는 부분은 좁다.** 계약 파일이 POSIX 전용 `node:fs` 헬퍼를 import 하면 허용 목록(`existsSync`·`mkdtempSync`·`readFileSync`·`readdirSync`·`writeFileSync`) 밖이라 모든 플랫폼에서 실패한다. 이 검사는 위반 fixture를 같은 표현식으로 거부하는 것까지 assert하므로 빈 통과로 굳지 않는다. 그 밖의 분리 — 셸 래퍼 문자열이나 하드코딩 PATH 구분자를 계약 파일에 넣지 않는 것 — 는 파일 경계와 리뷰로 유지되며 **시험이 잡지 않는다.**

이전에 이 문서는 계약 파일에 셸 래퍼·`symlinkSync`·`chmodSync`가 다시 나타나거나 PATH를 `delimiter` 없이 조립하면 실패한다고 더 넓게 주장했다. 그 가드는 실제로 두 경우를 놓쳤다. 부분 문자열을 이어 붙인 값이 `/binsh`여서 `/bin/sh`를 못 잡았고, `delimiter` 검사는 import 줄의 `delimiter`에 이미 걸려 PATH를 하드코딩 구분자로 조립해도 통과했다. 위반 원본을 메모리에 넣어 같은 assertion이 전부 통과하는 것을 확인한 뒤, 검사할 수 있는 좁은 계약으로 교체하고 나머지 보장은 문구에서 걷었다.

아래는 Windows에서 실제로 검증되는 범위의 선언이며, **작성자의 Windows 실행 증거가 아니다 — 작성자에게 Windows 기계가 없다.**

- 도는 것: 계약 9건. SKIP: POSIX 8건(이유 문자열 포함). 이 skip 보고 방식은 macOS에서 `process.platform`을 `win32`로 고정한 모의 실행으로 확인했다. 그 모의는 `node:path`가 win32 구현을 고르므로 POSIX 파일시스템 위에서는 계약 시험이 실패로 나오는데, **그 실패는 모의의 부산물이지 Windows 동작의 증거가 아니다.**
- `--codex-bin`의 절대경로 여부는 `node:path`의 플랫폼별 `isAbsolute`가 정한다. win32에서는 드라이브 한정(`C:\...`)과 UNC(`\\server\share`)뿐 아니라 드라이브 상대 루트 `/abs/path`도 `true`다 — `path.win32.isAbsolute('/abs/path') === true`를 직접 실행해 확인했다. 모든 플랫폼에서 거부되는 것은 bare name과 상대 경로뿐이다. **이 문서는 앞서 「`/abs/path`는 win32 `isAbsolute`가 거부한다」고 적었고 그건 틀렸다.** 정정한다.
- Windows에는 POSIX 실행 비트가 없으므로 "실행 불가 파일 거부"의 모드 비트 절반은 같은 강도로 보장되지 않는다. 그래서 그 절반만 POSIX 전용으로 분리했고, 없는 경로 거부는 플랫폼 무관 계약으로 남겼다.
- Windows에서의 실제 실행, Codex CLI의 Windows 동작, Playwright Windows 실행은 **미검증**으로 남는다.
- macOS(작성 환경) 증거: `tsc --noEmit` 통과, Vitest 163개, Node 단위 354개(계약 9 + POSIX 8 + 기존 337) 전부 통과·종료 0.

## 보존한 선택 경로: Gemini 인증과 실행

Gemini를 명시적으로 사용할 때만 아래 명령에 `--provider gemini`를 추가한다. 이 경로는 자동 대체 수단이 아니다.

Node 22.12 이상이며 추가 패키지를 설치하지 않는다. Overwater와 같은 서비스 계정 환경변수 계약을 사용한다. `GOOGLE_SERVICE_ACCOUNT_KEY_B64`는 API 키 문자열이 아니라 서비스 계정 JSON을 base64로 인코딩한 비밀값이다. 브라우저 변수(`VITE_*`, `NEXT_PUBLIC_*`)에 넣지 않는다.

- `GCP_PROJECT_ID`: 과금·권한 대상 프로젝트
- `GCP_LOCATION`: 기본 `global`
- `GOOGLE_SERVICE_ACCOUNT_KEY_B64`: 서버에서만 읽는 기존 인증 정보

입력 JSON은 `[{"id":"case-1","text":"검사할 원문"}]` 형식이다. 1–100개, 각4000 UTF-16 단위 이하를 받는다. 길이 초과를 자동으로 잘라 문맥을 잃지 않고 거부한다. 원문·결과는 Git 제외된 `local-corpora/`에 저장한다. 입력의 정답/사용자 사전/기타 메타데이터는 모델로 보내지 않는다. 모델에게 보낼 원문은 실행자가 명시적으로 선택한다.

```sh
node scripts/proofreading-lab/run.mjs --provider gemini --input local-corpora/gemini-persona-pilot/input.json --out local-corpora/gemini-persona-pilot/dry-002
```

기본은 네트워크 호출 없는 준비 실행이다. 실제 호출은 과금 승인 후 같은 명령에 `--live --budget-usd 1`을 추가하고 **새 출력 폴더**를 지정한다. 비밀값은 명령줄에 쓰지 않고 환경변수 또는 Git에서 제외된 환경 파일로 전달한다. 다른 저장소의 환경 파일을 자동 탐색하거나 복사하지 않는다.

Railway에서도 같은 Node 명령과 환경변수를 사용할 수 있는 일회성 실행 구조다. 현재 Railway 서비스·변수·볼륨을 생성하거나 배포하지 않았다. 실제 배포 시 별도 서비스에만 설정하고, 결과 경로에는 비공개 영속 볼륨이 필요하다. 웹 포트나 공개 결과 URL을 만들지 않는다. Railway 자체 비용과 Google 모델 비용은 별개다. 기존 Overwater 서비스의 시작 명령·변수는 바꾸지 않는다.

## 출력과 판정

`manifest.json`은 입력·프롬프트·검사기 해시, 모델, 역할, 예산을 기록한다. `requests.json`은 실제 보낼 요청, `baseline.json`은 개인 사전이 비어 있는 현재 검사기 결과다. 각 요청의 시작/응답/결과를 별도 파일로 보존한다. `comparison.json`과 정적 `comparison.html`에는 역할별 의견이 나온다. HTML에는 스크립트나 원격 리소스가 없고 원문을 이스케이프한다.

세 역할은 맞춤법, 원문 보존, 인터넷 문맥이다. 같은 입력으로 서로의 답변 없이 호출한다. `correct`/`review`/`protect`를 구별하고, 원문 문자열의 발생 순번을 실제 UTF-16 위치로 해석한다. 임의 문자열·존재하지 않는 위치·불완전 응답은 실패다. 같은 위치의 동일 의견 여부는 표시하지만 투표로 정답을 만들지 않는다. 서로 겹치는 다른 범위의 의견과 모든 미판정 의견은 추가 대조가 필요하다.

이 도구는 자동 채점기나 최종 언어 판정자가 아니다. 독립 평가 자료에 적용하기 전 프롬프트/모델을 고정하고, 정답과 출처 근거를 모델 출력과 별도로 유지해야 한다. 현재 파일럿16문장은 알려진 개발 문제를 재구성한 진단 자료이며 독립 정확도 표본이 아니다. 개인 사전 자체는 모델 공급자에 전송하지 않는다.

## Gemini 호출·비용 처리

최대 출력4096토큰, 순차 호출, 자동 재시도 없음. 준비 단계에서 입력 UTF-8 바이트와 출력 상한으로 보수적으로 비용을 예약한다. `--budget-usd`는 0 초과5 이하이며 예약 비용이 예산보다 크면 시작하지 않는다. 입력·출력·생각 토큰을 기록한다. 캐시 할인·크레딧은 차감하지 않는다. 이는 Cloud 결제 차단기가 아니라 실험 범위 제한이며 세금·환율·가격 변경은 별도다.

전송·인증 실패, 사용량 누락·예산 초과 시 즉시 중단한다. 모델 JSON/원문 위치 검증 실패는 해당 응답 전체를 invalid로 격리하고 다음 미실행 요청을 계속한다. 격리된 응답을 자동 수정하거나 재호출하지 않으며 종료 코드는 실패로 유지한다. 실패 요청도 과금될 수 있다. 응답을 받았다면 비공개 파일로 보존하며, 알 수 없는 비용을0으로 확정하지 않는다. 출력 폴더를 재사용하지 않아 충돌이나 중단 후 자동 중복 호출을 막는다. 재개 전 기존 시작/결과 기록을 확인해야 한다.

인증은 Google의 [서비스 계정 OAuth HTTP 계약](https://developers.google.com/identity/protocols/oauth2/service-account#httprest)을 따른다. RSA 서명, 고정 Google 토큰 주소, 고정 Google API 호스트, 리디렉션 거부, 토큰 캐시를 사용하며 테스트는 가짜 키·모의 응답만 사용한다. 실제 Google 인증·권한·모델 응답은 아직 검증하지 않았다. 응답 구조는 [공식 structured output](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)을 참고한다. 단가는 확인일2026-09-13 기준 입력100만 토큰$0.25·출력$1.50이며 [공식 가격 안내](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)를 따른다.

## 이전 Gemini 준비 검증 (177)

`node --test tests/unit/proofreading-lab.test.mjs`: 6개 통과. 역할 분리·정답 제외·원문 좌표·합의의 미판정 유지·생각 토큰·JWT 서명·리디렉션·토큰 재사용·예산 거부·모의 전체 실행·HTML 이스케이프를 확인했다. 실제 Gemini 결과라고 주장하지 않는다.

Google Cloud 크레딧의 적용 여부와 실제 과금은 별도로 확인해야 한다. 개인 결제 계정의 상세 내역은 공개 문서에 포함하지 않는다. Gemini 실제 호출은 명시적인 비용 승인 후에만 실행하며 기본 검증 경로는 기존 ChatGPT 로그인과 공식 Codex CLI를 사용하는 Luna다.

## Luna 실제 검증 (178)

개발 표본4개×3역할 총12호출 성공. 첫9회는6.3–10.2초/호출, 추가3회는9.4–14.2초/호출이었다. 입력158803토큰(캐시10752포함), 출력2921토큰을 기록했다. 짧은 문장에도 CLI 공통 문맥을 포함한 입력 사용량이 발생하므로 순수 원문 토큰만으로 소비량을 예상하지 않는다. `local-corpora/luna-persona-pilot/live-003`과 `live-004`에 보존한다. 전용10개·전체Node327개·Vitest148개·타입 검사 통과. 정상 보존과 오류 후보를 확인했으나 동일 모델 세 역할이 같은 오교정 후보를 낸 사례도 남았다. 품질 인증 자료가 아니다.

## 품질 대조179

개발32개×3역할96회 정상 완료. 구어체 조사 생략/어순 보존 및 의미 추측 금지를 지시에 추가했다. 새 후속4개는 과교정 없이 실제 오류만 제안했지만 일반화 인증이 아니다. 스킬 축약 안내는 경고로 보존하고 임의 오류는 거부한다. 결과는 비공개 local-corpora/luna-quality-179/report.md를 따른다.

## 중단 후 명시적 이어서 실행

`--start-request N`은 입력×세 역할의0기준 요청 목록에서 N부터 실행한다. 새 출력 폴더를 요구하고 manifest에 시작 번호를 기록한다. 기존 시작·결과 파일을 읽어 아직 실행하지 않은 위치를 확인한 뒤 사용한다. 자동 재개가 아니며 기존 실패를 지우거나 성공으로 세지 않는다.
