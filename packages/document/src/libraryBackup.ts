import { limits, sha256, type LibraryFile } from "./index";
import { storedEntries, storedZip } from "./storedZip";

export type LibraryBackupFile = { id: string; filename: string; mime: string; size: number; sha256: string; entry: string };
export type LibraryBackupFailure = { id: string; filename: string; reason: string };
export type LibraryBackupManifest = {
  version: 1;
  kind: "library";
  createdAt: string;
  files: LibraryBackupFile[];
  skipped: LibraryBackupFailure[];
};

const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;
const reason = (error: unknown) => error instanceof Error ? error.message : "storageFailed";

/** Every library file outside the trash, read and checked one at a time. */
export async function exportLibraryBackup(library: {
  list(): Promise<LibraryFile[]>;
  load(id: string): Promise<{ file: LibraryFile; blob: Blob }>;
}) {
  const archive = storedZip();
  const manifest: LibraryBackupManifest = { version: 1, kind: "library", createdAt: new Date().toISOString(), files: [], skipped: [] };
  for (const item of await library.list()) {
    if (item.trashedAt !== undefined) continue;
    try {
      if (!idPattern.test(item.id)) throw new Error("invalidDocument");
      const { file, blob } = await library.load(item.id);
      // The file may have been trashed after list().
      if (file.trashedAt !== undefined) continue;
      if (blob.size > limits.fileBytes) throw new Error("fileLimit");
      if (blob.size !== file.size || await sha256(await blob.arrayBuffer()) !== file.sha256) throw new Error("missingMedia");
      const entry = `files/${file.id}`;
      await archive.add(entry, blob);
      manifest.files.push({ id: file.id, filename: file.filename, mime: file.mime, size: file.size, sha256: file.sha256, entry });
    } catch (error) {
      manifest.skipped.push({ id: item.id, filename: item.filename, reason: reason(error) });
    }
  }
  await archive.add("manifest.json", new Blob([JSON.stringify(manifest)]));
  return { blob: archive.finish(), manifest };
}

async function openLibraryBackup(blob: Blob) {
  try {
    const entries = await storedEntries(blob);
    const manifest: LibraryBackupManifest = JSON.parse(await (await entries.get("manifest.json")!.read()).text());
    if (manifest.version !== 1 || manifest.kind !== "library" || !Number.isFinite(Date.parse(manifest.createdAt)) ||
        !Array.isArray(manifest.files) || !Array.isArray(manifest.skipped)) throw new Error();
    const names = new Set<string>();
    for (const item of manifest.files) {
      if (!item || typeof item.id !== "string" || !idPattern.test(item.id) || item.entry !== `files/${item.id}` || names.has(item.entry) ||
          typeof item.filename !== "string" || typeof item.mime !== "string" || !Number.isSafeInteger(item.size) || item.size < 0 ||
          typeof item.sha256 !== "string") throw new Error();
      names.add(item.entry);
    }
    for (const item of manifest.skipped)
      if (!item || typeof item.id !== "string" || typeof item.filename !== "string" || typeof item.reason !== "string") throw new Error();
    if ([...entries.keys()].some(name => name !== "manifest.json" && !names.has(name))) throw new Error();
    return { manifest, entries };
  } catch { throw new Error("libraryBackupInvalid"); }
}

/**
 * Adds each backed-up file as a new private library file. Existing files are
 * never replaced and no share is recreated: upload() issues a fresh identity.
 * One unreadable file does not stop the rest.
 */
export async function restoreLibraryBackup(blob: Blob, library: { upload(file: File): Promise<LibraryFile> }) {
  const { manifest, entries } = await openLibraryBackup(blob);
  const restored: LibraryFile[] = [], failed: LibraryBackupFailure[] = [];
  for (const item of manifest.files) {
    try {
      if (item.size > limits.fileBytes) throw new Error("fileLimit");
      const entry = entries.get(item.entry);
      if (!entry) throw new Error("corruptBackup");
      const bytes = await entry.read();
      if (bytes.size !== item.size || await sha256(await bytes.arrayBuffer()) !== item.sha256) throw new Error("corruptBackup");
      restored.push(await library.upload(new File([bytes], item.filename, { type: item.mime })));
    } catch (error) {
      failed.push({ id: item.id, filename: item.filename, reason: reason(error) });
    }
  }
  return { restored, failed, skipped: manifest.skipped };
}
