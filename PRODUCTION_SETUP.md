# Production Server Setup Status
## DIGICUR — RBT Bank Inc.

> This file is intentionally committed to the repo.
> When GitHub Actions deploys to production and this file is present,
> it confirms the production server is fully configured and CI/CD-ready.

---

## Production Server Details

| Item | Value |
|------|-------|
| Server IP | 192.168.0.213 |
| SSH User | rbtwebsrvr |
| App Path | `/home/rbtwebsrvr/projects/sigcard-system` |
| Branch | `main` |
| Backend Port | `8002` (via systemd: `sigcard-backend.service`) |
| Frontend | Served by Nginx from `frontend/dist/` |
| Domain | `sigcard.rbtbank.com` |

---

## What Has Been Set Up (One-Time Configuration)

### ✅ SSH Key Access (Staging → Production)
- Key file on staging server: `~/.ssh/id_ed25519_production`
- Public key is in production `~/.ssh/authorized_keys`
- Host key pre-accepted in staging `~/.ssh/known_hosts`
- GitHub Secrets set: `PROD_SSH_HOST`, `PROD_SSH_USER`

### ✅ Passwordless Service Restart
- Sudoers rule: `/etc/sudoers.d/sigcard-deploy`
- Allows: `sudo -n systemctl restart sigcard-backend` without password
- Needed by: `scripts/deploy-production.sh` step 6

### ✅ GitHub Actions Runner (on Staging Server)
- Runner name: `dc1`
- Service: `actions.runner.misrbt-sigcard-system.dc1.service`
- Status: enabled, auto-starts on reboot
- Used by: all 3 workflows (CI, deploy-staging, deploy-production)

### ✅ Deploy Script
- File: `scripts/deploy-production.sh`
- What it does: git pull → composer install → migrate → cache → npm build → restart service

---

## How Production Deploys Work

1. Push or merge code to the `main` branch
2. GitHub Actions triggers `Deploy — Production` workflow
3. Staging runner SSHes into production as `rbtwebsrvr`
4. Runs `bash /home/rbtwebsrvr/projects/sigcard-system/scripts/deploy-production.sh`
5. Script pulls latest code, installs dependencies, rebuilds frontend, restarts backend
6. Done — live site updated at `sigcard.rbtbank.com`

---

## If You Need to Re-Run First-Time Setup

All one-time steps are documented in `CICD_GUIDE.md` — Section "Environment 3".

---

*Setup completed: May 19, 2026 | DIGICUR v1.x | RBT Bank Inc.*
