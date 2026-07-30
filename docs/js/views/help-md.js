// F-33-01 — minimal markdown → HTML for the in-app guide (no external dep per OQ-4).
// Split out of help.js to keep the view file focused on tab chrome/wiring.

export function mdToHtml(md) {
  const lines = md.split('\n');
  const out   = [];
  let inList  = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === '---') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr class="my-4 border-slate-200" />');
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="text-sm font-semibold text-slate-800 mt-4 mb-1">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="text-base font-semibold text-slate-900 mt-5 mb-2">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1 class="text-lg font-bold text-slate-900 mt-2 mb-3">${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="text-sm text-slate-700 my-1 pl-4">${inline(line)}</p>`);
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1 my-2">'); inList = true; }
      out.push(`<li class="text-sm text-slate-700">${inline(line.slice(2))}</li>`);
      continue;
    }
    if (!line.trim()) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="my-1"></div>');
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p class="text-sm text-slate-700 my-1">${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono bg-slate-100 px-1 rounded text-xs">$1</code>')
    // image BEFORE link — "![alt](src)" would otherwise leave a stray "!" once the link
    // regex below eats the "[alt](src)" tail.
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" class="max-w-full rounded border border-slate-200 my-2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
}
