-- Apply once through the hosted migration toolchain before deploying this worker.
-- Leave legacy JSON markers untrusted; reads fall back to server updated_at.
ALTER TABLE documents ADD COLUMN server_trashed_at TEXT;
