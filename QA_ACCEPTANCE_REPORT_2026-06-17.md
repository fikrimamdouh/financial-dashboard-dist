# QA Acceptance Report — financial-dashboard-dist

Date: 2026-06-17
Scope: Frontend + financial logic + QA acceptance review for the current static HTML distribution.

## Final decision

غير جاهز للتشغيل كأداة تحليل مالي وفني للشركات.

The project is usable as a prototype/demo, but not as a production financial analysis tool because one blocker can produce misleading accounting results: an unbalanced trial balance may be accepted and auto-corrected through a suspense/difference account without hard stop.

## Files reviewed

- `index.html`
- `company-setup.html`
- `data-ingestion.html`
- `account-mapping.html`
- `consolidation-cockpit.html`
- `reporting-pantheon.html`
- `zakat-diwan.html`
- `vat-center.html`
- `dataPipeline.js`
- `css/polaris-theme.css`

## Fixes applied

### 1. `dataPipeline.js`

Applied a limited QA hardening patch:

- Removed non-operational placeholder workflow stages from the enforced stage list.
- Added aliases for existing operational pages/stages.
- Added explicit notice that browser-side encrypted `localStorage` is obfuscation only, not real data security.
- Hardened numeric parsing for values with commas, spaces, parentheses, and symbols.
- Hardened trial balance calculation to support:
  - closing debit/credit columns
  - opening + movement debit/credit columns
  - calculated balance
  - book balance
  - debit/credit columns
- Added signed and absolute trial-balance differences.
- Expanded abnormal balance checks for expenses, cost of revenue, equity, and revenue.
- Adjusted revenue/expense profit calculation to avoid negative sign distortion.

Commit: `79f589f6e82c37f175b3bef9a68d4017c017d035`

## Blocking findings

### B1 — Unbalanced trial balance can still proceed

File: `data-ingestion.html`

Observed logic:

- `validateTrialBalance()` calculates debit/credit difference.
- If the trial balance is unbalanced, the UI says “قبول مع فارق”.
- The returned object still sets `isValid: true`.
- `updateAndLog()` treats `validationResult.isValid === true` as a valid upload.
- `checkCompletion()` then enables the next step.
- `processAndProceed()` creates `SUSP-001` automatically for the difference.

Risk:

This can turn a bad source file into apparently balanced downstream statements. That is not acceptable for financial QA.

Required production fix:

- Unbalanced TB must block next step by default.
- Suspense account creation must require explicit reviewer approval and visible audit note.
- The difference must remain flagged in every downstream report until resolved.

Status: not fixed automatically because this changes the accounting approval policy, not just a technical break.

### B2 — Current workflow is inconsistent between pages and pipeline

Files:

- `company-setup.html`
- `data-ingestion.html`
- `account-mapping.html`
- `consolidation-cockpit.html`
- `reporting-pantheon.html`
- `dataPipeline.js`

Observed:

- `company-setup.html` saves `client-info` and sends the user to `data-ingestion.html`.
- `data-ingestion.html` sends the user to `account-mapping.html`.
- `dataPipeline.js` previously referenced placeholder stages that had no live files.

Fix applied:

- `dataPipeline.js` now maps the real operational path to three stages:
  - `client-info`
  - `trial-balance`
  - `reports`

Remaining risk:

Some pages still do not declare `data-step` on `<body>`, so page-level enforcement is incomplete until those pages are patched.

### B3 — CDN dependency prevents offline reliability

Files affected:

- `index.html`
- `company-setup.html`
- `data-ingestion.html`
- `account-mapping.html`
- `consolidation-cockpit.html`
- `reporting-pantheon.html`

Libraries loaded externally include Bootstrap, FontAwesome, GSAP, CryptoJS, XLSX, Chart.js, jsPDF, html2canvas, html2pdf, and pptxgen.

Risk:

Offline operation will fail partially or completely. Excel upload/export, PDF export, icons, styling, charts, and encryption utilities can break without internet.

Status:

No local vendoring applied because that is a distribution change, not a minimal hotfix.

### B4 — `localStorage` encryption is not real security

File: `dataPipeline.js`

Risk:

The encryption key ships inside client-side JavaScript, so any user can read it. This protects against casual viewing only, not against a browser user, injected script, shared machine, or compromised device.

Fix applied:

A clear code-level notice was added to avoid treating this as protection for sensitive financial records.

## Non-blocking but required cleanup before production

### N1 — Duplicate closing body in `index.html`

File: `index.html`

Observed:

`</body>` appears twice at the end of the file.

Risk:

Usually tolerated by browsers, but invalid HTML and a sign of uncontrolled generated edits.

Status:

Not patched because replacing the whole large static file through the available connector would increase risk. Safe to fix manually by deleting the duplicate closing tag.

### N2 — Extra CSS brace in `consolidation-cockpit.html`

File: `consolidation-cockpit.html`

Observed:

An extra `}` appears after button disabled styling.

Risk:

Can break or prematurely close the CSS block depending on parser recovery.

Status:

Not patched through connector for the same reason: large static file replacement risk.

### N3 — Duplicate external libraries in `reporting-pantheon.html`

File: `reporting-pantheon.html`

Observed:

`html2pdf`, `html2canvas`, and `xlsx` are loaded more than once.

Risk:

Unnecessary network requests, unpredictable load timing, slower startup.

Status:

Cleanup recommended before production.

### N4 — “100% جاهزة للعمل” and “IFRS” claims are not supported by audit evidence

File: `reporting-pantheon.html`

Observed:

The page shows readiness and IFRS claims in static cards.

Risk:

This overstates assurance. The current QA result does not support these claims.

Required change:

Replace with conditional status derived from actual QA checks, or neutral wording.

## Test result matrix

| Area | Result | Reason |
|---|---|---|
| Static loading | Partial pass | Pages exist, but invalid HTML/CSS cleanup remains. |
| Workflow | Partial pass | Main pages exist, pipeline hardened, page `data-step` enforcement still incomplete. |
| Excel ingestion | Partial pass | XLSX parsing and column mapping exist, but acceptance policy is unsafe for unbalanced TB. |
| Trial balance logic | Fail | Unbalanced TB can proceed and auto-suspense can mask source error. |
| Save/restore | Partial pass | Uses localStorage; subject to browser storage limits and no real security boundary. |
| Export | Partial pass | Depends on CDN libraries. Not reliable offline. |
| Offline readiness | Fail | External CDN dependency remains. |
| Security | Fail for sensitive data | Client-side encryption key is visible. |
| Production readiness | Fail | Accounting blocker remains. |

## Required go-live gates

Before using this with real company financial data:

1. Block unbalanced trial balances by default.
2. Require explicit approval before creating any suspense/difference account.
3. Add `data-step` to operational pages and enforce navigation consistently.
4. Remove duplicate HTML/CSS defects.
5. Vendor external libraries locally if offline use is required.
6. Remove or qualify unsupported claims such as “100% ready” and “IFRS compliant”.
7. Add a sample Excel QA pack with:
   - balanced TB
   - unbalanced TB
   - missing account number/name
   - Arabic account names
   - comma-formatted amounts
   - negative/parentheses amounts
   - group-company upload
8. Run browser console test on all operational pages with no fatal JavaScript errors.

## Final classification

غير جاهز للتشغيل.

Reason: financial acceptance logic can permit materially misleading downstream reporting.
