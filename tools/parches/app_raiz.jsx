function useMotor() {
  const [, forzar] = useReducer((x) => x + 1, 0);
  useEffect(() => motor.suscribir(forzar), []);
}

const GRADO_UI_KEY = "mddi-ui-grado"; // solo preferencia de interfaz (qué grado mirar), no datos

export default function App() {
  useMotor();
  const [iniciado, setIniciado] = useState(motor.listo);
  const [view, setView] = useState("dashboard"); // dashboard | module | document | preview | usuarios | papelera
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showBitacora, setShowBitacora] = useState(false);
  const [showConflictos, setShowConflictos] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [aviso, setAviso] = useState("");
  const [grado, setGradoRaw] = useState(() => { try { return Number(localStorage.getItem(GRADO_UI_KEY)) || 1; } catch (e) { return 1; } });
  const setGrado = (g) => { setGradoRaw(g); try { localStorage.setItem(GRADO_UI_KEY, String(g)); } catch (e) { /* */ } };

  useEffect(() => { if (!motor.listo) motor.iniciar().then(() => setIniciado(true)); }, []);

  const currentUser = motor.usuario;
  const modules = motor.modulos();
  const info = motor.estadoGuardado();
  const log = (accion, moduloId) => motor.log(accion, moduloId);

  if (!iniciado) {
    return <div style={{ minHeight: "100vh", background: M.cream, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_BODY, color: M.inkSoft }}><style>{fontImport}</style>Cargando…</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ fontFamily: F_BODY }}>
        <style>{fontImport}</style>
        <LoginScreen onLogin={(codigo, nombre) => motor.ingresar(codigo, nombre)} />
      </div>
    );
  }

  const role = currentUser.rol;
  const activeModule = modules.find((mm) => mm.id === activeModuleId);
  const updateModule = (fn) => motor.actualizar(activeModuleId, fn);

  const abrir = (id) => {
    const m = modules.find((x) => x.id === id);
    setActiveModuleId(id); setView("module"); motor.abrirModulo(id);
    log(`Abrió ${m ? `${m.grado} · ${nombreModulo(m)}` : "un módulo"}`, id);
  };
  const onNew = (g) => {
    const id = motor.crear(g);
    setActiveModuleId(id); setView("module"); motor.abrirModulo(id);
    log(`Creó un módulo nuevo en ${g}º grado`, id);
  };
  const handleLogout = async () => {
    if (info.pendientes > 0 && !window.confirm("Hay cambios que todavía no llegaron al servidor (sin conexión). Quedan guardados en este equipo y se enviarán la próxima vez que se ingrese desde acá. ¿Cerrar sesión igual?")) return;
    await motor.salir();
    setView("dashboard"); setActiveModuleId(null);
  };
  const legado = view === "dashboard" ? motor.datosVersionAnterior() : [];

  return (
    <div style={{ minHeight: 600, background: M.cream, fontFamily: F_BODY }}>
      <style>{fontImport}</style>
      <BrandHeader user={currentUser} onLogout={handleLogout} onHelp={() => setShowHelp(true)} onBitacora={() => setShowBitacora(true)}
        extra={<IndicadorGuardado info={info} nConflictos={motor.conflictos.length} onConflictos={() => setShowConflictos(true)} />} />
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showBitacora && <BitacoraPanel onClose={() => setShowBitacora(false)} />}
      {showConflictos && <ConflictosPanel conflictos={motor.conflictos} modules={modules} onClose={() => setShowConflictos(false)} />}
      {motor.sesionVencida && <ReingresoModal />}
      {deleteTarget && (
        <ConfirmDeleteModal
          modulo={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async (m) => {
            setDeleteTarget(null);
            try {
              await motor.eliminar(m.id);
              if (activeModuleId === m.id) { setActiveModuleId(null); setView("dashboard"); }
              setAviso(`Se envió a la papelera: ${m.grado} · ${nombreModulo(m)}.`);
            } catch (e) {
              setAviso(e && e.constructor && e.constructor.name === "ErrorRed" ? "Para eliminar un módulo hace falta conexión con el servidor. No se eliminó nada." : `No se pudo eliminar: ${e.message}`);
            }
          }}
        />
      )}
      {aviso && (
        <div style={{ maxWidth: 1200, margin: "12px auto 0", padding: "0 24px" }}>
          <div style={{ background: M.blueSoft, border: `1px solid ${M.blueLight}`, borderRadius: 10, padding: "8px 14px", display: "flex", justifyContent: "space-between", fontFamily: F_BODY, fontSize: 13 }}>
            <span>{aviso}</span><button onClick={() => setAviso("")} style={{ background: "none", border: "none", cursor: "pointer", color: M.inkSoft }}>✕</button>
          </div>
        </div>
      )}
      {view === "dashboard" && <StatBar modules={modules} />}

      {view === "dashboard" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          {legado.length > 0 && (
            <div style={{ background: M.orangePale, border: `1px solid ${M.orange}`, borderRadius: 10, padding: "10px 14px", marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", fontFamily: F_BODY, fontSize: 13 }}>
              <span>Este navegador tiene {legado.length} módulo(s) guardados por la versión anterior de la plataforma (solo en esta computadora). Subilos al servidor para que no se pierdan y los vea todo el equipo.</span>
              <SolidButton small onClick={async () => { try { const n = await motor.migrarVersionAnterior(legado); setAviso(`Se subieron ${n} módulo(s) de la versión anterior al servidor.`); } catch (e) { setAviso("No se pudieron subir (¿hay conexión?). Se puede reintentar más tarde."); } }}>Subir al servidor</SolidButton>
            </div>
          )}
          {role === "Coordinación General" && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 18 }}>
              <GhostButton icon={Archive} small onClick={() => setView("papelera")}>Papelera</GhostButton>
              <GhostButton icon={UserCircle} small onClick={() => setView("usuarios")}>Usuarios y accesos</GhostButton>
            </div>
          )}
        </div>
      )}
      {view === "dashboard" && (
        <GradosDashboard modules={modules} role={role} grado={grado} setGrado={setGrado} onOpen={abrir} onNew={onNew} onDeleteRequest={(m) => setDeleteTarget(m)} />
      )}
      {view === "usuarios" && (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 24px 80px" }}>
          <TopBackLink onBack={() => setView("dashboard")} label="Volver al panel" />
          <div style={{ marginTop: 14 }}><UsersAdminPanel /></div>
        </div>
      )}
      {view === "papelera" && <PapeleraPanel onBack={() => setView("dashboard")} />}
      {view === "module" && activeModule && (
        <ModuleWorkspace
          key={activeModule.id}
          m={activeModule} updateModule={updateModule} role={role} presencia={motor.presencia}
          onBack={() => { setGrado(activeModule._meta.grado); setView("dashboard"); motor.abrirModulo(null); }}
          onDocument={() => setView("document")}
          onPreview={() => setView("preview")}
        />
      )}
      {view === "module" && !activeModule && (
        <div style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}><EmptyHint text="Este módulo ya no está disponible (pudo haber sido eliminado por Coordinación)." /><GhostButton onClick={() => setView("dashboard")}>Volver al panel</GhostButton></div>
      )}
      {view === "document" && activeModule && <DocumentView m={activeModule} onBack={() => setView("module")} />}
      {view === "preview" && activeModule && <PreviewView m={activeModule} onBack={() => setView("module")} />}
    </div>
  );
}
