#!/bin/bash

# Database backup script for TODO app
# This script creates automated backups of the PostgreSQL database
# Can be run via cron or GitHub Actions

set -e

# Configuration
BACKUP_DIR="/tmp/db-backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="todo_db_backup_${TIMESTAMP}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."

# Function to backup local development database
backup_local() {
  echo "Backing up local database..."
  
  # Use docker-compose to create backup
  docker-compose exec -T db pg_dump \
    -U postgres \
    -d app_db \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    > "${BACKUP_DIR}/${BACKUP_NAME}.sql"
  
  # Compress the backup
  gzip "${BACKUP_DIR}/${BACKUP_NAME}.sql"
  
  echo "✅ Local backup created: ${BACKUP_NAME}.sql.gz"
}

# Function to backup production database on Render
backup_render() {
  echo "Backing up Render production database..."
  
  # Check if DATABASE_URL is set
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set"
    exit 1
  fi
  
  # Create backup using pg_dump
  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    > "${BACKUP_DIR}/${BACKUP_NAME}.sql"
  
  # Compress the backup
  gzip "${BACKUP_DIR}/${BACKUP_NAME}.sql"
  
  echo "✅ Production backup created: ${BACKUP_NAME}.sql.gz"
}

# Function to upload backup to cloud storage
upload_backup() {
  local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
  
  # Upload to S3 (requires AWS CLI configured)
  if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp "$backup_file" "s3://${AWS_S3_BUCKET}/database-backups/${BACKUP_NAME}.sql.gz"
    echo "✅ Uploaded to S3"
  fi
  
  # Upload to Google Cloud Storage (requires gsutil configured)
  if command -v gsutil &> /dev/null && [ ! -z "$GCS_BUCKET" ]; then
    echo "Uploading to Google Cloud Storage..."
    gsutil cp "$backup_file" "gs://${GCS_BUCKET}/database-backups/${BACKUP_NAME}.sql.gz"
    echo "✅ Uploaded to GCS"
  fi
  
  # Upload to Backblaze B2 (requires b2 CLI configured)
  if command -v b2 &> /dev/null && [ ! -z "$B2_BUCKET" ]; then
    echo "Uploading to Backblaze B2..."
    b2 upload-file "$B2_BUCKET" "$backup_file" "database-backups/${BACKUP_NAME}.sql.gz"
    echo "✅ Uploaded to B2"
  fi
}

# Function to clean old backups
cleanup_old_backups() {
  echo "Cleaning up old backups..."
  
  # Remove local backups older than retention period
  find "$BACKUP_DIR" -name "todo_db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  # Clean S3 backups
  if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 ls "s3://${AWS_S3_BUCKET}/database-backups/" | \
    while read -r line; do
      createDate=$(echo $line | awk '{print $1" "$2}')
      createDate=$(date -d "$createDate" +%s)
      olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
      if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk '{print $4}')
        if [[ $fileName == todo_db_backup_* ]]; then
          aws s3 rm "s3://${AWS_S3_BUCKET}/database-backups/$fileName"
        fi
      fi
    done
  fi
  
  echo "✅ Old backups cleaned up"
}

# Function to verify backup
verify_backup() {
  local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
  
  # Check if backup file exists and has size > 0
  if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
    # Test if the file is a valid gzip
    if gzip -t "$backup_file" 2>/dev/null; then
      echo "✅ Backup verified successfully"
      return 0
    else
      echo "❌ Backup file is corrupted"
      return 1
    fi
  else
    echo "❌ Backup file not found or empty"
    return 1
  fi
}

# Function to send notification
send_notification() {
  local status=$1
  local message=$2
  
  # Send to Slack webhook if configured
  if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"Database Backup ${status}: ${message}\"}" \
      "$SLACK_WEBHOOK_URL"
  fi
  
  # Send email if configured (requires mail command)
  if [ ! -z "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
    echo "$message" | mail -s "Database Backup ${status}" "$NOTIFICATION_EMAIL"
  fi
}

# Main execution
main() {
  # Determine environment
  if [ "$1" == "production" ] || [ ! -z "$DATABASE_URL" ]; then
    backup_render
  else
    backup_local
  fi
  
  # Verify the backup
  if verify_backup; then
    # Upload to cloud storage
    upload_backup
    
    # Clean old backups
    cleanup_old_backups
    
    # Send success notification
    send_notification "SUCCESS" "Database backup completed successfully: ${BACKUP_NAME}.sql.gz"
    
    echo "🎉 Backup process completed successfully!"
    exit 0
  else
    # Send failure notification
    send_notification "FAILED" "Database backup failed for ${BACKUP_NAME}"
    
    echo "❌ Backup process failed!"
    exit 1
  fi
}

# Run main function with all arguments
main "$@"