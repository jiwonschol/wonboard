CREATE TABLE `document_file_refs` (
	`document_id` text NOT NULL,
	`file_id` text NOT NULL,
	PRIMARY KEY(`document_id`, `file_id`),
	FOREIGN KEY (`file_id`) REFERENCES `library_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`title` text NOT NULL,
	`locale` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL,
	`server_trashed_at` text
);
--> statement-breakpoint
CREATE TABLE `file_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`state` text NOT NULL,
	`lease_until` integer NOT NULL,
	`retry_at` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`size` integer NOT NULL,
	CONSTRAINT "file_objects_check_0" CHECK(state IN ('uploading', 'ready', 'deleting', 'deleted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_objects_object_key_unique` ON `file_objects` (`object_key`);--> statement-breakpoint
CREATE TABLE `file_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`token` text NOT NULL,
	`revision` integer NOT NULL,
	`expires_at` integer,
	`revoked` integer DEFAULT 0 NOT NULL,
	`operation_id` text NOT NULL,
	`create_operation_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `library_files`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "file_shares_check_0" CHECK(revoked IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_shares_file_id_create_operation_id_unique` ON `file_shares` (`file_id`,`create_operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `file_shares_token_unique` ON `file_shares` (`token`);--> statement-breakpoint
CREATE TABLE `installation` (
	`singleton` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`accepted_at` text NOT NULL,
	`locale` text NOT NULL,
	CONSTRAINT "installation_check_0" CHECK(singleton = 1),
	CONSTRAINT "installation_check_1" CHECK(locale IN ('ko', 'en'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `installation_owner_id_unique` ON `installation` (`owner_id`);--> statement-breakpoint
CREATE TABLE `library_files` (
	`id` text PRIMARY KEY NOT NULL,
	`object_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	`filename` text NOT NULL,
	`created_at` text NOT NULL,
	`trashed_at` text,
	`pinned` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`object_id`) REFERENCES `file_objects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "library_files_check_0" CHECK(pinned IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photo_variants` (
	`document_id` text NOT NULL,
	`media_id` text NOT NULL,
	`hash` text NOT NULL,
	`object_id` text NOT NULL,
	PRIMARY KEY(`document_id`, `media_id`, `hash`),
	FOREIGN KEY (`object_id`) REFERENCES `file_objects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`public_id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`media_id` text NOT NULL,
	`blob_key` text,
	`mime` text,
	`filename` text,
	`published` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "publications_check_0" CHECK(published IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publications_document_id_media_id_unique` ON `publications` (`document_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `snapshot_assets` (
	`version_id` text NOT NULL,
	`media_id` text NOT NULL,
	`object_id` text NOT NULL,
	`mime` text NOT NULL,
	PRIMARY KEY(`version_id`, `media_id`),
	FOREIGN KEY (`object_id`) REFERENCES `file_objects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `snapshot_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`source_revision` integer NOT NULL,
	`html` text NOT NULL,
	`retired_at` integer
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`title` text NOT NULL,
	`token` text NOT NULL,
	`current_version` text NOT NULL,
	`revision` integer NOT NULL,
	`expires_at` integer,
	`revoked` integer DEFAULT 0 NOT NULL,
	`operation_id` text NOT NULL,
	`create_operation_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "snapshots_check_0" CHECK(revoked IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_document_id_create_operation_id_unique` ON `snapshots` (`document_id`,`create_operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_token_unique` ON `snapshots` (`token`);--> statement-breakpoint
CREATE TABLE `storage_backfill` (
	`singleton` integer PRIMARY KEY NOT NULL,
	`phase` text NOT NULL,
	`cursor` text NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT "storage_backfill_check_0" CHECK(singleton=1),
	CONSTRAINT "storage_backfill_check_1" CHECK(phase IN ('documents','publications','complete'))
);
--> statement-breakpoint
CREATE TABLE `storage_backfill_failures` (
	`document_id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL
);

--> statement-breakpoint
-- Integrity triggers and the bounded backfill checkpoint are not represented by Drizzle tables.
CREATE TRIGGER snapshot_asset_ready BEFORE INSERT ON snapshot_assets BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM file_objects WHERE id=NEW.object_id AND state='ready')
    THEN RAISE(ABORT,'missingMedia') END;
END;
--> statement-breakpoint
CREATE TRIGGER publication_object_insert BEFORE INSERT ON publications WHEN NEW.blob_key IS NOT NULL BEGIN
  INSERT INTO file_objects(id,object_key,state,lease_until,size)
    VALUES ('legacy:' || NEW.blob_key,NEW.blob_key,'ready',0,0) ON CONFLICT DO NOTHING;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM file_objects WHERE object_key=NEW.blob_key AND state='ready')
    THEN RAISE(ABORT,'missingMedia') END;
END;
--> statement-breakpoint
CREATE TRIGGER publication_object_update BEFORE UPDATE OF blob_key ON publications WHEN NEW.blob_key IS NOT NULL BEGIN
  INSERT INTO file_objects(id,object_key,state,lease_until,size)
    SELECT 'legacy:' || OLD.blob_key,OLD.blob_key,'ready',0,0 WHERE OLD.blob_key IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO file_objects(id,object_key,state,lease_until,size)
    VALUES ('legacy:' || NEW.blob_key,NEW.blob_key,'ready',0,0) ON CONFLICT DO NOTHING;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM file_objects WHERE object_key=NEW.blob_key AND state='ready')
    THEN RAISE(ABORT,'missingMedia') END;
END;
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TRIGGER document_files_delete AFTER DELETE ON documents BEGIN
  DELETE FROM document_file_refs WHERE document_id=OLD.id;
END;
--> statement-breakpoint
INSERT INTO storage_backfill VALUES(1,'documents','',1);
