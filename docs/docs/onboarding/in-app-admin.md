# Admin Getting Started

## Prerequisites

- Google account with Drive access
- Manager grants you admin folder access (`admin/`) before first login
- Chrome or Edge recommended (Drive OAuth requires third-party cookies allowed)

---

## Step 1 — Workspace Setup

Open the app and sign in with Google. If no workspace exists the app redirects automatically to `#/onboarding`.

The wizard creates:

- `VDG-FreightForwarder-Dev/` — workspace root
- `users/` — one subfolder per sales rep
- `shared/masters/` — customers, carriers, services data
- `shared/audit/` — transition log
- `admin/` — permission grants log

Each step is idempotent — safe to retry. Click **Hoàn thành** when all steps show ✓.

---

## Step 2 — Invite Sales

Inside the `#/onboarding` wizard, enter each sales rep's Google email and click **Mời Sales**.

The app creates `users/<email-prefix>/` and grants Editor access. Each rep then signs in with their own account and the app recognises their role automatically.

Invitations are logged to `admin/permission-grants.jsonl`.

---

## Step 3 — Load Historical Data

Navigate to `#/sales/onboard`. Drop all legacy PNL Excel files one by one. The app detects format, previews shipments and lines, and waits for your confirmation before saving.

After import, customers and carriers discovered from the PNL files are written to `shared/masters/customers/` and `shared/masters/carriers/`.

---

## Step 4 — Master Data

Navigate to `#/masters/customers` to review auto-created customers. Use the **Merge into →** button to combine duplicates (select 2 rows with checkboxes, then merge).

Repeat at `#/masters/carriers` and `#/masters/services`.

---

## Daily Use

- `#/dashboard` — operational overview: exceptions, shipment counts, outbox sync status
- `#/sales/analytics` — revenue, margin, TTCN breakdown by sales rep and month
- Quotations awaiting approval appear with **⏳ Pending approval** badge in `#/sales/quote`
- Finance summaries at `#/finance`, credit at `#/finance/credit`, DEM/DET at `#/finance/demdet`
