import { imageMime, limits, sha256 } from "@wonboard/document";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff" },
  });
}
export async function readBytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "uploadTooLarge");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "invalidDocument");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new HttpError(413, "uploadTooLarge"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes.buffer;
}
export async function readJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new HttpError(415, "invalidDocument");
  // Reuse the document/envelope budget reserved by the backup contract;
  // 1 MiB rejected ordinary Korean text well below limits.text.
  try { return JSON.parse(new TextDecoder().decode(await readBytes(request, limits.archiveBytes - limits.mediaBytes))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "invalidDocument"); }
}
export function validId(value: string) {
  return /^(?!(?:__proto__|constructor|prototype)$)[a-zA-Z0-9_-]{1,80}$/.test(value);
}
/** Parse dimensions without a native image decoder in the Worker. */
export async function readImage(request: Request) {
  const bytes = await readBytes(request, limits.imageBytes);
  const data = new Uint8Array(bytes);
  const mime = imageMime(data);
  if (request.headers.get("content-type")?.split(";")[0] !== mime)
    throw new HttpError(415, "invalidImage");
  const view = new DataView(bytes);
  let width = 0, height = 0;
  if (mime === "image/png") {
    let offset = 8;
    if (data.length < 45 || view.getUint32(8) !== 13 ||
        String.fromCharCode(...data.slice(12, 16)) !== "IHDR")
      throw new HttpError(400, "invalidImage");
    width = view.getUint32(16); height = view.getUint32(20);
    let ended = false;
    while (offset + 12 <= data.length) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));
      if (offset + 12 + length > data.length || type === "acTL")
        throw new HttpError(400, "invalidImage");
      offset += 12 + length;
      if (type === "IEND") { ended = length === 0 && offset === data.length; break; }
    }
    if (!ended) throw new HttpError(400, "invalidImage");
  } else {
    let offset = 2, orientation = 1, scan = false, ended = false;
    while (offset < data.length) {
      if (scan && data[offset] !== 0xff) { offset++; continue; }
      if (data[offset] !== 0xff) throw new HttpError(400, "invalidImage");
      while (data[offset] === 0xff) offset++;
      if (offset >= data.length) break;
      const marker = data[offset++];
      if (scan && (marker === 0 || marker >= 0xd0 && marker <= 0xd7)) continue;
      if (marker === 0xd9) { ended = true; break; }
      if (marker === 0x01) continue;
      if (offset + 2 > data.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5);
      }
      if (marker === 0xe1 && length >= 16 && String.fromCharCode(...data.slice(offset + 2, offset + 8)) === "Exif\0\0") {
        const tiff = offset + 8, end = offset + length;
        const order = view.getUint16(tiff), little = order === 0x4949;
        if (![0x4949, 0x4d4d].includes(order) || view.getUint16(tiff + 2, little) !== 42) throw new HttpError(400, "invalidImage");
        const directory = tiff + view.getUint32(tiff + 4, little);
        if (directory < tiff + 8 || directory + 2 > end) throw new HttpError(400, "invalidImage");
        const count = view.getUint16(directory, little);
        if (directory + 2 + count * 12 > end) throw new HttpError(400, "invalidImage");
        for (let i = 0; i < count; i++) {
          const entry = directory + 2 + i * 12;
          if (view.getUint16(entry, little) === 0x112 && view.getUint16(entry + 2, little) === 3 && view.getUint32(entry + 4, little) === 1) {
            orientation = view.getUint16(entry + 8, little);
            if (orientation < 1 || orientation > 8) throw new HttpError(400, "invalidImage");
          }
        }
      }
      offset += length;
      scan = marker === 0xda || scan;
    }
    if (!ended) throw new HttpError(400, "invalidImage");
    if (orientation >= 5) [width, height] = [height, width];
  }
  if (!width || !height || width * height > limits.pixels)
    throw new HttpError(400, "imageLimit");
  return { bytes, mime, width, height, size: bytes.byteLength, hash: await sha256(bytes) };
}
