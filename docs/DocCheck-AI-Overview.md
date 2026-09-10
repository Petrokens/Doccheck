# DocCheck AI

**Intelligent Engineering Document Quality Assurance**  
AI-Powered Engineering Document QA/QC.

**Upload → Analyze → Validate → Score → Report**

- **Check-1:** Standard Completeness — title block, revision, scope, references, approval trail
- **Check-2:** Technical Review — design conditions, safeguarding, data, operability, constructability
- **Rule-Based:** Engineering quality & compliance — only rules that apply to this document type
- **Output:** Scored QA/QC Report + PDF

Document QA only. Does not replace qualified engineering judgment.

---

## Workflow

1. **Upload** — Main deliverable (PDF, Word, or image). Optional support file (spec / previous revision).
2. **Analyze** — Extraction, OCR if needed, document-type detection.
3. **Validate** — Check-1 completeness + Check-2 technical review.
4. **Score** — Applicable rules. Weighted Final QC Score.
5. **Report** — Save to History. Export PDF.

---

## Documents needed

**Required:** main engineering deliverable.  
**Optional:** support file for interface check.  
**Formats:** PDF, Word, Excel/CSV, text, PNG, JPG, TIFF. Max 100 MB.

Type is inferred (PFD, P&ID, isometric, datasheet, HAZOP, etc.) or picked manually.

**Disciplines:** Process · Piping · Pipeline · Civil · Mechanical (rotating / static) · Electrical · HVAC · Instrumentation · Telecom · HSE · General · EPC Common (ITP, method statement, MR, vendor pack)

---

## Scoring

**Final QC Score** = QA 25% + Technical 35% + Rule 30% + Interface 10%

OK = 10 · Partial = 7.5 · Not OK = 0 · N/A = excluded

**Verdict:** Approved · Approved with Comments · Rework Required · Rejected

---

## Report

Header · scores · Check-1 · Check-2 · rules · Final QC Score · findings (Critical / Major / Minor) · PDF

**In scope:** single-document QA/QC, OCR, History, PDF, role-based access.  
**Not in scope:** TBE, cross-doc suites, constructability copilots, PE sign-off.