#!/bin/bash
set -e

PROJECT_DIR="/home/rbtwebsrvr/projects/sigcard-system"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "======================================"
echo " SIGCARD-SYSTEM — Staging Deploy"
echo "======================================"

echo "[1/6] Pulling latest code from staging..."
/usr/bin/git -C "$PROJECT_DIR" pull origin staging

echo "[2/6] Installing backend dependencies..."
/usr/local/bin/composer install --no-dev --optimize-autoloader --no-interaction --working-dir="$BACKEND_DIR"

echo "[3/6] Running database migrations..."
/usr/bin/php "$BACKEND_DIR/artisan" migrate --force

echo "[4/6] Caching config, routes, views..."
/usr/bin/php "$BACKEND_DIR/artisan" config:cache
/usr/bin/php "$BACKEND_DIR/artisan" route:cache
/usr/bin/php "$BACKEND_DIR/artisan" view:cache
/usr/bin/php "$BACKEND_DIR/artisan" optimize

echo "[5/6] Building frontend..."
/usr/bin/npm ci --prefix "$FRONTEND_DIR"
/usr/bin/npm run build --prefix "$FRONTEND_DIR"

echo "[6/6] Restarting backend service..."
sudo -n /usr/bin/systemctl restart sigcard-backend

echo ""
echo "✓ Staging deploy complete!"
