#!/bin/bash
set -e

PROJECT_DIR="/home/rbtwebsrvr/projects/sigcard-system"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "======================================"
echo " SIGCARD-SYSTEM — Production Deploy"
echo "======================================"

echo "[1/6] Pulling latest code from main..."
git -C "$PROJECT_DIR" pull origin main

echo "[2/6] Installing backend dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction --working-dir="$BACKEND_DIR"

echo "[3/6] Running database migrations..."
php "$BACKEND_DIR/artisan" migrate --force

echo "[4/6] Caching config, routes, views..."
php "$BACKEND_DIR/artisan" config:cache
php "$BACKEND_DIR/artisan" route:cache
php "$BACKEND_DIR/artisan" view:cache
php "$BACKEND_DIR/artisan" optimize

echo "[5/6] Building frontend..."
npm ci --prefix "$FRONTEND_DIR"
npm run build --prefix "$FRONTEND_DIR"

echo "[6/6] Restarting backend service..."
sudo -n systemctl restart sigcard-backend

echo ""
echo "✓ Production deploy complete!"
