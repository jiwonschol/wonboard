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
  try { return JSON.parse(new TextDecoder().decode(await readBytes(request, 1024 * 1024))); }
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
    let offset = 2;
    while (offset + 4 < data.length && data[offset] === 0xff) {
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += length;
    }
    if (data.at(-2) !== 0xff || data.at(-1) !== 0xd9)
      throw new HttpError(400, "invalidImage");
  }
  if (!width || !height || width * height > limits.pixels)
    throw new HttpError(400, "imageLimit");
  return { bytes, mime, width, height, size: bytes.byteLength, hash: await sha256(bytes) };
}
