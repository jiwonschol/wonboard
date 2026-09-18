import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, statSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateDocument, validateDocumentEnvelope, newDraft, type WriterDocument, type LibraryFile, type FileChange } from "@wonboard/document";
import type { StoredDraft } from "./bridge";

export function openDesktopStore(directory: string) {
  const images = join(directory, "images");
  mkdirSync(images, { recursive: true });
  const db = new DatabaseSync(join(directory, "documents.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS library_files (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL, bytes BLOB NOT NULL);`);
  const checkedFile = (file: LibraryFile) => {
    if (!file || typeof file.id !== "string") throw new Error("invalidDocument");
    validateDocumentEnvelope({ ...newDraft().document, files: { [file.id]: file } });
    if (typeof file.filename !== "string" || !file.filename.trim() || file.filename.length > 1024 || /[\u0000-\u001f\u007f]/.test(file.filename) ||
      !Number.isSafeInteger(file.revision) || file.revision < 1 || !Number.isFinite(Date.parse(file.createdAt)) ||
      (file.trashedAt !== undefined && !Number.isFinite(Date.parse(file.trashedAt)))) throw new Error("invalidDocument");
    return file;
  };
  const readLibraryFile = (id: unknown) => {
    if (typeof id !== "string") throw new Error("invalidDocument");
    const row = db.prepare("SELECT body,bytes FROM library_files WHERE id=?").get(id);
    if (!row) throw new Error("missingFile");
    const file = checkedFile(JSON.parse(String(row.body)));
    if (!(row.bytes instanceof Uint8Array)) throw new Error("missingMedia");
    return { file, bytes: row.bytes };
  };
  const expiredFile = (file: LibraryFile) => file.trashedAt !== undefined && Date.parse(file.trashedAt) + 30 * 86400000 <= Date.now();
  const decode = (body: unknown): WriterDocument => {
    const document: unknown = JSON.parse(String(body));
    validateDocument(document);
    return document;
  };
  const verified = new Map<string, string>();
  const stamp = (file: string) => {
    const s = statSync(file);
    return `${s.size}:${s.mtimeMs}:${s.ctimeMs}:${s.ino}`;
  };
  const verifyImage = (hash: string, size: number) => {
    const file = join(images, hash), current = stamp(file);
    if (verified.get(hash) === `${size}:${current}`) return;
    const bytes = readFileSync(file);
    if (bytes.length !== size || createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error("missingMedia");
    verified.set(hash, `${size}:${current}`);
  };
  return {
    filesList(): LibraryFile[] {
      return db.prepare("SELECT body FROM library_files").all().flatMap(row => {
        try { return [checkedFile(JSON.parse(String(row.body)))]; } catch { return []; }
      });
    },
    filesLoad(id: unknown) {
      const row = readLibraryFile(id);
      if (expiredFile(row.file)) throw new Error("missingFile");
      if (row.bytes.byteLength !== row.file.size || createHash("sha256").update(row.bytes).digest("hex") !== row.file.sha256) throw new Error("missingMedia");
      return { file: row.file, bytes: Uint8Array.from(row.bytes).buffer };
    },
    filesUpload(input: LibraryFile, bytes: ArrayBuffer): LibraryFile {
      checkedFile(input);
      if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== input.size || createHash("sha256").update(new Uint8Array(bytes)).digest("hex") !== input.sha256)
        throw new Error("missingMedia");
      const file = { ...input, revision: 1, createdAt: new Date().toISOString() };
      delete file.trashedAt;
      // The independent library pin and bytes commit together. Documents retain
      // portable immutable copies in their existing content-addressed store.
      db.prepare("INSERT INTO library_files(id,revision,body,bytes) VALUES (?,1,?,?)")
        .run(file.id, JSON.stringify(file), new Uint8Array(bytes));
      return file;
    },
    filesChange(id: unknown, revision: unknown, change: FileChange): LibraryFile {
      if (!Number.isSafeInteger(revision) || !change || typeof change !== "object") throw new Error("invalidDocument");
      db.exec("BEGIN IMMEDIATE");
      try {
        const { file } = readLibraryFile(id);
        if (file.revision !== revision) throw new Error("storageConflict");
        if (expiredFile(file)) throw new Error("missingFile");
        if (change.filename !== undefined) file.filename = change.filename;
        if (change.trashedAt === null) delete file.trashedAt;
        else if (change.trashedAt !== undefined && !file.trashedAt) file.trashedAt = new Date().toISOString();
        file.revision++;
        checkedFile(file);
        db.prepare("UPDATE library_files SET revision=?,body=? WHERE id=?").run(file.revision, JSON.stringify(file), file.id);
        db.exec("COMMIT"); return file;
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    filesRemove(id: unknown, revision: unknown): void {
      if (!Number.isSafeInteger(revision)) throw new Error("invalidDocument");
      db.exec("BEGIN IMMEDIATE");
      try {
        const { file } = readLibraryFile(id);
        if (file.revision !== revision) throw new Error("storageConflict");
        if (!file.trashedAt) throw new Error("fileNotTrashed");
        db.prepare("DELETE FROM library_files WHERE id=?").run(file.id);
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    list(): StoredDraft[] {
      return db.prepare("SELECT body FROM documents").all().flatMap(row => {
        try { return [{ document: decode(row.body), blobs: {} }]; }
        catch { return []; } // Preserve unreadable rows on disk; isolate them from the library.
      });
    },
    load(id: unknown): StoredDraft {
      if (typeof id !== "string") throw new Error("invalidDocument");
      const row = db.prepare("SELECT body FROM documents WHERE id = ?").get(id);
      if (!row) throw new Error("missingDocument");
      const document = decode(row.body);
      const blobs: StoredDraft["blobs"] = {};
      for (const media of [...Object.values(document.media), ...Object.values(document.files ?? {})]) {
        const bytes = readFileSync(join(images, media.sha256));
        if (bytes.byteLength !== media.size || createHash("sha256").update(bytes).digest("hex") !== media.sha256)
          throw new Error("missingMedia");
        blobs[media.id] = Uint8Array.from(bytes).buffer;
        verified.set(media.sha256, `${media.size}:${stamp(join(images, media.sha256))}`);
      }
      return { document, blobs };
    },
    save(input: StoredDraft, revision: number): StoredDraft {
      validateDocument(input?.document);
      if (!Number.isSafeInteger(revision) || revision < 0 || revision !== input.document.revision)
        throw new Error("invalidDocument");
      const document = { ...input.document, revision: revision + 1 };
      // Immutable content-addressed photos are written before committing metadata.
      // A failed save may leave an orphan, but never a document pointing at a partial photo.
      for (const media of [...Object.values(document.media), ...Object.values(document.files ?? {})]) {
        const bytes = input.blobs?.[media.id];
        if (bytes === undefined) {
          try { verifyImage(media.sha256, media.size); } catch { throw new Error("missingMedia"); }
          continue;
        }
        if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== media.size ||
            createHash("sha256").update(new Uint8Array(bytes)).digest("hex") !== media.sha256)
          throw new Error("missingMedia");
        const destination = join(images, media.sha256);
        try { verifyImage(media.sha256, media.size); continue; } catch { /* Install verified incoming bytes. */ }
        const temporary = join(images, `${media.sha256}.${randomUUID()}.tmp`);
        try {
          writeFileSync(temporary, new Uint8Array(bytes), { flag: "wx", flush: true });
          renameSync(temporary, destination);
          verified.set(media.sha256, `${media.size}:${stamp(destination)}`);
        } finally { rmSync(temporary, { force: true }); }
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        const previous = db.prepare("SELECT revision FROM documents WHERE id = ?").get(document.documentId);
        if ((previous?.revision ?? 0) !== revision) throw new Error("storageConflict");
        db.prepare("INSERT INTO documents VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, body=excluded.body")
          .run(document.documentId, document.revision, JSON.stringify(document));
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
      return { document, blobs: {} };
    },
    remove(id: unknown, revision: unknown): void {
      if (typeof id !== "string" || !Number.isSafeInteger(revision) || Number(revision) < 0)
        throw new Error("invalidDocument");
      db.exec("BEGIN IMMEDIATE");
      try {
        const previous = db.prepare("SELECT revision FROM documents WHERE id = ?").get(id);
        if (previous && previous.revision !== revision) throw new Error("storageConflict");
        db.prepare("DELETE FROM documents WHERE id = ?").run(id);
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    close() { db.close(); },
  };
}
