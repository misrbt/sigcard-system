# SigCard Project — Claude Standing Instructions

## Project At a Glance
RBT Bank Inc. (Rural Bank of Talisayan, Misamis Oriental, Philippines)
Signature Card Management System — BSP-compliant
- Backend: Laravel 12 · `backend/`
- Frontend: React + Vite + Tailwind · `frontend/`
- Full memory context: `C:\Users\Mis Assistant2\.claude\projects\C--www-project-sigcard\memory\MEMORY.md`

---

## RULE 1 — Update ACCOMPLISHMENTS.md Automatically (No Reminder Needed)

After **every task that is complete and working**, update `ACCOMPLISHMENTS.md` in this folder.

Do this WITHOUT being asked. It is part of finishing a task.

**How to write entries:**
- Write like you are explaining to a bank teller or branch manager — not a programmer
- Use plain, friendly English. Avoid words like: component, API, modal, state, hook, props, render, conditional, boolean
- Focus on what the STAFF now sees or can do — not what code was changed
- Keep it short: 3–6 bullet points per entry is enough
- Always include the date (format: Month DD, YYYY)

**Good example:**
> ✅ "The customer profile page now shows the business owner's name separately for sole proprietorship accounts."

**Bad example:**
> ❌ "Updated isSolePropType conditional in EditCustomerInfoModal to render proprietor name fields."

**Format to use:**
```
## Month DD, YYYY

### Short title of what was done

**What's new for staff:**
- Bullet 1
- Bullet 2

**Why it matters:**
One or two sentences explaining the benefit to the bank or BSP compliance.
```

---

## RULE 2 — Save Session Memory After Significant Tasks

After completing any significant feature or fix, save a memory file at:
`C:\Users\Mis Assistant2\.claude\projects\C--www-project-sigcard\memory\`

Keep the `project_current_work.md` file updated with what is in progress so the next session can continue without asking "where were we?"

---

## RULE 3 — Read at the Start of Every Session

When starting a new conversation:
1. Read `ACCOMPLISHMENTS.md` — understand recent completed work
2. Read `memory/project_current_work.md` — see what was left unfinished
3. Greet the user and briefly summarize: "Last time we worked on X. What would you like to do today?"

---

## RULE 4 — Before Context Fills Up

If the conversation is growing very long or approaching limits:
1. Save a memory file describing exactly what task is in progress and what step we are on
2. Note any files that were modified but not yet tested
3. Update `project_current_work.md` so the next session can continue

---

## Writing Style for This Bank

The users at RBT Bank are bank staff — tellers, branch managers, compliance officers.
They understand banking terms (BSP, dormancy, escheat, sigcard, NAIS) but NOT software terms.

When explaining changes, always use banking language:
- "signature card" not "sigcard document record"
- "business account" not "corporate entity record"
- "the screen" not "the component"
- "shows up" not "renders"
- "the save button" not "the submit handler"
