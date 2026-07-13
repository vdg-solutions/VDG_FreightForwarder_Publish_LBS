// F-15-09 — Workspace backup: zip all JSONL bundles → browser download

import { activeWorkspaceName } from './workspace-registry.js';
import { MASTER_REGISTRY } from '../data/master-registry.js';

const JSZIP_CDN          = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
// F-28-01: derived from the registry instead of a hand-maintained list — the old 3-item
// array silently skipped airports/flights/air-rates/ocean-carriers/etc from backup.
const TEAM_MASTER_KINDS   = Object.keys(MASTER_REGISTRY).filter((k) => MASTER_REGISTRY[k].audience === 'team');
const ABOUT_FIELDS       = 'storageQuota(limit,usage)';
const BUNDLE_FILE_NAME   = 'all.jsonl';
const MONTHLY_BUNDLE_RE  = /^\d{4}-\d{2}\.jsonl$/;
const ZIP_FILE_PREFIX    = 'vdg-workspace-backup-';

let _jszipLoaded = false;

// ── lazy CDN load ─────────────────────────────────────────────────────────────

async function _loadJsZip() {
  if (_jszipLoaded || window.JSZip) { _jszipLoaded = true; return; }
  await new Promise((res, rej) => {
    const s   = document.createElement('script');
    s.src     = JSZIP_CDN;
    s.onload  = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _jszipLoaded = true;
}

// ── folder traversal helpers ──────────────────────────────────────────────────

async function _listFilesInFolder(driveApi, folderId) {
  const q   = `'${folderId}' in parents and trashed=false`;
  const res = await driveApi.driveFetch(
    'GET',
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&spaces=drive`,
  );
  return res.files || [];
}

async function _collectBundles(driveApi, zip, folderId, zipPath) {
  const files = await _listFilesInFolder(driveApi, folderId);
  for (const f of files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      await _collectBundles(driveApi, zip, f.id, `${zipPath}/${f.name}`);
    } else if (f.name === BUNDLE_FILE_NAME || MONTHLY_BUNDLE_RE.test(f.name)) {
      const data = await driveApi.getFile(f.id);
      if (data?.content) zip.file(`${zipPath}/${f.name}`, data.content);
    }
  }
}

// ── progress callback type: (pct: number, label: string) => void ──────────────

/**
 * Export full workspace as zip. Downloads via browser.
 * @param {object} repo     — DriveEntityRepo (for TEAM_MASTER_KINDS listing)
 * @param {object} driveApi — drive-api module
 * @param {function} onProgress — (pct 0-100, label string) callback
 */
export async function exportWorkspace(repo, driveApi, onProgress = () => {}) {
  await _loadJsZip();
  const zip = new window.JSZip();

  onProgress(5, 'Locating workspace…');
  const rootId = await driveApi.findWorkspaceRoot(activeWorkspaceName());
  if (!rootId) throw new Error('Workspace root not found');

  // Masters
  onProgress(10, 'Exporting masters…');
  for (let i = 0; i < TEAM_MASTER_KINDS.length; i++) {
    const kind  = TEAM_MASTER_KINDS[i];
    const items = await repo.list(kind, null).catch(() => []);
    if (items.length > 0) {
      zip.file(`masters/${kind}/all.jsonl`, items.map((e) => JSON.stringify(e)).join('\n') + '\n');
    }
    onProgress(10 + Math.round((i + 1) / TEAM_MASTER_KINDS.length * 30), `Masters: ${kind}`);
  }

  // Users (monthly bundles) — traverse Drive folder tree
  onProgress(40, 'Exporting user bundles…');
  const usersFolder = await driveApi.findFolder
    ? null // fallback: collect via Drive tree
    : null;
  // Use Drive folder traversal for everything under workspace root
  await _collectBundles(driveApi, zip, rootId, 'workspace');

  onProgress(85, 'Packing zip…');
  const blob     = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const date     = new Date().toISOString().slice(0, 10);
  const filename = `${ZIP_FILE_PREFIX}${date}.zip`;

  onProgress(95, 'Downloading…');
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  onProgress(100, 'Done');
  return filename;
}
