const OpenAI = require('openai');
require('dotenv').config();

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const useGroq = Boolean(process.env.GROQ_API_KEY?.trim());

const client = new OpenAI({
  apiKey: useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: useGroq ? GROQ_BASE : undefined,
});

const chatModel = useGroq
  ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
  : (process.env.OPENAI_MODEL || 'gpt-4');

exports.callGPT = async (checklistItem, designText) => {
  if (!useGroq && !process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('Set GROQ_API_KEY or OPENAI_API_KEY in server/.env');
  }

  const prompt = `
You are a senior civil engineer evaluating a design basis report against a checklist item.

Checklist Item: "${checklistItem}"

Design Basis Extract:
"""
${designText.slice(0, 7000)}
"""

Rules:
- Answer strictly based on IS Codes and civil engineering practice.
- Response must be JSON:
{
  "checklist_item": "...",
  "result": "Yes" or "No",
  "confidence": 0.xx,
  "remark": "short explanation"
}
`;

  const res = await client.chat.completions.create({
    model: chatModel,
    messages: [{ role: 'user', content: prompt }],
  });

  const reply = res.choices[0].message.content;
  try {
    return JSON.parse(reply);
  } catch (e) {
    return {
      checklist_item: checklistItem,
      result: "No",
      confidence: 0.5,
      remark: "Failed to parse GPT output",
    };
  }
};

function parseModelJson(reply) {
  if (!reply || typeof reply !== 'string') throw new Error('Empty model response');
  let t = reply.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```/im.exec(t);
  if (fence) t = fence[1].trim();
  return JSON.parse(t);
}

/** Mandatory disclaimer appended to every structured QA/QC report (fixed wording). */
const MANDATORY_QC_DISCLAIMER =
  'This QA/QC report is system-generated based on a standardized checklist and automated review logic. Ensure that only the latest approved revisions of all documents, drawings, and references are used in the preparation of this deliverable. Each input shall be cross-verified against the official document register and confirmed with the respective owner before inclusion. Superseded or unverified inputs must not be used. While it provides a structured and objective assessment of the deliverable, it should not be relied upon as a sole basis for approval or construction. Professional engineering judgment, experience, and good engineering practices must be applied in conjunction with this report. Reviewers are advised to perform a thorough manual validation where applicable and consult relevant discipline experts or project authorities for critical observations.';

function buildSummaryFromStructuredReview(parsed) {
  const lines = [];
  const ex = String(parsed.executive_summary || parsed.summary || '').trim();
  if (ex) {
    lines.push('**Executive summary**', ex, '');
  }

  const dt = parsed.deliverable_type || parsed.deliverableType;
  if (dt) lines.push(`**Deliverable type:** ${dt}`, '');

  const c1 = parsed.check1 || {};
  const c1Score = Number(c1.check1_score_percent);
  if (Number.isFinite(c1Score)) {
    let band = 'Rejected';
    if (c1Score >= 95) band = 'Excellent';
    else if (c1Score >= 80) band = 'Minor Comments';
    else if (c1Score >= 70) band = 'Needs Revision';
    lines.push(`**CHECK-1 (QA/QC checks)** — score ${c1Score}% (${band} per banding: 95–100 Excellent, 80–94 Minor Comments, 70–79 Needs Revision, <69 Rejected)`, '');
  }
  const rows = Array.isArray(c1.rows) ? c1.rows : [];
  const rowPreview = rows.slice(0, 12);
  if (rowPreview.length) {
    lines.push('*Sample checkpoints (full detail in findings / JSON):*');
    rowPreview.forEach((r) => {
      const cp = r.checkpoint || r.check_point || r.Check_Point || '';
      const st = r.status || '';
      const rm = (r.remarks || '').slice(0, 120);
      lines.push(`- **${cp}** [${st}] ${rm}`);
    });
    if (rows.length > rowPreview.length) lines.push(`- … +${rows.length - rowPreview.length} more checkpoints`);
    lines.push('');
  }

  const c2 = parsed.check2 || {};
  const qs = Array.isArray(c2.questions) ? c2.questions : [];
  const sum = c2.summary || {};
  if (qs.length || sum.total_questions != null) {
    lines.push('**CHECK-2 (Technical review)**');
    lines.push(
      `Questions: ${sum.total_questions ?? qs.length} · Pass: ${sum.pass_count ?? '—'} · Warning: ${sum.warning_count ?? '—'} · Open: ${sum.open_issue_count ?? sum.open_count ?? '—'} · Technical score: ${sum.technical_score_percent ?? '—'}%`,
    );
    if (Array.isArray(sum.key_risks) && sum.key_risks.length) {
      lines.push('**Key risks:**', ...sum.key_risks.map((x) => `- ${x}`));
    }
    if (Array.isArray(sum.suggested_actions) && sum.suggested_actions.length) {
      lines.push('**Suggested actions:**', ...sum.suggested_actions.map((x) => `- ${x}`));
    }
    lines.push('');
  }

  const fin = parsed.final || {};
  if (Object.keys(fin).length) {
    lines.push('**Final consolidation**');
    if (fin.total_score_percent != null) lines.push(`**Total score:** ${fin.total_score_percent}%`);
    if (fin.verdict) lines.push(`**Verdict / stage gate:** ${fin.verdict}`);
    if (Array.isArray(fin.missing_inputs) && fin.missing_inputs.length) {
      lines.push('**Missing inputs:**', ...fin.missing_inputs.map((x) => `- ${x}`));
    }
    if (Array.isArray(fin.improvement_suggestions) && fin.improvement_suggestions.length) {
      lines.push('**Improvement suggestions:**', ...fin.improvement_suggestions.map((x) => `- ${x}`));
    }
    lines.push('');
  }

  lines.push('**Disclaimer**', MANDATORY_QC_DISCLAIMER);
  return lines.join('\n');
}

function collectFindingsFromStructured(parsed) {
  const out = [];
  const c1 = parsed.check1 || {};
  const rows = Array.isArray(c1.rows) ? c1.rows : [];
  rows.forEach((r) => {
    const st = (r.status || '').toLowerCase();
    if (st.includes('not ok') || st.includes('partial')) {
      out.push(`[CHECK-1] ${r.checkpoint || ''}: ${r.status} — ${(r.remarks || '').slice(0, 200)}`);
    }
  });
  const c2 = parsed.check2 || {};
  const qs = Array.isArray(c2.questions) ? c2.questions : [];
  qs.forEach((q) => {
    const st = (q.status || '').toLowerCase();
    if (st.includes('open') || st.includes('warning')) {
      out.push(`[CHECK-2 Q${q.q_no ?? '?'}] ${(q.question || '').slice(0, 120)}… — ${q.status}`);
    }
  });
  const kr = parsed.check2?.summary?.key_risks;
  if (Array.isArray(kr)) kr.forEach((x) => out.push(`[Risk] ${x}`));
  return out.map((x) => String(x).trim()).filter(Boolean).slice(0, 25);
}

function normalizeStructuredReview(parsed) {
  const fin = parsed.final || {};
  let score = Number(fin.total_score_percent ?? parsed.total_score_percent ?? parsed.score);
  let passed = Number(parsed.passed_out_of_20 ?? parsed.passed);
  let failed = Number(parsed.failed_out_of_20 ?? parsed.failed);

  const c2s = parsed.check2?.summary;
  if (!Number.isFinite(passed) && c2s && Number.isFinite(Number(c2s.pass_count)) && Number.isFinite(Number(c2s.total_questions))) {
    const tq = Math.max(1, Number(c2s.total_questions));
    passed = Math.round((Number(c2s.pass_count) / tq) * 20);
  }
  if (!Number.isFinite(failed) && Number.isFinite(passed)) failed = 20 - passed;
  if (!Number.isFinite(passed)) passed = 0;
  if (!Number.isFinite(failed)) failed = 20 - passed;
  passed = Math.min(20, Math.max(0, Math.round(passed)));
  failed = 20 - passed;

  if (!Number.isFinite(score)) {
    const t = Number(c2s?.technical_score_percent);
    const c1 = Number(parsed.check1?.check1_score_percent);
    if (Number.isFinite(t) && Number.isFinite(c1)) score = Math.round(c1 * 0.4 + t * 0.6);
    else if (Number.isFinite(t)) score = Math.round(t);
    else if (Number.isFinite(c1)) score = Math.round(c1);
    else score = Math.round((passed / 20) * 100);
  }
  score = Math.min(100, Math.max(0, Math.round(score)));

  const summary = buildSummaryFromStructuredReview(parsed);
  let findings = collectFindingsFromStructured(parsed);
  if (!findings.length && Array.isArray(parsed.findings)) {
    findings = parsed.findings.map((x) => String(x).trim()).filter(Boolean).slice(0, 25);
  }

  return { summary, findings, score, passed, failed };
}

/**
 * Senior QA/QC engineer review (EPC-style CHECK-1 + CHECK-2) for uploaded deliverable text/image.
 */
exports.callChecklistChatReview = async ({
  department,
  checklistTitle,
  supportDocuments,
  userNote,
  documentText,
  imageBase64,
  imageMime,
}) => {
  if (!useGroq && !process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('Set GROQ_API_KEY or OPENAI_API_KEY in server/.env');
  }

  const maxDocChars = Math.min(
    Math.max(500, Number.parseInt(process.env.QC_MAX_DOC_CHARS || '3200', 10) || 3200),
    8000,
  );
  const maxOutTokens = Math.min(
    Math.max(1024, Number.parseInt(process.env.QC_MAX_OUTPUT_TOKENS || '4096', 10) || 4096),
    8192,
  );
  const minQuestions = Math.min(
    40,
    Math.max(18, Number.parseInt(process.env.QC_MIN_QUESTIONS || '22', 10) || 22),
  );

  const docSnippet = (documentText || '').slice(0, maxDocChars);
  const docCharCount = (documentText || '').replace(/\s/g, '').length;
  const hasImage = Boolean(imageBase64);

  const prompt = `Senior QA/QC Engineer (EPC, all disciplines). Review ONLY visible evidence below (+ image if present). State gaps if text is empty or unreadable.

STEP 1: deliverable_type = Drawing | Document | Unknown (P&ID/GA/ISO/SLD/layout vs report/datasheet/BOQ/calc/MR/philosophy).
- Drawing → Drawing + General checks only. Document → Document + General only.

CHECK-1 check1.rows[]: checkpoint, status OK|Partial|Not OK, remarks (brief), score 1|0.5|0, risk_weight High|Medium|Low (significance High=3 Med=2 Low=0.5), source_basis.
Drawing: title block/rev/scale/readability, legends/symbols/grid/north, codes ASME/API/IEC/NFPA + specs, dimensions/routing/tagging, interdisciplinary consistency, clash/clearance, safety, BOQ/MTO, drawing-type specifics.
Document: title/TOC/scope/assumptions/refs, figures/tables, units, design basis/calcs, QA trail Prepared/Checked/Approved, rev control, discipline specifics.
General: aesthetic, logic, technical, completeness.
check1_score_percent 0-100 (95-100 Excellent, 80-94 Minor, 70-79 Revise, <69 Rejected).

CHECK-2: ≥${minQuestions} questions in check2.questions — short question + brief reviewer_notes (use 5W+H). Categories: completeness, engineering logic, cross-ref, code compliance, optimization/maintainability. Status Pass|Warning|Open Issue. Flag missing data; note expected cross-checks (P&ID↔ISO↔BOQ↔SLD) even with one file.
check2.summary: document_type, total_questions, pass_count, warning_count, open_issue_count, technical_score_percent, key_risks[], suggested_actions[].

FINAL: total_score_percent, missing_inputs[], improvement_suggestions[], verdict IFR|IFA|IFC|As-Built|Needs Revision|Rejected.

Context — dept: ${department || 'general'} | checklist: ${checklistTitle || 'n/a'} | typical inputs: ${(supportDocuments || 'none').slice(0, 600)} | user note: ${(userNote || 'none').slice(0, 400)}

TEXT (${docCharCount} non-ws chars, truncated to ${maxDocChars}):
"""
${docSnippet}
"""
${hasImage ? 'IMAGE attached: use for visual/drawing checks.' : ''}

OUTPUT: single JSON only, no markdown. Schema:
{"executive_summary":"...","deliverable_type":"...","check1":{"rows":[...],"check1_score_percent":0},"check2":{"questions":[{"q_no":1,"question":"...","status":"Pass|Warning|Open Issue","source":"...","reviewer_notes":"..."}],"summary":{...}},"final":{...},"passed_out_of_20":0,"failed_out_of_20":0}
Rules: passed_out_of_20+failed_out_of_20=20. Omit disclaimer field (server adds it). Keep every string concise.`;

  let model = chatModel;
  let messages;

  if (imageBase64 && imageMime) {
    if (useGroq) {
      model = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
    } else {
      model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
    }
    messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${imageMime};base64,${imageBase64}` },
          },
        ],
      },
    ];
  } else {
    messages = [{ role: 'user', content: prompt }];
  }

  let res;
  try {
    res = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxOutTokens,
    });
  } catch (apiErr) {
    const msg = apiErr?.message || '';
    const status = apiErr?.status;
    if (
      status === 413 ||
      status === 429 ||
      /too large|TPM|token/i.test(msg)
    ) {
      throw new Error(
        'AI provider rejected the request (input too large or rate limit). Use a shorter/smaller document, reduce QC_MAX_DOC_CHARS, or wait and retry. Groq free tier has strict per-minute token limits.',
      );
    }
    throw apiErr;
  }

  const reply = res.choices[0].message.content;
  let parsed;
  try {
    parsed = parseModelJson(reply);
  } catch (e) {
    return {
      summary:
        '**Could not parse AI output.** Here is the raw reply:\n\n' +
        (reply || '').slice(0, 2000) +
        '\n\n**Disclaimer**\n' +
        MANDATORY_QC_DISCLAIMER,
      findings: [],
      score: 0,
      passed: 0,
      failed: 20,
    };
  }

  parsed.disclaimer = MANDATORY_QC_DISCLAIMER;

  const hasStructured =
    parsed.check1 &&
    parsed.check2 &&
    parsed.final &&
    Array.isArray(parsed.check2.questions) &&
    parsed.check2.questions.length >= 12;

  if (hasStructured) {
    return normalizeStructuredReview(parsed);
  }

  let score = Number(parsed.score);
  let passed = Number(parsed.passed);
  let failed = Number(parsed.failed);
  if (!Number.isFinite(score)) score = 0;
  if (!Number.isFinite(passed)) passed = 0;
  if (!Number.isFinite(failed)) failed = 20 - passed;
  score = Math.min(100, Math.max(0, Math.round(score)));
  passed = Math.min(20, Math.max(0, Math.round(passed)));
  failed = 20 - passed;
  const fromPassed = Math.round((passed / 20) * 100);
  if (Math.abs(score - fromPassed) > 12) {
    score = Math.min(100, Math.max(0, Math.round((score + fromPassed) / 2)));
  }
  let findings = parsed.findings;
  if (!Array.isArray(findings)) findings = [];
  findings = findings.map((x) => String(x).trim()).filter(Boolean).slice(0, 25);
  let summary = String(parsed.summary || '').trim() || 'No summary returned.';
  if (!summary.includes('Disclaimer')) {
    summary += '\n\n**Disclaimer**\n' + MANDATORY_QC_DISCLAIMER;
  }
  return { summary, findings, score, passed, failed };
};
