# Closed-Status Multi-File Upload + Label Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the closed-status document upload panel (Customer Profile → Status → Close → Confirm Update → Go to Upload), let staff upload multiple images per Sigcard Front/Back and NAIS Front/Back slot instead of one; and app-wide, rename the "Sigcard Front"/"Sigcard Back" display labels to "SIGCARD"/"Risk Profiling".

**Architecture:** Frontend: swap the single-file `DocImageDropZone` for the existing multi-file `MultiFileDropZone` component on the 4 slots in scope, change `docUploadFiles` state for those keys from `File|null` to `File[]`, and post them to the backend as repeated array fields. Backend: the storage schema and `otherDocs[]` code path already support multiple document rows per type+person — generalize the shared `storePairs()`/`uploadDocument()`/`buildFilename()` helpers in `CustomerController` to accept either one file or an array per pair side, uniquifying filenames only when more than one file lands in the same slot (so single-file callers are unaffected).

**Tech Stack:** Laravel 12 / PHP 8.3 backend (`backend/`), React 19 + Vite frontend (`frontend/`), no ORM/schema changes.

## Global Constraints

- Multi-file scope is limited to the closed-status upload panel in `CustomerView.jsx`: Regular-account sigcard front/back, Joint-ITF's shared sigcard front/back, and NAIS front/back for all account types.
- Corporate and Joint Non-ITF sigcard sections keep their existing per-signatory "+ Add Front" pattern — do not touch their upload logic.
- Privacy front/back stays single-file — do not touch.
- No database migration: `customer_documents` has no unique constraint on `(customer_id, document_type, person_index)`, so multiple rows per slot are already legal.
- Backend `sigcardPairs[N][front]`/`[back]` and `naisPairs[N][front]`/`[back]` must keep working as single scalar files for existing callers (customer creation, other endpoints) — new array support must be additive/backward compatible.
- Label rename is display-text only. Never change `document_type` enum values (`sigcard_front`, `sigcard_back`, `nais_front`, `nais_back`) or any object/lookup-map key — only the human-readable label strings shown to staff.
- "Sigcard Front" → "SIGCARD"; "Sigcard Back" → "Risk Profiling" (already used for Corporate/Non-ITF back labels today — this extends it everywhere else). Numbered variants like "Front 1"/"Front 2" that don't contain the literal phrase are left as-is.
- No frontend automated test framework exists in this repo (`frontend/package.json` has no vitest/jest/testing-library) — frontend verification is manual via `npm run dev` in a browser, plus `npm run lint`.
- No PHPUnit feature-test scaffolding exists for `CustomerController` (no `CustomerFactory`, no existing tests for this endpoint) and the approved design spec's testing plan is manual-only for this feature — backend verification uses a targeted Tinker reflection check plus an end-to-end browser + DB check, not a new PHPUnit suite. Do not invent a CustomerFactory or feature test as part of this plan.
- Run `vendor/bin/pint --dirty` in `backend/` after backend edits before committing.
- Run `npm run lint` in `frontend/` after frontend edits before committing.
- Reference spec: `docs/superpowers/specs/2026-08-12-closed-status-multi-upload-design.md`.

---

### Task 1: Backend — accept multiple files per sigcard/nais pair slot

**Files:**
- Modify: `backend/app/Http/Controllers/Api/CustomerController.php`
  - `buildFilename()` — lines 1252-1274
  - `uploadDocument()` — lines 1130-1183
  - `storePairs()` — lines 1086-1112

**Interfaces:**
- Consumes: nothing new — existing `CustomerDocument::create()`, existing `Storage::disk('public')`.
- Produces: `storePairs()` now accepts `$pair['front']` / `$pair['back']` as either a single `UploadedFile` (existing behavior, used by customer-creation and other call sites) or an array of `UploadedFile` (new — used by the closed-status upload endpoint once Task 2/3 send it). Each file in an array becomes its own `CustomerDocument` row. When more than one file lands in the same `document_type` + `person_index` slot in one request, filenames get a `" ($sequence)"` suffix (e.g. `SIGCARD - FRONT (2).jpg`) so they don't overwrite each other on disk; single-file uploads keep today's exact filenames unchanged.

- [ ] **Step 1: Update `buildFilename()` to accept a sequence/total and suffix the filename when there's more than one file in the slot**

Replace (lines 1252-1274):

```php
    private function buildFilename(string $documentType, int $personIndex, UploadedFile $file): string
    {
        $nameMap = [
            'sigcard_front' => 'SIGCARD - FRONT',
            'sigcard_back' => 'SIGCARD - BACK',
            'nais_front' => 'NAIS - FRONT',
            'nais_back' => 'NAIS - BACK',
            'privacy_front' => 'DATA PRIVACY - FRONT',
            'privacy_back' => 'DATA PRIVACY - BACK',
        ];

        if (isset($nameMap[$documentType])) {
            $base = $nameMap[$documentType];
            $suffix = $personIndex > 1 ? " - PERSON {$personIndex}" : '';

            return $base.$suffix.'.jpg';
        }

        // Other documents — keep original name, add UUID to avoid collisions.
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        return $this->sanitizeName(strtoupper($originalName)).' - '.Str::uuid().'.jpg';
    }
```

With:

```php
    private function buildFilename(string $documentType, int $personIndex, UploadedFile $file, int $sequence = 1, int $total = 1): string
    {
        $nameMap = [
            'sigcard_front' => 'SIGCARD - FRONT',
            'sigcard_back' => 'SIGCARD - BACK',
            'nais_front' => 'NAIS - FRONT',
            'nais_back' => 'NAIS - BACK',
            'privacy_front' => 'DATA PRIVACY - FRONT',
            'privacy_back' => 'DATA PRIVACY - BACK',
        ];

        if (isset($nameMap[$documentType])) {
            $base = $nameMap[$documentType];
            $personSuffix = $personIndex > 1 ? " - PERSON {$personIndex}" : '';
            $sequenceSuffix = $total > 1 ? " ({$sequence})" : '';

            return $base.$personSuffix.$sequenceSuffix.'.jpg';
        }

        // Other documents — keep original name, add UUID to avoid collisions.
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        return $this->sanitizeName(strtoupper($originalName)).' - '.Str::uuid().'.jpg';
    }
```

- [ ] **Step 2: Update `uploadDocument()` to accept and pass through sequence/total**

Replace (lines 1130-1154, the signature and the `buildFilename` call):

```php
    private function uploadDocument(
        Customer $customer,
        UploadedFile $file,
        string $documentType,
        int $personIndex,
        ?string $accountStatus = null,
        ?int $statusLogId = null
    ): CustomerDocument {
        // ── Optimise image ───────────────────────────────────────────────────
        $image = $this->imageManager()->read($file->getRealPath());

        // Scale down only — aspect ratio always preserved (object-fit: contain).
        $image->scaleDown(width: 800, height: 900);

        $encoded = $image->toJpeg(quality: 80);

        // ── Build organised path ─────────────────────────────────────────────
        $customer->loadMissing('branch');

        $directory = $this->buildDirectory($customer);
        if ($accountStatus) {
            $directory .= '/'.$this->sanitizeName(strtoupper($accountStatus));
        }
        $filename = $this->buildFilename($documentType, $personIndex, $file);
        $path = "{$directory}/{$filename}";
```

With:

```php
    private function uploadDocument(
        Customer $customer,
        UploadedFile $file,
        string $documentType,
        int $personIndex,
        ?string $accountStatus = null,
        ?int $statusLogId = null,
        int $sequence = 1,
        int $total = 1
    ): CustomerDocument {
        // ── Optimise image ───────────────────────────────────────────────────
        $image = $this->imageManager()->read($file->getRealPath());

        // Scale down only — aspect ratio always preserved (object-fit: contain).
        $image->scaleDown(width: 800, height: 900);

        $encoded = $image->toJpeg(quality: 80);

        // ── Build organised path ─────────────────────────────────────────────
        $customer->loadMissing('branch');

        $directory = $this->buildDirectory($customer);
        if ($accountStatus) {
            $directory .= '/'.$this->sanitizeName(strtoupper($accountStatus));
        }
        $filename = $this->buildFilename($documentType, $personIndex, $file, $sequence, $total);
        $path = "{$directory}/{$filename}";
```

(The rest of `uploadDocument()` — the `Storage::put`, `CustomerDocument::create`, thumbmark auto-enroll block, `return $document;` — is unchanged.)

- [ ] **Step 3: Update `storePairs()` to loop over arrays of files per side**

Replace (lines 1086-1112):

```php
    private function storePairs(
        Customer $customer,
        Request $request,
        string $pairsKey,
        string $frontType,
        string $backType,
        ?string $accountStatus = null,
        ?int $statusLogId = null
    ): void {
        $pairs = $request->file($pairsKey, []);
        $pairsMeta = $request->input($pairsKey, []);

        foreach ($pairs as $index => $pair) {
            // ITF pairs include an explicit person_index from the frontend
            $personIndex = isset($pairsMeta[$index]['person_index'])
                ? (int) $pairsMeta[$index]['person_index']
                : $index + 1;

            if (! empty($pair['front'])) {
                $this->uploadDocument($customer, $pair['front'], $frontType, $personIndex, $accountStatus, $statusLogId);
            }

            if (! empty($pair['back'])) {
                $this->uploadDocument($customer, $pair['back'], $backType, $personIndex, $accountStatus, $statusLogId);
            }
        }
    }
```

With:

```php
    private function storePairs(
        Customer $customer,
        Request $request,
        string $pairsKey,
        string $frontType,
        string $backType,
        ?string $accountStatus = null,
        ?int $statusLogId = null
    ): void {
        $pairs = $request->file($pairsKey, []);
        $pairsMeta = $request->input($pairsKey, []);

        foreach ($pairs as $index => $pair) {
            // ITF pairs include an explicit person_index from the frontend
            $personIndex = isset($pairsMeta[$index]['person_index'])
                ? (int) $pairsMeta[$index]['person_index']
                : $index + 1;

            if (! empty($pair['front'])) {
                $frontFiles = is_array($pair['front']) ? $pair['front'] : [$pair['front']];
                $frontTotal = count($frontFiles);
                foreach (array_values($frontFiles) as $i => $frontFile) {
                    $this->uploadDocument($customer, $frontFile, $frontType, $personIndex, $accountStatus, $statusLogId, $i + 1, $frontTotal);
                }
            }

            if (! empty($pair['back'])) {
                $backFiles = is_array($pair['back']) ? $pair['back'] : [$pair['back']];
                $backTotal = count($backFiles);
                foreach (array_values($backFiles) as $i => $backFile) {
                    $this->uploadDocument($customer, $backFile, $backType, $personIndex, $accountStatus, $statusLogId, $i + 1, $backTotal);
                }
            }
        }
    }
```

- [ ] **Step 4: Format with Pint**

Run: `cd backend && vendor/bin/pint --dirty`
Expected: reports the file reformatted (or no changes needed) — no errors.

- [ ] **Step 5: Manually verify `buildFilename()`'s new suffix behavior via Tinker**

Run: `cd backend && php artisan tinker --execute="
\$controller = app(\App\Http\Controllers\Api\CustomerController::class);
\$ref = new ReflectionMethod(\$controller, 'buildFilename');
\$ref->setAccessible(true);
\$file = Illuminate\Http\UploadedFile::fake()->image('test.jpg');
echo \$ref->invoke(\$controller, 'sigcard_front', 1, \$file, 1, 1) . PHP_EOL;
echo \$ref->invoke(\$controller, 'sigcard_front', 1, \$file, 2, 3) . PHP_EOL;
echo \$ref->invoke(\$controller, 'sigcard_front', 2, \$file, 1, 1) . PHP_EOL;
"`

Expected output (three lines):
```
SIGCARD - FRONT.jpg
SIGCARD - FRONT (2).jpg
SIGCARD - FRONT - PERSON 2.jpg
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/Api/CustomerController.php
git commit -m "feat(backend): support multiple files per sigcard/nais upload slot"
```

---

### Task 2: Frontend — CustomerView.jsx state & submit logic for multi-file sigcard/nais

**Files:**
- Modify: `frontend/src/pages/user/CustomerView.jsx`
  - `handleUploadForStatus` — lines 882-1017 (the `hasFiles` check and the NonITF/Corp/Regular+ITF branches' sigcard/nais/privacy FormData building)
  - `stagedCount` — lines 1868-1876

**Interfaces:**
- Consumes: Task 1's backend field contract — `sigcardPairs[N][front][]` / `[back][]` and `naisPairs[N][front][]` / `[back][]` accept repeated file fields; `privacyPairs[N][front]` / `[back]` stays scalar.
- Produces: `docUploadFiles["sigcard_front"]`, `["sigcard_back"]`, `["nais_front"]`, `["nais_back"]` are now `File[]` (read as `docUploadFiles["sigcard_front"] ?? []`); `docUploadFiles["privacy_front"]`/`["privacy_back"]` remain `File | undefined` (unchanged). `hasFiles` and `stagedCount` correctly count array-valued and scalar-valued entries. Task 3 will consume this array state to drive the UI.

- [ ] **Step 1: Update the `hasFiles` check to count array-valued doc slots correctly**

Replace (lines 892-899):

```javascript
    const hasFiles =
      Object.values(docUploadFiles).some(Boolean)
      || otherUploadFiles.length > 0
      || nonItfSigcardFront !== null
      || Object.values(perPersonSigcardBacks).some(Boolean)
      || corpSigcardFronts.some(Boolean)
      || Object.values(perPersonCorpBacks).some(Boolean)
      || (itfHasSecondFront && itfSecondFront !== null);
```

With:

```javascript
    const hasFiles =
      Object.values(docUploadFiles).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))
      || otherUploadFiles.length > 0
      || nonItfSigcardFront !== null
      || Object.values(perPersonSigcardBacks).some(Boolean)
      || corpSigcardFronts.some(Boolean)
      || Object.values(perPersonCorpBacks).some(Boolean)
      || (itfHasSecondFront && itfSecondFront !== null);
```

- [ ] **Step 2: Update the Non-ITF branch to send NAIS as an array while keeping Privacy scalar**

Replace (lines 940-953, the `for` loop over `nais`+`privacy` inside the `isNonItfUpload` branch):

```javascript
        // NAIS + Privacy: simple front/back per account
        for (const { key, pKey, frontKey, backKey } of [
          { key: "nais",    pKey: "naisPairs",    frontKey: "nais_front",    backKey: "nais_back"    },
          { key: "privacy", pKey: "privacyPairs", frontKey: "privacy_front", backKey: "privacy_back" },
        ]) {
          if (!uploadsSelected.includes(key)) continue;
          const f = docUploadFiles[frontKey];
          const b = docUploadFiles[backKey];
          if (f || b) {
            fd.append(`${pKey}[0][person_index]`, activeAcctIdx);
            if (f) fd.append(`${pKey}[0][front]`, f);
            if (b) fd.append(`${pKey}[0][back]`,  b);
          }
        }
```

With:

```javascript
        // NAIS: multiple files per side
        if (uploadsSelected.includes("nais")) {
          const naisFronts = docUploadFiles["nais_front"] ?? [];
          const naisBacks  = docUploadFiles["nais_back"]  ?? [];
          if (naisFronts.length || naisBacks.length) {
            fd.append("naisPairs[0][person_index]", activeAcctIdx);
            naisFronts.forEach((f) => fd.append("naisPairs[0][front][]", f));
            naisBacks.forEach((f) => fd.append("naisPairs[0][back][]", f));
          }
        }
        // Privacy: single file per side (unchanged)
        if (uploadsSelected.includes("privacy")) {
          const f = docUploadFiles["privacy_front"];
          const b = docUploadFiles["privacy_back"];
          if (f || b) {
            fd.append("privacyPairs[0][person_index]", activeAcctIdx);
            if (f) fd.append("privacyPairs[0][front]", f);
            if (b) fd.append("privacyPairs[0][back]",  b);
          }
        }
```

- [ ] **Step 3: Apply the same NAIS/Privacy split to the Corporate branch**

Replace (lines 976-989, the same `for` loop shape inside the `isCorpUpload` branch — identical source text to Step 2's "before" block, just located in the `else if (isCorpUpload)` section) with the same "after" code shown in Step 2.

- [ ] **Step 4: Update the Regular + Joint-ITF branch to send both Sigcard and NAIS as arrays, keep Privacy scalar**

Replace (lines 991-1006, the `else` branch's `for` loop over `sigcard`+`nais`+`privacy`):

```javascript
      } else {
        // Regular + Joint ITF: simple front/back for each selected doc type
        for (const { key, pKey, frontKey, backKey } of [
          { key: "sigcard", pKey: "sigcardPairs", frontKey: "sigcard_front", backKey: "sigcard_back" },
          { key: "nais",    pKey: "naisPairs",    frontKey: "nais_front",    backKey: "nais_back"    },
          { key: "privacy", pKey: "privacyPairs", frontKey: "privacy_front", backKey: "privacy_back" },
        ]) {
          if (!uploadsSelected.includes(key)) continue;
          const f = docUploadFiles[frontKey];
          const b = docUploadFiles[backKey];
          if (f || b) {
            fd.append(`${pKey}[0][person_index]`, isItfUpload ? 1 : activeAcctIdx);
            if (f) fd.append(`${pKey}[0][front]`, f);
            if (b) fd.append(`${pKey}[0][back]`,  b);
          }
        }
```

With:

```javascript
      } else {
        // Regular + Joint ITF: Sigcard & NAIS multi-file, Privacy single-file
        const personIdx = isItfUpload ? 1 : activeAcctIdx;

        if (uploadsSelected.includes("sigcard")) {
          const scFronts = docUploadFiles["sigcard_front"] ?? [];
          const scBacks  = docUploadFiles["sigcard_back"]  ?? [];
          if (scFronts.length || scBacks.length) {
            fd.append("sigcardPairs[0][person_index]", personIdx);
            scFronts.forEach((f) => fd.append("sigcardPairs[0][front][]", f));
            scBacks.forEach((f) => fd.append("sigcardPairs[0][back][]", f));
          }
        }
        if (uploadsSelected.includes("nais")) {
          const naisFronts = docUploadFiles["nais_front"] ?? [];
          const naisBacks  = docUploadFiles["nais_back"]  ?? [];
          if (naisFronts.length || naisBacks.length) {
            fd.append("naisPairs[0][person_index]", personIdx);
            naisFronts.forEach((f) => fd.append("naisPairs[0][front][]", f));
            naisBacks.forEach((f) => fd.append("naisPairs[0][back][]", f));
          }
        }
        if (uploadsSelected.includes("privacy")) {
          const f = docUploadFiles["privacy_front"];
          const b = docUploadFiles["privacy_back"];
          if (f || b) {
            fd.append("privacyPairs[0][person_index]", personIdx);
            if (f) fd.append("privacyPairs[0][front]", f);
            if (b) fd.append("privacyPairs[0][back]",  b);
          }
        }
```

(Leave the `if (isItfUpload && ...) { fd.append('sigcardPairs[1][person_index]', 2); ... }` block immediately below — lines 1008-1011 — unchanged; the optional ITF 2nd-person front stays single-file.)

- [ ] **Step 5: Update `stagedCount` to sum array lengths for the doc-upload slots**

Replace (lines 1868-1876):

```javascript
                const stagedCount = [
                  ...Object.values(docUploadFiles).filter(Boolean),
                  ...otherUploadFiles,
                  nonItfSigcardFront,
                  ...Object.values(perPersonSigcardBacks).filter(Boolean),
                  ...corpSigcardFronts.filter(Boolean),
                  ...Object.values(perPersonCorpBacks).filter(Boolean),
                  itfHasSecondFront && itfSecondFront,
                ].filter(Boolean).length;
```

With:

```javascript
                const docFilesCount = Object.values(docUploadFiles).reduce(
                  (sum, v) => sum + (Array.isArray(v) ? v.length : (v ? 1 : 0)),
                  0
                );
                const stagedCount = docFilesCount + [
                  ...otherUploadFiles,
                  nonItfSigcardFront,
                  ...Object.values(perPersonSigcardBacks).filter(Boolean),
                  ...corpSigcardFronts.filter(Boolean),
                  ...Object.values(perPersonCorpBacks).filter(Boolean),
                  itfHasSecondFront && itfSecondFront,
                ].filter(Boolean).length;
```

- [ ] **Step 6: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors in `CustomerView.jsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/user/CustomerView.jsx
git commit -m "feat(frontend): send sigcard/nais uploads as file arrays in status-close panel"
```

(No end-to-end manual test yet — the UI still renders single-file drop zones bound to array state at this point, which is inconsistent. Task 3 fixes the UI; do the full manual walkthrough there.)

---

### Task 3: Frontend — swap to MultiFileDropZone for the 4 in-scope slots

**Files:**
- Modify: `frontend/src/pages/user/CustomerView.jsx`
  - Import `MultiFileDropZone` — near the top imports (find the existing `import DocImageDropZone from ...` line and add a sibling import)
  - ITF shared sigcard front/back — lines 2038-2048
  - Regular sigcard front/back (incl. "same image" button) — lines 2073-2098
  - NAIS front/back (incl. "same image" button) — lines 2101-2128

**Interfaces:**
- Consumes: Task 2's `docUploadFiles["sigcard_front"|"sigcard_back"|"nais_front"|"nais_back"]` array state and setters; `MultiFileDropZone` component (`frontend/src/components/common/MultiFileDropZone.jsx`, props `files: File[]`, `onChange: (File[]) => void`, `label?: string`).
- Produces: staff-visible multi-file drop zones for these 4 slots, labeled "SIGCARD" and "Risk Profiling" per the rename.

- [ ] **Step 1: Import `MultiFileDropZone`**

Find the existing import of `DocImageDropZone` near the top of `CustomerView.jsx` and add immediately after it:

```javascript
import MultiFileDropZone from "../../components/common/MultiFileDropZone";
```

- [ ] **Step 2: Replace the ITF shared sigcard front/back drop zones**

Replace (lines 2038-2048):

```javascript
                          if (isITF) {
                            const scFront = docUploadFiles["sigcard_front"] ?? null;
                            const scBack  = docUploadFiles["sigcard_back"]  ?? null;
                            return (
                              <div key="sigcard" className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card — Shared</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <DocImageDropZone compact label="Sigcard Front (Shared)"
                                    file={scFront}
                                    onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_front: f ?? undefined }))} />
                                  <DocImageDropZone compact label="Sigcard Back (Shared)"
                                    file={scBack}
                                    onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_back: f ?? undefined }))} />
                                </div>
```

With:

```javascript
                          if (isITF) {
                            const scFronts = docUploadFiles["sigcard_front"] ?? [];
                            const scBacks  = docUploadFiles["sigcard_back"]  ?? [];
                            return (
                              <div key="sigcard" className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card — Shared</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <MultiFileDropZone label="SIGCARD (Shared)"
                                    files={scFronts}
                                    onChange={(files) => setDocUploadFiles((p) => ({ ...p, sigcard_front: files }))} />
                                  <MultiFileDropZone label="Risk Profiling (Shared)"
                                    files={scBacks}
                                    onChange={(files) => setDocUploadFiles((p) => ({ ...p, sigcard_back: files }))} />
                                </div>
```

(The rest of the `isITF` block — the "Add 2nd Person Front" button and `itfSecondFront` single-file `DocImageDropZone` — is unchanged; it stays single-file per the design.)

- [ ] **Step 3: Replace the Regular sigcard front/back drop zones and remove the "same image" button**

Replace (lines 2073-2098):

```javascript
                          // Regular: simple front + back
                          const scFront = docUploadFiles["sigcard_front"] ?? null;
                          const scBack  = docUploadFiles["sigcard_back"]  ?? null;
                          return (
                            <div key="sigcard" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card</p>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImageDropZone compact label="Sigcard Front"
                                  file={scFront}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_front: f ?? undefined }))} />
                                <DocImageDropZone compact label="Sigcard Back"
                                  file={scBack}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_back: f ?? undefined }))} />
                              </div>
                              {(scFront || scBack) && (
                                <div className="flex justify-center">
                                  <button type="button"
                                    onClick={() => { const src = scFront ?? scBack; setDocUploadFiles((p) => ({ ...p, sigcard_front: src, sigcard_back: src })); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors shadow-sm">
                                    <HiOutlinePhotograph className="w-3.5 h-3.5 flex-shrink-0" />
                                    Use same image for both sides
                                  </button>
                                </div>
                              )}
                            </div>
                          );
```

With:

```javascript
                          // Regular: simple front + back, multiple images allowed per side
                          const scFronts = docUploadFiles["sigcard_front"] ?? [];
                          const scBacks  = docUploadFiles["sigcard_back"]  ?? [];
                          return (
                            <div key="sigcard" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card</p>
                              <div className="grid grid-cols-2 gap-3">
                                <MultiFileDropZone label="SIGCARD"
                                  files={scFronts}
                                  onChange={(files) => setDocUploadFiles((p) => ({ ...p, sigcard_front: files }))} />
                                <MultiFileDropZone label="Risk Profiling"
                                  files={scBacks}
                                  onChange={(files) => setDocUploadFiles((p) => ({ ...p, sigcard_back: files }))} />
                              </div>
                            </div>
                          );
```

- [ ] **Step 4: Replace the NAIS front/back drop zones and remove the "same image" button**

Replace (lines 2101-2128):

```javascript
                        // ── NAIS ─────────────────────────────────────────────
                        if (uploadType === "nais") {
                          const nFront = docUploadFiles["nais_front"] ?? null;
                          const nBack  = docUploadFiles["nais_back"]  ?? null;
                          return (
                            <div key="nais" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NAIS</p>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImageDropZone compact label="NAIS Front"
                                  file={nFront}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, nais_front: f ?? undefined }))} />
                                <DocImageDropZone compact label="NAIS Back"
                                  file={nBack}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, nais_back: f ?? undefined }))} />
                              </div>
                              {(nFront || nBack) && (
                                <div className="flex justify-center">
                                  <button type="button"
                                    onClick={() => { const src = nFront ?? nBack; setDocUploadFiles((p) => ({ ...p, nais_front: src, nais_back: src })); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors shadow-sm">
                                    <HiOutlinePhotograph className="w-3.5 h-3.5 flex-shrink-0" />
                                    Use same image for both sides
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }
```

With:

```javascript
                        // ── NAIS ─────────────────────────────────────────────
                        if (uploadType === "nais") {
                          const nFronts = docUploadFiles["nais_front"] ?? [];
                          const nBacks  = docUploadFiles["nais_back"]  ?? [];
                          return (
                            <div key="nais" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NAIS</p>
                              <div className="grid grid-cols-2 gap-3">
                                <MultiFileDropZone label="NAIS Front"
                                  files={nFronts}
                                  onChange={(files) => setDocUploadFiles((p) => ({ ...p, nais_front: files }))} />
                                <MultiFileDropZone label="NAIS Back"
                                  files={nBacks}
                                  onChange={(files) => setDocUploadFiles((p) => ({ ...p, nais_back: files }))} />
                              </div>
                            </div>
                          );
                        }
```

- [ ] **Step 5: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 6: Manual end-to-end verification**

1. Run `npm run dev` in `frontend/` (and ensure the backend is running per this project's usual local setup).
2. Log in as a `user`-role account, go to a Regular customer's Customer Profiles page, open Status → choose **Closed** → Confirm Update → Go to Upload.
3. In the panel, confirm "SIGCARD" and "Risk Profiling" drop zones each accept 2+ images via click-to-browse (multi-select) and via drag-and-drop, show a thumbnail grid with a per-file "Remove" button, and no longer show a "Use same image for both sides" button.
4. Do the same for NAIS Front / NAIS Back (labels stay "NAIS Front"/"NAIS Back").
5. Click "Upload & Save Status" (or "Upload Documents"). Confirm it succeeds.
6. Verify storage: `cd backend && php artisan tinker --execute="print_r(\App\Models\CustomerDocument::where('customer_id', <that customer's id>)->where('document_type', 'sigcard_front')->latest('id')->take(5)->get(['id','document_type','person_index','file_path'])->toArray());"` — confirm one row per uploaded file, each with a distinct `file_path` (later ones show the `" (2)"`/`" (3)"` filename suffix from Task 1).
7. Repeat steps 2-6 for a Joint-ITF account (shared sigcard slot).
8. Spot-check that a Corporate or Joint Non-ITF account's status-close upload panel is visually and functionally unchanged (still the existing per-signatory "+ Add Front" pattern, not the new drop zone).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/user/CustomerView.jsx
git commit -m "feat(frontend): multi-file drop zones for sigcard/nais in status-close upload panel"
```

---

### Task 4: Frontend — remaining SIGCARD/Risk Profiling label renames in CustomerView.jsx

**Files:**
- Modify: `frontend/src/pages/user/CustomerView.jsx` — lines 52-53, 235, 1939, 1978, 2058 (none of these overlap Task 3's edited ranges)

**Interfaces:**
- Consumes: nothing.
- Produces: consistent "SIGCARD"/"Risk Profiling" wording for the Non-ITF, Corporate, and ITF-2nd-person sigcard labels and the two `document_type -> label` lookup maps in this file, matching Task 3's wording for the slots it already renamed.

- [ ] **Step 1: Rename the two label lookup maps**

Replace (lines 52-53):

```javascript
  sigcard_front:  "Sigcard Front",
  sigcard_back:   "Sigcard Back",
```

With:

```javascript
  sigcard_front:  "SIGCARD",
  sigcard_back:   "Risk Profiling",
```

Replace (line 235):

```javascript
  sigcard_front: "Sigcard Front", sigcard_back: "Sigcard Back",
```

With:

```javascript
  sigcard_front: "SIGCARD", sigcard_back: "Risk Profiling",
```

- [ ] **Step 2: Rename the Non-ITF shared front label**

Replace (line 1939):

```javascript
                                    <DocImageDropZone compact label="Sigcard Front"
```

With:

```javascript
                                    <DocImageDropZone compact label="SIGCARD"
```

(This is the Non-ITF block's shared-front drop zone — confirm by checking it's the one whose `file={nonItfSigcardFront}` / `onChange={setNonItfSigcardFront}` follow on the next line, not the Corporate or Regular one.)

- [ ] **Step 3: Rename the Corporate front label ternary**

Replace (line 1978):

```javascript
                                        label={corpSigcardFronts.length > 1 ? `Front ${i + 1}` : "Sigcard Front"}
```

With:

```javascript
                                        label={corpSigcardFronts.length > 1 ? `Front ${i + 1}` : "SIGCARD"}
```

- [ ] **Step 4: Rename the ITF 2nd-person sigcard front label**

Replace (line 2058):

```javascript
                                      <p className="text-xs font-semibold text-slate-500">2nd Person — Sigcard Front</p>
```

With:

```javascript
                                      <p className="text-xs font-semibold text-slate-500">2nd Person — SIGCARD</p>
```

- [ ] **Step 5: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

In the dev server, view a Non-ITF joint account and a Corporate account's status-close upload panel; confirm the front slot now reads "SIGCARD" (back already read "Risk Profiling" before this task). View an ITF account's status-close panel with "Add 2nd Person Front" expanded; confirm the row label reads "2nd Person — SIGCARD".

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/user/CustomerView.jsx
git commit -m "chore(frontend): rename remaining Sigcard Front/Back labels in CustomerView"
```

---

### Task 5: Frontend — app-wide SIGCARD/Risk Profiling label rename in remaining files

**Files:**
- Modify: `frontend/src/pages/shared/BranchDocuments.jsx` — lines 33-34
- Modify: `frontend/src/pages/user/CustomerProfiles.jsx` — lines 56-57
- Modify: `frontend/src/pages/user/UploadSigcard.jsx` — lines 1138, 1162, 1210, 1235, 1284, 1317, 1320, 1331, 1375
- Modify: `frontend/src/pages/user/AddAccount.jsx` — lines 390, 392
- Modify: `frontend/src/pages/user/EditCustomerDocs.jsx` — lines 1080, 1167
- Modify: `frontend/src/components/common/AddAccountModal.jsx` — lines 319, 320

**Interfaces:**
- Consumes: nothing.
- Produces: every remaining user-visible "Sigcard Front"/"Sigcard Back" string in the app now reads "SIGCARD"/"Risk Profiling", completing the app-wide rename alongside Tasks 3-4.

- [ ] **Step 1: `BranchDocuments.jsx` — rename the label lookup map**

Replace (lines 33-34):

```javascript
  sigcard_front: "Sigcard Front",
  sigcard_back:  "Sigcard Back",
```

With:

```javascript
  sigcard_front: "SIGCARD",
  sigcard_back:  "Risk Profiling",
```

- [ ] **Step 2: `CustomerProfiles.jsx` — rename the label lookup map**

Replace (lines 56-57):

```javascript
  sigcard_front:  "Sigcard Front",
  sigcard_back:   "Sigcard Back",
```

With:

```javascript
  sigcard_front:  "SIGCARD",
  sigcard_back:   "Risk Profiling",
```

- [ ] **Step 3: `UploadSigcard.jsx` — rename each labeled instance**

Replace line 1138:
```javascript
                    <DocImageDropZone label="Sigcard Front" shape="landscape" file={pair.front} onChange={(f) => setItfPairSide("sigcard", pairIdx, "front", f)} />
```
With:
```javascript
                    <DocImageDropZone label="SIGCARD" shape="landscape" file={pair.front} onChange={(f) => setItfPairSide("sigcard", pairIdx, "front", f)} />
```

Replace line 1162:
```javascript
                    label="Sigcard Front 2"
```
With:
```javascript
                    label="SIGCARD 2"
```

Replace line 1210:
```javascript
                label="Sigcard Front (Shared)"
```
With:
```javascript
                label="SIGCARD (Shared)"
```

Replace line 1235 (identical source text to line 1162 but a different call site — edit only this occurrence):
```javascript
                    label="Sigcard Front 2"
```
With:
```javascript
                    label="SIGCARD 2"
```

Replace line 1284:
```javascript
                <DocImageDropZone label="Sigcard Front" shape="landscape" file={files.sigcardPairs[0]?.front}
```
With:
```javascript
                <DocImageDropZone label="SIGCARD" shape="landscape" file={files.sigcardPairs[0]?.front}
```

Replace line 1317:
```javascript
                      <p className="text-xs font-medium text-slate-400">Sigcard Front {idx + 1}</p>
```
With:
```javascript
                      <p className="text-xs font-medium text-slate-400">SIGCARD {idx + 1}</p>
```

Replace line 1320:
```javascript
                      label={corpSigFronts.length === 1 ? "Sigcard Front" : `Sigcard Front ${idx + 1}`}
```
With:
```javascript
                      label={corpSigFronts.length === 1 ? "SIGCARD" : `SIGCARD ${idx + 1}`}
```

Replace line 1331 (button text):
```javascript
                    Add Another Sigcard Front
```
With:
```javascript
                    Add Another SIGCARD
```

Replace line 1375:
```javascript
          frontLabel="Sigcard Front" backLabel="Risk Profiling"
```
With:
```javascript
          frontLabel="SIGCARD" backLabel="Risk Profiling"
```

Do not change any of the existing "Risk Profiling" occurrences in this file (lines 1139, 1174, 1182, 1194, 1247, 1261, 1340, 1354, and the second half of line 1375) — they're already correct.

- [ ] **Step 4: `AddAccount.jsx` — rename both labels**

Replace lines 390 and 392:
```javascript
            <DropZone label="Sigcard Front" file={sigcardPair.front}
```
```javascript
            <DropZone label="Sigcard Back"  file={sigcardPair.back}
```
With:
```javascript
            <DropZone label="SIGCARD" file={sigcardPair.front}
```
```javascript
            <DropZone label="Risk Profiling"  file={sigcardPair.back}
```

- [ ] **Step 5: `EditCustomerDocs.jsx` — rename the shared-front label and the "Add Another" button**

Replace line 1080:
```javascript
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sigcard Front (Shared)</p>
```
With:
```javascript
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SIGCARD (Shared)</p>
```

Replace line 1167 (button text):
```javascript
                            Add Another Sigcard Front
```
With:
```javascript
                            Add Another SIGCARD
```

Do not change line 1175 (`Risk Profiling — per signatory`) — already correct. Line 1160 is a code comment (`{/* Add Another Sigcard Front button... */}`), not user-visible — leave it as-is.

- [ ] **Step 6: `AddAccountModal.jsx` — rename both labels**

Replace lines 319-320:
```javascript
                  <DropZone label="Sigcard Front" file={sigcard.front} onSelect={(f) => setSigcard((p) => ({ ...p, front: f }))} />
                  <DropZone label="Sigcard Back"  file={sigcard.back}  onSelect={(f) => setSigcard((p) => ({ ...p, back:  f }))} />
```
With:
```javascript
                  <DropZone label="SIGCARD" file={sigcard.front} onSelect={(f) => setSigcard((p) => ({ ...p, front: f }))} />
                  <DropZone label="Risk Profiling"  file={sigcard.back}  onSelect={(f) => setSigcard((p) => ({ ...p, back:  f }))} />
```

- [ ] **Step 7: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 8: Manual verification**

In the dev server: open the main Upload Sigcard wizard (`/user/upload`) for a Regular, Corporate, and Joint-ITF account and confirm all sigcard-front labels read "SIGCARD" and all sigcard-back labels read "Risk Profiling"; open Add Account and its modal variant and confirm the same; open Edit Customer Docs and confirm the same; open Branch Documents and Customer Profiles views that show the document-type label map and confirm they read "SIGCARD"/"Risk Profiling".

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/shared/BranchDocuments.jsx frontend/src/pages/user/CustomerProfiles.jsx frontend/src/pages/user/UploadSigcard.jsx frontend/src/pages/user/AddAccount.jsx frontend/src/pages/user/EditCustomerDocs.jsx frontend/src/components/common/AddAccountModal.jsx
git commit -m "chore(frontend): rename Sigcard Front/Back labels to SIGCARD/Risk Profiling app-wide"
```
