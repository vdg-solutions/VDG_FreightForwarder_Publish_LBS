# Manager First Login — Workspace Setup

## Overview

When a manager signs in for the first time, the app detects no workspace folder and
launches the provisioning wizard automatically at `#/onboarding`.

## Step-by-Step

### Step 1 — Sign In

1. Open the app URL
2. Click "Sign in with Google" — use the manager Google account
3. Grant Drive access when prompted (scope: `drive.file`)

![Step 1: Google sign-in](./img/onboarding-step1.png)

### Step 2 — Workspace Detection

After sign-in, the app probes Drive for a folder named `VDG-FreightForwarder-Dev`.
If absent, it redirects to `#/onboarding` automatically.

![Step 2: Workspace missing detected](./img/onboarding-step2.png)

### Step 3 — Folder Scaffolding

The wizard creates the workspace structure. Steps appear with a spinner then ✓:

- Tạo thư mục gốc: `VDG-FreightForwarder-Dev/`
- Tạo cấu trúc: `users/`, `shared/`, `shared/masters/`, `shared/audit/`, `admin/`, etc.

Each step is idempotent — safe to retry if a step fails (folder already exists = skip).

![Step 3: Folder creation checklist](./img/onboarding-step3.png)

### Step 4 — Invite Sales

1. Enter sales rep email in the "Mời Sales" input
2. Click "Mời Sales"
3. App creates `users/<email-prefix>/` subfolder and grants Editor access
4. Confirmation appears in the invited list below

Repeat for all sales reps. Each invite is logged to `admin/permission-grants.jsonl`.

![Step 4: Invite sales form](./img/onboarding-step4.png)

### Step 5 — Done

Click "Hoàn thành" to proceed to the main dashboard.

## Retry Guidance

The wizard is safe to re-run. It checks each folder before creating it (`findFolder`
before `createFolder`). Partial completions can resume from where they left off.

## Permissions

Manager retains ownership of all folders. Sales reps receive `writer` (Editor) on
their personal `users/<prefix>/` subfolder only — they cannot access other reps' data.
