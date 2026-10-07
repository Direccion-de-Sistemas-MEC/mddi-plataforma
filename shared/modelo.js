/* Modelo de datos MDDI — compartido por el frontend y el backend. */

// ---- TIPO
export const TIPO_RESPUESTA = ["Numérica", "Selección", "Arrastre", "Texto libre", "Orden"];

// ---- MOMENTOS/CASOS
export const MOMENTOS = [
  { n: 1, label: "Situación disparadora", desc: "Presentar una escena contextualizada que genere la necesidad genuina de un saber nuevo." },
  { n: 2, label: "Exploración individual", desc: "El niño despliega procedimientos propios, sin enseñanza previa del camino." },
  { n: 3, label: "Confrontación y puesta en común", desc: "Se contrastan estrategias posibles a través del personaje-guía." },
  { n: 4, label: "Sistematización", desc: "Se organiza y nombra el saber construido: de procedimiento personal a conocimiento compartido." },
  { n: 5, label: "Producción y cierre", desc: "Transferencia a una nueva situación o producción propia que evidencia lo aprendido." },
];

export const CASOS_LIMITE_BASE = [
  "El niño no responde durante un tiempo prolongado.",
  "Toca repetidamente sin avanzar.",
  "Arrastra un objeto a una zona incorrecta.",
  "Intenta colocar un objeto donde no corresponde.",
  "Responde parcialmente.",
  "Selecciona dos opciones a la vez.",
  "Borra una respuesta ya dada.",
  "Abandona la actividad.",
  "Vuelve a entrar (reingreso).",
  "Reinicia la actividad.",
  "Pierde la conexión a mitad de la actividad.",
  "Usa una pantalla reducida.",
  "Usa tablet.",
  "Usa netbook.",
  "Escucha sin mirar la pantalla.",
  "Mira sin escuchar.",
];


// ---- CHECKS
export const CHECK_DOCENTE = [
  "Las 5 actividades están completas y declaran su relación con la anterior y la siguiente (Bloque C y E).",
  "El Bloque J (confrontación) tiene sus 5 elementos: 2-3 estrategias, guion de preguntas, tipo de interacción, feedback y frase-puente.",
  "Ningún feedback usa fórmulas punitivas (\"Mal\", \"Incorrecto\", \"Te equivocaste\", \"La respuesta correcta es...\").",
  "El Bloque H contempla más estados que correcto/incorrecto.",
  "Toda consigna y todo feedback relevante tiene texto exacto en pantalla y en audio (Bloque E.3 y M).",
  "El Bloque N (accesibilidad) está completo en cada actividad.",
  "No hay decisiones inventadas: lo que depende de la Guía de Pautas está marcado como pendiente.",
  "El semáforo (Bloque AD) está actualizado.",
];

export const CHECK_ESPECIALISTA = [
  "Alineación curricular: el contenido corresponde exactamente al Diseño Curricular Jurisdiccional citado.",
  "Pertinencia del contenido para el grado y la Unidad Pedagógica.",
  "Coherencia de la secuencia entre las 5 actividades (no son ejercicios sueltos).",
  "La situación-problema genera una necesidad genuina del saber nuevo, sin enseñarlo antes de la exploración.",
  "Los conocimientos previos requeridos son realistas para el grado.",
  "Se admiten procedimientos personales diversos en la Actividad 2.",
  "El error está contemplado como parte del proceso, no como falla a corregir.",
  "El Bloque J recupera al menos un error o concepción frecuente validado.",
  "La sistematización (Actividad 4) nombra efectivamente lo construido en las actividades previas.",
  "La producción (Actividad 5) evidencia el aprendizaje, no repite mecánicamente la Actividad 2.",
  "La progresión de dificultad entre actividades y, si corresponde, entre grados, es adecuada.",
  "El feedback ayuda a pensar, no solo confirma o corrige.",
];

export const CHECK_CORRECTOR = [
  "Ortografía, gramática y puntuación correctas en todos los textos (consignas, feedback, guion de Kapi).",
  "Claridad y adecuación etaria del lenguaje (6 a 8 años).",
  "Consistencia de nombres y de personajes a lo largo del módulo.",
  "Consistencia terminológica (los mismos términos matemáticos o lingüísticos en todas las actividades).",
  "Coherencia entre el texto en audio y el texto en pantalla de cada consigna y feedback.",
  "Coherencia entre lo que pide la consigna y lo que efectivamente puede hacer el niño en la interacción descripta.",
];

export const CHECK_TECNICO = [
  "Todas las pantallas están identificadas con ID único (Bloque F).",
  "Todos los botones están definidos, sin ambigüedad (Bloque R).",
  "Todas las interacciones están especificadas con la respuesta exacta del sistema (Bloque G).",
  "Todos los estados están definidos, no solo correcto/incorrecto (Bloque H).",
  "Todos los feedback están escritos con su texto exacto (Bloque I).",
  "Todos los recursos tienen ID único (Bloques P y Q).",
  "Todos los audios tienen su texto de narración y su alternativa textual (Bloque M).",
  "Todas las animaciones relevantes están descriptas (Bloque F y L).",
  "Todas las condiciones de avance y de finalización están definidas (Bloques S y O).",
  "Todos los casos límite previstos en el Bloque T tienen comportamiento asignado.",
  "La accesibilidad está contemplada en cada actividad (Bloque N).",
  "No existen decisiones funcionales pendientes sin resolver (o están explícitamente marcadas como pendientes de la Guía de Pautas).",
];

export const CHECK_COORDINACION = [
  "Las cuatro validaciones anteriores (didáctica, editorial, técnica) están cerradas y documentadas.",
  "El semáforo general del módulo está en verde en todos sus bloques obligatorios.",
  "El Bloque AC (control de cambios) refleja la versión final aprobada.",
  "Se cumple el criterio READY FOR DEVELOPMENT antes de considerar el módulo listo para publicar.",
];


// ---- MODELO
let uidCounter = 1;
export const uid = () => `id-${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function blankActivity(numero) {
  const momento = MOMENTOS[numero - 1];
  return {
    id: uid(),
    numero,
    nombre: "",
    objetivo: "",
    contenido: "",
    relacionSecuencia: "",
    propositoDidactico: "",
    relacionAnterior: "",
    relacionSiguiente: "",
    evidencia: "",
    pasajeSiguiente: "",
    situacion: { contexto: "", escenario: "", personajes: "", queOcurre: "", queProblema: "" },
    consigna: { textoPantalla: "", textoAudio: "", quienLoDice: "Kapi", tono: "", velocidad: "Pausada" },
    mapa: { puntoEntrada: "", pantallasInvolucradas: "", decisionesNino: "", caminosPosibles: "", reintentosAyudas: "", recorrido: "" },
    pantallas: [],
    interacciones: [],
    estados: [],
    feedback: [],
    confrontacion: { estrategia1Proc: "", estrategia1Exp: "", estrategia2Proc: "", estrategia2Exp: "", estrategia3Error: "", guionPreguntas: "", tipoInteraccion: "", feedback: "", frasePuente: "" },
    personaje: [],
    visual: { escenarioFondo: "", coloresDominantes: "", objetosPersonajes: "", tamanoUbicacion: "", iconografia: "" },
    sonido: [],
    accesibilidad: { audioTexto: "", instruccionesClaras: "", alternativasColor: "", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "" },
    accesibilidadExtra: { modoAlternativo: "" },
    datos: { queRegistra: "", tipoRespuesta: TIPO_RESPUESTA[0], respuestaEsperada: "", alternativasValidas: "", parcialmenteValidas: "" },
    navFinal: { cuandoTermina: "", cuandoHabilita: "", completarTodo: "Puede continuar aunque no sea óptima", variosIntentos: "", siAbandona: "" },
    casosLimite: CASOS_LIMITE_BASE.map((s) => ({ id: uid(), situacion: s, condicion: "", comportamiento: "", feedback: "", accionPosterior: "", nota: "", noAplica: false })),
    matriz: [],
    storyboard: [],
    importado: [],
  };
}

export function blankModule() {
  return {
    id: uid(),
    codigo: "", grado: "1º grado", area: "Matemática", ejeCurricular: "", contenido: "",
    titulo: "", subtitulo: "", docentesResponsables: "", especialistaResponsable: "", correctorResponsable: "", duracionEstimada: "",
    fecha: "", versionActual: "1.0",
    estado: "diseno_docente",
    fundamentacion: {
      propositoGeneral: "", aprendizajeEsperado: "", relacionCurricular: "", conocimientosPrevios: "", procedimientosPersonales: "",
      mate: { procedimientosPosibles: "", estrategiasCorrectas: "", estrategiasAlternativas: "", erroresFrecuentes: "", variablesDidacticas: "", anticipaciones: "", conocimientosMovilizar: "" },
      lengua: { propositoComunicativo: "", practicaLenguaje: "", practicaLenguajeDetalle: "", situacion: "", destinatario: "", generoTextual: "", decisionesNino: "", autonomiaEsperada: "", intervencionesNecesarias: "" },
    },
    momentos: MOMENTOS.reduce((acc, m) => ({ ...acc, [m.n]: "" }), {}),
    actividades: [1, 2, 3, 4, 5].map(blankActivity),
    recursos: [],
    navegacion: { inicio: "", continuar: "", volver: "", repetir: "", ayuda: "" },
    tecnicas: "",
    trazabilidad: [1, 2, 3, 4, 5].map(() => ({ id: uid(), disenoCurricular: "", objetivo: "", momento: "", actividad: "", interaccion: "", evidencia: "", feedback: "", sistematizacion: "" })),
    versiones: [{ version: "1.0", fecha: "", cambio: "Creación del documento", responsable: "", motivo: "Inicio del diseño del módulo", aprobadoPor: "—" }],
    comentarios: [],
    revisiones: {},
    checklistDocente: CHECK_DOCENTE.map(() => false),
    checklistEspecialista: CHECK_ESPECIALISTA.map(() => false),
    checklistCorrector: CHECK_CORRECTOR.map(() => false),
    checklistTecnico: CHECK_TECNICO.map(() => false),
    checklistCoordinacion: CHECK_COORDINACION.map(() => false),
    importado: [],
    origenImportacion: "",
    orientacionesDidacticas: blankOrientaciones(),
    estarCerca: blankEstarCerca(),
    mapaDeVerbos: blankMapaVerbos(),
  };
}

export function exampleModule() {
  const m = blankModule();
  m.codigo = "2G-M01"; m.grado = "2º grado"; m.area = "Matemática";
  m.ejeCurricular = "Número y Operaciones — Regularidades numéricas: números pares e impares";
  m.contenido = "Reconocimiento de números pares e impares a partir de una regularidad (el dígito de las unidades).";
  m.titulo = "Kapi, detective de huellas"; m.subtitulo = "Adaptado de la Propuesta N°13 \"El Kapivára\" — cuadernillo Aprendemos con Kapi";
  m.docentesResponsables = "Trío 2º grado"; m.especialistaResponsable = "Especialista en Didáctica de la Matemática";
  m.fecha = "08/08/2026"; m.versionActual = "1.3";
  m.estado = "ready_for_development";
  m.fundamentacion.propositoGeneral = "Que el niño reconozca la regularidad que distingue a los números pares de los impares, a partir del dígito de las unidades, mediante la exploración y comparación de sus propios criterios de clasificación.";
  m.fundamentacion.aprendizajeEsperado = "Clasifica un número como par o impar observando su último dígito, incluso ante números que no vio antes.";
  m.fundamentacion.relacionCurricular = "Diseño Curricular Primaria — Matemática, Número y Operaciones, 2º grado: identificación de números pares e impares a través de secuencias y reconocimiento de regularidades numéricas.";
  m.fundamentacion.conocimientosPrevios = "Lectura y escritura de números hasta 100; noción de secuencia numérica.";
  m.fundamentacion.procedimientosPersonales = "Memorizar caso por caso; fijarse en el primer dígito (error frecuente); fijarse en el último dígito (estrategia experta).";
  m.fundamentacion.mate = {
    procedimientosPosibles: "Memorización de casos ya vistos; conteo de a dos desde 0; observación del último dígito.",
    estrategiasCorrectas: "Observar el dígito de las unidades y compararlo con la serie 0-2-4-6-8 / 1-3-5-7-9.",
    estrategiasAlternativas: "Contar de a dos desde 0 hasta llegar al número (válida pero lenta para números grandes).",
    erroresFrecuentes: "Fijarse en el primer dígito del número en lugar del último (ej. mirar el '3' de 35 en vez del '5').",
    variablesDidacticas: "Se incluyen números de dos cifras (30 a 39) para que memorizar cada caso deje de ser viable y se necesite un criterio general.",
    anticipaciones: "Es probable que algunos niños intenten recordar de memoria la huella de cada página en vez de buscar un patrón.",
    conocimientosMovilizar: "Lectura de números de dos cifras, valor posicional básico (unidades), noción de secuencia.",
  };
  m.momentos = {
    1: "Kapi descubre que el libro de los Esteros está lleno de huellas suyas y no recuerda cuál dejó en cada página: invita al niño a ser 'detective de huellas'.",
    2: "El niño decide, para las páginas 30 a 39, qué tipo de huella corresponde a cada una, con el criterio que prefiera.",
    3: "Kapi propone agrupar los números del 0 al 9 según el tipo de huella, comparando los criterios que usó cada chico.",
    4: "Se nombra el 'secreto numérico': los números que terminan en 0,2,4,6,8 son pares; los que terminan en 1,3,5,7,9 son impares.",
    5: "El niño aplica el secreto numérico a números nuevos y le cuenta a Kapi qué aprendió.",
  };

  const nombres = ["El libro de huellas", "Detectives de huellas: páginas 20 a 39", "Clasificando huellas: pares e impares", "El secreto de los números pares e impares", "Nuevas huellas para investigar"];
  m.actividades.forEach((a, i) => { a.nombre = nombres[i]; a.objetivo = MOMENTOS[i].desc; });

  // ACTIVIDAD 1 — Situación disparadora
  const a1 = m.actividades[0];
  a1.contenido = "Presentación del problema: identificar qué huella corresponde a cada página.";
  a1.propositoDidactico = "Generar la necesidad de resolver a qué tipo de huella corresponde cada página del libro.";
  a1.relacionAnterior = "Es la apertura del módulo; no tiene actividad previa.";
  a1.relacionSiguiente = "Presenta el problema que la Actividad 2 invita a explorar libremente.";
  a1.evidencia = "El niño manifiesta interés y comprende que debe identificar qué huella corresponde a cada página.";
  a1.pasajeSiguiente = "Se habilita al tocar el botón de inicio.";
  a1.situacion = {
    contexto: "El rincón de lectura de los Esteros, con el cuadernillo 'Aprendemos con Kapi' lleno de huellitas.",
    escenario: "Kapi frente al libro de cuentos, mostrando sus dos tipos de huella: una delantera y una trasera.",
    personajes: "Kapi.",
    queOcurre: "Kapi se despertó curioso, miró el libro de cuentos de los Esteros y descubrió que estaba todo marcado con huellitas.",
    queProblema: "No sabe qué huella dejó en cada página y pide ayuda para descubrirlo.",
  };
  a1.consigna = {
    textoPantalla: "¡Fui yo! —ríe Kapi—. ¿Querés ayudarme a descubrir qué huella dejé en cada página? ¡Convirtámonos en detectives de huellas!",
    textoAudio: "Hoy Kapi se despertó curioso. En el aire, algo olía a aventura. Miró a su alrededor y vio el libro de cuentos de los Esteros… ¡pero estaba todo marcado con huellitas! ¡Fui yo! —ríe Kapi—. Pero… ¿querés ayudarme a descubrir qué huella dejé en cada página? ¡Convirtámonos en detectives de huellas!",
    quienLoDice: "Kapi", tono: "Cálido, entusiasta, cómplice.", velocidad: "Pausada",
  };
  a1.pantallas = [
    { id: uid(), idPantalla: "P1-01", nombre: "Kapi y el libro de huellas", proposito: "Presentar la situación y generar interés.", contenidoTextual: "Texto de la consigna narrada por Kapi.", imagenesFondo: "Rincón de lectura de los Esteros, libro abierto con huellas visibles, Kapi mostrando sus dos patitas.", botones: "¡Vamos a investigar!", animacion: "Kapi se mira las patas y las muestra a cámara.", audio: "Narración completa de la consigna.", condicionAvance: "Al tocar '¡Vamos a investigar!'." },
  ];
  a1.interacciones = [
    { id: uid(), accion: "Observar", descripcion: "El niño observa a Kapi y el libro de huellas.", respuesta: "No hay validación; la pantalla espera la interacción con el botón." },
    { id: uid(), accion: "Tocar", descripcion: "Toca el botón '¡Vamos a investigar!'.", respuesta: "Avanza a la Actividad 2 con una transición simple." },
  ];
  a1.estados = [
    { id: uid(), estado: "Respuesta inesperada", queHizo: "Toca en cualquier otra zona de la pantalla.", queInterpreta: "No hay interacción prevista fuera del botón.", queOcurre: "No pasa nada; la pantalla permanece a la espera.", proximoPaso: "El niño puede volver a escuchar la consigna con el ícono de Kapi." },
    { id: uid(), estado: "Sin respuesta", queHizo: "No interactúa por un lapso prolongado.", queInterpreta: "Inactividad tras un lapso a definir.", queOcurre: "Kapi repite una invitación breve.", proximoPaso: "El niño puede retomar en cualquier momento." },
  ];
  a1.feedback = [
    { id: uid(), estadoRef: "Sin respuesta", queSignifica: "Todavía no se decidió a comenzar.", queDebe: "Pregunta", textoExacto: "¿Empezamos a investigar juntos?", audioExacto: "¿Empezamos a investigar juntos?" },
  ];
  a1.personaje = [
    { id: uid(), quienHabla: "Kapi", cuandoAparece: "Al entrar a la pantalla.", audio: "Hoy Kapi se despertó curioso… ¡Convirtámonos en detectives de huellas!", textoPantalla: "Igual al audio, en tipografía grande.", accionPersonaje: "Kapi se mira las patas, sonríe y las muestra a cámara.", accionNino: "Puede escuchar la narración completa y tocar el botón para avanzar.", fraseConexion: "Vamos a ver qué huellas dejaste, Kapi." },
  ];
  a1.visual = { escenarioFondo: "Rincón de lectura con el cuadernillo de los Esteros.", coloresDominantes: "Verdes y celestes del paisaje correntino, con acentos cálidos del libro.", objetosPersonajes: "Libro abierto, huellas ilustradas, Kapi.", tamanoUbicacion: "Kapi y el libro comparten protagonismo, centrados.", iconografia: "Silueta de huella delantera y trasera como referencia visual permanente." };
  a1.sonido = [{ id: uid(), sonId: "AUD-1-01", tipo: "Narración", duracion: "18 segundos", disparador: "Al entrar a P1-01.", alternativa: "Texto en pantalla de la consigna." }];
  a1.accesibilidad = { audioTexto: "Sí, la consigna completa está narrada y escrita.", instruccionesClaras: "Una sola idea por pantalla: presentar el problema.", alternativasColor: "Las dos huellas se distinguen por forma, no solo por color.", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "Un solo bloque de texto narrativo." };
  a1.datos = { queRegistra: "No aplica (pantalla de apertura, sin respuesta a evaluar).", tipoRespuesta: "Selección", respuestaEsperada: "No aplica.", alternativasValidas: "No aplica.", parcialmenteValidas: "No aplica." };
  a1.navFinal = { cuandoTermina: "Al tocar el botón '¡Vamos a investigar!'.", cuandoHabilita: "Inmediatamente.", completarTodo: "No aplica (no hay tarea que completar).", variosIntentos: "No aplica.", siAbandona: "Se guarda la pantalla de apertura como punto de reingreso." };
  a1.matriz = [{ id: uid(), accionNino: "Toca '¡Vamos a investigar!'", respuestaEsperada: "Intención de comenzar", respuestaSistema: "Transición a la Actividad 2.", feedback: "Sonido de transición neutro.", proximaAccion: "Comienza la Actividad 2." }];
  a1.storyboard = [{ id: uid(), pantallaRef: "P1-01", queVe: "Kapi y el libro de huellas.", queEscucha: "Narración completa de Kapi.", queHace: "Escucha y toca el botón.", quePuedePasar: "Toca el botón / no responde.", queHaceSistema: "Espera la interacción; reintenta la invitación si hay inactividad.", feedback: "Invitación breve si no responde.", comoContinua: "Pasa a la Actividad 2 al tocar el botón." }];

  // ACTIVIDAD 2 — Exploración individual
  const a2 = m.actividades[1];
  a2.contenido = "Asignación libre de un tipo de huella a cada página del 30 al 39.";
  a2.propositoDidactico = "Que el niño explore, con el criterio que prefiera, a qué tipo de huella corresponde cada número, sin corrección todavía.";
  a2.relacionAnterior = "Retoma el libro de huellas presentado en la Actividad 1.";
  a2.relacionSiguiente = "Los criterios que use cada niño son la materia prima de la confrontación en la Actividad 3.";
  a2.evidencia = "El niño asigna un tipo de huella a cada una de las páginas del 30 al 39, con el criterio que prefiera.";
  a2.pasajeSiguiente = "Se habilita al asignar una huella a cada una de las 10 páginas, sin exigir que el criterio sea el correcto.";
  a2.situacion = {
    contexto: "El mismo libro de huellas de la Actividad 1.",
    escenario: "Páginas numeradas del 20 al 39, algunas ya marcadas por Kapi.",
    personajes: "Kapi, observando.",
    queOcurre: "Kapi ya marcó algunas páginas del 20 al 29 con su huella; muestra el modelo.",
    queProblema: "Quedan las páginas del 30 al 39 sin marcar: hay que decidir, página por página, qué huella corresponde.",
  };
  a2.consigna = {
    textoPantalla: "Fijate bien qué número tiene cada página y qué patita aparece. Ahora te toca a vos: completá las huellas de las páginas del 30 al 39.",
    textoAudio: "Observá las páginas del libro. Kapi ya dejó sus huellitas. Fijate bien qué número tiene cada página y qué patita aparece. Ahora te toca a vos: completá las huellas de las páginas del 30 al 39. Indicá con la huella delantera o la trasera.",
    quienLoDice: "Kapi", tono: "Curioso, cómplice, sin apuro.", velocidad: "Pausada",
  };
  a2.mapa = {
    puntoEntrada: "Pantalla con el libro abierto mostrando el modelo de las páginas 20 a 29.",
    pantallasInvolucradas: "P2-01, P2-02",
    decisionesNino: "Elegir, para cada página del 30 al 39, qué tipo de huella corresponde.",
    caminosPosibles: "El niño puede usar cualquier criterio: azar, memoria de las páginas ya vistas, o el patrón del último dígito.",
    reintentosAyudas: "No hay corrección en esta actividad: es exploración libre, sin feedback de correcto/incorrecto.",
  };
  a2.pantallas = [
    { id: uid(), idPantalla: "P2-01", nombre: "Modelo: páginas 20 a 29", proposito: "Mostrar el ejemplo ya resuelto por Kapi.", contenidoTextual: "Páginas 20 a 29 con su huella correspondiente ya visible.", imagenesFondo: "Libro abierto, 10 páginas con huellas.", botones: "Continuar", animacion: "Kapi señala cada página al pasar.", audio: "Primera parte de la consigna.", condicionAvance: "Al tocar Continuar." },
    { id: uid(), idPantalla: "P2-02", nombre: "Para completar: páginas 30 a 39", proposito: "Registrar la elección libre del niño.", contenidoTextual: "Páginas 30 a 39 sin huella asignada.", imagenesFondo: "Libro abierto, 10 páginas vacías, ícono de huella delantera y trasera para elegir.", botones: "Listo", animacion: "—", audio: "Segunda parte de la consigna.", condicionAvance: "Las 10 páginas con una huella asignada + botón 'Listo'." },
  ];
  a2.interacciones = [
    { id: uid(), accion: "Observar", descripcion: "Observa el modelo de las páginas 20 a 29.", respuesta: "No requiere validación." },
    { id: uid(), accion: "Elegir", descripcion: "Para cada página del 30 al 39, elige huella delantera o trasera.", respuesta: "La página muestra la huella elegida; el niño puede cambiarla las veces que quiera antes de tocar 'Listo'." },
  ];
  a2.estados = [
    { id: uid(), estado: "Respuesta correcta", queHizo: "Completó las 10 páginas.", queInterpreta: "Registro completo, sin evaluar si el criterio fue el 'correcto' (no corresponde en esta actividad).", queOcurre: "Se guarda el registro para confrontar en la Actividad 3.", proximoPaso: "Habilita el avance." },
    { id: uid(), estado: "Respuesta parcialmente correcta", queHizo: "Completó algunas páginas, no todas.", queInterpreta: "Registro parcial.", queOcurre: "Se invita a completar las que faltan.", proximoPaso: "El niño continúa desde donde quedó." },
    { id: uid(), estado: "Sin respuesta", queHizo: "No asignó ninguna huella.", queInterpreta: "Todavía no comenzó.", queOcurre: "Kapi reaparece con una invitación breve.", proximoPaso: "El niño puede comenzar cuando quiera." },
  ];
  a2.feedback = [
    { id: uid(), estadoRef: "Respuesta correcta", queSignifica: "Completó su propio criterio de clasificación para las 10 páginas.", queDebe: "Consecuencia", textoExacto: "¡Ya sos un detective con mucha experiencia! Guardemos tus huellas para la próxima pista.", audioExacto: "¡Ya sos un detective con mucha experiencia! Guardemos tus huellas para la próxima pista." },
    { id: uid(), estadoRef: "Respuesta parcialmente correcta", queSignifica: "Está en proceso; puede seguir explorando.", queDebe: "Pregunta", textoExacto: "Vas por buen camino. ¿Seguimos con las páginas que faltan?", audioExacto: "Vas por buen camino. ¿Seguimos con las páginas que faltan?" },
    { id: uid(), estadoRef: "Sin respuesta", queSignifica: "Todavía no se decidió a empezar.", queDebe: "Pregunta", textoExacto: "¿Empezamos por la página 30? Fijate qué número tiene.", audioExacto: "¿Empezamos por la página 30? Fijate qué número tiene." },
  ];
  a2.personaje = [{ id: uid(), quienHabla: "Kapi", cuandoAparece: "Al entrar a P2-01.", audio: "Observá las páginas del libro. Kapi ya dejó sus huellitas.", textoPantalla: "Igual al audio.", accionPersonaje: "Señala cada página del modelo.", accionNino: "Observa, luego elige libremente en P2-02.", fraseConexion: "Ahora vamos a ver cómo lo resolvió cada uno de tus compañeros." }];
  a2.visual = { escenarioFondo: "Libro abierto sobre fondo de esteros.", coloresDominantes: "Verdes y celestes, con las huellas en un tono cálido que contraste.", objetosPersonajes: "20 páginas numeradas, huellas, Kapi.", tamanoUbicacion: "Las páginas se disponen en cuadrícula, numeradas de forma bien visible.", iconografia: "Huella delantera y trasera como íconos seleccionables." };
  a2.sonido = [{ id: uid(), sonId: "AUD-2-01", tipo: "Narración", duracion: "14 segundos", disparador: "Al entrar a cada pantalla.", alternativa: "Texto en pantalla." }];
  a2.accesibilidad = { audioTexto: "Sí, en ambas pantallas.", instruccionesClaras: "Una sola consigna por pantalla.", alternativasColor: "Las huellas se distinguen por forma, no solo por color.", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "Se muestra un grupo de páginas por vez." };
  a2.datos = { queRegistra: "Para cada página del 30 al 39, qué tipo de huella eligió el niño.", tipoRespuesta: "Selección", respuestaEsperada: "No aplica en esta actividad (es exploración libre, sin corrección).", alternativasValidas: "Cualquier combinación es válida como procedimiento propio: se registra para confrontar en la Actividad 3.", parcialmenteValidas: "No aplica." };
  a2.navFinal = { cuandoTermina: "Cuando las 10 páginas tienen una huella asignada y se toca 'Listo'.", cuandoHabilita: "Inmediatamente después.", completarTodo: "Debe completar las 10 páginas antes de continuar (no hay respuesta incorrecta que lo impida).", variosIntentos: "Puede cambiar su elección las veces que quiera antes de confirmar.", siAbandona: "Se guarda el registro parcial ya realizado." };
  a2.casosLimite = a2.casosLimite.map((c) => {
    if (c.situacion.includes("Borra una respuesta")) return { ...c, comportamiento: "Puede volver a elegir la huella de una página ya asignada, sin límite.", feedback: "Sin mensaje; se actualiza la huella mostrada.", accionPosterior: "Continúa normalmente." };
    if (c.situacion.includes("no responde")) return { ...c, comportamiento: "Detecta inactividad tras un lapso a definir.", feedback: "Kapi reaparece con una invitación breve.", accionPosterior: "El niño puede retomar en cualquier momento." };
    return c;
  });
  a2.matriz = [
    { id: uid(), accionNino: "Elige una huella para una página", respuestaEsperada: "Registro de la elección", respuestaSistema: "La página muestra la huella elegida.", feedback: "Sin feedback verbal (es exploración).", proximaAccion: "Puede seguir eligiendo o tocar 'Listo'." },
    { id: uid(), accionNino: "Toca 'Listo' con las 10 páginas completas", respuestaEsperada: "Intención de finalizar", respuestaSistema: "Guarda el registro completo del niño.", feedback: "Según el estado (completo/parcial).", proximaAccion: "Avanza a la Actividad 3." },
  ];
  a2.storyboard = [
    { id: uid(), pantallaRef: "P2-01", queVe: "Modelo de páginas 20 a 29 ya resuelto.", queEscucha: "Explicación del modelo.", queHace: "Observa y toca Continuar.", quePuedePasar: "Solo avanza.", queHaceSistema: "Pasa a P2-02.", feedback: "No aplica.", comoContinua: "Automático al tocar Continuar." },
    { id: uid(), pantallaRef: "P2-02", queVe: "10 páginas del 30 al 39 sin resolver.", queEscucha: "Consigna de completar libremente.", queHace: "Elige huella para cada página.", quePuedePasar: "Completa todo / completa parcial / no hace nada.", queHaceSistema: "Registra cada elección en tiempo real.", feedback: "Según estado al tocar Listo.", comoContinua: "Avanza a Actividad 3 al completar las 10 páginas." },
  ];

  // ACTIVIDAD 3 — Confrontación y puesta en común (Bloque J)
  const a3 = m.actividades[2];
  a3.contenido = "Agrupamiento de los números 0 a 9 según el tipo de huella, comparando criterios.";
  a3.propositoDidactico = "Comparar los criterios que usó cada niño en la Actividad 2 y aproximarse, mediante el agrupamiento, a la regularidad del dígito de las unidades.";
  a3.relacionAnterior = "Retoma las huellas asignadas libremente en la Actividad 2.";
  a3.relacionSiguiente = "El agrupamiento logrado aquí es lo que se nombra formalmente como 'par' e 'impar' en la Actividad 4.";
  a3.evidencia = "El niño agrupa correctamente los 10 números según el patrón del dígito final, con o sin ensayo y error.";
  a3.pasajeSiguiente = "Se habilita cuando los 10 números quedaron ubicados en el grupo correcto (puede requerir varios intentos, ya que el número que no corresponde rebota).";
  a3.situacion = {
    contexto: "El mismo libro de huellas, ahora con los números del 0 al 9 sueltos.",
    escenario: "Dos zonas de agrupamiento: huella delantera y huella trasera.",
    personajes: "Kapi.",
    queOcurre: "Kapi cuenta cuántas huellas dejó en total y propone ordenarlas entre todos.",
    queProblema: "Hay que decidir en qué grupo va cada número del 0 al 9.",
  };
  a3.consigna = {
    textoPantalla: "Arrastrá los números que terminan igual que las páginas con mi patita delantera a un grupo, y los que terminan igual que mi patita trasera al otro.",
    textoAudio: "¡Guau! ¡Cuántas huellas dejé en el libro! Te doy los números del 1 al 10... ¡Ordenalos en dos grupos, como un verdadero detective de huellas!",
    quienLoDice: "Kapi", tono: "Alegre, celebratorio.", velocidad: "Pausada",
  };
  a3.mapa = {
    puntoEntrada: "Pantalla con los 10 números sueltos y las dos zonas de agrupamiento.",
    pantallasInvolucradas: "P3-01, P3-02",
    decisionesNino: "En qué grupo colocar cada uno de los 10 números.",
    caminosPosibles: "Camino A: agrupa todo correctamente sin rebotes. Camino B: algunos números rebotan y el niño reintenta hasta acertar.",
    reintentosAyudas: "El número que no corresponde rebota a su lugar original; no hay límite de reintentos.",
  };
  a3.pantallas = [
    { id: uid(), idPantalla: "P3-01", nombre: "Zonas de agrupamiento", proposito: "Que el niño arrastre cada número a su grupo.", contenidoTextual: "Consigna de Kapi + 10 números sueltos.", imagenesFondo: "Dos zonas rotuladas con huella delantera y huella trasera, números del 0 al 9 dispersos.", botones: "Listo", animacion: "El número rebota si se suelta en la zona incorrecta.", audio: "Narración de la consigna.", condicionAvance: "Los 10 números correctamente ubicados." },
    { id: uid(), idPantalla: "P3-02", nombre: "Resultado del agrupamiento", proposito: "Mostrar los dos grupos ya formados.", contenidoTextual: "Grupo delantera: 0,2,4,6,8 — Grupo trasera: 1,3,5,7,9.", imagenesFondo: "Los dos grupos completos, con las huellas correspondientes.", botones: "Continuar", animacion: "Aplauso de Kapi.", audio: "Felicitación de Kapi.", condicionAvance: "Al tocar Continuar." },
  ];
  a3.interacciones = [
    { id: uid(), accion: "Arrastrar", descripcion: "Arrastra un número hacia una de las dos zonas.", respuesta: "Si la zona corresponde, el número se acomoda con una animación suave; si no corresponde, rebota y vuelve a su posición original, sin mensaje de error en pantalla." },
    { id: uid(), accion: "Soltar", descripcion: "Suelta el número dentro de una zona.", respuesta: "El sistema evalúa si la zona es la correcta para ese número y aplica el comportamiento de arrastre." },
  ];
  a3.estados = [
    { id: uid(), estado: "Respuesta correcta", queHizo: "Ubicó los 10 números en su grupo correcto.", queInterpreta: "Agrupamiento logrado.", queOcurre: "Se muestra el resultado final y se avanza a P3-02.", proximoPaso: "Habilita el paso a la Actividad 4." },
    { id: uid(), estado: "Interacción incompleta", queHizo: "Ubicó algunos números, otros siguen sueltos.", queInterpreta: "Agrupamiento en curso.", queOcurre: "No hay mensaje; el niño sigue intentando.", proximoPaso: "Continúa hasta ubicar todos." },
    { id: uid(), estado: "Error frecuente identificado", queHizo: "Intenta reiteradamente colocar un número en la zona incorrecta (más de 2 veces el mismo número).", queInterpreta: "Podría estar mirando el número equivocado si la página tuviera dos cifras (patrón del error real: mirar el primer dígito).", queOcurre: "El número sigue rebotando; no se fuerza la respuesta.", proximoPaso: "El niño puede seguir intentando sin límite." },
  ];
  a3.feedback = [
    { id: uid(), estadoRef: "Respuesta correcta", queSignifica: "Logró agrupar los 10 números según el patrón del dígito final.", queDebe: "Consecuencia", textoExacto: "¡Lo hiciste genial, detective de huellas! Mirá qué bien quedaron armados los dos grupos.", audioExacto: "¡Lo hiciste genial, detective de huellas! Mirá qué bien quedaron armados los dos grupos." },
    { id: uid(), estadoRef: "Error frecuente identificado", queSignifica: "Está probando con un criterio que todavía no funciona para este número.", queDebe: "Pregunta", textoExacto: "Fijate bien: ¿con qué número termina? Probá de nuevo.", audioExacto: "Fijate bien: ¿con qué número termina? Probá de nuevo." },
  ];
  a3.personaje = [{ id: uid(), quienHabla: "Kapi", cuandoAparece: "Al entrar a P3-01 y al completar el agrupamiento.", audio: "¡Guau! ¡Cuántas huellas dejé en el libro! Ordenalos en dos grupos, como un verdadero detective de huellas.", textoPantalla: "Igual al audio.", accionPersonaje: "Señala los números sueltos y después aplaude al ver el resultado.", accionNino: "Arrastra cada número a la zona que crea correcta, cuantas veces necesite.", fraseConexion: "¡Ahora que las agrupamos, vamos a ponerles nombre a estos dos grupos!" }];
  a3.visual = { escenarioFondo: "Libro de huellas con los números sueltos sobre la mesa.", coloresDominantes: "Verdes y celestes del paisaje, números en color cálido bien contrastado.", objetosPersonajes: "10 números, dos zonas de agrupamiento, Kapi.", tamanoUbicacion: "Las dos zonas ocupan los laterales; los números sueltos, el centro.", iconografia: "Huella delantera y trasera como rótulo de cada zona." };
  a3.sonido = [
    { id: uid(), sonId: "AUD-3-01", tipo: "Narración", duracion: "10 segundos", disparador: "Al entrar a P3-01.", alternativa: "Texto en pantalla." },
    { id: uid(), sonId: "AUD-3-02", tipo: "Efecto de interacción", duracion: "", disparador: "Al rebotar un número.", alternativa: "No requiere alternativa (no informativo)." },
  ];
  a3.accesibilidad = { audioTexto: "Sí, consigna y feedback narrados.", instruccionesClaras: "Consigna breve, una sola acción por vez.", alternativasColor: "Las zonas se distinguen por el ícono de huella, no solo por color.", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "Un solo grupo de números visible por vez." };
  a3.datos = { queRegistra: "En qué grupo (delantera/trasera) quedó ubicado cada uno de los 10 números.", tipoRespuesta: "Arrastre", respuestaEsperada: "Delantera: 0,2,4,6,8 — Trasera: 1,3,5,7,9.", alternativasValidas: "No hay alternativas válidas: el agrupamiento correcto es único, aunque se llegue por ensayo y error.", parcialmenteValidas: "Agrupamiento con algunos números aún sin ubicar." };
  a3.navFinal = { cuandoTermina: "Cuando los 10 números están en su grupo correcto.", cuandoHabilita: "Inmediatamente, mostrando P3-02.", completarTodo: "Debe completar el agrupamiento correcto de los 10 números (no hay forma de avanzar con números mal ubicados, ya que rebotan).", variosIntentos: "Sin límite de intentos por número.", siAbandona: "Se guarda el agrupamiento parcial ya logrado." };
  a3.casosLimite = a3.casosLimite.map((c) => {
    if (c.situacion.includes("zona incorrecta")) return { ...c, comportamiento: "El número rebota y vuelve a su posición original, sin mensaje de error en pantalla.", feedback: "Puede acompañarse de un sonido neutro de rebote.", accionPosterior: "El niño puede volver a intentar sin límite." };
    if (c.situacion.includes("dos opciones")) return { ...c, comportamiento: "No aplica: la interacción es de a un número por vez.", feedback: "No corresponde.", accionPosterior: "No corresponde." };
    return c;
  });
  a3.matriz = [
    { id: uid(), accionNino: "Arrastra el número 4 a la zona 'delantera'", respuestaEsperada: "Agrupamiento correcto", respuestaSistema: "El número se acomoda en la zona; se actualiza el grupo.", feedback: "Sonido neutro de confirmación.", proximaAccion: "Puede seguir agrupando o tocar 'Listo'." },
    { id: uid(), accionNino: "Arrastra el número 3 a la zona 'delantera' (incorrecto)", respuestaEsperada: "El sistema detecta que no corresponde", respuestaSistema: "El número rebota a su posición original.", feedback: "Sin mensaje punitivo; sonido neutro.", proximaAccion: "El niño reintenta con el mismo número." },
    { id: uid(), accionNino: "Completa los 10 números en su grupo correcto", respuestaEsperada: "Agrupamiento total logrado", respuestaSistema: "Muestra P3-02 con el resultado.", feedback: "Felicitación de Kapi.", proximaAccion: "Avanza a la Actividad 4." },
  ];
  a3.storyboard = [
    { id: uid(), pantallaRef: "P3-01", queVe: "10 números sueltos y dos zonas de agrupamiento.", queEscucha: "Consigna de Kapi.", queHace: "Arrastra cada número a una zona.", quePuedePasar: "Acierta / el número rebota / deja números sin ubicar.", queHaceSistema: "Evalúa cada arrastre en tiempo real.", feedback: "Sonido de confirmación o rebote, sin texto punitivo.", comoContinua: "Pasa a P3-02 al completar el agrupamiento." },
    { id: uid(), pantallaRef: "P3-02", queVe: "Los dos grupos completos.", queEscucha: "Felicitación de Kapi.", queHace: "Observa el resultado y toca Continuar.", quePuedePasar: "Solo avanza.", queHaceSistema: "Guarda el resultado final.", feedback: "Aplauso de Kapi.", comoContinua: "Avanza a la Actividad 4." },
  ];
  a3.confrontacion = {
    estrategia1Proc: "Algunos niños recuerdan de memoria qué huella tenía cada página ya vista, sin fijarse en el número.",
    estrategia1Exp: "Funciona para las páginas ya mostradas, pero no permite predecir páginas nuevas (como el 40 o el 51).",
    estrategia2Proc: "Otros niños se fijan en el último número de la página (el que está más a la derecha) y lo asocian siempre con la misma huella.",
    estrategia2Exp: "Es más eficiente: alcanza con mirar cómo termina el número para saber qué huella corresponde, sin memorizar cada página.",
    estrategia3Error: "Un error frecuente es fijarse en el primer número de la página en lugar del último (por ejemplo, mirar el '3' de 35 en vez del '5').",
    guionPreguntas: "¿Vos cómo elegiste la huella para cada página? ¿Te fijaste en algo en especial? ¿Qué número mirás primero: el de la izquierda o el de la derecha? ¿Por qué creés que el 32 y el 34 tienen la misma huella?",
    tipoInteraccion: "El niño arrastra los números del 0 al 9 hacia dos grupos: 'huella delantera' o 'huella trasera'. Si suelta un número en el grupo incorrecto, el número rebota sin mensaje punitivo.",
    feedback: "Se muestra cómo, número por número, el grupo de 'huella delantera' va formando la serie 0-2-4-6-8 y el de 'huella trasera' la serie 1-3-5-7-9, para que el niño vea la regularidad sin que se la digan directamente.",
    frasePuente: "¡Guau, cuántas huellas! Ahora que las agrupamos, vamos a ponerles nombre a estos dos grupos.",
  };

  // ACTIVIDAD 4 — Sistematización
  const a4 = m.actividades[3];
  a4.contenido = "Nombrar como 'par' e 'impar' el agrupamiento logrado en la Actividad 3.";
  a4.propositoDidactico = "Nombrar y formalizar como conocimiento compartido lo construido al agrupar las huellas: la noción de número par e impar según el dígito de las unidades.";
  a4.relacionAnterior = "Retoma los dos grupos armados en la Actividad 3 (huella delantera / huella trasera).";
  a4.relacionSiguiente = "El nombre 'par' e 'impar' se pone a prueba con números nuevos en la Actividad 5.";
  a4.evidencia = "El niño puede nombrar como 'par' o 'impar' un número que no vio en la actividad anterior, apoyándose en su último dígito.";
  a4.pasajeSiguiente = "Se habilita al escuchar/leer el cierre y avanzar.";
  a4.situacion = { contexto: "El libro de huellas ya con los dos grupos armados.", escenario: "Pantalla de cierre conceptual, tipo 'ticket de salida'.", personajes: "Kapi.", queOcurre: "Kapi celebra el trabajo hecho y comparte el nombre de lo que descubrieron.", queProblema: "No hay problema a resolver: es momento de nombrar lo aprendido." };
  a4.consigna = {
    textoPantalla: "¡Lo hiciste genial, detective de huellas! Antes de irte, te dejo este súper secreto numérico: los números que terminan en 0, 2, 4, 6 y 8 son PARES. Y los que terminan en 1, 3, 5, 7 y 9 son IMPARES. ¡Guardalo como tu ticket de salida!",
    textoAudio: "¡Lo hiciste genial, detective de huellas! Antes de irte, te dejo este súper secreto numérico. Los números que terminan en 0, 2, 4, 6 y 8 son pares. Y los que terminan en 1, 3, 5, 7 y 9… ¡son impares! Guardalo como tu ticket de salida y seguí investigando el mundo con Kapi.",
    quienLoDice: "Kapi", tono: "Alegre, celebratorio.", velocidad: "Normal",
  };
  a4.mapa = { puntoEntrada: "Pantalla de cierre conceptual (ticket de salida).", pantallasInvolucradas: "P4-01", decisionesNino: "No hay decisión: es una pantalla informativa.", caminosPosibles: "Un único camino: leer/escuchar y continuar.", reintentosAyudas: "Puede volver a escuchar el ticket las veces que quiera." };
  a4.pantallas = [{ id: uid(), idPantalla: "P4-01", nombre: "Ticket de salida: pares e impares", proposito: "Nombrar formalmente el conocimiento construido.", contenidoTextual: "Texto completo del 'secreto numérico'.", imagenesFondo: "Los dos grupos de la Actividad 3, ahora rotulados como PARES e IMPARES.", botones: "Guardar mi ticket", animacion: "Kapi entrega un ticket ilustrado.", audio: "Narración completa del cierre.", condicionAvance: "Al tocar 'Guardar mi ticket'." }];
  a4.interacciones = [{ id: uid(), accion: "Escuchar", descripcion: "Escucha o relee el 'secreto numérico'.", respuesta: "Puede repetirse sin límite tocando el ícono de Kapi." }, { id: uid(), accion: "Tocar", descripcion: "Toca 'Guardar mi ticket'.", respuesta: "Avanza a la Actividad 5." }];
  a4.estados = [{ id: uid(), estado: "Respuesta correcta", queHizo: "Escuchó/leyó el ticket y avanzó.", queInterpreta: "Cierre conceptual alcanzado.", queOcurre: "Se guarda el ticket como referencia.", proximoPaso: "Avanza a la Actividad 5." }, { id: uid(), estado: "Sin respuesta", queHizo: "No toca el botón por un lapso prolongado.", queInterpreta: "Inactividad.", queOcurre: "Kapi reaparece invitando a guardar el ticket.", proximoPaso: "El niño puede continuar cuando quiera." }];
  a4.feedback = [{ id: uid(), estadoRef: "Sin respuesta", queSignifica: "Todavía no confirmó haber leído el ticket.", queDebe: "Pregunta", textoExacto: "¿Guardamos el ticket para seguir investigando?", audioExacto: "¿Guardamos el ticket para seguir investigando?" }];
  a4.personaje = [{ id: uid(), quienHabla: "Kapi", cuandoAparece: "Al entrar a P4-01.", audio: "Los números que terminan en 0, 2, 4, 6 y 8 son pares. Y los que terminan en 1, 3, 5, 7 y 9… ¡son impares!", textoPantalla: "Igual al audio.", accionPersonaje: "Kapi entrega un ticket ilustrado con los dos grupos rotulados.", accionNino: "Escucha, puede repetir, y toca 'Guardar mi ticket'.", fraseConexion: "Ahora vamos a probar este secreto con huellas nuevas." }];
  a4.visual = { escenarioFondo: "Los dos grupos de la Actividad 3, ahora con rótulos PARES / IMPARES.", coloresDominantes: "Se mantiene la paleta verde-celeste, con el ticket en un color cálido destacado.", objetosPersonajes: "Ticket ilustrado, los dos grupos numéricos, Kapi.", tamanoUbicacion: "El ticket ocupa el centro; los grupos numéricos quedan de referencia arriba.", iconografia: "Sello de 'ticket de salida' sobre el cartel final." };
  a4.sonido = [{ id: uid(), sonId: "AUD-4-01", tipo: "Narración", duracion: "16 segundos", disparador: "Al entrar a P4-01.", alternativa: "Texto completo en pantalla." }];
  a4.accesibilidad = { audioTexto: "Sí, todo el cierre está narrado y escrito.", instruccionesClaras: "Un único mensaje, sin ambigüedad.", alternativasColor: "Los rótulos PARES/IMPARES usan texto, no solo color.", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "Un solo bloque de cierre." };
  a4.datos = { queRegistra: "Que el niño llegó a esta pantalla (no hay respuesta que evaluar).", tipoRespuesta: "Selección", respuestaEsperada: "No aplica (pantalla informativa).", alternativasValidas: "No aplica.", parcialmenteValidas: "No aplica." };
  a4.navFinal = { cuandoTermina: "Al tocar 'Guardar mi ticket'.", cuandoHabilita: "Inmediatamente.", completarTodo: "No aplica.", variosIntentos: "No aplica.", siAbandona: "Se guarda el ticket como pendiente de confirmar en el próximo ingreso." };
  a4.matriz = [{ id: uid(), accionNino: "Toca 'Guardar mi ticket'", respuestaEsperada: "Confirmación de cierre conceptual", respuestaSistema: "Guarda el ticket y avanza.", feedback: "Sonido de logro.", proximaAccion: "Comienza la Actividad 5." }];
  a4.storyboard = [{ id: uid(), pantallaRef: "P4-01", queVe: "Ticket de salida con el secreto numérico.", queEscucha: "Narración completa de Kapi.", queHace: "Escucha y toca 'Guardar mi ticket'.", quePuedePasar: "Solo avanza (no hay error posible).", queHaceSistema: "Guarda el ticket como referencia.", feedback: "No aplica.", comoContinua: "Avanza a la Actividad 5 al tocar el botón." }];

  // ACTIVIDAD 5 — Producción y cierre
  const a5 = m.actividades[4];
  a5.contenido = "Clasificación de números nuevos y producción final sobre lo aprendido.";
  a5.propositoDidactico = "Transferir la regularidad de par/impar a números nuevos y poner en palabras lo aprendido.";
  a5.relacionAnterior = "Aplica el 'secreto numérico' nombrado en la Actividad 4.";
  a5.relacionSiguiente = "Cierra el módulo; no hay actividad siguiente.";
  a5.evidencia = "El niño clasifica correctamente números nuevos (que no vio en el módulo) y puede explicar con sus palabras el criterio que usó.";
  a5.pasajeSiguiente = "No aplica (última actividad del módulo).";
  a5.situacion = { contexto: "El libro de huellas, con páginas nuevas que Kapi no había mostrado antes.", escenario: "Páginas del 41 al 50.", personajes: "Kapi.", queOcurre: "Kapi encontró más huellas, de páginas que todavía no exploraron juntos.", queProblema: "Hay que clasificar estos números nuevos usando el secreto aprendido, y después contarle a Kapi qué se aprendió." };
  a5.consigna = {
    textoPantalla: "Kapi encontró más huellas, ¡pero estas son de páginas que todavía no vimos! Elegí si cada número es par o impar. Al final, contale a Kapi: ¿qué aprendiste sobre los números pares e impares?",
    textoAudio: "Kapi encontró más huellas, pero estas son de páginas que todavía no vimos juntos. Elegí si cada número es par o impar, usando el secreto que aprendiste. Al final, contale a Kapi qué aprendiste sobre los números pares e impares.",
    quienLoDice: "Kapi", tono: "Cálido, alentador.", velocidad: "Pausada",
  };
  a5.mapa = { puntoEntrada: "Pantalla con números nuevos por clasificar.", pantallasInvolucradas: "P5-01, P5-02", decisionesNino: "Clasificar cada número nuevo como par o impar; luego escribir o dictar una producción final.", caminosPosibles: "Camino A: clasifica todo bien y produce el cierre. Camino B: se equivoca en algún número y recibe una pista para revisar el último dígito.", reintentosAyudas: "Puede corregir su clasificación antes de confirmar." };
  a5.pantallas = [
    { id: uid(), idPantalla: "P5-01", nombre: "Huellas nuevas: páginas 41 a 50", proposito: "Transferir el criterio a números no vistos.", contenidoTextual: "Consigna + 10 números nuevos con opción par/impar.", imagenesFondo: "Nuevas páginas del libro, con espacio para marcar par o impar.", botones: "Confirmar", animacion: "—", audio: "Consigna de la actividad.", condicionAvance: "Los 10 números clasificados + botón Confirmar." },
    { id: uid(), idPantalla: "P5-02", nombre: "Contale a Kapi qué aprendiste", proposito: "Producción final que evidencia el aprendizaje.", contenidoTextual: "Campo de escritura libre, con inicios de frase sugeridos.", imagenesFondo: "Kapi esperando con gesto atento.", botones: "Enviar", animacion: "Kapi asiente mientras 'escucha'.", audio: "Consigna de producción.", condicionAvance: "Al tocar Enviar con una respuesta escrita." },
  ];
  a5.interacciones = [
    { id: uid(), accion: "Elegir", descripcion: "Para cada número nuevo, elige 'par' o 'impar'.", respuesta: "El número muestra la opción elegida; puede cambiarla antes de confirmar." },
    { id: uid(), accion: "Escribir", descripcion: "Escribe una oración sobre qué aprendió.", respuesta: "El sistema acepta el texto libre; si el campo está vacío, el botón Enviar permanece inactivo." },
  ];
  a5.estados = [
    { id: uid(), estado: "Respuesta correcta", queHizo: "Clasificó correctamente los 10 números nuevos.", queInterpreta: "Logró transferir el criterio.", queOcurre: "Avanza a la producción final.", proximoPaso: "Pasa a P5-02." },
    { id: uid(), estado: "Error frecuente identificado", queHizo: "Se equivoca en alguno de los números nuevos.", queInterpreta: "Puede estar dudando entre el primer y el último dígito.", queOcurre: "Se ofrece revisar ese número puntual.", proximoPaso: "Puede corregir antes de confirmar." },
    { id: uid(), estado: "Interacción incompleta", queHizo: "Escribe la producción final de forma muy breve o vacía.", queInterpreta: "Puede necesitar un inicio de frase.", queOcurre: "Se sugieren frases de apoyo.", proximoPaso: "Puede completar con ayuda del inicio sugerido." },
  ];
  a5.feedback = [
    { id: uid(), estadoRef: "Respuesta correcta", queSignifica: "Aplicó el secreto numérico a casos nuevos.", queDebe: "Consecuencia", textoExacto: "¡Sos un experto en huellas numéricas! Kapi está orgulloso.", audioExacto: "¡Sos un experto en huellas numéricas! Kapi está orgulloso." },
    { id: uid(), estadoRef: "Error frecuente identificado", queSignifica: "Todavía no aplica el criterio de forma estable.", queDebe: "Pregunta", textoExacto: "Fijate de nuevo en el último número. ¿Con qué grupo de huellas se parece?", audioExacto: "Fijate de nuevo en el último número. ¿Con qué grupo de huellas se parece?" },
    { id: uid(), estadoRef: "Interacción incompleta", queSignifica: "Necesita un puntapié inicial para escribir.", queDebe: "Pregunta", textoExacto: "Podés empezar así: 'El kapivára me enseñó que los números...'", audioExacto: "Podés empezar así: 'El kapivára me enseñó que los números...'" },
  ];
  a5.personaje = [{ id: uid(), quienHabla: "Kapi", cuandoAparece: "Al entrar a P5-01 y P5-02.", audio: "Kapi encontró más huellas, pero estas son de páginas que todavía no vimos juntos.", textoPantalla: "Igual al audio.", accionPersonaje: "Espera con gesto curioso mientras el niño clasifica y escribe.", accionNino: "Clasifica los números nuevos y escribe su producción final.", fraseConexion: "¡Felicitaciones! Aprendiste el secreto de los números pares e impares. Kapi te espera para la próxima aventura." }];
  a5.visual = { escenarioFondo: "Libro de huellas con páginas nuevas, luego Kapi en primer plano para la producción.", coloresDominantes: "Se mantiene la paleta verde-celeste del módulo.", objetosPersonajes: "10 números nuevos, campo de escritura, Kapi.", tamanoUbicacion: "Los números nuevos en cuadrícula; el campo de escritura centrado con Kapi al costado.", iconografia: "Ícono de 'par' e 'impar' reutilizado de la Actividad 4." };
  a5.sonido = [{ id: uid(), sonId: "AUD-5-01", tipo: "Narración", duracion: "15 segundos", disparador: "Al entrar a cada pantalla.", alternativa: "Texto en pantalla." }];
  a5.accesibilidad = { audioTexto: "Sí, en ambas pantallas.", instruccionesClaras: "Consigna de clasificación y de producción separadas.", alternativasColor: "Par/impar se indican con texto además de color.", tamanoBotones: "Pendiente de definición por Guía de Pautas / Desarrollo Digital", cantidadInfo: "Una tarea por pantalla." };
  a5.datos = { queRegistra: "Clasificación de 10 números nuevos + texto libre de cierre.", tipoRespuesta: "Selección", respuestaEsperada: "Según el número: par si termina en 0,2,4,6,8; impar si termina en 1,3,5,7,9.", alternativasValidas: "No aplica para la clasificación; para la producción final, cualquier oración que mencione la regularidad de pares/impares.", parcialmenteValidas: "Clasificación con algún número aún no revisado." };
  a5.navFinal = { cuandoTermina: "Al enviar la producción final en P5-02.", cuandoHabilita: "No aplica (cierre del módulo).", completarTodo: "Debe clasificar los 10 números y escribir al menos una oración antes de enviar.", variosIntentos: "Puede corregir la clasificación antes de confirmar; la producción final se puede reescribir antes de enviar.", siAbandona: "Se guarda la clasificación y el texto ya escrito, para retomar." };
  a5.casosLimite = a5.casosLimite.map((c) => {
    if (c.situacion.includes("no responde")) return { ...c, comportamiento: "Detecta inactividad tras un lapso a definir.", feedback: "Kapi invita a seguir con una frase breve.", accionPosterior: "El niño retoma cuando quiera." };
    return c;
  });
  a5.matriz = [
    { id: uid(), accionNino: "Clasifica un número nuevo como par o impar", respuestaEsperada: "Clasificación correcta", respuestaSistema: "Marca el número con la categoría elegida.", feedback: "Según el estado al confirmar.", proximaAccion: "Puede seguir clasificando o confirmar." },
    { id: uid(), accionNino: "Escribe la producción final y toca Enviar", respuestaEsperada: "Texto libre relacionado con lo aprendido", respuestaSistema: "Guarda la producción y muestra el mensaje de cierre del módulo.", feedback: "Mensaje de felicitación final.", proximaAccion: "Finaliza el módulo." },
  ];
  a5.storyboard = [
    { id: uid(), pantallaRef: "P5-01", queVe: "10 números nuevos por clasificar.", queEscucha: "Consigna de transferencia.", queHace: "Clasifica cada número.", quePuedePasar: "Clasifica todo bien / se equivoca en alguno.", queHaceSistema: "Evalúa cada clasificación.", feedback: "Pista si hay error, felicitación si está todo bien.", comoContinua: "Pasa a P5-02 al confirmar." },
    { id: uid(), pantallaRef: "P5-02", queVe: "Campo de escritura y Kapi esperando.", queEscucha: "Consigna de producción final.", queHace: "Escribe su producción y la envía.", quePuedePasar: "Escribe bien / escribe muy poco / no escribe.", queHaceSistema: "Sugiere inicios de frase si el texto es muy breve.", feedback: "Mensaje final de felicitación del módulo.", comoContinua: "Finaliza el módulo." },
  ];

  m.recursos = [
    { id: uid(), recId: "GRA-01", recurso: "Kapi (personaje, distintas poses)", tipo: "Gráfico", descripcion: "Kapi curioso, señalando, celebrando, entregando un ticket.", uso: "Todas las actividades", estado: "Aprobado", responsable: "Equipo gráfico" },
    { id: uid(), recId: "GRA-02", recurso: "Libro de huellas ilustrado", tipo: "Gráfico", descripcion: "Libro abierto con páginas numeradas y huellas.", uso: "Actividades 1, 2 y 3", estado: "Aprobado", responsable: "Equipo gráfico" },
    { id: uid(), recId: "GRA-03", recurso: "Huella delantera / huella trasera (íconos)", tipo: "Gráfico", descripcion: "Par de íconos claramente distinguibles por forma.", uso: "Actividades 2, 3, 4 y 5", estado: "Aprobado", responsable: "Equipo gráfico" },
    { id: uid(), recId: "AUD-00", recurso: "Banco de narraciones de Kapi", tipo: "Sonoro", descripcion: "Locución cálida y cercana, según guiones de cada pantalla.", uso: "Todas las actividades", estado: "En producción", responsable: "Locución" },
  ];
  m.navegacion = {
    inicio: "Lleva a la pantalla de presentación del módulo (Actividad 1).",
    continuar: "Avanza a la pantalla o actividad siguiente, solo si se cumple la condición de avance definida en cada actividad.",
    volver: "Regresa a la pantalla anterior dentro de la misma actividad, sin perder el progreso ya registrado.",
    repetir: "Vuelve a reproducir el audio o la animación actual, sin alterar el estado de la actividad.",
    ayuda: "Repite la consigna o muestra la pista definida para el estado actual, según la actividad.",
  };
  m.tecnicas = "Se prioriza que el arrastre de números tenga una zona de tolerancia amplia, pensando en la motricidad fina de 7-8 años. El reconocimiento de voz de otras propuestas del cuadernillo no se usa en este módulo. Definición técnica a cargo de Desarrollo Digital; el equipo docente especifica únicamente la intención funcional descripta en cada bloque.";
  m.trazabilidad = m.actividades.map((a, i) => ({
    id: m.trazabilidad[i].id,
    disenoCurricular: "Número y Operaciones — Regularidades numéricas",
    objetivo: MOMENTOS[i].desc,
    momento: MOMENTOS[i].label,
    actividad: a.nombre,
    interaccion: (a.interacciones[0] && a.interacciones[0].accion) || "—",
    evidencia: a.evidencia,
    feedback: (a.feedback[0] && a.feedback[0].textoExacto) || "—",
    sistematizacion: i === 3 ? "Se nombra formalmente 'par' e 'impar' según el dígito de las unidades." : "—",
  }));
  m.versiones = [
    { version: "1.0", fecha: "01/08/2026", cambio: "Creación del documento a partir de la Propuesta N°13 'El Kapivára'.", responsable: "Trío 2º grado", motivo: "Inicio del diseño del módulo.", aprobadoPor: "—" },
    { version: "1.1", fecha: "04/08/2026", cambio: "Ajuste del Bloque J: se agregó el error frecuente real (mirar el primer dígito).", responsable: "Trío 2º grado", motivo: "Observación del especialista en didáctica.", aprobadoPor: "Especialista en Didáctica de la Matemática" },
    { version: "1.2", fecha: "06/08/2026", cambio: "Corrección de consistencia de nombres de personaje y ajuste de puntuación en todas las consignas.", responsable: "Corrector/a", motivo: "Corrección editorial.", aprobadoPor: "Corrector/a" },
    { version: "1.3", fecha: "08/08/2026", cambio: "Cierre del circuito y verificación READY FOR DEVELOPMENT.", responsable: "Coordinación General", motivo: "Todos los bloques obligatorios completos.", aprobadoPor: "Coordinación General" },
  ];
  m.comentarios = [
    { id: uid(), autor: "Especialista en Didáctica", rol: "Especialista en Didáctica", scope: `actividad:${a3.id}:confrontacion`, texto: "Muy buena elección del error frecuente (mirar el primer dígito en vez del último): es justo el que aparece en el aula. Quedó bien resuelto en la v1.1.", estado: "resuelto", fecha: "03/08/2026" },
    { id: uid(), autor: "Corrector/a", rol: "Corrector/a", scope: `actividad:${a1.id}:situacion`, texto: "Uniformar 'huellita' vs 'huella' a lo largo del módulo. Se usó 'huella' en todas las pantallas.", estado: "resuelto", fecha: "05/08/2026" },
  ];
  m.revisiones = {
    [`actividad:${a3.id}:confrontacion`]: { estado: "adecuado", autor: "Especialista en Didáctica", fecha: "03/08/2026" },
    [`actividad:${a1.id}:situacion`]: { estado: "adecuado", autor: "Corrector/a", fecha: "05/08/2026" },
  };
  m.checklistDocente = m.checklistDocente.map(() => true);
  m.checklistEspecialista = m.checklistEspecialista.map(() => true);
  m.checklistCorrector = m.checklistCorrector.map(() => true);
  m.checklistCoordinacion = m.checklistCoordinacion.map(() => true);
  return m;
}


/* ======================================================================
   GRADOS (organización principal de la plataforma)
====================================================================== */
export const GRADOS = [1, 2, 3, 4, 5, 6].map((n) => ({ n, label: `${n}º grado`, corto: `${n}°` }));
export const gradoNumero = (g) => { const m = String(g || "").match(/(\d)/); return m ? Number(m[1]) : 1; };
export const gradoLabel = (n) => `${n}º grado`;

/* ======================================================================
   NUEVOS BLOQUES — plantillas institucionales
====================================================================== */

// Plantilla_guia_pedagogica_Educaplay_v2.docx — los apartados 1 y 2 (P) no se guardan:
// se leen en vivo desde el módulo (fuente única de información).
export function blankOrientaciones() {
  return {
    inicial: {
      relacionModulo: "", varianteElegida: "", mediacionDocente: "",
      estarCercaRetomada: "", presentacionDesafio: "", preguntasDisparadoras: "",
      consignaInicio: "", queObservar: "", puenteDesarrollo: "",
    },
    desarrollo: {
      actividadModulo: "", duracion: "", organizacionGrupo: "",
      relanzarInteres: "", profundizarReflexion: "",
      erroresContenido: "", bloqueos: "", desacuerdos: "", conflictosConvivencia: "",
      indiciosAprendizaje: "", senalesRitmo: "",
      desconectada: {
        uso: "", tipo: "", checklist: [false, false, false, false, false],
        consignaTrabajo: "", propuesta: "", queHaceMaestra: "", queObservar: "",
      },
    },
    cierre: { actividadBreve: "", preguntas: "", aporteDocente: "", puestaEnComun: "", formaRegistro: "" },
    cuaderno: { consignaRegistro: "", momento: "", formato: "", mensajeFamilia: "" },
    materiales: { digitales: "", analogicos: "", preparacion: "" },
    referencias: { referencias: "", estado: "" },
  };
}

// Plantilla_Acompanar_propuestas_para_casa.docx — Módulo relacionado, Área y grado,
// Docente/s y Título se toman del módulo.
export function blankEstarCerca() {
  return {
    subseccion: "Estar cerca",
    tarjeta: { ideaBreve: "", tiempo: "" },
    vinculo: { queRetoma: "", conexionComunidad: "", queHaceNino: "", verbo: "", comoApareceEscuela: "" },
    pagina: {
      consignaPrincipal: "", conQuien: "", materiales: "",
      pregunta1: "", pregunta2: "", pregunta3: "",
      paraQuienAcompana: "", siQuierenSeguir: "", paraLlevarEscuela: "",
      pocoTiempo: "", sinObjetos: "",
    },
    control: [false, false, false, false, false, false, false],
  };
}

export const ESTAR_CERCA_TEXTO_FIJO = "Esta propuesta es opcional y no se evalúa. Si no pueden hacerla, no pasa nada: el niño puede seguir jugando y aprendiendo igual.";

// Cuadro_Mapa_de_Verbos.docx
export function blankAprendizaje() {
  return { id: uid(), verbo: "", verboNuevo: false, otroVerbo: "", queHace: "", queComprende: "", referenciaCurricular: "" };
}
export function blankMapaVerbos() {
  return { actividadExperiencia: "", aprendizajes: [blankAprendizaje(), blankAprendizaje(), blankAprendizaje()], checkFamilia: false };
}

export const VERBOS_CATEGORIAS = [
  { cat: "EXPLORAR", verbos: ["observar", "explorar", "descubrir", "experimentar"] },
  { cat: "PENSAR", verbos: ["comparar", "relacionar", "anticipar", "clasificar", "inferir", "resolver"] },
  { cat: "CREAR", verbos: ["imaginar", "diseñar", "construir", "transformar", "producir"] },
  { cat: "COMUNICAR", verbos: ["contar", "explicar", "preguntar", "argumentar", "representar"] },
  { cat: "INTERACTUAR", verbos: ["escuchar", "compartir", "acordar", "colaborar", "participar"] },
  { cat: "USAR CONOCIMIENTOS", verbos: ["contar", "medir", "localizar", "identificar", "reconocer", "seleccionar"] },
];
export const VERBOS_LISTA = Array.from(new Set(VERBOS_CATEGORIAS.flatMap((c) => c.verbos.map((v) => v.toUpperCase()))));

/* ======================================================================
   NORMALIZACIÓN — completa campos faltantes sin tocar lo que ya existe
   (datos importados, módulos de versiones anteriores, etc.)
====================================================================== */
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

function fill(def, val) {
  if (val === undefined || val === null) return def;
  if (isObj(def) && isObj(val)) {
    const out = { ...val };
    for (const k of Object.keys(def)) out[k] = fill(def[k], val[k]);
    return out;
  }
  if (typeof def === "string" && typeof val !== "string") return val == null ? def : String(val);
  return val;
}

const ITEM_CAMPOS = {
  pantallas: ["idPantalla", "nombre", "proposito", "contenidoTextual", "imagenesFondo", "botones", "animacion", "audio", "condicionAvance"],
  interacciones: ["accion", "descripcion", "respuesta"],
  estados: ["estado", "queHizo", "queInterpreta", "queOcurre", "proximoPaso"],
  feedback: ["estadoRef", "queSignifica", "queDebe", "textoExacto", "audioExacto", "quienLoDice", "velocidad"],
  personaje: ["quienHabla", "cuandoAparece", "audio", "textoPantalla", "accionPersonaje", "accionNino", "fraseConexion"],
  sonido: ["sonId", "tipo", "descripcion", "duracion", "disparador", "alternativa"],
  casosLimite: ["situacion", "condicion", "comportamiento", "feedback", "accionPosterior", "nota"],
  matriz: ["accionNino", "respuestaEsperada", "respuestaSistema", "feedback", "proximaAccion"],
  storyboard: ["pantallaRef", "queVe", "queEscucha", "queHace", "quePuedePasar", "queHaceSistema", "feedback", "comoContinua"],
};

function fillItems(list, campos) {
  return (Array.isArray(list) ? list : []).map((it) => {
    const o = { ...it };
    if (!o.id) o.id = uid();
    for (const c of campos) if (typeof o[c] !== "string") o[c] = o[c] == null ? "" : String(o[c]);
    return o;
  });
}

export function normalizeActivity(a, numero) {
  const base = blankActivity(numero);
  const src = a || {};
  const out = fill(base, src);
  out.numero = numero;
  for (const [k, campos] of Object.entries(ITEM_CAMPOS)) out[k] = fillItems(src[k] !== undefined ? src[k] : base[k], campos);
  out.casosLimite = out.casosLimite.map((c) => ({ ...c, noAplica: !!c.noAplica }));
  out.importado = Array.isArray(src.importado) ? src.importado : [];
  return out;
}

export function normalizeModule(m) {
  const base = blankModule();
  const src = m || {};
  const out = fill(base, src);
  if (src.id) out.id = src.id;
  const acts = Array.isArray(src.actividades) ? src.actividades : [];
  out.actividades = [1, 2, 3, 4, 5].map((n, i) => normalizeActivity(acts[i], n));
  out.recursos = fillItems(src.recursos || [], ["recId", "recurso", "tipo", "descripcion", "uso", "estado", "responsable"]);
  out.trazabilidad = (src.trazabilidad && src.trazabilidad.length ? src.trazabilidad : base.trazabilidad).map((t) => fill({ id: uid(), disenoCurricular: "", objetivo: "", momento: "", actividad: "", interaccion: "", evidencia: "", feedback: "", sistematizacion: "" }, t));
  out.versiones = (src.versiones && src.versiones.length ? src.versiones : base.versiones).map((v) => fill({ version: "", fecha: "", cambio: "", responsable: "", motivo: "", aprobadoPor: "—" }, v));
  ["checklistDocente", "checklistEspecialista", "checklistCorrector", "checklistTecnico", "checklistCoordinacion"].forEach((k) => {
    const def = base[k];
    const v = Array.isArray(src[k]) ? src[k] : [];
    out[k] = def.map((_, i) => !!v[i]);
  });
  out.importado = Array.isArray(src.importado) ? src.importado : [];
  const mv = out.mapaDeVerbos;
  mv.aprendizajes = (Array.isArray(mv.aprendizajes) ? mv.aprendizajes : []).map((x) => fill(blankAprendizaje(), x));
  while (mv.aprendizajes.length < 3) mv.aprendizajes.push(blankAprendizaje());
  mv.aprendizajes = mv.aprendizajes.slice(0, 3);
  if (!ESTADOS_VALIDOS.includes(out.estado)) out.estado = "diseno_docente";
  return out;
}

export const ESTADOS_VALIDOS = ["diseno_docente", "revision_didactica", "devuelto_docente", "aprobado_didacticamente", "correccion_editorial", "aprobado_editorialmente", "ready_for_development", "enviado_desarrollo"];

/* Siguiente versión del Control de cambios: 1.9 → 1.10 → 1.11 (no 1.9 → 2.0 por error de coma flotante) */
export function siguienteVersion(v) {
  const p = String(v || "1.0").split(".").map((x) => parseInt(x, 10) || 0);
  if (p.length < 2) p.push(0);
  p[p.length - 1] += 1;
  return p.join(".");
}
