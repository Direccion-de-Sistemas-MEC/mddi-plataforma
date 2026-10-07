# Prueba funcional — resultado

Ejecutada el 2026-09-29 10:58:14 con navegadores Chromium reales (Playwright) contra el servidor y PostgreSQL. Script: `tests/prueba_funcional.py`.

Dos navegadores independientes: **A** es la docente, con un perfil persistente en disco que se cierra y se vuelve a abrir como una computadora real; **B** es Coordinación, desde otro dispositivo. La verificación final se hace consultando directamente la base de datos.

| # | Prueba | Resultado | Detalle |
|---|---|---|---|
| 1 | Crear un módulo en 1° grado | ✅ OK | creado en el servidor; antes había 1 módulo/s en 1° |
| 2 | Aparece como Módulo 2 porque ya existe el Módulo 1 | ✅ OK | servidor: 2, pantalla: 'Módulo 2' |
| 3 | Cargar título | ✅ OK |  |
| 4 | Cargar área | ✅ OK |  |
| 5 | Cargar objetivo (aprendizaje esperado) | ✅ OK |  |
| 6 | Los datos aparecen automáticamente en Orientaciones Didácticas (campos P) | ✅ OK | grado, área, nombre, duración y objetivo leídos del módulo |
| 7 | Completar un campo de Orientaciones Didácticas | ✅ OK | y el vínculo es vivo: cambio de título reflejado = True |
| 8 | Completar Estar Cerca | ✅ OK | incluye el texto fijo de pie |
| 9 | Completar Mapa de Verbos (verbo elegido de la lista) | ✅ OK |  |
| 10 | Cerrar sesión | ✅ OK |  |
| 11 | Volver a ingresar | ✅ OK |  |
| 12 | Todo continúa guardado después de salir y volver a entrar | ✅ OK |  |
| 13 | Abrir el mismo módulo desde otro navegador/dispositivo | ✅ OK |  |
| 14 | Aparece la información almacenada en el servidor | ✅ OK |  |
| 15 | Simular pérdida de conexión (la plataforma muestra 'Sin conexión') | ✅ OK |  |
| 16 | Modificar información sin conexión | ✅ OK |  |
| 17 | Los cambios no se pierden (recarga sin conexión y cierre del navegador) | ✅ OK | siguen en el equipo; todavía no llegaron al servidor |
| 18 | Recuperar conexión (se reabre el navegador con Internet, sin volver a escribir nada) | ✅ OK |  |
| 19 | Sincronización automática: el cambio hecho sin conexión llegó a la base de datos | ✅ OK | PostgreSQL: '¿Qué semillas conocen? (escrito SIN conexión)' |
| 20 | Un cambio de un usuario no elimina accidentalmente la información de otro | ✅ OK | campo editado por ambos: se conservó el de Coordinación y la versión de la docente quedó en un aviso recuperable; campo editado solo por Coordinación: intacto |

**Resultado: 20/20.** Control de cambios del módulo de prueba: 12 guardados registrados, versión 13, usuarios: Coordinación (otra compu), Docente de prueba.

## Cómo se probaron los puntos críticos

**Sin conexión (puntos 15 a 19).** Con el navegador A desconectado se modificaron dos campos de Orientaciones didácticas. Después se recargó la página sin conexión y los datos seguían ahí. Luego se **cerró el navegador**. Se comprobó en PostgreSQL que esos cambios todavía no estaban en el servidor. Al reabrir el navegador con conexión, sin escribir nada, los cambios llegaron solos a la base.

**Edición simultánea (punto 20).** Mientras A estaba sin conexión, B (con conexión) modificó uno de esos dos campos y otro distinto. Al reconectarse A:

- el campo que solo cambió A se guardó con el valor de A;
- el campo que solo cambió B quedó intacto;
- en el campo que cambiaron los dos se conservó el valor de B, y la versión de A quedó en un aviso de edición simultánea, recuperable con "Usar mi versión" o "Copiar". Nadie perdió su trabajo.

## Capturas

`docs/capturas/`: 01 panel por grados · 02 Orientaciones con campos tomados del módulo · 03 Estar Cerca · 04 Mapa de Verbos · 05 indicador Sin conexión · 06 aviso de edición simultánea.

Además se verificaron manualmente, por consola, la copia de seguridad (`backup.sh`) y la restauración en una base de prueba.
