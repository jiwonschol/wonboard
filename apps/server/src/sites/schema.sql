-- Initial schema for local validation. Generate Sites migrations from this
-- schema with the supported Sites toolchain before a hosted deployment.
CREATE TABLE installation (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  owner_id TEXT NOT NULL UNIQUE,
  accepted_at TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ko', 'en'))
);
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  locale TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL
);
CREATE TABLE publications (
  public_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  blob_key TEXT,
  mime TEXT,
  filename TEXT,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  UNIQUE (document_id, media_id)
);
-- Publications deliberately have no cascading document/media deletion.

-- Stage 2 objects are tracked before R2 writes. Existing media/publications are
-- deliberately excluded from this collector until their own inventory is proven.
CREATE TABLE file_objects (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('uploading', 'ready', 'deleting', 'deleted')),
  lease_until INTEGER NOT NULL,
  retry_at INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  size INTEGER NOT NULL
);
CREATE TABLE library_files (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES file_objects(id),
  revision INTEGER NOT NULL,
  body TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL,
  trashed_at TEXT,
  pinned INTEGER NOT NULL DEFAULT 1 CHECK (pinned IN (0,1))
);
CREATE TABLE file_shares (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES library_files(id),
  token TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL,
  expires_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0,1)),
  operation_id TEXT NOT NULL,
  create_operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL
  ,UNIQUE(file_id, create_operation_id)
);
CREATE TABLE document_file_refs (
  document_id TEXT NOT NULL,
  file_id TEXT NOT NULL REFERENCES library_files(id),
  PRIMARY KEY (document_id, file_id)
);
-- Reference publication and revision changes share the document transaction.
-- RAISE aborts the write if cleanup already claimed the immutable bytes.
CREATE TRIGGER document_files_insert AFTER INSERT ON documents BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.body, '$.files') AS entry
    WHERE NOT EXISTS (
      SELECT 1 FROM library_files f JOIN file_objects o ON o.id=f.object_id
      WHERE f.id=entry.key AND o.state='ready'
      AND json_extract(f.body,'$.sha256')=json_extract(entry.value,'$.sha256')
      AND json_extract(f.body,'$.size')=json_extract(entry.value,'$.size')
    )
  ) THEN RAISE(ABORT, 'missingFile') END;
  INSERT INTO document_file_refs SELECT NEW.id, entry.key FROM json_each(NEW.body,'$.files') entry;
END;
CREATE TRIGGER document_files_update AFTER UPDATE OF body ON documents BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.body, '$.files') AS entry
    WHERE NOT EXISTS (
      SELECT 1 FROM library_files f JOIN file_objects o ON o.id=f.object_id
      WHERE f.id=entry.key AND o.state='ready'
      AND json_extract(f.body,'$.sha256')=json_extract(entry.value,'$.sha256')
      AND json_extract(f.body,'$.size')=json_extract(entry.value,'$.size')
    )
  ) THEN RAISE(ABORT, 'missingFile') END;
  DELETE FROM document_file_refs WHERE document_id=NEW.id;
  INSERT INTO document_file_refs SELECT NEW.id, entry.key FROM json_each(NEW.body,'$.files') entry;
END;
CREATE TRIGGER document_files_delete AFTER DELETE ON documents BEGIN
  DELETE FROM document_file_refs WHERE document_id=OLD.id;
END;
