#!/usr/bin/env bash
# Create an Advizlo admin user.
#
# Called from .github/workflows/create-admin.yml with the working directory
# set to backend. The password and Neon URL come from the environment, never
# from the workflow step command line.
#
# npm prints extra script arguments. This script captures that output and
# redacts the password and any connection string before printing it.
set +x
set -euo pipefail
umask 077

require_env() {
  local name="$1"
  local message="$2"
  if [[ ! -v $name ]] || [[ -z "${!name//[[:space:]]/}" ]]; then
    echo "::error::${message}"
    exit 1
  fi
}

require_env ADMIN_PASSWORD \
  "Repository secret ADMIN_PASSWORD is not set. Add it under Settings → Secrets and variables → Actions. Refusing to create an admin."
require_env DATABASE_URL_UNPOOLED \
  "Repository secret DATABASE_URL_UNPOOLED is not set. It must be the Neon direct (unpooled) URL. Refusing to create an admin."
require_env EMAIL \
  "Workflow input email is empty. Refusing to create an admin."
require_env FULL_NAME \
  "Workflow input full_name is empty. Refusing to create an admin."

if [[ "${#ADMIN_PASSWORD}" -lt 8 ]]; then
  echo "::error::Repository secret ADMIN_PASSWORD must be at least 8 characters. Refusing to create an admin."
  exit 1
fi

# Prisma Client connects with DATABASE_URL. Use the direct Neon URL for both
# so this run does not go through the pooler.
export DATABASE_URL="${DATABASE_URL_UNPOOLED}"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../../backend" && pwd)
cd "$BACKEND_DIR"

log_dir="${RUNNER_TEMP:-/tmp}"
log_file=$(mktemp "${log_dir}/create-admin.XXXXXX")
cleanup() {
  rm -f "$log_file"
}
trap cleanup EXIT

set +e
npm run create-admin -- "$EMAIL" "$ADMIN_PASSWORD" "$FULL_NAME" >"$log_file" 2>&1
status=$?
set -e

CREATE_ADMIN_LOG="$log_file" node <<'JS'
const fs = require('fs');

const file = process.env.CREATE_ADMIN_LOG;
let text = fs.readFileSync(file, 'utf8');

for (const key of ['ADMIN_PASSWORD', 'DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
  const value = process.env[key] || '';
  if (value) text = text.split(value).join('***');
}

text = text.replace(/postgres(?:ql)?:\/\/\S+/g, '***');
process.stdout.write(text);
if (text.length > 0 && !text.endsWith('\n')) process.stdout.write('\n');
JS

exit "$status"
