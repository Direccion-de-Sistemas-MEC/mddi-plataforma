import sys; sys.path.insert(0,'/home/claude/mddi/tools/parches')
from lib import Src
A=Src('/home/claude/mddi/frontend/src/App.jsx')
nuevos=open('/home/claude/mddi/tools/parches/nuevos_componentes.jsx',encoding='utf-8').read()

# insertar componentes nuevos antes de la previsualización
A.rep('''/* ======================================================================
   PREVISUALIZACIÓN DE LA EXPERIENCIA''', nuevos + '''
/* ======================================================================
   PREVISUALIZACIÓN DE LA EXPERIENCIA''')

# quitar el Dashboard anterior (reemplazado por GradosDashboard)
i,j=A.span_func('Dashboard'); A.s=A.s[:i]+A.s[j:]

# pasos del módulo
A.rep('''  { key: "validacion", label: "Validación", icon: ShieldCheck },''','''  { key: "validacion", label: "Validación", icon: ShieldCheck },
  { key: "orientaciones", label: "Orientaciones didácticas", icon: Compass },
  { key: "estarCerca", label: "Estar Cerca", icon: HeartHandshake },
  { key: "mapaVerbos", label: "Mapa de Verbos", icon: Tags },''')

# ModuleWorkspace
A.rep('''function ModuleWorkspace({ m, updateModule, role, onBack, onDocument, onPreview }) {
  const [step, setStep] = useState("identificacion");''','''function ModuleWorkspace({ m, updateModule, role, onBack, onDocument, onPreview, presencia }) {
  const [step, setStepRaw] = useState("identificacion");
  const setStep = (s) => { setStepRaw(s); window.scrollTo(0, 0); };''')
A.rep('''      <EstadoActionBar m={m} role={role} onIrAValidacion={() => setStep("validacion")} />''','''      <PresenciaBanner otros={presencia} />
      <EstadoActionBar m={m} role={role} onIrAValidacion={() => setStep("validacion")} />''')
A.rep('''          {step === "versiones" && role === "Coordinación General" && <StepVersiones m={m} updateModule={updateModule} editable={editable} />}

          {["identificacion", "fundamentacion", "arquitectura", "recursos", "navegacion", "tecnicas", "trazabilidad"].includes(step) && (''','''          {step === "versiones" && role === "Coordinación General" && <StepVersiones m={m} updateModule={updateModule} editable={editable} role={role} />}
          {step === "orientaciones" && <StepOrientaciones m={m} updateModule={updateModule} irA={setStep} />}
          {step === "estarCerca" && <StepEstarCerca m={m} updateModule={updateModule} irA={setStep} />}
          {step === "mapaVerbos" && <StepMapaVerbos m={m} updateModule={updateModule} irA={setStep} />}

          <ImportadoPanel lista={m.importado || []} filtro={(x) => x.paso === step} onChange={(lista) => updateModule((mm) => ({ ...mm, importado: lista }))} />

          {["identificacion", "fundamentacion", "arquitectura", "recursos", "navegacion", "tecnicas", "trazabilidad", "orientaciones", "estarCerca", "mapaVerbos"].includes(step) && (''')

# control de cambios: versión siguiente correcta + historial del servidor
A.replace_func('StepVersiones','''function StepVersiones({ m, updateModule, editable, role }) {
  const update = (i, k, v) => updateModule((mm) => ({ ...mm, versiones: mm.versiones.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) }));
  const addVersion = () => {
    const nextV = siguienteVersion(m.versionActual);
    updateModule((mm) => ({ ...mm, versionActual: nextV, versiones: [...mm.versiones, { version: nextV, fecha: new Date().toLocaleDateString("es-AR"), cambio: "", responsable: "", motivo: "", aprobadoPor: "—" }] }));
  };
  return (
    <>
      <SectionCard title="Bloque AC — Control de cambios" icon={History} subtitle="Historial de versiones del documento. Nunca se borran versiones anteriores." right={<GhostButton icon={Plus} small onClick={addVersion}>Nueva versión</GhostButton>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {m.versiones.map((ver, i) => (
            <div key={i} style={{ border: `1px solid ${M.line}`, borderRadius: 10, padding: 12, background: M.cream }}>
              <p style={{ margin: "0 0 8px", fontFamily: F_MONO, fontSize: 12, color: M.blue }}>v{ver.version}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder="Fecha" value={ver.fecha} disabled={!editable} onChange={(e) => update(i, "fecha", e.target.value)} />
                <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder="Responsable" value={ver.responsable} disabled={!editable} onChange={(e) => update(i, "responsable", e.target.value)} />
                <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder="Aprobado por" value={ver.aprobadoPor} disabled={!editable} onChange={(e) => update(i, "aprobadoPor", e.target.value)} />
                <textarea style={{ ...inputBase, marginTop: 0, fontSize: 12.5, gridColumn: "1 / span 2", resize: "vertical" }} rows={2} placeholder="Cambio realizado" value={ver.cambio} disabled={!editable} onChange={(e) => update(i, "cambio", e.target.value)} />
                <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder="Motivo" value={ver.motivo} disabled={!editable} onChange={(e) => update(i, "motivo", e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <HistorialPanel m={m} role={role} />
    </>
  );
}''')

# documento final: secciones nuevas
A.rep('''  add(`## 10. READY FOR DEVELOPMENT`);
  readyList.forEach((r) => add(`- [${r.ok ? "x" : " "}] ${r.label}`));''','''  add(`## 10. READY FOR DEVELOPMENT`);
  readyList.forEach((r) => add(`- [${r.ok ? "x" : " "}] ${r.label}`));
  seccionesNuevasDocumento(m).forEach((sec, i) => {
    add("");
    add(`## ${11 + i}. ${sec.titulo}`);
    sec.filas.forEach(([k, v]) => { if (v === "") add(`### ${k}`); else if (v) add(`- ${k}: ${v}`); });
  });''')
A.rep('''  add(`**${m.titulo}** — v${m.versionActual}`);''','''  add(`**${m.grado} · ${nombreModulo(m)}** — v${m.versionActual}`);''')
A.rep('''            : readyList.filter((r) => !r.ok).map((r, i) => <p key={i} style={{ margin: "2px 0", fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>🔴 {r.label}</p>)}
        </DocSection>''','''            : readyList.filter((r) => !r.ok).map((r, i) => <p key={i} style={{ margin: "2px 0", fontFamily: F_BODY, fontSize: 12.5, color: M.red }}>🔴 {r.label}</p>)}
        </DocSection>
        {seccionesNuevasDocumento(m).map((sec, i) => (
          <DocSection key={sec.titulo} n={11 + i} title={sec.titulo}>
            {sec.filas.map(([k, v], j) => v === "" ? <p key={j} style={{ fontFamily: F_BODY, fontSize: 12.5, fontWeight: 600, color: M.inkSoft, margin: "10px 0 4px" }}>{k}</p> : <DocLine key={j} k={k} v={v} />)}
          </DocSection>
        ))}''')
A.rep('''          <DocLine k="Título" v={m.titulo} />''','''          <DocLine k="Grado / Módulo" v={`${m.grado} · ${nombreModulo(m)}`} /><DocLine k="Título" v={m.titulo} /><DocLine k="Duración estimada" v={m.duracionEstimada} />''')

# ---------------- App raíz
i=A.s.index("export default function App() {")
A.s = A.s[:i] + open('/home/claude/mddi/tools/parches/app_raiz.jsx',encoding='utf-8').read() + "\n"
A.rep("function BrandHeader({ user, onLogout, onHelp, onBitacora }) {","function BrandHeader({ user, onLogout, onHelp, onBitacora, extra }) {")
A.rep("""          {user && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: M.grayPale""","""          {extra}
          {user && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: M.grayPale""")
A.save(); print("p3 ok")
