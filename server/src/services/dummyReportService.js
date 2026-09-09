function generateDummyQaQcReport({ documentType, mainDocumentName, supportDocumentName, mainText }) {
  const excerpt = String(mainText || '').slice(0, 400).replace(/\s+/g, ' ').trim() || 'No extracted text.';
  return `
## SECTION 1: REPORT HEADER
**Document Title:** ${documentType || 'Engineering Document'}
**Main document:** ${mainDocumentName || 'N/A'}
**Support document:** ${supportDocumentName || 'Not provided'}
**Tool:** Petrolens QA/QC Report Engine
**Mode:** Demo fallback (configure OPENAI_API_KEY for live analysis)

## SECTION 2: EXECUTIVE SUMMARY DASHBOARD
| Metric | Value |
| --- | --- |
| QA Score | 58.3 |
| Technical Score | 75.0 |
| Rule Score | 75.0 |
| Interface Score | 100.0 |
| Final QC Score | 73 |

## SECTION 3: SYSTEM INITIALIZATION
| Item | Value |
| --- | --- |
| Engine | Petrolens QA/QC Report Engine |
| Rule library | 4000-rule engineering QA library |
| Mode | Demo fallback |
| Document type | ${documentType || 'Engineering Document'} |

## SECTION 4: CHECK-1 QA/QC FIXED CHECKS
| Check ID | Description | Status | Score | Remarks |
| --- | --- | --- | --- | --- |
| C1-01 | Title block / revision present | Partial | 7.5 | Confirm revision history is complete |
| C1-02 | Scope and references listed | OK | 10 | Scope identified from extracted text |
| C1-03 | Approval trail | Not OK | 0 | Sign-off table not confirmed |

## SECTION 5: CHECK-2 TECHNICAL DEEP REVIEW
| Question ID | Tag | Question | Status | Score | Remarks |
| --- | --- | --- | --- | --- | --- |
| Q-01 | [DATA] | Are design conditions stated? | Partial | 7.5 | Partial evidence in extract |
| Q-02 | [SAFE] | Relief / safeguarding mentioned? | Partial | 7.5 | Needs engineer confirmation |

## SECTION 6: RULE ENGINE EXECUTION
Applicable rules sampled from the 4,000-rule library based on document type **${documentType}**.

| Rule ID | Description | Severity | Status | Impact |
| --- | --- | --- | --- | --- |
| R-1001 | Document control completeness | Major | Partial | Revision/approval gaps |
| R-2140 | Spec vs design consistency | Major | Partial | Cross-check support file |

## SECTION 7: CONSOLIDATED SCORING
### 7.1 Component Scores
| Component | Score (%) | Weight | Weighted Score |
| --- | --- | --- | --- |
| QA Score (Check-1) | 58.3 | 25% | 14.58 |
| Technical Score (Check-2) | 75.0 | 35% | 26.25 |
| Rule Score | 75.0 | 30% | 22.50 |
| Interface Score | 100.0 | 10% | 10.00 |

### 7.2 Weighting Formula
Final QC Score = (QA Score × 0.25) + (Technical Score × 0.35) + (Rule Score × 0.30) + (Interface Score × 0.10)

### 7.3 Final QC Score
**73%**

| Item | Value |
| --- | --- |
| Final QC Score | 73% |

## SECTION 8: FINAL VERDICT AND ACTIONS
**Status:** Approved with Comments

Configure a live AI key for full Check-1 / Check-2 / 4K-rule scoring on this package.

## SECTION 9: FINDINGS BY PRIORITY
### Major
| ID | Description | Impact | Action | Owner |
| --- | --- | --- | --- | --- |
| M-01 | Incomplete approval trail | Gate risk | Complete title block | Document controller |

### Extract preview
${excerpt}

## SECTION 10: SUPPORTING INFORMATION
Review is based on extracted text from the uploaded main document and any support file. Scanned pages rely on OCR accuracy. Missing title-block, revision, or approval data should be confirmed against the native file.

## SECTION 11: DISCLAIMER
This QA/QC review is a decision-support output. It does not replace qualified engineering judgment, discipline-lead approval, or statutory design responsibility.
`.trim();
}

module.exports = { generateDummyQaQcReport };
