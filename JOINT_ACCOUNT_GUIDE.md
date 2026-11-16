# Joint Account Guide

How joint accounts work in DIGICUR after the **November 2026 changes**, what happened to joint accounts saved **before** those changes, and how to keep the old records working **without re-uploading anything**.

Part 1 is for bank staff and managers. Part 2 is the technical reference for IT.

---

## Part 1 — For staff and branch managers

### 1.1 The three kinds of joint account

When staff upload a **Joint** account, they now choose one of three types.

| Type | Who is on it | Signing rule choices |
|---|---|---|
| **Regular Joint Account** | Primary Account Holder + one or more Secondary Account Holders | **All Must Sign** or **Any May Sign** |
| **In-Trust-For (ITF) Account** | Trustee(s) + In-Trust-For person(s) (beneficiaries) | **Sole Trustee** (one trustee) or **Joint Trustee** (two or more trustees) |
| **For the Account Of** *(new)* | Primary + Secondary Account Holders, holding the account for an **organization** | **All Must Sign** or **Any May Sign** |

"For the Account Of" also asks for:
- **Account Name**, the title of the account (for example "JUAN DELA CRUZ FAO RBT COOP"). Capital letters are kept exactly as typed.
- **Organization**, the group the account is held for.

The customer list shows these accounts under their **Account Name**, and staff can search by Account Name or Organization.

### 1.2 Which documents each person needs

| Document | Regular Joint and For the Account Of | ITF |
|---|---|---|
| **Signature Card** | One card shared by everyone. For the Account Of can **add more cards** ("Add Another Signature Card") when 3 or more holders don't fit on one card. Regular Joint can add one second card. | Shared cards, one or more |
| **Risk Profiling** | **One per person** (Primary and each Secondary) | Shared list, one or more |
| **NAIS** (optional) | One per account | Shared |
| **Data Privacy** | One shared form; either side is enough | Shared; either side is enough |
| **Other Documents** (optional) | Per account | Shared |

Where documents show up on the customer profile:
- All signature cards show together under **Person 1** (for example "Front (3)").
- Each person's Risk Profiling shows under their own name ("Person 2 — Maria Santos").

### 1.3 "This client already exists" warning

The warning only appears when a person with the **same first, middle and last name** already exists under the **same account type**. A customer who has their own Regular account can be added to a joint account without a warning.

### 1.4 What happened to joint accounts saved BEFORE these changes?

**Nothing was deleted or moved. No images need to be uploaded again.** Older records simply lack some of the new information.

| What you may see on an old joint account | Why | What to do (no re-upload) |
|---|---|---|
| Joint Account Type shows **"Not set"** (for example "Regular Joint — Not set") | The signing rule did not exist when the account was saved. | Open the customer → **Edit Info** → choose All Must Sign / Any May Sign (or Sole / Joint Trustee for ITF) → Save. |
| ITF account: everyone after Person 1 shows as **In-Trust-For** | Trustee / In-Trust-For roles were not recorded before. | Only Joint Trustee accounts need action: **Edit Info** → set the account to Joint Trustee → mark which person is the second trustee. |
| Account shows only **"Joint"** with no type | A very old record saved before joint types existed. | Ask IT. The joint type can't be changed from the screen yet. |
| A Regular Joint **second signature card** is missing from the profile | An old bug filed it under a person number that doesn't exist, so it was hidden. The image is still on the server. | IT runs the repair tool (1.5). The card then shows up under Person 1. |
| A secondary holder has **no Risk Profiling** | Older uploads allowed one Risk Profiling per account, not per person. | Only if the bank requires it for old accounts: **Edit Docs** → upload just that person's Risk Profiling. |

### 1.5 The repair tool: keeps old data working with the new screens

IT runs one command on the server. It:
- **Fixes automatically:** hidden signature cards are moved to Person 1, so they show up again. The image file itself is not touched, and each fix is written to the activity log.
- **Lists for staff:** every old joint account that needs a quick choice in Edit Info (sections 2–5 of its report), so staff know exactly which ones to open.

It always shows a **preview first**. Nothing changes until IT runs it again with `--apply`.

---

## Part 2 — Technical reference (IT)

### 2.1 Stored values

| Field | Table | Values |
|---|---|---|
| `account_type` | customers | `Joint` |
| `joint_sub_type` | customers | `Non-ITF` (Regular Joint), `ITF`, `FAO` (For the Account Of), or `NULL` (very old) |
| `joint_arrangement` | customers | `AND` / `OR` for Non-ITF and FAO; `Sole Trustee` / `Joint Trustee` for ITF; `NULL` = "Not set" |
| `company_name` | customers | Corporate company name; **FAO Account Name** |
| `organization` | customers | FAO Organization (migration `2026_11_16_090000`) |
| `role` | customer_holders | ITF only: `trustee` / `beneficiary`; `NULL` shows as In-Trust-For |
| `person_index` | customer_holders | 2, 3, … (Person 1 is the `customers` row itself) |

`Customer::full_name` returns the Account Name for FAO accounts. Display labels are in `frontend/src/utils/jointAccount.js`. Allowed values are in `App\Enums\JointSubType` and `App\Enums\JointArrangement`.

### 2.2 How documents are filed (`customer_documents.person_index`)

| Document | Non-ITF / FAO | ITF |
|---|---|---|
| `sigcard_front` | 1, including extra cards (sent with `person_index=1` since commit 9dd6a91) | 1 |
| `sigcard_back` (Risk Profiling) | 1 … N, one per person (since e20a009) | 1 |
| `nais_*` | Per account: pair *i* → *i+1* | 1 |
| `privacy_*` | 1 | 1 |
| `other` | Per account index | 1 |

The backend (`CustomerController::storePairs`) uses the `person_index` sent with each pair. If none is sent, it uses pair position + 1.

### 2.3 Timeline of joint-account changes (Nov 16, 2026)

| Commit | Change |
|---|---|
| (earlier) b709c50–44ec72f | AND/OR and Sole/Joint Trustee choices; `joint_arrangement`, holder `role` |
| 29678c8 | FAO type + `organization`; duplicate-name rule by account type |
| 1ee80c4 | FAO on Customer Profiles list, search, compliance report label |
| e20a009 | Regular joint: Risk Profiling per account holder |
| 4d006bb | Joint Data Privacy / NAIS accept either side; 10 MB / file-type check on upload |
| e3f7bb7 | FAO Account Name / Organization keep capitals |
| 9dd6a91 | FAO "Add Another Signature Card"; extra cards filed under person 1 |
| 43013e0 | Extra cards in the status-change upload panel; Edit Docs heading |
| (this guide) | `sigcard:repair-joint-data` command |

### 2.4 Running the repair tool

```bash
cd backend
php artisan sigcard:repair-joint-data            # preview: shows what it would fix and lists accounts for staff
php artisan sigcard:repair-joint-data --apply    # makes the fix (moves hidden signature cards to person 1)
```

- **It only changes `person_index`** on `sigcard_front` rows whose `person_index` is higher than the account's highest holder. Nothing else is written. No files are moved, renamed or deleted.
- **It is safe to run more than once.** A second run finds nothing left to fix.
- **Each fix is logged** in the activity log as "Joint signature card moved to Person 1 by data repair (no re-upload)".
- **Undo:** the activity log entry keeps `from_person_index`, so a fix can be reversed by setting the document back to that value.

**Staging result (Nov 16, 2026, preview):** 7 joint accounts checked.
- 1 hidden card: customer #30, document 230, filed under person 3.
- 1 account with no joint type (#4).
- 5 accounts with "Not set" (#17, #22, #25, #26, #30).
- No missing Risk Profilings.

**Staging, applied (Nov 16, 2026):** document 230 (customer #30) was moved from person 3 to person 1 and logged. A re-run found nothing left to fix. The "Not set" accounts and #4 are still waiting for staff.

### 2.5 Known limits

- Joint type (`joint_sub_type`) can't be changed after creation from the screens; `UpdateCustomerRequest` does not accept it.
- **Edit Docs** shows one signature-card slot per two holders, or more if more cards are already saved. A card put into an *empty* slot there is filed under person 2, 3… (so it doesn't overwrite card 1). It still shows up under that person on the profile.
- For Non-ITF accounts with extra accounts, NAIS for account 2 is filed under `person_index` 2, the same number as Person 2. This was existing behaviour and was not changed.
