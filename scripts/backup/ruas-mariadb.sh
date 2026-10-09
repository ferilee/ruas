#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/srv/apps/ruas
BACKUP_DIR=/srv/backups/ruas
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ruas-mariadb-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose -f "$APP_DIR/docker-compose.yml" exec -T mariadb \
  sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --all-databases --single-transaction --routines --events' \
  | gzip > "$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name 'ruas-mariadb-*.sql.gz' -mtime +14 -delete
echo "[backup] Created $BACKUP_FILE"
