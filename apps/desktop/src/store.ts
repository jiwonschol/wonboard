import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, statSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateDocument, type WriterDocument } from "@wonboard/document";
import type { StoredDraft } from "./bridge";

export function openDesktopStore(directory: string) {
  const images = join(directory, "images");
  mkdirSync(images, { recursive: true });
  const db = new DatabaseSync(join(directory, "documents.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL);`);
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
      for (const media of Object.values(document.media)) {
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
      for (const media of Object.values(document.media)) {
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
    close() { db.close(); },
  };
}
