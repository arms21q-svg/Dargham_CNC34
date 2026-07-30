-- Visual search embeddings for Dorgham CNC (Supabase / Postgres)
-- Run once in Supabase SQL Editor if auto-ensure fails:
--   CREATE EXTENSION / column / HNSW index

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS embedding vector(432);

-- HNSW index (run separately in Supabase SQL Editor if needed — may take minutes):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS product_embedding_hnsw
--   ON "Product" USING hnsw (embedding vector_cosine_ops);

-- Backfill from existing imageVector JSON (if present) can be done by
-- publishing products again from admin, or calling ensureProductImageIndex.
