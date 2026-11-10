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

## 보관함 백업

「파일 보관함 → 보관함 백업」은 휴지통 밖의 보관함 파일을 모은 별도의 STORE ZIP이다. 글에 붙였는지와 무관하게 보관함에 있는 원본을 담고, 글과 글이 가진 사진·첨부 사본은 담지 않는다. 「모든 글 백업」의 형식과 포함 범위는 그대로이며 두 파일은 서로의 가져오기에서 열리지 않는다.

```json
{
  "version": 1,
  "kind": "library",
  "createdAt": "2026-11-11T00:00:00.000Z",
  "files": [{ "id": "example", "filename": "이름.pdf", "mime": "application/pdf", "size": 3, "sha256": "…", "entry": "files/example" }],
  "skipped": [{ "id": "failed", "filename": "빠진 파일.bin", "reason": "missingMedia" }]
}
```

`libraryBackup.ts`는 local·Sites·desktop이 함께 쓰는 `FileLibrary`의 `list → load`와 `upload`만 호출하고, 컨테이너는 `storedZip.ts`를 그대로 쓴다. 파일을 하나씩 읽어 크기·SHA-256·파일당 20 MiB 상한을 확인한 뒤 담는다. 읽지 못했거나 상한을 넘는 파일은 `skipped`에 적고 다음 파일로 넘어간다.

가져올 때는 manifest를 먼저 검증하고, 파일마다 CRC·크기·SHA-256을 확인한 뒤 기존 올리기 경로로 넘긴다. 올리기는 새 식별자를 발급하므로 기존 파일을 덮어쓰지 않고, 이름과 형식은 백업 당시 값을 쓴다. 공유 링크와 휴지통 상태는 백업에 없으므로 되살아나지 않는다. 한 파일의 손상은 나머지 복원을 막지 않으며 화면은 되찾은 개수와 실패한 파일 이름을 따로 보여 준다. manifest가 보관함 백업이 아니거나 손상되면 전체를 거부한다.
