// Ejecutar desde backend: node --env-file=.env scripts/migrate-admin.cjs
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('afr-migrations',34))",
    );
    await c.query(
      'CREATE TABLE IF NOT EXISTS platform_schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of [
      '034_platform_admin.sql',
      '035_platform_admin_guards.sql',
    ]) {
      const done = await c.query(
        'SELECT 1 FROM platform_schema_migrations WHERE name=$1',
        [name],
      );
      if (!done.rowCount) {
        const sql = fs
          .readFileSync(path.join(__dirname, '../database/sql', name), 'utf8')
          .replace(/^BEGIN;\s*/, '')
          .replace(/COMMIT;\s*$/, '');
        await c.query(sql);
        await c.query(
          'INSERT INTO platform_schema_migrations(name) VALUES($1)',
          [name],
        );
      }
    }
    await c.query('SELECT app.set_context(NULL,NULL,NULL,true)');
    const emails = (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const ids = (process.env.SUPER_ADMIN_USER_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await c.query(
      "UPDATE users SET platform_role='super_admin' WHERE platform_role IS NULL AND (lower(email)=ANY($1::text[]) OR id::text=ANY($2::text[]))",
      [emails, ids],
    );
    await c.query('COMMIT');
    console.log(
      'Migración administrativa aplicada; datos existentes conservados.',
    );
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    await c.end();
  }
}
main().catch((e) => {
  console.error('No se pudo aplicar la migración:', e.code ?? '', e.message);
  process.exitCode = 1;
});
