# Production Release Checklist

**Read this before and after merging `staging` → `main`.**

The GitHub "Deploy — Production" job runs automatically on every push to `main`. It:
- installs backend packages
- runs `php artisan migrate --force` (database changes)
- rebuilds the screens and copies them in
- restarts `sigcard-backend` and `sigcard-queue`

It does **NOT** change server settings (PHP limits, Nginx). Those are listed below as **manual steps** and must be done once, by hand, on the production server.

Each release adds a section at the top. Tick items off as they are done on production, and note the date.

---

## Release: November 16, 2026 (commits 29678c8 → 159a27c)

### What this release contains
| Change | Commit |
|---|---|
| New joint type **"For the Account Of"** (Account Name, Organization, Primary/Secondary holders, All Must Sign / Any May Sign) | 29678c8, 1ee80c4 |
| "This client already exists" only for the **same account type** with the same first, middle and last name | 29678c8 |
| Regular joint: **one Risk Profiling per account holder** | e20a009 |
| Upload boxes refuse photos over 10 MB / HEIC; joint Data Privacy and NAIS accept either side | 4d006bb |
| Page reloads itself once if a screen file is missing after an update | 159a27c |
| For the Account Of: Account Name and Organization keep capital letters exactly as typed | see git log |
| For the Account Of: "Add Another Signature Card" (any number) for 3+ holders; extra cards (also Regular Joint's second card) now filed under Person 1 so they show on the profile | see git log |

### Before merging to `main`
- [ ] **Check the deploy target folder exists on production.** `deploy-production.yml` copies to `DEPLOY_DIR: /home/rbtwebsrvr/projects/sigcard-system`. On the staging server that folder does not exist, and the staging deploy fails because of it. On production, run:
      `ls /home/rbtwebsrvr/projects/sigcard-system/frontend/dist`
      If it doesn't exist, fix `DEPLOY_DIR` in `.github/workflows/deploy-production.yml` (on `develop`) to the real production folder before merging.
- [ ] **Check which machine runs the production job.** It uses `runs-on: self-hosted`. The only runner seen so far, `misrbt-sigcard-system.dc1`, is on the staging server. If production has no runner of its own, the job will try to deploy on the staging machine and fail.
- [ ] **Back up the production database.** This release adds columns.

### Automatic (done by the deploy job, just verify)
- [ ] Migration `2026_11_16_024949_add_joint_arrangement_and_holder_role`: adds `customers.joint_arrangement` and `customer_holders.role`.
- [ ] Migration `2026_11_16_090000_add_organization_to_customers_table`: adds `customers.organization`.
      Verify with `php artisan migrate:status | grep 2026_11_16`. Both should say **Ran**.
- [ ] The screens are rebuilt. No `.env` changes are needed for this release.

### MANUAL steps on the production server (needs sudo)
1. [ ] **PHP upload limit (fixes "naisPairs.0.front failed to upload" / HTTP 422).**
   If the backend runs `php artisan serve`, PHP uses the command-line limits: 2 MB per file and 8 MB per save. Any normal phone photo then fails. Check:
   ```bash
   systemctl cat sigcard-backend.service      # look at ExecStart
   ```
   If `ExecStart` is `php artisan serve ...`, create `/etc/systemd/system/sigcard-backend.service.d/upload-limits.conf`. Replace PATH and PORT with production's (copy PORT from the existing ExecStart):
   ```ini
   [Service]
   WorkingDirectory=/PATH/sigcard-system/backend/public
   ExecStart=
   ExecStart=/usr/bin/php -d upload_max_filesize=50M -d post_max_size=60M -d max_file_uploads=100 -S 0.0.0.0:PORT /PATH/sigcard-system/backend/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
   ```
   ```bash
   sudo systemctl daemon-reload && sudo systemctl restart sigcard-backend
   ps -eo args | grep -- "-S 0.0.0.0:PORT"   # must show the -d upload limits
   ```
   If production runs PHP-FPM instead, check `upload_max_filesize` (≥ 10M) and `post_max_size` (≥ 60M) in `/etc/php/8.3/fpm/php.ini`. Also check that Nginx `client_max_body_size` is ≥ 60M.

2. [ ] **Nginx: never cache the main page.** Old browser tabs otherwise ask for screen files that no longer exist after a deploy, giving 404 and "Failed to fetch dynamically imported module". In the production site file under `/etc/nginx/sites-available/`, add this inside the `server { listen 443 ... }` block, above `location / {`:
   ```nginx
   location = /index.html {
       expires -1;
   }
   ```
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   curl -skI https://sigcard.rbtbank.com/ | grep -i cache-control   # expect: no-cache
   ```

### After deploy: check in the browser (Ctrl+Shift+R first)
- [ ] Upload → Joint shows 3 choices: Regular Joint, ITF, **For the Account Of**.
- [ ] For the Account Of → name screen asks for Account Name, Organization, Primary, Secondary, plus "Add Another Account Holder".
- [ ] Regular Joint with 3 people → Signature Card step shows 3 Risk Profiling boxes with names.
- [ ] Uploading a normal phone photo (3–8 MB) saves without "failed to upload".
- [ ] Customer profile of a For the Account Of account shows Account Name and Organization.

### Known follow-ups (not in this release)
- Regular Joint second signature cards saved BEFORE this release are filed under a person number that may not exist, so they may not show on the profile. Check with:
  `SELECT customer_id, person_index FROM customer_documents WHERE document_type='sigcard_front' AND person_index > 1;`
