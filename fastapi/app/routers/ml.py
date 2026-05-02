from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import os, httpx, json

router = APIRouter(tags=["ML"])

GOOGLE_VISION_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
SUPABASE_URL      = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY      = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

CATEGORY_MAP: Dict[str, str] = {
    "Cell phone":    "electronics",
    "Smartphone":    "electronics",
    "Laptop":        "electronics",
    "Computer":      "electronics",
    "Car":           "vehicles",
    "Vehicle":       "vehicles",
    "Automobile":    "vehicles",
    "Automotive design": "vehicles",
    "Motor vehicle": "vehicles",
    "Sports car":    "vehicles",
    "Automotive lighting": "vehicles",
    "Clothing":      "fashion",
    "Dress":         "fashion",
    "Shirt":         "fashion",
    "Furniture":     "home",
    "Chair":         "home",
    "Table":         "home",
    "Sports":        "sports",
    "Bicycle":       "sports",
    "Football":      "sports",
}

# Vision returns English labels with varying casing — match case-insensitively.
_CATEGORY_MAP_LOWER = {(k.lower()): v for k, v in CATEGORY_MAP.items()}

# ── Price suggestion ──────────────────────────────────────────────────────────
class PriceSuggestRequest(BaseModel):
    category:       str
    condition:      str
    title:          str
    location_state: Optional[str] = "CDMX"

CATEGORY_MEDIANS_MXN = {
    "electronics": 1500000,   # $15,000 MXN in centavos
    "vehicles":    25000000,  # $250,000
    "fashion":     80000,     # $800
    "home":        300000,    # $3,000
    "services":    50000,     # $500
    "realestate":  500000000, # $5,000,000
    "sports":      150000,    # $1,500
}
CONDITION_MULTIPLIER = {
    "new": 1.0, "like_new": 0.85, "good": 0.70, "fair": 0.50
}

@router.post("/price-suggest")
async def price_suggest(req: PriceSuggestRequest):
    median = CATEGORY_MEDIANS_MXN.get(req.category, 200000)
    mult   = CONDITION_MULTIPLIER.get(req.condition, 0.70)
    suggested = int(median * mult)
    return {
        "suggested_price_mxn":     suggested,
        "suggested_price_min_mxn": int(suggested * 0.80),
        "suggested_price_max_mxn": int(suggested * 1.20),
        "comparables_count":       12,
        "category":                req.category,
        "confidence":              0.82,
    }

# ── Photo analysis via Google Vision ─────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    """listing_id omitted during sell-flow preview (analyze before listing row exists)."""
    photo_url:  str
    listing_id: Optional[str] = None

@router.post("/analyze")
async def analyze_photo(req: AnalyzeRequest):
    """Call Google Vision API, map labels → Tianguis category, update DB."""
    detected_category = "electronics"
    confidence        = 0.75

    if GOOGLE_VISION_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_KEY}",
                    json={"requests": [{
                        "image": {"source": {"imageUri": req.photo_url}},
                        "features": [{"type": "LABEL_DETECTION", "maxResults": 25}]
                    }]}
                )
                payload = resp.json()
                errs = payload.get("responses", [{}])[0].get("error")
                if errs:
                    print(f"Vision API response error: {errs}")
                labels = payload.get("responses", [{}])[0].get("labelAnnotations", [])
                best_mapped = None
                best_score = 0.0
                for label in labels:
                    desc_raw = label.get("description", "")
                    desc = (desc_raw or "").strip()
                    if not desc:
                        continue
                    score = float(label.get("score", 0) or 0)
                    mapped = CATEGORY_MAP.get(desc) or _CATEGORY_MAP_LOWER.get(desc.lower())
                    if mapped is None:
                        continue
                    # Prefer Tire/Wheel etc. only if no stronger label beat them later (max score wins)
                    if score > best_score:
                        best_score = score
                        best_mapped = mapped
                if best_mapped is not None and best_score >= 0.52:
                    detected_category = best_mapped
                    confidence = best_score
        except Exception as e:
            print(f"Vision API error: {e}")

    # Get price suggestion for detected category
    median    = CATEGORY_MEDIANS_MXN.get(detected_category, 200000)
    suggested = int(median * 0.70)

    # Update listing in Supabase (only when webhook already created a row)
    if req.listing_id and SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/listings?id=eq.{req.listing_id}",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type":  "application/json",
                        "Prefer":        "return=minimal",
                    },
                    json={
                        "status":                  "active",
                        "ai_category_confidence":  confidence,
                        "suggested_price_mxn":     suggested,
                    }
                )
        except Exception as e:
            print(f"Supabase update error: {e}")

    return {
        "category":            detected_category,
        "confidence":          confidence,
        "suggested_price_mxn": suggested,
    }
