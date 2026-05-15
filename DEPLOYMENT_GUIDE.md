# DIGICUR — Staging & Production Deployment Guide

> **System:** DIGICUR — Digital Customer Record System  
> **Bank:** RBT Bank Inc. (Rural Bank of Talisayan, Misamis Oriental)  
> **Stack:** Laravel 12 (PHP 8.2+) · React 19 (Vite) · MySQL 8 · Python 3.10+  
> **BSP Compliance:** Circular 951 & 982

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Directory Structure](#2-directory-structure)
3. [Environment Files](#3-environment-files)
4. [First-Time Setup — Backend](#4-first-time-setup--backend)
5. [First-Time Setup — Frontend](#5-first-time-setup--frontend)
6. [Python Fingerprint Engine Setup](#6-python-fingerprint-engine-setup)
7. [Nginx Configuration](#7-nginx-configuration)
8. [Process Management (PM2)](#8-process-management-pm2)
9. [Post-Deploy Verification](#9-post-deploy-verification)
10. [Re-Deploy (Update) Steps](#10-re-deploy-update-steps)
11. [System Settings After First Deploy](#11-system-settings-after-first-deploy)
12. [Staging vs Production Differences](#12-staging-vs-production-differences)
13. [Seed Accounts Reference](#13-seed-accounts-reference)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Server Requirements

| Component | Minimum | Notes |
|-----------|---------|-------|
| **OS** | Ubuntu 22.04 LTS | or any modern Linux distro |
| **PHP** | 8.2+ | Extensions listed below |
| **Composer** | 2.x | |
| **Node.js** | 18 LTS | or 20 LTS |
| **npm** | 9+ | bundled with Node |
| **MySQL** | 8.0+ | or MariaDB 10.6+ |
| **Python** | 3.10+ | for fingerprint/thumbmark engine |
| **Nginx** | 1.24+ | reverse proxy + static files |
| **PM2** | Latest | process manager for queue worker |
| **Git** | 2.x | for code pulls |

### Required PHP Extensions

```bash
sudo apt install php8.2 php8.2-fpm php8.2-mysql php8.2-mbstring \
  php8.2-xml php8.2-bcmath php8.2-curl php8.2-gd php8.2-zip \
  php8.2-intl php8.2-tokenizer php8.2-fileinfo
```

### Required Python Packages

```bash
pip3 install opencv-python-headless>=4.8.0 Pillow>=9.0.0 \
  numpy>=1.21.0 fingerprint-enhancer>=0.0.6 \
  scikit-image>=0.21.0 scipy>=1.11.0
```

---

## 2. Directory Structure

```
/var/www/
├── staging/
│   └── sigcard-system/
│       ├── backend/          # Laravel API
│       ├── frontend/         # React SPA (dist/ served by Nginx)
│       └── scripts/
└── production/
    └── sigcard-system/
        ├── backend/
        ├── frontend/
        └── scripts/
```

---

## 3. Environment Files

### 3a. Backend `.env` — Staging

```dotenv
APP_NAME="DIGICUR (Staging)"
APP_ENV=staging
APP_KEY=                          # fill after: php artisan key:generate
APP_DEBUG=false
APP_URL=https://staging.yourdomain.com
FRONTEND_URL=https://staging.yourdomain.com

# CORS — exact frontend origin, no trailing slash
CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com

# Sanctum — host only, NO scheme
SANCTUM_STATEFUL_DOMAINS=staging.yourdomain.com

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=digicur_staging
DB_USERNAME=digicur_staging_user
DB_PASSWORD=YOUR_STAGING_DB_PASSWORD

SESSION_DRIVER=database
SESSION_LIFETIME=60
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=staging.yourdomain.com
SESSION_SECURE_COOKIE=true

QUEUE_CONNECTION=database
CACHE_STORE=database
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_SCHEME=tls
MAIL_HOST=YOUR_SMTP_HOST
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_FROM_ADDRESS="noreply@staging.yourdomain.com"
MAIL_FROM_NAME="DIGICUR Staging"

THUMBMARK_PYTHON_BIN=python3
THUMBMARK_TIMEOUT=120
THUMBMARK_THRESHOLD=40
```

### 3b. Backend `.env` — Production

```dotenv
APP_NAME="DIGICUR"
APP_ENV=production
APP_KEY=                          # fill after: php artisan key:generate
APP_DEBUG=false
APP_URL=https://sigcard.rbtbank.com
FRONTEND_URL=https://sigcard.rbtbank.com

CORS_ALLOWED_ORIGINS=https://sigcard.rbtbank.com
SANCTUM_STATEFUL_DOMAINS=sigcard.rbtbank.com

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=14

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=digicur_production
DB_USERNAME=digicur_prod_user
DB_PASSWORD=YOUR_PRODUCTION_DB_PASSWORD

SESSION_DRIVER=database
SESSION_LIFETIME=30
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=sigcard.rbtbank.com
SESSION_SECURE_COOKIE=true

QUEUE_CONNECTION=database
CACHE_STORE=database
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_SCHEME=tls
MAIL_HOST=YOUR_SMTP_HOST
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_FROM_ADDRESS="noreply@rbtbank.com"
MAIL_FROM_NAME="DIGICUR — RBT Bank"

THUMBMARK_PYTHON_BIN=python3
THUMBMARK_TIMEOUT=120
THUMBMARK_THRESHOLD=40
```

### 3c. Frontend `.env` — Staging

```dotenv
VITE_API_BASE_URL=https://staging.yourdomain.com/api
VITE_NODE_ENV=staging
```

### 3d. Frontend `.env` — Production

```dotenv
VITE_API_BASE_URL=https://sigcard.rbtbank.com/api
VITE_NODE_ENV=production
```

---

## 4. First-Time Setup — Backend

```bash
cd /var/www/staging/sigcard-system/backend
# (swap 'staging' for 'production' on prod server)
```

### Step 1 — Install PHP dependencies

```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

### Step 2 — Create and populate .env

```bash
cp .env.staging .env    # staging
# cp .env.production .env  # production
# Fill in DB credentials and other values
```

### Step 3 — Generate application key

```bash
php artisan key:generate
```

> ⚠️ Never reuse the same APP_KEY across environments.

### Step 4 — Create MySQL database

```sql
CREATE DATABASE digicur_staging
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'digicur_staging_user'@'localhost'
  IDENTIFIED BY 'YOUR_PASSWORD';

GRANT ALL PRIVILEGES ON digicur_staging.*
  TO 'digicur_staging_user'@'localhost';

FLUSH PRIVILEGES;
```

### Step 5 — Run all migrations

```bash
php artisan migrate --force
```

This runs all **35 migrations** in order, creating:

| Table Group | Tables |
|-------------|--------|
| Core Laravel | `users`, `cache`, `jobs`, `sessions` |
| Sanctum | `personal_access_tokens` |
| BSP User fields | 2FA columns, lockout, session tracking on `users` |
| Spatie Permissions | `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` |
| Spatie Activity Log | `activity_log` |
| Branches | `branches` (with parent hierarchy) |
| Customers | `customers`, `customer_documents`, `customer_holders`, `customer_accounts`, `customer_status_logs` |
| 2FA Fix | `two_factor_secret` column changed to `TEXT` |

### Step 6 — Seed initial data

```bash
php artisan db:seed
```

Runs in order:
1. **BranchSeeder** — 11 RBT Bank branches
2. **BSPRolesAndPermissionsSeeder** — 6 roles, all permissions, 5 test users

> ⚠️ **Production:** Change all seed passwords immediately after seeding.

### Step 7 — Create storage symlink

```bash
php artisan storage:link
```

Required for uploaded customer documents (ID photos, signatures, fingerprints) to be served via URL.

### Step 8 — Set directory permissions

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Step 9 — Cache configuration

```bash
# Staging
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Production (add optimize)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

---

## 5. First-Time Setup — Frontend

```bash
cd /var/www/staging/sigcard-system/frontend
```

### Step 1 — Install dependencies

```bash
npm ci
```

### Step 2 — Place the environment file

```bash
# Copy the correct env file
cp .env.staging .env.local    # staging
# cp .env.production .env.local  # production
```

### Step 3 — Build the SPA

```bash
npm run build
```

Output goes to `frontend/dist/`. Nginx serves this directory. Build produces optimized chunks:

- `vendor-react` — React, React DOM, React Router DOM
- `vendor-ui` — Framer Motion, SweetAlert2
- `vendor-charts` — Chart.js, React-Chartjs-2
- `vendor-icons` — React Icons
- `vendor-http` — Axios
- App code — split by page/role

---

## 6. Python Fingerprint Engine Setup

The thumbmark search (`/api/search/thumbmark`) calls `backend/python/thumbmark_search.py` via subprocess.

### Step 1 — Verify Python version

```bash
python3 --version   # must be 3.10+
```

### Step 2 — Install Python dependencies

```bash
cd /var/www/staging/sigcard-system/backend/python
pip3 install -r requirements.txt
```

### Step 3 — Verify config in `.env`

```dotenv
THUMBMARK_PYTHON_BIN=python3
THUMBMARK_TIMEOUT=120
THUMBMARK_THRESHOLD=40
```

> **Threshold:** SourceAFIS recommends 40 as the standard fingerprint match score.  
> **Timeout:** Increase to 180+ if you have a large enrolled fingerprint gallery.

---

## 7. Nginx Configuration

### Single-domain setup (API + SPA on same domain)

```nginx
server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;

    # SSL
    ssl_certificate     /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # --- Backend API (Laravel) ---
    location /api/ {
        root /var/www/staging/sigcard-system/backend/public;
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /storage/ {
        alias /var/www/staging/sigcard-system/backend/storage/app/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~ \.php$ {
        root /var/www/staging/sigcard-system/backend/public;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # --- Frontend SPA ---
    location / {
        root /var/www/staging/sigcard-system/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|svg|ico|woff2?)$ {
        root /var/www/staging/sigcard-system/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. { deny all; }
}

server {
    listen 80;
    server_name staging.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

> For production, replace `staging.yourdomain.com` with `sigcard.rbtbank.com` and update paths to `/var/www/production/...`.

---

## 8. Process Management (PM2)

### Install PM2

```bash
npm install -g pm2
```

### Start queue worker

```bash
# Staging
pm2 start \
  "php /var/www/staging/sigcard-system/backend/artisan queue:work --tries=3 --timeout=90" \
  --name "digicur-queue-staging"

# Production
pm2 start \
  "php /var/www/production/sigcard-system/backend/artisan queue:work --tries=3 --timeout=90" \
  --name "digicur-queue-production"
```

### Save and enable on startup

```bash
pm2 save
pm2 startup    # follow the command it outputs
```

### Useful PM2 commands

```bash
pm2 list
pm2 logs digicur-queue-staging
pm2 restart digicur-queue-staging
```

---

## 9. Post-Deploy Verification Checklist

```bash
# 1. API health
curl https://staging.yourdomain.com/api/test
# Expected: {"message":"API is working!","laravel_version":"12.x",...}

# 2. All migrations ran
php artisan migrate:status | grep -v Ran   # should show nothing (all Ran)

# 3. Storage symlink
ls -la public/storage                      # must be a symlink

# 4. Queue worker running
pm2 list                                   # status = online

# 5. CORS headers
curl -H "Origin: https://staging.yourdomain.com" \
  -X OPTIONS https://staging.yourdomain.com/api/auth/login -v 2>&1 | grep Access-Control

# 6. Python engine
python3 backend/python/thumbmark_search.py --version 2>&1

# 7. Open browser → login page renders with DIGICUR branding
```

---

## 10. Re-Deploy (Update) Steps

```bash
# Use existing deploy scripts
bash scripts/deploy-staging.sh      # staging
bash scripts/deploy-production.sh   # production
```

### What the scripts do

| # | Command | Note |
|---|---------|------|
| 1 | `git pull origin staging/main` | Pull latest code |
| 2 | `composer install --no-dev --optimize-autoloader` | Update PHP deps |
| 3 | `php artisan migrate --force` | Run new migrations |
| 4 | `php artisan config:cache && route:cache && view:cache` | Rebuild caches |
| 4+ | `php artisan optimize` | Production only |
| 5 | `npm ci && npm run build` | Rebuild frontend |
| 6 | `pm2 restart ...` | Restart queue worker |

### After major changes — manual cache clear

```bash
php artisan cache:clear
php artisan config:clear && php artisan config:cache
php artisan route:clear && php artisan route:cache
php artisan view:clear && php artisan view:cache
composer dump-autoload --optimize
```

> ⚠️ `cache:clear` wipes **system settings** stored in the database cache table. Re-apply them in Admin → System Settings after clearing.

---

## 11. System Settings After First Deploy

Log in as admin and configure via **Admin → System Settings**:

| Setting | Staging | Production |
|---------|---------|------------|
| Session Timeout | 60 min | **30 min** |
| Token Expiration | 60 min | **30 min** |
| Concurrent Sessions | 3 | 3 |
| Password Expiry | Disabled | **Enable — 90 days** |
| Max Login Attempts | 5 | 5 |
| Account Lockout Duration | 30 min | 30 min |
| Require Two-Factor Auth | Disabled | **Enable** |
| Audit Log Retention | 365 days | 365 days |
| Notification Email | your@email.com | ops@rbtbank.com |
| System Timezone | Asia/Manila | Asia/Manila |
| Currency Code | PHP | PHP |

> Settings are cached for **30 days** in the `cache` table. They survive code deploys.

---

## 12. Staging vs Production Differences

| Area | Staging | Production |
|------|---------|------------|
| `APP_ENV` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `error` |
| `BCRYPT_ROUNDS` | `12` | `14` |
| `SESSION_LIFETIME` | `60` | `30` |
| `php artisan optimize` | ❌ | ✅ |
| 2FA requirement | Off | **Enable** |
| Password expiry | Off | **90 days** |
| Seed accounts | Keep for QA | Change passwords |
| Git branch | `staging` | `main` |
| DB name | `digicur_staging` | `digicur_production` |
| Error display | Logs only | Logs only |

---

## 13. Seed Accounts Reference

> **Staging/Development only. Change all passwords in Production immediately after seeding.**

| Role | Email | Username | Password | Portal |
|------|-------|----------|----------|--------|
| Admin | admin@sigcard.com | sysadmin | `Admin@Sigcard2025!` | `/admin` |
| Compliance | msantos@sigcard.com | msantos | `Admin@Sigcard2025!` | `/compliance` |
| Manager | jdelacruz@sigcard.com | jdelacruz | `Admin@Sigcard2025!` | `/manager/dashboard` |
| User | areyes@sigcard.com | areyes | `Admin@Sigcard2025!` | `/user` |
| Cashier | cmendoza@sigcard.com | cmendoza | `Admin@Sigcard2025!` | `/cashier` |

### Seeded Branches

| BRCode | BRAK | Name |
|--------|------|------|
| 00 | HO | Head Office |
| 01 | MO | Main Office |
| 02 | JB | Jasaan |
| 03 | SB | Salay |
| 04 | CDOB | CDO |
| 05 | MB | Maramag |
| 06 | GNG-BLU | Gingoog BLU |
| 07 | CMG-BLU | Camiguin BLU |
| 08 | BXU-BLU | Butuan BLU |
| 09 | KIBAWE-BLU | Kibawe BLU |
| 10 | Claveria-BLU | Claveria BLU |

---

## 14. Troubleshooting

### CORS error in browser

1. Verify `CORS_ALLOWED_ORIGINS` in `.env` exactly matches frontend origin (no trailing slash)
2. Verify `SANCTUM_STATEFUL_DOMAINS` has only the host, no `https://`
3. Run: `php artisan config:clear && php artisan config:cache`

### two_factor_secret truncation (SQLSTATE 22001)

Migration `2026_05_08_000001_change_two_factor_secret_to_text.php` must have run. Check:

```bash
php artisan migrate:status | grep two_factor_secret
```

If not run: `php artisan migrate --force`

### 2FA prompt shows even when system 2FA is disabled

`BSPAuthService.php` now gates the 2FA check on `system_setting_require_two_factor`. Clear the cache:

```bash
php artisan cache:clear
```

Then re-save the system settings in Admin → System Settings.

### Queue jobs stuck

```bash
pm2 logs digicur-queue-staging
pm2 restart digicur-queue-staging
php artisan queue:restart
```

### Storage files return 404

```bash
php artisan storage:link
ls -la public/storage   # must show symlink → ../storage/app/public
```

### Permission denied on file upload

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage
```

### Fingerprint search fails

```bash
# Verify python3 is available to www-data
sudo -u www-data python3 --version
# Install packages as www-data or system-wide
pip3 install -r backend/python/requirements.txt
```

### Class not found after deploy

```bash
composer dump-autoload --optimize
php artisan config:cache
```

---

*Generated: 2026-05-08 | DIGICUR v1.x | RBT Bank Inc.*
