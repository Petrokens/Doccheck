const { getOpenAIClient, getOpenAIModel } = require('../config/openai');
const { getGroqClient, getGroqModel } = require('../config/groq');
const { generateDummyQaQcReport } = require('./dummyReportService');

const QAQC_MASTER_PROMPT = `
PETROLENS QA/QC REPORT ENGINE
WITH INTEGRATED 4000-RULE ENGINEERING QA RULE LIBRARY
ROLE DEFINITION

You are a Senior Multidisciplinary Engineering QA Expert with over 40 years of experience in EPC projects across Oil and Gas, Petrochemical, Energy, Offshore, Pipelines, and Industrial facilities.

You are also an AI-powered Rule Engine capable of executing a predefined Engineering QA Rule Library consisting of 4000 rules across 40 batches.

CORE OBJECTIVE
For every engineering deliverable submitted:
- Perform structured QA/QC review
- Execute relevant rules from the 4000-rule library
- Detect design errors, missing data, cross-document inconsistencies, safety risks, calculation errors, operability and constructability concerns
- Generate a standardized QA/QC report

RULE ENGINE INTEGRATION
1. Auto-detect document type, discipline, and systems
2. Filter 50–300 relevant rules from the 4000-rule library
3. For each rule assign Status: OK / Partial / Not OK / N/A and Severity: Critical / Major / Minor
4. Compute QA Score, Technical Score, Rule Score, Interface Score, and Final QC Score

REPORT GENERATION FORMAT (MANDATORY)
SECTION 1: REPORT HEADER (project, facility, document title/number/revision, discipline, review date, reviewed by, tool)
SECTION 2: EXECUTIVE SUMMARY DASHBOARD (scores, counts)
SECTION 3: SYSTEM INITIALIZATION
SECTION 4: CHECK-1 QA/QC FIXED CHECKS as a markdown table: Check ID | Description | Status | Score | Remarks
SECTION 5: CHECK-2 TECHNICAL DEEP REVIEW as a markdown table: Question ID | Tag | Question | Status | Score | Remarks
SECTION 6: RULE ENGINE EXECUTION summary + table: Rule ID | Description | Severity | Status | Impact
SECTION 7: CONSOLIDATED SCORING with Final QC Score as a percentage
SECTION 8: FINAL VERDICT AND ACTIONS (Approved / Approved with Comments / Rework Required / Rejected)
SECTION 9: FINDINGS BY PRIORITY — Critical, Major, Minor tables
SECTION 10: SUPPORTING INFORMATION
SECTION 11: DISCLAIMER — this review does not replace qualified engineering judgment

Scoring: OK = 10, Partial = 7.5, Not OK = 0, N/A excluded.
Ground every finding in extracted document text. If data is missing, mark Partial or Not OK and say what is missing.
`.trim();

function extractTextFromResponse(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function completeReport({ input, onProgress, reportContext }) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const openaiClient = getOpenAIClient();
  const openaiModel = getOpenAIModel();
  let lastError = '';

  if (openaiClient) {
    try {
      emit(`Calling Petrolenz QA/QC Report Engine (${openaiModel})...`);
      const response = await openaiClient.responses.create({
        model: openaiModel,
        input,
        temperature: 0.2,
      });
      const markdown = extractTextFromResponse(response);
      if (markdown) {
        emit(`AI engine response received (OpenAI / ${openaiModel}).`);
        return { markdown, provider: 'openai' };
      }
      lastError = 'OpenAI returned an empty response.';
    } catch (error) {
      lastError = String(error?.message || error);
      emit(`OpenAI unavailable (${lastError}). Switching to alternate AI provider...`);
    }
  } else {
    emit('OPENAI_API_KEY not configured. Switching to alternate AI provider...');
    lastError = 'OPENAI_API_KEY is not configured.';
  }

  const groqClient = getGroqClient();
  const groqModel = getGroqModel();
  if (groqClient) {
    try {
      emit(`Calling alternate AI engine (${groqModel})...`);
      const response = await groqClient.chat.completions.create({
        model: groqModel,
        messages: [{ role: 'user', content: input }],
        temperature: 0.2,
      });
      const markdown = String(response?.choices?.[0]?.message?.content || '').trim();
      if (markdown) {
        emit(`AI engine response received (Groq / ${groqModel}).`);
        return { markdown, provider: 'groq' };
      }
    } catch (error) {
      lastError = String(error?.message || error);
      emit(`Groq unavailable (${lastError}).`);
    }
  }

  if (String(process.env.ALLOW_DEMO_REPORTS || '').trim() === '1') {
    emit('Using structured demo QA/QC report (no live AI key).');
    return {
      markdown: generateDummyQaQcReport(reportContext || {}),
      provider: 'demo',
    };
  }

  throw new Error(lastError || 'No AI provider available. Set OPENAI_API_KEY or ALLOW_DEMO_REPORTS=1.');
}

async function generateProcessQcReport({
  documentType,
  mainDocumentName,
  supportDocumentName,
  mainText,
  supportText,
  onProgress,
}) {
  const input = `
${QAQC_MASTER_PROMPT}

Uploaded document type: ${documentType}
Main document file(s): ${mainDocumentName}
Support document file(s): ${supportDocumentName || 'Not provided'}

Main document extracted text:
"""${mainText || 'No text extracted'}"""

Support document extracted text:
"""${supportText || 'Not provided'}"""
`.trim();

  const { markdown, provider } = await completeReport({
    input,
    onProgress,
    reportContext: { documentType, mainDocumentName, supportDocumentName, mainText },
  });
  if (typeof onProgress === 'function' && provider) {
    onProgress(`Report engine provider: ${provider}`);
  }
  return markdown;
}

module.exports = { QAQC_MASTER_PROMPT, generateProcessQcReport, extractTextFromResponse };
