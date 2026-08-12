# Closed-Status Upload Panel: Multi-File Uploads + Label Rename

Date: 2026-08-12
Status: Approved for planning

## Summary

Two changes, requested together:

1. Inside the "closed-status upload panel" (the document upload panel shown in
   `CustomerView.jsx` after a staff member goes Customer Profile → Status →
   Close → Confirm Update → Go to Upload), the Sigcard Front, Sigcard Back,
   NAIS Front, and NAIS Back upload slots become multi-file: staff can select
   or drag multiple images into a single drop zone instead of being limited
   to one image per slot.
2. App-wide, the display label "Sigcard Front" becomes "SIGCARD" and "Sigcard
   Back" becomes "Risk Profiling", everywhere those labels currently render.

The status-change flow itself (choosing a status, "select everything or
specific" document-type toggles, Confirm Update) is explicitly **not**
changing — confirmed with the user as staying as-is.

## Background / current state

- Customer status changes happen in `EditStatusModal` inside
  `frontend/src/pages/user/CustomerProfiles.jsx`. On save, it routes to
  `/user/customers/:id/view?upload=<types>&newStatus=closed&statusLogId=...`
  (or a `pending_status` variant), which renders the upload panel described
  below inside `CustomerView.jsx`. This modal and its "select which document
  types" step are unchanged by this work.
- The upload panel (`CustomerView.jsx`, function `handleUploadForStatus` and
  the JSX around lines 1900-2180) renders one drop zone section per selected
  document type (`sigcard`, `nais`, `privacy`, `other`). It branches sigcard
  rendering by account type:
  - Joint Non-ITF and Corporate (non-sole-prop): already support multiple
    images via a different, existing pattern — per-signatory
    `corpSigcardFronts` array with an explicit "+ Add Front" button, one
    file per signatory slot. **Not touched by this work.**
  - Regular accounts and Joint-ITF's shared sigcard: single-file
    `DocImageDropZone` for front and back (`docUploadFiles["sigcard_front"]`
    / `["sigcard_back"]`), each a single `File | null`. **In scope.**
  - NAIS front/back: rendered once, the same way, regardless of account
    type (`docUploadFiles["nais_front"]` / `["nais_back"]`). **In scope.**
  - Privacy front/back: same shape as NAIS but explicitly **out of scope**
    (not requested).
- A working multi-file component already exists:
  `frontend/src/components/common/MultiFileDropZone.jsx` — accepts
  `files: File[]`, native multi-select input, thumbnail grid. Already used
  for the "Other Documents" slot in this same panel.
- Backend: `POST /customers/{customer}/upload-status-document` →
  `CustomerController::uploadStatusDocument` (`backend/app/Http/Controllers/
  Api/CustomerController.php:960-1078`), which calls a `storePairs()` helper
  for `sigcardPairs`/`naisPairs`/`privacyPairs`, each pair posting one
  `front` file and/or one `back` file plus a `person_index`.
- Storage model: `customer_documents` table / `CustomerDocument` model has
  **no unique constraint** on `(customer_id, document_type, person_index)` —
  multiple rows for the same type+person already coexist safely at the DB
  level. The only real obstacle is `buildFilename()` (same file, ~line
  1252), which builds a **deterministic** path for the six named document
  types (e.g. `"SIGCARD - FRONT.jpg"`), so a second upload to the same slot
  in the same request/status would silently overwrite the first file on
  disk. `otherDocs[]` already avoids this by using a UUID-suffixed filename.

## Frontend design

**Component swap**, scoped to the closed-status upload panel only:

- Regular-account sigcard front/back (`CustomerView.jsx` ~2073-2098) and
  Joint-ITF shared sigcard front/back (~2038-2048): replace the two
  `DocImageDropZone` instances with two `MultiFileDropZone` instances.
- NAIS front/back (~2101-2128), rendered once for all account types:
  replace both `DocImageDropZone` instances with `MultiFileDropZone`.
- State shape changes from `docUploadFiles["sigcard_front"]: File | null` to
  `File[]` (default `[]`) for these four keys only. `onChange` becomes
  `(files) => setDocUploadFiles(p => ({ ...p, sigcard_front: files }))`.
- The "Use same image for both sides" convenience button (present for both
  the regular sigcard block and the NAIS block) is **removed** for these
  slots — copying "the" image doesn't make sense once a slot can hold N
  images. (Corporate/Non-ITF sections don't have this button today, so
  nothing changes there.)
- `hasFiles` / `stagedCount` logic in `handleUploadForStatus` and the panel
  footer updates to count array lengths instead of truthy singles for these
  four keys.
- Untouched: Corporate `corpSigcardFronts` / `perPersonCorpBacks`, Non-ITF
  `nonItfSigcardFront` / `perPersonSigcardBacks`, Privacy front/back, Other
  Documents (already multi).

## Backend design

`CustomerController::uploadStatusDocument` / `storePairs()`:

- For the `sigcard` and `nais` pair groups only, accept `front`/`back` as
  either a single uploaded file (existing behavior, still used by
  Corporate/Non-ITF/Privacy call sites) or an array of files (new). Laravel
  naturally receives an array when the frontend posts
  `sigcardPairs[N][front][]` / `naisPairs[N][front][]` (repeated for
  `back`), vs. the existing scalar `sigcardPairs[N][front]`.
- When an array is received, loop and call the existing `uploadDocument()`
  once per file — same `document_type` and `person_index` for every file in
  the group, producing multiple `CustomerDocument` rows. No schema/migration
  change needed (already legal per the constraint check above).
- `buildFilename()`: when more than one file lands in the same
  document_type + person_index slot within a single request, append a
  sequence suffix to keep filenames distinct on disk, e.g.
  `"SIGCARD - FRONT.jpg"`, `"SIGCARD - FRONT (2).jpg"`,
  `"SIGCARD - FRONT (3).jpg"`. Single-file uploads (the existing call sites)
  keep today's exact filename — no behavior change for them.
- This endpoint is the only one touched. `replaceDocument` and other
  document endpoints are out of scope.

## Label rename (app-wide)

Change the **display text only** — no key, enum value, or `document_type`
column value changes. Files confirmed to contain "Sigcard Front" /
"Sigcard Back" as user-visible label strings:

1. `frontend/src/pages/user/UploadSigcard.jsx`
2. `frontend/src/pages/user/AddAccount.jsx`
3. `frontend/src/pages/shared/BranchDocuments.jsx` (label lookup map)
4. `frontend/src/pages/user/CustomerView.jsx` (includes the panel above, plus
   the read-only document viewer sections elsewhere in the same file)
5. `frontend/src/pages/user/CustomerProfiles.jsx` (label lookup map)
6. `frontend/src/pages/user/EditCustomerDocs.jsx`
7. `frontend/src/components/common/AddAccountModal.jsx`

"Sigcard Front" → "SIGCARD" (label text only, no "Front"/"(Shared)"
suffixes get silently dropped — e.g. "Sigcard Front (Shared)" becomes
"SIGCARD (Shared)", "Front 1"/"Front 2" numbered variants are unaffected
since they don't contain the base string).
"Sigcard Back" → "Risk Profiling" (already used for Corporate/Non-ITF back
labels in `CustomerView.jsx` today; this extends it everywhere else so the
wording is consistent).

Where a file holds a `key -> label` lookup map (`BranchDocuments.jsx`,
`CustomerProfiles.jsx`), update the label string in the map, not the key, so
nothing that reads by key breaks.

## Testing plan

- Manual, in dev (`npm run dev`), as user role:
  1. Customer Profiles → open a Regular account → Status → Close → Confirm
     Update → Go to Upload. Confirm Sigcard Front, Sigcard Back, NAIS Front,
     NAIS Back each accept multiple images via drag/select, show a thumbnail
     grid, and allow removing individual files before submit.
  2. Repeat for a Joint-ITF account (shared sigcard slot).
  3. Submit with 2+ files in one slot; verify in the DB (or via the customer
     document viewer) that all files were saved as separate documents with
     distinct file paths (no overwrite) and correct `person_index`.
  4. Verify Corporate and Joint Non-ITF sigcard flows are visually and
     functionally unchanged (still their existing "+ Add Front" pattern).
  5. Verify Privacy front/back and Other Documents are unchanged.
  6. Spot-check the label rename across: Upload wizard, Add Account, Branch
     Documents, Customer View (both the upload panel and the read-only
     viewer), Customer Profiles, Edit Customer Docs, Add Account Modal.
- No automated test suite currently covers this area (confirmed nothing
  found for these components); manual verification only.
