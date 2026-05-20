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

echo "[2/5] Running database migrations..."
php "$BACKEND_DIR/artisan" migrate --force

echo "[3/5] Caching config, routes, views..."
php "$BACKEND_DIR/artisan" config:cache
php "$BACKEND_DIR/artisan" route:cache
php "$BACKEND_DIR/artisan" view:cache

echo "[4/5] Building frontend..."
npm ci --prefix "$FRONTEND_DIR"
npm run build --prefix "$FRONTEND_DIR"

echo "[5/5] Restarting services..."
pm2 restart laravel-backend laravel-reverb digicur-queue-staging

echo ""
echo "✓ Staging deploy complete!"
