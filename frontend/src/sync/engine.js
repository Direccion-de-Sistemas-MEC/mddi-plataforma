/* ======================================================================
   MOTOR DE SINCRONIZACIÓN — guardado automático, trabajo sin conexión y
   combinación de cambios entre varias personas.

   Para cada módulo se mantienen dos copias:
     shadow → la última versión confirmada por el servidor (con su número
              de versión `base`)
     local  → lo que la persona ve y edita (shadow + sus cambios pendientes)

   Guardar = calcular diff(shadow, local) y enviar solo esas operaciones
   con `baseVersion`. El servidor aplica lo que no choca con cambios de
   otras personas y devuelve los conflictos (nunca sobrescribe en silencio).
   Todo se persiste en IndexedDB en cada cambio: si se corta la conexión,
   se cierra el navegador o se apaga la computadora, los cambios pendientes
   se envían la próxima vez que haya conexión.
====================================================================== */
import { api, ErrorRed, ErrorSesion, ErrorHttp } from "./api.js";
import { localdb } from "./localdb.js";
import { diff, applyOps } from "../../../shared/ops.js";
import { normalizeModule, uid, gradoNumero } from "../../../shared/modelo.js";

const DEBOUNCE_GUARDADO = 1200;
const DEBOUNCE_LOCAL = 250;
const INTERVALO_SYNC = 20000;

class Motor {
  constructor() {
    this.recs = new Map();
    this.oyentes = new Set();
    this.usuario = null;
    this.clientId = null;
    this.desde = null;
    this.conflictos = [];
    this.redCaida = false;
    this.errorServidor = null;
    this.sesionVencida = false;
    this.ultimoGuardado = null;
    this.presencia = [];
    this.moduloAbierto = null;
    this.colaBitacora = [];
    this.timers = new Map();
    this.timersLocal = new Map();
    this.reintento = 2000;
    this.listo = false;
    this._vista = null;
  }

  /* ------------------------------------------------------------- estado */
  suscribir(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }
  emitir() { this._vista = null; for (const fn of this.oyentes) fn(); }

  pendiente(rec) {
    if (rec.pendienteCreacion) return true;
    if (!rec.shadow) return false;
    if (rec.local === rec.shadow) return false;
    return diff(rec.shadow, rec.local).length > 0;
  }

  estadoGuardado() {
    const pendientes = [...this.recs.values()].filter((r) => this.pendiente(r)).length;
    const enviando = [...this.recs.values()].some((r) => r.enviando);
    const offline = this.redCaida || (typeof navigator !== "undefined" && navigator.onLine === false);
    let estado = "guardado";
    if (this.sesionVencida) estado = "sesion";
    else if (offline) estado = "sin_conexion";
    else if (this.errorServidor && pendientes) estado = "error";
    else if (enviando || pendientes) estado = "guardando";
    return { estado, pendientes, ultimoGuardado: this.ultimoGuardado, error: this.errorServidor };
  }

  /* Módulos para la interfaz: el documento con sus metadatos en `_meta`. */
  modulos() {
    if (this._vista) return this._vista;
    const out = [];
    for (const r of this.recs.values()) {
      if (!r.vista || r.vista._fuente !== r.local || r.vista._metaFuente !== r.meta) {
        const v = { ...r.local, _meta: { ...r.meta, pendienteCreacion: !!r.pendienteCreacion } };
        Object.defineProperty(v, "_fuente", { value: r.local, enumerable: false });
        Object.defineProperty(v, "_metaFuente", { value: r.meta, enumerable: false });
        r.vista = v;
      }
      out.push(r.vista);
    }
    out.sort((a, b) => (a._meta.grado - b._meta.grado) || (a._meta.numero - b._meta.numero));
    this._vista = out;
    return out;
  }

  /* ------------------------------------------------------------- inicio */
  async iniciar() {
    this.clientId = (await localdb.get("clientId")) || uid();
    await localdb.set("clientId", this.clientId);
    this.clientId = this.clientId + "-" + Math.random().toString(36).slice(2, 6); // una pestaña = un cliente
    const guardados = await localdb.todosLosModulos();
    for (const r of guardados) this.recs.set(r.id, { ...r, enviando: false });
    // Copia de emergencia escrita al cerrar la pestaña: si es más nueva, se usa.
    const em = localdb.emergencia.leer();
    if (em && Array.isArray(em.recs)) {
      for (const r of em.recs) {
        const actual = this.recs.get(r.id);
        if (!actual || (r.tocado || 0) > (actual.tocado || 0)) this.recs.set(r.id, { ...r, enviando: false });
      }
      for (const r of this.recs.values()) await localdb.guardarModulo(this.serializar(r));
      localdb.emergencia.borrar();
    }
    this.desde = (await localdb.get("desde")) || null;
    this.conflictos = (await localdb.get("conflictos")) || [];
    this.colaBitacora = (await localdb.get("colaBitacora")) || [];
    const usuarioCache = await localdb.get("usuario");
    try {
      const r = await api("GET", "/auth/me");
      this.usuario = r.usuario;
      await localdb.set("usuario", r.usuario);
    } catch (e) {
      if (e instanceof ErrorRed && usuarioCache) { this.usuario = usuarioCache; this.redCaida = true; }
      else this.usuario = null;
    }
    this.instalarEventos();
    this.listo = true;
    this.emitir();
    if (this.usuario) this.arrancar();
    return this.usuario;
  }

  instalarEventos() {
    if (this._eventos) return;
    this._eventos = true;
    window.addEventListener("online", () => { this.redCaida = false; this.emitir(); this.sincronizar(); });
    window.addEventListener("offline", () => { this.redCaida = true; this.emitir(); });
    // Guardado al cambiar de campo
    document.addEventListener("focusout", (e) => {
      const t = e.target;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) this.guardarTodoAhora();
    }, true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { this.copiaEmergencia(); this.guardarTodoAhora(); }
      else this.sincronizar();
    });
    window.addEventListener("focus", () => this.sincronizar());
    window.addEventListener("pagehide", () => this.copiaEmergencia());
    window.addEventListener("beforeunload", (e) => {
      this.copiaEmergencia();
      const { pendientes } = this.estadoGuardado();
      if (pendientes > 0) {
        this.guardarTodoAhora(true);
        e.preventDefault();
        e.returnValue = "Hay cambios que todavía no llegaron al servidor. Quedan guardados en este equipo y se enviarán cuando vuelvas a entrar.";
      }
    });
  }

  arrancar() {
    this.sesionVencida = false;
    this.sincronizar();
    clearInterval(this._intervalo);
    this._intervalo = setInterval(() => { this.sincronizar(); this.latido(); }, INTERVALO_SYNC);
  }

  /* ------------------------------------------------------------- sesión */
  async ingresar(codigo, nombre) {
    const r = await api("POST", "/auth/login", { codigo, nombre });
    this.usuario = r.usuario;
    await localdb.set("usuario", r.usuario);
    this.redCaida = false;
    this.arrancar();
    this.emitir();
    return r.usuario;
  }

  async salir() {
    await this.guardarTodoAhora();
    try { await api("POST", "/auth/logout", {}); } catch (e) { /* sin conexión: la cookie vence sola */ }
    this.usuario = null;
    await localdb.set("usuario", null);
    clearInterval(this._intervalo);
    this.emitir();
  }

  /* ------------------------------------------------------------- edición */
  actualizar(id, fn) {
    const rec = this.recs.get(id);
    if (!rec) return;
    const vista = rec.vista || { ...rec.local, _meta: rec.meta };
    const siguiente = fn(vista);
    if (!siguiente || siguiente === vista) return;
    const { _meta, ...doc } = siguiente;
    rec.local = doc;
    rec.tocado = Date.now();
    this.programar(id);
    this.emitir();
  }

  crear(gradoN) {
    const doc = normalizeModule({ grado: `${gradoN}º grado` });
    const numeros = [...this.recs.values()].filter((r) => r.meta.grado === gradoN).map((r) => r.meta.numero || 0);
    const rec = {
      id: doc.id, local: doc, shadow: null, base: 0, pendienteCreacion: true, tocado: Date.now(),
      meta: { id: doc.id, grado: gradoN, numero: (numeros.length ? Math.max(...numeros) : 0) + 1, version: 0, provisional: true },
    };
    this.recs.set(doc.id, rec);
    this.programar(doc.id, 0);
    this.emitir();
    return doc.id;
  }

  async eliminar(id) {
    await api("DELETE", `/modulos/${encodeURIComponent(id)}`);
    this.recs.delete(id);
    await localdb.borrarModulo(id);
    this.emitir();
  }

  async restaurar(id) {
    const r = await api("POST", `/modulos/${encodeURIComponent(id)}/restaurar`, {});
    this.incorporar(r.meta, r.data, true);
    this.emitir();
  }

  async restaurarInstantanea(id, snapId) {
    await this.guardarAhora(id);
    const r = await api("POST", `/modulos/${encodeURIComponent(id)}/instantaneas/${snapId}/restaurar`, {});
    this.incorporar(r.meta, r.data, true);
    this.emitir();
  }

  /* Incorpora la versión del servidor. `forzar`: reemplaza aunque haya pendientes. */
  incorporar(meta, data, forzar = false) {
    const doc = normalizeModule({ ...data, id: meta.id });
    const rec = this.recs.get(meta.id);
    if (!rec) {
      this.recs.set(meta.id, { id: meta.id, meta, shadow: doc, local: doc, base: meta.version, tocado: 0 });
    } else if (forzar || (!rec.enviando && !this.pendiente(rec))) {
      rec.meta = meta; rec.shadow = doc; rec.local = doc; rec.base = meta.version; rec.pendienteCreacion = false;
    } else {
      rec.meta = { ...rec.meta, numero: meta.numero, grado: meta.grado };
      // quedan cambios pendientes: el próximo guardado recibirá el documento combinado
    }
    this.persistirLocal(meta.id);
  }

  /* ------------------------------------------------------------- guardado */
  programar(id, ms = DEBOUNCE_GUARDADO) {
    this.persistirLocal(id);
    clearTimeout(this.timers.get(id));
    this.timers.set(id, setTimeout(() => this.guardarAhora(id), ms));
  }

  persistirLocal(id) {
    clearTimeout(this.timersLocal.get(id));
    this.timersLocal.set(id, setTimeout(() => {
      const rec = this.recs.get(id);
      if (rec) localdb.guardarModulo(this.serializar(rec)).catch(() => this.copiaEmergencia());
    }, DEBOUNCE_LOCAL));
  }

  serializar(rec) {
    return { id: rec.id, meta: rec.meta, shadow: rec.shadow, local: rec.local, base: rec.base, pendienteCreacion: !!rec.pendienteCreacion, tocado: rec.tocado || 0 };
  }

  copiaEmergencia() {
    const sucios = [...this.recs.values()].filter((r) => this.pendiente(r)).map((r) => this.serializar(r));
    if (sucios.length) localdb.emergencia.escribir(sucios);
  }

  guardarTodoAhora(keepalive = false) {
    const ps = [];
    for (const rec of this.recs.values()) if (this.pendiente(rec)) ps.push(this.guardarAhora(rec.id, keepalive));
    return Promise.all(ps);
  }

  async guardarAhora(id, keepalive = false) {
    clearTimeout(this.timers.get(id));
    const rec = this.recs.get(id);
    if (!rec || !this.usuario || this.sesionVencida) return;
    if (rec.enviando) { rec.otraVez = true; return; }
    if (!this.pendiente(rec)) return;
    rec.enviando = true;
    this.emitir();
    const enviado = rec.local;
    try {
      if (rec.pendienteCreacion) {
        const r = await api("POST", "/modulos", { id: rec.id, data: enviado }, { keepalive });
        const servidor = normalizeModule({ ...r.data, id: rec.id });
        this.rebase(rec, enviado, r.existente ? servidor : enviado, r.meta);
        rec.pendienteCreacion = false;
      } else {
        const ops = diff(rec.shadow, enviado);
        if (ops.length) {
          const r = await api("POST", `/modulos/${encodeURIComponent(rec.id)}/ops`, { baseVersion: rec.base, clientId: this.clientId, ops }, { keepalive });
          const servidor = r.data ? normalizeModule({ ...r.data, id: rec.id }) : enviado;
          this.rebase(rec, enviado, servidor, r.meta || { ...rec.meta, version: r.version });
          if (r.conflictos && r.conflictos.length) this.registrarConflictos(rec, r.conflictos);
        }
      }
      this.redCaida = false;
      this.errorServidor = null;
      this.reintento = 2000;
      this.ultimoGuardado = new Date();
      if (![...this.recs.values()].some((x) => this.pendiente(x))) localdb.emergencia.borrar();
    } catch (e) {
      if (e instanceof ErrorRed) { this.redCaida = true; this.programarReintento(); }
      else if (e instanceof ErrorSesion) { this.sesionVencida = true; }
      else if (e instanceof ErrorHttp && e.status === 410) {
        this.registrarConflictos(rec, [{ path: [], motivo: `Este módulo fue eliminado por ${e.body?.por || "Coordinación"}. Tus últimos cambios quedaron guardados abajo para que no se pierdan.`, tuValor: rec.local }]);
        this.recs.delete(rec.id);
        await localdb.borrarModulo(rec.id);
      } else if (e instanceof ErrorHttp && e.status === 403 && rec.pendienteCreacion) {
        this.registrarConflictos(rec, [{ path: [], motivo: "Tu rol no puede crear módulos. El borrador quedó guardado abajo.", tuValor: rec.local }]);
        this.recs.delete(rec.id);
        await localdb.borrarModulo(rec.id);
      } else { this.errorServidor = e.message; this.programarReintento(); }
    } finally {
      rec.enviando = false;
      this.persistirLocal(rec.id);
      this.emitir();
      if (rec.otraVez) { rec.otraVez = false; this.programar(rec.id, 300); }
    }
  }

  /* Tras confirmar un guardado: la nueva base es la del servidor y los
     cambios hechos mientras viajaba la petición se vuelven a aplicar encima. */
  rebase(rec, enviado, servidor, meta) {
    const durante = rec.local === enviado ? [] : diff(enviado, rec.local);
    rec.shadow = servidor;
    rec.local = durante.length ? applyOps(servidor, durante).doc : servidor;
    rec.base = meta.version;
    rec.meta = meta;
  }

  registrarConflictos(rec, lista) {
    const titulo = rec.local?.titulo || rec.shadow?.titulo || "Módulo";
    for (const c of lista) {
      this.conflictos.unshift({ id: uid(), moduloId: rec.id, modulo: `${rec.meta.grado}° · Módulo ${rec.meta.numero} — ${titulo}`, fecha: new Date().toISOString(), ...c });
    }
    this.conflictos = this.conflictos.slice(0, 200);
    localdb.set("conflictos", this.conflictos);
  }

  descartarConflicto(cid) {
    this.conflictos = this.conflictos.filter((c) => c.id !== cid);
    localdb.set("conflictos", this.conflictos);
    this.emitir();
  }

  /* "Usar mi versión": se vuelve a escribir, ahora de forma explícita. */
  usarMiVersion(cid) {
    const c = this.conflictos.find((x) => x.id === cid);
    if (!c || !this.recs.has(c.moduloId) || !c.path.length) return false;
    const rec = this.recs.get(c.moduloId);
    const { doc, fallidas } = applyOps(rec.local, [{ op: "set", path: c.path, value: c.tuValor }]);
    if (fallidas.length) return false;
    rec.local = doc;
    // Para que el servidor no lo tome como choque otra vez, se envía con la base actual
    this.programar(rec.id, 0);
    this.descartarConflicto(cid);
    return true;
  }

  programarReintento() {
    clearTimeout(this._reintento);
    this._reintento = setTimeout(() => this.sincronizar(), this.reintento);
    this.reintento = Math.min(this.reintento * 2, 60000);
  }

  /* ------------------------------------------------------------- traer cambios */
  async sincronizar() {
    if (!this.usuario || this.sesionVencida || this._sincronizando) return;
    this._sincronizando = true;
    try {
      await this.guardarTodoAhora();
      const r = await api("GET", `/modulos${this.desde ? `?desde=${encodeURIComponent(this.desde)}` : ""}`);
      for (const m of r.modulos) {
        const rec = this.recs.get(m.meta.id);
        if (!rec || m.meta.version > rec.base || m.meta.numero !== rec.meta.numero) this.incorporar(m.meta, m.data);
      }
      const vigentes = new Set(r.vigentes.map((x) => x.id));
      for (const rec of [...this.recs.values()]) {
        if (!vigentes.has(rec.id) && !rec.pendienteCreacion) {
          if (this.pendiente(rec)) this.registrarConflictos(rec, [{ path: [], motivo: "Este módulo fue eliminado en el servidor mientras tenías cambios sin enviar. Tus cambios quedaron guardados abajo.", tuValor: rec.local }]);
          this.recs.delete(rec.id);
          await localdb.borrarModulo(rec.id);
        }
      }
      // Un módulo con versión nueva en el servidor pero con cambios propios pendientes se combina al guardar.
      await this.guardarTodoAhora();
      this.desde = r.ahora;
      await localdb.set("desde", this.desde);
      this.redCaida = false;
      this.errorServidor = null;
      await this.enviarBitacora();
    } catch (e) {
      if (e instanceof ErrorRed) { this.redCaida = true; this.programarReintento(); }
      else if (e instanceof ErrorSesion) this.sesionVencida = true;
      else this.errorServidor = e.message;
    } finally {
      this._sincronizando = false;
      this.emitir();
    }
  }

  /* ------------------------------------------------------------- presencia y bitácora */
  abrirModulo(id) { this.moduloAbierto = id; this.presencia = []; this.latido(); }
  async latido() {
    if (!this.moduloAbierto || !this.usuario || this.redCaida) return;
    try {
      const r = await api("POST", `/modulos/${encodeURIComponent(this.moduloAbierto)}/presencia`, { clientId: this.clientId });
      this.presencia = r.otros || [];
      this.emitir();
    } catch (e) { /* no crítico */ }
  }

  log(accion, moduloId = null) {
    this.colaBitacora.push({ accion, moduloId, fecha: new Date().toISOString() });
    localdb.set("colaBitacora", this.colaBitacora);
    clearTimeout(this._tBit);
    this._tBit = setTimeout(() => this.enviarBitacora(), 3000);
  }
  async enviarBitacora() {
    if (!this.colaBitacora.length || !this.usuario) return;
    const lote = this.colaBitacora.slice(0, 200);
    try {
      await api("POST", "/bitacora", { acciones: lote });
      this.colaBitacora = this.colaBitacora.slice(lote.length);
      localdb.set("colaBitacora", this.colaBitacora);
    } catch (e) { /* se reintenta en la próxima sincronización */ }
  }

  /* ------------------------------------------------------------- migración de la versión anterior */
  datosVersionAnterior() {
    try {
      const v = localStorage.getItem("mddi-data");
      if (!v) return [];
      const d = JSON.parse(v);
      return (d.modules || []).filter((m) => m && m.id && !this.recs.has(m.id) && !(localStorage.getItem("mddi-migrado:" + m.id)));
    } catch (e) { return []; }
  }
  async migrarVersionAnterior(modulos) {
    let n = 0;
    for (const m of modulos) {
      const doc = normalizeModule(m);
      const g = gradoNumero(doc.grado);
      const r = await api("POST", "/modulos", { id: doc.id, data: doc });
      this.incorporar(r.meta, r.data, true);
      localStorage.setItem("mddi-migrado:" + m.id, "1");
      n++;
      void g;
    }
    this.emitir();
    return n;
  }

  api(metodo, ruta, cuerpo) { return api(metodo, ruta, cuerpo); }
}

export const motor = new Motor();
if (typeof window !== "undefined") window.__mddiMotor = motor; // útil para diagnóstico y pruebas
