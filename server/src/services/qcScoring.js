const WEIGHTS = {
  qa: 0.25,
  technical: 0.35,
  rule: 0.30,
  interface: 0.10,
};

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function clampPercent(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function splitCells(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isDivider(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function statusToPoints(status) {
  const s = String(status || '').toLowerCase().trim();
  if (!s) return null;
  if (/\bn\/?a\b|not\s+applicable/.test(s)) return null;
  if (/not\s*ok|fail|non.?compliant|reject/.test(s)) return 0;
  if (/partial|hold|open/.test(s)) return 7.5;
  if (/^ok$|pass|compliant|complete|yes/.test(s)) return 10;
  return null;
}

function parseScoreCell(cell) {
  const s = String(cell || '').trim();
  if (!s || /^[-—–]$/.test(s)) return null;
  const pct = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { percent: Number(pct[1]) };
  const over10 = s.match(/(\d+(?:\.\d+)?)\s*\/\s*10\b/);
  if (over10) return { points: Number(over10[1]) };
  const over100 = s.match(/(\d+(?:\.\d+)?)\s*\/\s*100\b/);
  if (over100) return { percent: Number(over100[1]) };
  if (!/^\d+(?:\.\d+)?$/.test(s)) return null;
  const v = Number(s);
  if (v > 10) return { percent: v };
  return { points: v };
}

function toPercent(parsed, statusPoints) {
  if (parsed?.percent != null) return clampPercent(parsed.percent);
  if (parsed?.points != null) return clampPercent((parsed.points / 10) * 100);
  if (statusPoints != null) return clampPercent((statusPoints / 10) * 100);
  return null;
}

function headerIndex(header, pattern) {
  return header.findIndex((h) => pattern.test(String(h || '').toLowerCase()));
}

function averageTablePercent(header, rows) {
  const statusIdx = headerIndex(header, /^status$|result/);
  const scoreIdx = headerIndex(header, /^score$|pts|points/);
  const percents = [];
  rows.forEach((row) => {
    const status = statusIdx >= 0 ? row[statusIdx] : '';
    if (/\bn\/?a\b|not\s+applicable/i.test(String(status || ''))) return;
    const parsed = scoreIdx >= 0 ? parseScoreCell(row[scoreIdx]) : null;
    const percent = toPercent(parsed, statusToPoints(status));
    if (percent != null) percents.push(percent);
  });
  if (!percents.length) return null;
  return round1(percents.reduce((a, b) => a + b, 0) / percents.length);
}

function detectSection(line) {
  const t = String(line || '');
  if (/section\s*2\b|executive summary/i.test(t)) return 'dashboard';
  if (/section\s*4\b|check-?\s*1/i.test(t)) return 'check1';
  if (/section\s*5\b|check-?\s*2|technical deep/i.test(t)) return 'check2';
  if (/section\s*6\b|rule engine/i.test(t)) return 'rule';
  if (/section\s*7\b|consolidated scoring/i.test(t)) return 'scoring';
  if (/^#{1,3}\s*7\.1\b/i.test(t)) return 'component';
  return null;
}

function classifyTable(header, section) {
  const h = header.map((c) => String(c || '').toLowerCase()).join(' | ');
  if (/question id|\bquestion\b/.test(h)) return 'check2';
  if (/check id/.test(h)) return 'check1';
  if (/rule id/.test(h)) return 'rule';
  if (/component/.test(h) && /weight/.test(h)) return 'component';
  if (/metric/.test(h) && /value/.test(h)) return 'dashboard';
  if (section === 'check1' || section === 'check2' || section === 'rule' || section === 'dashboard') return section;
  return 'other';
}

function parseTables(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const tables = [];
  let section = '';
  let i = 0;
  while (i < lines.length) {
    const detected = detectSection(lines[i]);
    if (detected) section = detected;
    if (isTableLine(lines[i]) && isDivider(lines[i + 1] || '')) {
      const header = splitCells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableLine(lines[i]) && !isDivider(lines[i])) {
        rows.push(splitCells(lines[i]));
        i += 1;
      }
      tables.push({ kind: classifyTable(header, section), header, rows });
      continue;
    }
    i += 1;
  }
  return tables;
}

function parseNamedScore(markdown, name) {
  const re = new RegExp(`\\|\\s*${name}\\s*\\|\\s*([^|\\n]+)\\|`, 'i');
  const m = String(markdown || '').match(re);
  if (!m) return null;
  const cell = m[1];
  const parsed = parseScoreCell(cell);
  return toPercent(parsed, null);
}

function hasSupportDocument(flag) {
  if (typeof flag === 'boolean') return flag;
  const v = String(flag || '').trim();
  if (!v) return false;
  return !/^(not provided|n\/a|none|-)$/i.test(v);
}

function computeComponentScores(markdown, options = {}) {
  const tables = parseTables(markdown);
  let qa = null;
  let technical = null;
  let rule = null;
  let iface = null;

  tables.forEach((table) => {
    if (table.kind === 'check1' && qa == null) qa = averageTablePercent(table.header, table.rows);
    if (table.kind === 'check2' && technical == null) technical = averageTablePercent(table.header, table.rows);
    if (table.kind === 'rule' && rule == null) rule = averageTablePercent(table.header, table.rows);
  });

  if (qa == null) qa = parseNamedScore(markdown, 'QA Score');
  if (technical == null) technical = parseNamedScore(markdown, 'Technical Score');
  if (rule == null) rule = parseNamedScore(markdown, 'Rule Score');
  iface = parseNamedScore(markdown, 'Interface Score');

  const support = hasSupportDocument(options.hasSupportDocument);
  if (!support) iface = 100;
  else if (iface == null) iface = 100;

  const fallback = [qa, technical, rule].filter((n) => n != null);
  const fill = fallback.length ? round1(fallback.reduce((a, b) => a + b, 0) / fallback.length) : 0;
  qa = qa == null ? fill : qa;
  technical = technical == null ? fill : technical;
  rule = rule == null ? fill : rule;
  iface = iface == null ? fill : iface;

  const weighted = {
    qa: round2(qa * WEIGHTS.qa),
    technical: round2(technical * WEIGHTS.technical),
    rule: round2(rule * WEIGHTS.rule),
    interface: round2(iface * WEIGHTS.interface),
  };
  const finalExact = qa * WEIGHTS.qa + technical * WEIGHTS.technical + rule * WEIGHTS.rule + iface * WEIGHTS.interface;
  return {
    qa: round1(qa),
    technical: round1(technical),
    rule: round1(rule),
    interface: round1(iface),
    weighted,
    final: Math.round(clampPercent(finalExact) ?? 0),
    finalExact: round2(finalExact),
  };
}

function buildSection7(scores) {
  const { qa, technical, rule, interface: iface, weighted, final, finalExact } = scores;
  return [
    '## SECTION 7: CONSOLIDATED SCORING',
    '',
    '### 7.1 Component Scores',
    '',
    '| Component | Score (%) | Weight | Weighted Score |',
    '| --- | --- | --- | --- |',
    `| QA Score (Check-1) | ${qa.toFixed(1)} | 25% | ${weighted.qa.toFixed(2)} |`,
    `| Technical Score (Check-2) | ${technical.toFixed(1)} | 35% | ${weighted.technical.toFixed(2)} |`,
    `| Rule Score | ${rule.toFixed(1)} | 30% | ${weighted.rule.toFixed(2)} |`,
    `| Interface Score | ${iface.toFixed(1)} | 10% | ${weighted.interface.toFixed(2)} |`,
    '',
    '### 7.2 Weighting Formula',
    '',
    'Final QC Score = (QA Score × 0.25) + (Technical Score × 0.35) + (Rule Score × 0.30) + (Interface Score × 0.10)',
    '',
    '### 7.3 Final QC Score',
    '',
    `**${final}%**`,
    '',
    `| Item | Value |`,
    '| --- | --- |',
    `| Final QC Score | ${final}% |`,
    '',
    `= (${qa.toFixed(1)} × 0.25) + (${technical.toFixed(1)} × 0.35) + (${rule.toFixed(1)} × 0.30) + (${iface.toFixed(1)} × 0.10)`,
    `= ${weighted.qa.toFixed(2)} + ${weighted.technical.toFixed(2)} + ${weighted.rule.toFixed(2)} + ${weighted.interface.toFixed(2)}`,
    `= **${finalExact.toFixed(2)} → ${final}%**`,
  ].join('\n');
}

function majorSectionNumber(line) {
  const t = String(line || '');
  if (/^#{1,3}\s*\d+\.\d/.test(t)) return null;
  const m = t.match(/^#{1,3}\s*(?:SECTION\s*)?(\d{1,2})\b/i);
  if (!m) return null;
  return Number(m[1]);
}

function replaceSection7(markdown, section7) {
  const lines = String(markdown || '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (majorSectionNumber(lines[i]) === 7) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    start = lines.findIndex((line) => /^#{1,3}\s*7\.[123]\b/i.test(line));
  }
  if (start >= 0) {
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      const n = majorSectionNumber(lines[i]);
      if (n != null && n !== 7) {
        end = i;
        break;
      }
    }
    return [...lines.slice(0, start), section7.trim(), '', ...lines.slice(end)].join('\n');
  }
  for (let i = 0; i < lines.length; i += 1) {
    if (majorSectionNumber(lines[i]) === 8) {
      return [...lines.slice(0, i), section7.trim(), '', ...lines.slice(i)].join('\n');
    }
  }
  return `${String(markdown || '').trim()}\n\n${section7.trim()}\n`;
}

function updateDashboardScores(markdown, scores) {
  const replacements = [
    ['QA Score', scores.qa.toFixed(1)],
    ['Technical Score', scores.technical.toFixed(1)],
    ['Rule Score', scores.rule.toFixed(1)],
    ['Interface Score', scores.interface.toFixed(1)],
    ['Final QC Score', String(scores.final)],
  ];
  let out = String(markdown || '');
  replacements.forEach(([name, value]) => {
    out = out.replace(
      new RegExp(`(\\|\\s*${name}\\s*\\|\\s*)[^|\\n]+`, 'i'),
      `$1${value} `,
    );
  });
  return out;
}

function applyConsolidatedScoring(markdown, options = {}) {
  const scores = computeComponentScores(markdown, options);
  const withDashboard = updateDashboardScores(markdown, scores);
  return replaceSection7(withDashboard, buildSection7(scores));
}

function extractScoreFromMarkdown(markdown) {
  const text = String(markdown || '');

  const tableHits = [...text.matchAll(/\|\s*Final\s+QC\s+Score\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*%?\s*\|/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  if (tableHits.length) {
    return Math.max(0, Math.min(100, Math.round(tableHits[tableHits.length - 1])));
  }

  const blockMatch = text.match(/#{0,3}\s*7\.3\s+Final\s+QC\s+Score([\s\S]{0,900}?)(?=\n#{1,3}\s|\n---|\s*$)/i);
  if (blockMatch) {
    const percents = [...blockMatch[1].matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)]
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100 && ![10, 25, 30, 35].includes(n));
    if (percents.length) return Math.max(0, Math.min(100, Math.round(percents[percents.length - 1])));
  }

  const labeled = [...text.matchAll(/Final\s+QC\s+Score\s*[:|]?\s*(\d{1,3}(?:\.\d+)?)\s*%/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100 && n !== 25 && n !== 35 && n !== 30 && n !== 10);
  if (labeled.length) return Math.max(0, Math.min(100, Math.round(labeled[labeled.length - 1])));

  return null;
}

function withCorrectedScoring(record) {
  if (!record?.report_markdown) return record;
  return {
    ...record,
    report_markdown: applyConsolidatedScoring(record.report_markdown, {
      hasSupportDocument: record.support_document_name,
    }),
  };
}

module.exports = {
  WEIGHTS,
  applyConsolidatedScoring,
  computeComponentScores,
  extractScoreFromMarkdown,
  withCorrectedScoring,
};
