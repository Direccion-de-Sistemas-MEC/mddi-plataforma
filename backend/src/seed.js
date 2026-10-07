/* Carga inicial: usuarios (si la tabla está vacía) y los módulos existentes
   importados de los documentos Word (si todavía no están en la base). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, tx, migrar } from "./db.js";
import { config } from "./config.js";
import { hashCodigo, pistaCodigo } from "./auth.js";
import { normalizeModule, gradoNumero, exampleModule } from "../../shared/modelo.js";

const SEED_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "seed");

// IDs fijos: el mismo módulo nunca se duplica aunque el seed se ejecute varias veces.
const MODULOS_INICIALES = [
  { id: "modulo-1g-m01", archivo: "modulo_1g_m01.json" },
  { id: "modulo-2g-m01", archivo: "modulo_2g_m01.json" },
];

export async function seed() {
  const n = (await pool.query("SELECT count(*)::int AS n FROM usuarios")).rows[0].n;
  if (n === 0) {
    const usuarios = [];
    if (config.codigoCoordinacionInicial) usuarios.push({ codigo: config.codigoCoordinacionInicial, nombre: "Coordinación Educa Primaria", rol: "Coordinación General" });
    if (config.cargarUsuariosDemo) {
      usuarios.push(
        { codigo: "DOC-2G-01", nombre: "Trío 2º grado", rol: "Docente de contenidos" },
        { codigo: "ESP-MAT-01", nombre: "Especialista en Didáctica de la Matemática", rol: "Especialista en Didáctica" },
        { codigo: "COR-01", nombre: "Corrector/a editorial", rol: "Corrector/a" },
      );
    }
    for (const u of usuarios) {
      await pool.query("INSERT INTO usuarios(codigo_hash, codigo_pista, nombre, rol, creado_por) VALUES ($1,$2,$3,$4,'carga inicial') ON CONFLICT DO NOTHING",
        [hashCodigo(u.codigo), pistaCodigo(u.codigo), u.nombre, u.rol]);
    }
    console.log(`Usuarios iniciales creados: ${usuarios.length}`);
  }
  const lista = [...MODULOS_INICIALES];
  for (const m of lista) {
    const ya = await pool.query("SELECT 1 FROM modulos WHERE id = $1", [m.id]);
    if (ya.rows[0]) continue;
    const doc = normalizeModule({ ...JSON.parse(fs.readFileSync(path.join(SEED_DIR, m.archivo), "utf8")), id: m.id });
    await insertar(doc, "Importación inicial desde " + (doc.origenImportacion || m.archivo));
  }
  if (config.cargarEjemploKapi) {
    const ya = await pool.query("SELECT 1 FROM modulos WHERE id = 'ejemplo-kapi-huellas'");
    if (!ya.rows[0]) { const e = normalizeModule({ ...exampleModule(), id: "ejemplo-kapi-huellas" }); await insertar(e, "Módulo de ejemplo"); }
  }
}

async function insertar(doc, motivo) {
  const grado = gradoNumero(doc.grado);
  await tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(4242, $1)", [grado]);
    const numero = (await c.query("SELECT COALESCE(MAX(numero),0)+1 AS n FROM modulos WHERE grado=$1 AND eliminado_en IS NULL", [grado])).rows[0].n;
    await c.query(`INSERT INTO modulos(id, grado, numero, titulo, area, estado, codigo, data, creado_por, actualizado_por)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'carga inicial','carga inicial')`,
      [doc.id, grado, numero, doc.titulo, doc.area, doc.estado, doc.codigo, doc]);
    await c.query("INSERT INTO modulo_instantaneas(modulo_id, version, data, motivo, usuario) VALUES ($1,1,$2,$3,'carga inicial')", [doc.id, doc, motivo]);
    console.log(`Cargado: ${grado}º grado · Módulo ${numero} — ${doc.titulo}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  migrar().then(seed).then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
}
