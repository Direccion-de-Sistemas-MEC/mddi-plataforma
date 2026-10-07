# Notas para el despliegue (versión corta)

Lo mínimo para que funcione es **una app Node.js 20+ y una base PostgreSQL 14+**. El documento "Requisitos de hosting" describe lo recomendable para el Ministerio a largo plazo: copias fuera del servidor, monitoreo, etc. Para un primer despliegue nada de eso es obligatorio.

## Opción A: Docker (recomendada)
`Dockerfile` en la raíz: compila el frontend y levanta el backend, que sirve la API y la interfaz. Expone el puerto 8080, o el que indique `PORT`.

## Opción B: sin Docker
```bash
cd frontend && npm ci && npm run build
cd ../backend && npm ci --omit=dev && npm start      # node src/server.js
```
El backend importa `../shared` y sirve `../frontend/dist`. Hay que mantener la estructura de carpetas.

## Variables de entorno
| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | Sí | `postgres://usuario:clave@host:5432/base` |
| `DATABASE_SSL` | Según el proveedor | `true` si la base exige SSL |
| `MDDI_SECRETO` | Sí | `openssl rand -base64 48`. **No cambiarla nunca después**: los códigos de acceso se guardan como HMAC con esta clave |
| `MDDI_CODIGO_COORDINACION` | Sí, la primera vez | Código del primer usuario (Coordinación), que se crea si la tabla de usuarios está vacía |
| `NODE_ENV` | Sí | `production` |
| `COOKIE_SECURE` | Sí | `true` (requiere HTTPS) |
| `MDDI_USUARIOS_DEMO` | No | `false` |
| `PORT` | No | Por defecto, 8080 |

## Base de datos
- **Al iniciar**, la app aplica sola las migraciones (`backend/src/migrations`) y la carga inicial: el usuario de Coordinación y los 2 módulos importados.
- **Restaurar el dump entregado es opcional.** Contiene ese mismo estado inicial, sin usuarios. Para restaurarlo: `pg_restore --no-owner --no-privileges -d <base> mddi_estado_inicial.dump`, o bien `psql <base> < mddi_estado_inicial.sql`. Después la app crea el usuario de Coordinación con `MDDI_CODIGO_COORDINACION`.

## Verificación
- `GET /api/salud` → `{"ok":true}`
- Ingresar con el código de Coordinación: deben aparecer 1° grado · Módulo 1 "Tesoros en el Iberá" y 2° grado · Módulo 1 "¡Cuidado con el tronco que respira!".

## Requisitos que no son negociables
- **HTTPS.** Sin él no funcionan la cookie segura ni el modo sin conexión (service worker).
- **Una sola instancia de la app**, por ahora. La "presencia" (quién está editando) vive en memoria. Todo lo demás (datos, sesiones y conflictos) está en PostgreSQL.
- **Proxy inverso.** La app ya tiene `trust proxy` activado.
