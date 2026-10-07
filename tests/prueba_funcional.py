#!/usr/bin/env python3
"""
Prueba funcional obligatoria de la Plataforma MDDI (punto 17 del pedido).

Usa navegadores Chromium reales (Playwright):
  - Navegador A: perfil persistente en disco (como una computadora real): se puede
    cerrar y volver a abrir conservando su almacenamiento local.
  - Navegador B: otro perfil totalmente independiente (= otro dispositivo).
La verificación final se hace además directamente contra la base PostgreSQL.

Uso:  python3 tests/prueba_funcional.py  [--base http://localhost:8080] [--capturas docs/capturas]
"""
import asyncio, json, os, shutil, subprocess, sys, time, argparse
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:8080")
ap.add_argument("--capturas", default=os.path.join(os.path.dirname(__file__), "..", "docs", "capturas"))
ap.add_argument("--chrome", default="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
args = ap.parse_args()
BASE = args.base
os.makedirs(args.capturas, exist_ok=True)
PERFIL_A = "/tmp/mddi-perfil-A"
shutil.rmtree(PERFIL_A, ignore_errors=True)

resultados = []
def ok(n, desc, cond, detalle=""):
    resultados.append({"n": n, "prueba": desc, "ok": bool(cond), "detalle": detalle})
    print(f"[{'OK ' if cond else 'FALLA'}] {n:>2}. {desc}  {detalle}")
    if not cond:
        raise AssertionError(f"Falló la prueba {n}: {desc} {detalle}")

def sql(q):
    return subprocess.run(["su", "postgres", "-c", f"psql -d mddi -tAc \"{q}\""], capture_output=True, text=True).stdout.strip()

def campo(page, label, nth=0):
    return page.locator(f"xpath=//label[normalize-space(.)=\"{label}\"]/following-sibling::*[self::textarea or self::input or self::select][1]").nth(nth)

async def paso(page, nombre):
    await page.locator("button", has_text=nombre).first.click()
    await page.wait_for_timeout(250)

async def guardado(page, timeout=20000):
    await page.wait_for_selector("[data-testid=estado-guardado][data-estado=guardado]", timeout=timeout)

async def login(page, codigo, nombre):
    await page.goto(BASE)
    await page.wait_for_selector("text=Acceso a la plataforma MDDI", timeout=15000)
    await campo(page, "Código de acceso").fill(codigo)
    await campo(page, "Tu nombre (opcional)").fill(nombre)
    await page.get_by_role("button", name="Ingresar").click()
    await page.wait_for_selector("text=grado — módulos", timeout=15000)

async def abrir_modulo(page, grado, titulo):
    await page.locator(f"button[data-grado='{grado}']").click()
    card = page.locator("h3", has_text=titulo).first.locator("xpath=ancestor::div[.//button[contains(translate(normalize-space(.),'continuar','CONTINUAR'),'CONTINUAR')]][1]")
    await card.get_by_role("button", name="CONTINUAR").click()
    await page.wait_for_selector("text=Bloque A — Identificación del módulo")

async def api_json(page, ruta):
    return await page.evaluate("r => fetch('/api' + r, {credentials:'same-origin'}).then(x => x.json())", ruta)

TITULO = f"Semillas del estero (prueba {int(time.time())})"
OBJETIVO = "Compara colecciones de semillas y decide cuál tiene más, usando el conteo."
OD_REL = "Retoma la búsqueda de semillas que hicieron con Kapi en la Actividad 1."
EC_IDEA = "Busquen en casa dos grupos de semillas y conversen sobre cuál tiene más."
EC_P1 = "¿Cuál grupo tiene más semillas?"
MV_HACE = "Compara dos grupos de semillas para decidir cuál tiene más."
OFF_F1 = "¿Qué semillas conocen? (escrito SIN conexión)"
OFF_F2_A = "Consigna escrita por la docente SIN conexión"
ON_F2_B = "Consigna escrita por Coordinación desde otro dispositivo"
ON_F3_B = "Recursos digitales: una tablet por pareja (Coordinación)"


async def main():
    async with async_playwright() as p:
        # ------------------------------------------------------------ navegador A (docente)
        ctxA = await p.chromium.launch_persistent_context(PERFIL_A, executable_path=args.chrome, viewport={"width": 1400, "height": 950})
        A = ctxA.pages[0] if ctxA.pages else await ctxA.new_page()
        await login(A, "DOC-2G-01", "Docente de prueba")
        await A.screenshot(path=f"{args.capturas}/01_panel_por_grados.png")

        n_antes = int(sql("select count(*) from modulos where grado=1 and eliminado_en is null"))
        await A.locator("button[data-grado='1']").click()
        await A.get_by_role("button", name="Nuevo módulo en 1° grado").click()
        await A.wait_for_selector("text=Bloque A — Identificación del módulo")
        await guardado(A)
        await A.wait_for_timeout(500)
        mods = (await api_json(A, "/modulos"))["modulos"]
        nuevo = [m for m in mods if m["meta"]["grado"] == 1 and m["meta"]["numero"] == n_antes + 1]
        ok(1, "Crear un módulo en 1° grado", len(nuevo) == 1, f"(creado en el servidor; antes había {n_antes} módulo/s en 1°)")
        mod_id = nuevo[0]["meta"]["id"]
        num_ui = await campo(A, "Número de módulo (automático)").input_value()
        ok(2, "Aparece como Módulo 2 porque ya existe el Módulo 1", nuevo[0]["meta"]["numero"] == 2 and num_ui == "Módulo 2", f"(servidor: {nuevo[0]['meta']['numero']}, pantalla: '{num_ui}')")

        await campo(A, "Título").fill(TITULO)
        await campo(A, "Duración estimada (de la actividad completa)").fill("2 clases de 80 minutos")
        ok(3, "Cargar título", (await campo(A, "Título").input_value()) == TITULO)
        await campo(A, "Área").select_option("Lengua")
        ok(4, "Cargar área", (await campo(A, "Área").input_value()) == "Lengua")
        await paso(A, "Fundamentación")
        await campo(A, "Aprendizaje esperado").fill(OBJETIVO)
        ok(5, "Cargar objetivo (aprendizaje esperado)", (await campo(A, "Aprendizaje esperado").input_value()) == OBJETIVO)

        await paso(A, "Orientaciones didácticas")
        cuerpo = await A.locator("body").inner_text()
        ficha_ok = f"Módulo 2 — {TITULO}" in cuerpo and "Lengua" in cuerpo and "1º grado" in cuerpo and "2 clases de 80 minutos" in cuerpo
        obj = await A.locator("body").inner_text()
        await A.screenshot(path=f"{args.capturas}/02_orientaciones_autocompletado.png")
        ok(6, "Los datos aparecen automáticamente en Orientaciones Didácticas (campos P)", ficha_ok and OBJETIVO in obj, "(grado, área, nombre, duración y objetivo leídos del módulo)")
        # vínculo vivo: cambiar el título en el origen actualiza Orientaciones sin reescribir
        await paso(A, "Identificación")
        await campo(A, "Título").fill(TITULO + " II")
        await paso(A, "Orientaciones didácticas")
        vivo = TITULO + " II" in await A.locator("body").inner_text()
        await paso(A, "Identificación"); await campo(A, "Título").fill(TITULO); await paso(A, "Orientaciones didácticas")
        await campo(A, "Relación con el módulo").fill(OD_REL)
        ok(7, "Completar un campo de Orientaciones Didácticas", (await campo(A, "Relación con el módulo").input_value()) == OD_REL, f"(y el vínculo es vivo: cambio de título reflejado = {vivo})")

        await paso(A, "Estar Cerca")
        await campo(A, "Idea breve").fill(EC_IDEA)
        await campo(A, "Pregunta 1").fill(EC_P1)
        fijo = await A.locator("[data-testid=ec-texto-fijo]").inner_text()
        await A.screenshot(path=f"{args.capturas}/03_estar_cerca.png")
        ok(8, "Completar Estar Cerca", (await campo(A, "Pregunta 1").input_value()) == EC_P1 and fijo.startswith("Esta propuesta es opcional y no se evalúa."), "(incluye el texto fijo de pie)")

        await paso(A, "Mapa de Verbos")
        await A.locator("button[data-verbo=COMPARAR]").first.click()
        await campo(A, "2. ¿Qué hace el niño o la niña?", 0).fill(MV_HACE)
        await A.screenshot(path=f"{args.capturas}/04_mapa_de_verbos.png")
        ok(9, "Completar Mapa de Verbos (verbo elegido de la lista)", (await campo(A, "2. ¿Qué hace el niño o la niña?", 0).input_value()) == MV_HACE)
        await guardado(A)

        await A.get_by_role("button", name="Cerrar sesión").click()
        await A.wait_for_selector("text=Acceso a la plataforma MDDI")
        ok(10, "Cerrar sesión", True)
        await login(A, "DOC-2G-01", "Docente de prueba")
        ok(11, "Volver a ingresar", True)
        await abrir_modulo(A, 1, TITULO)
        t = await campo(A, "Título").input_value()
        await paso(A, "Orientaciones didácticas"); r1 = await campo(A, "Relación con el módulo").input_value()
        await paso(A, "Estar Cerca"); r2 = await campo(A, "Pregunta 1").input_value()
        await paso(A, "Mapa de Verbos"); r3 = await campo(A, "2. ¿Qué hace el niño o la niña?", 0).input_value()
        ok(12, "Todo continúa guardado después de salir y volver a entrar", t == TITULO and r1 == OD_REL and r2 == EC_P1 and r3 == MV_HACE)

        # ------------------------------------------------------------ navegador B (otro dispositivo)
        brB = await p.chromium.launch(executable_path=args.chrome)
        ctxB = await brB.new_context(viewport={"width": 1400, "height": 950})
        B = await ctxB.new_page()
        await login(B, "COORD-2026", "Coordinación (otra compu)")
        await abrir_modulo(B, 1, TITULO)
        ok(13, "Abrir el mismo módulo desde otro navegador/dispositivo", True)
        await paso(B, "Orientaciones didácticas")
        b1 = await campo(B, "Relación con el módulo").input_value()
        await paso(B, "Estar Cerca"); b2 = await campo(B, "Idea breve").input_value()
        await paso(B, "Identificación"); b3 = await campo(B, "Área").input_value()
        ok(14, "Aparece la información almacenada en el servidor", b1 == OD_REL and b2 == EC_IDEA and b3 == "Lengua")

        # ------------------------------------------------------------ sin conexión (A)
        await paso(A, "Orientaciones didácticas")
        await ctxA.set_offline(True)
        await A.wait_for_timeout(300)
        await campo(A, "Preguntas disparadoras").fill(OFF_F1)
        await campo(A, "Consigna de la actividad de inicio").fill(OFF_F2_A)
        await A.wait_for_selector("[data-testid=estado-guardado][data-estado=sin_conexion]", timeout=15000)
        await A.screenshot(path=f"{args.capturas}/05_sin_conexion.png")
        ok(15, "Simular pérdida de conexión (la plataforma muestra 'Sin conexión')", True)
        ok(16, "Modificar información sin conexión", (await campo(A, "Preguntas disparadoras").input_value()) == OFF_F1)
        # mientras tanto, B (con conexión) edita el MISMO campo F2 y otro campo distinto
        await paso(B, "Orientaciones didácticas")
        await campo(B, "Consigna de la actividad de inicio").fill(ON_F2_B)
        await campo(B, "Recursos digitales").fill(ON_F3_B)
        await guardado(B)
        # A recarga la página sin conexión y luego CIERRA el navegador (como apagar la compu)
        await A.wait_for_timeout(800)
        await A.reload()
        await A.wait_for_selector("text=grado — módulos", timeout=15000)
        await abrir_modulo(A, 1, TITULO)
        await paso(A, "Orientaciones didácticas")
        tras_recarga = await campo(A, "Preguntas disparadoras").input_value()
        await A.wait_for_timeout(600)
        await ctxA.close()
        en_servidor_aun = sql(f"select data->'orientacionesDidacticas'->'inicial'->>'preguntasDisparadoras' from modulos where id='{mod_id}'")
        ok(17, "Los cambios no se pierden (recarga sin conexión y cierre del navegador)", tras_recarga == OFF_F1 and en_servidor_aun != OFF_F1,
           "(siguen en el equipo; todavía no llegaron al servidor)")

        # ------------------------------------------------------------ vuelve la conexión: se reabre el navegador A
        ctxA = await p.chromium.launch_persistent_context(PERFIL_A, executable_path=args.chrome, viewport={"width": 1400, "height": 950})
        A = ctxA.pages[0] if ctxA.pages else await ctxA.new_page()
        await A.goto(BASE)
        await A.wait_for_selector("text=grado — módulos", timeout=15000)
        ok(18, "Recuperar conexión (se reabre el navegador con Internet, sin volver a escribir nada)", True)
        await guardado(A, 30000)
        await A.wait_for_timeout(500)
        f1 = sql(f"select data->'orientacionesDidacticas'->'inicial'->>'preguntasDisparadoras' from modulos where id='{mod_id}'")
        ok(19, "Sincronización automática: el cambio hecho sin conexión llegó a la base de datos", f1 == OFF_F1, f"(PostgreSQL: '{f1}')")

        f2 = sql(f"select data->'orientacionesDidacticas'->'inicial'->>'consignaInicio' from modulos where id='{mod_id}'")
        f3 = sql(f"select data->'orientacionesDidacticas'->'materiales'->>'digitales' from modulos where id='{mod_id}'")
        n_conf = await A.evaluate("() => window.__mddiMotor.conflictos.filter(c => c.tuValor === arguments[0]).length".replace("arguments[0]", json.dumps(OFF_F2_A)))
        await abrir_modulo(A, 1, TITULO)
        await A.screenshot(path=f"{args.capturas}/06_aviso_edicion_simultanea.png")
        ok(20, "Un cambio de un usuario no elimina accidentalmente la información de otro",
           f2 == ON_F2_B and f3 == ON_F3_B and n_conf == 1,
           f"(campo editado por ambos: se conservó el de Coordinación y la versión de la docente quedó en un aviso recuperable; campo editado solo por Coordinación: intacto)")

        # extra: historial / control de cambios en el servidor
        cambios = int(sql(f"select count(*) from modulo_cambios where modulo_id='{mod_id}'"))
        usuarios = sql(f"select string_agg(distinct usuario, ', ') from modulo_cambios where modulo_id='{mod_id}'")
        ver = sql(f"select version from modulos where id='{mod_id}'")
        print(f"      Control de cambios: {cambios} guardados registrados, versión {ver}, usuarios: {usuarios}")
        await ctxA.close(); await brB.close()

    with open(os.path.join(args.capturas, "..", "resultado_prueba_funcional.json"), "w", encoding="utf-8") as f:
        json.dump({"fecha": time.strftime("%Y-%m-%d %H:%M:%S"), "modulo_id": mod_id, "resultados": resultados,
                   "control_de_cambios": {"guardados": cambios, "version": ver, "usuarios": usuarios}}, f, ensure_ascii=False, indent=1)
    print(f"\nRESULTADO: {sum(r['ok'] for r in resultados)}/{len(resultados)} pruebas superadas")

asyncio.run(main())
