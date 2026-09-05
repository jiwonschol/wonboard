import {
  DocumentError,
  imageMime,
  limits,
  sha256,
  type Media,
} from "@wonboard/document";

export async function importImages(
  files: File[],
  existing: number,
): Promise<{ media: Media; blob: Blob }[]> {
  if (files.length + existing > limits.images)
    throw new DocumentError("imageLimit");
  const result: { media: Media; blob: Blob }[] = [];
  for (const file of files) {
    if (file.size === 0 || file.size > limits.imageBytes)
      throw new DocumentError("imageLimit");
    const bytes = await file.arrayBuffer();
    const mime = imageMime(new Uint8Array(bytes));
    // Animated PNG is deliberately rejected rather than flattened without telling the author.
    if (mime === "image/png") {
      const view = new DataView(bytes);
      let offset = 8;
      while (offset + 12 <= view.byteLength) {
        const size = view.getUint32(offset);
        const type = String.fromCharCode(
          ...new Uint8Array(bytes, offset + 4, 4),
        );
        if (type === "acTL") throw new DocumentError("invalidImage");
        if (
          type === "IHDR" &&
          size === 13 &&
          view.getUint32(offset + 8) * view.getUint32(offset + 12) >
            limits.pixels
        )
          throw new DocumentError("imageLimit");
        offset += size + 12;
      }
    }
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
