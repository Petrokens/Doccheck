# DocCheck AI — Upload Document, Token Cost & Report Generate Prompt

This document describes the **upload document report table**, **file / page-scan limits**, and the **DocCheck AI report generation prompt** used by the QA/QC engine.

---

## 1. Upload documents report (table)

| SNO | Document Type | Page Count | Token Consume | Token Cost (USD) | Token Cost (INR ₹) |
| --- | ------------- | ----------: | ------------: | ---------------: | -----------------: |
| 1 | PDF | — | — | — | — |
| 2 | Excel | — | — | — | — |
| 3 | Word | — | — | — | — |
| 4 | CAD | — | — | — | — |
| 5 | Drawing | — | — | — | — |

### Column definitions

| Column | Description |
| ------ | ----------- |
| **SNO** | Serial number of the uploaded file in the batch (1, 2, 3…). |
| **Document Type** | **PDF**, **Excel**, **Word**, **CAD**, or **Drawing**. |
| **Page Count** | Pages in PDF / multipage TIFF, or `1` for single-page images / Word. |
| **Token Consume** | Total LLM tokens (`prompt_tokens` + `completion_tokens` → `total_tokens`). |
| **Token Cost (USD)** | Estimated USD cost (`token_cost_usd`). |
| **Token Cost (INR ₹)** | `token_cost_usd × USD_TO_INR` (default **₹83.50 / $1** via `VITE_USD_TO_INR`). |

### Example

| SNO | Document Type | Page Count | Token Consume | Token Cost (USD) | Token Cost (INR ₹) |
| --- | ------------- | ----------: | ------------: | ---------------: | -----------------: |
| 1 | PDF | 24 | 48,210 | $0.042500 | ₹3.55 |
| 2 | Drawing | 1 | 6,800 | $0.003200 | ₹0.27 |

```text
Token Cost (INR) = Token Cost (USD) × 83.5
```

---

## 2. Document type mapping (DocCheck AI)

| Report category | Typical extensions | DocCheck AI support |
| --------------- | ------------------ | ------------------- |
| **PDF** | `.pdf` | Fully supported |
| **Excel** | `.xlsx`, `.xls`, `.csv` | **CSV** allowed; native Excel not in allow-list yet |
| **Word** | `.docx` | Supported |
| **CAD** | PDF export from CAD | Upload as PDF (DWG/DXF not accepted) |
| **Drawing** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff` | Supported |

**Allowed uploads today:** `.pdf` `.docx` `.txt` `.csv` `.md` `.png` `.jpg` `.jpeg` `.webp` `.tif` `.tiff`

---

## 3. File size limits

| Limit | Value |
| ----- | ----- |
| **Min file size** | **1 byte** (non-empty; empty files rejected) |
| **Max file size** | **100 MB** per file |

---

## 4. Page scan size limits

Every uploaded page is read. There is no 40-page (or 60-page) skip.

### Server OCR (AI report extraction)

| Limit | Default | Config |
| ----- | ------- | ------ |
| **Min pages scanned** | **1** | — |
| **Max pages scanned** | **All pages** | `OCR_MAX_PAGES` (`0` / empty = unlimited) |
| **OCR raster max edge** | **2200 px** | `OCR_MAX_RASTER_EDGE` |

Set `OCR_MAX_PAGES` to a positive number only if an operator needs a hard safety cap. Default is **read every page**.

### Client PDF preview

| File size | Max preview pages |
| --------- | ----------------: |
| Any size | **All pages** |

Thumbnails are built for every page. The open page is rendered at full preview size so large documents (80+ pages) stay usable.

| Preview raster | Value |
| -------------- | ----- |
| Main max edge | **1400 px** |
| Thumbnail max edge | **220 px** |

---

## 5. Report generate prompt (DocCheck AI)

Source: `server/src/services/qaqcAiService.js` → `QAQC_MASTER_PROMPT`

The live engine prompt is **DocCheck AI** and **rule-based only** (no Petrolens/Petrolenz, no 4000 rule count).

```text
DOCCHECK AI QA/QC REPORT ENGINE
RULE-BASED ENGINEERING QA/QC
ROLE DEFINITION

You are DocCheck AI — a Senior Multidisciplinary Engineering QA Expert with over 40 years of experience in EPC projects across Oil and Gas, Petrochemical, Energy, Offshore, Pipelines, and Industrial facilities.

You are a rule-based AI QA/QC engine. Apply only engineering QA rules that are relevant to the uploaded document type and discipline. Do not invent or advertise any fixed total rule count.

CORE OBJECTIVE
For every engineering deliverable submitted:
- Perform structured QA/QC review under the DocCheck AI brand
- Execute only applicable rule-based checks for this document
- Detect design errors, missing data, cross-document inconsistencies, safety risks, calculation errors, operability and constructability concerns
- Generate a standardized DocCheck AI QA/QC report

BRANDING (MANDATORY)
- Always name the tool / engine as **DocCheck AI QA/QC Report Engine**
- Never use Petrolens, Petrolenz, Petrolenz QA/QC, or any other product name
- Never mention “4000”, “4,000”, “4000-rule”, “4K-rule”, or any fixed rule-library size
- Describe the engine as **rule-based** only
- In SECTION 1 Report Header, set **Tool** to: DocCheck AI QA/QC Report Engine
- In SECTION 3 System Initialization, set **Engine** to: DocCheck AI QA/QC Report Engine
- In SECTION 3, set rule method to: Rule-based engineering QA checks (document-type filtered)

RULE ENGINE INTEGRATION
1. Auto-detect document type, discipline, and systems
2. Select only the rules that apply to this deliverable
3. For each applied rule assign Status: OK / Partial / Not OK / N/A and Severity: Critical / Major / Minor
4. Compute QA Score, Technical Score, Rule Score, Interface Score, and Final QC Score

REPORT GENERATION FORMAT (MANDATORY)
SECTION 1–11 as structured DocCheck AI QA/QC report (Check-1, Check-2, rule-based execution, consolidated scoring)
```

### Report wrapper text (also DocCheck AI)

When a report is saved, the markdown header / footer use:

| Field | Value |
| ----- | ----- |
| Title lines | `# DOCCHECK AI QA/QC REPORT ENGINE` / `# RULE-BASED ENGINEERING QA/QC` |
| Footer engine | `DocCheck AI QA/QC Report Engine v4.2 \| Method: Rule-based engineering QA` |
| Demo / fallback tool | `DocCheck AI QA/QC Report Engine` |

---

## 6. Summary cheat sheet

| Item | Min | Max |
| ---- | --- | --- |
| **File size** | 1 byte | **100 MB** / file |
| **OCR page scan** | 1 page | **All pages** (`OCR_MAX_PAGES=0`) |
| **UI preview pages** | 1 page | **All pages** |
| **OCR page raster edge** | — | **2200 px** |
| **Preview page raster edge** | — | **1400 px** / **220 px** thumb |

---

## 7. Blank report template

```markdown
# DocCheck AI — Upload Document Token Report

**Date:** YYYY-MM-DD  
**Report / Job ID:**  
**User:**  
**Model / Provider:**  
**Engine:** DocCheck AI QA/QC Report Engine  

| SNO | Document Type (PDF / Excel / Word / CAD / Drawing) | Page Count | Token Consume | Token Cost (USD) | Token Cost (INR ₹) |
| --- | -------------------------------------------------- | ----------: | ------------: | ---------------: | -----------------: |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Totals**

| Metric | Value |
| ------ | ----: |
| Total pages | |
| Total tokens | |
| Total cost (USD) | |
| Total cost (INR ₹) | |

**Limits applied**

| Limit | Value |
| ----- | ----- |
| File size (min / max) | 1 byte / 100 MB |
| OCR page scan (min / max) | 1 / all pages |
| Preview page scan | All pages |
```

---

*DocCheck AI only. Restart the API after pulling these prompt changes so new reports use the DocCheck branding.*
