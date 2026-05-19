# SigCard System — What We've Accomplished

This file is a plain-English record of everything that has been improved, fixed, or added to the
RBT Bank Signature Card Management System. Updated automatically after each completed task.

---

## May 19, 2026

### Safer Status Change — Status Now Saved Only When Documents Are Uploaded

**What's new for staff:**
- When changing an account status (e.g., to Dormant or Closed), the status is **no longer saved the moment you click "Confirm Update"**
- Instead, the status only takes effect the moment you successfully upload the supporting documents — no document upload, no status change
- If you accidentally click the back button or try to leave the page before uploading, the system will warn you: "Leave without uploading? The status change will not be saved."
- Pressing the X button on the upload panel also shows a warning before cancelling the status change
- A yellow banner is shown on the upload screen to remind staff that the status change is still pending
- The "Proceed to Upload" button is disabled until at least one document type is selected
- A "Save without documents" option is still available at the bottom of the document selection screen, with a clear warning — for cases where no documents are needed

**Why it matters:**
This prevents orphaned status changes — situations where a staff member accidentally navigated away before uploading, leaving the account with an updated status but no supporting documents attached. BSP guidelines require documentation for every status change.

---

## May 18, 2026

### Production Permission Fix — Compliance Staff and Encoder Access Restored

**What's new for staff:**
- The 7 compliance staff (Nancy Balingkit, Monique Jumoc, Ivy Mabale, Kristine Vacalares, Thesil Bailo, Emielyn Badic, Rhea Dagoldol) can now log in and reach the correct Compliance dashboard. Previously they were stuck on the wrong screen after logging in.
- All compliance staff can now access audit logs, generate BSP compliance reports, view regulatory reports, and all other compliance functions — these were blocked before.
- All encoders (User role) now have the correct permission to create new customer records. The old permission list on their role was carrying over outdated entries from a previous system version.
- 25+ old unused permissions (e.g. "view-transactions", "approve-transfers", "generate-statements") that had no working screens were removed from the system — the permissions table is now clean and accurate.
- The old "compliance-audit" role (a leftover from an earlier version) has been retired. All staff who had it are now under the proper "compliance" role, which correctly controls what they can see and do.

**Why it matters:**
The compliance team could not properly access the system after the latest update was applied — this fix restores their full access. Encoder staff also had incorrect permissions carried over from an older version of the system, which could have caused issues with future permission checks. The production database is now in sync with the current version of the software.

---

### Quick Unlock for Locked Accounts in User Management

**What's new for staff:**
- The **User Management** screen now shows an amber **"Unlock Now"** button directly in the Status column whenever a user's account is locked — no need to open any extra screen or look for a hidden icon.
- Clicking **"Unlock Now"** immediately removes the lockout and resets the failed login counter. The user can log in again right away without waiting for the lockout timer to expire.
- The **Locked** stat card at the top of the page (the yellow card) is now clickable. Clicking it instantly filters the table to show **only locked accounts**, making it fast to find who is locked even if there are many users.
- **"Locked"** has been added to the Status filter dropdown as well, so it can be selected the normal way too.
- The locked user count in the stat card now only counts accounts that are still actively locked — expired locks are no longer counted.

**Why it matters:**
If a staff member urgently needs to log in (e.g., during a BSP examination or an emergency) and their account got locked from too many failed attempts, the branch manager or admin can now unlock it in seconds from the User Management screen without waiting for the timer.

---

### Fixed Account Lockout Duration — Now Defaults to 30 Seconds, Countdown Disappears Automatically

**What's new for staff:**
- The **Account Lockout Duration** setting in Admin Settings now works correctly. Previously, setting it to "30 seconds" would actually lock the account for 30 minutes because of how the unit was stored — this has been fixed.
- The default lockout duration is now **30 seconds** (instead of 30 minutes), making it easier to test and suitable for short test windows. Administrators can still change it to any number of seconds or minutes.
- When a user gets locked out or hits too many login attempts, the login screen now shows a **live countdown** ("Please try again in 29 seconds… 28 seconds…") and the **red warning banner disappears automatically** once the countdown reaches zero — no need to refresh or close it manually.
- The Settings page still shows the sec/min toggle for convenience. The system now stores the duration in seconds internally, so there is no longer any ambiguity between the number and its unit.

**Why it matters:**
Staff can now accurately test the lockout policy without waiting 30 minutes by mistake. The countdown on the login screen gives a clear, real-time signal of when the account will unlock — no guessing, no manual refresh.

---

## May 15, 2026

### All Document and Photo Uploads Now Processed Exclusively by the Server

**What's new for staff:**
- All uploaded images — signature cards, NAIS, Data Privacy, other documents, and customer photos — are now fully processed by the server using the Image Intervention library. Previously, the browser was also doing its own image resizing before sending the file, which caused every image to be processed twice.
- Staff will no longer see a "Compressing…" spinner when selecting or uploading documents, since no resizing happens in the browser anymore. Images are sent as-is and the server handles everything.
- The result is more consistent image quality across all document types and upload screens (new customer upload, add account, edit documents, replace document, status document upload).

**Why it matters:**
Having one controlled processing step on the server ensures all stored documents have consistent size, format, and quality standards — regardless of what device or browser the staff member used to upload them. This also removes a potential source of image quality loss from double-compression.

---

## May 15, 2026

### Fixed "Uploaded By" Not Showing in Customer Profile

**What's new for staff:**
- The **Uploaded By** field in the customer profile page now correctly shows the name of the staff member who first uploaded the customer's signature card — even after documents have been updated or replaced.
- Previously, after uploading new documents following a status change (e.g., Dormant, Reactivated), the "Uploaded By" field would disappear and show a dash "—" instead of the encoder's name.
- The original uploader is now always visible on the customer profile, regardless of what other changes have been made to the account.

**Why it matters:**
Compliance officers and branch managers need to know who originally enrolled each customer into the system. This fix ensures that information is always visible and accurate on the customer profile screen.

---

## May 15, 2026

### Applied Finance & Banking Template Design to All Dashboards

**What's new for staff:**
- All dashboards — Admin, Compliance, Audit, Manager, Cashier, and User — now look like a professional finance and banking admin panel, matching the WowDash Finance & Banking template design.
- The top of every dashboard now shows **four large stat cards** with gradient color backgrounds (cyan, orange, purple, and green) and a colored circular icon, making key numbers easier to read at a glance.
- Charts are now powered by a more polished chart library (ApexCharts), giving a smoother and more professional appearance for bar charts and pie charts.
- The main content area is now split into a **main panel** (left, wider) and a **summary sidebar** (right) — the same layout as professional banking dashboards. Important charts and breakdowns appear on the left, while quick stats appear on the right.
- Customer Status breakdown now shows as a clean list with colored progress bars — easy to see what percentage of customers are Active, Dormant, Escheat, or Closed.
- The Account Types breakdown (Individual, Joint, Corporate) is shown as a pie chart.
- A **Bank Overview** card on the right side shows total customers, documents, today's uploads, and active branches all in one place.
- The recent customer uploads are now displayed in a clean table with colored status badges.
- All existing information — branch tables, drill-down branch details, risk levels, recent uploads — is fully retained and still clickable.

**Why it matters:**
The dashboard now looks like a proper banking management system that branch managers and compliance officers can confidently show to BSP examiners or bank directors. The design is cleaner, more organized, and highlights the most important numbers without clutter.

---

## May 15, 2026 (Earlier)

### Redesigned All Role Dashboards with WowDash Template Style

**What's new for staff:**
- All six role dashboards — Admin, Compliance, Audit, Manager, Cashier, and User — now have a cleaner, more modern look inspired by the WowDash admin template.
- Each statistics card now shows a **colored circle icon** alongside the number, making it much easier to quickly identify what each figure represents at a glance.
- Status breakdown cards (Active, Dormant, Escheat, Closed) now use light-colored backgrounds that match each status — green for active, amber for dormant, orange for escheat, red for closed.
- Cards have a softer, lighter appearance with subtle gradient backgrounds instead of the previous heavy dark-themed style.
- The header area for the Manager and Cashier dashboards is now a clean white card instead of a dark navy banner, matching the overall lighter feel of the redesign.
- All existing information — branch stats, monthly uploads, recent customer uploads, risk levels — is still fully present and clickable.

**Why it matters:**
The new design is easier on the eyes during long shifts and makes the most important numbers stand out more clearly. The color-coded cards help staff quickly spot which status has the most accounts without reading labels carefully.

---

## May 16, 2026

### Added Status Date Field When Changing Account Status

**What's new for staff:**
- When changing an account's status to **Dormant**, **Reactivated**, **Escheat**, or **Closed**, a new date field now appears on the status update screen. The field is labeled clearly — "Date of Dormancy," "Date of Reactivation," "Date of Escheat," or "Date of Closure" — depending on which status is selected.
- Before this, staff could only record that a status was changed but could not record the actual effective date of that change. Now the exact date is captured and saved with the record.
- For **Escheat** accounts with a date of **2021 or earlier**, the **Data Privacy** upload option is automatically hidden — both in the document selection screen and in the document upload area. Data Privacy consent forms were only introduced in 2022, so accounts that became escheat before that year would not have this document on file.
- The date entered is carried over to the document upload screen that follows, so the system always knows the correct year when deciding whether to show or hide the Data Privacy upload.

**Why it matters:**
BSP requires that dormancy and escheat events be recorded with accurate dates. This update makes it possible to capture the effective date of each status change directly in the system, not just the date the entry was made by staff. The auto-hiding of Data Privacy for old escheat accounts prevents staff from being asked to upload a document that did not exist at the time.

---

## May 15, 2026

### Added Full Support for Sole Proprietorship Business Accounts

**What's new for staff:**
- When opening a customer profile for a sole proprietorship account, a new "Proprietor" section
  now appears showing the business owner's full name and their risk level (Low / Medium / High).
  Before this, that section was missing entirely for single-owner businesses.
- The account details area now shows "Corporate Sub Type: Sole Proprietorship" so staff can
  immediately tell what kind of business account they are looking at — no guessing needed.
- When editing a sole proprietorship account's information, staff can now update BOTH the
  company name AND the owner's personal name (first, middle, last, suffix) in the same form.
  Previously only the company name could be changed for any business account.
- The risk level (Low Risk / Medium Risk / High Risk) can now be edited for sole proprietorship
  accounts. Before this fix, the risk level field was hidden for all business account types.
- When uploading new documents after a status change (for example, when an account becomes
  dormant or is reactivated), the system now correctly uses a simple front-and-back document
  upload for sole proprietorships — the same as a regular personal account. Previously it was
  using the more complex multi-signatory format meant for corporate accounts with multiple
  authorized signatories, which was incorrect for a single-owner business.
- The customer list screen now correctly shows the risk level and "Sole Proprietorship" label
  in the account card for these accounts.

**Why it matters:**
Sole proprietorship accounts are single-owner businesses — sari-sari stores, small traders,
individual entrepreneurs. They are different from a full corporate account (like a company with
a board of directors). The system now correctly separates these two types, making it easier for
branch staff to manage signature cards and stay compliant with BSP requirements.

---

## Earlier Work (Summary of Major Features Built)

### Full User Access Control (5 Roles)
The system has five different access levels: Admin, Manager, User (encoder), Cashier, and
Compliance-Audit. Each role sees only the screens and actions they are allowed to use.
BSP-compliant role separation is fully implemented.

### Signature Card Upload Wizard
Bank staff (User role) can upload signature cards through a step-by-step form. Supports:
- Regular individual accounts
- Joint accounts (ITF — In Trust For, and Non-ITF)
- Corporate accounts (standard multi-signatory and sole proprietorship)

### Account Status Tracking
Accounts can be marked as Active, Dormant, Reactivated, Escheat, or Closed.
Each status change is recorded with a date, and staff can upload new documents
(updated signature card, NAIS, data privacy consent) tied to the status change.
Full audit trail is maintained for BSP compliance.

### Customer Document Viewer
Staff can view all uploaded documents for a customer — signature card front and back,
NAIS, data privacy consent, and any other supporting documents. Documents can be
replaced or deleted with a full version history kept for audit purposes.

### Two-Factor Login Security (2FA)
Staff accounts can be protected with an authenticator app (like Google Authenticator).
When enabled, a one-time code is required at every login in addition to the password.

### Admin System Settings
The bank administrator can configure system-wide settings from a single screen:
session timeout duration, password expiry, maximum login attempts, and more.
All settings take effect immediately without restarting the system.

### Audit Logs
Every action in the system — who viewed what, who changed what, when — is recorded
and viewable by Compliance-Audit and Admin roles. Meets BSP audit trail requirements.
