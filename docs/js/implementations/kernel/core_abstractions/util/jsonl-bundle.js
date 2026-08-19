// jsonl-bundle.js — the JSONL bundle codec. Pure: no DOM, no Drive, no server. Split out of
// drive-api.js at the 350-line cap; drive-api re-exports it so existing importers keep resolving.

export function parseJsonlBundle(text) {
  if (!text) return [];
  return text.split('\n')
    .filter((l) => l.trim())
    .reduce((acc, line) => {
      try { acc.push(JSON.parse(line)); }
      catch { console.warn('[jsonl] malformed JSONL line skipped:', line.slice(0, 80)); } // DEV
      return acc;
    }, []);
}

export function serializeJsonlBundle(entities) {
  return entities.map((e) => JSON.stringify(e)).join('\n') + '\n';
}
