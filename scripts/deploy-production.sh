#!/bin/bash
set -e

DEPLOY_DIR="/home/rbtwebsrvr/projects/sigcard-system"

# When running via GitHub Actions, use the checked-out workspace.
# When running manually on the server, use the production directory directly.
if [ -n "$GITHUB_WORKSPACE" ]; then
    SRC="$GITHUB_WORKSPACE"
else
    SRC="$DEPLOY_DIR"
fi

BACKEND_DIR="$SRC/backend"
FRONTEND_DIR="$SRC/frontend"

echo "======================================"
echo " SIGCARD-SYSTEM — Production Deploy"
echo "======================================"

echo "[1/6] Pulling latest code from main..."
if [ -n "$GITHUB_WORKSPACE" ]; then
    echo "  → Using GitHub Actions checkout (already up to date)"
    # Copy the production .env files into the workspace (not stored in git)
    /usr/bin/cp "$DEPLOY_DIR/backend/.env"  "$BACKEND_DIR/.env"
    /usr/bin/cp "$DEPLOY_DIR/frontend/.env" "$FRONTEND_DIR/.env"
else
    /usr/bin/git -C "$DEPLOY_DIR" pull origin main
fi

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

# Guard: ensure VITE_API_BASE_URL is set so the correct API URL is baked into
# the build. The .env copy above is the primary source; this is the failsafe.
if [ -z "$VITE_API_BASE_URL" ]; then
    VITE_API_BASE_URL=$(grep '^VITE_API_BASE_URL=' "$FRONTEND_DIR/.env" 2>/dev/null | cut -d= -f2-)
fi
if [ -z "$VITE_API_BASE_URL" ]; then
    echo "ERROR: VITE_API_BASE_URL is not set and could not be read from frontend/.env"
    echo "  The build would fall back to localhost:8000 — aborting to prevent a broken deploy."
    exit 1
fi
export VITE_API_BASE_URL
echo "  → Building with VITE_API_BASE_URL=$VITE_API_BASE_URL"
/usr/bin/npm run build --prefix "$FRONTEND_DIR"

if [ -n "$GITHUB_WORKSPACE" ]; then
    echo "[5b] Syncing built files to production directory..."
    /usr/bin/rsync -a --delete "$BACKEND_DIR/app/"        "$DEPLOY_DIR/backend/app/"
    /usr/bin/rsync -a --delete "$BACKEND_DIR/config/"     "$DEPLOY_DIR/backend/config/"
    /usr/bin/rsync -a --delete "$BACKEND_DIR/database/"   "$DEPLOY_DIR/backend/database/"
    /usr/bin/rsync -a --delete "$BACKEND_DIR/routes/"     "$DEPLOY_DIR/backend/routes/"
    /usr/bin/rsync -a --delete "$BACKEND_DIR/resources/"  "$DEPLOY_DIR/backend/resources/"
    /usr/bin/rsync -a --delete "$FRONTEND_DIR/dist/"      "$DEPLOY_DIR/frontend/dist/"
    /usr/bin/rsync -a --delete "$SRC/scripts/"            "$DEPLOY_DIR/scripts/"
fi

echo "[6/6] Restarting backend and queue services..."
sudo -n /usr/bin/systemctl restart sigcard-backend
sudo -n /usr/bin/systemctl restart sigcard-queue

echo ""
echo "✓ Production deploy complete!"
