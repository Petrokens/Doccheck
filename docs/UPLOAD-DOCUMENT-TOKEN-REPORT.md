# DocCheck AI Upload - Document Token Cost Report

**PDF version:** [DocCheck-AI-Upload-Document-Token-Cost-Report.pdf](./DocCheck-AI-Upload-Document-Token-Cost-Report.pdf)

## 1. Main answer - cost per document (min & max)


| Content type       | Examples                      | Min / document       | Max / document    |
| ------------------ | ----------------------------- | -------------------- | ----------------- |
| **Document-based** | PDF, Word, Excel, CSV, text   | **~$0.002 · ~₹0.17** | **~$0.18 · ~₹15** |
| **Image-based**    | Drawing, PNG, JPG, WEBP, TIFF | **~$0.003 · ~₹0.25** | **~$0.12 · ~₹10** |



|               | Document-based             | Image-based                                |
| ------------- | -------------------------- | ------------------------------------------ |
| **Min means** | Short file (~1-5 pages)    | One sheet / one image                      |
| **Max means** | Large file (~50-100 pages) | Dense set (~5-20 sheets or multipage TIFF) |


---

## 2. Document-based content (text / PDF / Word)


| Size   | Pages    | Est. tokens         | Cost (USD)     | Cost (INR)    |
| ------ | -------- | ------------------- | -------------- | ------------- |
| Small  | 1 - 5    | ~2,000 - ~10,000    | $0.002 - $0.01 | ₹0.17 - ₹0.85 |
| Medium | 10 - 25  | ~20,000 - ~50,000   | $0.02 - $0.05  | ₹1.70 - ₹4.20 |
| Large  | 50 - 100 | ~100,000 - ~200,000 | $0.09 - $0.18  | ₹7.50 - ₹15   |


**Per document:** min **~$0.002 (₹0.17)** · max **~$0.18 (₹15)**

---

## 3. Image-based content (drawings / photos)


| Size   | Images / pages | Est. tokens        | Cost (USD)      | Cost (INR)    |
| ------ | -------------- | ------------------ | --------------- | ------------- |
| Small  | 1              | ~5,000 - ~8,000    | $0.003 - $0.005 | ₹0.25 - ₹0.40 |
| Medium | 2 - 5          | ~12,000 - ~40,000  | $0.008 - $0.03  | ₹0.70 - ₹2.50 |
| Large  | 5 - 20         | ~40,000 - ~160,000 | $0.03 - $0.12   | ₹2.50 - ₹10   |


**Per document:** min **~$0.003 (₹0.25)** · max **~$0.12 (₹10)**

> One image page often costs **more than one text page**. A very large PDF can still cost more **per file** because it has many pages.

---

## 4. Simple guide (INR)


| You upload...                | Expect about...   |
| ---------------------------- | ----------------- |
| Small PDF / Word (few pages) | **₹0.20 - ₹1**    |
| Medium PDF (10-25 pages)     | **₹2 - ₹4**       |
| Large PDF (50-100 pages)     | **₹8 - ₹15**      |
| One drawing / image          | **₹0.25 - ₹0.40** |
| Many drawings (5-20)         | **₹3 - ₹10**      |


---

## 5. Measured sample


| Content type   | File    | Pages | Tokens | USD     | INR   |
| -------------- | ------- | ----- | ------ | ------- | ----- |
| Document-based | PDF     | 24    | 48,210 | $0.0425 | ₹3.55 |
| Image-based    | Drawing | 1     | 6,800  | $0.0032 | ₹0.27 |


```text
Token Cost (INR) = Token Cost (USD) x 83.5
```

