import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

// DATABASE_SSL=true para bases administradas que exigen SSL (RDS, Render, Railway, Supabase, etc.)
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.PG_POOL_MAX || 20),
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function migrar() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())");
  const hechas = new Set((await pool.query("SELECT nombre FROM schema_migrations")).rows.map((r) => r.nombre));
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (hechas.has(f)) continue;
    await tx(async (c) => {
      await c.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await c.query("INSERT INTO schema_migrations(nombre) VALUES ($1)", [f]);
    });
    console.log("Migración aplicada:", f);
  }
}

if (process.argv.includes("--migrar")) {
  migrar().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
}
