import { DocumentError, limits, type Draft } from "./index";
import { exportBackup } from "./backup";
import { storedEntries, storedZip } from "./storedZip";

export type BackupEntry = { documentId: string; title: string; filename: string };
export type BackupManifest = {
  version: 1;
  createdAt: string;
  documents: BackupEntry[];
  skipped: { documentId: string; title: string; reason: string }[];
};

export async function exportBackupCollection(repository: {
  list(): Promise<Draft[]>;
  load(draft: Draft): Promise<Draft>;
}) {
  const archive = storedZip();
  const manifest: BackupManifest = { version: 1, createdAt: new Date().toISOString(), documents: [], skipped: [] };
  for (const item of await repository.list()) {
    if (item.document.trashedAt !== undefined) continue;
    const { documentId, title } = item.document;
    try {
      const loaded = await repository.load(item);
      // A remote trash operation may have happened after list().
      if (loaded.document.trashedAt !== undefined) continue;
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(documentId) || loaded.document.documentId !== documentId)
        throw new DocumentError("invalidDocument");
      const filename = `${documentId}.zip`;
      await archive.add(filename, await exportBackup(loaded));
      manifest.documents.push({ documentId, title: loaded.document.title, filename });
    } catch (error) {
      manifest.skipped.push({ documentId, title, reason: error instanceof Error ? error.message : "storageFailed" });
    }
  }
  await archive.add("manifest.json", new Blob([JSON.stringify(manifest)]));
  return { blob: archive.finish(), manifest };
}

/** null means this is a legacy single-document backup. */
export async function openBackupCollection(blob: Blob) {
  const entries = await storedEntries(blob).catch(error => {
    // Legacy backups (including ZIP data descriptors) belong to importBackup.
    if (blob.size <= limits.archiveBytes) return null;
    throw error;
  });
  if (!entries) return null;
  const manifestEntry = entries.get("manifest.json");
  if (!manifestEntry) return null;
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(await (await manifestEntry.read()).text());
    if (manifest.version !== 1 || typeof manifest.createdAt !== "string" || !Number.isFinite(Date.parse(manifest.createdAt)) ||
        !Array.isArray(manifest.documents) || !Array.isArray(manifest.skipped)) throw new Error();
    const names = new Set<string>();
    for (const item of manifest.documents) {
      if (!item || typeof item.documentId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.documentId) ||
          typeof item.title !== "string" || item.filename !== `${item.documentId}.zip` || names.has(item.filename)) throw new Error();
      names.add(item.filename);
    }
    for (const item of manifest.skipped)
      if (!item || typeof item.documentId !== "string" || typeof item.title !== "string" || typeof item.reason !== "string") throw new Error();
    if ([...entries.keys()].some(name => name !== "manifest.json" && !names.has(name))) throw new Error();
  } catch { throw new DocumentError("corruptBackup"); }
  return {
    manifest,
    async *backups() {
      for (const item of manifest.documents) {
        // Read errors belong to this document, so the caller can keep restoring.
        yield { ...item, read: async () => {
          const entry = entries.get(item.filename);
          if (!entry) throw new DocumentError("corruptBackup");
          return entry.read();
        } };
      }
    },
  };
}
