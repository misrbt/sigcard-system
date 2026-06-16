#!/bin/bash
# Runs every minute via cron. Deploys automatically when staging branch has new commits.

PROJECT_DIR="/var/www/staging/sigcard-system"
LOG_FILE="/home/rbthosrvr/logs/sigcard-auto-deploy.log"

cd "$PROJECT_DIR" || exit 1

LOCAL=$(git rev-parse HEAD)
git fetch origin staging --quiet 2>/dev/null
REMOTE=$(git rev-parse origin/staging)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] New commits detected. Deploying..." >> "$LOG_FILE"
    git pull origin staging >> "$LOG_FILE" 2>&1
    bash "$PROJECT_DIR/scripts/deploy-staging.sh" >> "$LOG_FILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy complete." >> "$LOG_FILE"
fi
