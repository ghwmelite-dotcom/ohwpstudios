-- Reconcile the admin file manager with the original client-portal schema.
-- Keep original names, timestamps and all existing file records intact.
ALTER TABLE project_files ADD COLUMN filename TEXT;
ALTER TABLE project_files ADD COLUMN original_filename TEXT;
ALTER TABLE project_files ADD COLUMN is_visible_to_client INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_files ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_files ADD COLUMN parent_file_id INTEGER REFERENCES project_files(id) ON DELETE SET NULL;
ALTER TABLE project_files ADD COLUMN updated_at TEXT;
UPDATE project_files SET filename = file_name, original_filename = file_name, updated_at = uploaded_at;
