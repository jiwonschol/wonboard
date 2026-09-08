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
