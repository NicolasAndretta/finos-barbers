/**
 * Runner de migraciones SQL contra Supabase (Postgres).
 * Lee SUPABASE_DB_URL de .env.local (gitignoreado — el secreto nunca se commitea
 * ni pasa por el chat). Aplica el archivo .sql que se le pase como argumento.
 *
 * Uso:  node scripts/migrate.mjs supabase/migrations/0001_finos_core.sql
 */
import { readFileSync } from "fs";
import pg from "pg";

// Parser robusto de .env.local (respeta \r de Windows y comillas).
function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/migrate.mjs <ruta.sql>");
  process.exit(1);
}

const env = loadEnv();
if (!env.SUPABASE_DB_URL) {
  console.error("✗ Falta SUPABASE_DB_URL en .env.local");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Aplicando ${file} ...`);
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("✓ Migración aplicada correctamente.");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("✗ Error — se hizo rollback:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
