import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

const parseInline = (text) => {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

function splitCells(line) {
  return String(line)
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function normalizeRow(cells, colCount) {
  const row = Array.isArray(cells) ? [...cells] : [];
  while (row.length < colCount) row.push('');
  return row.slice(0, colCount);
}

function columnKind(header) {
  const h = String(header || '').toLowerCase().trim();
  if (/^(s\.?\s*no|sno|sr\.?\s*no|#)$/.test(h)) return 'sno';
  if (/\bid\b|ref\.?|check\s*no|item\s*no|^#/.test(h)) return 'id';
  if (/severity|priority|category|class/.test(h)) return 'severity';
  if (/^status$|result|verdict/.test(h)) return 'status';
  if (/^score$|pts|points/.test(h)) return 'score';
  if (/^tag$|system|discipline/.test(h)) return 'tag';
  if (/remark|finding|comment|observation|note/.test(h)) return 'remarks';
  if (/description|question|requirement|check\s*item|criteria/.test(h)) return 'description';
  return 'default';
}

function thClass(kind) {
  const base = 'border-b border-border px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
  switch (kind) {
    case 'sno':
      return cn(base, 'w-[3.5rem] whitespace-nowrap text-center');
    case 'id':
      return cn(base, 'w-[6.5rem] whitespace-nowrap');
    case 'severity':
    case 'status':
    case 'score':
    case 'tag':
      return cn(base, 'w-[6rem] whitespace-nowrap text-center');
    case 'description':
      return cn(base, 'min-w-[14rem]');
    case 'remarks':
      return cn(base, 'min-w-[12rem]');
    default:
      return cn(base, 'min-w-[8rem]');
  }
}

function tdClass(kind) {
  const base = 'border-b border-border/70 px-3 py-2.5 align-top text-[12.5px] leading-snug text-foreground';
  switch (kind) {
    case 'sno':
      return cn(base, 'whitespace-nowrap text-center tabular-nums text-muted-foreground');
    case 'id':
      return cn(base, 'whitespace-nowrap font-mono text-[11px] font-medium text-primary print:text-black');
    case 'severity':
    case 'status':
    case 'score':
    case 'tag':
      return cn(base, 'whitespace-nowrap text-center');
    case 'description':
    case 'remarks':
      return cn(base, 'break-words');
    default:
      return cn(base, 'break-words');
  }
}

function StatusPill({ value, kind }) {
  const raw = String(value || '').trim();
  if (!raw || (kind !== 'status' && kind !== 'severity')) {
    return <>{parseInline(raw)}</>;
  }
  const key = raw.toLowerCase();
  let tone = 'bg-muted text-foreground print:bg-white print:text-black print:border print:border-black';
  if (kind === 'severity') {
    if (/critical|high/.test(key)) tone = 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 print:bg-white print:text-black print:border print:border-black';
    else if (/major|medium/.test(key)) tone = 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 print:bg-white print:text-black print:border print:border-black';
    else if (/minor|low/.test(key)) tone = 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300 print:bg-white print:text-black print:border print:border-black';
  } else if (kind === 'status') {
    if (/^ok$|pass|compliant|complete|yes/.test(key)) tone = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 print:bg-white print:text-black print:border print:border-black';
    else if (/not\s*ok|fail|non.?compliant|no\b|reject/.test(key)) tone = 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 print:bg-white print:text-black print:border print:border-black';
    else if (/partial|hold|n\/?a|open|review/.test(key)) tone = 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 print:bg-white print:text-black print:border print:border-black';
  }
  return (
    <span className={cn('inline-flex min-w-[4.25rem] items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold print:rounded-none', tone)}>
      {raw}
    </span>
  );
}

export default function ReportMarkdownView({ markdown, variant = 'document' }) {
  const blocks = useMemo(() => {
    const cleaned = String(markdown || '')
      .split(/\r?\n/)
      .filter((line, index) => {
        if (index >= 40) return true;
        const t = line.trim();
        if (!t) return true;
        if (/^#+\s*(PETROLENS|PETROLENZ)\b/i.test(t)) return false;
        if (/^#+\s*DOCCHECK AI QA\/QC REPORT ENGINE\s*$/i.test(t)) return false;
        if (/^#+\s*RULE-BASED ENGINEERING/i.test(t)) return false;
        if (/^#+\s*.+Discipline QA\/QC Report\s*$/i.test(t)) return false;
        if (/^\*\*Document type:\*\*/i.test(t)) return false;
        if (/^\*\*Main document/i.test(t)) return false;
        if (/^\*\*Support document/i.test(t)) return false;
        if (/^\*\*Generated at:\*\*/i.test(t)) return false;
        if (/^\d+\.\s+.+\.(pdf|docx|png|jpe?g|tif{1,2})\s*$/i.test(t)) return false;
        if (/^Not provided$/i.test(t)) return false;
        return true;
      });

    // Ensure a single canonical title at the top for document reports.
    const hasTitle = cleaned.some((line) => /^#+\s*DOCCHECK QA\/QC Report\s*$/i.test(line.trim()));
    let lines =
      variant === 'document' && !hasTitle
        ? ['# DOCCHECK QA/QC Report', ...cleaned]
        : [...cleaned];

    // Drop blank lines / horizontal rules immediately under the title.
    if (variant === 'document') {
      const titleIdx = lines.findIndex((line) => /^#+\s*DOCCHECK QA\/QC Report\s*$/i.test(line.trim()));
      if (titleIdx >= 0) {
        let end = titleIdx + 1;
        while (end < lines.length && (!lines[end].trim() || /^\s*---+\s*$/.test(lines[end]))) {
          end += 1;
        }
        lines = [...lines.slice(0, titleIdx + 1), ...lines.slice(end)];
      }
    }

    // Collapse runs of blank lines elsewhere to a single blank.
    const compacted = [];
    for (const line of lines) {
      if (!line.trim()) {
        if (compacted.length && compacted[compacted.length - 1].trim()) compacted.push('');
        continue;
      }
      compacted.push(line);
    }
    lines = compacted;

    const out = [];
    let i = 0;
    let listBuffer = [];

    const flushList = () => {
      if (!listBuffer.length) return;
      out.push({ type: 'ul', items: listBuffer });
      listBuffer = [];
    };

    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1] || '')) {
        flushList();
        const header = splitCells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          if (/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i])) {
            i += 1;
            continue;
          }
          rows.push(splitCells(lines[i]));
          i += 1;
        }
        out.push({ type: 'table', header, rows });
        continue;
      }
      if (/^\s*---+\s*$/.test(line)) {
        flushList();
        // Skip duplicate / leading HRs (common leftover after stripped report headers).
        if (out.length && out[out.length - 1].type !== 'hr' && out[out.length - 1].type !== 'h1') {
          out.push({ type: 'hr' });
        }
      } else if (/^###\s+/.test(line)) {
        flushList();
        out.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      } else if (/^##\s+/.test(line)) {
        flushList();
        out.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      } else if (/^#\s+/.test(line)) {
        flushList();
        out.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
      } else if (/^\s*[-*]\s+/.test(line)) {
        listBuffer.push(line.replace(/^\s*[-*]\s+/, ''));
      } else if (line.trim()) {
        flushList();
        out.push({ type: 'p', text: line });
      } else {
        flushList();
        // Only keep one spacer; never stack blank gaps under headings.
        if (out.length && out[out.length - 1].type !== 'br' && out[out.length - 1].type !== 'h1') {
          out.push({ type: 'br' });
        }
      }
      i += 1;
    }
    flushList();
    return out;
  }, [markdown, variant]);

  const shell =
    variant === 'document'
      ? 'prose-report mx-auto max-w-none space-y-3 rounded-lg border border-border/80 bg-card px-5 py-5 text-sm text-foreground shadow-sm print:rounded-none print:border-black print:bg-white print:text-black print:shadow-none sm:px-6 sm:py-6'
      : 'space-y-2 text-sm';

  return (
    <div className={shell}>
      {blocks.map((block, index) => {
        if (block.type === 'h1') {
          return (
            <h1 key={index} className="mb-1 border-b border-border pb-2 text-xl font-bold tracking-tight text-primary print:border-black print:text-black">
              {parseInline(block.text)}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={index} className="mt-1 border-b border-border/70 pb-1.5 text-base font-semibold tracking-tight text-foreground print:border-black print:text-black">
              {parseInline(block.text)}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={index} className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground print:text-black">
              {parseInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={index} className="space-y-1.5 pl-5">
              {block.items.map((item, li) => (
                <li key={li} className="list-disc leading-relaxed marker:text-primary/70 print:marker:text-black">
                  {parseInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'hr') {
          return <hr key={index} className="border-border" />;
        }
        if (block.type === 'table') {
          const hasSno = block.header.some((h) => columnKind(h) === 'sno');
          const headerSrc = hasSno ? block.header : ['S.No', ...block.header];
          const rowsSrc = hasSno
            ? block.rows
            : block.rows.map((row, ri) => [String(ri + 1), ...row]);
          const kinds = headerSrc.map(columnKind);
          const colCount = Math.max(headerSrc.length, ...rowsSrc.map((r) => r.length), 1);
          const header = normalizeRow(headerSrc, colCount);
          while (kinds.length < colCount) kinds.push('default');
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full min-w-[44rem] table-fixed border-collapse text-left">
                <colgroup>
                  {kinds.map((kind, ci) => {
                    let width = '18%';
                    if (kind === 'sno') width = '5%';
                    else if (kind === 'id') width = '9%';
                    else if (kind === 'severity' || kind === 'status' || kind === 'score' || kind === 'tag') width = '10%';
                    else if (kind === 'description') width = '28%';
                    else if (kind === 'remarks') width = '24%';
                    return <col key={ci} style={{ width }} />;
                  })}
                </colgroup>
                <thead className="bg-muted/80">
                  <tr>
                    {header.map((cell, ci) => (
                      <th key={ci} className={thClass(kinds[ci])}>
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsSrc.map((row, ri) => (
                    <tr key={ri} className="odd:bg-card even:bg-muted/35">
                      {normalizeRow(row, colCount).map((cell, ci) => (
                        <td key={ci} className={tdClass(kinds[ci])}>
                          <StatusPill value={cell} kind={kinds[ci]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'br') return <div key={index} className="h-1.5" />;
        return (
          <p key={index} className="leading-relaxed text-[13px] text-foreground/90">
            {parseInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
