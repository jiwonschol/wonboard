# 그누보드7 오픈소스와 한국어 처리 조사

기준: `gnuboard/g7`의 `56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0` (2026-09-05 조회).

목적은 코드를 복사하는 것이 아니라, 워드프로세서를 만들며 놓치기 쉬운 의존성과 한국어 입력 실패 사례를 파악하는 것이다. G7은 실제 실행하지 않았다.

## 조사 범위와 재확인 가능한 목록

[전체 의존성 선언 목록](./g7-dependencies.json)에 루트·모듈·플러그인·템플릿·개발 도구의 `package.json`과 `composer.json` **37개**를 수집했다. 개발용·peer·PHP 확장 조건까지 포함한 서로 다른 선언 이름은 **75개**다. 75개 모두가 편집기에 필요한 라이브러리라는 뜻은 아니다. 버전 범위와 사용 위치를 파일별로 보존했다.

루트 lockfile의 맞춤법·한글 관련 이름도 검색했다. 아래 주요 패키지는 이름뿐 아니라 실제 import와 호출부를 확인했다. 모든 간접 의존성이나 제3자 CDN 내부 구현까지 감사한 목록은 아니다.

## 편집기에 직접 참고할 것

| 실제 사용 | G7에서의 위치·기능 | Wonboard 판단 |
| --- | --- | --- |
| CKEditor 5 **43.3.1** | `sirsoft-ckeditor5/resources/extensions/html-editor.json`에서 CDN UMD를 로드. package.json만 보면 놓친다. | 코드·라이선스 통째로 가져오지 않는다. 승인된 Tiptap 엔진에서 기능별 대응을 검사한다. |
| CKEditor 한국어 번역 | `handlers/initEditor.ts:105`의 locale별 `translations/{locale}.umd.js` 로딩. 영어는 내장. | UI 번역과 본문 언어를 분리. CDN 장애에도 한국어 UI가 사라지지 않도록 ko/en을 자체 번들에 포함한다. |
| ImageResize / ImageStyle / ImageCaption / ImageToolbar | `initEditor.ts:591`의 기본 플러그인 목록. 업로드 비활성 상태에서도 기존 이미지 크기·정렬을 편집. | 원본 이미지와 표시 폭·정렬·설명을 분리. 로컬 이미지도 즉시 편집한다. |
| PasteFromOffice / GeneralHtmlSupport | 같은 기본 플러그인 목록에 포함. Word/Office 붙여넣기와 HTML 기능. | 중요한 후속 호환성 항목. M1의 일반 서식 붙여넣기를 Office/HWP 완전 지원이라고 표현하지 않는다. |
| browser-image-compression | 두 기본 템플릿의 `FileUploader/useFileUploader.ts`에서 사용. | 게시용 이미지 생성 단계의 후보. M1은 원본을 그대로 보관하고 표시 크기만 저장한다. 압축 패키지는 아직 설치하지 않았다. |
| DOMPurify | 기본 템플릿의 `HtmlContent.tsx`에서 HTML 정리. | 원시 HTML을 표시할 때 필요한 후보. M1 미리보기는 제한된 문서 노드를 React로 표시하며 임의 HTML을 실행하지 않는다. |
| ezyang/htmlpurifier | 보드·페이지 등 PHP 측 의존성 선언. | 클라이언트 처리만으로 서버 HTML 안전성을 보장할 수 없다는 점을 반영. PHP 패키지를 TS 서버에 그대로 추가하지 않는다. |
| yet-another-react-lightbox | `ImageGallery.tsx`의 확대·탐색·썸네일·전체화면 플러그인. | 서버 갤러리 프리셋 단계 후보. 작성기 필수 의존성으로 먼저 넣지는 않는다. |
| @dnd-kit/core / sortable / utilities | 루트와 두 기본 템플릿에서 선언. | 복잡한 블록 목록 정렬이 필요해질 때 검토. M1은 편집기 드롭과 명시적인 블록 이동을 먼저 검증한다. |
| @monaco-editor/react | 관리자 `CodeEditor.tsx`, JSON 언어 서비스 설정. | JSON/코드 오류를 잡는 기능과 한국어 문장의 맞춤법 교정은 구분한다. 현재 문서 입력 엔진으로 채택하지 않는다. |

## 한국어 입력과 검색에서 확인한 것

- `resources/js/core/template-engine/ActionDispatcher.ts:6107`: `isComposing` 또는 legacy `keyCode === 229`를 검사한다. 조합 확정 Enter가 검색·제출·닫기를 먼저 실행하지 않도록 한다.
- `templates/_bundled/sirsoft-basic/src/components/basic/Input.tsx`, `Textarea.tsx` 및 관리자 템플릿: 조합 중 외부 value로 입력값을 덮어쓰지 않고, 조합 종료 때 실제 DOM 값을 전달한다.
- `tests/Playwright/specs/ime-composition-key-filter.spec.ts`와 `tests/scenarios/ime-composition-key-filter.yaml`: IME 신호를 합성해서 검사한다. 실제 OS 입력기의 모든 동작을 검증한 것으로 확대하지 않는다.
- `CHANGELOG.md:316`: 한글 글자 수를 바이트 길이로 검사해 500자 제한에서 167자부터 실패했던 수정 이력. Wonboard의 사용자 글자 수는 `Intl.Segmenter`의 글자 단위로 센다. 입력 안전 상한과 화면에 보여주는 글자 수는 별도다.
- `app/Casts/AsUnicodeJson.php`: JSON 한글을 UTF-8 그대로 저장해 DB ngram 검색과 연결한다. 영어 어간 처리만으로 한글 검색을 대신하지 않는다. Wonboard 로컬 제목 검색은 NFC 정규화 비교를 하되 원문은 바꾸지 않는다.

## 맞춤법·오타 교정에 대한 현재 결론

확인한 선언 37개, 루트 lockfile, 편집기 설정, 템플릿 입력 코드에서 **별도 한국어 맞춤법 교정 라이브러리를 확인하지 못했다**. `es-hangul`, `hanspell`, `nspell`, `spellchecker` 같은 이름도 해당 조사 범위에서 발견되지 않았다. 저장소 전체·외부 플러그인 생태계에 절대 없다는 결론은 아니다.

`spellCheck`는 브라우저 기능을 켜는 속성이고, Monaco의 JSON 검사와 IME 보호도 문장 교정 엔진이 아니다. Wonboard M1은 브라우저 맞춤법 기능을 허용하지만, 브라우저·언어 설정에 따라 달라지므로 자체 한국어 교정 기능으로 홍보하지 않는다. 에디터가 초안을 외부 교정 서비스에 자동 전송하는 기능은 없다.

별도의 교정 기능을 추가할 때는 한국어 사전·띄어쓰기 품질, 라이선스, 오프라인 가능성, 원문 외부 전송 여부를 먼저 비교한다. 확인되지 않은 교정 API를 넣거나 동의 없이 문장을 전송하지 않는다.

## 기타 의존성 구분

- React / React DOM / Zustand / Immer: 화면·상태 관리. Wonboard는 React와 좁은 상태 소유권으로 시작했다.
- Laravel / Sanctum / Scout / Reverb / Flysystem / AWS SDK / Redis 관련: 인증·검색·실시간·저장소 등 서버 기능. Node 서버 단계에서 책임을 대응시키며 PHP 전체 스택을 복제하지 않는다.
- Chart.js, Font Awesome, flag-icons, react-select: 관리자·표시용 기능. 작성기 필수 구성은 아니다.
- Daum 주소 검색, 결제·본인확인 사업자 SDK: 외부 서비스 통합이다. 무료 오픈소스 편집 기능과 구분하고 M1에서 연결하지 않는다.
- Vitest / Playwright / Testing Library / axe-core: 자동·접근성 검증. Wonboard도 단위 테스트와 브라우저 흐름 검증을 별도로 둔다.
- AI SDK / MCP SDK는 `docs/ai-tools/agents`의 개발 도구 의존성도 포함한다. 이것을 G7 사용자 글쓰기 기능으로 오인하지 않는다.

## 고정된 원본 링크

- [프런트 의존성](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/package.json)
- [기본 템플릿](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/templates/_bundled/sirsoft-basic/package.json)
- [편집기 로딩·플러그인 설정](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/plugins/_bundled/sirsoft-ckeditor5/resources/js/handlers/initEditor.ts)
- [CDN 선언](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/plugins/_bundled/sirsoft-ckeditor5/resources/extensions/html-editor.json)
- [한글 입력 컴포넌트](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/templates/_bundled/sirsoft-basic/src/components/basic/Textarea.tsx)
- [IME 테스트](https://github.com/gnuboard/g7/blob/56836a2b66c3bc4c3ae84ab1ae983248bb6d40b0/tests/Playwright/specs/ime-composition-key-filter.spec.ts)
