#!/usr/bin/env python3
"""
Importador de módulos MDDI desde .docx  →  JSON con el modelo de datos de la plataforma.

Principios (pedido explícito de Coordinación):
  * No se inventa contenido: todo valor proviene literalmente del documento.
  * No se pierde contenido: todo párrafo o fila de tabla que no encaja en un campo
    específico se guarda en `importado` (texto del documento original), visible y
    editable dentro del mismo paso/pestaña de la plataforma.
  * Las marcas de revisión "✅" del documento se quitan del texto (son anotaciones
    de validación, no contenido del módulo).

Uso:
  pandoc original.docx -o /tmp/aceptado.docx      # acepta control de cambios
  python3 importar_modulo.py /tmp/aceptado.docx salida.json --grado 1
"""
import json, re, sys, unicodedata, uuid, argparse
import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

CASOS_LIMITE_BASE = ['El niño no responde durante un tiempo prolongado.', 'Toca repetidamente sin avanzar.', 'Arrastra un objeto a una zona incorrecta.', 'Intenta colocar un objeto donde no corresponde.', 'Responde parcialmente.', 'Selecciona dos opciones a la vez.', 'Borra una respuesta ya dada.', 'Abandona la actividad.', 'Vuelve a entrar (reingreso).', 'Reinicia la actividad.', 'Pierde la conexión a mitad de la actividad.', 'Usa una pantalla reducida.', 'Usa tablet.', 'Usa netbook.', 'Escucha sin mirar la pantalla.', 'Mira sin escuchar.']
MOMENTOS = ["Situación disparadora", "Exploración individual", "Confrontación y puesta en común", "Sistematización", "Producción y cierre"]


def uid():
    return "imp-" + uuid.uuid4().hex[:16]


def clean(t):
    t = t.replace("✅", "").replace("\u00a0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = "\n".join(s.strip() for s in t.split("\n"))
    return t.strip()


def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"\s+", " ", t).strip()
    return t


# ---------------------------------------------------------------- lectura docx
def leer(path):
    d = docx.Document(path)
    out = []
    for ch in d.element.body.iterchildren():
        tag = ch.tag.split('}')[1]
        if tag == 'p':
            p = Paragraph(ch, d)
            t = clean(p.text)
            if t:
                # un párrafo con saltos de línea se procesa como varias líneas lógicas
                for linea in t.split("\n"):
                    if linea.strip():
                        out.append({"t": "p", "text": linea.strip(), "style": p.style.name if p.style is not None else ""})
        elif tag == 'tbl':
            tb = Table(ch, d)
            rows = []
            for r in tb.rows:
                cells, prev = [], None
                for c in r.cells:
                    if c._tc is prev:
                        continue
                    prev = c._tc
                    cells.append(clean(c.text.replace("\n", " // ")).replace(" // ", "\n"))
                rows.append(cells)
            out.append({"t": "tbl", "rows": rows})
    return out


def tabla_a_texto(rows):
    return "\n".join(" | ".join(c for c in r) for r in rows)


# ---------------------------------------------------------------- etiquetas
def strip_label_decor(s):
    s = s.strip()
    s = re.sub(r"^[-–·•]\s*", "", s)
    return s


def split_label(line):
    """Devuelve (label_normalizado, parentetico, valor) si la línea parece 'Etiqueta: valor'."""
    s = strip_label_decor(line)
    m = re.match(r"^(.{2,110}?)(\?)?\s*:\s*(.*)$", s, re.S)
    if m:
        lab = m.group(1) + (m.group(2) or "")
        val = m.group(3)
    else:
        m2 = re.match(r"^(¿[^?]{5,100}\?)\s*(.*)$", s, re.S)
        if not m2:
            return None
        lab, val = m2.group(1), m2.group(2)
    par = ""
    pm = re.search(r"\(([^)]*)\)\s*$", lab)
    base = lab
    if pm:
        par = pm.group(1).strip()
        base = lab[:pm.start()].strip()
    return norm(base), par, val.strip(), norm(lab)


# ---------------------------------------------------------------- estado del parser
class Salida:
    def __init__(self):
        self.importado = []   # residuales a nivel módulo

    def residual(self, paso, titulo, texto):
        if texto and texto.strip():
            if self.importado and self.importado[-1]["paso"] == paso and self.importado[-1]["titulo"] == titulo:
                self.importado[-1]["texto"] += "\n" + texto.strip()
            else:
                self.importado.append({"id": uid(), "paso": paso, "titulo": titulo, "texto": texto.strip()})


def append(obj, key, val):
    val = (val or "").strip()
    if not val:
        return
    if obj.get(key):
        obj[key] = obj[key] + "\n" + val
    else:
        obj[key] = val


# ================================================================ MÓDULO: cabecera
LABELS_A = {
    "codigo del modulo": "codigo", "grado": "grado", "area": "area", "eje curricular": "ejeCurricular",
    "contenido": "contenido", "recorte": "contenido+", "titulo": "titulo", "subtitulo": "subtitulo",
    "docentes responsables": "docentesResponsables", "especialista responsable": "especialistaResponsable",
    "correctora responsable": "correctorResponsable", "corrector responsable": "correctorResponsable",
    "corrector/a responsable": "correctorResponsable",
}
LABELS_B = {
    "proposito general del modulo": "propositoGeneral", "aprendizaje esperado": "aprendizajeEsperado",
    "relacion con el diseno curricular jurisdiccional": "relacionCurricular",
    "conocimientos previos requeridos": "conocimientosPrevios",
    "procedimientos personales esperables": "procedimientosPersonales",
    "procedimientos posibles": "mate.procedimientosPosibles", "estrategias correctas": "mate.estrategiasCorrectas",
    "estrategias alternativas": "mate.estrategiasAlternativas", "errores frecuentes": "mate.erroresFrecuentes",
    "variables didacticas": "mate.variablesDidacticas", "posibles anticipaciones del nino": "mate.anticipaciones",
    "conocimientos que se espera que el alumno movilice": "mate.conocimientosMovilizar",
    "proposito comunicativo": "lengua.propositoComunicativo", "practica del lenguaje involucrada": "lengua.practicaLenguajeDetalle",
    "situacion de oralidad": "lengua.situacion", "situacion de lectura": "lengua.situacion", "situacion de escritura": "lengua.situacion",
    "situacion de oralidad / lectura / escritura": "lengua.situacion",
    "destinatario": "lengua.destinatario", "genero textual": "lengua.generoTextual",
    "decisiones que debe tomar el estudiante": "lengua.decisionesNino", "decisiones que debe tomar el nino": "lengua.decisionesNino",
    "autonomia esperada": "lengua.autonomiaEsperada",
    "intervenciones necesarias del adulto o del sistema": "lengua.intervencionesNecesarias",
}
ESTRUCTURALES_B = {"especifico de matematica", "procedimientos personales esperables. especifico de lengua", "especifico de lengua"}


def set_path(root, path, val, mode="append"):
    parts = path.split(".")
    o = root
    for p in parts[:-1]:
        o = o.setdefault(p, {})
    append(o, parts[-1], val)


def parse_cabecera(items, mod, out):
    sec = None
    pending = None
    intro_a, intro_b = [], []
    for it in items:
        if it["t"] == "tbl":
            out.residual("identificacion", "Tabla del documento", tabla_a_texto(it["rows"]))
            continue
        t = it["text"]
        n = norm(t)
        if n in ("modulo 1", "modulo 2", "modulo 3"):
            continue
        if re.match(r"^bloque a\b", n):
            sec, pending = "A", None; continue
        if re.match(r"^bloque b\b", n):
            sec, pending = "B", None; continue
        if re.match(r"^bloque c\b", n):
            sec, pending = "C", None; continue
        if sec == "A":
            sl = split_label(t)
            if sl and sl[0] in LABELS_A:
                pending = LABELS_A[sl[0]]
                if pending == "contenido+":
                    append(mod, "contenido", "Recorte: " + sl[2]); pending = "contenido"
                else:
                    append(mod, pending, sl[2])
                continue
            if pending:
                append(mod, pending, t)
            else:
                intro_a.append(t)
        elif sec == "B":
            nn = norm(strip_label_decor(t)).rstrip(":").strip()
            if nn in ESTRUCTURALES_B:
                pending = None; continue
            if nn in LABELS_B:     # etiqueta sola en la línea (con o sin dos puntos)
                pending = LABELS_B[nn]; continue
            sl = split_label(t)
            if sl and sl[0] in LABELS_B:
                pending = LABELS_B[sl[0]]
                set_path(mod.setdefault("fundamentacion", {}), pending, sl[2]); continue
            if pending:
                set_path(mod.setdefault("fundamentacion", {}), pending, t)
            else:
                intro_b.append(t)
        elif sec == "C":
            m = re.match(r"^(\d)\.\s*(.+?)\s*:?\s*$", t)
            if m and norm(m.group(2)) in [norm(x) for x in MOMENTOS]:
                pending = m.group(1); continue
            if pending:
                cur = mod.setdefault("momentos", {})
                append(cur, pending, t)
            else:
                out.residual("arquitectura", "Bloque C — texto sin momento asignado", t)
        else:
            out.residual("identificacion", "Texto previo al Bloque A", t)
    if intro_a:
        out.residual("identificacion", "Bloque A — texto introductorio del documento", "\n".join(intro_a))
    if intro_b:
        out.residual("fundamentacion", "Bloque B — introducción del documento", "\n".join(intro_b))
    # Práctica del lenguaje: el campo de la plataforma es una selección; el texto completo va al detalle.
    f = mod.get("fundamentacion", {})
    det = f.get("lengua", {}).get("practicaLenguajeDetalle", "")
    if det:
        for op in ("Oralidad", "Lectura", "Escritura"):
            if norm(det).startswith(norm(op)):
                f["lengua"]["practicaLenguaje"] = op
    # Grado normalizado al formato de la plataforma
    g = mod.get("grado", "")
    mg = re.search(r"(\d)", g)
    if mg:
        mod["grado"] = f"{mg.group(1)}º grado"


# ================================================================ ACTIVIDADES
BLOCKS = [
    # (regex sobre texto normalizado, clave de bloque)
    (r"^(e\.1\b|seccion 1\b)", "ident"),
    (r"^(e\.2\b|seccion 2\b)", "situacion"),
    (r"^e\.3\b", "consigna"),
    (r"^(mapa y pantallas|seccion 3\b)", "mapa"),
    (r"^recorrido paso a paso", "recorrido"),
    (r"^(bloque f\b|fichas de pantalla)", "pantallas"),
    (r"^bloque g\b", "interacciones"),
    (r"^bloque h\b", "estados"),
    (r"^bloque i\b", "feedback"),
    (r"^bloque j\b", "confrontacion"),
    (r"^bloque k\b", "personaje"),
    (r"^bloque l\b", "visual"),
    (r"^bloque m\b", "sonido"),
    (r"^bloque n\b", "accesibilidad"),
    (r"^bloque o\b", "datos"),
    (r"^bloque s\b", "navfinal"),
    (r"^bloque t\b", "casos"),
    (r"^bloque v\b", "matriz"),
    (r"^bloque w\b", "storyboard"),
    (r"^seccion 4: tarjetas por personaje", "tarjetas"),
    (r"^seccion \d+:", "seccion"),   # secciones del doc de 2° (no cambian de bloque por sí mismas)
]

# Etiquetas que *cambian de bloque* en el documento de 2° (formato "Sección N" + etiqueta)
LABEL_BLOCK_SWITCH = {
    "interacciones": "interacciones", "estados": "estados", "feedback": "feedback", "feedback por estado": "feedback",
    "guion kapi": "personaje", "guion de kapi": "personaje", "diseno visual": "visual", "sonido y audio": "sonido", "sonido": "sonido",
    "accesibilidad": "accesibilidad", "datos": "datos", "reglas de finalizacion": "navfinal", "casos limite": "casos",
    "bloque v": "matriz", "bloque w": "storyboard", "ficha rapida para desarrolladores": "ficha",
}

LAB_IDENT = {
    "numero de actividad": "_numero", "momento didactico": "_momento", "nombre": "nombre", "objetivo": "objetivo",
    "contenido": "contenido", "relacion con la secuencia": "relacionSecuencia", "proposito didactico": "propositoDidactico",
    "relacion con la actividad anterior": "relacionAnterior", "relacion con la actividad siguiente": "relacionSiguiente",
    "evidencia que permite observar el aprendizaje": "evidencia", "pasaje al momento siguiente": "pasajeSiguiente",
}
LAB_SIT = {"contexto": "situacion.contexto", "escenario": "situacion.escenario", "personajes": "situacion.personajes",
           "personajes en escena": "situacion.personajes", "que esta ocurriendo": "situacion.queOcurre", "que problema aparece": "situacion.queProblema"}
LAB_CON = {"texto exacto en pantalla": "consigna.textoPantalla", "texto exacto en audio": "consigna.textoAudio",
           "texto exacto en pantalla y audio": "consigna.ambos", "quien lo dice": "consigna.quienLoDice",
           "tono": "consigna.tono", "velocidad": "consigna.velocidad"}
LAB_MAPA = {"punto de entrada": "mapa.puntoEntrada", "pantallas involucradas": "mapa.pantallasInvolucradas",
            "decisiones del nino": "mapa.decisionesNino", "caminos posibles": "mapa.caminosPosibles",
            "reintentos y ayudas": "mapa.reintentosAyudas", "recorrido paso a paso": "mapa.recorrido"}
LAB_VISUAL = {"escenario / fondo": "visual.escenarioFondo", "escenario/fondo": "visual.escenarioFondo", "escenario": "visual.escenarioFondo",
              "colores dominantes": "visual.coloresDominantes", "objetos y personajes en escena": "visual.objetosPersonajes",
              "objetos y personajes": "visual.objetosPersonajes", "tamano, ubicacion y jerarquia visual": "visual.tamanoUbicacion",
              "iconografia y estados visuales": "visual.iconografia"}
LAB_ACC = {"audio + texto simultaneo": "accesibilidad.audioTexto", "instrucciones comprensibles / lenguaje claro": "accesibilidad.instruccionesClaras",
           "alternativas al color": "accesibilidad.alternativasColor", "tamano de botones y zonas tactiles": "accesibilidad.tamanoBotones",
           "cantidad de informacion por pantalla": "accesibilidad.cantidadInfo", "modo de acceso alternativo": "accesibilidadExtra.modoAlternativo",
           "si el nino no pudiera usar el canal principal…": "accesibilidadExtra.modoAlternativo",
           "si el nino no pudiera usar el canal principal...": "accesibilidadExtra.modoAlternativo"}
LAB_DATOS = {"que respuesta debe registrar el sistema": "datos.queRegistra", "tipo de respuesta": "datos.tipoRespuesta",
             "respuesta esperada": "datos.respuestaEsperada", "respuestas alternativas validas": "datos.alternativasValidas",
             "respuestas parcialmente validas": "datos.parcialmenteValidas"}
LAB_NAV = {"cuando se considera terminada la actividad": "navFinal.cuandoTermina", "cuando se habilita la siguiente": "navFinal.cuandoHabilita",
           "¿debe completar todo o puede continuar con errores?": "navFinal.completarTodo",
           "debe completar todo o puede continuar con errores?": "navFinal.completarTodo",
           "que sucede si necesita varios intentos": "navFinal.variosIntentos", "que sucede si abandona": "navFinal.siAbandona"}

# campos de ítems repetibles
F_PANT = {"id de pantalla": "idPantalla", "nombre": "nombre", "proposito": "proposito", "contenido textual": "contenidoTextual",
          "imagenes/fondo": "imagenesFondo", "imagenes / personajes / fondo": "imagenesFondo", "imagenes/personajes/fondo": "imagenesFondo",
          "botones": "botones", "animacion": "animacion", "audio": "audio", "audio - narrador": "audio", "condicion para avanzar": "condicionAvance"}
F_INT = {"accion del nino": "accion", "descripcion de la accion": "descripcion", "descripcion": "descripcion", "respuesta exacta del sistema": "respuesta"}
F_EST = {"estado": "estado", "que hizo el nino": "queHizo", "que interpreta el sistema": "queInterpreta", "que ocurre": "queOcurre", "proximo paso": "proximoPaso"}
F_FB = {"estado al que corresponde": "estadoRef", "que significa didacticamente": "queSignifica", "que debe devolver el sistema": "queDebe",
        "texto exacto": "textoExacto", "audio exacto": "audioExacto", "quien lo dice": "quienLoDice", "velocidad": "velocidad"}
F_PER = {"quien habla": "quienHabla", "cuando aparece": "cuandoAparece", "audio exacto": "audio", "audio": "audio", "audio (texto exacto narrado)": "audio",
         "audio exacto (kapi)": "audio", "texto en pantalla": "textoPantalla", "accion del personaje": "accionPersonaje",
         "accion del nino": "accionNino", "frase de conexion entre momentos": "fraseConexion", "frase de conexion": "fraseConexion"}
F_SON = {"id": "sonId", "tipo": "tipo", "descripcion": "descripcion", "contenido / descripcion": "descripcion", "duracion estimada": "duracion",
         "momento de activacion": "disparador", "activacion": "disparador", "momento de activacion / condicion que lo dispara": "disparador",
         "alternativa textual": "alternativa"}
F_CASO = {"situacion": "situacion", "condicion / disparador": "condicion", "condicion / disparador ": "condicion",
          "que hace o dice el sistema": "comportamiento", "comportamiento del sistema": "comportamiento", "comportamiento": "comportamiento",
          "que ocurre despues": "accionPosterior", "nota": "nota", "motivo": "nota", "feedback": "feedback"}
F_MAT = {"accion del nino": "accionNino", "que debe hacer el nino": "accionNino", "respuesta esperada": "respuestaEsperada",
         "respuesta del sistema": "respuestaSistema", "que debe hacer el sistema": "respuestaSistema", "feedback": "feedback", "proxima accion": "proximaAccion"}
F_SB = {"pantalla": "pantallaRef", "que ve": "queVe", "que escucha": "queEscucha", "que hace": "queHace", "que puede pasar": "quePuedePasar",
        "que hace el sistema": "queHaceSistema", "feedback": "feedback", "como continua": "comoContinua"}

REPEAT_BLOCKS = {"pantallas": ("pantallas", F_PANT, "proposito"), "interacciones": ("interacciones", F_INT, "descripcion"),
                 "estados": ("estados", F_EST, "queHizo"), "feedback": ("feedback", F_FB, "textoExacto"),
                 "personaje": ("personaje", F_PER, "accionPersonaje"), "sonido": ("sonido", F_SON, "descripcion"),
                 "casos": ("_casos", F_CASO, "comportamiento"), "matriz": ("matriz", F_MAT, "respuestaSistema"),
                 "storyboard": ("storyboard", F_SB, "queHaceSistema")}
SCALAR_BLOCK_LABELS = {"ident": LAB_IDENT, "situacion": LAB_SIT, "consigna": LAB_CON, "mapa": LAB_MAPA, "recorrido": LAB_MAPA,
                       "visual": LAB_VISUAL, "accesibilidad": LAB_ACC, "datos": LAB_DATOS, "navfinal": LAB_NAV}
ALL_SCALAR = {}
for d in (LAB_IDENT, LAB_SIT, LAB_CON, LAB_MAPA, LAB_DATOS, LAB_NAV, LAB_ACC):
    ALL_SCALAR.update(d)

BLOQUE_TITULO = {"ident": "E.1 Identificación", "situacion": "E.2 Situación narrativa", "consigna": "E.3 Consigna",
                 "mapa": "Bloque D — Mapa", "recorrido": "Bloque D — Recorrido", "pantallas": "Bloque F — Pantallas",
                 "interacciones": "Bloque G — Interacciones", "estados": "Bloque H — Estados", "feedback": "Bloque I — Feedback",
                 "confrontacion": "Bloque J — Confrontación", "personaje": "Bloque K — Guion del personaje", "visual": "Bloque L — Diseño visual",
                 "sonido": "Bloque M — Sonido", "accesibilidad": "Bloque N — Accesibilidad", "datos": "Bloque O — Datos",
                 "navfinal": "Bloque S — Finalización", "casos": "Bloque T — Casos límite", "matriz": "Bloque V — Matriz",
                 "storyboard": "Bloque W — Guion de implementación", "ficha": "Ficha rápida para desarrolladores (texto del documento)",
                 "tarjetas": "Sección 4 — Tarjetas por personaje", "pre": "Encabezado de la actividad"}
TAB_DE_BLOQUE = {"consigna_extra": "situacion", "ident": "identificacion", "pre": "identificacion", "situacion": "situacion", "consigna": "situacion", "mapa": "mapa",
                 "recorrido": "mapa", "pantallas": "mapa", "tarjetas": "mapa", "interacciones": "interacciones", "estados": "interacciones",
                 "feedback": "interacciones", "confrontacion": "confrontacion", "personaje": "personaje", "visual": "personaje",
                 "sonido": "personaje", "accesibilidad": "accesibilidad", "datos": "accesibilidad", "navfinal": "navegacion",
                 "casos": "navegacion", "matriz": "navegacion", "storyboard": "storyboard", "ficha": "storyboard"}

ITEM_START = {
    "pantallas": re.compile(r"^(?:id de pantalla:?\s*)?(p\d-\d{2})\b", re.I),
    "interacciones": re.compile(r"^interaccion \d+", re.I),
    "estados": re.compile(r"^(estado\s*:|estado \d|estado\s*\d)", re.I),
    "feedback": re.compile(r"^(estado\s*\d|feedback\s*\d|feedback\s*[—–-])", re.I),
    "personaje": re.compile(r"^(ficha \d+|pantalla p\d-\d{2})", re.I),
    "sonido": re.compile(r"^recurso \d+", re.I),
    "storyboard": re.compile(r"^(pantalla:?\s*p\d-\d{2}|p\d-\d{2}\s*[–—-])", re.I),
}


class Act:
    def __init__(self, numero):
        self.a = {"numero": numero, "importado": []}
        self.block = "pre"
        self.pending = None          # (obj, key)
        self.item = None             # ítem repetible actual
        self.heading = None          # sub-encabezado pendiente
        self.personaje_pantalla = None
        self.formato2 = False

    def res(self, block, texto, titulo=None):
        if not texto or not texto.strip():
            return
        tab = TAB_DE_BLOQUE.get(block, "identificacion")
        tit = titulo or BLOQUE_TITULO.get(block, block)
        # agrupa con el residual anterior del mismo bloque
        if self.a["importado"] and self.a["importado"][-1]["bloque"] == block and self.a["importado"][-1]["titulo"] == tit:
            self.a["importado"][-1]["texto"] += "\n" + texto.strip()
        else:
            self.a["importado"].append({"id": uid(), "bloque": block, "tab": tab, "titulo": tit, "texto": texto.strip()})

    def setp(self, path, val):
        parts = path.split(".")
        o = self.a
        for p in parts[:-1]:
            o = o.setdefault(p, {})
        if self.heading:
            val = (self.heading + "\n" + val).strip() if val else self.heading
            self.heading = None
        append(o, parts[-1], val)
        self.pending = (o, parts[-1])

    def new_item(self, block):
        key = REPEAT_BLOCKS[block][0]
        self.item = {"id": uid()}
        self.a.setdefault(key, []).append(self.item)
        return self.item

    def set_item(self, k, v):
        if self.item is None:
            self.new_item(self.block)
        if self.heading:
            v = (self.heading + "\n" + v).strip() if v else self.heading
            self.heading = None
        append(self.item, k, v)
        self.pending = (self.item, k)


def detectar_bloque(n):
    for rx, key in BLOCKS:
        if re.match(rx, n):
            return key
    return None


def es_encabezado_corto(t):
    return len(t) < 70 and not t.rstrip().endswith((".", ":", "»", "\"", "”")) and ":" not in t


def parse_actividad(items, numero, out):
    S = Act(numero)
    i = 0
    while i < len(items):
        it = items[i]
        nxt = items[i + 1] if i + 1 < len(items) else None
        i += 1
        # ------------------------------------------------ tablas
        if it["t"] == "tbl":
            procesar_tabla(S, it["rows"])
            continue
        t = it["text"]
        n = norm(strip_label_decor(t))
        # ------------------------------------------------ marcador de bloque
        b = detectar_bloque(n)
        if b and not (b == "recorrido" and False):
            if b == "seccion":
                S.formato2 = True
                S.pending = None; S.item = None; S.heading = None
                continue
            if b == "tarjetas":
                S.block = "tarjetas"; S.pending = None; S.item = None
                continue
            S.block = b; S.pending = None; S.item = None; S.heading = None
            # texto adicional en la línea del encabezado
            extra = re.sub(r"^(e\.\d|bloque [a-z]+|seccion \d+|mapa y pantallas|recorrido paso a paso|fichas de pantalla)\b", "", n)
            if b == "recorrido":
                S.pending = None
                S.block = "recorrido"
                continue
            extra_raw = t
            # quita el rótulo estándar y se queda con el "resto" si es relevante
            if "no aplica" in n:
                S.res(b, t, BLOQUE_TITULO.get(b, b) + " — encabezado del documento")
            elif b == "consigna" and ("“" in t or "\"" in t):
                S.res(b, t, "E.3 — encabezado del documento")
            continue
        # ------------------------------------------------ diálogo/nota dentro de E.3 (p.ej. "(diálogo previo a la consigna 1):")
        if S.block == "consigna" and re.match(r"^\(.*\)\s*:?$", t):
            S.block = "consigna_extra"; S.pending = None
            S.extra_titulo = "E.3 — " + t.rstrip(":")
            continue
        if S.block == "consigna_extra":
            S.res("consigna_extra", t, S.extra_titulo)
            continue
        # ------------------------------------------------ bloques repetibles
        if S.block in REPEAT_BLOCKS:
            if procesar_linea_repetible(S, t, n, nxt):
                continue
        # ------------------------------------------------ etiqueta que cambia de bloque (formato 2°)
        sl = split_label(t)
        if sl:
            base, par, val, full = sl
            base_sw = re.sub(r",.*$", "", base)
            if S.formato2 and (base_sw in LABEL_BLOCK_SWITCH or full in LABEL_BLOCK_SWITCH):
                nb = LABEL_BLOCK_SWITCH.get(base_sw) or LABEL_BLOCK_SWITCH[full]
                if not (S.block == nb and nb in REPEAT_BLOCKS and base_sw in ("audio",)):
                    S.block = nb; S.item = None; S.pending = None
                    etiqueta_resumen(S, nb, base, par, val, t)
                    continue
        # ------------------------------------------------ etiquetas escalares
        if sl:
            base, par, val, full = sl
            tabla = SCALAR_BLOCK_LABELS.get(S.block, {})
            path = tabla.get(base) or tabla.get(full)
            if not path and S.block in ("pre", "ident", "situacion", "consigna", "mapa", "datos", "navfinal", "accesibilidad", "recorrido"):
                path = ALL_SCALAR.get(base) or ALL_SCALAR.get(full)
            if path:
                if par and re.search(r"(AUD|SFX|MUS|P\d-\d)", par):
                    val = f"({par}) {val}".strip()
                elif par and path.startswith("visual.") is False and base in ("frase de conexion entre momentos",):
                    val = f"({par}) {val}".strip()
                if path == "consigna.ambos":
                    S.setp("consigna.textoPantalla", val); S.setp("consigna.textoAudio", val)
                    S.pending = ("__ambos__", None)
                    continue
                if path in ("_numero",):
                    S.pending = ("__skip__", None); continue
                if path == "_momento":
                    esperado = MOMENTOS[numero - 1]
                    if val and norm(val).rstrip(".") != norm(esperado):
                        S.res("ident", "Momento didáctico (según el documento): " + val)
                    S.pending = ("__momento__", None) if not val else ("__skip__", None)
                    continue
                if path == "datos.tipoRespuesta" and False:
                    pass
                S.setp(path, val)
                continue
        # etiqueta sola sin dos puntos (p.ej. "Relación con la secuencia (Bloque C, por actividad)")
        nn = norm(re.sub(r"\(.*?\)", "", strip_label_decor(t))).strip().rstrip(":")
        tabla = SCALAR_BLOCK_LABELS.get(S.block, {})
        if nn in tabla or nn in ALL_SCALAR:
            path = tabla.get(nn) or ALL_SCALAR.get(nn)
            if path == "consigna.ambos":
                S.pending = ("__ambos__", None); continue
            if path == "_momento":
                S.pending = ("__momento__", None); continue
            if path == "_numero":
                S.pending = ("__skip__", None); continue
            parts = path.split(".")
            o = S.a
            for p in parts[:-1]:
                o = o.setdefault(p, {})
            o.setdefault(parts[-1], "")
            S.pending = (o, parts[-1])
            continue
        # ------------------------------------------------ sub-encabezado (p.ej. "Mazo 1 (Cantidad 6)") seguido de etiquetas
        if (S.pending and not isinstance(S.pending[0], str) and (S.pending[0].get(S.pending[1]) or "").strip()
                and nxt and nxt["t"] == "p" and es_encabezado_corto(t) and split_label(nxt["text"])
                and S.block in ("datos", "navfinal", "visual", "accesibilidad", "mapa", "situacion", "consigna", "ident")):
            S.heading = t
            continue
        # ------------------------------------------------ continuación de valor
        if S.pending and S.pending[0] == "__first__":
            nb, b0, p0, r0 = S.pending[1]
            etiqueta_resumen(S, nb, b0, p0, t, r0)
            continue
        if S.pending:
            o, k = S.pending
            if o == "__skip__":
                S.pending = None; continue
            if o == "__momento__":
                esperado = MOMENTOS[numero - 1]
                if norm(t).rstrip(".") != norm(esperado):
                    S.res("ident", "Momento didáctico (según el documento): " + t)
                S.pending = None; continue
            if o == "__ambos__":
                append(S.a.setdefault("consigna", {}), "textoPantalla", t)
                append(S.a.setdefault("consigna", {}), "textoAudio", t)
                continue
            if isinstance(o, str) and o.startswith("__res__"):
                bb = o[7:]
                tit = {"accesibilidad": BLOQUE_TITULO["accesibilidad"] + " (texto del documento — distribuir en los campos)",
                       "visual": BLOQUE_TITULO["visual"] + " (texto del documento — distribuir en los campos)",
                       "casos": "Bloque T — Casos límite (resumen del documento)",
                       "matriz": BLOQUE_TITULO["matriz"] + " (resumen del documento)",
                       "storyboard": BLOQUE_TITULO["storyboard"] + " (resumen del documento)"}.get(bb)
                S.res(bb, t, tit)
                continue
            if isinstance(o, str):
                S.res(S.block, t)
                continue
            # las escenas narrativas de la situación no son parte de "qué problema aparece"
            if S.block == "situacion" and re.match(r"^escena\b", norm(t)):
                S.pending = None
                S.res("situacion", t, "E.2 — Escenas y guion narrativo del documento")
                S.block = "escenas"
                continue
            append(o, k, t)
            continue
        if S.block == "escenas":
            S.res("situacion", t, "E.2 — Escenas y guion narrativo del documento")
            continue
        # ------------------------------------------------ residual
        if S.block == "pre":
            n0 = norm(t).strip("() ")
            if n0 in [norm(x) for x in MOMENTOS] or re.match(r"^(actividad \d|e\.1)", n0):
                continue
        S.res(S.block, t)
    return finalizar_actividad(S)


def etiqueta_resumen(S, nb, base, par, val, raw):
    """Formato del documento de 2°: 'Interacciones:' + texto resumen (a veces con viñetas)."""
    if not val and nb not in ("navfinal",):
        # el valor viene en la línea siguiente
        S.block = nb if nb != "ficha" else "ficha"
        S.item = None
        S.pending = ("__first__", (nb, base, par, raw))
        return
    if nb == "ficha":
        S.block = "ficha"
        S.res("ficha", val)
        S.pending = None
        S.item = None
        return
    if nb in ("matriz", "storyboard"):
        S.block = nb
        S.res(nb, val, BLOQUE_TITULO[nb] + " (resumen del documento)")
        S.pending = ("__res__" + nb, None)
        return
    if nb == "casos":
        S.res("casos", val, "Bloque T — Casos límite (resumen del documento)")
        S.pending = ("__res__casos", None)
        return
    if nb == "navfinal":
        S.block = "navfinal"
        S.setp("navFinal.cuandoTermina", val)
        return
    if nb == "datos":
        S.block = "datos"
        m = re.match(r"^(?:Tipo\s+)?(.*?)(?:\.\s*Respuesta esperada:\s*(.*))?$", val, re.S)
        tipo = m.group(1).strip().rstrip(".") if m else val
        S.setp("datos.tipoRespuesta", tipo)
        if m and m.group(2):
            S.setp("datos.respuestaEsperada", m.group(2).strip())
        return
    if nb in ("accesibilidad", "visual"):
        S.block = nb
        S.res(nb, val, BLOQUE_TITULO[nb] + " (texto del documento — distribuir en los campos)")
        S.pending = ("__res__" + nb, None)
        return
    if nb == "personaje":
        S.block = "personaje"
        it = S.new_item("personaje")
        it["quienHabla"] = "Kapi"
        m = re.match(r"^guion(?: de)? kapi,?\s*(.*)$", base)
        cuando = raw.split(":")[0]
        cuando = re.sub(r"^Guion(?: de)? Kapi,?\s*", "", cuando).strip()
        if par and "bloque" not in norm(par):
            cuando = (cuando + " (" + par + ")").strip() if par not in cuando else cuando
        cuando = re.sub(r"\(?Bloque K\)?", "", cuando).strip()
        if cuando:
            it["cuandoAparece"] = cuando
        if val:
            if val.startswith(("«", "\"", "“")):
                it["audio"] = val; S.pending = (it, "audio")
            else:
                it["accionPersonaje"] = val; S.pending = (it, "accionPersonaje")
        else:
            S.pending = (it, "audio")
        return
    if nb == "sonido":
        S.block = "sonido"
        partes = [p.strip() for p in re.split(r"[;,]\s*(?=(?:AUD|SFX|MUS|GRA)-)", val) if p.strip()] if val else []
        for p in partes:
            it = S.new_item("sonido")
            mm = re.match(r"^((?:AUD|SFX|MUS)-[\w/-]+)\s*(.*)$", p)
            if mm:
                it["sonId"] = mm.group(1); it["descripcion"] = mm.group(2).strip()
            else:
                it["descripcion"] = p
        S.item = None
        S.pending = ("__sonido_cont__", None)
        return
    if nb in ("interacciones", "estados", "feedback"):
        S.block = nb
        S.item = None
        if val:
            linea_resumen_repetible(S, nb, val)
        S.pending = ("__lista__" + nb, None)
        return


def linea_resumen_repetible(S, nb, t):
    t = strip_label_decor(t)
    if nb == "interacciones":
        it = S.new_item(nb); it["accion"] = ""; it["descripcion"] = t
    elif nb == "estados":
        m = re.match(r"^([^:«]{2,70}):\s*(.*)$", t, re.S)
        it = S.new_item(nb)
        if m:
            it["estado"] = m.group(1).strip(); it["queHizo"] = m.group(2).strip()
        else:
            it["estado"] = ""; it["queHizo"] = t
    elif nb == "feedback":
        m = re.match(r"^([^:«]{2,70}):\s*(.*)$", t, re.S)
        it = S.new_item(nb)
        if m:
            it["estadoRef"] = m.group(1).strip(); it["textoExacto"] = m.group(2).strip()
        else:
            it["estadoRef"] = ""; it["textoExacto"] = t
    S.item = None


def procesar_linea_repetible(S, t, n, nxt):
    block = S.block
    key, fields, default = REPEAT_BLOCKS[block]
    # en el formato 2°, una etiqueta de otro bloque corta la lista actual
    if S.formato2:
        slx = split_label(t)
        if slx and (re.sub(r",.*$", "", slx[0]) in LABEL_BLOCK_SWITCH or slx[3] in LABEL_BLOCK_SWITCH):
            return False
    # continuación de "lista resumen" (formato 2°)
    if S.pending and S.pending[0] == "__first__":
        nb, b0, p0, r0 = S.pending[1]
        etiqueta_resumen(S, nb, b0, p0, t, r0)
        return True
    if S.pending and isinstance(S.pending[0], str):
        tag = S.pending[0]
        if tag.startswith("__lista__"):
            if t.lstrip().startswith(("-", "•", "·")) or (block == "feedback" and re.match(r"^[^:«]{2,70}:", t)):
                linea_resumen_repetible(S, block, t)
                return True
            # nota final (p.ej. "Si el niño incluyó ambos distractores...")
            S.res(block, t, BLOQUE_TITULO[block] + " — nota del documento")
            return True
        if tag.startswith("__res__"):
            S.res(tag[7:], t, None if tag[7:] not in ("matriz", "storyboard", "casos", "accesibilidad", "visual") else
                  {"matriz": BLOQUE_TITULO["matriz"] + " (resumen del documento)",
                   "storyboard": BLOQUE_TITULO["storyboard"] + " (resumen del documento)",
                   "casos": "Bloque T — Casos límite (resumen del documento)",
                   "accesibilidad": BLOQUE_TITULO["accesibilidad"] + " (texto del documento — distribuir en los campos)",
                   "visual": BLOQUE_TITULO["visual"] + " (texto del documento — distribuir en los campos)"}[tag[7:]])
            return True
        if tag == "__sonido_cont__":
            S.res("sonido", t)
            return True
    # inicio de ítem por patrón
    rx = ITEM_START.get(block)
    if rx and rx.match(n):
        if block == "personaje" and n.startswith("pantalla"):
            S.personaje_pantalla = re.search(r"p\d-\d{2}", n).group(0).upper()
            S.item = None; S.pending = None
            return True
        it = S.new_item(block)
        S.pending = None
        sl = split_label(t)
        if block == "pantallas":
            m = re.search(r"(P\d-\d{2})\s*[,—–-]?\s*(.*)$", t, re.I)
            it["idPantalla"] = m.group(1).upper()
            resto = m.group(2).strip().rstrip(":").strip(" ·")
            if resto:
                it["nombre"] = resto if not it.get("nombre") else it["nombre"]
            S.pending = (it, default)
        elif block == "estados":
            val = re.sub(r"^(estado\s*:?\s*)", "", t, flags=re.I).strip()
            it["estado"] = val.rstrip(".") if val else ""
        elif block == "feedback":
            it["_titulo"] = t
        elif block == "storyboard":
            it["pantallaRef"] = re.sub(r"^pantalla:?\s*", "", t, flags=re.I).strip()
        elif block == "sonido":
            m = re.search(r"((?:AUD|SFX|MUS)-[\w-]+)", t)
            if m:
                it["sonId"] = m.group(1)
        elif block == "interacciones":
            it["_titulo"] = t
        elif block == "personaje":
            it["_titulo"] = t
        return True
    # etiqueta de campo del ítem
    sl = split_label(t)
    cand = None
    if sl:
        base, par, val, full = sl
        cand = fields.get(base) or fields.get(full)
        if not cand and block == "casos":
            cand = F_CASO.get(base)
    else:
        nn = norm(re.sub(r"\(.*?\)", "", strip_label_decor(t))).strip().rstrip(":")
        if nn in fields:
            base, par, val, full = nn, "", "", nn
            cand = fields[nn]
        elif block == "pantallas" and n.startswith("nombre "):
            base, par, val, full = "nombre", "", t[7:].strip(), "nombre"
            cand = "nombre"
    if cand and S.pending and not isinstance(S.pending[0], str) and S.pending[1] == "fraseConexion" and re.fullmatch(r"\(.*\)", (S.pending[0].get("fraseConexion") or "").strip()):
        append(S.pending[0], "fraseConexion", strip_label_decor(t))
        return True
    if cand:
        # un campo "inicial" que se repite abre ítem nuevo
        starters = {"personaje": "quienHabla", "interacciones": "accion", "matriz": "accionNino", "estados": "queHizo"}
        if S.item is None or (starters.get(block) == cand and S.item.get(cand)) or (block == "feedback" and cand == "estadoRef" and S.item.get("estadoRef")):
            S.new_item(block)
            if block == "personaje" and S.personaje_pantalla and cand != "cuandoAparece":
                S.item["cuandoAparece"] = S.personaje_pantalla
        if par and re.search(r"(AUD|SFX|MUS|P\d-\d|Mazo|Transici)", par, re.I):
            val = f"({par}) {val}".strip()
        S.set_item(cand, val)
        return True
    # casos límite: línea situación (termina en ':' o encabezado numerado / ☑ No aplica)
    if block == "casos" and n.startswith("☑"):
        if S.item is not None:
            S.item["noAplica"] = True
            S.pending = (S.item, "nota")
        return True
    if block == "casos":
        m = re.match(r"^(\d+\.\s*)?(.+?)\s*(☑\s*No aplica)?\s*:?\s*$", t)
        if m and (t.rstrip().endswith(":") or m.group(3) or m.group(1) or es_encabezado_corto(t)):
            it = S.new_item("casos")
            it["situacion"] = m.group(2).strip()
            if m.group(3):
                it["noAplica"] = True
            S.pending = (it, "comportamiento")
            return True
        if n.startswith("☑") and S.item is not None:
            S.item["noAplica"] = True
            return True
    # personaje: encabezado con el nombre del personaje (p.ej. "Tataendy")
    if block == "personaje" and len(t.split()) <= 3 and ":" not in t and not t.startswith(("«", "\"", "“")):
        it = S.new_item("personaje"); it["quienHabla"] = t
        S.pending = (it, "audio")
        return True
    # línea-título de la próxima fila (p.ej. "Observar y escuchar el Panel 2." antes de "Acción del niño: ...")
    starters = {"personaje": "quienHabla", "interacciones": "accion", "matriz": "accionNino"}
    if nxt and nxt["t"] == "p" and len(t) <= 110 and block in starters and S.item is not None and S.item.get(starters[block]):
        sln = split_label(nxt["text"])
        if sln and fields.get(sln[0]) == starters[block]:
            S.heading = t
            return True
    # sub-encabezado seguido de etiqueta → se antepone al siguiente valor
    if nxt and nxt["t"] == "p" and es_encabezado_corto(t) and split_label(nxt["text"]):
        S.heading = t
        return True
    # continuación del campo pendiente
    if S.pending and not isinstance(S.pending[0], str):
        append(S.pending[0], S.pending[1], t)
        return True
    if S.item is not None:
        append(S.item, default, t)
        S.pending = (S.item, default)
        return True
    return False


def header_map(row, fields):
    out = []
    for c in row:
        k = norm(re.sub(r"\(.*?\)", "", c.split("\n")[0])).strip().rstrip(":")
        out.append(fields.get(k) or fields.get(norm(c).strip()))
    return out


def procesar_tabla(S, rows):
    block = S.block
    if not rows:
        return
    # tabla de 2 columnas etiqueta | valor
    two = all(len(r) == 2 for r in rows)
    if block in ("recorrido", "mapa") and two:
        txt = "\n".join(f"{r[0]}: {r[1]}" for r in rows if norm(r[0]) != "etapa")
        append(S.a.setdefault("mapa", {}), "recorrido", txt)
        return
    if block in SCALAR_BLOCK_LABELS and two:
        tabla = SCALAR_BLOCK_LABELS[block]
        for r in rows:
            k = norm(r[0]).rstrip(":")
            path = tabla.get(k)
            if k in ("campo", "item", "ítem"):
                continue
            if path:
                S.setp(path, r[1])
            else:
                S.res(block, f"{r[0]}: {r[1]}")
        S.pending = None
        return
    if block in REPEAT_BLOCKS:
        key, fields, default = REPEAT_BLOCKS[block]
        hdr = header_map(rows[0], fields)
        col0 = [fields.get(norm(re.sub(r"\(.*?\)", "", r[0])).strip().rstrip(":")) for r in rows]
        vertical = two and (sum(1 for x in col0 if x) >= max(1, len(rows) // 2) or norm(rows[0][0]) == "campo")
        if vertical or (two and not any(hdr)):
            # tabla vertical (una ficha)
            first = norm(rows[0][0])
            if first in ("campo",):
                rows = rows[1:]
            it = S.item if (S.item is not None and not S.item.get("_filled")) else S.new_item(block)
            if block == "personaje" and S.personaje_pantalla:
                it.setdefault("cuandoAparece", S.personaje_pantalla)
            for r in rows:
                k = norm(re.sub(r"\(.*?\)", "", r[0])).strip().rstrip(":")
                f = fields.get(k)
                if f:
                    append(it, f, r[1])
                else:
                    append(it, default, f"{r[0]}: {r[1]}")
            it["_filled"] = True
            S.item = None; S.pending = None
            return
        if any(hdr):
            for r in rows[1:]:
                it = S.new_item(block)
                if block == "personaje" and S.personaje_pantalla:
                    it["cuandoAparece"] = S.personaje_pantalla
                for ci, c in enumerate(r):
                    f = hdr[ci] if ci < len(hdr) else None
                    if f == "cuandoAparece" and it.get("cuandoAparece") and c:
                        it["cuandoAparece"] = it["cuandoAparece"] + " · " + c
                    elif f:
                        append(it, f, c)
                    elif c:
                        append(it, default, f"{rows[0][ci] if ci < len(rows[0]) else ''}: {c}")
                it["_filled"] = True
            S.item = None; S.pending = None
            return
    S.res(block, tabla_a_texto(rows))


STOP_CASOS = {"nino", "actividad", "durante", "donde", "objeto"}


def match_caso(sit):
    ns = set(re.findall(r"[a-z]{4,}", norm(sit))) - STOP_CASOS
    best, bi = 0, None
    for i, b in enumerate(CASOS_LIMITE_BASE):
        nb = set(re.findall(r"[a-z]{4,}", norm(b))) - STOP_CASOS
        if not nb:
            continue
        sc = len(ns & nb) / len(nb)
        if sc > best:
            best, bi = sc, i
    return bi if best >= 0.5 else None


def finalizar_actividad(S):
    a = S.a
    # limpieza de claves internas
    for key in ("pantallas", "interacciones", "estados", "feedback", "personaje", "sonido", "matriz", "storyboard", "_casos"):
        for it in a.get(key, []):
            it.pop("_filled", None)
            tit = it.pop("_titulo", None)
            if tit:
                # el título del ítem se conserva: en feedback como estadoRef (si falta), en otros como prefijo
                if key == "feedback" and not it.get("estadoRef"):
                    it["estadoRef"] = tit
                elif key == "feedback":
                    it["queSignifica"] = (tit + ("\n" + it["queSignifica"] if it.get("queSignifica") else ""))
                elif key == "interacciones":
                    it["descripcion"] = (tit + ("\n" + it["descripcion"] if it.get("descripcion") else ""))
                elif key == "personaje":
                    it["cuandoAparece"] = (tit + (" · " + it["cuandoAparece"] if it.get("cuandoAparece") else ""))
    # casos límite → lista de 16 casos base + casos adicionales del documento
    casos = [{"id": uid(), "situacion": s, "comportamiento": "", "feedback": "", "accionPosterior": "", "noAplica": False, "condicion": "", "nota": ""} for s in CASOS_LIMITE_BASE]
    extras = []
    for c in a.pop("_casos", []):
        sit = c.get("situacion", "")
        idx = match_caso(sit) if sit else None
        if idx is not None and not casos[idx].get("_usado"):
            dst = casos[idx]
            dst["_usado"] = True
            if norm(sit).rstrip(".") != norm(CASOS_LIMITE_BASE[idx]).rstrip("."):
                c["nota"] = ("Situación en el documento: " + sit + ("\n" + c["nota"] if c.get("nota") else ""))
        else:
            dst = {"id": uid(), "situacion": sit or "(sin situación)", "comportamiento": "", "feedback": "", "accionPosterior": "", "noAplica": False, "condicion": "", "nota": ""}
            extras.append(dst)
        for k in ("comportamiento", "feedback", "accionPosterior", "condicion", "nota"):
            if c.get(k):
                append(dst, k, c[k])
        if c.get("noAplica"):
            dst["noAplica"] = True
    for c in casos:
        c.pop("_usado", None)
    a["casosLimite"] = casos + extras
    return a


# ================================================================ cola del módulo (Bloques P/Q, R, U, AA, AC, AB)
def parse_cola(items, mod, out):
    sec = None
    sub = None
    for it in items:
        if it["t"] == "tbl":
            out.residual({"PQ": "recursos", "R": "navegacion", "U": "tecnicas", "AA": "trazabilidad", "AC": "versiones", "AB": "validacion"}.get(sec, "identificacion"),
                         "Tabla del documento", tabla_a_texto(it["rows"]))
            continue
        t = it["text"]; n = norm(t)
        if n.startswith("bloque p/q"):
            sec = "PQ"; continue
        if n.startswith("bloque r"):
            sec = "R"; continue
        if n.startswith("bloque u"):
            sec = "U"; continue
        if n.startswith("bloque aa"):
            sec = "AA"; continue
        if n.startswith("bloque ac"):
            sec = "AC"; continue
        if n.startswith("bloque ab"):
            sec = "AB"; continue
        s = strip_label_decor(t)
        if sec == "PQ":
            if n in ("graficos", "sonoros", "audiovisuales", "interactivos"):
                sub = {"graficos": "Gráfico", "sonoros": "Sonoro", "audiovisuales": "Audiovisual", "interactivos": "Interactivo"}[n]; continue
            m = re.match(r"^((?:GRA|AUD|SFX|MUS|VID|INT)-[\w]+):\s*(.*)$", s)
            if m:
                rec = {"id": uid(), "recId": m.group(1), "tipo": sub or "", "estado": "", "uso": "", "responsable": ""}
                body = m.group(2)
                pm = re.match(r"^(.*?)\s*(\(.*)$", body)
                if pm:
                    rec["recurso"] = pm.group(1).strip(); rec["descripcion"] = pm.group(2).strip()
                else:
                    rec["recurso"] = body.strip(); rec["descripcion"] = ""
                mod.setdefault("recursos", []).append(rec)
            else:
                out.residual("recursos", "Bloque P/Q — texto del documento", t)
        elif sec == "R":
            m = re.match(r"^([A-ZÁÉÍÓÚÑ ]{3,20}):\s*(.*)$", s)
            mapa = {"CONTINUAR": "continuar", "VOLVER": "volver", "AYUDA": "ayuda"}
            if m and m.group(1).strip() in mapa:
                append(mod.setdefault("navegacion", {}), mapa[m.group(1).strip()], s)
            else:
                out.residual("navegacion", "Bloque R — botones y notas del documento", t)
        elif sec == "U":
            append(mod, "tecnicas", t)
        elif sec == "AA":
            out.residual("trazabilidad", "Bloque AA — trazabilidad según el documento", t)
        elif sec == "AC":
            m = re.match(r"^v?(\d+(?:\.\d+)*)\s*:\s*(.*)$", s)
            if m:
                mod.setdefault("versiones", []).append({"version": m.group(1), "fecha": "", "cambio": m.group(2).strip(), "responsable": "", "motivo": "", "aprobadoPor": "—"})
            else:
                out.residual("versiones", "Bloque AC — texto del documento", t)
        elif sec == "AB":
            out.residual("validacion", "Bloque AB — Ready for development según el documento", t)
        else:
            out.residual("identificacion", "Texto del documento", t)
    if mod.get("versiones"):
        mod["versionActual"] = mod["versiones"][-1]["version"]


# ================================================================ principal
def importar(path, grado_forzado=None):
    items = leer(path)
    # posiciones de actividades
    idx_act = []
    for i, it in enumerate(items):
        if it["t"] != "p":
            continue
        n = norm(it["text"])
        m = re.match(r"^actividad\s+(\d)\s*(\.|$)", n)
        if m and (it["style"].startswith("Heading") or n == f"actividad {m.group(1)}"):
            idx_act.append((i, int(m.group(1))))
    idx_cola = None
    for i, it in enumerate(items):
        if it["t"] == "p" and it["style"].startswith("Heading") and re.match(r"^bloque (p/q|r|u|aa|ac|ab)\b", norm(it["text"])) and idx_act and i > idx_act[-1][0]:
            idx_cola = i; break
    out = Salida()
    mod = {}
    parse_cabecera(items[: idx_act[0][0]], mod, out)
    acts = []
    for k, (pos, num) in enumerate(idx_act):
        fin = idx_act[k + 1][0] if k + 1 < len(idx_act) else (idx_cola if idx_cola else len(items))
        cab = items[pos]["text"]
        a = parse_actividad(items[pos + 1: fin], num, out)
        # nombre en el encabezado (formato 2°: "Actividad 1. Kapi te cuenta lo que le pasó")
        mt = re.match(r"^actividad\s+\d\.\s*(.+)$", cab, re.I)
        if mt and not a.get("nombre"):
            a["nombre"] = mt.group(1).strip()
        acts.append(a)
    mod["actividades"] = acts
    if idx_cola:
        parse_cola(items[idx_cola:], mod, out)
    mod["importado"] = out.importado
    if grado_forzado:
        mod["grado"] = f"{grado_forzado}º grado"
    return mod


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("docx"); ap.add_argument("salida"); ap.add_argument("--grado", type=int)
    ap.add_argument("--origen", default="")
    args = ap.parse_args()
    mod = importar(args.docx, args.grado)
    mod["origenImportacion"] = args.origen
    json.dump(mod, open(args.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("OK", args.salida)
