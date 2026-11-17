// Uso: node --env-file=.env scripts/apply-sql.cjs database/sql/NNN_archivo.sql
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Indica el archivo .sql a aplicar');
  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(sql);
    console.log('Migracion aplicada:', path.basename(file));
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    await c.end();
  }
}
main().catch((e) => {
  console.error('No se pudo aplicar:', e.code ?? '', e.message);
  process.exitCode = 1;
});