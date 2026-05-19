# CI/CD Pipeline Guide
## DIGICUR — RBT Bank Inc.

> This guide explains the three-branch pipeline: how code moves from your PC to staging to production,
> what each server needs to have installed, and what happens automatically vs. what you do manually.

---

## Branch Overview

```
develop  ──►  staging  ──►  main
  (your PC)   (test VM)   (live bank VM)
```

| Branch | Where it runs | Who touches it | Deploys automatically? |
|--------|--------------|----------------|------------------------|
| `develop` | Your local PC | You (developer) | No — just runs CI checks |
| `staging` | Staging VM server | GitHub Actions | Yes — auto-deploys on every push |
| `main` | Production VM server | GitHub Actions | Yes — but requires your approval first |

---

## Environment 1 — Your PC (develop branch)

This is where you write code. Nothing needs to be installed beyond your normal development tools.

### What you need on your PC

| Tool | Version | Check with |
|------|---------|-----------|
| PHP | 8.2 or higher | `php --version` |
| Composer | 2.x | `composer --version` |
| Node.js | 18 LTS or 20 LTS | `node --version` |
| npm | 9+ | `npm --version` |
| MySQL | 8.0+ | `mysql --version` |
| Python | 3.10+ | `python3 --version` |
| Git | 2.x | `git --version` |

### One-time setup on your PC

```bash
# 1. Clone the repo (first time only)
git clone https://github.com/misrbt/sigcard-system.git
cd sigcard-system

# 2. Backend setup
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Edit .env — set your local MySQL credentials
php artisan migrate
php artisan db:seed

# 3. Frontend setup
cd ../frontend
npm install
cp .env.example .env.local
# .env.local should have: VITE_API_BASE_URL=http://localhost:8000/api
```

### Running the app locally

Open two terminals:

```bash
# Terminal 1 — Laravel API
cd backend
php artisan serve
# Runs at: http://localhost:8000

# Terminal 2 — React frontend
cd frontend
npm run dev
# Runs at: http://localhost:5173
```

### Daily development workflow

```bash
# Make sure you are on develop
git checkout develop
git pull origin develop        # always pull latest first

# ... write your code, fix your bug ...

git add backend/...            # stage only the files you changed
git commit -m "fix: brief description of what you fixed"
git push origin develop        # push to GitHub
```

After you push to `develop`:
- GitHub automatically runs **CI checks** (PHP tests + lint + build check)
- You can watch the results at: **github.com/misrbt/sigcard-system → Actions tab**
- Green checkmark = all good. Red X = something failed, check the logs.

---

## Environment 2 — Staging Server (staging branch)

This is the test server where you verify features before they go live.
The GitHub Actions **self-hosted runner** is installed here — it is the engine that runs all CI/CD jobs.

### What must be installed on the staging server

Everything in DEPLOYMENT_GUIDE.md (PHP, Composer, Node, MySQL, Python, Nginx, PM2) **plus** the GitHub Actions runner:

#### Install the GitHub Actions runner (one time only)

```bash
# On the staging server:
cd ~
mkdir actions-runner && cd actions-runner

curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.323.0/actions-runner-linux-x64-2.323.0.tar.gz

tar xzf ./actions-runner-linux-x64.tar.gz
```

Then go to **GitHub → sigcard-system repo → Settings → Actions → Runners → New self-hosted runner**.
Copy the `./config.sh` command GitHub shows you and run it. When asked:

```
Runner name:   staging-server     ← use this exactly
Runner labels: staging            ← IMPORTANT: must be "staging"
Work folder:   [press Enter]
```

Then register it as a system service so it survives reboots:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status   # must show: active (running)
```

#### Verify the runner is online

Go to **GitHub → Settings → Actions → Runners**.
You should see `staging-server` with a **green dot** that says **Idle**.

### How staging deploys work

When you push code to the `staging` branch, GitHub sends a signal to the runner on this server.
The runner executes `scripts/deploy-staging.sh` automatically. You do not need to do anything manually.

To move tested code from develop to staging:

```bash
git checkout staging
git merge develop              # bring in all your develop changes
git push origin staging        # this triggers the auto-deploy
```

Watch the deploy at: **GitHub → Actions → Deploy — Staging**

---

## Environment 3 — Production Server (main branch)

This is the live bank system. No GitHub Actions runner is installed here.
Instead, the staging server SSHes into production and runs the deploy script remotely.

### One-time setup on the staging server (SSH key for production)

Run these commands **on the staging server** once:

```bash
# Generate a dedicated deploy key (no passphrase — needed for automation)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_production -N "" -C "github-actions-deploy"

# Show the public key — you will copy this to the production server
cat ~/.ssh/id_ed25519_production.pub

# Pre-accept the production server's identity (avoids "trust this host?" prompts)
# Replace PRODUCTION_IP with your actual production server IP
ssh-keyscan -H PRODUCTION_IP >> ~/.ssh/known_hosts
```

### One-time setup on the production server

```bash
# On the PRODUCTION server — add the staging server's public key
# Paste the output of the cat command above into this file:
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Test the connection from the STAGING server:
ssh -i ~/.ssh/id_ed25519_production YOUR_USER@PRODUCTION_IP "echo SSH works"
```

### Add secrets to GitHub

Go to **GitHub → sigcard-system → Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | What to put |
|-------------|-------------|
| `PROD_SSH_HOST` | The IP address of your production VM (e.g. `192.168.1.50`) |
| `PROD_SSH_USER` | The Linux username used for deploys (e.g. `ubuntu`) |

The SSH private key stays on the staging server — it never goes to GitHub.

### Set up production approval gate (strongly recommended for a bank)

This adds a required manual approval before anything deploys to production.

1. Go to **GitHub → sigcard-system → Settings → Environments → New environment**
2. Name it exactly: `production`
3. Enable **Required reviewers** → add yourself (mis@rbtbank.com)
4. Click **Save protection rules**

After this, every push to `main` will **pause** at GitHub and wait for you to click **Approve** before the deploy runs.

### How production deploys work

```bash
# On your PC: after staging is tested and approved
git checkout main
git merge staging              # bring in all staged/tested changes
git push origin main           # triggers the production pipeline
```

1. GitHub sees the push to `main`
2. GitHub sends a notification to you: **"Deployment to production is waiting for your approval"**
3. You go to **GitHub → Actions → Deploy — Production → Review deployments → Approve**
4. The staging server SSHes into production and runs `scripts/deploy-production.sh`
5. Done — the live system is updated

You can also trigger production manually without a push:
**GitHub → Actions → Deploy — Production → Run workflow → Enter reason → Run**

---

## What the CI/CD pipeline does automatically

| Event | What GitHub does automatically |
|-------|-------------------------------|
| Push to `develop` | Runs PHP tests, ESLint, and Vite build check |
| Open a PR to any branch | Runs the same CI checks on the PR code |
| Push to `staging` | Deploys to the staging server |
| Push to `main` | Pauses, waits for your approval, then deploys to production |
| Any deploy script fails | GitHub marks the run as failed and sends you an email |

---

## Quick Reference — Daily Commands

### Working on a bug or feature

```bash
git checkout develop
git pull origin develop
# ... make changes ...
git add <files>
git commit -m "fix: what you fixed"
git push origin develop
```

### Moving to staging for testing

```bash
git checkout staging
git merge develop
git push origin staging
# Auto-deploys in ~2 minutes. Watch: GitHub → Actions
```

### Deploying to production (after staging is verified)

```bash
git checkout main
git merge staging
git push origin main
# Go to GitHub → Actions → Approve the deployment
```

---

## How to check if a deploy succeeded

1. Go to **github.com/misrbt/sigcard-system**
2. Click the **Actions** tab
3. Click the latest workflow run
4. Green checkmark = success. Red X = failed.
5. Click any failed step to read the error log.

If staging deploy failed, SSH into the staging server and check:
```bash
pm2 logs
php /var/www/staging/sigcard-system/backend/artisan queue:status
```

---

## Summary — What is installed where

| | Your PC | Staging VM | Production VM |
|---|---|---|---|
| PHP 8.2+ | ✅ | ✅ | ✅ |
| Composer | ✅ | ✅ | ✅ |
| Node 18+ / npm | ✅ | ✅ | ✅ |
| MySQL | ✅ (local dev DB) | ✅ (staging DB) | ✅ (live DB) |
| Python 3.10+ | ✅ | ✅ | ✅ |
| Nginx | ❌ | ✅ | ✅ |
| PM2 | ❌ | ✅ | ✅ |
| GitHub Actions runner | ❌ | ✅ **required** | ❌ |
| SSH key for production | ❌ | ✅ (`~/.ssh/id_ed25519_production`) | ❌ |

---

*Generated: May 19, 2026 | DIGICUR v1.x | RBT Bank Inc.*
