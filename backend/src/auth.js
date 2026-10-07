/* ======================================================================
   Autenticación y sesiones
   - Los códigos de acceso NUNCA se guardan en claro: se guarda un
     HMAC-SHA256(código, MDDI_SECRETO). Sin el secreto del servidor no se
     puede reconstruir ni probar códigos contra la base.
   - La sesión viaja en una cookie httpOnly + SameSite=Lax (+ Secure con
     HTTPS). En la base se guarda solo el SHA-256 del token.
   - Punto único de extensión: `validarCredenciales()`. Para pasar a
     usuario+clave, LDAP u OIDC (p.ej. cuentas del Ministerio) alcanza con
     reemplazar esa función; el resto de la plataforma no cambia.
====================================================================== */
import crypto from "crypto";
import { pool } from "./db.js";
import { config } from "./config.js";

export const ROLES = ["Docente de contenidos", "Especialista en Didáctica", "Corrector/a", "Coordinación General"];
const COOKIE = "mddi_sesion";

export const hashCodigo = (codigo) =>
  crypto.createHmac("sha256", config.secreto).update(String(codigo).trim().toLowerCase()).digest("hex");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const pistaCodigo = (codigo) => "…" + String(codigo).trim().slice(-2);

async function validarCredenciales({ codigo }) {
  if (!codigo || String(codigo).trim().length < 4) return null;
  const r = await pool.query("SELECT * FROM usuarios WHERE codigo_hash = $1 AND activo", [hashCodigo(codigo)]);
  return r.rows[0] || null;
}

/* Límite de intentos de ingreso por IP (protección contra adivinar códigos). */
const intentos = new Map();
function limitarIntentos(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter((t) => ahora - t < 10 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 15;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function setCookie(res, valor, maxAgeSeg) {
  const partes = [`${COOKIE}=${valor}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeg}`];
  if (config.cookieSegura) partes.push("Secure");
  res.setHeader("Set-Cookie", partes.join("; "));
}

export async function login(req, res) {
  const ip = req.ip;
  if (limitarIntentos(ip)) return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos." });
  const u = await validarCredenciales(req.body || {});
  if (!u) return res.status(401).json({ error: "Código de acceso no reconocido. Pedile a Coordinación que te dé de alta." });
  const token = crypto.randomBytes(32).toString("base64url");
  const nombre = String((req.body && req.body.nombre) || "").trim().slice(0, 80) || u.nombre;
  const dias = config.duracionSesionDias;
  await pool.query(
    "INSERT INTO sesiones(token_hash, usuario_id, nombre_visible, expira_en, ip, agente) VALUES ($1,$2,$3, now() + ($4 || ' days')::interval, $5, $6)",
    [sha256(token), u.id, nombre, String(dias), ip, String(req.headers["user-agent"] || "").slice(0, 200)]
  );
  setCookie(res, token, dias * 86400);
  await registrar({ id: u.id, nombre, rol: u.rol }, "Inició sesión");
  res.json({ usuario: { id: u.id, nombre, rol: u.rol } });
}

export async function logout(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) await pool.query("DELETE FROM sesiones WHERE token_hash = $1", [sha256(token)]);
  if (req.usuario) await registrar(req.usuario, "Cerró sesión");
  setCookie(res, "", 0);
  res.json({ ok: true });
}

/* Middleware: carga la sesión (renovación deslizante). */
export async function cargarSesion(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return next();
  try {
    const r = await pool.query(
      `UPDATE sesiones s SET ultima_actividad = now(),
              expira_en = GREATEST(expira_en, now() + ($2 || ' days')::interval)
         FROM usuarios u
        WHERE s.token_hash = $1 AND s.usuario_id = u.id AND s.expira_en > now() AND u.activo
    RETURNING u.id, u.rol, s.nombre_visible`,
      [sha256(token), String(config.duracionSesionDias)]
    );
    if (r.rows[0]) req.usuario = { id: r.rows[0].id, rol: r.rows[0].rol, nombre: r.rows[0].nombre_visible };
  } catch (e) { return next(e); }
  next();
}

export function requiereSesion(req, res, next) {
  if (!req.usuario) return res.status(401).json({ error: "sesion_requerida" });
  next();
}
export const requiereRol = (...roles) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ error: "sesion_requerida" });
  if (!roles.includes(req.usuario.rol)) return res.status(403).json({ error: "Tu rol no tiene permiso para esta acción." });
  next();
};

/* Protección CSRF: toda petición que modifica datos debe traer la cabecera X-MDDI
   (un sitio ajeno no puede agregarla sin permiso CORS, que no se otorga). */
export function antiCsrf(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers["x-mddi"] !== "1") {
    return res.status(403).json({ error: "Petición rechazada (falta cabecera de seguridad)." });
  }
  next();
}

export async function registrar(usuario, accion, moduloId = null, client = pool) {
  await client.query("INSERT INTO bitacora(usuario_id, nombre, rol, accion, modulo_id) VALUES ($1,$2,$3,$4,$5)",
    [usuario?.id || null, usuario?.nombre || null, usuario?.rol || null, String(accion).slice(0, 500), moduloId]);
}

/* ---------------------------- administración de usuarios (Coordinación) */
export async function listarUsuarios(req, res) {
  const r = await pool.query("SELECT id, codigo_pista, nombre, rol, activo, creado_en FROM usuarios ORDER BY activo DESC, rol, nombre");
  res.json({ usuarios: r.rows });
}

export async function crearUsuario(req, res) {
  const { codigo, nombre, rol } = req.body || {};
  if (!codigo || String(codigo).trim().length < 6) return res.status(400).json({ error: "El código debe tener al menos 6 caracteres." });
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: "Falta el nombre." });
  if (!ROLES.includes(rol)) return res.status(400).json({ error: "Rol inválido." });
  try {
    const r = await pool.query(
      "INSERT INTO usuarios(codigo_hash, codigo_pista, nombre, rol, creado_por) VALUES ($1,$2,$3,$4,$5) RETURNING id, codigo_pista, nombre, rol, activo, creado_en",
      [hashCodigo(codigo), pistaCodigo(codigo), String(nombre).trim(), rol, req.usuario.nombre]
    );
    await registrar(req.usuario, `Dio de alta a ${String(nombre).trim()} (${rol})`);
    res.json({ usuario: r.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ese código ya está en uso. Elegí otro." });
    throw e;
  }
}

export async function modificarUsuario(req, res) {
  const { activo, nombre, rol, codigo } = req.body || {};
  const sets = [], vals = [];
  if (typeof activo === "boolean") { sets.push(`activo = $${vals.length + 1}`); vals.push(activo); }
  if (nombre) { sets.push(`nombre = $${vals.length + 1}`); vals.push(String(nombre).trim()); }
  if (rol) { if (!ROLES.includes(rol)) return res.status(400).json({ error: "Rol inválido." }); sets.push(`rol = $${vals.length + 1}`); vals.push(rol); }
  if (codigo) {
    if (String(codigo).trim().length < 6) return res.status(400).json({ error: "El código debe tener al menos 6 caracteres." });
    sets.push(`codigo_hash = $${vals.length + 1}`); vals.push(hashCodigo(codigo));
    sets.push(`codigo_pista = $${vals.length + 1}`); vals.push(pistaCodigo(codigo));
  }
  if (!sets.length) return res.json({ ok: true });
  if (req.params.id === req.usuario.id && activo === false) return res.status(400).json({ error: "No podés desactivar tu propio usuario." });
  vals.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE usuarios SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING id, codigo_pista, nombre, rol, activo`, vals);
    if (activo === false || codigo) await pool.query("DELETE FROM sesiones WHERE usuario_id = $1", [req.params.id]);
    await registrar(req.usuario, `Modificó el usuario ${r.rows[0]?.nombre || req.params.id}${activo === false ? " (desactivado)" : ""}`);
    res.json({ usuario: r.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ese código ya está en uso." });
    throw e;
  }
}
