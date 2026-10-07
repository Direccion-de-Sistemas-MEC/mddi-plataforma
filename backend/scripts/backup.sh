#!/bin/bash
# Copia de seguridad diaria de la base MDDI con rotación diaria/semanal/mensual.
# Programar con cron (usuario postgres o mddi):   0 2 * * *  /opt/mddi/backend/scripts/backup.sh
# Variables opcionales: DB (mddi), DESTINO (/var/backups/mddi), REMOTO (destino rsync/rclone para copia fuera del servidor)
set -euo pipefail
DB="${DB:-mddi}"
DESTINO="${DESTINO:-/var/backups/mddi}"
FECHA=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DESTINO"/{diarias,semanales,mensuales}
ARCHIVO="$DESTINO/diarias/mddi_$FECHA.dump"
pg_dump --format=custom --compress=9 --no-owner "$DB" > "$ARCHIVO"
pg_restore --list "$ARCHIVO" > /dev/null   # verificación: el archivo es legible
[ "$(date +%u)" = "7" ] && cp "$ARCHIVO" "$DESTINO/semanales/"
[ "$(date +%d)" = "01" ] && cp "$ARCHIVO" "$DESTINO/mensuales/"
# Retención: 7 diarias, 4 semanales, 12 mensuales
ls -1t "$DESTINO"/diarias/*.dump   | tail -n +8  | xargs -r rm -f
ls -1t "$DESTINO"/semanales/*.dump 2>/dev/null | tail -n +5  | xargs -r rm -f
ls -1t "$DESTINO"/mensuales/*.dump 2>/dev/null | tail -n +13 | xargs -r rm -f
# Copia fuera del servidor (obligatoria en producción)
if [ -n "${REMOTO:-}" ]; then
  if command -v rclone >/dev/null && [[ "$REMOTO" == *:* ]] && [[ "$REMOTO" != *@* ]]; then rclone copy "$DESTINO" "$REMOTO"
  else rsync -a "$DESTINO/" "$REMOTO/"; fi
fi
echo "$(date -Is) backup OK: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))" >> "$DESTINO/backup.log"
