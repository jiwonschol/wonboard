# 모든 글 백업

「PC 저장 → 모든 글 백업」은 휴지통 밖의 글을 모은 STORE ZIP이다. `manifest.json`과 `<documentId>.zip`을 담는다. 안쪽 파일은 기존 `exportBackup`의 결과 그대로이며 단독으로도 가져올 수 있다. 보관함에서 글에 붙이지 않은 파일은 포함하지 않는다.

```json
{
  "version": 1,
  "createdAt": "2026-11-06T00:00:00.000Z",
  "documents": [{ "documentId": "example", "title": "제목", "filename": "example.zip" }],
  "skipped": [{ "documentId": "failed", "title": "빠진 글", "reason": "archiveLimit" }]
}
```

저장소의 목록은 사진 바이트를 붙들지 않는다. 목록에서 한 글씩 `load → exportBackup`을 실행하고, 완성된 ZIP Blob을 바깥 ZIP의 조각으로 보관한다. 현재 편집 중인 글과 충돌 사본은 메모리에 있는 내용을 우선한다. 실패한 글은 `skipped`에 적고 다음 글을 처리한다.

한 글의 상한은 기존 256 MiB이며 바깥 ZIP 전체에는 그 상한을 적용하지 않는다. `storedZip.ts`는 fflate의 `ZipPassThrough`로 CRC를 계산하고, Blob 조각으로 무압축 ZIP을 만든다. 전체 크기·파일 수가 기존 ZIP 필드를 넘으면 ZIP64 중앙 디렉터리 오프셋과 종료 레코드를 쓴다. 파일 배치의 정본은 [PKWARE APPNOTE §4.3, §4.5.3](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)이다.

가져올 때는 Blob을 잘라 헤더와 manifest만 먼저 읽는다. 안쪽 ZIP 하나씩 CRC 확인 후 기존 `importBackup → 사진 디코드 검증 → writer.restore`로 전달한다. 글·첨부 식별자의 새 발급도 기존 복원 경로가 맡는다. 한 글의 손상은 나머지 복원을 막지 않는다. 알 수 없는 문서 형식은 묶음에서 건너뛰고, 단일 ZIP으로 열면 기존 읽기 전용 복원 동작을 따른다. 바깥 ZIP 자체의 구조나 manifest가 손상되면 전체를 거부한다.
