// F-24-14 — pure logic + lit template factory for the orphan-LBS-folder cleanup banner (PM
// Option B for the F-24-13 scope limitation: under drive.file scope the auto-heal can't
// resolve the real root id, so it picks a winner but can't prove ownership to safely delete
// the rest — duplicates persist until the user removes them by hand).
// `html`/`t` are received as params so this module has no lit CDN import (unit-testable,
// and safe for boot/ to import for computeOrphanCount alone) — mirrors topbar-sync-chip.js.

export const ORPHAN_EVENT = 'vdg:orphan-workspace-detected';
export const DISMISS_KEY  = 'vdg.orphan_banner_dismissed';
export const BANNER_Z     = 40;

// Pure — true when a previously-cached workspace id diverges from the freshly-resolved one
// (app is now pointing at a different LBS folder than last session).
export function detectOrphanFolderConflict(currentLbsId, storedLbsId) {
  if (!storedLbsId) return false;
  return storedLbsId !== currentLbsId;
}

// AC-01/AC-05 — orphan count from a raw owner-wide folder count; 1 folder = nothing orphaned.
export function computeOrphanCount(folderCount) {
  return Math.max(0, folderCount - 1);
}

// AC-05 — gate: only show when something is actually orphaned and not dismissed for this workspace.
export function shouldShowOrphanBanner(count, canonicalId, dismissedFor) {
  if (!count || count <= 0) return false;
  return dismissedFor !== canonicalId;
}

// AC-02 — lit template factory; `html`/`t` injected by caller (unit-testable, no CDN needed).
export function renderOrphanBanner({ html, t, count, onGoToDrive, onDismiss }) {
  const body = count === 1
    ? t('workspace.orphan_detected_body_singular')
    : t('workspace.orphan_detected_body_plural').replace('{count}', String(count));

  return html`
    <div
      role="alert"
      style="z-index:${BANNER_Z}"
      class="fixed top-0 left-0 right-0 flex flex-wrap items-center justify-center gap-3
             px-4 py-2.5 text-sm font-medium bg-amber-500 text-white"
    >
      <span aria-hidden="true">⚠️</span>
      <span><strong>${t('workspace.orphan_detected_title')}:</strong> ${body}</span>
      <button type="button" class="px-3 py-1 rounded bg-white/20 hover:bg-white/30" @click=${onGoToDrive}
        >${t('workspace.orphan_go_to_drive')}</button>
      <button type="button" class="px-3 py-1 rounded hover:bg-white/10" @click=${onDismiss}
        >${t('workspace.orphan_dismiss')}</button>
    </div>
  `;
}
