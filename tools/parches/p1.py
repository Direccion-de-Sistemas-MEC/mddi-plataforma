import sys; sys.path.insert(0,'/home/claude/mddi/tools/parches')
from lib import Src
A=Src('/home/claude/mddi/frontend/src/App.jsx')

# ---- imports
A.rep('import React, { useState, useMemo, useEffect } from "react";',
'''import React, { useState, useMemo, useEffect, useReducer, useRef } from "react";
import { motor } from "./sync/engine.js";
import {
  TIPO_RESPUESTA, MOMENTOS, CASOS_LIMITE_BASE, CHECK_DOCENTE, CHECK_ESPECIALISTA, CHECK_CORRECTOR, CHECK_TECNICO, CHECK_COORDINACION,
  uid, GRADOS, gradoNumero, VERBOS_CATEGORIAS, VERBOS_LISTA, ESTAR_CERCA_TEXTO_FIJO, siguienteVersion,
} from "../../shared/modelo.js";''')
A.rep('''  UserCircle, Send, ThumbsUp, RotateCcw, PlayCircle, ChevronDown,
} from "lucide-react";''','''  UserCircle, Send, ThumbsUp, RotateCcw, PlayCircle, ChevronDown,
  Cloud, CloudOff, RefreshCw, Compass, HeartHandshake, Tags, GraduationCap, Archive, Undo2, Copy, FileDown,
} from "lucide-react";''')

# ---- SelectInput: conserva valores del documento que no están en la lista
A.replace_func('SelectInput','''function SelectInput({ label, help, value, onChange, options }) {
  // Si el valor guardado no está entre las opciones (p.ej. texto importado de un documento),
  // se muestra tal cual en lugar de reemplazarlo en pantalla por la primera opción.
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Field label={label} help={help}>
      <select style={{ ...inputBase, cursor: "pointer" }} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="">— Elegir —</option>}
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}''')

# ---- quitar capa de almacenamiento local (reemplazada por backend + motor de sincronización)
A.delete_between('const STORAGE_KEY = "mddi-data";','function LoginScreen(')
A.rep('''/* ======================================================================
   LOGIN / IDENTIFICACIÓN + PERSISTENCIA COMPARTIDA
======================================================================''','''/* ======================================================================
   LOGIN / IDENTIFICACIÓN
   La persistencia ya no usa window.storage ni localStorage: todo se guarda
   en el servidor (API + PostgreSQL) mediante el motor de sincronización
   (src/sync/engine.js), con caché local en IndexedDB para trabajar sin conexión.
======================================================================''')

A.replace_func('LoginScreen','''function LoginScreen({ onLogin }) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const submit = async () => {
    if (!codigo.trim()) { setError("Ingresá tu código de acceso."); return; }
    setEnviando(true); setError("");
    try {
      await onLogin(codigo.trim(), nombre.trim());
    } catch (e) {
      setError(e && e.message === "Failed to fetch" ? "No hay conexión con el servidor." : (e && e.message && e.message !== "sesion" ? e.message : "Código de acceso no reconocido. Pedile a Coordinación que te dé de alta."));
    } finally { setEnviando(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: M.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: M.card, borderRadius: 14, padding: "32px 30px", maxWidth: 400, width: "100%", border: `1px solid ${M.line}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <img src={LOGO_SRC} alt="Escudo" style={{ width: 64, height: 64 }} />
        </div>
        <p style={{ textAlign: "center", fontFamily: F_DISPLAY, fontWeight: 800, fontSize: 17, color: M.ink, margin: "0 0 2px" }}>GOBIERNO DE CORRIENTES</p>
        <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 12, color: M.inkSoft, margin: "0 0 18px" }}>Ministerio de Educación · Subsecretaría de Contenidos Audiovisuales</p>
        <p style={{ textAlign: "center", fontFamily: F_BODY, fontSize: 13, color: M.blueDeep, fontWeight: 600, margin: "0 0 20px" }}>Acceso a la plataforma MDDI</p>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <TextInput label="Código de acceso" value={codigo} onChange={setCodigo} placeholder="Pedíselo a Coordinación" />
          <TextInput label="Tu nombre (opcional)" value={nombre} onChange={setNombre} placeholder="Como querés que aparezca" />
          {error && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.red, margin: "0 0 12px" }}>{error}</p>}
          <SolidButton onClick={submit} disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</SolidButton>
        </form>
        <p style={{ marginTop: 18, textAlign: "center", fontFamily: F_BODY, fontSize: 11.5, color: M.inkFaint }}>
          La plataforma es de uso cerrado. Si no tenés código de acceso, pedíselo a Coordinación de Educa Primaria.
        </p>
      </div>
    </div>
  );
}''')

A.replace_func('UsersAdminPanel','''function UsersAdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [nombre, setNombre] = useState(""); const [rol, setRol] = useState(ROLES[0]); const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [confirmar, setConfirmar] = useState(null);
  const cargar = () => motor.api("GET", "/usuarios").then((r) => setUsuarios(r.usuarios)).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);
  const add = async () => {
    setErr(""); setMsg("");
    if (!codigo.trim() || !nombre.trim()) { setErr("Completá código y nombre."); return; }
    try {
      await motor.api("POST", "/usuarios", { codigo: codigo.trim(), nombre: nombre.trim(), rol });
      setMsg(`Alta registrada. Comunicale el código "${codigo.trim()}" a ${nombre.trim()}: por seguridad, la plataforma no lo vuelve a mostrar.`);
      setNombre(""); setCodigo(""); cargar();
    } catch (e) { setErr(e.message); }
  };
  const cambiarActivo = async (u, activo) => {
    try { await motor.api("PATCH", `/usuarios/${u.id}`, { activo }); cargar(); } catch (e) { setErr(e.message); }
  };
  const nuevoCodigo = async (u) => {
    const c = window.prompt(`Nuevo código de acceso para ${u.nombre} (mínimo 6 caracteres):`);
    if (!c) return;
    try { await motor.api("PATCH", `/usuarios/${u.id}`, { codigo: c }); setMsg(`Código actualizado para ${u.nombre}. Sus sesiones abiertas se cerraron.`); cargar(); } catch (e) { setErr(e.message); }
  };
  return (
    <SectionCard title="Usuarios y códigos de acceso" icon={UserCircle} subtitle="Solo Coordinación puede dar de alta o desactivar códigos. Los códigos se guardan cifrados en el servidor: no se pueden volver a ver, solo reemplazar.">
      {confirmar && (
        <ConfirmModal titulo="Desactivar usuario" texto={`${confirmar.nombre} no podrá volver a ingresar hasta que lo reactives. Su trabajo no se borra.`} accion="Desactivar"
          onCancel={() => setConfirmar(null)} onConfirm={() => { cambiarActivo(confirmar, false); setConfirmar(null); }} />
      )}
      <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.inkSoft, margin: "0 0 12px" }}>{usuarios.filter((u) => u.activo).length} usuarios activos · sin límite de cantidad.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 420, overflowY: "auto" }}>
        {usuarios.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${M.line}`, borderRadius: 8, padding: "8px 12px", opacity: u.activo ? 1 : 0.55 }}>
            <div>
              <p style={{ margin: 0, fontFamily: F_MONO, fontSize: 12, color: M.blueDeep }}>Código {u.codigo_pista || "…"}{!u.activo && " · desactivado"}</p>
              <p style={{ margin: 0, fontFamily: F_BODY, fontSize: 12.5, color: M.ink }}>{u.nombre} · {u.rol}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <GhostButton small onClick={() => nuevoCodigo(u)}>Nuevo código</GhostButton>
              {u.activo
                ? <GhostButton icon={Trash2} danger small onClick={() => setConfirmar(u)}>Desactivar</GhostButton>
                : <GhostButton small onClick={() => cambiarActivo(u, true)}>Reactivar</GhostButton>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
        <TextInput label="Código (mín. 6)" value={codigo} onChange={setCodigo} />
        <TextInput label="Nombre" value={nombre} onChange={setNombre} />
        <SelectInput label="Rol" value={rol} onChange={setRol} options={ROLES} />
        <div style={{ marginBottom: 16 }}><GhostButton icon={Plus} small onClick={add}>Agregar</GhostButton></div>
      </div>
      {msg && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.green }}>{msg}</p>}
      {err && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>{err}</p>}
    </SectionCard>
  );
}''')

A.rep('''          Cada módulo se completa en 10 pasos guiados (Identificación, Fundamentación, Arquitectura, Actividades, Recursos, Navegación, Consideraciones técnicas, Trazabilidad, Validación y Control de cambios).
          Podés cerrar la sesión en cualquier momento: todo lo que ya escribiste queda guardado y lo vas a encontrar tal cual al volver a entrar con tu código.
          Dentro de "Actividades", cada una de las 5 se completa en 9 sub-pasos.''','''          Los módulos están organizados por grado (1° a 6°). Dentro de cada grado se numeran solos, en orden de creación: Módulo 1, Módulo 2, etc.; el título lo elegís vos.
          Cada módulo se completa en pasos guiados (Identificación, Fundamentación, Arquitectura, Actividades, Recursos, Navegación, Consideraciones técnicas, Trazabilidad, Validación, Orientaciones didácticas, Estar Cerca, Mapa de Verbos y Control de cambios).
          Dentro de "Actividades", cada una de las 5 se completa en 9 sub-pasos.
          Todo se guarda solo en el servidor mientras escribís (arriba a la derecha ves "Guardando…" / "Guardado"). Si se corta Internet podés seguir trabajando: los cambios quedan en tu equipo y se envían solos cuando vuelve la conexión.
          Los campos marcados "tomado del módulo" no se escriben dos veces: se leen del dato original y se actualizan solos.''')

A.replace_func('BitacoraPanel','''function BitacoraPanel({ onClose }) {
  const [bitacora, setBitacora] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { motor.api("GET", "/bitacora?limite=500").then((r) => setBitacora(r.registros)).catch((e) => setErr(e.message)); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(46,45,44,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: M.card, borderRadius: 14, padding: 26, maxWidth: 680, width: "100%", maxHeight: "82vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: F_DISPLAY, fontSize: 17, fontWeight: 700, color: M.ink, margin: 0 }}>Registro de actividad</h3>
          <GhostButton small onClick={onClose}>Cerrar</GhostButton>
        </div>
        {err && <p style={{ fontFamily: F_BODY, fontSize: 13, color: M.red }}>{err}</p>}
        {!bitacora && !err && <p style={{ fontFamily: F_BODY, fontSize: 13, color: M.inkFaint }}>Cargando…</p>}
        {bitacora && bitacora.length === 0 && <p style={{ fontFamily: F_BODY, fontSize: 13, color: M.inkFaint }}>Todavía no hay registros.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(bitacora || []).map((b, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${M.line}`, paddingBottom: 6, fontFamily: F_BODY, fontSize: 12 }}>
              <span style={{ color: M.blueDeep, fontWeight: 600 }}>{b.nombre}</span> <span style={{ color: M.inkFaint }}>({b.rol})</span> — {b.accion}
              <span style={{ color: M.inkFaint }}> · {new Date(b.fecha).toLocaleString("es-AR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}''')
A.save(); print("p1 ok")
