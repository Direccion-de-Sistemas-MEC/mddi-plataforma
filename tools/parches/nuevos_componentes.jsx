/* ======================================================================
   UTILIDADES COMUNES (versión 2)
====================================================================== */

const AREAS = ["Matemática", "Lengua"];

function nombreModulo(m) {
  const n = m && m._meta && m._meta.numero;
  return `${n ? `Módulo ${n}` : "Módulo"} — ${(m && m.titulo) || "sin título"}`;
}

function ConfirmModal({ titulo, texto, accion = "Confirmar", onCancel, onConfirm, tone = "red" }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(46,45,44,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20 }} onClick={onCancel}>
      <div style={{ background: M.card, borderRadius: 14, padding: 24, maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <AlertTriangle size={18} color={M.red} />
          <h3 style={{ fontFamily: F_DISPLAY, fontSize: 17, fontWeight: 700, color: M.ink, margin: 0 }}>{titulo}</h3>
        </div>
        <p style={{ fontFamily: F_BODY, fontSize: 13.5, color: M.inkSoft, lineHeight: 1.5 }}>{texto}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <GhostButton onClick={onCancel}>Cancelar</GhostButton>
          <SolidButton tone={tone} onClick={onConfirm}>{accion}</SolidButton>
        </div>
      </div>
    </div>
  );
}

/* Texto del documento original que no tenía un campo específico en la
   plataforma (importación de los módulos existentes). Nada se descartó:
   queda acá, editable, para que el equipo lo mueva al campo que corresponda. */
function ImportadoPanel({ lista, filtro, onChange }) {
  const [borrar, setBorrar] = useState(null);
  const visibles = (lista || []).filter(filtro || (() => true));
  if (!visibles.length) return null;
  const upd = (id, texto) => onChange(lista.map((x) => (x.id === id ? { ...x, texto } : x)));
  return (
    <SectionCard title="Texto del documento original sin campo específico" icon={FileDown}
      subtitle="Estos párrafos vienen del documento Word importado y no tienen un campo exacto en este bloque. No se descartó nada: podés editarlos, copiar su contenido al campo que corresponda y, cuando ya no hagan falta, quitarlos.">
      {borrar && <ConfirmModal titulo="Quitar texto importado" texto={`Se quitará "${borrar.titulo}". Hacelo solo si ya pasaste este contenido a los campos correspondientes.`} accion="Quitar"
        onCancel={() => setBorrar(null)} onConfirm={() => { onChange(lista.filter((x) => x.id !== borrar.id)); setBorrar(null); }} />}
      {visibles.map((x) => (
        <div key={x.id} style={{ border: `1px dashed ${M.blueLight}`, borderRadius: 10, padding: 12, marginBottom: 10, background: M.blueSoft }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: F_BODY, fontSize: 12, fontWeight: 600, color: M.blueDeep }}>{x.titulo}</span>
            <GhostButton icon={Trash2} danger small onClick={() => setBorrar(x)} />
          </div>
          <textarea style={{ ...inputBase, resize: "vertical", lineHeight: 1.5, background: M.card }} rows={Math.min(14, Math.max(3, Math.ceil((x.texto || "").length / 110)))} value={x.texto} onChange={(e) => upd(x.id, e.target.value)} />
        </div>
      ))}
    </SectionCard>
  );
}

/* Campo vinculado (P): muestra el dato original del módulo. Única fuente de información. */
function Vinculado({ label, valor, origen, onIr }) {
  const vacio = !valor || !String(valor).trim();
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Label>{label}</Label>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F_BODY, fontSize: 10.5, fontWeight: 600, color: M.green, background: M.greenPale, borderRadius: 999, padding: "2px 8px" }}>
          <Link2 size={11} /> tomado del módulo{origen ? ` · ${origen}` : ""}
        </span>
        {onIr && <button type="button" onClick={onIr} style={{ background: "none", border: "none", color: M.blue, fontFamily: F_BODY, fontSize: 11.5, cursor: "pointer", padding: 0 }}>Editar en el origen →</button>}
      </div>
      <div style={{ ...inputBase, background: M.grayPale, color: vacio ? M.inkFaint : M.ink, whiteSpace: "pre-wrap", lineHeight: 1.5, minHeight: 20 }}>
        {vacio ? "Todavía no está cargado en el módulo." : valor}
      </div>
    </div>
  );
}

function Guia({ children }) {
  return <p style={{ fontFamily: F_BODY, fontSize: 12.5, fontStyle: "italic", color: M.inkFaint, margin: "0 0 12px", lineHeight: 1.5 }}>{children}</p>;
}

function Subtitulo({ children }) {
  return <p style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: 14, color: M.blueDeep, margin: "14px 0 6px" }}>{children}</p>;
}

function Checks({ items, valores, onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
      {items.map((it, i) => (
        <label key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: F_BODY, fontSize: 13, color: M.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={!!(valores || [])[i]} onChange={() => onToggle(i)} style={{ marginTop: 3 }} />
          <span>{it}</span>
        </label>
      ))}
    </div>
  );
}

/* Actualiza un campo anidado de forma inmutable: setIn(obj, ["a","b"], v) */
function setIn(obj, path, v) {
  if (!path.length) return v;
  const [k, ...rest] = path;
  return { ...(obj || {}), [k]: setIn((obj || {})[k], rest, v) };
}

/* ======================================================================
   ORGANIZACIÓN POR GRADOS (panel principal)
====================================================================== */

function GradosDashboard({ modules, onOpen, onNew, onDeleteRequest, role, grado, setGrado }) {
  const puedeCrear = role === "Docente de contenidos" || role === "Coordinación General";
  const porGrado = (n) => modules.filter((m) => m._meta && m._meta.grado === n).sort((a, b) => a._meta.numero - b._meta.numero);
  const lista = porGrado(grado);
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 24px 80px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10, marginBottom: 22 }}>
        {GRADOS.map((g) => {
          const activo = g.n === grado;
          const n = porGrado(g.n).length;
          return (
            <button key={g.n} onClick={() => setGrado(g.n)} data-grado={g.n} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${activo ? M.blue : M.line}`, background: activo ? M.blueSoft : M.card, textAlign: "left",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F_DISPLAY, fontWeight: 800, fontSize: 18, color: activo ? M.blueDeep : M.ink }}>
                <GraduationCap size={17} /> {g.corto} grado
              </span>
              <span style={{ fontFamily: F_BODY, fontSize: 12, color: M.inkSoft }}>{n === 0 ? "Sin módulos" : n === 1 ? "1 módulo" : `${n} módulos`}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: F_DISPLAY, fontSize: 24, fontWeight: 700, color: M.ink, margin: 0 }}>{grado}° grado — módulos</h1>
        {puedeCrear && <SolidButton icon={Plus} onClick={() => onNew(grado)}>Nuevo módulo en {grado}° grado</SolidButton>}
      </div>
      {lista.length === 0 && <EmptyHint text={`Todavía no hay módulos en ${grado}° grado.${puedeCrear ? " Creá el primero con 'Nuevo módulo': se numera solo como Módulo 1." : ""}`} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {lista.map((m) => <ModuleCard key={m.id} m={m} onOpen={() => onOpen(m.id)} onDelete={onDeleteRequest} role={role} />)}
      </div>
    </div>
  );
}

function PapeleraPanel({ onBack }) {
  const [lista, setLista] = useState(null);
  const [err, setErr] = useState("");
  const cargar = () => motor.api("GET", "/modulos-eliminados").then((r) => setLista(r.modulos)).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);
  const restaurar = async (m) => { try { await motor.restaurar(m.id); cargar(); } catch (e) { setErr(e.message); } };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 80px" }}>
      <TopBackLink onBack={onBack} label="Volver al panel" />
      <div style={{ marginTop: 14 }}>
        <SectionCard title="Papelera de módulos" icon={Archive} subtitle="Los módulos eliminados no se borran del servidor: quedan acá y se pueden restaurar con todo su contenido.">
          {err && <p style={{ fontFamily: F_BODY, fontSize: 13, color: M.red }}>{err}</p>}
          {lista && lista.length === 0 && <EmptyHint text="La papelera está vacía." />}
          {(lista || []).map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${M.line}`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
              <div style={{ fontFamily: F_BODY, fontSize: 12.5 }}>
                <strong>{m.grado}° grado · Módulo {m.numero} — {m.titulo || "sin título"}</strong>
                <p style={{ margin: 0, color: M.inkFaint }}>Eliminado por {m.eliminado_por} · {new Date(m.eliminado_en).toLocaleString("es-AR")}</p>
              </div>
              <GhostButton icon={Undo2} small onClick={() => restaurar(m)}>Restaurar</GhostButton>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

/* ======================================================================
   ESTADO DE GUARDADO, CONFLICTOS Y PRESENCIA
====================================================================== */

function IndicadorGuardado({ info, onConflictos, nConflictos }) {
  const e = info.estado;
  const conf = {
    guardado: { icon: Cloud, color: M.green, texto: info.ultimoGuardado ? `Guardado ${info.ultimoGuardado.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : "Guardado" },
    guardando: { icon: RefreshCw, color: M.blueDeep, texto: "Guardando…" },
    sin_conexion: { icon: CloudOff, color: "#8a6a00", texto: info.pendientes ? `Sin conexión · ${info.pendientes} módulo(s) con cambios guardados en este equipo` : "Sin conexión · podés seguir trabajando" },
    error: { icon: AlertTriangle, color: M.red, texto: "No se pudo guardar en el servidor · reintentando (tus cambios están en este equipo)" },
    sesion: { icon: AlertTriangle, color: M.red, texto: "Tu sesión venció · volvé a ingresar (no se perdió nada)" },
  }[e];
  const Icon = conf.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span data-testid="estado-guardado" data-estado={e} title={info.error || ""} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F_BODY, fontSize: 12, fontWeight: 600, color: conf.color, background: M.grayPale, borderRadius: 999, padding: "5px 12px" }}>
        <Icon size={14} /> {conf.texto}
      </span>
      {nConflictos > 0 && (
        <button onClick={onConflictos} style={{ fontFamily: F_BODY, fontSize: 12, fontWeight: 600, color: "#fff", background: M.orange, border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>
          {nConflictos} aviso(s) de edición simultánea
        </button>
      )}
    </div>
  );
}

const ETIQUETAS_RUTA = {
  actividades: "Actividad", fundamentacion: "Fundamentación", mate: "Matemática", lengua: "Lengua", momentos: "Momentos",
  orientacionesDidacticas: "Orientaciones didácticas", estarCerca: "Estar Cerca", mapaDeVerbos: "Mapa de Verbos",
  consigna: "Consigna", situacion: "Situación", mapa: "Mapa", pantallas: "Pantalla", interacciones: "Interacción", estados: "Estado",
  feedback: "Feedback", personaje: "Guion", sonido: "Sonido", casosLimite: "Caso límite", matriz: "Matriz", storyboard: "Storyboard",
  accesibilidad: "Accesibilidad", datos: "Datos", navFinal: "Finalización", titulo: "Título", subtitulo: "Subtítulo",
};
function rutaLegible(m, path) {
  if (!path || !path.length) return "Módulo completo";
  const partes = [];
  let o = m;
  for (const seg of path) {
    if (seg.startsWith("#")) {
      const it = Array.isArray(o) ? o.find((x) => x && x.id === seg.slice(1)) : null;
      if (it && it.numero) partes[partes.length - 1] = `Actividad ${it.numero}`;
      o = it;
    } else {
      partes.push(ETIQUETAS_RUTA[seg] || seg);
      o = o ? o[seg] : undefined;
    }
  }
  return partes.join(" › ");
}

function ConflictosPanel({ conflictos, modules, onClose }) {
  const [copiado, setCopiado] = useState(null);
  const texto = (v) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(46,45,44,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 75, padding: 20 }} onClick={onClose}>
      <div style={{ background: M.card, borderRadius: 14, padding: 24, maxWidth: 760, width: "100%", maxHeight: "84vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 700, color: M.ink, margin: 0 }}>Avisos de edición simultánea</h3>
          <GhostButton small onClick={onClose}>Cerrar</GhostButton>
        </div>
        <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.inkSoft, lineHeight: 1.5 }}>
          Otra persona modificó el mismo campo mientras vos también lo editabas. Para no borrar su trabajo, se conservó su versión y la tuya quedó guardada acá.
          Podés copiarla, o elegir "Usar mi versión" para reemplazarla (queda registrado en el control de cambios).
        </p>
        {conflictos.length === 0 && <EmptyHint text="No hay avisos pendientes." />}
        {conflictos.map((c) => {
          const m = modules.find((x) => x.id === c.moduloId);
          return (
            <div key={c.id} style={{ border: `1px solid ${M.line}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", fontFamily: F_BODY, fontSize: 12, color: M.inkFaint }}>{c.modulo} · {new Date(c.fecha).toLocaleString("es-AR")}</p>
              <p style={{ margin: "0 0 8px", fontFamily: F_BODY, fontSize: 13.5, fontWeight: 600, color: M.ink }}>
                {m ? rutaLegible(m, c.path) : "Módulo"}{c.por ? ` — modificado por ${c.por}` : ""}
              </p>
              {c.motivo && c.motivo !== "modificado_por_otro" && <p style={{ margin: "0 0 8px", fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>{c.motivo}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><Label>Tu versión</Label><pre style={{ ...inputBase, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", fontFamily: F_BODY, fontSize: 12.5 }}>{texto(c.tuValor)}</pre></div>
                <div><Label>Versión que quedó guardada</Label><pre style={{ ...inputBase, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", fontFamily: F_BODY, fontSize: 12.5, background: M.grayPale }}>{texto(c.valorActual)}</pre></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <GhostButton icon={Copy} small onClick={() => { navigator.clipboard && navigator.clipboard.writeText(texto(c.tuValor)); setCopiado(c.id); }}>{copiado === c.id ? "Copiado" : "Copiar mi versión"}</GhostButton>
                {c.path && c.path.length > 0 && m && <GhostButton small onClick={() => motor.usarMiVersion(c.id)}>Usar mi versión</GhostButton>}
                <GhostButton small onClick={() => motor.descartarConflicto(c.id)}>Mantener la guardada y cerrar aviso</GhostButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresenciaBanner({ otros }) {
  if (!otros || !otros.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: M.yellowPale, border: `1px solid ${M.yellow}`, borderRadius: 10, padding: "8px 14px", marginBottom: 14, fontFamily: F_BODY, fontSize: 12.5, color: M.ink }}>
      <Users size={15} /> También está trabajando en este módulo: <strong>{otros.map((o) => `${o.nombre} (${o.rol})`).join(", ")}</strong>. Los cambios de cada uno se combinan; si editan el mismo campo, la plataforma avisa en lugar de sobrescribir.
    </div>
  );
}

function ReingresoModal() {
  const [codigo, setCodigo] = useState(""); const [err, setErr] = useState("");
  const ir = async () => { try { await motor.ingresar(codigo, ""); } catch (e) { setErr("Código no reconocido o sin conexión."); } };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(46,45,44,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 20 }}>
      <div style={{ background: M.card, borderRadius: 14, padding: 24, maxWidth: 400, width: "100%" }}>
        <h3 style={{ fontFamily: F_DISPLAY, fontSize: 17, fontWeight: 700, color: M.ink, margin: "0 0 8px" }}>Tu sesión venció</h3>
        <p style={{ fontFamily: F_BODY, fontSize: 13, color: M.inkSoft }}>No se perdió nada: tus cambios están guardados en este equipo. Ingresá tu código y se enviarán al servidor.</p>
        <TextInput label="Código de acceso" value={codigo} onChange={setCodigo} />
        {err && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>{err}</p>}
        <SolidButton onClick={ir}>Volver a ingresar</SolidButton>
      </div>
    </div>
  );
}

function HistorialPanel({ m, role }) {
  const [h, setH] = useState(null); const [err, setErr] = useState(""); const [confirmar, setConfirmar] = useState(null);
  const cargar = () => motor.api("GET", `/modulos/${encodeURIComponent(m.id)}/historial`).then(setH).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, [m.id, m._meta && m._meta.version]);
  return (
    <SectionCard title="Historial automático de guardados" icon={History} subtitle="Cada guardado queda registrado en el servidor con usuario, fecha, hora y versión. Además se toma una copia completa del módulo cada 30 minutos de trabajo, al crearlo y antes de eliminarlo o restaurarlo.">
      {err && <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>{err}</p>}
      {confirmar && <ConfirmModal titulo="Restaurar copia" texto={`El módulo volverá a como estaba en la versión ${confirmar.version} (${new Date(confirmar.fecha).toLocaleString("es-AR")}). Antes se guarda una copia del estado actual, así que esta acción también se puede revertir.`} accion="Restaurar" tone="blue"
        onCancel={() => setConfirmar(null)} onConfirm={async () => { const s = confirmar; setConfirmar(null); try { await motor.restaurarInstantanea(m.id, s.id); cargar(); } catch (e) { setErr(e.message); } }} />}
      <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.inkSoft, margin: "0 0 10px" }}>Versión actual del registro: <strong>{m._meta ? m._meta.version : "—"}</strong>{m._meta && m._meta.actualizadoPor ? ` · último cambio: ${m._meta.actualizadoPor}, ${new Date(m._meta.actualizadoEn).toLocaleString("es-AR")}` : ""}</p>
      {h && (
        <>
          <Subtitulo>Copias completas</Subtitulo>
          {h.instantaneas.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${M.line}`, padding: "6px 0", fontFamily: F_BODY, fontSize: 12 }}>
              <span>v{s.version} · {new Date(s.fecha).toLocaleString("es-AR")} · {s.motivo} · {s.usuario}</span>
              {role === "Coordinación General" && <GhostButton small onClick={() => setConfirmar(s)}>Restaurar</GhostButton>}
            </div>
          ))}
          <Subtitulo>Últimos guardados</Subtitulo>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {h.cambios.map((c) => (
              <div key={c.id} style={{ borderBottom: `1px solid ${M.line}`, padding: "5px 0", fontFamily: F_BODY, fontSize: 12 }}>
                <strong>v{c.version}</strong> · {new Date(c.fecha).toLocaleString("es-AR")} · {c.usuario} ({c.rol}){c.hubo_conflictos ? " · con avisos de edición simultánea" : ""}
                <span style={{ color: M.inkFaint }}> — {c.rutas.slice(0, 4).map((r) => rutaLegible(m, r.split("/").filter(Boolean))).join("; ")}{c.rutas.length > 4 ? ` y ${c.rutas.length - 4} más` : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

/* ======================================================================
   BLOQUE NUEVO — ORIENTACIONES DIDÁCTICAS
   Fuente: Plantilla_guia_pedagogica_Educaplay_v2.docx
====================================================================== */

const OD_VARIANTES = ["Uso simultáneo (grupo total)", "Subgrupos rotativos", "En estaciones"];
const OD_TIPOS_DESCONECTADA = ["Juego de mesa o cartas", "Material concreto", "Juego corporal", "Juego dramático o títeres", "Oralidad y palabra", "Producción gráfica", "Exploración del entorno"];
const OD_CHECK_DESCONECTADA = [
  "Equivalencia pedagógica: trabaja el mismo contenido y propósito que el módulo.",
  "Autonomía respecto de la pantalla: se entiende y funciona sin haber visto el módulo.",
  "Materiales accesibles: elementos disponibles en cualquier aula, preparables con anticipación o a mano.",
  "Dos formas de organización: en subgrupo autónomo y conducida con todo el grado.",
  "Duración similar al módulo, para facilitar la rotación.",
];

function StepOrientaciones({ m, updateModule, irA }) {
  const od = m.orientacionesDidacticas;
  const set = (path) => (v) => updateModule((mm) => ({ ...mm, orientacionesDidacticas: setIn(mm.orientacionesDidacticas, path, v) }));
  const T = (path, label, guia, rows = 2) => <TextArea label={label} help={guia} value={path.reduce((o, k) => (o || {})[k], od)} onChange={set(path)} rows={rows} />;
  const refCurricular = [m.ejeCurricular && `Eje curricular: ${m.ejeCurricular}`, m.contenido && `Contenido: ${m.contenido}`, m.fundamentacion.relacionCurricular].filter(Boolean).join("\n\n");
  const objetivos = m.fundamentacion.aprendizajeEsperado;
  const objetivosActividades = m.actividades.map((a) => a.objetivo && `Actividad ${a.numero}${a.nombre ? ` — ${a.nombre}` : ""}: ${a.objetivo}`).filter(Boolean).join("\n\n");
  const ec = m.estarCerca;
  return (
    <>
      <SectionCard title="Orientaciones didácticas — Guía pedagógica docente" icon={Compass}
        subtitle="Completar cada componente en el orden indicado, en lenguaje claro y concreto, dirigiéndose al docente en segunda persona (vos). Extensión orientativa: entre dos y cuatro carillas de contenido operativo.">
        <div style={{ background: M.greenPale, borderRadius: 8, padding: "10px 14px", fontFamily: F_BODY, fontSize: 12.5, color: M.green }}>
          Los componentes marcados con (P) ya están cargados en el módulo: se muestran acá automáticamente y se actualizan solos si cambia el dato original. No hace falta redactarlos de nuevo.
        </div>
      </SectionCard>

      <SectionCard title="1. Ficha técnica (P)" icon={FileText} subtitle="Encabezado breve que ubica la actividad.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Vinculado label="Grado" valor={m.grado} origen="Identificación" onIr={() => irA("identificacion")} />
          <Vinculado label="Área" valor={m.area} origen="Identificación" onIr={() => irA("identificacion")} />
        </div>
        <Vinculado label="Nombre del módulo" valor={nombreModulo(m) + (m.subtitulo ? `\n${m.subtitulo}` : "")} origen="Identificación" onIr={() => irA("identificacion")} />
        <Vinculado label="Duración estimada (de la actividad completa)" valor={m.duracionEstimada} origen="Identificación" onIr={() => irA("identificacion")} />
        <Vinculado label="Referencias curriculares" valor={refCurricular} origen="Identificación y Fundamentación" onIr={() => irA("fundamentacion")} />
      </SectionCard>

      <SectionCard title="2. Objetivos de aprendizaje (P)" icon={Target} subtitle="Qué se espera lograr con el módulo.">
        <Vinculado label="Objetivo(s) de contenido — aprendizaje esperado del módulo" valor={objetivos} origen="Fundamentación" onIr={() => irA("fundamentacion")} />
        <Vinculado label="Objetivos de cada actividad" valor={objetivosActividades} origen="Actividades" onIr={() => irA("actividades")} />
      </SectionCard>

      <SectionCard title="3. Actividad inicial" icon={Lightbulb} subtitle="Trabajo de los chicos antes de ingresar al módulo interactivo o a la actividad desconectada.">
        {T(["inicial", "relacionModulo"], "Relación con el módulo", "")}
        <Subtitulo>Organización de la interacción en el aula</Subtitulo>
        <Guia>Elegí una variante: uso simultáneo (grupo total), subgrupos rotativos o en estaciones.</Guia>
        <SelectInput label="Variante elegida" value={od.inicial.varianteElegida} onChange={set(["inicial", "varianteElegida"])} options={OD_VARIANTES} />
        {T(["inicial", "mediacionDocente"], "Mediación docente que habilita", "Sostener la atención del grupo total / brindar ayudas específicas / mediar conflictos de a un grupo, según la variante")}
        <Subtitulo>Propuesta de actividad de inicio</Subtitulo>
        {(ec.tarjeta.ideaBreve || m.titulo) && (
          <p style={{ fontFamily: F_BODY, fontSize: 12, color: M.inkSoft, margin: "0 0 6px" }}>
            Propuesta de Estar Cerca de este módulo: <strong>{m.titulo || "sin título"}</strong>{ec.tarjeta.ideaBreve ? ` — ${ec.tarjeta.ideaBreve}` : " (todavía sin idea breve)"} ·{" "}
            <button type="button" onClick={() => irA("estarCerca")} style={{ background: "none", border: "none", color: M.blue, cursor: "pointer", padding: 0, fontSize: 12 }}>ver Estar Cerca</button>
          </p>
        )}
        {T(["inicial", "estarCercaRetomada"], "Actividad de Estar Cerca retomada", "O versión breve para el aula si no todos la realizaron")}
        {T(["inicial", "presentacionDesafio"], "Presentación del desafío", "Situación narrativa o personaje del módulo, si lo tiene (relato breve, lámina, títere)")}
        {T(["inicial", "preguntasDisparadoras"], "Preguntas disparadoras", "Para recuperar lo que los chicos ya saben y despertar el interés")}
        {T(["inicial", "consignaInicio"], "Consigna de la actividad de inicio", "Breve y pensada para decirse en voz alta")}
        {T(["inicial", "queObservar"], "Qué observar", "Qué saben ya los chicos, qué dudas o ideas aparecen, y qué ajustar en el desarrollo")}
        {T(["inicial", "puenteDesarrollo"], "Puente hacia el desarrollo", "Cómo se conecta con lo que sigue, en el módulo o en la actividad desconectada")}
      </SectionCard>

      <SectionCard title="4. Actividad de desarrollo" icon={PlayCircle} subtitle="Trabajo de los chicos en el módulo interactivo; si no hay conexión, se reemplaza por la actividad desconectada.">
        <Field label="Actividad del módulo propuesta">
          <select style={{ ...inputBase, cursor: "pointer" }} value={od.desarrollo.actividadModulo} onChange={(e) => set(["desarrollo", "actividadModulo"])(e.target.value)}>
            <option value="">— Elegir —</option>
            <option value="todas">Las 5 actividades del módulo</option>
            {m.actividades.map((a) => <option key={a.id} value={a.id}>Actividad {a.numero} — {a.nombre || MOMENTOS[a.numero - 1].label}</option>)}
          </select>
          <Help text="La lista se toma de las actividades del módulo: si cambia un nombre, se actualiza acá." />
        </Field>
        <TextInput label="Duración aproximada" value={od.desarrollo.duracion} onChange={set(["desarrollo", "duracion"])} />
        {T(["desarrollo", "organizacionGrupo"], "Organización del grupo", "Ver variantes de Actividad inicial, y qué hace el docente mientras los subgrupos trabajan")}
        <Subtitulo>Preguntas e intervenciones durante el juego</Subtitulo>
        <Guia>Sin dar la respuesta ni superponerse con la retroalimentación del módulo.</Guia>
        {T(["desarrollo", "relanzarInteres"], "Para relanzar el interés", "Cuando el grupo se dispersa o se aburre")}
        {T(["desarrollo", "profundizarReflexion"], "Para profundizar la reflexión", "Sobre lo que están haciendo")}
        <Subtitulo>Intervenciones ante dificultades frecuentes</Subtitulo>
        {T(["desarrollo", "erroresContenido"], "Errores propios del contenido", "Anticipados por quien escribe la guía, con una sugerencia para cada uno", 3)}
        {T(["desarrollo", "bloqueos"], "Bloqueos", "Qué hacer cuando un chico o una chica no avanza o abandona")}
        {T(["desarrollo", "desacuerdos"], "Desacuerdos entre compañeros", "Como oportunidad para comparar estrategias")}
        {T(["desarrollo", "conflictosConvivencia"], "Conflictos de convivencia", "Turnos, uso compartido del dispositivo")}
        <Subtitulo>Qué observar</Subtitulo>
        {T(["desarrollo", "indiciosAprendizaje"], "Indicios de aprendizaje", "Señales de que están comprendiendo el contenido o usando la estrategia buscada")}
        {T(["desarrollo", "senalesRitmo"], "Señales para ajustar el ritmo", "Qué indica que conviene acelerar, pausar o repetir un tramo")}
        <Subtitulo>Actividad desconectada</Subtitulo>
        <Guia>Variantes sin pantalla que NO involucran el módulo. Se usan como complemento (subgrupos que rotan) o como reemplazo (cuando el módulo no se puede usar; en ese caso, todo el grado trabaja con ella).</Guia>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <SelectInput label="Uso en esta guía" help="Complemento o reemplazo" value={od.desarrollo.desconectada.uso} onChange={set(["desarrollo", "desconectada", "uso"])} options={["Complemento", "Reemplazo"]} />
          <SelectInput label="Tipo de actividad" value={od.desarrollo.desconectada.tipo} onChange={set(["desarrollo", "desconectada", "tipo"])} options={OD_TIPOS_DESCONECTADA} />
        </div>
        <Label>Antes de redactarla, verificá que cumpla:</Label>
        <div style={{ marginTop: 8 }}>
          <Checks items={OD_CHECK_DESCONECTADA} valores={od.desarrollo.desconectada.checklist}
            onToggle={(i) => set(["desarrollo", "desconectada", "checklist"])(OD_CHECK_DESCONECTADA.map((_, j) => (j === i ? !(od.desarrollo.desconectada.checklist || [])[j] : !!(od.desarrollo.desconectada.checklist || [])[j])))} />
        </div>
        {T(["desarrollo", "desconectada", "consignaTrabajo"], "Consigna de trabajo", "")}
        {T(["desarrollo", "desconectada", "propuesta"], "Propuesta de actividad", "", 3)}
        {T(["desarrollo", "desconectada", "queHaceMaestra"], "Qué hace y dice la maestra", "Mientras transcurre: dinamizar, sostener afectivamente al grupo, favorecer la rotación de turnos")}
        {T(["desarrollo", "desconectada", "queObservar"], "Qué observar", "Indicios de que los chicos están aprendiendo lo que se busca")}
      </SectionCard>

      <SectionCard title="5. Actividad de cierre" icon={CheckCircle2} subtitle="Trabajo posterior a la interacción con el módulo o a la actividad desconectada. Breve (entre 5 y 10 minutos) y anclada en lo que efectivamente pasó.">
        {T(["cierre", "actividadBreve"], "Actividad breve de cierre", "Indicar si además funciona como repaso, refuerzo o aplicación a una situación nueva")}
        {T(["cierre", "preguntas"], "Una o dos preguntas concretas", "Qué decidieron / qué estrategia usaron / dónde se trabaron / qué pueden usar en otra situación")}
        {T(["cierre", "aporteDocente"], "Aporte del docente", "Cómo retoma lo que dijeron los chicos y nombra el saber trabajado, en palabras sencillas")}
        {T(["cierre", "puestaEnComun"], "Puesta en común entre subgrupos", "Si se trabajó de forma rotativa o por estaciones; comparar estrategias, no solo resultados")}
        {T(["cierre", "formaRegistro"], "Forma de registrar o visibilizar lo aprendido", "Oral, dibujo, dictado al docente, escritura propia o afiche colectivo del grado")}
      </SectionCard>

      <SectionCard title="6. Opciones para el cuaderno" icon={BookOpen} subtitle="Qué queda en el cuaderno, como huella visible para la familia, de lo que pasó antes, durante o después del paso por la plataforma.">
        {T(["cuaderno", "consignaRegistro"], "Consigna de qué queda registrado", "En lo posible, que muestre lo que pensaron, probaron o descubrieron, no solo un resultado. Puede coincidir con el registro de Cierre")}
        <SelectInput label="Momento de la secuencia" help="Inicio, desarrollo o cierre" value={od.cuaderno.momento} onChange={set(["cuaderno", "momento"])} options={["Inicio", "Desarrollo", "Cierre"]} />
        {T(["cuaderno", "formato"], "Formato de registro", "Dibujo, dictado a la maestra, pegado de una tarjeta, escritura propia, acorde a 6-8 años")}
        {T(["cuaderno", "mensajeFamilia"], "Mensaje para la familia", "Título, frase breve o pregunta para conversar en casa; si es posible, vincular con una propuesta de Estar Cerca")}
      </SectionCard>

      <SectionCard title="7. Materiales y recursos" icon={Package} subtitle="Requisitos físicos o digitales para la implementación.">
        {T(["materiales", "digitales"], "Recursos digitales", "Tipo y cantidad de dispositivos (por chico, por pareja o por grupo), conectividad, enlace o código QR de acceso, y audio (parlantes o auriculares) si hace falta")}
        {T(["materiales", "analogicos"], "Recursos analógicos", "Materiales para inicio, cierre y actividades desconectadas, con cantidades aproximadas. Si hay imprimibles, indicar en qué anexo están y cómo reemplazarlos si no se pueden imprimir")}
        {T(["materiales", "preparacion"], "Preparación previa", "Organización del aula o del espacio, y verificación técnica antes de la clase (dispositivos cargados, enlace probado, módulo abierto)")}
      </SectionCard>

      <SectionCard title="8. Referencias bibliográficas" icon={BookOpen} subtitle="En la medida de lo posible, anclar las decisiones didácticas en autores y documentos reconocidos de la didáctica de la Lengua, la Matemática o la enseñanza a través del juego. Formato APA 7. Si el equipo no cuenta con la referencia exacta, señalarla como pendiente de verificación.">
        {T(["referencias", "referencias"], "Referencia(s)", "Autor, año, fuente", 4)}
        <SelectInput label="Estado" value={od.referencias.estado} onChange={set(["referencias", "estado"])} options={["Verificada", "Pendiente de verificación"]} />
      </SectionCard>
    </>
  );
}

/* ======================================================================
   BLOQUE NUEVO — ESTAR CERCA (Sección Acompañar)
   Fuente: Plantilla_Acompanar_propuestas_para_casa.docx
====================================================================== */

const EC_CONTROL = [
  "La propuesta responde de manera directa al módulo relacionado y se reconoce algo de él (personaje, palabra, imagen o situación).",
  "Se hace con objetos, lugares o personas reales del entorno de las familias, sin materiales que haya que comprar.",
  "Es una experiencia compartida (conversar, mirar, buscar, jugar, contar), no una tarea escolar ni un ejercicio.",
  "Se puede hacer en 15 minutos o menos, y tiene una alternativa para poco tiempo y otra sin materiales.",
  "Las preguntas son abiertas y no hay una única respuesta correcta.",
  "El lenguaje es claro, cálido y no requiere saberes escolares del adulto.",
  "No se evalúa ni se pide devolución obligatoria a la escuela.",
];

function StepEstarCerca({ m, updateModule, irA }) {
  const ec = m.estarCerca;
  const set = (path) => (v) => updateModule((mm) => ({ ...mm, estarCerca: setIn(mm.estarCerca, path, v) }));
  const T = (path, label, guia, rows = 2) => <TextArea label={label} help={guia} value={path.reduce((o, k) => (o || {})[k], ec)} onChange={set(path)} rows={rows} />;
  const verbosMapa = m.mapaDeVerbos.aprendizajes.map((a) => a.verbo).filter(Boolean);
  const idea = ec.tarjeta.ideaBreve || "";
  return (
    <>
      <SectionCard title="Estar Cerca — Sección Acompañar · Propuestas para hacer en casa y en la comunidad" icon={HeartHandshake}
        subtitle="Cada módulo tiene una propuesta breve para que un adulto o una persona cercana la comparta con el niño o la niña fuera de la escuela. Escribí en voseo y en tono cálido, como si le hablaras directamente a quien acompaña.">
        <Subtitulo>Datos de la propuesta</Subtitulo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <TextInput label="Sección" help="Ya definida" value="Acompañar" disabled />
          <TextInput label="Subsección" help="Por ejemplo: Estar cerca" value={ec.subseccion} onChange={set(["subseccion"])} />
        </div>
        <Vinculado label="Módulo relacionado" valor={`${m.grado} · ${nombreModulo(m)}`} origen="Identificación" onIr={() => irA("identificacion")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Vinculado label="Área y grado" valor={`${m.area} — ${m.grado}`} origen="Identificación" onIr={() => irA("identificacion")} />
          <Vinculado label="Docente/s" valor={m.docentesResponsables} origen="Identificación" onIr={() => irA("identificacion")} />
        </div>
      </SectionCard>

      <SectionCard title="A. Tarjeta (lo que se ve en el listado)" icon={FileText} subtitle="Es lo primero que lee el adulto: tiene que invitar a hacer algo concreto.">
        <Vinculado label="Título — el mismo del módulo relacionado" valor={m.titulo} origen="Identificación" onIr={() => irA("identificacion")} />
        <TextArea label="Idea breve" help={`Entre 2 y 3 oraciones (aprox. 200 caracteres). Empezá con un verbo de acción: "Busquen…", "Salgan a mirar…", "Contá…" · ${idea.length} caracteres`} value={idea} onChange={set(["tarjeta", "ideaBreve"])} rows={3} />
        <TextInput label="Tiempo aproximado" help="Ej.: 10 minutos · 10 a 15 minutos (máximo 15)" value={ec.tarjeta.tiempo} onChange={set(["tarjeta", "tiempo"])} />
      </SectionCard>

      <SectionCard title="B. Vínculo entre el módulo, la escuela y la sociedad" icon={Link2} subtitle="Este bloque es para el equipo: garantiza que la propuesta no sea una tarea escolar trasladada a la casa. No se muestra a las familias.">
        {T(["vinculo", "queRetoma"], "¿Qué del módulo retoma?", "Personaje, palabra, imagen o situación que el niño o la niña ya conoce del módulo")}
        {T(["vinculo", "conexionComunidad"], "¿Con qué de la vida cotidiana o la comunidad se conecta?", "Objeto, lugar, persona, oficio, costumbre o paisaje real de su entorno (la casa, la vereda, el barrio, la feria, el río…)")}
        {T(["vinculo", "queHaceNino"], "¿Qué hace el niño o la niña?", "Acción concreta, observable, que no requiera lápiz y papel ni una respuesta \"correcta\"")}
        <Field label="Verbo del Mapa de Verbos" >
          <input style={inputBase} value={ec.vinculo.verbo} onChange={(e) => set(["vinculo", "verbo"])(e.target.value.toUpperCase())} list="ec-verbos" placeholder="Un solo verbo en mayúsculas. Ej.: COMPARAR" />
          <datalist id="ec-verbos">{[...new Set([...verbosMapa, ...VERBOS_LISTA])].map((v) => <option key={v} value={v} />)}</datalist>
          {verbosMapa.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
              <span style={{ fontFamily: F_BODY, fontSize: 11.5, color: M.inkFaint }}>Verbos ya elegidos en el Mapa de Verbos de este módulo:</span>
              {verbosMapa.map((v) => <button key={v} type="button" onClick={() => set(["vinculo", "verbo"])(v)} style={chipStyle(ec.vinculo.verbo === v)}>{v}</button>)}
            </div>
          )}
          <Help text="Un solo verbo en mayúsculas. Ej.: COMPARAR" />
        </Field>
        {T(["vinculo", "comoApareceEscuela"], "¿Cómo aparece esto después en la escuela?", "Cómo el docente podría retomar lo que el niño cuente o traiga, sin evaluarlo")}
      </SectionCard>

      <SectionCard title="C. Página de la propuesta (lo que se ve al abrir la tarjeta)" icon={BookOpen}>
        {T(["pagina", "consignaPrincipal"], "Consigna principal", "Una o dos oraciones, con una acción que se pueda hacer hoy, con lo que hay a mano. Suele coincidir con la idea breve de la tarjeta, con un poco más de detalle")}
        <TextInput label="Con quién" help="Alguien que acompañe (familiar, vecino, hermanos, primos, amigos…)" value={ec.pagina.conQuien} onChange={set(["pagina", "conQuien"])} />
        {T(["pagina", "materiales"], "Materiales", "Solo elementos cotidianos que hay en casa o en el entorno: cucharas, tapitas, semillas, frutas, la vereda, el patio")}
        <Subtitulo>Algunas preguntas para conversar</Subtitulo>
        <Guia>Tres preguntas abiertas, sin una única respuesta correcta, que el adulto pueda decir tal cual. Evitá las que se responden con sí o no.</Guia>
        <TextInput label="Pregunta 1" value={ec.pagina.pregunta1} onChange={set(["pagina", "pregunta1"])} />
        <TextInput label="Pregunta 2" value={ec.pagina.pregunta2} onChange={set(["pagina", "pregunta2"])} />
        <TextInput label="Pregunta 3" value={ec.pagina.pregunta3} onChange={set(["pagina", "pregunta3"])} />
        {T(["pagina", "paraQuienAcompana"], "Para quien acompaña", "Un mensaje breve y tranquilizador: cómo acompañar sin resolver por el niño o la niña (Ej.: \"No es necesario decirle al niño cómo resolverlo. Podés preguntarle…\")")}
        {T(["pagina", "siQuierenSeguir"], "Si quieren seguir", "Una variante o extensión para quien quiera prolongar el juego")}
        {T(["pagina", "paraLlevarEscuela"], "Para llevar a la escuela (opcional)", "Cómo el niño o la niña puede contar lo que hizo: con objetos, con un dibujo o con palabras")}
        {T(["pagina", "pocoTiempo"], "Otras formas de hacerlo — Si hay poco tiempo", "")}
        {T(["pagina", "sinObjetos"], "Otras formas de hacerlo — Si no hay objetos", "Alternativa sin materiales: los dedos, las manos, el patio, la vereda…")}
        <div style={{ background: M.orangePale, borderRadius: 8, padding: "10px 14px", marginTop: 4 }}>
          <p style={{ margin: "0 0 2px", fontFamily: F_BODY, fontSize: 11, color: M.inkFaint, textTransform: "uppercase" }}>Texto fijo al pie de cada propuesta (no se edita)</p>
          <p data-testid="ec-texto-fijo" style={{ margin: 0, fontFamily: F_BODY, fontSize: 13.5, color: M.ink }}>{ESTAR_CERCA_TEXTO_FIJO}</p>
        </div>
      </SectionCard>

      <SectionCard title="Control antes de entregar" icon={CheckCircle2}>
        <Checks items={EC_CONTROL} valores={ec.control} onToggle={(i) => set(["control"])(EC_CONTROL.map((_, j) => (j === i ? !(ec.control || [])[j] : !!(ec.control || [])[j])))} />
      </SectionCard>
    </>
  );
}

/* ======================================================================
   BLOQUE NUEVO — MAPA DE VERBOS (Aprendizajes en acción)
   Fuente: Cuadro_Mapa_de_Verbos.docx
====================================================================== */

const chipStyle = (activo, nuevo) => ({
  padding: "4px 10px", borderRadius: 999, fontSize: 12, fontFamily: F_BODY, fontWeight: 600, cursor: "pointer",
  border: `1px solid ${activo ? M.blue : M.line}`, background: activo ? M.blue : nuevo ? M.orangePale : M.card, color: activo ? "#fff" : M.inkSoft,
});

function SelectorVerbo({ valor, esNuevo, onElegir, etiqueta }) {
  const [otro, setOtro] = useState(esNuevo ? valor : "");
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{etiqueta}</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
        {VERBOS_CATEGORIAS.map((c) => (
          <div key={c.cat} style={{ border: `1px solid ${M.line}`, borderRadius: 8, padding: 8, background: M.cream }}>
            <p style={{ margin: "0 0 6px", fontFamily: F_DISPLAY, fontWeight: 700, fontSize: 11.5, color: M.blueDeep }}>{c.cat}</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {c.verbos.map((v) => {
                const V = v.toUpperCase();
                return <button key={c.cat + v} type="button" data-verbo={V} onClick={() => { setOtro(""); onElegir(valor === V && !esNuevo ? "" : V, false); }} style={chipStyle(valor === V && !esNuevo)}>{v}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <input style={{ ...inputBase, marginTop: 0, maxWidth: 280 }} placeholder="Otro verbo (propuesta nueva)" value={otro}
          onChange={(e) => { const v = e.target.value.toUpperCase(); setOtro(v); onElegir(v, !!v); }} />
        {esNuevo && valor && <span style={chipStyle(false, true)}>{valor} · propuesta nueva</span>}
      </div>
    </div>
  );
}

function StepMapaVerbos({ m, updateModule, irA }) {
  const mv = m.mapaDeVerbos;
  const setMV = (fn) => updateModule((mm) => ({ ...mm, mapaDeVerbos: fn(mm.mapaDeVerbos) }));
  const setAp = (id, patch) => setMV((x) => ({ ...x, aprendizajes: x.aprendizajes.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  return (
    <>
      <SectionCard title="Mapa de Verbos — Cuadro de aprendizajes en acción" icon={Tags} subtitle="Aprendizajes en Acción · Sección Acompañar">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Vinculado label="Módulo" valor={nombreModulo(m)} origen="Identificación" onIr={() => irA("identificacion")} />
          <TextInput label="Actividad o experiencia" value={mv.actividadExperiencia} onChange={(v) => setMV((x) => ({ ...x, actividadExperiencia: v }))} />
          <Vinculado label="Grado y área" valor={`${m.grado} · ${m.area}`} origen="Identificación" onIr={() => irA("identificacion")} />
          <Vinculado label="Docente/s" valor={m.docentesResponsables} origen="Identificación" onIr={() => irA("identificacion")} />
        </div>
        <div style={{ background: M.yellowPale, borderRadius: 8, padding: "10px 14px", fontFamily: F_BODY, fontSize: 12.8, color: M.ink, lineHeight: 1.5 }}>
          <strong>Regla de oro:</strong> escribí lo que el niño o la niña hace, piensa, explora o construye a partir de la experiencia, no lo que se pretende enseñar. Elegí entre 2 y 3 aprendizajes principales, con un solo verbo por aprendizaje (en mayúsculas y sin agregados: COMPARAR, no "comparar cantidades"). Si ningún verbo de la lista sirve, escribí el que te parezca adecuado y marcalo como propuesta nueva.
        </div>
      </SectionCard>

      {mv.aprendizajes.map((a, i) => (
        <SectionCard key={a.id} title={`Aprendizaje ${i + 1}`} icon={Sparkles} subtitle={i === 2 ? "Opcional (entre 2 y 3 aprendizajes principales)" : undefined}
          right={a.verbo ? <span style={chipStyle(true)}>{a.verbo}</span> : null}>
          <SelectorVerbo etiqueta="1. Verbo de aprendizaje" valor={a.verbo} esNuevo={a.verboNuevo} onElegir={(v, nuevo) => setAp(a.id, { verbo: v, verboNuevo: nuevo })} />
          <Field label="Otro verbo que consideré (opcional)">
            <input style={inputBase} list="mv-verbos" value={a.otroVerbo} onChange={(e) => setAp(a.id, { otroVerbo: e.target.value.toUpperCase() })} />
          </Field>
          <TextArea label="2. ¿Qué hace el niño o la niña?" help="1 o 2 oraciones, en 3.ª persona, con la acción concreta" value={a.queHace} onChange={(v) => setAp(a.id, { queHace: v })} rows={2} />
          <TextArea label="3. ¿Qué puede empezar a comprender, construir o hacer?" help="Lenguaje claro que una familia pueda reconocer" value={a.queComprende} onChange={(v) => setAp(a.id, { queComprende: v })} rows={2} />
          <TextArea label="4. Referencia curricular" help={`Eje, contenido o aprendizaje del Diseño Curricular (para el equipo docente).${m.ejeCurricular ? ` En este módulo: ${m.ejeCurricular}.` : ""}`} value={a.referenciaCurricular} onChange={(v) => setAp(a.id, { referenciaCurricular: v })} rows={2} />
        </SectionCard>
      ))}
      <datalist id="mv-verbos">{VERBOS_LISTA.map((v) => <option key={v} value={v} />)}</datalist>

      <SectionCard title="Ejemplo de referencia (de la plantilla, no editable)" icon={Info}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 110px 1fr 1fr 1fr", gap: 8, fontFamily: F_BODY, fontSize: 12, color: M.inkSoft }}>
          <strong>Verbo</strong><strong>Otro verbo</strong><strong>¿Qué hace?</strong><strong>¿Qué puede comprender?</strong><strong>Referencia curricular</strong>
          <span>COMPARAR</span><span>DECIDIR</span>
          <span>Compara las cantidades que muestran dos cartas para decidir cuál puede llevarse.</span>
          <span>Que las cantidades se pueden comparar para saber cuál es mayor, y que hay distintas formas de hacerlo, por ejemplo contar o hacer corresponder una a una.</span>
          <span>Matemática · Eje Número y Operaciones · Números naturales: comparación de colecciones con distintas estrategias.</span>
        </div>
      </SectionCard>
      <SectionCard title="Control" icon={CheckCircle2}>
        <Checks items={["Una familia reconocería rápidamente qué está haciendo su hijo o hija y qué aprendizaje está involucrado."]} valores={[mv.checkFamilia]} onToggle={() => setMV((x) => ({ ...x, checkFamilia: !x.checkFamilia }))} />
      </SectionCard>
    </>
  );
}

/* Secciones nuevas para el documento final (vista y descarga .md) */
function seccionesNuevasDocumento(m) {
  const od = m.orientacionesDidacticas, ec = m.estarCerca, mv = m.mapaDeVerbos;
  const act = od.desarrollo.actividadModulo === "todas" ? "Las 5 actividades del módulo" : (m.actividades.find((a) => a.id === od.desarrollo.actividadModulo) ? `Actividad ${m.actividades.find((a) => a.id === od.desarrollo.actividadModulo).numero} — ${m.actividades.find((a) => a.id === od.desarrollo.actividadModulo).nombre}` : "");
  const dc = od.desarrollo.desconectada;
  return [
    { titulo: "Orientaciones didácticas", filas: [
      ["1. Ficha técnica (P)", ""], ["Grado", m.grado], ["Área", m.area], ["Nombre del módulo", nombreModulo(m)], ["Duración estimada", m.duracionEstimada], ["Referencias curriculares", m.fundamentacion.relacionCurricular],
      ["2. Objetivos de aprendizaje (P)", ""], ["Objetivo(s) de contenido", m.fundamentacion.aprendizajeEsperado],
      ["3. Actividad inicial", ""], ["Relación con el módulo", od.inicial.relacionModulo], ["Variante elegida", od.inicial.varianteElegida], ["Mediación docente que habilita", od.inicial.mediacionDocente],
      ["Actividad de Estar Cerca retomada", od.inicial.estarCercaRetomada], ["Presentación del desafío", od.inicial.presentacionDesafio], ["Preguntas disparadoras", od.inicial.preguntasDisparadoras],
      ["Consigna de la actividad de inicio", od.inicial.consignaInicio], ["Qué observar", od.inicial.queObservar], ["Puente hacia el desarrollo", od.inicial.puenteDesarrollo],
      ["4. Actividad de desarrollo", ""], ["Actividad del módulo propuesta", act], ["Duración aproximada", od.desarrollo.duracion], ["Organización del grupo", od.desarrollo.organizacionGrupo],
      ["Para relanzar el interés", od.desarrollo.relanzarInteres], ["Para profundizar la reflexión", od.desarrollo.profundizarReflexion],
      ["Errores propios del contenido", od.desarrollo.erroresContenido], ["Bloqueos", od.desarrollo.bloqueos], ["Desacuerdos entre compañeros", od.desarrollo.desacuerdos], ["Conflictos de convivencia", od.desarrollo.conflictosConvivencia],
      ["Indicios de aprendizaje", od.desarrollo.indiciosAprendizaje], ["Señales para ajustar el ritmo", od.desarrollo.senalesRitmo],
      ["Actividad desconectada — uso", dc.uso], ["Tipo de actividad", dc.tipo], ["Consigna de trabajo", dc.consignaTrabajo], ["Propuesta de actividad", dc.propuesta], ["Qué hace y dice la maestra", dc.queHaceMaestra], ["Qué observar", dc.queObservar],
      ["5. Actividad de cierre", ""], ["Actividad breve de cierre", od.cierre.actividadBreve], ["Una o dos preguntas concretas", od.cierre.preguntas], ["Aporte del docente", od.cierre.aporteDocente], ["Puesta en común entre subgrupos", od.cierre.puestaEnComun], ["Forma de registrar o visibilizar lo aprendido", od.cierre.formaRegistro],
      ["6. Opciones para el cuaderno", ""], ["Consigna de qué queda registrado", od.cuaderno.consignaRegistro], ["Momento de la secuencia", od.cuaderno.momento], ["Formato de registro", od.cuaderno.formato], ["Mensaje para la familia", od.cuaderno.mensajeFamilia],
      ["7. Materiales y recursos", ""], ["Recursos digitales", od.materiales.digitales], ["Recursos analógicos", od.materiales.analogicos], ["Preparación previa", od.materiales.preparacion],
      ["8. Referencias bibliográficas", ""], ["Referencia(s)", od.referencias.referencias], ["Estado", od.referencias.estado],
    ] },
    { titulo: "Estar Cerca (Sección Acompañar)", filas: [
      ["Sección / Subsección", `Acompañar / ${ec.subseccion}`], ["Módulo relacionado", nombreModulo(m)], ["Área y grado", `${m.area} — ${m.grado}`], ["Docente/s", m.docentesResponsables],
      ["A. Título", m.titulo], ["Idea breve", ec.tarjeta.ideaBreve], ["Tiempo aproximado", ec.tarjeta.tiempo],
      ["B. ¿Qué del módulo retoma?", ec.vinculo.queRetoma], ["¿Con qué de la vida cotidiana o la comunidad se conecta?", ec.vinculo.conexionComunidad], ["¿Qué hace el niño o la niña?", ec.vinculo.queHaceNino], ["Verbo del Mapa de Verbos", ec.vinculo.verbo], ["¿Cómo aparece esto después en la escuela?", ec.vinculo.comoApareceEscuela],
      ["C. Consigna principal", ec.pagina.consignaPrincipal], ["Con quién", ec.pagina.conQuien], ["Materiales", ec.pagina.materiales],
      ["Pregunta 1", ec.pagina.pregunta1], ["Pregunta 2", ec.pagina.pregunta2], ["Pregunta 3", ec.pagina.pregunta3],
      ["Para quien acompaña", ec.pagina.paraQuienAcompana], ["Si quieren seguir", ec.pagina.siQuierenSeguir], ["Para llevar a la escuela", ec.pagina.paraLlevarEscuela],
      ["Otras formas — Si hay poco tiempo", ec.pagina.pocoTiempo], ["Otras formas — Si no hay objetos", ec.pagina.sinObjetos], ["Texto fijo", ESTAR_CERCA_TEXTO_FIJO],
    ] },
    { titulo: "Mapa de Verbos", filas: [
      ["Actividad o experiencia", mv.actividadExperiencia],
      ...mv.aprendizajes.flatMap((a, i) => [
        [`Aprendizaje ${i + 1} — Verbo`, a.verbo ? `${a.verbo}${a.verboNuevo ? " (propuesta nueva)" : ""}` : ""], ["Otro verbo que consideré", a.otroVerbo],
        ["¿Qué hace el niño o la niña?", a.queHace], ["¿Qué puede empezar a comprender, construir o hacer?", a.queComprende], ["Referencia curricular", a.referenciaCurricular],
      ]),
    ] },
  ];
}
