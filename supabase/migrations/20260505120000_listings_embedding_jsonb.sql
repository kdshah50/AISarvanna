-- Optional embeddings for semantic (dense) hybrid search fallbacks + future pgvector RPC.
-- FastAPI /ml/embed can PATCH numeric arrays JSON into this column via PostgREST.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS embedding JSONB;

COMMENT ON COLUMN public.listings.embedding IS
  'Optional OpenAI text-embedding-3-small vector (1536 floats) as JSON array; populated by POST /ml/embed.';
