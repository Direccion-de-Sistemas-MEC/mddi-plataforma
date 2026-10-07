# Arquitectura de la Plataforma MDDI 2.0

```
Navegador (React)                                   Servidor
┌─────────────────────────────────┐   HTTPS   ┌──────────────────────────────┐
│ App.jsx (interfaz)              │           │ Nginx (HTTPS)                │
│   │ updateModule()              │           │   │                          │
│ Motor de sincronización         │  /api/*   │ Node.js + Express            │
│  - shadow (última versión       │ ───────▶  │  - auth (códigos HMAC,       │
│    confirmada) + local (lo que  │           │    sesiones, roles, CSRF)    │
│    se edita)                    │ ◀───────  │  - módulos: numeración,      │
│  - IndexedDB (copia de trabajo, │           │    guardado por operaciones, │
│    cambios pendientes)          │           │    conflictos, historial     │
│ Service worker (interfaz        │           │ PostgreSQL 16                │
│  disponible sin conexión)       │           │  (fuente única de verdad)    │
└─────────────────────────────────┘           └──────────────────────────────┘
```

## Modelo de datos

Cada módulo es un documento JSON (tabla `modulos`, columna `data` JSONB) con la misma estructura que usaba la versión anterior, más los campos nuevos: `orientacionesDidacticas`, `estarCerca`, `mapaDeVerbos`, `duracionEstimada`, `correctorResponsable` e `importado`. El grado y el número de módulo son columnas propias (`grado`, `numero`). La numeración la asigna el servidor, con un bloqueo por grado, así que dos personas creando módulos a la vez no obtienen el mismo número.

**Fuente única de información.** Los campos (P) de Orientaciones didácticas, Estar Cerca y Mapa de Verbos (grado, área, título, docentes, duración, referencias curriculares, objetivos) **no se copian**: la interfaz los lee del módulo al mostrarlos. Si cambia el dato original, se actualiza en todos lados sin reescribirlo.

## Cómo se guarda

1. Cada cambio en un campo actualiza la copia `local` del módulo y se guarda en IndexedDB en menos de 250 ms.
2. El guardado en el servidor se dispara en cuatro momentos:
   - 1,2 segundos después de dejar de escribir (debounce);
   - al salir de un campo;
   - al ocultar la pestaña;
   - al cerrar la página.
3. Solo se envían las **operaciones** que cambiaron: `diff(shadow, local)` → `[{op:"set", path:[...], value}]`. Los elementos de listas (pantallas, estados, feedback…) se identifican por `id`, no por posición: si dos personas agregan o editan ítems distintos de la misma lista, los cambios se combinan.
4. El servidor aplica las operaciones y registra, **por campo**, la versión, el usuario y la fecha del último cambio (`field_versions`). Cada guardado queda en `modulo_cambios` (quién, cuándo, versión y campos modificados).

## Conflictos (dos personas editan lo mismo)

Cada guardado viaja con la versión sobre la que trabajó el usuario (`baseVersion`). El servidor decide así:

- Si **otra persona** cambió ese mismo campo después de esa versión, **no aplica** la operación y la devuelve como conflicto, con los dos valores. Si el valor es idéntico, no hay conflicto.
- Los campos que no chocan se guardan normalmente.
- En la pantalla aparece "N aviso(s) de edición simultánea", con la versión de cada uno. Se puede copiar la propia, reemplazar la guardada con "Usar mi versión" (queda registrado) o descartar el aviso.

Nada se sobrescribe en silencio. Además, un aviso de presencia muestra quién más tiene abierto el mismo módulo.

## Sin conexión

- Si falla la red, el indicador pasa a **"Sin conexión"** y se sigue trabajando normalmente: todo queda en IndexedDB.
- El service worker permite **recargar o volver a abrir** la plataforma sin conexión. El usuario de la última sesión queda en caché.
- Al cerrar la página se escribe además una copia de emergencia sincrónica en `localStorage`, por si IndexedDB no llega a completar la escritura.
- Al volver la conexión (evento `online`, reintentos con espera creciente o reapertura del navegador), los cambios pendientes se envían solos y se combinan con lo que otros hicieron mientras tanto, aplicando las reglas de conflicto.
- Si la sesión venció, se pide el código de nuevo sin perder nada.
- Para **eliminar** módulos hace falta conexión: es deliberado, porque las acciones destructivas se confirman con el servidor.

## Seguridad

| Aspecto | Implementación |
|---|---|
| Códigos de acceso | HMAC-SHA256 con `MDDI_SECRETO`. Se muestran una sola vez, al darlos de alta |
| Sesión | Cookie `HttpOnly`, `SameSite=Lax` y `Secure` (con HTTPS). Renovación deslizante de 14 días. La tabla `sesiones` guarda solo el SHA-256 del token |
| CSRF | Cabecera obligatoria `X-MDDI: 1` en toda escritura |
| Fuerza bruta | 15 intentos cada 10 minutos por IP |
| Roles validados en el servidor | Usuarios, papelera y restauración: solo Coordinación. Crear módulos: Docente y Coordinación. Transiciones del circuito de revisión según rol |
| Borrado | Lógico, con papelera. Instantánea previa al eliminar y al restaurar |
| Auditoría | `bitacora` (ingresos y acciones) y `modulo_cambios` (cada guardado) |
| Autenticación futura | Todo está concentrado en `validarCredenciales()` (`backend/src/auth.js`). La tabla ya tiene `email` y `clave_hash` reservados para pasar a usuario+clave, LDAP u OIDC |

## API

| Método y ruta | Uso |
|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | Sesión |
| `GET /api/modulos?desde=` | Módulos modificados desde una fecha, más la lista de módulos vigentes |
| `POST /api/modulos` | Crear (idempotente: sirve para reintentos sin conexión) |
| `POST /api/modulos/:id/ops` | Guardar operaciones (`baseVersion`, `clientId`, `ops`) |
| `DELETE /api/modulos/:id` | Enviar a la papelera |
| `GET /api/modulos-eliminados` · `POST /api/modulos/:id/restaurar` | Papelera |
| `GET /api/modulos/:id/historial` · `POST /api/modulos/:id/instantaneas/:n/restaurar` | Historial y copias |
| `POST /api/modulos/:id/presencia` | Quién está editando |
| `GET/POST /api/usuarios` · `PATCH /api/usuarios/:id` | Administración de usuarios (Coordinación) |
| `GET/POST /api/bitacora` | Bitácora |
| `GET /api/salud` | Monitoreo |

## Migración desde la versión anterior

Si un navegador tiene módulos guardados por la versión anterior (`localStorage` "mddi-data"), el panel muestra un aviso con el botón **"Subir al servidor"**. Solo funciona si la plataforma nueva se publica en **el mismo dominio** que la anterior, porque el navegador no comparte datos entre dominios. Si se publica en otro dominio, los módulos de la versión anterior no se pueden recuperar automáticamente.
