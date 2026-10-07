# Plataforma MDDI 2.0 — Educa Primaria

Plataforma de Diseño Didáctico-Interactivo del Ministerio de Educación de Corrientes (Subsecretaría de Contenidos Audiovisuales).

## Qué cambió respecto de la versión anterior

| Antes | Ahora |
|---|---|
| Datos guardados en el navegador (`localStorage` / `window.storage`): se perdían al cambiar de equipo, limpiar el navegador o por errores de cuota | **Servidor + base PostgreSQL centralizada**. El navegador solo guarda una copia de trabajo (IndexedDB) para seguir sin conexión |
| Lista plana de módulos | **Organización por grados (1° a 6°)** con numeración automática: "Módulo 1 — Título", "Módulo 2 — Título"… |
| — | Bloques nuevos: **Orientaciones didácticas**, **Estar Cerca** y **Mapa de Verbos**, con campos vinculados al módulo ("tomado del módulo") |
| Guardado manual / sin control | **Guardado automático** con indicador (Guardando / Guardado / Sin conexión / Error), trabajo sin conexión y sincronización al volver |
| El último que guardaba pisaba al resto | **Guardado por campo con detección de conflictos**: nunca se sobrescribe en silencio |
| Códigos de acceso visibles en el código | Códigos cifrados en el servidor, sesiones seguras, permisos validados por rol |
| Borrado definitivo | Papelera restaurable, historial de guardados y copias automáticas por módulo |

Se conservan la identidad visual, los 4 roles, el semáforo, el circuito de revisión, comentarios, bitácora, control de cambios, previsualización y generación del documento.

## Estructura

```
backend/     API Node.js + Express, migraciones SQL, carga inicial, scripts de backup
frontend/    Interfaz React (Vite). src/App.jsx = plataforma; src/sync/ = motor de guardado
shared/      Modelo de datos y operaciones de cambio (compartido frontend/backend)
tools/       Importador de módulos desde Word (.docx) y parches aplicados a la versión anterior
tests/       Prueba funcional de 20 puntos (Playwright)
deploy/      Nginx, systemd, Docker
docs/        Arquitectura, despliegue, requisitos de hosting, resultado de pruebas y capturas
```

## Puesta en marcha para desarrollo

```bash
# 1. Base de datos
sudo -u postgres psql -c "CREATE USER mddi WITH PASSWORD 'mddi_dev';" -c "CREATE DATABASE mddi OWNER mddi;"
# 2. Backend (crea tablas y carga los módulos importados al iniciar)
cd backend && npm install && npm start          # http://localhost:8080
# 3. Frontend en modo desarrollo (en otra terminal)
cd frontend && npm install && npm run dev       # http://localhost:5173 (usa /api del puerto 8080)
```

Usuarios de desarrollo: `COORD-2026` (Coordinación), `DOC-2G-01` (Docente), `ESP-MAT-01` (Especialista), `COR-01` (Corrector/a). En producción no se crean: ver `.env.example`.

Producción: `docs/DESPLIEGUE.md`. Requisitos de servidor: `docs/Requisitos_de_hosting_MDDI.md`.

## Prueba funcional

```bash
cd frontend && npm run build && cd ../backend && npm start &
python3 tests/prueba_funcional.py        # requiere: pip install playwright && playwright install chromium
```
Resultado de la última ejecución: `docs/PRUEBA_FUNCIONAL.md` (20/20).

## Módulos importados

`tools/importador/importar_modulo.py` convierte los documentos Word de los módulos al modelo de la plataforma sin descartar texto. Lo que no tiene un campo exacto queda en el panel "Texto del documento original sin campo específico" del bloque correspondiente. Cargados: 1° grado · Módulo 1 "Tesoros en el Iberá" (1G-M01) y 2° grado · Módulo 1 "¡Cuidado con el tronco que respira!" (2G-M01).
