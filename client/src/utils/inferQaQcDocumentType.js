import { openPdfFromFile } from '@/lib/pdfjsClient';

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'document', 'report', 'checklist', 'process',
  'pdf', 'docx', 'doc', 'txt', 'csv', 'png', 'jpg', 'jpeg',
]);

/** Extra phrases that map to a canonical document type label. */
const ALIASES = {
  pfd: 'Process Flow Diagram (PFD)',
  'process flow diagram': 'Process Flow Diagram (PFD)',
  pid: 'P&ID',
  'p id': 'P&ID',
  'p and id': 'P&ID',
  'piping and instrumentation': 'P&ID',
  hmb: 'Heat and Material Balance',
  'heat and material balance': 'Heat and Material Balance',
  'mass balance': 'Heat and Material Balance',
  'design basis': 'Process Design Basis',
  pdb: 'Process Design Basis',
  'cause and effect': 'Cause and Effect Matrix',
  'c and e': 'Cause and Effect Matrix',
  psv: 'PSV / Relief and Blowdown Study',
  'relief and blowdown': 'PSV / Relief and Blowdown Study',
  'blowdown study': 'PSV / Relief and Blowdown Study',
  sld: 'Single Line Diagram (SLD)',
  'single line': 'Single Line Diagram (SLD)',
  hazop: 'HAZOP Report',
  'i o list': 'I/O List',
  'io list': 'I/O List',
  isometric: 'Piping Isometric',
  iso: 'Piping Isometric',
  itp: 'Inspection & Test Plan (ITP)',
  'inspection and test plan': 'Inspection & Test Plan (ITP)',
  'method statement': 'Method Statement',
  'quality plan': 'Quality Plan',
  'material requisition': 'Material Requisition',
  'vendor document': 'Vendor Document',
  'technical query': 'Technical Query (TQ)',
  tq: 'Technical Query (TQ)',
  transmittal: 'Document Transmittal',
};

function normalizePhrase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTypeAgainstHaystack(type, hay) {
  const n = normalizePhrase(type);
  if (!n || !hay) return 0;
  let score = 0;
  if (hay.includes(n)) score += Math.max(n.length, 8);
  n.split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .forEach((token) => {
      if (hay.includes(token)) score += token.length;
    });
  return score;
}

function resolveAlias(hay, types) {
  const typeSet = new Set(types || []);
  let best = '';
  let bestLen = 0;
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (!hay.includes(alias)) continue;
    if (!typeSet.has(canonical)) {
      // Prefer an available type that shares significant tokens with the alias target
      const target = normalizePhrase(canonical);
      const match = (types || []).find((t) => {
        const n = normalizePhrase(t);
        return n === target || target.includes(n) || n.includes(target.split(' ')[0] || '');
      });
      if (!match) continue;
      if (alias.length > bestLen) {
        bestLen = alias.length;
        best = match;
      }
      continue;
    }
    if (alias.length > bestLen) {
      bestLen = alias.length;
      best = canonical;
    }
  }
  return best;
}

export function inferDocumentTypeFromHaystack(haystack, types) {
  const hay = normalizePhrase(haystack);
  if (!hay || !types?.length) return '';

  const aliasHit = resolveAlias(hay, types);
  if (aliasHit) return aliasHit;

  let best = '';
  let bestScore = 0;
  for (const type of types) {
    const score = scoreTypeAgainstHaystack(type, hay);
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return bestScore >= 4 ? best : '';
}

async function extractPdfSnippet(file, maxPages = 3) {
  if ((file?.size || 0) > 20 * 1024 * 1024) return '';
  let objectUrl = '';
  try {
    const opened = await openPdfFromFile(file);
    objectUrl = opened.objectUrl;
    const { pdf } = opened;
    const pageCount = Math.min(pdf.numPages || 0, maxPages);
    const chunks = [];
    for (let i = 1; i <= pageCount; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items || [])
        .map((item) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ');
      if (text.trim()) chunks.push(text);
    }
    return chunks.join('\n').slice(0, 8000);
  } catch {
    return '';
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

async function extractPlainTextSnippet(file) {
  try {
    const text = await file.text();
    return String(text || '').slice(0, 8000);
  } catch {
    return '';
  }
}

async function extractFileSnippet(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return extractPdfSnippet(file);
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.xml')
  ) {
    return extractPlainTextSnippet(file);
  }
  return '';
}

/**
 * Infer document type from filename and file content.
 * Always returns a type when `types` is non-empty (falls back to first type).
 */
export async function inferDocumentTypeFromFile(file, types) {
  const list = Array.isArray(types) ? types.filter(Boolean) : [];
  if (!list.length) return { type: '', source: '' };

  const fromName = inferDocumentTypeFromHaystack(file?.name, list);
  if (fromName) return { type: fromName, source: 'filename' };

  const snippet = await extractFileSnippet(file);
  if (snippet) {
    const fromText = inferDocumentTypeFromHaystack(snippet, list);
    if (fromText) return { type: fromText, source: 'document' };
  }

  // Always auto-pick something so analysis can start; user can change it.
  return { type: list[0], source: 'default' };
}
