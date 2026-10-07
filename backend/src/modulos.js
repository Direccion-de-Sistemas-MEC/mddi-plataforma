/* ======================================================================
   Módulos: listado incremental, creación con numeración automática por
   grado, guardado por operaciones con detección de conflictos,
   eliminación lógica (papelera), historial e instantáneas.
====================================================================== */
import { pool, tx } from "./db.js";
import { registrar } from "./auth.js";
import { applyOp, getAt, deepEqual, pathKey, listKey, rutasSeSolapan } from "../../shared/ops.js";
import { normalizeModule, gradoNumero, ESTADOS_VALIDOS } from "../../shared/modelo.js";

const INSTANTANEA_CADA_MIN = 30;
const COORD = "Coordinación General";

/* Transiciones de estado que puede producir cada rol (validación del lado del servidor). */
const ESTADOS_POR_ROL = {
  "Docente de contenidos": ["revision_didactica"],
  "Especialista en Didáctica": ["correccion_editorial", "devuelto_docente"],
  "Corrector/a": ["aprobado_editorialmente", "devuelto_docente"],
  [COORD]: ESTADOS_VALIDOS,
};

const meta = (r) => ({
  id: r.id, grado: r.grado, numero: r.numero, version: r.version,
  creadoEn: r.creado_en, creadoPor: r.creado_por, actualizadoEn: r.actualizado_en, actualizadoPor: r.actualizado_por,
  eliminadoEn: r.eliminado_en, eliminadoPor: r.eliminado_por,
});

async function siguienteNumero(c, grado) {
  await c.query("SELECT pg_advisory_xact_lock(4242, $1)", [grado]);
  const r = await c.query("SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM modulos WHERE grado = $1 AND eliminado_en IS NULL", [grado]);
  return r.rows[0].n;
}

const columnas = (d) => [d.titulo || "", d.area || "", d.estado || "", d.codigo || ""];

async function instantanea(c, id, version, data, motivo, usuario) {
  await c.query("INSERT INTO modulo_instantaneas(modulo_id, version, data, motivo, usuario) VALUES ($1,$2,$3,$4,$5)", [id, version, data, motivo, usuario]);
}

/* GET /api/modulos?desde=ISO — devuelve los módulos modificados desde esa fecha
   (o todos) y la lista completa de ids vigentes, para detectar eliminaciones. */
export async function listar(req, res) {
  const desde = req.query.desde ? new Date(String(req.query.desde)) : null;
  const ahora = (await pool.query("SELECT now() AS t")).rows[0].t;
  const params = [];
  let where = "eliminado_en IS NULL";
  if (desde && !isNaN(desde)) { params.push(new Date(desde.getTime() - 5000)); where += ` AND actualizado_en >= $1`; }
  const r = await pool.query(`SELECT * FROM modulos WHERE ${where} ORDER BY grado, numero`, params);
  const ids = (await pool.query("SELECT id, version FROM modulos WHERE eliminado_en IS NULL")).rows;
  res.json({ ahora, modulos: r.rows.map((x) => ({ meta: meta(x), data: x.data })), vigentes: ids });
}

export async function obtener(req, res) {
  const r = await pool.query("SELECT * FROM modulos WHERE id = $1", [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "no_existe" });
  res.json({ meta: meta(r.rows[0]), data: r.rows[0].data });
}

/* POST /api/modulos {id, data} — idempotente (reintentos sin conexión). */
export async function crear(req, res) {
  const { id, data } = req.body || {};
  if (!id || typeof id !== "string" || id.length > 80) return res.status(400).json({ error: "id inválido" });
  const doc = normalizeModule({ ...(data || {}), id });
  const grado = gradoNumero(doc.grado);
  doc.grado = `${grado}º grado`;
  const out = await tx(async (c) => {
    const ya = await c.query("SELECT * FROM modulos WHERE id = $1", [id]);
    if (ya.rows[0]) return { meta: meta(ya.rows[0]), data: ya.rows[0].data, existente: true };
    const numero = await siguienteNumero(c, grado);
    const r = await c.query(
      `INSERT INTO modulos(id, grado, numero, titulo, area, estado, codigo, data, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [id, grado, numero, ...columnas(doc), doc, req.usuario.nombre]
    );
    await instantanea(c, id, 1, doc, "Creación", req.usuario.nombre);
    await registrar(req.usuario, `Creó el Módulo ${numero} de ${grado}º grado`, id, c);
    return { meta: meta(r.rows[0]), data: r.rows[0].data };
  });
  res.json(out);
}

/* POST /api/modulos/:id/ops {baseVersion, clientId, ops} */
export async function guardarOps(req, res) {
  const { baseVersion, clientId, ops } = req.body || {};
  if (!Array.isArray(ops) || typeof baseVersion !== "number" || !clientId) return res.status(400).json({ error: "Petición inválida" });
  if (ops.length > 5000) return res.status(413).json({ error: "Demasiadas operaciones en un solo guardado" });
  const u = req.usuario;
  const out = await tx(async (c) => {
    const r = await c.query("SELECT * FROM modulos WHERE id = $1 FOR UPDATE", [req.params.id]);
    const row = r.rows[0];
    if (!row) return { status: 404, body: { error: "no_existe" } };
    if (row.eliminado_en) return { status: 410, body: { error: "eliminado", por: row.eliminado_por, fecha: row.eliminado_en } };
    const doc = row.data;
    const fv = row.field_versions || {};
    const nuevaVersion = row.version + 1;
    const ahoraIso = new Date().toISOString();
    const recientes = Object.entries(fv).filter(([, v]) => v.v > baseVersion && v.c !== clientId);
    const aplicadas = [], conflictos = [];

    for (const op of ops) {
      if (!op || !Array.isArray(op.path) || !["set", "del", "list"].includes(op.op) || op.path.some((s) => typeof s !== "string")) {
        conflictos.push({ path: op?.path || [], motivo: "operación inválida" }); continue;
      }
      // Validación de permisos sobre el circuito de revisión
      if (op.op === "set" && op.path.length === 1 && op.path[0] === "estado" && op.value !== doc.estado) {
        if (!(ESTADOS_POR_ROL[u.rol] || []).includes(op.value)) {
          conflictos.push({ path: op.path, tuValor: op.value, valorActual: doc.estado, motivo: "Tu rol no puede pasar el módulo a ese estado." });
          continue;
        }
      }
      if (op.op !== "list") {
        const key = pathKey(op.path);
        const choque = recientes.find(([k]) => rutasSeSolapan(key, k));
        if (choque) {
          const actual = getAt(doc, op.path);
          if (op.op === "set" && deepEqual(actual, op.value)) continue; // mismo valor: no hay conflicto real
          conflictos.push({ path: op.path, tuValor: op.op === "set" ? op.value : null, valorActual: actual === undefined ? null : actual, por: choque[1].u, fecha: choque[1].t, motivo: "modificado_por_otro" });
          continue;
        }
      }
      if (!applyOp(doc, op)) {
        conflictos.push({ path: op.path, tuValor: op.value ?? null, valorActual: null, motivo: "El elemento ya no existe (otra persona lo eliminó)." });
        continue;
      }
      aplicadas.push(op);
      fv[op.op === "list" ? listKey(op.path) : pathKey(op.path)] = { v: nuevaVersion, c: clientId, u: u.nombre, t: ahoraIso };
    }

    if (aplicadas.length === 0) {
      return { status: 200, body: { version: row.version, meta: meta(row), conflictos, data: conflictos.length ? doc : undefined } };
    }

    // ¿Cambió el grado? → el módulo pasa al final de la lista del nuevo grado
    let grado = row.grado, numero = row.numero;
    const g = gradoNumero(doc.grado);
    if (g !== row.grado) { grado = g; numero = await siguienteNumero(c, g); doc.grado = `${g}º grado`; }

    const upd = await c.query(
      `UPDATE modulos SET data = $2, field_versions = $3, version = $4, grado = $5, numero = $6,
              titulo = $7, area = $8, estado = $9, codigo = $10, actualizado_en = now(), actualizado_por = $11
        WHERE id = $1 RETURNING *`,
      [row.id, doc, fv, nuevaVersion, grado, numero, ...columnas(doc), u.nombre]
    );
    await c.query(
      "INSERT INTO modulo_cambios(modulo_id, version, usuario_id, usuario, rol, client_id, rutas, ops, conflictos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [row.id, nuevaVersion, u.id, u.nombre, u.rol, clientId, aplicadas.map((o) => pathKey(o.path)).slice(0, 200), JSON.stringify(aplicadas), conflictos.length ? JSON.stringify(conflictos) : null]
    );
    const ult = await c.query("SELECT fecha FROM modulo_instantaneas WHERE modulo_id = $1 ORDER BY fecha DESC LIMIT 1", [row.id]);
    if (!ult.rows[0] || Date.now() - new Date(ult.rows[0].fecha).getTime() > INSTANTANEA_CADA_MIN * 60000) {
      await instantanea(c, row.id, nuevaVersion, doc, "Automática (cada 30 minutos de trabajo)", u.nombre);
    }
    if (row.estado !== doc.estado) await registrar(u, `Cambió el estado del módulo "${doc.titulo || "sin título"}" a ${doc.estado}`, row.id, c);
    if (grado !== row.grado) await registrar(u, `Movió el módulo "${doc.titulo || "sin título"}" a ${grado}º grado (Módulo ${numero})`, row.id, c);

    // Si hubo cambios de otras personas en el medio, o conflictos, el cliente necesita el documento combinado.
    const intermedio = row.version !== baseVersion;
    return {
      status: 200,
      body: { version: nuevaVersion, meta: meta(upd.rows[0]), conflictos, data: intermedio || conflictos.length || grado !== row.grado ? doc : undefined },
    };
  });
  res.status(out.status).json(out.body);
}

export async function eliminar(req, res) {
  const out = await tx(async (c) => {
    const r = await c.query("SELECT * FROM modulos WHERE id = $1 FOR UPDATE", [req.params.id]);
    const row = r.rows[0];
    if (!row || row.eliminado_en) return { status: 404, body: { error: "no_existe" } };
    await instantanea(c, row.id, row.version, row.data, "Antes de eliminar", req.usuario.nombre);
    await c.query("UPDATE modulos SET eliminado_en = now(), eliminado_por = $2 WHERE id = $1", [row.id, req.usuario.nombre]);
    await registrar(req.usuario, `Eliminó (a la papelera) el Módulo ${row.numero} de ${row.grado}º grado "${row.titulo || "sin título"}"`, row.id, c);
    return { status: 200, body: { ok: true } };
  });
  res.status(out.status).json(out.body);
}

export async function eliminados(req, res) {
  const r = await pool.query("SELECT id, grado, numero, titulo, codigo, eliminado_en, eliminado_por FROM modulos WHERE eliminado_en IS NOT NULL ORDER BY eliminado_en DESC");
  res.json({ modulos: r.rows });
}

export async function restaurar(req, res) {
  const out = await tx(async (c) => {
    const r = await c.query("SELECT * FROM modulos WHERE id = $1 FOR UPDATE", [req.params.id]);
    const row = r.rows[0];
    if (!row || !row.eliminado_en) return { status: 404, body: { error: "no_existe" } };
    const libre = await c.query("SELECT 1 FROM modulos WHERE grado = $1 AND numero = $2 AND eliminado_en IS NULL", [row.grado, row.numero]);
    const numero = libre.rows[0] ? await siguienteNumero(c, row.grado) : row.numero;
    const upd = await c.query("UPDATE modulos SET eliminado_en = NULL, eliminado_por = NULL, numero = $2, version = version + 1, actualizado_en = now() WHERE id = $1 RETURNING *", [row.id, numero]);
    await registrar(req.usuario, `Restauró el módulo "${row.titulo || "sin título"}" (${row.grado}º grado, Módulo ${numero})`, row.id, c);
    return { status: 200, body: { meta: meta(upd.rows[0]), data: upd.rows[0].data } };
  });
  res.status(out.status).json(out.body);
}

export async function historial(req, res) {
  const cambios = await pool.query(
    "SELECT id, version, fecha, usuario, rol, rutas, conflictos IS NOT NULL AS hubo_conflictos FROM modulo_cambios WHERE modulo_id = $1 ORDER BY version DESC LIMIT 300",
    [req.params.id]
  );
  const inst = await pool.query("SELECT id, version, fecha, motivo, usuario FROM modulo_instantaneas WHERE modulo_id = $1 ORDER BY fecha DESC LIMIT 100", [req.params.id]);
  res.json({ cambios: cambios.rows, instantaneas: inst.rows });
}

/* Restaurar una instantánea (Coordinación). No borra nada: guarda antes una
   instantánea del estado actual y marca el cambio como una nueva versión. */
export async function restaurarInstantanea(req, res) {
  const out = await tx(async (c) => {
    const r = await c.query("SELECT * FROM modulos WHERE id = $1 FOR UPDATE", [req.params.id]);
    const row = r.rows[0];
    if (!row) return { status: 404, body: { error: "no_existe" } };
    const s = await c.query("SELECT * FROM modulo_instantaneas WHERE id = $1 AND modulo_id = $2", [req.params.snap, row.id]);
    if (!s.rows[0]) return { status: 404, body: { error: "no_existe" } };
    await instantanea(c, row.id, row.version, row.data, "Antes de restaurar una versión anterior", req.usuario.nombre);
    const doc = s.rows[0].data;
    const v = row.version + 1;
    const fv = { "": { v, c: "restauracion", u: req.usuario.nombre, t: new Date().toISOString() } };
    const upd = await c.query(
      "UPDATE modulos SET data = $2, field_versions = $3, version = $4, titulo = $5, area = $6, estado = $7, codigo = $8, actualizado_en = now(), actualizado_por = $9 WHERE id = $1 RETURNING *",
      [row.id, doc, fv, v, ...columnas(doc), req.usuario.nombre]
    );
    await c.query("INSERT INTO modulo_cambios(modulo_id, version, usuario_id, usuario, rol, client_id, rutas, ops) VALUES ($1,$2,$3,$4,$5,'restauracion',$6,'[]')",
      [row.id, v, req.usuario.id, req.usuario.nombre, req.usuario.rol, ["/ (restauración de la versión " + s.rows[0].version + ")"]]);
    await registrar(req.usuario, `Restauró la versión ${s.rows[0].version} del módulo "${doc.titulo || "sin título"}"`, row.id, c);
    return { status: 200, body: { meta: meta(upd.rows[0]), data: doc } };
  });
  res.status(out.status).json(out.body);
}

/* Presencia: quién tiene abierto el mismo módulo (en memoria, sin persistir). */
const presencia = new Map();
export function marcarPresencia(req, res) {
  const id = req.params.id;
  const clientId = String((req.body && req.body.clientId) || "");
  const ahora = Date.now();
  const m = presencia.get(id) || new Map();
  if (clientId) m.set(clientId, { nombre: req.usuario.nombre, rol: req.usuario.rol, t: ahora });
  for (const [k, v] of m) if (ahora - v.t > 60000) m.delete(k);
  presencia.set(id, m);
  res.json({ otros: [...m.entries()].filter(([k]) => k !== clientId).map(([, v]) => ({ nombre: v.nombre, rol: v.rol })) });
}
