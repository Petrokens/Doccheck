import React, { useMemo } from 'react';

const parseInline = (text) => {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={index} className="rounded bg-gray-100 px-1 dark:bg-gray-800">
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

export default function ReportMarkdownView({ markdown, variant = 'document' }) {
  const blocks = useMemo(() => {
    const lines = String(markdown || '').split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1] || '')) {
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
      if (/^###\s+/.test(line)) out.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      else if (/^##\s+/.test(line)) out.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      else if (/^#\s+/.test(line)) out.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
      else if (/^\s*[-*]\s+/.test(line)) out.push({ type: 'li', text: line.replace(/^\s*[-*]\s+/, '') });
      else if (line.trim()) out.push({ type: 'p', text: line });
      else out.push({ type: 'br' });
      i += 1;
    }
    return out;
  }, [markdown]);

  const shell =
    variant === 'document'
      ? 'prose-report space-y-3 text-sm text-[#1f3a73] dark:text-slate-100'
      : 'space-y-2 text-sm';

  return (
    <div className={shell}>
      {blocks.map((block, index) => {
        if (block.type === 'h1') {
          return (
            <h1 key={index} className="text-xl font-bold text-[#0B4D99] dark:text-blue-300">
              {parseInline(block.text)}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={index} className="text-lg font-semibold text-[#153063] dark:text-white">
              {parseInline(block.text)}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={index} className="text-base font-semibold">
              {parseInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'li') {
          return (
            <li key={index} className="ml-5 list-disc">
              {parseInline(block.text)}
            </li>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-[#c4d2f0] dark:border-dash-border">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[#e8eef8] dark:bg-[#1c2533] dark:text-white">
                  <tr>
                    {block.header.map((cell, ci) => (
                      <th key={ci} className="px-3 py-2 font-semibold">
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className="odd:bg-white even:bg-[#f7faff] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 align-top">
                          {parseInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'br') return <div key={index} className="h-2" />;
        return (
          <p key={index} className="leading-relaxed">
            {parseInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
