import express from "express";
import helmet from "helmet";
import compression from "compression";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { pool, migrar } from "./db.js";
import { seed } from "./seed.js";
import * as auth from "./auth.js";
import * as mod from "./modulos.js";

const app = express();
app.set("trust proxy", 1); // detrás de Nginx / balanceador
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.cookieSegura ? [] : null,
    },
  },
  hsts: config.cookieSegura ? { maxAge: 31536000 } : false,
}));
app.use(compression());
app.use(express.json({ limit: "6mb" }));

const api = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
api.use(auth.antiCsrf);
api.use(w(auth.cargarSesion));
api.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

api.get("/salud", w(async (req, res) => { await pool.query("SELECT 1"); res.json({ ok: true, hora: new Date().toISOString() }); }));
api.post("/auth/login", w(auth.login));
api.post("/auth/logout", w(auth.logout));
api.get("/auth/me", auth.requiereSesion, (req, res) => res.json({ usuario: req.usuario }));

const COORD = "Coordinación General";
api.get("/usuarios", auth.requiereRol(COORD), w(auth.listarUsuarios));
api.post("/usuarios", auth.requiereRol(COORD), w(auth.crearUsuario));
api.patch("/usuarios/:id", auth.requiereRol(COORD), w(auth.modificarUsuario));

api.get("/modulos", auth.requiereSesion, w(mod.listar));
api.post("/modulos", auth.requiereRol("Docente de contenidos", COORD), w(mod.crear));
api.get("/modulos-eliminados", auth.requiereRol(COORD), w(mod.eliminados));
api.get("/modulos/:id", auth.requiereSesion, w(mod.obtener));
api.post("/modulos/:id/ops", auth.requiereSesion, w(mod.guardarOps));
api.delete("/modulos/:id", auth.requiereRol(COORD), w(mod.eliminar));
api.post("/modulos/:id/restaurar", auth.requiereRol(COORD), w(mod.restaurar));
api.get("/modulos/:id/historial", auth.requiereSesion, w(mod.historial));
api.post("/modulos/:id/instantaneas/:snap/restaurar", auth.requiereRol(COORD), w(mod.restaurarInstantanea));
api.post("/modulos/:id/presencia", auth.requiereSesion, mod.marcarPresencia);

api.get("/bitacora", auth.requiereRol(COORD), w(async (req, res) => {
  const r = await pool.query("SELECT fecha, nombre, rol, accion, modulo_id FROM bitacora ORDER BY fecha DESC LIMIT $1", [Math.min(Number(req.query.limite) || 300, 2000)]);
  res.json({ registros: r.rows });
}));
api.post("/bitacora", auth.requiereSesion, w(async (req, res) => {
  const acciones = Array.isArray(req.body?.acciones) ? req.body.acciones.slice(0, 200) : [];
  for (const a of acciones) await auth.registrar(req.usuario, String(a.accion || "").slice(0, 500), a.moduloId || null);
  res.json({ ok: true });
}));

api.use((req, res) => res.status(404).json({ error: "no_encontrado" }));
api.use((err, req, res, next) => {
  console.error(new Date().toISOString(), req.method, req.originalUrl, err);
  res.status(500).json({ error: "Error interno del servidor. El cambio no se perdió: queda pendiente y se reintentará." });
});
app.use("/api", api);

// Frontend compilado (si existe). El service worker no debe quedar en caché del navegador.
if (fs.existsSync(config.frontendDist)) {
  app.get("/sw.js", (req, res) => { res.setHeader("Cache-Control", "no-cache"); res.sendFile(path.join(config.frontendDist, "sw.js")); });
  app.use("/assets", express.static(path.join(config.frontendDist, "assets"), { immutable: true, maxAge: "365d" }));
  app.use(express.static(config.frontendDist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res) => { res.setHeader("Cache-Control", "no-cache"); res.sendFile(path.join(config.frontendDist, "index.html")); });
}

await migrar();
await seed();
app.listen(config.puerto, () => console.log(`MDDI API escuchando en :${config.puerto} (${config.produccion ? "producción" : "desarrollo"})`));
