"""
DocCheck AI — PaddleOCR microservice
https://github.com/PaddlePaddle/PaddleOCR

POST /ocr   multipart field "file" (image)  →  { "text": "...", "engine": "paddleocr" }
GET  /health                                →  { "ok": true, "engine": "paddleocr", "ready": bool }
"""

from __future__ import annotations

# Windows / CPU: disable oneDNN + PIR before importing paddle.
import os

os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("FLAGS_onednn", "0")
os.environ.setdefault("FLAGS_enable_pir_api", "0")
os.environ.setdefault("FLAGS_enable_pir_in_executor", "0")

import io
import logging
import threading
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

HOST = os.getenv("PADDLEOCR_HOST", "127.0.0.1")
PORT = int(os.getenv("PADDLEOCR_PORT", "8866"))
LANG = os.getenv("PADDLEOCR_LANG", "en").strip() or "en"

logger = logging.getLogger("paddleocr-service")

_ocr_lock = threading.Lock()
_ocr: Any = None
_ocr_error: str = ""
_api_style: str = ""  # "predict" | "ocr"


def _build_ocr() -> Any:
    """Create a PaddleOCR instance across 2.x / 3.x APIs."""
    global _api_style
    from paddleocr import PaddleOCR

    # PaddleOCR 3.x
    try:
        engine = PaddleOCR(
            lang=LANG,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            enable_mkldnn=False,
        )
        _api_style = "predict"
        return engine
    except TypeError:
        pass

    # PaddleOCR 2.x
    try:
        engine = PaddleOCR(use_angle_cls=True, lang=LANG, show_log=False, enable_mkldnn=False)
        _api_style = "ocr"
        return engine
    except TypeError:
        try:
            engine = PaddleOCR(lang=LANG, enable_mkldnn=False)
        except TypeError:
            engine = PaddleOCR(lang=LANG)
        _api_style = "ocr"
        return engine


def get_ocr() -> Any:
    global _ocr, _ocr_error
    if _ocr is not None:
        return _ocr
    with _ocr_lock:
        if _ocr is not None:
            return _ocr
        try:
            _ocr = _build_ocr()
            _ocr_error = ""
            return _ocr
        except Exception as exc:  # noqa: BLE001 — surface to /health
            _ocr_error = str(exc)
            raise


def _image_to_array(data: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(image)


def _lines_from_predict(result: Any) -> list[str]:
    lines: list[str] = []
    if result is None:
        return lines
    items = result if isinstance(result, list) else [result]
    for item in items:
        if item is None:
            continue
        rec_texts = getattr(item, "rec_texts", None)
        if rec_texts is None and hasattr(item, "get"):
            rec_texts = item.get("rec_texts") or item.get("rec_text")
        if rec_texts is None and hasattr(item, "json") and isinstance(item.json, dict):
            payload = item.json.get("res") or item.json
            if isinstance(payload, dict):
                rec_texts = payload.get("rec_texts")
        if isinstance(rec_texts, (list, tuple)):
            for t in rec_texts:
                s = str(t or "").strip()
                if s:
                    lines.append(s)
    return lines


def _lines_from_ocr(result: Any) -> list[str]:
    lines: list[str] = []
    if not result:
        return lines
    pages = result if isinstance(result, list) else [result]
    for page in pages:
        if not page:
            continue
        for row in page:
            if not row or len(row) < 2:
                continue
            payload = row[1]
            if isinstance(payload, (list, tuple)) and payload:
                text = str(payload[0] or "").strip()
            else:
                text = str(payload or "").strip()
            if text:
                lines.append(text)
    return lines


def run_ocr(image_bytes: bytes) -> str:
    engine = get_ocr()
    arr = _image_to_array(image_bytes)
    with _ocr_lock:
        if _api_style == "predict" and hasattr(engine, "predict"):
            result = engine.predict(arr)
            lines = _lines_from_predict(result)
            if not lines and hasattr(engine, "ocr"):
                try:
                    result = engine.ocr(arr, cls=True)
                except TypeError:
                    result = engine.ocr(arr)
                lines = _lines_from_ocr(result)
        else:
            try:
                result = engine.ocr(arr, cls=True)
            except TypeError:
                result = engine.ocr(arr)
            lines = _lines_from_ocr(result)
    return "\n".join(lines).strip()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        get_ocr()
        logger.info("PaddleOCR ready (api=%s lang=%s)", _api_style, LANG)
    except Exception as exc:  # noqa: BLE001
        logger.warning("PaddleOCR warmup failed: %s", exc)
    yield


app = FastAPI(title="DocCheck AI PaddleOCR", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> JSONResponse:
    ready = _ocr is not None and not _ocr_error
    if not ready:
        try:
            get_ocr()
            ready = True
        except Exception as exc:  # noqa: BLE001
            return JSONResponse(
                {
                    "ok": False,
                    "engine": "paddleocr",
                    "ready": False,
                    "error": str(exc) or _ocr_error,
                },
                status_code=503,
            )
    return JSONResponse(
        {"ok": True, "engine": "paddleocr", "ready": True, "lang": LANG, "api": _api_style}
    )


@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)) -> dict[str, Any]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload")
    try:
        text = run_ocr(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("PaddleOCR failed")
        raise HTTPException(status_code=500, detail=f"PaddleOCR failed: {exc}") from exc
    return {"text": text, "engine": "paddleocr", "chars": len(text)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=HOST, port=PORT, reload=False, workers=1)
