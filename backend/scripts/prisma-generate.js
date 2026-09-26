/**
 * `prisma generate` does not open a database connection, but Prisma 5 still
 * requires DATABASE_URL and DATABASE_URL_UNPOOLED to be set while it loads
 * schema.prisma. Local `.env` supplies them. A Vercel build supplies the real
 * Neon URLs through the environment. When neither is present (a fresh install,
 * or a build check with no secrets), use the same local Docker placeholder as
 * backend/.env.example so generate can finish. This script never writes a
 * connection string to disk.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const placeholder =
  'postgresql://advizlo:advizlo@localhost:5432/advizlo?schema=public';

if (!fs.existsSync(path.join(backendRoot, '.env'))) {
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = placeholder;
  if (!process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL_UNPOOLED = placeholder;
  }
}

const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, 'generate'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
