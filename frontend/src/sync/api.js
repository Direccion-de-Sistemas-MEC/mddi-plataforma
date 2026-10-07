/* Cliente HTTP de la API MDDI. Distingue errores de red (sin conexión) de
   errores de sesión y de servidor, para que el motor de sincronización
   sepa si reintentar, pedir que se vuelva a ingresar o avisar. */
export class ErrorRed extends Error {}
export class ErrorSesion extends Error {}
export class ErrorHttp extends Error {
  constructor(status, body) { super((body && body.error) || `HTTP ${status}`); this.status = status; this.body = body; }
}

export async function api(metodo, ruta, cuerpo, opciones = {}) {
  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-MDDI": "1" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      keepalive: !!opciones.keepalive,
      cache: "no-store",
    });
  } catch (e) {
    throw new ErrorRed(e.message);
  }
  let body = null;
  try { body = await res.json(); } catch (e) { /* respuesta sin JSON */ }
  if (res.status === 401) throw new ErrorSesion("sesion");
  if (!res.ok) throw new ErrorHttp(res.status, body);
  return body;
}
