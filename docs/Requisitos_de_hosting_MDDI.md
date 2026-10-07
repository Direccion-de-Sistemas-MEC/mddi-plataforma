# Requisitos de hosting para la Plataforma MDDI — Educa Primaria

*Ministerio de Educación de la Provincia de Corrientes · Subsecretaría de Contenidos Audiovisuales*

**Destinatario:** Área de Sistemas / Infraestructura del Ministerio de Educación de Corrientes

**Aplicación:** Plataforma MDDI (Diseño Didáctico-Interactivo), versión 2.0

**Uso previsto:** entre 50 y 70 personas usuarias (docentes de contenidos, especialistas en didáctica, correctores/as y coordinación). Uso interno, en horario laboral, con picos de 20 a 30 personas trabajando al mismo tiempo.

## Resumen para decidir rápido

La plataforma es una aplicación web liviana: un servidor de aplicación (Node.js) y una base de datos (PostgreSQL). **Alcanza con una sola máquina virtual pequeña**, con HTTPS, copias de seguridad diarias fuera del servidor y monitoreo básico.

| Recurso | Mínimo | Recomendado |
|---|---|---|
| Tipo | 1 máquina virtual (VPS o VM en nube institucional) | La misma, con snapshots automáticos del proveedor |
| Sistema operativo | Ubuntu Server 24.04 LTS (o Debian 12) | Ubuntu Server 24.04 LTS |
| CPU | 2 vCPU | 2 a 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disco | 40 GB SSD | 80 GB SSD/NVMe |
| Base de datos | PostgreSQL 14 o superior | PostgreSQL 16 |
| Backend | Node.js 20 LTS o superior | Node.js 22 LTS |
| Servidor web | Nginx (proxy inverso + HTTPS) | Nginx |
| Dominio | Subdominio institucional | p. ej. `mddi.educacion.corrientes.gob.ar` |
| Certificado | HTTPS obligatorio | Let's Encrypt (renovación automática) o certificado institucional |
| Copias | Diarias, con copia fuera del servidor | Diarias + snapshot semanal de la VM |

Costo de referencia en nube comercial: una VM de 2 vCPU / 4-8 GB de RAM cuesta entre USD 12 y USD 45 por mes según el proveedor. En la infraestructura propia del Ministerio el consumo es marginal.

## 1. Tipo de infraestructura recomendada

Una única máquina virtual con todos los componentes (Nginx, aplicación Node.js y PostgreSQL). Para 50-70 personas no se justifican clústeres, balanceadores ni bases de datos separadas. La arquitectura permite separar la base de datos o agregar una segunda instancia de aplicación más adelante, sin cambios en el código (ver punto 20).

## 2. Opción recomendada

En orden de preferencia:

1. **VM en la infraestructura del Ministerio o del Gobierno provincial** (centro de datos propio). Es la opción preferida: los datos quedan en infraestructura del Estado.
2. **VPS en proveedor de nube** (por ejemplo DigitalOcean, Linode/Akamai, Hetzner, AWS Lightsail, Google Cloud o Azure) si no hay infraestructura propia disponible.

**No se requieren** servicios administrados costosos (Kubernetes, bases de datos gestionadas de alta disponibilidad).

## 3. Sistema operativo

**Ubuntu Server 24.04 LTS** (soporte hasta 2029), o Debian 12. Instalación mínima, sin entorno gráfico.

## 4. CPU

2 vCPU como mínimo; 4 vCPU si la misma VM se usa para otras tareas. El consumo típico es bajo: cada guardado envía solo los cambios, no el módulo completo.

## 5. Memoria RAM

4 GB como mínimo y 8 GB recomendados. Distribución orientativa: PostgreSQL entre 1 y 2 GB, Node.js entre 300 y 600 MB, Nginx y el sistema operativo alrededor de 1 GB. El resto queda como margen y caché de disco.

## 6. Almacenamiento

40 GB como mínimo y 80 GB recomendados, con este reparto aproximado:

| Uso | Espacio |
|---|---|
| Sistema operativo y software | 8 GB |
| Base de datos | Menos de 2 GB durante los primeros años (ver punto 28) |
| Copias de seguridad locales (retención de 7 días) | Unos 5 GB |
| Logs y margen de crecimiento | El resto |

## 7. Tipo de almacenamiento

Disco **SSD o NVMe**. No usar discos mecánicos para la base de datos. Se recomienda que el proveedor tenga redundancia de disco (RAID o almacenamiento replicado).

## 8. Base de datos

**PostgreSQL 16** (mínimo 14), instalado desde los repositorios oficiales del sistema operativo. La base guarda:

- usuarios (con los códigos de acceso cifrados);
- sesiones;
- módulos (en formato JSONB, con número de versión);
- el registro de cada cambio (control de cambios);
- copias completas periódicas de cada módulo;
- la bitácora de actividad.

El esquema se crea solo: al iniciar, la aplicación aplica las migraciones.

## 9. Backend

**Node.js 22 LTS** (mínimo 20), con Express y el driver `pg`. Corre como servicio `systemd` con un usuario sin privilegios (se entrega el archivo de servicio). El backend expone la API en `/api` y sirve también la interfaz ya compilada, así que en producción hay un solo proceso de aplicación.

## 10. Frontend

La interfaz es una aplicación React ya compilada: son archivos estáticos (unos 400 KB comprimidos a 130 KB). Hay dos formas de publicarla:

- servida por el mismo backend (opción por defecto, la más simple);
- servida directamente por Nginx desde `frontend/dist`.

Incluye un *service worker* para poder abrirla sin conexión. Para que funcione, el sitio **debe publicarse con HTTPS**.

## 11. HTTPS

**Obligatorio.** Tres motivos:

1. Protege los códigos de acceso y la cookie de sesión.
2. Los navegadores solo habilitan el trabajo sin conexión (service worker) en sitios HTTPS.
3. La cookie de sesión se emite con el atributo `Secure`.

Se usa TLS 1.2 o 1.3, con redirección de HTTP a HTTPS y HSTS (se entrega la configuración de Nginx). El certificado puede ser de Let's Encrypt, con renovación automática vía `certbot`, o el certificado institucional del Gobierno.

## 12. Dominio o subdominio

Un subdominio institucional; por ejemplo, `mddi.educacion.corrientes.gob.ar` o `mddi.corrientes.gob.ar`. Solo requiere un registro DNS de tipo A (y AAAA si hay IPv6) apuntando a la IP pública de la VM.

## 13. Copias de seguridad

- **Base de datos:** volcado completo diario con `pg_dump` en formato comprimido (se entrega el script `backend/scripts/backup.sh`). Hoy ocupa unos pocos MB y el volcado tarda segundos.
- **Copia fuera del servidor (obligatoria):** cada copia diaria se envía a otro lugar: un servidor de respaldo del Ministerio o almacenamiento de objetos (S3 o compatible). El script admite un destino `rsync` o `rclone`.
- **Snapshot de la VM:** semanal, si la plataforma de virtualización o el proveedor lo ofrece.
- **Dentro de la aplicación:** además, cada módulo guarda copias completas automáticas (cada 30 minutos de trabajo, al crearlo, antes de eliminarlo y antes de restaurarlo) y el registro de cada cambio. Esto permite recuperar un módulo puntual sin restaurar toda la base.

## 14. Frecuencia de copias

- Volcado de la base: **diario**, fuera del horario de trabajo (por ejemplo, a las 02:00).
- Snapshot de la VM: **semanal**.
- Opcional, si se busca pérdida máxima de minutos en caso de desastre: archivado continuo de WAL de PostgreSQL (por ejemplo con `pgBackRest` o `wal-g`). **No es imprescindible** para este volumen: los usuarios conservan en sus navegadores los cambios que no llegaron al servidor.

## 15. Retención de copias

| Tipo de copia | Retención |
|---|---|
| Diarias | 7 días |
| Semanales | 4 semanas |
| Mensuales | 12 meses |
| Anual (fin del ciclo lectivo) | Conservación permanente como archivo institucional |

El script de backup implementa la rotación diaria/semanal/mensual.

## 16. Recuperación ante fallos

| Situación | Procedimiento | Tiempo estimado |
|---|---|---|
| Falla de la aplicación | `systemd` la reinicia automáticamente | Segundos |
| Falla de la VM | Se recrea desde el snapshot o se reinstala (unos 30 minutos siguiendo `docs/DESPLIEGUE.md`) y se restaura la última copia | Menos de 2 horas |
| Error humano sobre un módulo | Coordinación restaura una copia del módulo o lo recupera de la papelera, desde la propia plataforma | Minutos, sin intervención técnica |

Objetivos propuestos: **RPO ≤ 24 horas** en el peor caso de pérdida total del servidor (en la práctica menor, porque los cambios no sincronizados siguen en los equipos de los usuarios) y **RTO ≤ 4 horas**.

## 17. Seguridad

Medidas que ya incluye la aplicación:

- códigos de acceso guardados como HMAC-SHA256 con una clave secreta del servidor, nunca en texto plano;
- sesiones con cookie `HttpOnly`, `Secure` y `SameSite=Lax`; en la base se guarda solo el hash del token;
- protección CSRF;
- límite de intentos de ingreso por IP;
- permisos validados en el servidor según el rol;
- cabeceras de seguridad (CSP, HSTS, `X-Frame-Options`);
- eliminación lógica con papelera, confirmaciones antes de acciones destructivas y registro de auditoría.

Lo que se requiere del hosting:

- mantener el sistema operativo actualizado, con actualizaciones de seguridad automáticas (`unattended-upgrades`);
- acceso SSH solo con llave (sin contraseña) y sin ingreso directo como `root`;
- PostgreSQL escuchando solo en `localhost`;
- `fail2ban` o equivalente para SSH;
- guardar la variable `MDDI_SECRETO` y las credenciales de la base fuera del código (archivo `.env` con permisos 600).

## 18. Firewall

Puertos abiertos hacia Internet:

| Puerto | Uso |
|---|---|
| 443/tcp | HTTPS |
| 80/tcp | Solo para redirigir a HTTPS y renovar el certificado |
| 22/tcp | SSH, idealmente restringido a las IP de la red del Ministerio o vía VPN |

El puerto de la aplicación (8080) y el de PostgreSQL (5432) **no se exponen**. Con `ufw` alcanza.

## 19. Control de accesos

- **A la aplicación:** 4 roles (Docente de contenidos, Especialista en Didáctica, Corrector/a y Coordinación General). Coordinación da de alta, desactiva y renueva códigos desde la propia plataforma. La autenticación está concentrada en un único punto del código, así que se puede pasar a usuario y contraseña, LDAP/Active Directory u OIDC (por ejemplo, cuentas institucionales) sin rehacer la plataforma.
- **Al servidor:** solo el personal técnico designado, con cuentas nominales y llaves SSH. Un usuario de sistema específico (`mddi`) sin privilegios ejecuta la aplicación.

## 20. Escalabilidad

La configuración propuesta atiende con holgura a 50-70 usuarios, y probablemente a varios cientos. Si el uso creciera mucho, estos son los pasos en orden:

1. subir la VM a 4 vCPU y 8-16 GB de RAM (cambio de plan, sin tocar el código);
2. mover PostgreSQL a un servidor o servicio propio;
3. agregar una segunda instancia de aplicación detrás de Nginx.

Para el paso 3 hay que trasladar a Redis el registro de "quién está editando", que hoy se guarda en memoria. Guardado, conflictos y sesiones ya funcionan con varias instancias porque viven en la base.

## 21. Monitoreo

- **Chequeo de salud:** `GET https://<dominio>/api/salud` responde `{"ok":true}` si la aplicación y la base funcionan. Conviene monitorearlo cada 1-5 minutos con la herramienta que ya use el Ministerio (Zabbix, Nagios, Uptime Kuma o UptimeRobot), con alerta por correo.
- **Recursos del servidor:** CPU, RAM, espacio en disco (alerta al 80 %) y estado del certificado (alerta 15 días antes del vencimiento).
- **Copias:** verificar que la copia diaria se generó (el script deja su registro en un log).

## 22. Logs

- **Aplicación:** los logs van a `journald`, con errores detallados (fecha, ruta, error). Se consultan con `journalctl -u mddi`.
- **Nginx:** access log y error log, con rotación semanal (`logrotate`).
- **Auditoría funcional:** vive dentro de la base (bitácora de ingresos y acciones, más el registro de cada guardado con usuario, fecha y versión) y se consulta desde la plataforma.

Retención sugerida de logs técnicos: 90 días.

## 23. Ancho de banda

Bajo. La interfaz pesa unos 130 KB comprimida y se descarga una sola vez: después queda en caché. Cada guardado automático envía pocos KB. La primera carga de un módulo completo son entre 100 y 200 KB. Estimación para 70 usuarios: menos de 5 GB mensuales. Cualquier enlace de 10 Mbps simétricos o más es suficiente.

## 24. Disponibilidad esperada

**99,5 % mensual** en horario laboral, lo que equivale a unas 3,5 horas de interrupción al mes como máximo. Alcanza para una herramienta interna de producción de contenidos: si el servidor se cae, los docentes pueden seguir trabajando sin conexión y los cambios se sincronizan cuando vuelve.

## 25. Mantenimiento

- **Mensual:** revisar actualizaciones de seguridad (15 minutos) y probar una restauración de la copia en un entorno de prueba.
- **Trimestral:** revisar el espacio en disco y los usuarios activos.
- **Anual:** evaluar la actualización de la versión de Node.js o PostgreSQL.

Ventana de mantenimiento sugerida: fuera del horario escolar (fines de semana o después de las 20:00), avisando a los usuarios con anticipación.

## 26. Actualizaciones

- **Sistema operativo:** actualizaciones de seguridad automáticas (`unattended-upgrades`); reinicios programados en la ventana de mantenimiento.
- **Aplicación:** hacer una copia de seguridad, reemplazar el código, correr `npm ci` y reiniciar el servicio. Las migraciones de la base se aplican solas al iniciar. El procedimiento está detallado en `docs/DESPLIEGUE.md` y tarda menos de 5 minutos. Los usuarios no pierden trabajo durante el reinicio: lo que escriban queda en su navegador y se envía al volver el servicio.

## 27. Restauración de datos

- **Base completa:** `backend/scripts/restore.sh <archivo.dump>`. El script detiene la aplicación, restaura con `pg_restore` y la reinicia. El procedimiento está probado y documentado.
- **Un módulo puntual:** desde la plataforma, sin intervención técnica. Coordinación entra en "Control de cambios" y restaura cualquiera de las copias automáticas, o recupera el módulo desde la "Papelera".

## 28. Crecimiento estimado

Cada módulo ocupa entre 100 y 200 KB. Con el historial de cambios y las copias automáticas, el total por módulo llega a unos 2-5 MB por año de trabajo activo. Estimación:

| Escenario | Módulos | Tamaño de la base |
|---|---|---|
| Año 1 (6 grados × 10 a 15 módulos) | 60 a 90 | 0,5 a 1 GB |
| Año 3 | Unos 250 | 2 a 3 GB |
| Diez veces más usuarios | — | Menos de 10 GB |

El disco recomendado de 80 GB cubre varios años sin cambios. Si hiciera falta, se puede recortar el historial antiguo, conservando siempre las copias completas mensuales.

## Anexo — Archivos entregados para la instalación

| Archivo | Contenido |
|---|---|
| `deploy/nginx.conf` | Proxy inverso, HTTPS, HSTS y compresión |
| `deploy/mddi.service` | Servicio `systemd` de la aplicación |
| `deploy/docker-compose.yml` y `Dockerfile` | Alternativa en contenedores, si el Ministerio prefiere Docker |
| `.env.example` | Variables de configuración |
| `backend/scripts/backup.sh` y `restore.sh` | Copias y restauración |
| `docs/DESPLIEGUE.md` | Instalación paso a paso |
| `docs/ARQUITECTURA.md` | Funcionamiento interno: guardado, sincronización y conflictos |
