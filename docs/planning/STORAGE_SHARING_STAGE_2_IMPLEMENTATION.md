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
