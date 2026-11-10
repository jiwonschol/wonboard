import { ZipPassThrough, strToU8, strFromU8 } from "fflate";
import { DocumentError, limits } from "./index";

// The outer archive stores already-compressed backups as Blob parts. ZIP64
// offsets keep a collection larger than 4 GiB extractable without a giant buffer.
// Layout: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT §4.3, §4.5.3.
const max32 = 0xffffffff;
const header = (size: number) => new DataView(new ArrayBuffer(size));
const fail = (): never => { throw new DocumentError("corruptBackup"); };
function checksum(bytes: Uint8Array) {
  const entry = new ZipPassThrough("");
  entry.ondata = () => {};
  entry.push(bytes, true);
  return entry.crc >>> 0;
}

export function storedZip() {
  const parts: BlobPart[] = [], directory: BlobPart[] = [];
  let offset = 0, count = 0;
  return {
    async add(name: string, blob: Blob) {
      const filename = strToU8(name), crc = checksum(new Uint8Array(await blob.arrayBuffer()));
      const local = header(30);
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x800, true);
      local.setUint16(12, 33, true); // 1980-01-01
      local.setUint32(14, crc, true);
      local.setUint32(18, blob.size, true);
      local.setUint32(22, blob.size, true);
      local.setUint16(26, filename.length, true);
      const central = header(46), extra = header(offset >= max32 ? 12 : 0);
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 45, true);
      central.setUint16(6, offset >= max32 ? 45 : 20, true);
      central.setUint16(8, 0x800, true);
      central.setUint16(14, 33, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, blob.size, true);
      central.setUint32(24, blob.size, true);
      central.setUint16(28, filename.length, true);
      central.setUint16(30, extra.byteLength, true);
      central.setUint32(42, Math.min(offset, max32), true);
      if (extra.byteLength) {
        extra.setUint16(0, 1, true); extra.setUint16(2, 8, true);
        extra.setBigUint64(4, BigInt(offset), true);
      }
      parts.push(local.buffer, filename, blob);
      directory.push(central.buffer, filename, extra.buffer);
      offset += 30 + filename.length + blob.size;
      count++;
    },
    finish() {
      const central = new Blob(directory), end = header(22);
      if (offset >= max32 || central.size >= max32 || count >= 0xffff) {
        const zip64 = header(56), locator = header(20);
        zip64.setUint32(0, 0x06064b50, true);
        zip64.setBigUint64(4, 44n, true);
        zip64.setUint16(12, 45, true); zip64.setUint16(14, 45, true);
        zip64.setBigUint64(24, BigInt(count), true); zip64.setBigUint64(32, BigInt(count), true);
        zip64.setBigUint64(40, BigInt(central.size), true); zip64.setBigUint64(48, BigInt(offset), true);
        locator.setUint32(0, 0x07064b50, true);
        locator.setBigUint64(8, BigInt(offset + central.size), true);
        locator.setUint32(16, 1, true);
        parts.push(central, zip64.buffer, locator.buffer);
      } else parts.push(central);
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, Math.min(count, 0xffff), true); end.setUint16(10, Math.min(count, 0xffff), true);
      end.setUint32(12, Math.min(central.size, max32), true); end.setUint32(16, Math.min(offset, max32), true);
      return new Blob([...parts, end.buffer], { type: "application/zip" });
    },
  };
}

// Scan headers with Blob.slice, never materializing the whole collection.
// Only our STORE container is decoded here; single-document ZIP decoding stays
// exclusively in importBackup, including its existing validation rules.
export async function storedEntries(blob: Blob) {
  const entries = new Map<string, { read(): Promise<Blob> }>();
  let offset = 0;
  while (offset + 30 <= blob.size) {
    const local = new DataView(await blob.slice(offset, offset + 30).arrayBuffer());
    if (local.getUint32(0, true) === 0x02014b50) break;
    if (local.getUint32(0, true) !== 0x04034b50) fail();
    const flags = local.getUint16(6, true), method = local.getUint16(8, true);
    const size = local.getUint32(18, true), originalSize = local.getUint32(22, true);
    const nameSize = local.getUint16(26, true), extraSize = local.getUint16(28, true);
    // Our container uses known sizes, no data descriptors or encryption.
    if (flags & 9) fail();
    const start = offset + 30 + nameSize + extraSize, end = start + size;
    if (end > blob.size) fail();
    const name = strFromU8(new Uint8Array(await blob.slice(offset + 30, offset + 30 + nameSize).arrayBuffer()));
    if (entries.has(name)) fail();
    const crc = local.getUint32(14, true);
    entries.set(name, { async read() {
      if (method !== 0 || size !== originalSize || size > limits.archiveBytes) throw new DocumentError("archiveLimit");
      const value = blob.slice(start, end, "application/zip");
      if (checksum(new Uint8Array(await value.arrayBuffer())) !== crc) fail();
      return value;
    } });
    offset = end;
  }
  if (!entries.size) fail();
  const end = new DataView(await blob.slice(-22).arrayBuffer());
  if (end.byteLength !== 22 || end.getUint32(0, true) !== 0x06054b50 || end.getUint16(20, true) !== 0 ||
      (end.getUint32(16, true) !== max32 && end.getUint32(16, true) !== offset) ||
      (end.getUint16(10, true) !== 0xffff && end.getUint16(10, true) !== entries.size)) fail();
  return entries;
}
