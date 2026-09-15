# #6 현재 main 재점검 (2026-09-15)

검사 코드: `aa85253ec5ce5ccf96508f9d386b73da6d591ebe`. #6 최신 지시에 따라 main에서 `codex/spelling-reassessment`를 만들었다. 엔진·제품 코드·데이터를 변경하지 않았다. 아래는 새 구현의 완료 선언이 아니라 §8 게이트의 통과·미통과·미확인 표다. 결과 코멘트 뒤 지원이 남은 범위를 정한다.

## 판정

전체 완료 미통과. 기존 200문장은 재사용한 자체 자료이며 `independent:false`다. 분리 세트도 이미 재사용되어 독립 홀드아웃이 아니다. 한국어 분리 철자 탐지 7/8은 90% 미만이다. 정상 문장 오제안 0건을 일반 산문 정확도로 확대할 수 없다. 미확정 개인 자료를 정답으로 사용하지 않았다.

| §8 항목 | 현재 판정·근거 |
| --- | --- |
| 정확도 1: 기준 사례·등록 전후삭제·변형 10개 | 부분 확인: 현재 E2E에 기준 문장·사전 변경 경로가 있다. 요구한 10개 전체를 채점기 출력에 매핑한 별도 표는 없으므로 전수 통과 미확인 |
| 정확도 2: 한국어 철자·띄어쓰기 90% | 전체 24/25, 34/35. 분리 세트 7/8, 11/12. 철자 분리 게이트 미달 |
| 정확도 3: top3 85% | 기존 자료 전체·분리에서 충족. 수치는 탐지와 우연히 같으며 별도 열로 출력. 임계값 변경 없음 |
| 정확도 4: 정상 한국어 30개 오추천 0 | 기존 자료 0/30. 미등록 안내도 0. 독립 검증 아님 |
| 정확도 5: 보호 한국어 30개 오추천 0 | 기존 자료 0/30, 미등록 안내 23건. 자동 적용 방지는 별도 UI 시험 |
| 정확도 6: 이벤트/첫후보/top3/문장일치 분리 | 채점기 출력에 모두 분리. 영어·혼용 오류 문장에는 정답 외 잘못된 후보도 남음 |
| 정확도 7: 전체/분리·한계 | 두 분리의 출력 전문을 보존. 모두 재사용 자료 |
| 정확도 8: 구현 후 새로운 20개 | 미확인. 기존 fresh-v4 20개는 재사용 회귀로 재실행했으며 새 자료로 세지 않음 |
| 정확도 9: 영어 30개 90%/85% | 탐지·top3 28/30, 분리 9/10. 첫후보 28/30. 오류 문장 8개에 잘못된 후보 14개가 함께 있음 |
| 정확도 10: 정상 영어·보호·혼용 보존 | 정상/보호 영어 각각 15개 오추천 0. 혼용 오류 top3 10/10, 첫후보 9/10, 잘못된 후보 13개. 원문 보존은 E2E와 별도 판단 |
| 동작 1: 적용·무시·사전·undo/redo·변경·IME | 기존 Chromium 회귀 시험 실행. OS 실제 IME 입력은 미확인(합성 이벤트와 구분) |
| 동작 2: 한영 사전·UI 언어·문법 미지원 | 기존 관련 회귀 및 고지 확인. 영어 문법 구현은 없음 |
| 동작 3: 서식·사진·링크·코드·위치 | 기존 단위/E2E 범위 통과 여부는 실행 결과에 기록. 모든 실제 사용자 문서 보존을 인증하지 않음 |
| 동작 4: 단위·타입·Chrome·Sites 빌드 | 단위 493/493, 타입 0, Sites 빌드 성공. Chromium 결과는 아래 기록 |
| 동작 5: 화면·macOS·Windows | ko/en 390px와 데스크톱 기존 Chromium 시험. macOS Electron 실제 저장/재실행 및 Windows 이번 재점검 미실행 |
| 성능 1: 1만 자 5회·입력·취소 | 실제 Worker 4종 5회 최대 40.2ms로 2초 이하. 첫 Worker 초기 응답 1352.4ms. 입력 지연 200ms·취소 종료 500ms·메모리는 미측정이므로 전체 항목 부분 확인 |
| 성능 2: gzip 목표 1MB/상한2MB | 어휘 합계 1,859,445 bytes, Worker 1,850,339 bytes. 목표 초과·하드 상한 이내. 과거 파일과 같은 조건 다운로드 비교 미실행 |
| 고지 1: 원문·출처·버전·날짜·크기 | 추적된 LICENSE/COPYING과 generated manifests 존재, 정책 해시 검사 통과. 새 취득이나 법률 검토 아님 |
| 고지 2: 현재·과거 고지 | NOTICE와 THIRD_PARTY_NOTICES 존재, 역사적 고지의 Git revision 안내 확인 |
| 고지 3: 원문 외부 전송 없음 | 현재 Worker/검사기/검사창 소스에 fetch/XMLHttpRequest/외부 URL 없음. 모든 네트워크의 동적 감사는 미실행 |
| 고지 4: 레거시 제거·사용자 데이터 | 추적된 ko.aff/ko.dic/hunspell/wasm 파일 없음, 새 작업 공간에서 Sites 빌드. 기존 사용자 저장소는 사용하지 않음 |
| 고지 5: 히스토리 보존 | aa85253 위에 기록만 추가, 히스토리 재작성 없음 |

## 실행 방법·원시 결과

- `node scripts/eval-spelling.mjs --engine scripts/spelling-prototype.mjs` → `spelling-reassessment-2026-09-15-evaluation.txt`
- 같은 명령에 `--cases tests/fixtures/spelling/fresh-v4.json` → `spelling-reassessment-2026-09-15-reused-fresh.txt`
- 어댑터는 production review.worker.ts와 동일 engine.mjs·lexicon·morphology를 읽는다. Worker 문단 좌표 통합은 별도 E2E 범위다.
- `pnpm test`, `pnpm typecheck`, `pnpm build:sites` 실행. pnpm은 저장소 고정 11.19.0 사용.
- `pnpm exec playwright test tests/e2e/spelling.spec.ts --project=chromium --max-failures=1`. 첫 실행은 새 작업 공간에 테스트 로그인 설정이 없어 인증 fixture에서 실패했다. 사용자 계정과 분리한 임시 .env.local을 설정해 재실행했다. 비밀번호는 기록하지 않는다.
- 성능은 임시 Playwright 시험에서 실제 개발 Worker에 1만 자 문단을 보내 첫 응답 후 5회 측정. 한 Worker를 공유하므로 영어 이후 cold 값은 자산 최초 로드 시간이 아니다. macOS Darwin arm64에서 Chromium 153.0.8010.12, 브라우저 userAgent는 Playwright의 Windows 문자열이며 Windows 실기기 증거가 아니다. 반복 문장 4종만 검사했으며 일반 입력 전체 지연을 보장하지 않는다. 원시 결과는 `spelling-reassessment-2026-09-15-performance.json`.

## 다음 결정

추천: 기존 UI를 유지하고, 먼저 독립 정답 자료를 확정해 누락·오제안의 실제 분모를 확보한다. 분리 철자 7/8을 올리기 위한 예문별 치환 추가로 전체 정확도 완료를 선언하지 않는다. #6의 최신 지시에 따라 여기서 제품 구현을 멈추고 지원의 범위 결정을 기다린다.

### 현재 자료의 구체적 누락

`두 사람은 연애인이 아닙니다.`, `우리는 함께책을 읽어요.`가 각각 한국어 철자·띄어쓰기 누락으로 집계됐다. 영어는 `It was an accidently deleted file.`, `Check your calender.`가 누락으로 집계됐다. 이 표는 현재 정답 파일에 대한 결과이며, 특히 정상 단어의 문맥 중의성이 있는 항목을 검토 없이 강제 교정 규칙으로 만들지 않는다. 원문과 모든 후보는 평가 출력 전문에 있다.

### 최종 실행 결과

Chromium 맞춤법 136/136 통과. ko/en 390px 캡처 두 개를 직접 확인했고 기존 시험의 가로 넘침·경계 검사를 통과했다. 긴 검사창의 세로 스크롤은 유지된다. macOS Electron과 실제 OS IME는 이번에 실행하지 않았다. 단위 493개와 타입·Sites 빌드 결과는 앞 표와 같다.

로그: /private/tmp/wonboard-6-unit.log, /private/tmp/wonboard-6-typecheck.log, /private/tmp/wonboard-6-build.log, /private/tmp/wonboard-6-e2e-retry.log, /private/tmp/wonboard-6-performance.log. 최초 인증 설정 누락 실패는 /private/tmp/wonboard-6-e2e.log에 보존한다. 임시 성능 테스트는 영구 테스트에 추가하지 않았다. 원격 push는 자동 승인 검토에서 권한 불명확으로 거부되어 로컬 커밋만 보존한다.
