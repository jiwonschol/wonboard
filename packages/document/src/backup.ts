import { zip, unzip, strToU8, strFromU8 } from "fflate";
import {
  DocumentError,
  limits,
  sha256,
  validateDocument,
  withoutUnusedMedia,
  inspectImageBytes,
  type Draft,
  type WriterDocument,
} from "./index";

export async function exportBackup(draft: Draft): Promise<Blob> {
  draft = withoutUnusedMedia(draft);
  const files: Record<string, Uint8Array> = {
    "document.json": strToU8(JSON.stringify(draft.document)),
  };
  let total = files["document.json"].byteLength;
  if (total > limits.archiveBytes) throw new DocumentError("archiveLimit");
  for (const media of Object.values(draft.document.media)) {
    const blob = draft.blobs[media.id];
    if (!blob || blob.size !== media.size)
      throw new DocumentError("missingMedia");
    total += blob.size;
    if (total > limits.archiveBytes) throw new DocumentError("archiveLimit");
    const buffer = await blob.arrayBuffer();
    if ((await sha256(buffer)) !== media.sha256)
      throw new DocumentError("corruptBackup");
    files[`media/${media.id}`] = new Uint8Array(buffer);
  }
  const data = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) =>
    zip(files, { level: 0 }, (error, result) =>
      error ? reject(error) : resolve(result as Uint8Array<ArrayBuffer>),
    ),
  );
  if (data.byteLength > limits.archiveBytes)
    throw new DocumentError("archiveLimit");
  return new Blob([data], { type: "application/zip" });
}

// 읽기 전용으로 얼어붙은 초안(미래 스키마·지원하지 않는 노드)은 exportBackup 이 같은
// validateDocument 에서 다시 던지므로 ZIP 을 만들 수 없다. 그러면 사진이 든 초안에는
// 온전한 회수 경로가 없다 — JSON 내보내기는 이진 자료를 통째로 빼기 때문이다.
// 이 경로는 검증하지 않고 저장된 것을 그대로 담는다. 되읽기용이 아니라 회수용이다.
export async function exportRawBackup(draft: Draft): Promise<Blob> {
  const files: Record<string, Uint8Array> = {
    "document.json": strToU8(JSON.stringify(draft.document)),
  };
  let total = files["document.json"].byteLength;
  if (total > limits.archiveBytes) throw new DocumentError("archiveLimit");
  for (const [id, blob] of Object.entries(draft.blobs)) {
    if (!(blob instanceof Blob)) continue;
    total += blob.size;
    if (total > limits.archiveBytes) throw new DocumentError("archiveLimit");
    const safeId = Array.from(new TextEncoder().encode(id), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    files[`media/raw-${safeId || "empty"}`] = new Uint8Array(
      await blob.arrayBuffer(),
    );
  }
  const data = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) =>
    zip(files, { level: 0 }, (error, result) =>
      error ? reject(error) : resolve(result as Uint8Array<ArrayBuffer>),
    ),
  );
  if (data.byteLength > limits.archiveBytes)
    throw new DocumentError("archiveLimit");
  return new Blob([data], { type: "application/zip" });
}

export async function importBackup(blob: Blob): Promise<Draft> {
  if (blob.size > limits.archiveBytes || blob.size < 22)
    throw new DocumentError("archiveLimit");
  let total = 0;
  let invalid = false;
  const names = new Set<string>();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array<ArrayBuffer>>>(
    (resolve, reject) =>
      unzip(
        bytes,
        {
          filter: (file) => {
            total += file.originalSize;
            if (
              names.has(file.name) ||
              !/^(document\.json|media\/[a-zA-Z0-9_-]{1,80})$/.test(
                file.name,
              ) ||
              !Number.isSafeInteger(file.originalSize) ||
              // 사진 한 장의 상한이지 문서의 상한이 아니다. document.json 에 걸면
              // exportBackup 이 정상으로 만들어 낸 묶음을 가져오기가 거부한다 —
              // 같은 사진 노드를 여러 번 쓰면서 설명을 길게 단 문서로 실제로 닿는다.
              // 문서 크기는 아래 total 이 archiveBytes 로 이미 막는다.
              (file.name !== "document.json" &&
                file.originalSize > limits.imageBytes) ||
              total > limits.archiveBytes ||
              names.size >= limits.images + 1
            )
              invalid = true;
            names.add(file.name);
            return !invalid;
          },
        },
        (error, result) =>
          error
            ? reject(new DocumentError("corruptBackup"))
            : resolve(result as Record<string, Uint8Array<ArrayBuffer>>),
      ),
  );
  if (invalid) throw new DocumentError("archiveLimit");
  if (!files["document.json"]) throw new DocumentError("corruptBackup");
  let document: WriterDocument;
  try {
    document = JSON.parse(strFromU8(files["document.json"]));
  } catch {
    throw new DocumentError("corruptBackup");
  }
  validateDocument(document);
  if (names.size !== Object.keys(document.media).length + 1)
    throw new DocumentError("corruptBackup");
  const blobs: Record<string, Blob> = {};
  for (const media of Object.values(document.media)) {
    const data = files[`media/${media.id}`];
    if (
      !data ||
      data.byteLength !== media.size ||
      inspectImageBytes(data) !== media.mime ||
      (await sha256(data.buffer)) !== media.sha256
    )
      throw new DocumentError("corruptBackup");
    blobs[media.id] = new Blob([data], { type: media.mime });
  }
  return { document, blobs };
}
