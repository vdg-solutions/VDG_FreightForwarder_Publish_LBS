// doc-auto-detect.js — F-15-32 document type classification
// ForwarderPrefix list per document-master-data.md (F-15-28 partial)

const FORWARDER_PREFIXES = ['HCMOE', 'VDGFF', 'NAUR', 'PVNS']
  .sort((a, b) => b.length - a.length); // longest-match wins

const MAWB_RE = /^\d{3}-\d{8}$/;
const SCAC_RE = /^[A-Z]{4}\d{6,9}$/;

// → { docType: string|null, confidence: 'High'|'Medium'|'Low' }
export function classifyDocument(input, mode) {
  const s = (input || '').trim().toUpperCase();
  if (!s) return { docType: null, confidence: 'Low' };

  // 1. ForwarderPrefix — longest match wins
  for (const prefix of FORWARDER_PREFIXES) {
    if (s.startsWith(prefix)) {
      return { docType: mode === 'Air' ? 'HAWB' : 'HBL', confidence: 'High' };
    }
  }

  // 2. MAWB: 3-digit IATA + dash + 8-digit serial
  if (MAWB_RE.test(s)) return { docType: 'MAWB', confidence: 'High' };

  // 3. SCAC sea MBL: 4-alpha + 6-9 digits
  if (SCAC_RE.test(s)) return { docType: 'MBL', confidence: 'Medium' };

  return { docType: null, confidence: 'Low' };
}
