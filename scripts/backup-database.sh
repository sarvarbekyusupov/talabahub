#!/bin/bash

# ==========================================
# Database Backup Script for TalabaHub
# ==========================================

# Load environment variables
set -a
source .env 2>/dev/null || true
set +a

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${DB_NAME:-talabahub}"
DB_USER="${DB_USER:-talabahub}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Database: $DB_NAME"
echo "Timestamp: $TIMESTAMP"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Perform backup
echo -e "${YELLOW}Creating backup...${NC}"
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_FILE"; then
    
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    
    # Compress backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup compressed${NC}"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    echo -e "${GREEN}Backup size: $SIZE${NC}"
    echo -e "${GREEN}Backup location: $BACKUP_FILE_GZ${NC}"
    
    # Remove old backups
    echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo -e "${GREEN}✓ Cleanup completed${NC}"
    
    # List recent backups
    echo -e "\n${GREEN}Recent backups:${NC}"
    ls -lh "$BACKUP_DIR" | tail -n 5
    
    echo -e "\n${GREEN}✓ Backup completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
