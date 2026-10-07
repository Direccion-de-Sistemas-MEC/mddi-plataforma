/* ======================================================================
   OPERACIONES DE CAMBIO (diff / patch) — compartido frontend + backend

   Un módulo es un documento JSON grande. En lugar de reenviar el módulo
   completo en cada guardado (lo que haría que dos personas se pisaran),
   el cliente envía solamente las operaciones que cambió:

     { op: "set",  path: [...], value }          → reemplaza un valor
     { op: "del",  path: [...] }                 → elimina una clave
     { op: "list", path: [...], order, add, remove }
                                                  → altas/bajas/orden en una
                                                    lista de ítems con `id`

   Los elementos de listas con id se direccionan como "#<id>", nunca por
   posición: así, si dos personas agregan o editan ítems distintos de la
   misma lista (pantallas, estados, feedback…), los cambios se combinan.
====================================================================== */

export const isPlainObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

const isIdList = (arr) => Array.isArray(arr) && arr.every((x) => isPlainObject(x) && typeof x.id === "string" && x.id);

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

export const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/* Claves que nunca se sincronizan como contenido (metadatos locales). */
const IGNORAR_RAIZ = new Set(["_meta"]);

export function diff(a, b, path = [], ops = []) {
  if (a === b) return ops;
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (path.length === 0 && IGNORAR_RAIZ.has(k)) continue;
      if (!(k in b)) ops.push({ op: "del", path: [...path, k] });
      else diff(a[k], b[k], [...path, k], ops);
    }
    return ops;
  }
  if (isIdList(a) && isIdList(b) && (a.length > 0 || b.length > 0)) {
    const idsA = a.map((x) => x.id), idsB = b.map((x) => x.id);
    const setA = new Set(idsA), setB = new Set(idsB);
    const sameOrder = idsA.length === idsB.length && idsA.every((id, i) => id === idsB[i]);
    if (!sameOrder) {
      const add = {};
      for (const it of b) if (!setA.has(it.id)) add[it.id] = it;
      ops.push({ op: "list", path, order: idsB, add, remove: idsA.filter((id) => !setB.has(id)) });
    }
    const mapA = new Map(a.map((x) => [x.id, x]));
    for (const it of b) if (mapA.has(it.id)) diff(mapA.get(it.id), it, [...path, "#" + it.id], ops);
    return ops;
  }
  if (deepEqual(a, b)) return ops;
  ops.push({ op: "set", path, value: clone(b) });
  return ops;
}

/* Resuelve el contenedor de la última clave de `path`. Devuelve null si
   algún tramo intermedio ya no existe (p.ej. otro usuario borró el ítem). */
function resolveParent(doc, path, create) {
  let o = doc;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    if (typeof seg === "string" && seg.startsWith("#")) {
      if (!Array.isArray(o)) return null;
      const found = o.find((x) => x && x.id === seg.slice(1));
      if (!found) return null;
      o = found;
    } else {
      if (!isPlainObject(o) && !Array.isArray(o)) return null;
      if (o[seg] === undefined || o[seg] === null) {
        if (!create) return null;
        o[seg] = typeof path[i + 1] === "string" && path[i + 1].startsWith("#") ? [] : {};
      }
      o = o[seg];
    }
  }
  return o;
}

export function getAt(doc, path) {
  if (path.length === 0) return doc;
  const parent = resolveParent(doc, path, false);
  if (!parent) return undefined;
  const last = path[path.length - 1];
  if (typeof last === "string" && last.startsWith("#")) return Array.isArray(parent) ? parent.find((x) => x && x.id === last.slice(1)) : undefined;
  return parent[last];
}

/* Aplica una operación sobre `doc` (MUTA doc). Devuelve true si se pudo aplicar. */
export function applyOp(doc, op) {
  const path = op.path || [];
  if (op.op === "list") {
    const current = path.length ? getAt(doc, path) : doc;
    let arr = Array.isArray(current) ? current : null;
    if (!arr) {
      if (path.length === 0) return false;
      const parent = resolveParent(doc, path, true);
      if (!parent) return false;
      parent[path[path.length - 1]] = [];
      arr = parent[path[path.length - 1]];
    }
    const remove = new Set(op.remove || []);
    const byId = new Map(arr.filter((x) => x && !remove.has(x.id)).map((x) => [x.id, x]));
    for (const [id, item] of Object.entries(op.add || {})) if (!byId.has(id)) byId.set(id, clone(item));
    const result = [];
    for (const id of op.order || []) if (byId.has(id)) { result.push(byId.get(id)); byId.delete(id); }
    for (const it of arr) if (it && byId.has(it.id)) { result.push(it); byId.delete(it.id); } // agregados por otra persona
    for (const it of byId.values()) result.push(it);
    arr.splice(0, arr.length, ...result);
    return true;
  }
  if (path.length === 0) return false;
  const parent = resolveParent(doc, path, op.op === "set");
  if (!parent) return false;
  const last = path[path.length - 1];
  if (typeof last === "string" && last.startsWith("#")) {
    if (!Array.isArray(parent)) return false;
    const idx = parent.findIndex((x) => x && x.id === last.slice(1));
    if (idx < 0) return false;
    if (op.op === "set") parent[idx] = clone(op.value);
    else parent.splice(idx, 1);
    return true;
  }
  if (op.op === "set") { parent[last] = clone(op.value); return true; }
  if (op.op === "del") { if (isPlainObject(parent)) delete parent[last]; return true; }
  return false;
}

export function applyOps(doc, ops) {
  const out = clone(doc);
  const fallidas = [];
  for (const op of ops) if (!applyOp(out, op)) fallidas.push(op);
  return { doc: out, fallidas };
}

/* Clave de ruta para el registro de versiones por campo. */
export const pathKey = (path) => "/" + path.join("/");
export const listKey = (path) => pathKey(path) + "/@list";

/* ¿La operación choca con un cambio registrado bajo la clave K? */
export function rutasSeSolapan(opKey, k) {
  if (k.endsWith("/@list")) {
    // un cambio de membresía de lista solo choca con un "set" de la lista entera o de un ancestro
    const listPath = k.slice(0, -"/@list".length);
    return opKey === listPath || listPath.startsWith(opKey + "/") || opKey === "/";
  }
  return opKey === k || k.startsWith(opKey + "/") || opKey.startsWith(k + "/") || k === "";
}
