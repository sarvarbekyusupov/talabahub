#!/bin/bash

# ==========================================
# Database Restore Script for TalabaHub
# ==========================================

# Load environment variables
set -a
source .env 2>/dev/null || true
set +a

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="${DB_NAME:-talabahub}"
DB_USER="${DB_USER:-talabahub}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Confirm restore
echo -e "${YELLOW}WARNING: This will restore the database from backup${NC}"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Create temporary uncompressed file
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

echo -e "${YELLOW}Decompressing backup...${NC}"
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# Restore database
echo -e "${YELLOW}Restoring database...${NC}"
if PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    "$TEMP_FILE"; then
    
    echo -e "${GREEN}✓ Database restored successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Restore failed!${NC}"
    exit 1
fi
