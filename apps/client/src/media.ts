import {
  DocumentError,
  inspectImageBytes,
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
