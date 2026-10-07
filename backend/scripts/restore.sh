#!/bin/bash
# Restaura la base MDDI desde un archivo generado por backup.sh
# Uso (como root):  ./restore.sh /var/backups/mddi/diarias/mddi_2026-10-01_0200.dump
set -euo pipefail
ARCHIVO="${1:?Indicá el archivo .dump a restaurar}"
DB="${DB:-mddi}"
read -r -p "Se reemplazará TODA la base '$DB' por el contenido de $ARCHIVO. ¿Continuar? (escribí SI) " R
[ "$R" = "SI" ] || { echo "Cancelado."; exit 1; }
systemctl stop mddi || true
# Copia de seguridad del estado actual antes de restaurar (por si hay que volver atrás)
sudo -u postgres pg_dump --format=custom "$DB" > "/var/backups/mddi/antes_de_restaurar_$(date +%Y%m%d_%H%M).dump" || true
sudo -u postgres dropdb --if-exists "$DB"
sudo -u postgres createdb -O mddi "$DB"
sudo -u postgres pg_restore --no-owner --role=mddi -d "$DB" "$ARCHIVO"
systemctl start mddi
echo "Restauración completada. Verificar: curl -s https://<dominio>/api/salud"
