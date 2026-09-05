import { zip, unzip, strToU8, strFromU8 } from "fflate";
import {
  DocumentError,
  limits,
  sha256,
  validateDocument,
  imageMime,
  type Draft,
  type WriterDocument,
} from "./index";

export async function exportBackup(draft: Draft): Promise<Blob> {
  validateDocument(draft.document);
  const files: Record<string, Uint8Array> = {
    "document.json": strToU8(JSON.stringify(draft.document)),
  };
  let total = files["document.json"].byteLength;
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
              file.originalSize > limits.imageBytes ||
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
      imageMime(data) !== media.mime ||
      (await sha256(data.buffer)) !== media.sha256
    )
      throw new DocumentError("corruptBackup");
    blobs[media.id] = new Blob([data], { type: media.mime });
  }
  return { document, blobs };
}
