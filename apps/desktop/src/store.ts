import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
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
  return {
    list(): StoredDraft[] {
      return db.prepare("SELECT body FROM documents").all().map(row => ({ document: decode(row.body), blobs: {} }));
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
        if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== media.size ||
            createHash("sha256").update(new Uint8Array(bytes)).digest("hex") !== media.sha256)
          throw new Error("missingMedia");
        const destination = join(images, media.sha256);
        try { writeFileSync(destination, new Uint8Array(bytes), { flag: "wx", flush: true }); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          const existing = readFileSync(destination);
          if (createHash("sha256").update(existing).digest("hex") !== media.sha256) throw new Error("missingMedia");
        }
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
