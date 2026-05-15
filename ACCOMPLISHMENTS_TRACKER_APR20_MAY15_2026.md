# SigCard System — Work Accomplished
## Inclusive Dates: April 20, 2026 – May 15, 2026

This document tracks everything that was built, fixed, or improved in the RBT Bank Signature Card
Management System during this period. Written in plain English for all bank staff.

---

## SUMMARY — What Was Done This Period

In total, **14 major improvements** were delivered over 26 days:
- 5 brand-new screens or features added
- 4 existing screens significantly improved
- 3 problems fixed that were affecting daily operations
- 2 things improved behind the scenes (security and deployment)

---

## April 20–21, 2026

### 1. Added Thumbmark (Fingerprint) Search

**What staff can now do:**
- On the Customer Profiles screen, a fingerprint search button was added. Staff can use a
  customer's thumbmark to search for their record — especially helpful when a customer cannot
  remember their account number.
- The system attempts to match the thumbmark against enrolled fingerprint records.
- If a match is found, the customer's profile appears immediately.

**Why it matters:**
Some elderly customers or those without IDs can be identified faster using their thumbmark
instead of searching by name or account number. This feature supports BSP's goal of better
customer identification.

---

### 2. Fixed Behind-the-Scenes Connection Issues (April 21)

**What changed:**
- Some data was not loading correctly from the server when staff opened certain screens.
  This was quietly causing blank areas or missing information on a few pages.
- The connection between the screens and the server was corrected so all information
  now loads properly.

**Why it matters:**
Staff were sometimes seeing incomplete data without knowing it. This fix ensures all
information shown on screen is accurate and complete.

---

## April 22, 2026

### 3. Added Account Holder and Account Number for Joint Accounts

**What staff can now do:**
- When enrolling a **joint account** (an account shared by two or more people), the upload
  form now has fields to enter the **account holder's name** and the **account number**.
- These details are saved alongside the signature card and appear on the customer's profile.
- The button label was also updated from "Account Holder" to **"Add Account"** to be clearer
  for branch staff.

**Why it matters:**
Joint accounts have specific BSP requirements for identifying all account holders. Being able
to record the account holder name and account number directly in the system makes the record
more complete and easier to verify during audits.

---

### 4. Made Error Messages Easier to Understand (April 22)

**What changed:**
- When something goes wrong while saving or uploading — for example, a missing required field
  or a duplicate entry — the message shown to staff was previously written in computer language
  that most people could not understand.
- All error messages were rewritten in plain, friendly language that clearly explains what
  went wrong and what to do next.

**Why it matters:**
Staff can now understand and fix issues on their own without needing to call IT support for
every error message they encounter.

---

## April 28, 2026

### 5. Added "Reactivated" as an Official Account Status

**What staff can now do:**
- When a dormant account has been brought back to active use, staff can now mark it as
  **"Reactivated"** — its own separate status, not just switching it back to "Active."
- This new status is recognized throughout the system: on the customer list, profile screen,
  reports, and status history.

**Why it matters:**
BSP regulations require that reactivated dormant accounts be tracked separately from accounts
that were never dormant. Having a dedicated "Reactivated" status makes the bank's records
more accurate and easier to examine during BSP inspections.

---

### 6. Set Up Automated Deployment System (April 28)

**What changed:**
- An automated system was set up to push approved updates to the Staging server and the
  Production (live) server without manual copying of files.
- When code is approved and ready, the system automatically handles the entire update
  process.

**Why it matters:**
This reduces the risk of human error during system updates and ensures that future improvements
reach the live server faster and more reliably. It also creates a safe testing stage
(Staging) before anything goes to the live bank system.

---

## April 30, 2026

### 7. Fixed "Add Other Documents" Upload Not Working

**What was fixed:**
- On the Edit Customer Documents screen, the **"Add Other Documents"** upload was broken —
  selecting a file would not actually save it to the customer's record.
- This was corrected. Staff can now successfully upload and attach additional supporting
  documents to any customer profile.

**Why it matters:**
Some customers require supporting documents beyond the standard signature card and NAIS.
This fix restores the ability to attach those extras to the official record.

---

## May 1–15, 2026 (Multiple Improvements)

### 8. New Screen: Status Tracking Dashboard (User Role)

**What staff can now do:**
- A brand-new "Status Tracking" screen was added for branch encoders (User role).
- It shows a **visual overview** of all accounts broken down by status: Active, Dormant,
  Escheat, Closed, and Reactivated — displayed as a donut chart with counts and percentages.
- Staff can also filter the list by account type (Individual, Joint, Corporate) and by
  risk level (Low, Medium, High).
- Each account in the list shows its status badge, account type, and the date the status
  was last changed.

**Why it matters:**
Branch staff now have a quick at-a-glance view of the health of all accounts at their branch
— without needing to go through each record one by one. This screen is especially useful for
preparing for dormancy monitoring and BSP compliance reviews.

---

### 9. New Screen: Compliance Branch Detail View

**What compliance officers can now do:**
- From the Compliance Dashboard, clicking on any branch now opens a full **Branch Detail**
  screen with deep statistics for that specific branch.
- The detail screen shows: total accounts, breakdown by status, monthly trends (how many
  accounts opened, became dormant, were closed, or were reactivated each month), and a full
  searchable list of all customers in that branch.
- Customers can be filtered by status directly on this screen.
- Charts show six months of trend data in bar graph format.

**Why it matters:**
Compliance officers previously had to rely on summary numbers only. Now they can drill down
into any single branch and see a complete picture of account movements — branch by branch —
which is exactly the kind of detail BSP examiners ask for.

---

### 10. New Screen: Compliance Reports with Print-Ready Preview

**What compliance officers can now do:**
- A new **Reports** screen was added to the Compliance section.
- Officers can generate formal reports covering: account status summaries, branch
  comparisons, dormancy trends, and escheat tracking.
- After generating a report, a **Print Preview** screen shows the report exactly as it will
  appear on paper, ready to hand to BSP examiners or bank directors.
- Reports can be filtered by date range, branch, and account status.

**Why it matters:**
Generating BSP compliance reports used to require manually compiling data from different
screens. This new screen pulls everything together automatically and produces a clean,
professional printout — saving hours of work before every BSP examination.

---

### 11. Admin Can Now Troubleshoot Staff Login Problems

**What the admin can now do:**
- On the User Management screen, each staff account now has a **"Login Troubleshooter"** panel.
- The admin can open it to see: whether the account is locked and how many minutes remain
  before it unlocks, the last date and time the person successfully logged in, what device
  or browser they used, whether their password has expired, whether the account itself has
  expired, and their current account status (Active, Suspended, etc.).
- From this same panel, the admin can **unlock** the account, **reset the password**, or
  **clear active sessions** directly — without needing any separate tools.

**Why it matters:**
When a staff member is locked out or cannot log in, the branch manager or admin can now
diagnose and fix the problem immediately from one screen, instead of guessing what went wrong
or waiting for IT support.

---

### 12. System Settings Screen Redesigned and Expanded

**What the admin can now configure:**
- The System Settings screen was completely reorganized into three clear sections using tabs:
  **Session & Token** (how long staff stay logged in), **Authentication** (password rules,
  login attempts, two-factor requirements), and **System Configuration** (general settings).
- Each setting now shows a helpful description explaining what it does and why it matters
  for BSP compliance.
- Settings that are required by BSP are clearly marked.
- Color-coded status cards at the top of the screen show the current state of key settings
  at a glance — green for normal, amber for caution.

**Why it matters:**
The admin can now manage all security and access settings in one organized place, with clear
guidance on which settings are mandatory for BSP compliance. Less guesswork, fewer mistakes.

---

### 13. Full Support for Sole Proprietorship Business Accounts

**What staff can now do:**
- When viewing a sole proprietorship customer profile, the screen now shows a **"Proprietor"**
  section with the business owner's full name and their risk level.
- The account details clearly state "Sole Proprietorship" so staff can tell immediately what
  kind of business account it is.
- When editing a sole proprietorship account, staff can now update **both** the company name
  and the owner's personal name (first, middle, last, and suffix) in the same form.
- The risk level field is now editable for these accounts.
- When updating status documents for a sole proprietorship, the correct simple front-and-back
  upload is used (not the more complex multi-signatory format meant for companies with boards
  of directors).

**Why it matters:**
Sole proprietorships — small businesses, sari-sari stores, individual traders — are a
common account type at rural banks. The system now handles them correctly and separately from
full corporate accounts, keeping records accurate for BSP compliance.

---

### 14. Status Change Now Records the Exact Date of the Event

**What staff can now do:**
- When changing an account's status to Dormant, Reactivated, Escheat, or Closed, a
  **date field** now appears on the status update form.
- The label changes depending on the status selected:
  - "Date of Dormancy" for dormant accounts
  - "Date of Reactivation" for reactivated accounts
  - "Date of Escheat" for escheat accounts
  - "Date of Closure" for closed accounts
- This date is saved with the status change and is reflected throughout the system.
- For **Escheat** accounts with a date of **2021 or earlier**, the system automatically hides
  the Data Privacy upload option — because Data Privacy consent forms did not exist before 2022.

**Why it matters:**
BSP requires that the exact effective date of every dormancy or escheat event be recorded —
not just the date someone entered it into the system. This update ensures the bank captures
the correct date for every status change, and prevents staff from being asked to upload a
document that did not yet exist when the account went into escheat.

---

### 15. All Document and Photo Uploads Now Processed Exclusively by the Server

**What changed:**
- Previously, when staff uploaded any image (signature card, NAIS, Data Privacy, customer
  photo, other documents), the browser was quietly resizing and compressing the image before
  sending it — and then the server would resize it again. Every image was being processed
  twice.
- The browser-side step was removed. Images are now sent directly to the server, which
  handles all processing in one controlled step.
- Staff will notice that the "Compressing…" spinner no longer appears when selecting a file.

**Why it matters:**
Double processing was reducing image quality and could cause inconsistencies in how documents
were stored. Now all stored documents have a consistent size, format, and quality — regardless
of what device the staff member used to upload them.

---

### 16. Fixed "Uploaded By" Disappearing After Status Document Uploads

**What was fixed:**
- On the customer profile screen, the **"Uploaded By"** field shows who originally submitted
  the customer's signature card.
- After staff uploaded new documents following a status change (Dormant, Reactivated, etc.),
  this field was disappearing and showing a dash "—" instead of the original encoder's name.
- This was corrected. The original uploader's name now always stays visible, regardless of
  what documents have been updated afterward.

**Why it matters:**
Compliance officers and branch managers need to know who originally enrolled each customer
into the system. This fix ensures that information is always on record.

---

### 17. Professional Finance & Banking Dashboard Design Applied to All Screens

**What staff will see:**
- All six dashboards — Admin, Compliance, Audit, Manager, Cashier, and User — now have a
  polished, professional banking admin panel look.
- The top of every dashboard shows **four large stat cards** with gradient color backgrounds
  (cyan, orange, purple, green) and colored circular icons, making key numbers easier to read.
- Charts are smoother and more professional.
- The layout is split into a main panel (left) and a summary sidebar (right) — matching the
  standard layout of professional banking management systems.
- Customer status breakdown now appears as a clean progress bar list (Active, Dormant,
  Escheat, Closed), with a pie chart for account types.
- A **Bank Overview** card shows total customers, documents, today's uploads, and active
  branches all in one place.

**Why it matters:**
The system now looks and feels like a proper banking management platform — one that branch
managers and compliance officers can confidently present to BSP examiners or bank directors
without hesitation.

---

### 18. System Documentation Written and Published

**What was produced:**
- A complete **User Guide** was written in English, covering step-by-step instructions for
  every role in the system (Admin, Manager, Compliance, User/Encoder, Cashier).
- The same guide was translated and written in **Filipino** for staff who are more comfortable
  reading in their native language.
- A **Deployment Guide** was written for the bank's IT team, covering how to install, update,
  and maintain the system on the server.

**Why it matters:**
Having written documentation means new staff can learn the system on their own, and existing
staff have a reference to consult when they forget how to do something. The Filipino version
ensures the guide is accessible to all branch staff across the bank's 11 branches.

---

## Quick Reference — All 18 Items at a Glance

| # | What Was Done | Date |
|---|---|---|
| 1 | Thumbmark (fingerprint) search added | April 20–21 |
| 2 | Fixed screen data loading issues | April 21 |
| 3 | Joint account holder name and account number fields added | April 22 |
| 4 | Error messages rewritten in plain language | April 22 |
| 5 | "Reactivated" account status added | April 28 |
| 6 | Automated deployment system set up | April 28 |
| 7 | Fixed "Add Other Documents" upload not working | April 30 |
| 8 | New Status Tracking dashboard screen (User role) | May 1–15 |
| 9 | New Compliance Branch Detail drilldown screen | May 1–15 |
| 10 | New Compliance Reports screen with print preview | May 1–15 |
| 11 | Admin login troubleshooter tool for staff accounts | May 1–15 |
| 12 | System Settings screen reorganized and expanded | May 1–15 |
| 13 | Full sole proprietorship account support | May 15 |
| 14 | Status change now records exact effective date | May 15 |
| 15 | All image uploads now processed only by server | May 15 |
| 16 | Fixed "Uploaded By" disappearing after status updates | May 15 |
| 17 | Professional banking dashboard design on all screens | May 15 |
| 18 | User Guide written (English + Filipino) + Deployment Guide | May 1–15 |

---

*Prepared by: Claude Code (AI assistant)*
*Covering work period: April 20, 2026 – May 15, 2026*
*RBT Bank Inc. — Signature Card Management System*
