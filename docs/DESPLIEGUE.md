# Despliegue en el servidor del Ministerio (Ubuntu 24.04 LTS)

Tiempo estimado: 30 a 45 minutos. Todos los comandos se ejecutan como `root` o con `sudo`.

## 1. Paquetes

```bash
apt update && apt -y upgrade
apt -y install postgresql nginx certbot python3-certbot-nginx ufw fail2ban unattended-upgrades rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt -y install nodejs
```

## 2. Firewall

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## 3. Base de datos

```bash
CLAVE=$(openssl rand -base64 24)
sudo -u postgres psql -c "CREATE USER mddi WITH PASSWORD '$CLAVE';" -c "CREATE DATABASE mddi OWNER mddi;"
echo "Clave de la base: $CLAVE"   # guardarla para el paso 5
```
PostgreSQL escucha solo en `localhost` por defecto: no modificarlo.

## 4. Aplicación

```bash
useradd --system --home /opt/mddi --shell /usr/sbin/nologin mddi
mkdir -p /opt/mddi && cd /opt/mddi
# copiar el contenido del paquete (backend, frontend, shared, deploy)
cd /opt/mddi/frontend && npm ci && npm run build
cd /opt/mddi/backend && npm ci --omit=dev
chown -R mddi:mddi /opt/mddi
```

## 5. Configuración

```bash
mkdir -p /etc/mddi && cp /opt/mddi/.env.example /etc/mddi/mddi.env && chmod 600 /etc/mddi/mddi.env
nano /etc/mddi/mddi.env
```
Completar `DATABASE_URL` con la clave del paso 3, `MDDI_SECRETO` (con `openssl rand -base64 48`) y `MDDI_CODIGO_COORDINACION`. **Guardar `MDDI_SECRETO` en un lugar seguro:** si se pierde, hay que regenerar todos los códigos de acceso.

## 6. Servicio

```bash
cp /opt/mddi/deploy/mddi.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now mddi
journalctl -u mddi -n 20        # debe decir "MDDI API escuchando en :8080 (producción)"
```
Al primer inicio se crean las tablas, el usuario de Coordinación y los dos módulos importados.

## 7. Nginx y HTTPS

```bash
cp /opt/mddi/deploy/nginx.conf /etc/nginx/sites-available/mddi
sed -i 's/mddi.ejemplo.gob.ar/EL-DOMINIO-REAL/g' /etc/nginx/sites-available/mddi
ln -s /etc/nginx/sites-available/mddi /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
certbot certonly --webroot -w /var/www/html -d EL-DOMINIO-REAL   # (con el bloque 443 comentado la primera vez)
nginx -t && systemctl reload nginx
curl -s https://EL-DOMINIO-REAL/api/salud                        # {"ok":true,...}
```

## 8. Copias de seguridad

```bash
mkdir -p /var/backups/mddi && chown postgres /var/backups/mddi
crontab -u postgres -e
# 0 2 * * *  REMOTO=usuario@servidor-respaldo:/respaldos/mddi /opt/mddi/backend/scripts/backup.sh
```
Probar la restauración una vez al mes con `backend/scripts/restore.sh` en un entorno de prueba.

## 9. Primer ingreso

Ingresar con el código de Coordinación, ir a **Usuarios y accesos**, dar de alta al equipo y luego **reemplazar el código inicial de Coordinación** con "Nuevo código".

## Actualizar a una versión nueva

```bash
sudo -u postgres /opt/mddi/backend/scripts/backup.sh
# reemplazar el código en /opt/mddi (sin tocar /etc/mddi/mddi.env)
cd /opt/mddi/frontend && npm ci && npm run build && cd ../backend && npm ci --omit=dev
chown -R mddi:mddi /opt/mddi && systemctl restart mddi
```
Las migraciones de la base se aplican solas. Los usuarios no pierden trabajo durante el reinicio: queda en su navegador y se envía al volver el servicio.

## Alternativa con Docker

```bash
cp .env.example .env    # completar, agregando DB_PASSWORD=...
docker compose -f deploy/docker-compose.yml up -d --build
```
Publicar con Nginx + HTTPS igual que en el paso 7.
