# DIGICUR — Upgrade Guide for Existing Staging & Production

> **Use this file when you already have DIGICUR running and need to apply all new changes.**  
> For a brand-new server setup, use `DEPLOYMENT_GUIDE.md` instead.

---

## Quick Reference — What Changed

| Area | Change |
|------|--------|
| Database | 10 new migrations — new tables, new columns, ENUM change |
| Roles & Permissions | Permissions restructured; 30+ old unused permissions removed |
| Models | New `CustomerStatusLog` model and table |
| 2FA | `two_factor_secret` column widened to TEXT (prevents truncation) |
| Frontend | New npm packages; all image uploads now server-processed only |
| Python | Thumbmark/fingerprint search feature (optional, graceful fallback) |

---

## STOP — Read Before Running Anything

### 1. Back up the database first

```bash
# Staging
mysqldump -u digicur_staging_user -p digicur_staging > ~/backup_staging_$(date +%Y%m%d_%H%M%S).sql

# Production
mysqldump -u digicur_prod_user -p digicur_production > ~/backup_production_$(date +%Y%m%d_%H%M%S).sql
```

### 2. The permission seeder RESETS all role permissions

Running `db:seed --class=BSPRolesAndPermissionsSeeder` uses `syncPermissions()`, which **overwrites** each role's permission set with the values defined in the seeder. Any permissions added manually via the Admin UI will be removed.

**This is intentional** — the seeder defines the correct permission set for this version of the system. Read [Section C](#c-update-roles-and-permissions) carefully before proceeding.

### 3. Existing customer data is safe

All new columns added in the migrations are nullable or have safe defaults:
- `is_current` defaults to `true` — all existing documents become "current" automatically. ✅
- `status_log_id` is nullable — existing documents have no status log entry. ✅
- `account_status`, `status_date`, `corporate_sub_type`, `status_updated_at` are all nullable. ✅
- `fingerprint_template` is nullable — existing sigcards have no enrolled template yet. ✅

---

## Step-by-Step Upgrade

### A. Pull the latest code

```bash
# Staging
cd /var/www/staging/sigcard-system
git pull origin staging

# Production
cd /var/www/production/sigcard-system
git pull origin main
```

---

### B. Run all pending migrations

This is the most critical step. Run it exactly once per environment.

```bash
cd /var/www/staging/sigcard-system/backend    # or production path

php artisan migrate --force
```

**What this runs (in order):**

| Migration | What it does |
|-----------|-------------|
| `2026_04_16` add_fingerprint_template | Adds `fingerprint_template` (LONGTEXT, nullable) to `customer_documents` |
| `2026_04_28` add_reactivated_enum | Adds `'reactivated'` to the `status` ENUM on `customers` |
| `2026_04_30` add_status_tracking_to_docs | Adds `account_status`, `is_current` (default true), and a performance index to `customer_documents` |
| `2026_05_05` add_status_updated_at | Adds `status_updated_at` (timestamp, nullable) to `customers` |
| `2026_05_05` create_customer_status_logs | Creates the new `customer_status_logs` table |
| `2026_05_05` add_status_log_id_to_docs | Adds `status_log_id` FK (nullable) to `customer_documents` |
| `2026_05_08` 2fa_secret_to_text | Widens `users.two_factor_secret` from VARCHAR(255) to TEXT |
| `2026_05_14` add_status_date_to_customers | Adds `status_date` (date, nullable) to `customers` |
| `2026_05_14` add_status_date_to_accounts | Adds `status_date` (date, nullable) to `customer_accounts` |
| `2026_05_14` add_corporate_sub_type | Adds `corporate_sub_type` (string, nullable) to `customers` |

**Verify all ran:**

```bash
php artisan migrate:status
# Every migration in the list must show "Ran"
# If any show "Pending", run: php artisan migrate --force
```

**Expected new table structure for `customer_documents`:**

| Column | Type | Notes |
|--------|------|-------|
| account_status | varchar(50) nullable | Which status period this doc belongs to |
| status_log_id | bigint nullable FK | Links to `customer_status_logs.id` |
| is_current | boolean default true | Whether this is the active version |
| fingerprint_template | longtext nullable | SourceAFIS fingerprint data |

**Expected new table `customer_status_logs`:**

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| customer_id | bigint FK | cascadeOnDelete |
| account_id | bigint FK nullable | nullOnDelete — for additional accounts |
| status | varchar | new status value |
| previous_status | varchar nullable | old status value |
| changed_by | bigint FK nullable | nullOnDelete — user who changed it |
| created_at / updated_at | timestamps | |

---

### C. Update Roles and Permissions

> ⚠️ This step **resets all role permissions** to the seeder's definition.  
> If you have custom permissions assigned to roles via the Admin UI, they will be removed.  
> Document any custom permissions before proceeding.

#### Run the seeder

```bash
php artisan db:seed --class=BSPRolesAndPermissionsSeeder
```

**What this does:**

1. **Deletes 30+ obsolete permissions** that no longer have backend routes:
   - All transaction permissions (`view-transactions`, `create-transactions`, etc.)
   - All account permissions (`view-accounts`, `create-accounts`, etc.)
   - Fund transfer and statement permissions
   - Customer verification permissions (`verify-customers`, `approve-customer-applications`)
   - `manage-security-policies`

2. **Creates/confirms active permissions** (using `firstOrCreate` — safe to re-run):
   - User management: `view-users`, `create-users`, `edit-users`, `delete-users`, `activate-users`, `deactivate-users`, `reset-user-passwords`, `unlock-user-accounts`
   - Roles: `view-roles`, `create-roles`, `edit-roles`, `delete-roles`, `assign-roles`, `view-permissions`, `assign-permissions`
   - Customers: `view-customers`, `create-customers`, `edit-customers`, `view-customer-documents`
   - Compliance: `view-audit-logs`, `export-audit-logs`, `view-compliance-reports`, `generate-compliance-reports`, `view-risk-assessments`, `create-risk-assessments`, `approve-risk-assessments`, `export-reports`, `view-regulatory-reports`
   - System: `view-system-settings`, `edit-system-settings`, `view-system-logs`, `backup-system`, `restore-system`
   - Auth management: `force-password-reset`, `unlock-accounts`, `view-login-attempts`, `manage-sessions`, `enable-disable-2fa`
   - Branch: `view-branch-data`, `manage-branch-operations`, `view-branch-reports`

3. **Resets role permissions** via `syncPermissions()`:

| Role | Permissions |
|------|------------|
| `admin` | ALL permissions |
| `manager` | view/edit users, full customer CRUD, audit logs, compliance reports, risk assessments, branch data |
| `user` | view/create/edit customers + documents |
| `compliance` | audit logs, compliance/risk/regulatory reports, view users/customers, login attempts, branch data |
| `audit` | same as compliance |
| `cashier` | view customers + documents, view branch data |

4. **Does NOT change existing user accounts** — uses `firstOrCreate` by username/email, so all real staff accounts are untouched.

5. **Creates seed accounts only if they don't exist** (safe for production):
   - `admin@sigcard.com` / `sysadmin`
   - `msantos@sigcard.com` / `msantos` (compliance)
   - `jdelacruz@sigcard.com` / `jdelacruz` (manager)
   - `areyes@sigcard.com` / `areyes` (user)
   - `cmendoza@sigcard.com` / `cmendoza` (cashier)

> **Production:** If these seed accounts exist with real production passwords, they will NOT be changed. If they don't exist yet, they are created with `Admin@Sigcard2025!` — change immediately.

#### Clear permission cache after seeding

```bash
php artisan cache:clear
```

> This also clears system settings from the cache. Re-apply them in Admin → System Settings after this step.

---

### D. Also seed branches (if any new branches were added)

```bash
php artisan db:seed --class=BranchSeeder
```

This uses `firstOrCreate` — safe to run on existing data. It will only add branches that don't already exist.

---

### E. Install updated PHP dependencies

```bash
cd /var/www/staging/sigcard-system/backend    # or production path
composer install --no-dev --optimize-autoloader --no-interaction
```

---

### F. Build the updated frontend

```bash
cd /var/www/staging/sigcard-system/frontend   # or production path
npm ci
npm run build
```

> **Note:** Image uploads no longer do client-side compression. Files are sent directly to the server where Image Intervention handles resizing. No frontend config change needed — this is automatic.

---

### G. Rebuild all Laravel caches

```bash
cd /var/www/staging/sigcard-system/backend

# Clear old caches first
php artisan config:clear
php artisan route:clear
php artisan view:clear
composer dump-autoload --optimize

# Rebuild
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Production only — skip on staging
php artisan optimize
```

---

### H. Restart queue worker

```bash
# Staging
pm2 restart digicur-queue-staging

# Production
pm2 restart digicur-queue-production

# Or if using artisan queue:restart signal
php artisan queue:restart
```

---

### I. Set storage permissions (if uploads are failing)

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## Verification Checklist

Run these checks after the upgrade is complete.

```bash
# 1. All migrations ran
php artisan migrate:status | grep Pending
# Expected: no output (all are "Ran")

# 2. New table exists
php artisan tinker --no-interaction --execute="echo \DB::select('SHOW TABLES LIKE \'customer_status_logs\'')[0] ? 'OK' : 'MISSING';"

# 3. New columns exist on customer_documents
php artisan tinker --no-interaction --execute="echo implode(', ', array_column(\DB::select('SHOW COLUMNS FROM customer_documents'), 'Field'));"
# Must include: account_status, status_log_id, is_current, fingerprint_template

# 4. Roles have correct permissions
php artisan tinker --no-interaction --execute="echo app(\Spatie\Permission\Models\Role::class)->where('name','user')->first()->permissions->pluck('name')->join(', ');"
# Expected: view-customers, create-customers, edit-customers, view-customer-documents

# 5. 2FA secret column is TEXT type
php artisan tinker --no-interaction --execute="echo collect(\DB::select('SHOW COLUMNS FROM users WHERE Field = ?', ['two_factor_secret']))->first()?->Type ?? 'NOT FOUND';"
# Expected: text (not varchar)

# 6. API health check
curl https://your-domain.com/api/test
# Expected: {"message":"API is working!","laravel_version":"12.x"...}

# 7. Storage symlink
ls -la /var/www/staging/sigcard-system/backend/public/storage
# Expected: symlink → ../storage/app/public
```

---

## Re-Apply System Settings

> **Required after running `cache:clear`.**

Log in as admin → Admin → System Settings and re-save:

| Setting | Staging | Production |
|---------|---------|------------|
| Session Timeout | 60 min | **30 min** |
| Password Expiry | Disabled | **Enable — 90 days** |
| Max Login Attempts | 5 | 5 |
| Require 2FA | Disabled | **Enable** |

---

## Python Fingerprint Engine (Optional Feature)

The thumbmark/fingerprint search is a new optional feature. The app works normally without it — a failed Python call logs a warning but does not break any upload or customer workflow.

If you want to enable it:

```bash
# Verify Python 3.10+ is installed
python3 --version

# Install required packages
cd /var/www/staging/sigcard-system/backend/python
pip3 install -r requirements.txt

# Add to .env if not already present
THUMBMARK_PYTHON_BIN=python3
THUMBMARK_TIMEOUT=120
THUMBMARK_THRESHOLD=40
```

To enroll existing sigcard images into the fingerprint index:

```bash
php artisan thumbmarks:enroll --all
```

> This processes every `sigcard_front` image already in the database. It can be slow on a large dataset — run it during off-hours.

---

## Common Issues After Upgrade

### "Unknown column 'is_current' in 'where clause'" or similar column errors

Migration did not run. Run: `php artisan migrate --force`

### Status change modal does not save / 422 error

The `customer_status_logs` table is missing. Run: `php artisan migrate --force`

### "Uploaded By" shows "—" after uploading status documents

This was a known bug — already fixed in this release. After deploying, the value will populate correctly on new uploads.

### Role permissions look wrong in the Admin UI

Run the seeder: `php artisan db:seed --class=BSPRolesAndPermissionsSeeder`  
Then clear permission cache: `php artisan cache:clear`

### `two_factor_secret` truncation error (SQLSTATE 22001)

The `2026_05_08` migration widens the column to TEXT. Run: `php artisan migrate --force`

### Frontend shows old version (cached JS/CSS)

The Vite build adds content hashes to filenames. If users see an old version, tell them to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R). Nginx asset caching is content-hash based and expires correctly.

### Images not uploading after deploy

Check storage permissions: `chmod -R 775 storage && chown -R www-data:www-data storage`  
Check storage symlink: `php artisan storage:link`

---

## Summary — Commands in Order

Copy and run these in sequence on each environment:

```bash
# 0. Back up the database
mysqldump -u DB_USER -p DB_NAME > ~/backup_$(date +%Y%m%d_%H%M%S).sql

# 1. Pull code
git pull origin staging    # or: git pull origin main (production)

# 2. PHP dependencies
composer install --no-dev --optimize-autoloader --no-interaction

# 3. Run all pending migrations
php artisan migrate --force

# 4. Sync roles and permissions
php artisan db:seed --class=BSPRolesAndPermissionsSeeder

# 5. Seed branches (safe to run)
php artisan db:seed --class=BranchSeeder

# 6. Clear and rebuild caches
php artisan config:clear && php artisan route:clear && php artisan view:clear
composer dump-autoload --optimize
php artisan config:cache && php artisan route:cache && php artisan view:cache
# Production only:
php artisan optimize

# 7. Build frontend
cd ../frontend
npm ci && npm run build
cd ../backend

# 8. Fix storage permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# 9. Restart queue worker
pm2 restart digicur-queue-staging    # or: digicur-queue-production

# 10. Verify
php artisan migrate:status | grep Pending   # must return nothing
curl https://your-domain.com/api/test        # must return JSON
```

After the above, log in as admin and re-apply system settings.

---

*DIGICUR v1.x — RBT Bank Inc. — Updated May 2026*
