/* Configuración por variables de entorno (ver .env.example en la raíz del proyecto). */
const env = process.env;
const produccion = env.NODE_ENV === "production";

export const config = {
  produccion,
  puerto: Number(env.PORT || 8080),
  databaseUrl: env.DATABASE_URL || "postgres://mddi:mddi_dev@localhost:5432/mddi",
  // Clave secreta del servidor para derivar el hash de los códigos de acceso. OBLIGATORIA en producción.
  secreto: env.MDDI_SECRETO || (produccion ? null : "solo-para-desarrollo-cambiar"),
  cookieSegura: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : produccion,
  duracionSesionDias: Number(env.SESION_DIAS || 14),
  frontendDist: env.FRONTEND_DIST || new URL("../../frontend/dist", import.meta.url).pathname,
  // Códigos iniciales (solo se usan si la tabla de usuarios está vacía)
  codigoCoordinacionInicial: env.MDDI_CODIGO_COORDINACION || (produccion ? null : "COORD-2026"),
  cargarUsuariosDemo: env.MDDI_USUARIOS_DEMO ? env.MDDI_USUARIOS_DEMO === "true" : !produccion,
  cargarEjemploKapi: env.MDDI_SEED_EJEMPLO === "true",
};

if (!config.secreto) {
  console.error("Falta la variable MDDI_SECRETO (clave secreta larga y aleatoria). No se puede iniciar en producción sin ella.");
  process.exit(1);
}
