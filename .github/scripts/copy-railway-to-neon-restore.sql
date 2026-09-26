-- Data-only load into the existing public schema.
-- Run with: psql --single-transaction --no-psqlrc -v ON_ERROR_STOP=1
--   -v overwrite=true|false -v dump_path=/absolute/path/to/dump.sql
--
-- session_replication_role=replica disables foreign-key triggers for the
-- load, but Neon rejects that setting (the owning role is not a superuser).
-- When it is rejected, foreign keys are made deferrable for this transaction
-- only, checked with SET CONSTRAINTS ALL IMMEDIATE, then restored to the
-- flags Prisma created. A failure rolls the data and the constraint changes
-- back together. _prisma_migrations is never truncated.

\if :overwrite
DO $truncate$
DECLARE
  tables text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
    INTO tables
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '_prisma_migrations';

  IF tables IS NULL THEN
    RAISE EXCEPTION 'No application tables found in schema public';
  END IF;

  EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY';
  RAISE NOTICE 'Truncated application tables. _prisma_migrations was not modified.';
END
$truncate$;
\else
DO $guard$
DECLARE
  r record;
  row_count bigint;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I.%I', r.schemaname, r.tablename)
      INTO row_count;
    IF row_count > 0 THEN
      RAISE EXCEPTION
        'Neon table %.% has % row(s). Re-run with overwrite=true to truncate application tables and reload. _prisma_migrations is never truncated.',
        r.schemaname, r.tablename, row_count;
    END IF;
  END LOOP;
END
$guard$;
\endif

CREATE TEMP TABLE advizlo_fk_flags (
  schema_name text NOT NULL,
  table_name text NOT NULL,
  constraint_name text NOT NULL,
  was_deferrable boolean NOT NULL,
  was_deferred boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO advizlo_fk_flags (
  schema_name,
  table_name,
  constraint_name,
  was_deferrable,
  was_deferred
)
SELECT n.nspname, c.relname, con.conname, con.condeferrable, con.condeferred
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
  AND c.relname <> '_prisma_migrations';

DO $fk_mode$
DECLARE
  r record;
  fk_count integer;
BEGIN
  BEGIN
    EXECUTE 'SET session_replication_role = replica';
    PERFORM set_config('advizlo.fk_mode', 'replica', true);
    RAISE NOTICE 'Foreign key checks disabled via session_replication_role=replica.';
    RETURN;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'session_replication_role=replica is not permitted. Deferring foreign keys for this transaction instead.';
  END;

  SELECT count(*) INTO fk_count FROM advizlo_fk_flags;
  FOR r IN
    SELECT schema_name, table_name, constraint_name
    FROM advizlo_fk_flags
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',
      r.schema_name,
      r.table_name,
      r.constraint_name
    );
  END LOOP;

  EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
  PERFORM set_config('advizlo.fk_mode', 'deferred', true);
  RAISE NOTICE 'Deferred % foreign key(s) for this transaction.', fk_count;
END
$fk_mode$;

\i :dump_path

SET client_min_messages = notice;
SELECT pg_catalog.set_config('search_path', 'public, pg_catalog', false);

DO $sequences$
DECLARE
  r record;
  max_id bigint;
  advanced integer := 0;
BEGIN
  FOR r IN
    SELECT
      ns.nspname AS seq_schema,
      seq.relname AS seq_name,
      nt.nspname AS table_schema,
      tbl.relname AS table_name,
      att.attname AS column_name
    FROM pg_catalog.pg_class seq
    JOIN pg_catalog.pg_namespace ns ON ns.oid = seq.relnamespace
    JOIN pg_catalog.pg_depend dep
      ON dep.objid = seq.oid
     AND dep.deptype IN ('a', 'i')
    JOIN pg_catalog.pg_class tbl ON tbl.oid = dep.refobjid
    JOIN pg_catalog.pg_namespace nt ON nt.oid = tbl.relnamespace
    JOIN pg_catalog.pg_attribute att
      ON att.attrelid = tbl.oid
     AND att.attnum = dep.refobjsubid
     AND NOT att.attisdropped
    WHERE seq.relkind = 'S'
      AND nt.nspname = 'public'
      AND tbl.relname <> '_prisma_migrations'
      AND att.atttypid IN (
        'smallint'::pg_catalog.regtype,
        'integer'::pg_catalog.regtype,
        'bigint'::pg_catalog.regtype
      )
  LOOP
    EXECUTE format(
      'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
      r.column_name,
      r.table_schema,
      r.table_name
    )
    INTO max_id;

    IF max_id > 0 THEN
      PERFORM pg_catalog.setval(
        format('%I.%I', r.seq_schema, r.seq_name)::regclass,
        max_id,
        true
      );
    ELSE
      PERFORM pg_catalog.setval(
        format('%I.%I', r.seq_schema, r.seq_name)::regclass,
        1,
        false
      );
    END IF;

    advanced := advanced + 1;
    RAISE NOTICE 'sequence %.% on %.% (%) set past max %',
      r.seq_schema,
      r.seq_name,
      r.table_schema,
      r.table_name,
      r.column_name,
      max_id;
  END LOOP;

  IF advanced = 0 THEN
    RAISE NOTICE 'No serial or identity sequences on application tables. UUID primary keys do not use sequences.';
  ELSE
    RAISE NOTICE 'Advanced % sequence(s) past imported max ids.', advanced;
  END IF;
END
$sequences$;

DO $check_mode$
BEGIN
  IF current_setting('advizlo.fk_mode', true) IS DISTINCT FROM 'replica'
     AND current_setting('advizlo.fk_mode', true) IS DISTINCT FROM 'deferred' THEN
    RAISE EXCEPTION 'Foreign key handling mode was not set. Refusing to commit.';
  END IF;
END
$check_mode$;

SELECT CASE
         WHEN current_setting('advizlo.fk_mode', true) = 'deferred' THEN 'true'
         ELSE 'false'
       END AS fk_deferred
\gset

\if :fk_deferred
SET CONSTRAINTS ALL IMMEDIATE;
DO $restore_fks$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schema_name, table_name, constraint_name, was_deferrable, was_deferred
    FROM advizlo_fk_flags
  LOOP
    IF r.was_deferrable AND r.was_deferred THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',
        r.schema_name,
        r.table_name,
        r.constraint_name
      );
    ELSIF r.was_deferrable THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',
        r.schema_name,
        r.table_name,
        r.constraint_name
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER CONSTRAINT %I NOT DEFERRABLE',
        r.schema_name,
        r.table_name,
        r.constraint_name
      );
    END IF;
  END LOOP;
  RAISE NOTICE 'Restored foreign keys to their original deferrable flags.';
END
$restore_fks$;
\else
SET session_replication_role = origin;
\endif

DO $verify_fks$
DECLARE
  r record;
  cur record;
BEGIN
  FOR r IN
    SELECT schema_name, table_name, constraint_name, was_deferrable, was_deferred
    FROM advizlo_fk_flags
  LOOP
    SELECT con.condeferrable, con.condeferred
      INTO cur
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.schema_name
      AND c.relname = r.table_name
      AND con.conname = r.constraint_name;

    IF cur.condeferrable IS DISTINCT FROM r.was_deferrable
       OR cur.condeferred IS DISTINCT FROM r.was_deferred THEN
      RAISE EXCEPTION
        'Foreign key %.% was not restored to its original deferrable state. Refusing to commit.',
        r.table_name,
        r.constraint_name;
    END IF;
  END LOOP;
END
$verify_fks$;
