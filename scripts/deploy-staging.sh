#!/bin/bash
set -e

PROJECT_DIR="/var/www/staging/sigcard-system"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "======================================"
echo " SIGCARD-SYSTEM — Staging Deploy"
echo "======================================"

echo "[1/5] Installing backend dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction --working-dir="$BACKEND_DIR"

echo "[3/5] Running database migrations..."
php "$BACKEND_DIR/artisan" migrate --force

echo "[4/5] Caching config, routes, views..."
php "$BACKEND_DIR/artisan" config:cache
php "$BACKEND_DIR/artisan" route:cache
php "$BACKEND_DIR/artisan" view:cache

echo "[5/5] Building frontend..."
npm ci --prefix "$FRONTEND_DIR"
npm run build --prefix "$FRONTEND_DIR"

echo "[6/6] Restarting services..."
pm2 restart laravel-backend laravel-reverb

echo ""
echo "✓ Staging deploy complete!"
