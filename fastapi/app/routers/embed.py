from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os, httpx, asyncio

router = APIRouter(prefix="/ml", tags=["ML"])

SUPA_URL = "https://erfsvaddrspmlavvulne.supabase.co"
SUPA_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
SECRET = os.getenv("INTERNAL_API_SECRET", "tianguis_secret_2026")

class EmbedRequest(BaseModel):
    listing_id: str
    text: str

class BackfillRequest(BaseModel):
    limit: int = 50

class EmbedQueryRequest(BaseModel):
    text: str

async def get_embedding(text: str) -> list[float]:
    if not OPENAI_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not set")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {OPENAI_KEY}"},
            json={"model": "text-embedding-3-small", "input": text[:8000]},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]

async def store_embedding(listing_id: str, vector: list[float]):
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPA_URL}/rest/v1/listings?id=eq.{listing_id}",
            headers={
                "apikey": SUPA_KEY,
                "Authorization": f"Bearer {SUPA_KEY}",
                "Content-Type": "application/json",
            },
            json={"embedding": vector},
            timeout=30,
        )
        resp.raise_for_status()

@router.post("/embed")
async def embed_listing(
    req: EmbedRequest,
    x_internal_secret: str = Header(None, alias="x-internal-secret"),
):
    if x_internal_secret != SECRET:
        raise HTTPException(403, "Forbidden")
    try:
        vector = await get_embedding(req.text)
        await store_embedding(req.listing_id, vector)
        return {"ok": True, "listing_id": req.listing_id, "dims": len(vector)}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/embed-query")
async def embed_query_only(
    req: EmbedQueryRequest,
    x_internal_secret: str = Header(None, alias="x-internal-secret"),
):
    if x_internal_secret != SECRET:
        raise HTTPException(403, "Forbidden")
    try:
        vector = await get_embedding(req.text)
        return {"vector": vector, "dims": len(vector)}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/embed/backfill")
async def backfill_embeddings(
    req: BackfillRequest,
    x_internal_secret: str = Header(None, alias="x-internal-secret"),
):
    if x_internal_secret != SECRET:
        raise HTTPException(403, "Forbidden")
    if not OPENAI_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not set")

    # Fetch listings without embeddings
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPA_URL}/rest/v1/listings?embedding=is.null&status=eq.active"
            f"&select=id,title_es,description_es&limit={req.limit}",
            headers={"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"},
        )
        listings = resp.json()

    results = []
    for i, listing in enumerate(listings):
        # Add delay every 3 listings to avoid OpenAI 429 rate limit
        if i > 0 and i % 3 == 0:
            await asyncio.sleep(1.0)

        text = f"{listing.get('title_es', '')} {listing.get('description_es', '')}".strip()
        if not text:
            continue
        try:
            vector = await get_embedding(text)
            await store_embedding(listing["id"], vector)
            results.append({"id": listing["id"], "ok": True})
        except Exception as e:
            err = str(e)
            # On 429, wait 2 seconds and retry once
            if "429" in err:
                await asyncio.sleep(2.0)
                try:
                    vector = await get_embedding(text)
                    await store_embedding(listing["id"], vector)
                    results.append({"id": listing["id"], "ok": True})
                except Exception as e2:
                    results.append({"id": listing["id"], "ok": False, "error": str(e2)})
            else:
                results.append({"id": listing["id"], "ok": False, "error": err})

    ok_count = sum(1 for r in results if r["ok"])
    return {"processed": len(results), "ok": ok_count, "results": results}
