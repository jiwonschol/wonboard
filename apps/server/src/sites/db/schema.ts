// D1 schema for new Sites installs. SQL triggers live in the initial migration.
import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, unique, text } from "drizzle-orm/sqlite-core";

export const installation = sqliteTable("installation", {
  singleton: integer("singleton").primaryKey(),
  owner_id: text("owner_id").notNull(),
  accepted_at: text("accepted_at").notNull(),
  locale: text("locale").notNull(),
}, (table) => [
  unique().on(table.owner_id),
  check("installation_check_0", sql`singleton = 1`),
  check("installation_check_1", sql`locale IN ('ko', 'en')`),
]);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull(),
  title: text("title").notNull(),
  locale: text("locale").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  updated_at: text("updated_at").notNull(),
  server_trashed_at: text("server_trashed_at"),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  hash: text("hash").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
});

export const publications = sqliteTable("publications", {
  public_id: text("public_id").primaryKey(),
  document_id: text("document_id").notNull(),
  media_id: text("media_id").notNull(),
  blob_key: text("blob_key"),
  mime: text("mime"),
  filename: text("filename"),
  published: integer("published").notNull().default(0),
}, (table) => [
  unique().on(table.document_id, table.media_id),
  check("publications_check_0", sql`published IN (0, 1)`),
]);

export const file_objects = sqliteTable("file_objects", {
  id: text("id").primaryKey(),
  object_key: text("object_key").notNull(),
  state: text("state").notNull(),
  lease_until: integer("lease_until").notNull(),
  retry_at: integer("retry_at").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  size: integer("size").notNull(),
}, (table) => [
  unique().on(table.object_key),
  check("file_objects_check_0", sql`state IN ('uploading', 'ready', 'deleting', 'deleted')`),
]);

export const photo_variants = sqliteTable("photo_variants", {
  document_id: text("document_id").notNull(),
  media_id: text("media_id").notNull(),
  hash: text("hash").notNull(),
  object_id: text("object_id").notNull().references(() => file_objects.id),
}, (table) => [
  primaryKey({ columns: [table.document_id, table.media_id, table.hash] }),
]);

export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey(),
  document_id: text("document_id").notNull(),
  title: text("title").notNull(),
  token: text("token").notNull(),
  current_version: text("current_version").notNull(),
  revision: integer("revision").notNull(),
  expires_at: integer("expires_at"),
  revoked: integer("revoked").notNull().default(0),
  operation_id: text("operation_id").notNull(),
  create_operation_id: text("create_operation_id").notNull(),
  updated_at: integer("updated_at").notNull(),
}, (table) => [
  unique().on(table.document_id, table.create_operation_id),
  unique().on(table.token),
  check("snapshots_check_0", sql`revoked IN (0,1)`),
]);

export const snapshot_versions = sqliteTable("snapshot_versions", {
  id: text("id").primaryKey(),
  snapshot_id: text("snapshot_id").notNull(),
  source_revision: integer("source_revision").notNull(),
  html: text("html").notNull(),
  retired_at: integer("retired_at"),
});

export const snapshot_assets = sqliteTable("snapshot_assets", {
  version_id: text("version_id").notNull(),
  media_id: text("media_id").notNull(),
  object_id: text("object_id").notNull().references(() => file_objects.id),
  mime: text("mime").notNull(),
}, (table) => [
  primaryKey({ columns: [table.version_id, table.media_id] }),
]);

export const library_files = sqliteTable("library_files", {
  id: text("id").primaryKey(),
  object_id: text("object_id").notNull().references(() => file_objects.id),
  revision: integer("revision").notNull(),
  body: text("body").notNull(),
  filename: text("filename").notNull(),
  created_at: text("created_at").notNull(),
  trashed_at: text("trashed_at"),
  pinned: integer("pinned").notNull().default(1),
}, (table) => [
  check("library_files_check_0", sql`pinned IN (0,1)`),
]);

export const file_shares = sqliteTable("file_shares", {
  id: text("id").primaryKey(),
  file_id: text("file_id").notNull().references(() => library_files.id),
  token: text("token").notNull(),
  revision: integer("revision").notNull(),
  expires_at: integer("expires_at"),
  revoked: integer("revoked").notNull().default(0),
  operation_id: text("operation_id").notNull(),
  create_operation_id: text("create_operation_id").notNull(),
  created_at: text("created_at").notNull(),
}, (table) => [
  unique().on(table.file_id, table.create_operation_id),
  unique().on(table.token),
  check("file_shares_check_0", sql`revoked IN (0,1)`),
]);

export const document_file_refs = sqliteTable("document_file_refs", {
  document_id: text("document_id").notNull(),
  file_id: text("file_id").notNull().references(() => library_files.id),
}, (table) => [
  primaryKey({ columns: [table.document_id, table.file_id] }),
]);

export const storage_backfill = sqliteTable("storage_backfill", {
  singleton: integer("singleton").primaryKey(),
  phase: text("phase").notNull(),
  cursor: text("cursor").notNull(),
  revision: integer("revision").notNull(),
}, (table) => [
  check("storage_backfill_check_0", sql`singleton=1`),
  check("storage_backfill_check_1", sql`phase IN ('documents','publications','complete')`),
]);

export const storage_backfill_failures = sqliteTable("storage_backfill_failures", {
  document_id: text("document_id").primaryKey(),
  reason: text("reason").notNull(),
});
