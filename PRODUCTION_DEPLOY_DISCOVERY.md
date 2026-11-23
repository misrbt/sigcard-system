# Production Deploy Discovery — read-only fact check

> **How to use:** open Claude Code on the **production server** (`rbtwebsrvr`) in
> `~/projects/sigcard-system` and say:
> *"Read PRODUCTION_DEPLOY_DISCOVERY.md and do what it says."*
> (Or paste this whole file as your prompt.)

---

## Instructions for Claude (on production)

You are on the **production** server of the RBT Bank SigCard system. CLAUDE.md RULE 5 applies:
**do not edit, create, delete, restart, commit, push or pull anything.** This task is
**read-only**. Only run the commands below (or other read-only commands needed to answer a
question), then write the report described at the end.

### Why we need this

The GitHub Actions job **"Deploy — Production"** (`.github/workflows/deploy-production.yml`)
has never worked:

- It says `runs-on: self-hosted`, so it gets picked up by the **staging** runner (`dc1`,
  on the staging VM) instead of the production runner (`sigcard-prod`, on this machine).
- It uses fixed paths such as `/usr/local/bin/composer` that don't exist on staging.
- It builds and caches inside the runner's temporary work folder instead of the live folder.

Already known from GitHub (no need to re-check):

- Runner `sigcard-prod` is online, labels `self-hosted, Linux, X64, production`.
- It runs on machine `rbtwebsrvr`, from `/home/rbtwebsrvr/actions-runner`.
- It has also been picking up **staging** jobs (e.g. "Staging — What's Ready for Production").
- The live folder is reached with `cd ~/projects/sigcard-system`, it is a **git clone**, and the
  backend runs as a systemd service the same way as on staging (`php -S` / `php artisan serve`).

The plan is to change the production deploy to: run only on the `production` runner →
`git pull --ff-only` in the live folder → `composer install` → `php artisan migrate --force` →
rebuild caches → build the screens → restart services. The facts below decide the exact
paths, users and permissions in that file.

### Step 1 — run these commands (all read-only)

```bash
cd ~/projects/sigcard-system || exit 1

echo "== 1. who/where";      whoami; hostname; pwd
echo "== 2. git";            git branch --show-current; git log -1 --oneline; git status -s | head -20
echo "== 3. git remote";     git remote -v | head -1 | sed 's#//[^@]*@#//***@#'
echo "== 4. fetch test";     timeout 20 git fetch --dry-run origin && echo "fetch OK (no password asked)" || echo "fetch FAILED or asked for password"
echo "== 5. behind main?";   git rev-list --left-right --count HEAD...origin/main 2>/dev/null
echo "== 6. env files";      ls -la backend/.env frontend/.env
echo "== 7. frontend env keys (names only)"; cut -d= -f1 frontend/.env 2>/dev/null
echo "== 8. owners";         stat -c '%U:%G %n' . backend backend/storage backend/bootstrap/cache frontend/dist
echo "== 9. tools";          for t in php composer npm node rsync git; do printf '%-9s %s\n' "$t" "$(command -v $t || echo MISSING)"; done
echo "== 10. versions";      php -v | head -1; node -v; npm -v; composer --version 2>/dev/null | head -1
echo "== 11. services";      systemctl list-units --type=service --all --no-pager | grep -iE 'sigcard|actions.runner'
echo "== 12. backend svc";   systemctl cat sigcard-backend 2>/dev/null | grep -E '^(User|Group|WorkingDirectory|ExecStart|Environment)'
echo "== 13. queue svc";     systemctl cat sigcard-queue 2>/dev/null | grep -E '^(User|WorkingDirectory|ExecStart)' || echo "no sigcard-queue service"
echo "== 14. runner svc";    systemctl cat 'actions.runner.*' 2>/dev/null | grep -E '^(User|ExecStart)'
echo "== 15. runner labels"; cat /home/rbtwebsrvr/actions-runner/.runner 2>/dev/null | tr -d '\r' | head -20
echo "== 16. sudo restart";  sudo -n /usr/bin/systemctl status sigcard-backend >/dev/null 2>&1 && echo "sudo OK without password" || echo "sudo NOT allowed without password"
echo "== 17. sudoers rules"; sudo -n -l 2>/dev/null | grep -i systemctl || echo "(no passwordless systemctl rules visible)"
echo "== 18. nginx sites";   ls /etc/nginx/sites-enabled/ 2>/dev/null
echo "== 19. nginx roots/proxy"; grep -rhE '^\s*(server_name|root|proxy_pass)' /etc/nginx/sites-enabled/ 2>/dev/null | sort -u
echo "== 20. storage link";  ls -la backend/public/storage 2>/dev/null || echo "no public/storage link"
echo "== 21. cron";          crontab -l 2>/dev/null | grep -v '^#' || echo "no crontab"
echo "== 22. disk";          df -h ~ | tail -1
```

Rules while doing this:
- **Never print the contents of any `.env` file** (only key names, as in step 7).
- Hide any token or password that appears in output (git URLs, service files).
- If a command fails, note the error. Don't try to fix it.

### Step 2 — write the report

Reply with this report, filled in, in a single fenced `markdown` block so the user can copy
it back to the staging session:

```markdown
## Production facts — <date>

| # | Question | Answer |
|---|---|---|
| 1 | Login user / hostname / live folder (full path) | |
| 2 | Branch, last commit, any local uncommitted changes? (list files) | |
| 3 | Git remote (masked) — HTTPS or SSH? | |
| 4 | Can it `git fetch` without a password? | |
| 5 | Commits behind origin/main | |
| 6 | backend/.env and frontend/.env exist? | |
| 7 | frontend/.env key names | |
| 8 | Owner of folder, storage, bootstrap/cache, frontend/dist | |
| 9 | Paths of php, composer, npm, node, rsync, git | |
| 10 | Versions of php, node, npm, composer | |
| 11 | sigcard / runner services found | |
| 12 | sigcard-backend: User, WorkingDirectory, ExecStart | |
| 13 | sigcard-queue exists? User/ExecStart | |
| 14 | Runner service user | |
| 15 | Runner name and labels | |
| 16 | Can restart services with `sudo -n` without a password? | |
| 17 | Passwordless systemctl sudo rules | |
| 18–19 | Nginx site(s), server_name, root (screens folder), proxy_pass (backend port) | |
| 20 | public/storage link present? | |
| 21 | Cron jobs | |
| 22 | Free disk space | |

### Concerns noticed
- (anything that would block an automatic deploy, e.g. local edits in the live folder,
  runner user different from folder owner, no passwordless restart, low disk)
```

Do not suggest or apply fixes on this server. The fixes will be made on `develop` and
shipped through `develop → staging → main`.
