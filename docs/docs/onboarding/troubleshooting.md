# Troubleshooting

## 403 on Drive Probe

**Symptom:** App shows "Account chưa được cấp quyền" immediately after sign-in.

**Cause:** The `users/<prefix>/` folder hasn't been shared with this account yet, or
Drive permission hasn't propagated.

**Fix:**
1. Manager signs in and opens `#/onboarding`
2. Re-invite the affected email in the "Mời Sales" section
3. Sales rep signs out, waits 60 seconds, signs back in

If the 403 is on `admin/` folder: only the manager account should see admin access.
Non-manager accounts getting 403 on admin/ is expected (correct behavior).

---

## 401 / Token Expired

**Symptom:** API calls fail with 401 or "vdg:auth-expired" dispatched, app redirects
to login.

**Cause:** OAuth access token expired (Drive tokens expire in 1 hour). Silent refresh
failed (blocked popup, network down).

**Fix:**
1. Sign out via the user menu dropdown
2. Sign back in with Google
3. Note: role cache has 5-minute TTL — if role appears wrong after re-login, wait
   5 minutes or use `?debug=1` → "Refresh Role" button to force re-detect.

---

## 429 Rate Limit

**Symptom:** Sync operations slow or failing with "rate limit" error.

**Cause:** Drive API quota exceeded (100 req/100s per user).

**Fix:**
- App auto-retries with backoff: 1s → 2s → 4s (outbox) or 1s → 2s → 4s (driveFetch).
- If persistent, wait 1 minute before retrying.
- Check outbox badge in topbar — "N pending sync" means retries are queued.
- Force retry: go online → outbox drain triggers automatically.

---

## Workspace Not Found

**Symptom:** Sales rep sees "Workspace chưa được khởi tạo — liên hệ manager".

**Cause:** Manager has not yet run the provisioning wizard.

**Fix:**
1. Manager signs in with their Google account
2. App auto-detects missing workspace and opens `#/onboarding`
3. Complete wizard (Steps 1–2 create folder structure)
4. Invite sales reps (Step 3)
5. Sales reps can now sign in successfully

---

## Service Worker Update

**Symptom:** Blue banner at top of page: "Có bản cập nhật — Tải lại".

**Action:** Click "Tải lại" to apply the update. App reloads with new version.
If you dismiss the banner, it reappears on the next page load until update is applied.

---

## Drive Storage Quota Warning

**Symptom:** Red "⚠ Drive quota" chip appears in the topbar.

**Cause:** Your Google account's Drive storage is > 80% full. The app writes JSONL
bundles and WASM cache to Drive; running out of space will block sync.

**Fix:**
1. Click the chip — it links directly to [Google One](https://one.google.com/storage).
2. Upgrade your storage plan (100 GB plan costs ~$2.79/month).
3. Alternatively, delete large files elsewhere in your Drive to free space.

The check runs once per week (piggybacked on the delta-poll timer).
Clearing browser cache does **not** reset the check — it reads Drive quota directly.
