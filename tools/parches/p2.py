import sys; sys.path.insert(0,'/home/claude/mddi/tools/parches')
from lib import Src
A=Src('/home/claude/mddi/frontend/src/App.jsx')

# ---- tarjeta de módulo: "Módulo N — Título"
A.rep('''          <p style={{ fontFamily: F_MONO, fontSize: 11, color: M.blue, margin: "0 0 4px" }}>{m.codigo || "SIN CÓDIGO"}</p>
          <h3 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: 18, color: M.ink, margin: "0 0 4px" }}>{m.titulo || "Módulo sin título"}</h3>
          <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.inkSoft, margin: 0 }}>{m.grado} · {m.area}</p>''',
'''          <p style={{ fontFamily: F_MONO, fontSize: 11, color: M.blue, margin: "0 0 4px" }}>{m.codigo || "SIN CÓDIGO"}{m._meta?.pendienteCreacion && " · pendiente de enviar"}</p>
          <h3 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: 18, color: M.ink, margin: "0 0 4px" }}>{nombreModulo(m)}</h3>
          <p style={{ fontFamily: F_BODY, fontSize: 12.5, color: M.inkSoft, margin: 0 }}>{m.grado} · {m.area}</p>''')

# ---- breadcrumb con grado y número
A.rep('''        <strong style={{ color: M.ink }}>{m.titulo || "Módulo sin título"}</strong>
        <span style={{ margin: "0 6px", color: M.inkFaint }}>›</span>{stepLabel}''','''        <span>{m.grado}</span><span style={{ margin: "0 6px", color: M.inkFaint }}>›</span>
        <strong style={{ color: M.ink }}>{nombreModulo(m)}</strong>
        <span style={{ margin: "0 6px", color: M.inkFaint }}>›</span>{stepLabel}''')

# ---- identificación
A.rep('''        <TextInput label="Código del módulo" help={HELP.codigo} value={m.codigo} onChange={upd("codigo")} disabled={!editable} />
        <SelectInput label="Grado" value={m.grado} onChange={upd("grado")} options={["1º grado", "2º grado"]} />''',
'''        <TextInput label="Código del módulo" help={HELP.codigo} value={m.codigo} onChange={upd("codigo")} disabled={!editable} />
        <SelectInput label="Grado" help="Si cambiás el grado, el módulo pasa al final de la lista de ese grado y recibe el número siguiente." value={m.grado}
          onChange={(v) => { if (v !== m.grado && window.confirm(`¿Mover este módulo a ${v}? Recibirá el número siguiente dentro de ese grado.`)) upd("grado")(v); }}
          options={GRADOS.map((g) => g.label)} />''')
A.rep('''        <TextInput label="Título" value={m.titulo} onChange={upd("titulo")} disabled={!editable} />
        <TextInput label="Subtítulo" value={m.subtitulo} onChange={upd("subtitulo")} disabled={!editable} />
      </div>''','''        <TextInput label="Título" value={m.titulo} onChange={upd("titulo")} disabled={!editable} />
        <TextInput label="Subtítulo" value={m.subtitulo} onChange={upd("subtitulo")} disabled={!editable} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <TextInput label="Número de módulo (automático)" help="Lo asigna la plataforma según el orden de creación dentro del grado." value={m._meta ? `Módulo ${m._meta.numero}${m._meta.pendienteCreacion ? " (provisorio, se confirma al sincronizar)" : ""}` : ""} disabled />
        <TextInput label="Duración estimada (de la actividad completa)" help="Se usa también en Orientaciones didácticas → Ficha técnica." value={m.duracionEstimada} onChange={upd("duracionEstimada")} disabled={!editable} placeholder="Ej.: 2 clases de 80 minutos" />
      </div>''')
A.rep('''        <TextInput label="Especialista responsable" value={m.especialistaResponsable} onChange={upd("especialistaResponsable")} disabled={!editable} />
      </div>''','''        <TextInput label="Especialista responsable" value={m.especialistaResponsable} onChange={upd("especialistaResponsable")} disabled={!editable} />
      </div>
      <TextInput label="Corrector/a responsable" value={m.correctorResponsable} onChange={upd("correctorResponsable")} disabled={!editable} />''')
A.rep('''        <SelectInput label="Área" value={m.area} onChange={upd("area")} options={["Matemática", "Lengua"]} />''','''        <SelectInput label="Área" value={m.area} onChange={upd("area")} options={AREAS} />''')

# ---- fundamentación (Lengua): detalle de la práctica del lenguaje
A.rep('''          <SelectInput label="Práctica del lenguaje involucrada" value={f.lengua.practicaLenguaje} onChange={updLengua("practicaLenguaje")} options={["Oralidad", "Lectura", "Escritura"]} />''',
'''          <SelectInput label="Práctica del lenguaje involucrada" value={f.lengua.practicaLenguaje} onChange={updLengua("practicaLenguaje")} options={["Oralidad", "Lectura", "Escritura"]} />
          <TextArea label="Práctica del lenguaje — detalle" value={f.lengua.practicaLenguajeDetalle} onChange={updLengua("practicaLenguajeDetalle")} rows={2} disabled={!editable} />''')

# ---- actividad: relación con la secuencia (síntesis)
A.rep('''        <TextArea label="Relación con la actividad anterior" value={a.relacionAnterior} onChange={upd("relacionAnterior")} rows={2} disabled={!editable} />''',
'''        <TextArea label="Relación con la secuencia (síntesis)" value={a.relacionSecuencia} onChange={upd("relacionSecuencia")} rows={2} disabled={!editable} />
        <TextArea label="Relación con la actividad anterior" value={a.relacionAnterior} onChange={upd("relacionAnterior")} rows={2} disabled={!editable} />''')
A.rep('''        <TextArea label="Reintentos y ayudas" value={a.mapa.reintentosAyudas} onChange={updMapa("reintentosAyudas")} rows={2} disabled={!editable} />''',
'''        <TextArea label="Reintentos y ayudas" value={a.mapa.reintentosAyudas} onChange={updMapa("reintentosAyudas")} rows={2} disabled={!editable} />
        <TextArea label="Recorrido paso a paso (Inicio → Acción → Decisión → Consecuencia → Feedback → Próxima acción → Cierre)" value={a.mapa.recorrido} onChange={updMapa("recorrido")} rows={4} disabled={!editable} />''')
A.rep('''          { k: "audioExacto", label: "Audio exacto", type: "area", wide: true },''','''          { k: "audioExacto", label: "Audio exacto", type: "area", wide: true },
          { k: "quienLoDice", label: "Quién lo dice" },
          { k: "velocidad", label: "Velocidad / tono" },''')
A.rep('''          { k: "duracion", label: "Duración estimada" },''','''          { k: "descripcion", label: "Descripción / contenido", type: "area", wide: true },
          { k: "duracion", label: "Duración estimada" },''')
A.rep('''        <TextArea label="Cantidad de información por pantalla" value={a.accesibilidad.cantidadInfo} onChange={updAcc("cantidadInfo")} rows={2} disabled={!editable} />''',
'''        <TextArea label="Cantidad de información por pantalla" value={a.accesibilidad.cantidadInfo} onChange={updAcc("cantidadInfo")} rows={2} disabled={!editable} />
        <TextArea label="Modo de acceso alternativo" value={(a.accesibilidadExtra || {}).modoAlternativo} onChange={(v) => set({ ...a, accesibilidadExtra: { ...(a.accesibilidadExtra || {}), modoAlternativo: v } })} rows={2} disabled={!editable} />''')
# casos límite: condición/disparador y nota
A.rep('''              {!c.noAplica && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>''','''              {!c.noAplica && (
                <input style={{ ...inputBase, marginTop: 0, marginBottom: 8, fontSize: 12.5 }} placeholder="Condición / disparador" value={c.condicion || ""} disabled={!editable} onChange={(e) => updCaso(c.id, "condicion", e.target.value)} />
              )}
              {!c.noAplica && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>''')
A.rep('''                  <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder={(CASOS_LIMITE_EJEMPLOS[c.situacion] || {}).accionPosterior || "Acción posterior"} value={c.accionPosterior} disabled={!editable} onChange={(e) => updCaso(c.id, "accionPosterior", e.target.value)} />
                </div>
              )}''','''                  <input style={{ ...inputBase, marginTop: 0, fontSize: 12.5 }} placeholder={(CASOS_LIMITE_EJEMPLOS[c.situacion] || {}).accionPosterior || "Acción posterior"} value={c.accionPosterior} disabled={!editable} onChange={(e) => updCaso(c.id, "accionPosterior", e.target.value)} />
                </div>
              )}
              {(c.nota || c.noAplica) && (
                <input style={{ ...inputBase, marginTop: 8, fontSize: 12, background: "transparent" }} placeholder={c.noAplica ? "Motivo (opcional)" : "Nota"} value={c.nota || ""} disabled={!editable} onChange={(e) => updCaso(c.id, "nota", e.target.value)} />
              )}''')
# ---- texto del documento original dentro de cada pestaña de actividad
A.rep('''          {tab === "storyboard" && <TabStoryboard a={activity} set={setActivity} editable={editable} />}
''','''          {tab === "storyboard" && <TabStoryboard a={activity} set={setActivity} editable={editable} />}
          <ImportadoPanel
            lista={activity.importado || []}
            filtro={(x) => x.tab === tab || (tab === "identificacion" && !visibleTabs.some((t) => t.key === x.tab))}
            onChange={(lista) => setActivity({ ...activity, importado: lista })}
          />
''')
# ---- eliminación: ahora va a la papelera (restaurable)
A.rep('''          Vas a borrar <strong style={{ color: M.ink }}>"{modulo.titulo || "sin título"}"</strong> ({modulo.codigo || "sin código"}) para siempre: sus 5 actividades, comentarios, estados de revisión y control de cambios. Esta acción no se puede deshacer.''',
'''          Vas a eliminar <strong style={{ color: M.ink }}>{nombreModulo(modulo)}</strong> ({modulo.grado}, {modulo.codigo || "sin código"}). Desaparece de la lista de todos los usuarios junto con sus actividades, comentarios y revisiones. Queda en la <strong>papelera</strong> del servidor y Coordinación puede restaurarlo.''')
A.rep('''<SolidButton tone="red" disabled={!coincide} onClick={() => onConfirm(modulo)}>Eliminar definitivamente</SolidButton>''','''<SolidButton tone="red" disabled={!coincide} onClick={() => onConfirm(modulo)}>Eliminar</SolidButton>''')
A.save(); print("p2 ok")
