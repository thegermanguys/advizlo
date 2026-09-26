#!/usr/bin/env bash
# Copy Advizlo Postgres data from Railway into the existing Neon schema.
# Connection strings come from the environment (GitHub Actions secrets).
# This script never prints those values. It does not drop or recreate schema.
set +x
set -euo pipefail
umask 077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RESTORE_SQL="${SCRIPT_DIR}/copy-railway-to-neon-restore.sql"
OVERWRITE="${OVERWRITE:-false}"

require_secret() {
  local name="$1"
  if [[ ! -v $name ]] || [[ -z "${!name//[[:space:]]/}" ]]; then
    echo "::error::Repository secret ${name} is not set. Refusing to dump."
    exit 1
  fi
}

require_secret RAILWAY_DATABASE_URL
require_secret DATABASE_URL_UNPOOLED

case "$OVERWRITE" in
  true|false) ;;
  *)
    echo "::error::Workflow input overwrite must be true or false."
    exit 1
    ;;
esac

if [[ "$RAILWAY_DATABASE_URL" == "$DATABASE_URL_UNPOOLED" ]]; then
  echo "::error::RAILWAY_DATABASE_URL and DATABASE_URL_UNPOOLED are identical. Refusing to copy a database onto itself."
  exit 1
fi

if [[ ! -f "$RESTORE_SQL" ]]; then
  echo "::error::Missing restore script at ${RESTORE_SQL}."
  exit 1
fi

if [[ -z "${DUMP_PATH:-}" ]]; then
  DUMP_PATH="${RUNNER_TEMP:-/tmp}/railway-data.sql"
fi
DUMP_PATH=$(realpath -m "$DUMP_PATH")

if [[ "$DUMP_PATH" == *[!A-Za-z0-9/_.-]* ]]; then
  echo "::error::Dump path contains unsupported characters. Refusing to dump."
  exit 1
fi

if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  git_root=$(realpath "$git_root")
  case "$DUMP_PATH" in
    "$git_root"|"$git_root"/*)
      echo "::error::Refusing to write the database dump inside the git repository."
      exit 1
      ;;
  esac
fi

counts_file=$(mktemp)
strip_tmp=""
cleanup() {
  rm -f "$DUMP_PATH" "$counts_file"
  if [[ -n "$strip_tmp" ]]; then
    rm -f "$strip_tmp"
  fi
}
trap cleanup EXIT

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-30}"

psql_neon() {
  psql \
    --no-password \
    --no-psqlrc \
    --set=ON_ERROR_STOP=1 \
    "$@" \
    "$DATABASE_URL_UNPOOLED"
}

table_counts() {
  # --quiet hides CREATE/DO command tags so stdout is only "table<TAB>count".
  psql_neon --quiet --no-align --tuples-only --field-separator=$'\t' <<'SQL'
CREATE TEMP TABLE advizlo_copy_counts (
  table_name text PRIMARY KEY,
  n bigint NOT NULL
);
DO $$
DECLARE
  r record;
  row_count bigint;
  found integer := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  LOOP
    found := found + 1;
    EXECUTE format('SELECT COUNT(*) FROM %I.%I', r.schemaname, r.tablename)
      INTO row_count;
    INSERT INTO advizlo_copy_counts (table_name, n)
    VALUES (r.tablename, row_count);
  END LOOP;
  IF found = 0 THEN
    RAISE EXCEPTION 'No application tables found in schema public. Apply Prisma migrations before copying data.';
  END IF;
END $$;
TABLE advizlo_copy_counts ORDER BY table_name;
SQL
}

require_app_table() {
  local table="$1"
  if ! awk -F '\t' -v t="$table" '$1 == t { found = 1 } END { exit found ? 0 : 1 }' "$counts_file"; then
    echo "::error::Neon schema is missing public.${table}. Apply Prisma migrations before copying data."
    exit 1
  fi
}

echo "Using $(pg_dump --version) and $(psql --version)."
echo "Checking Neon application tables before dump."
table_counts > "$counts_file"
require_app_table User
require_app_table ConsultantProfile

nonempty=0
while IFS=$'\t' read -r table_name row_count; do
  if [[ -z "${table_name}" ]]; then
    continue
  fi
  if [[ "${row_count}" != "0" ]]; then
    printf 'Neon table %s has %s row(s).\n' "$table_name" "$row_count"
    nonempty=1
  fi
done < "$counts_file"

if [[ "$nonempty" -eq 1 && "$OVERWRITE" != "true" ]]; then
  echo "::error::Neon already contains application data, so this copy would not be idempotent. Re-run with workflow input overwrite=true to truncate application tables (every table in public except _prisma_migrations) and reload. The schema is not dropped."
  exit 1
fi

if [[ "$nonempty" -eq 1 ]]; then
  echo "overwrite=true: application tables will be truncated and reloaded. _prisma_migrations will be kept."
else
  echo "Neon application tables are empty."
fi

echo "Dumping Railway data (data only, no owner, no privileges)."
pg_dump \
  --no-password \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --exclude-table=public._prisma_migrations \
  --file="$DUMP_PATH" \
  "$RAILWAY_DATABASE_URL"

if [[ ! -s "$DUMP_PATH" ]]; then
  echo "::error::pg_dump produced an empty file. Refusing to restore."
  exit 1
fi

# Newer pg_dump headers set parameters Neon either rejects or does not have.
# Only the preamble is edited. COPY data is left unchanged. The dump is not
# uploaded and is deleted when this script exits.
strip_tmp=$(mktemp)
awk '
  /^COPY / { in_copy = 1 }
  /^\\.$/ { in_copy = 0 }
  !in_copy && /^SET row_security = off;[[:space:]]*$/ { next }
  !in_copy && /^SET transaction_timeout = 0;[[:space:]]*$/ { next }
  { print }
' "$DUMP_PATH" > "$strip_tmp"
mv "$strip_tmp" "$DUMP_PATH"

bytes=$(wc -c < "$DUMP_PATH" | tr -d ' ')
echo "Dump is ${bytes} bytes. It stays on the runner and is not uploaded as an artifact."

echo "Restoring into Neon."
psql_neon \
  --single-transaction \
  -v "overwrite=${OVERWRITE}" \
  -v "dump_path=${DUMP_PATH}" \
  --file="$RESTORE_SQL"

echo "Application table counts after copy:"
table_counts > "$counts_file"
while IFS=$'\t' read -r table_name row_count; do
  if [[ -z "${table_name}" ]]; then
    continue
  fi
  printf '  %s: %s\n' "$table_name" "$row_count"
done < "$counts_file"

migrations=$(psql_neon --quiet --no-align --tuples-only --command 'SELECT COUNT(*) FROM public."_prisma_migrations"')
echo "_prisma_migrations rows: ${migrations} (not loaded from Railway)."

warn_if_zero() {
  local table="$1"
  local count
  count=$(awk -F '\t' -v t="$table" '$1 == t { print $2 }' "$counts_file")
  if [[ "${count:-0}" == "0" ]]; then
    echo "::warning::${table} has 0 rows after copy."
  fi
}
warn_if_zero User
warn_if_zero ConsultantProfile

deferrable=$(psql_neon --quiet --no-align --tuples-only --command "
SELECT count(*)
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
  AND c.relname <> '_prisma_migrations'
  AND (con.condeferrable OR con.condeferred);
")
if [[ "$deferrable" != "0" ]]; then
  echo "::error::Foreign keys were left deferrable after the load. The Neon schema was not restored to its Prisma defaults."
  exit 1
fi

echo "Copy finished. Application foreign keys are back to their original flags."
