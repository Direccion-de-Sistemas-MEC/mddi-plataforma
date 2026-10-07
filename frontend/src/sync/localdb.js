/* Almacenamiento local del dispositivo (caché + cambios pendientes).
   IndexedDB es el mecanismo principal; si el navegador no lo permite
   (modo privado de algunos navegadores), se usa localStorage como respaldo.
   IMPORTANTE: esto NO es la base de datos institucional. La fuente de verdad
   es el servidor; acá solo se guarda lo necesario para no perder lo que se
   escribe mientras no hay conexión. */
const DB = "mddi-local";
const VERSION = 1;
let dbPromise = null;

function abrir() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (!("indexedDB" in window)) return resolve(null);
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("modulos")) db.createObjectStore("modulos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return dbPromise;
}

const LS = "mddi-local:";
function lsGet(k) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }
function lsSet(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(LS + k); } catch (e) { /* */ } }

function op(store, modo, fn) {
  return abrir().then((db) => new Promise((resolve, reject) => {
    if (!db) return resolve(undefined);
    const t = db.transaction(store, modo);
    const s = t.objectStore(store);
    let out;
    const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const localdb = {
  async todosLosModulos() {
    const db = await abrir();
    if (!db) return (lsGet("modulos-ids") || []).map((id) => lsGet("mod:" + id)).filter(Boolean);
    return (await op("modulos", "readonly", (s) => s.getAll())) || [];
  },
  async guardarModulo(rec) {
    const db = await abrir();
    if (!db) {
      lsSet("mod:" + rec.id, rec);
      const ids = new Set(lsGet("modulos-ids") || []); ids.add(rec.id); lsSet("modulos-ids", [...ids]);
      return;
    }
    await op("modulos", "readwrite", (s) => s.put(rec));
  },
  async borrarModulo(id) {
    const db = await abrir();
    if (!db) { lsDel("mod:" + id); lsSet("modulos-ids", (lsGet("modulos-ids") || []).filter((x) => x !== id)); return; }
    await op("modulos", "readwrite", (s) => s.delete(id));
  },
  async get(k) {
    const db = await abrir();
    if (!db) return lsGet("kv:" + k);
    return op("kv", "readonly", (s) => s.get(k));
  },
  async set(k, v) {
    const db = await abrir();
    if (!db) { lsSet("kv:" + k, v); return; }
    await op("kv", "readwrite", (s) => s.put(v, k));
  },
  // Copia de emergencia sincrónica: se escribe al cerrar la pestaña, porque
  // una escritura asíncrona en IndexedDB puede no llegar a completarse.
  emergencia: {
    escribir(recs) { return lsSet("emergencia", { fecha: Date.now(), recs }); },
    leer() { return lsGet("emergencia"); },
    borrar() { lsDel("emergencia"); },
  },
};
