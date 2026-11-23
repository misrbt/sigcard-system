# DIGICUR — System Review: Known Limitations & Recommendations

**Prepared:** November 18, 2026, while writing the DIGICUR System Manual
**Status:** Open — work these on the `develop` branch and release through develop → staging → main (CLAUDE.md RULE 5).
**Production steps:** anything that needs work on the server (moving files, Nginx changes, one-time commands) must also be added to `PRODUCTION_RELEASE_CHECKLIST.md` (RULE 6).

Each item lists what was found, where it is in the code, why it matters, and a suggested fix.
Priorities: **P1** = fix before the next audit/BSP review · **P2** = next release cycle · **P3** = housekeeping.

| # | Priority | Finding | Area |
|---|---|---|---|
| 1 | P1 | Document images can be opened without signing in | Backend storage + Nginx + frontend |
| 2 | P1 | No backup built in (confirm server backups exist) | Operations |
| 3 | P2 | Audit Log Retention setting says logs "may be purged" but nothing purges | Backend scheduler / Settings screen |
| 4 | P2 | Sign-in screen password hint says 6 characters, rule is 8 | Frontend `Login.jsx` |
| 5 | P2 | Staff cannot change their own password from My Profile | Frontend `Profile.jsx` + backend |
| 6 | P2 | Account type / joint sub-type cannot be corrected after upload | Backend `UpdateCustomerRequest` + Edit Info |
| 7 | P2 | "Password-only login" exemption is active in code but has no screen | Backend `BSPAuthService` / `User` |
| 8 | P3 | Permissions with no matching screens | Seeder `BSPRolesAndPermissionsSeeder` |
| 9 | P3 | Account numbers typed by hand, no core banking check | Future integration |
| 10 | P3 | Joint NAIS for account 2 and Person 2 share person_index 2 | Backend `CustomerController::storePairs` |

---

## 1. (P1) Document images can be opened without signing in

**What was found**
- All signature cards, NAIS, Data Privacy forms, other documents and customer photos are saved on Laravel's **public** disk:
  - `backend/app/Http/Controllers/Api/CustomerController.php` — `Storage::disk('public')` at lines ~520, 612, 838, 914–915, 1388, 1523, 1561–1562, 1605
  - `backend/app/Http/Controllers/Api/AdminController.php` — line ~1547
- Nginx serves that folder directly, with no sign-in check and a 30-day public cache (`DEPLOYMENT_GUIDE.md`, around line 405):
  ```nginx
  location /storage/ {
      alias /var/www/.../backend/storage/app/public/;
      expires 30d;
      add_header Cache-Control "public, immutable";
  }
  ```
- The screens build image addresses directly as `${base}/storage/${path}` (a `storageUrl` helper copied into 5 files):
  - `frontend/src/pages/admin/AuditLogs.jsx:20`
  - `frontend/src/pages/shared/BranchDocuments.jsx:21`
  - `frontend/src/pages/user/CustomerProfiles.jsx:90`
  - `frontend/src/pages/user/CustomerView.jsx:42`
  - `frontend/src/pages/user/EditCustomerDocs.jsx:27`
- Folder and file names come from branch, customer name and document type (`buildDirectory()` / `buildFilename()` in `CustomerController`), so addresses can be guessed.

**Why it matters**
Anyone on the network who knows or guesses a file address can open a customer's signature card without signing in. Branch limits, dormant blurring (which only happens on screen) and the audit log ("Record Viewed") are all skipped. The browser also caches images for 30 days on shared branch computers. This conflicts with BSP information security expectations and the Data Privacy Act.

**Suggested fix**
1. Add a `documents` disk (private, e.g. `storage/app/private/documents`) in `backend/config/filesystems.php`; save new uploads there.
2. Add a signed-in route, e.g. `GET /api/customers/{customer}/documents/{document}/file`, that:
   - checks the `view-customer-documents` permission and the user's **branch scope** (and `branch_data_shares.include_documents` for shared branches),
   - logs the view in the activity log,
   - returns the file with `Cache-Control: private, no-store`.
   Do the same for customer photos and archived versions (audit log Before/After images).
3. Replace the 5 copies of `storageUrl()` with one shared helper that loads images through the new route (as blobs, since the sign-in key is an httpOnly cookie sent with `withCredentials`).
4. One-time server command to **move existing files** from `storage/app/public/...` to the private disk and keep `file_path` values working (same relative path on the new disk).
5. Remove or deny the Nginx `/storage/` location for document folders (keep it only for the app logo, if needed).
6. Add a feature test: a signed-out request and a user from another branch both get 403/401.
7. Add steps 4–5 to `PRODUCTION_RELEASE_CHECKLIST.md`.

**Optional:** serve a blurred version from the server for Dormant accounts, so the blur cannot be removed by opening the image directly.

---

## 2. (P1) No backup built into DIGICUR

**What was found**
No backup or restore feature exists. The `backup-system` permission only guards the Data Management (branch lite assignment) screen. `routes/console.php` has no scheduled tasks.

**Why it matters**
If the server disk fails, every signature card and record could be lost unless server-level backups are running.

**Suggested fix**
- Confirm with the server administrator that daily **MySQL dumps** and **storage folder copies** are taken and stored off the server.
- If not, add them (cron or a package such as `spatie/laravel-backup`) and document a quarterly test restore to staging.
- Optionally show "Last backup: <date>" on the admin dashboard.

---

## 3. (P2) Audit Log Retention setting does nothing

**What was found**
System Settings → Audit Log Retention (`audit_log_retention_days`, read in `AdminController.php:~1462`) says logs older than the period "may be purged", but no scheduled task deletes them.

**Suggested fix**
Either schedule `activitylog:clean --days=<setting>` in `routes/console.php` (never below 365), or change the setting's description to say logs are kept indefinitely. Get Compliance's decision first.

---

## 4. (P2) Wrong password hint on the sign-in screen

**What was found**
`frontend/src/Login.jsx` lines 359 and 819:
```
Password must be at least 6 characters with uppercase, lowercase, number, and special character.
```
The real rule (`AuthController.php:554`, `UpdateUserRequest.php`) is `Password::min(8)->letters()->mixedCase()->numbers()->symbols()->uncompromised()`.

**Suggested fix**
Change both lines to "at least 8 characters…" and mention that passwords found in data breaches are not accepted.

---

## 5. (P2) No self-service password change

**What was found**
`frontend/src/pages/user/Profile.jsx` shows account info and 2FA only. Staff can only change their password when forced at sign-in or after an admin reset.

**Suggested fix**
Add a "Change Password" box to My Profile (current password + new + confirm), reusing the existing change-password endpoint and rules, and log the change.

---

## 6. (P2) Account type and joint sub-type cannot be corrected

**What was found**
`backend/app/Http/Requests/UpdateCustomerRequest.php` does not accept `account_type` or `joint_sub_type`. A wrong choice means re-uploading or a database fix (see `JOINT_ACCOUNT_GUIDE.md` 2.5).

**Suggested fix**
Admin-only correction in Edit Info, with checks that holders and documents still fit the new type, and an audit entry "changed from … to …". Update `JOINT_ACCOUNT_GUIDE.md` afterwards.

---

## 7. (P2) "Password-only login" works but has no screen

**What was found**
- Column added by `2026_10_14_000002_add_password_only_login_to_users_table.php`
- Honoured in `backend/app/Services/BSPAuthService.php:151` (skips 2FA and recovery code)
- No admin screen sets it, so it can only be turned on in the database.

**Why it matters**
A hidden way to skip 2FA that can only be changed in the database cannot be controlled from the admin screens, and auditors may question it.

**Suggested fix**
Either remove it (migration + code), or add an admin toggle in User Management with a confirmation, reason field and audit log entry, and show "Password only" in the Security column.

---

## 8. (P3) Permissions with no matching screens

**What was found**
`backend/database/seeders/BSPRolesAndPermissionsSeeder.php` gives managers `view-users`, `edit-users`, `reset-user-passwords`, `unlock-user-accounts`, `approve-risk-assessments`, but managers have no user or risk screens. Compliance has `view-users`, `view-login-attempts`, `view-system-logs` without screens.

**Suggested fix**
Remove unused permissions, or build the screens (for example, managers unlocking their own branch's staff), so the Role Matrix matches what users can actually do.

---

## 9. (P3) No core banking link

**What was found**
Account numbers are typed by hand. There is no check against the core banking system.

**Suggested fix (future)**
An account-number lookup or format check against core banking, if an interface becomes available.

---

## 10. (P3) Joint NAIS person_index overlap

**What was found**
For Non-ITF joint accounts with extra accounts, NAIS for account 2 is saved with `person_index = 2`, the same number as Person 2 (`JOINT_ACCOUNT_GUIDE.md` 2.5).

**Suggested fix**
Review when the joint-account screens are next changed; consider an `account_id` column on `customer_documents` instead of reusing `person_index`.

---

## When an item is done
- Update `ACCOMPLISHMENTS.md` in plain banking language (RULE 1).
- Add any server steps to `PRODUCTION_RELEASE_CHECKLIST.md` (RULE 6).
- Tick it off here and update the System Description tab of the manual.
