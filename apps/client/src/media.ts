import {
  attachmentNodes,
  DocumentError,
  inspectImageBytes,
  limits,
  sha256,
  type ContentNode,
  type Media,
} from "@wonboard/document";

export type ImportedImage = { media: Media; blob: Blob };
type ImageInsertionEditor = {
  chain(): {
    insertContentAt(position: number, content: ContentNode[]): {
      run(): boolean;
    };
  };
  getJSON(): ContentNode;
};

export function insertImagesWhenAccepted(
  editor: ImageInsertionEditor,
  position: number,
  imported: ImportedImage[],
  commit: () => void,
): boolean {
  editor
    .chain()
    .insertContentAt(
      position,
      imported.flatMap((item) => [
        {
          type: "media",
          attrs: {
            mediaId: item.media.id,
            width: Math.max(40, Math.min(600, item.media.width)),
            align: "left",
            alt: "",
            caption: "",
          },
        },
        { type: "paragraph" },
      ]),
    )
    .run();
  const inserted = new Set(
    attachmentNodes(editor.getJSON())
      .filter((node) => node.type === "media")
      .map((node) => node.attrs?.mediaId),
  );
  if (!imported.every((item) => inserted.has(item.media.id))) return false;
  commit();
  return true;
}

export async function importImages(
  files: File[],
  existing: { count: number; bytes: number },
): Promise<ImportedImage[]> {
  if (files.length + existing.count > limits.images)
    throw new DocumentError("imageLimit");
  const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (incomingBytes + existing.bytes > limits.mediaBytes)
    throw new DocumentError("archiveLimit");
  const result: ImportedImage[] = [];
  for (const file of files) {
    if (file.size === 0 || file.size > limits.imageBytes)
      throw new DocumentError("imageLimit");
    const bytes = await file.arrayBuffer();
    const mime = inspectImageBytes(new Uint8Array(bytes));
    const blob = new Blob([bytes], { type: mime });
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      throw new DocumentError("invalidImage");
    }
    const { width, height } = bitmap;
    bitmap.close();
    if (width * height > limits.pixels) throw new DocumentError("imageLimit");
    result.push({
      blob,
      media: {
        id: crypto.randomUUID(),
        originalName: file.name,
        mime,
        width,
        height,
        size: blob.size,
        sha256: await sha256(bytes),
      },
    });
  }
  return result;
}

export async function verifyDecodedImage(
  blob: Blob,
  expected: Pick<Media, "width" | "height">,
  decode: (blob: Blob) => Promise<Pick<ImageBitmap, "width" | "height" | "close">> =
    createImageBitmap,
): Promise<void> {
  let bitmap: Pick<ImageBitmap, "width" | "height" | "close">;
  try {
    bitmap = await decode(blob);
  } catch {
    throw new DocumentError("corruptBackup");
  }
  const valid = bitmap.width === expected.width && bitmap.height === expected.height;
  bitmap.close();
  if (!valid) throw new DocumentError("corruptBackup");
}
