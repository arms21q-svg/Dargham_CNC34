-- Safe migration: portfolio categories + Product.categoryId / displayNumber
-- Run in Supabase SQL Editor (or psql) BEFORE redeploy if prisma db push is unavailable.
-- Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "PortfolioCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL DEFAULT '',
  "descriptionEn" TEXT NOT NULL DEFAULT '',
  "image" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioCategory_slug_key" ON "PortfolioCategory"("slug");
CREATE INDEX IF NOT EXISTS "PortfolioCategory_enabled_sortOrder_idx" ON "PortfolioCategory"("enabled", "sortOrder");
CREATE INDEX IF NOT EXISTS "PortfolioCategory_sortOrder_idx" ON "PortfolioCategory"("sortOrder");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "displayNumber" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "PortfolioCategory"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Product_categoryId_displayNumber_idx" ON "Product"("categoryId", "displayNumber");
CREATE INDEX IF NOT EXISTS "Product_categoryId_sortOrder_idx" ON "Product"("categoryId", "sortOrder");

-- Default categories (only if table is empty)
INSERT INTO "PortfolioCategory" ("id", "slug", "titleAr", "titleEn", "descriptionAr", "descriptionEn", "image", "enabled", "sortOrder", "updatedAt")
SELECT * FROM (VALUES
  ('cat-doors', 'doors', 'أبواب', 'Doors', 'أبواب خشبية منحوتة بتقنية CNC', 'CNC carved wooden doors', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&fm=webp&w=640&q=72', true, 0, CURRENT_TIMESTAMP),
  ('cat-kitchens', 'kitchens', 'مطابخ', 'Kitchens', '', '', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&fm=webp&w=640&q=72', true, 1, CURRENT_TIMESTAMP),
  ('cat-bedrooms', 'bedrooms', 'غرف نوم', 'Bedrooms', '', '', 'https://images.unsplash.com/photo-1616594039964-40874a7a7439?auto=format&fit=crop&fm=webp&w=640&q=72', true, 2, CURRENT_TIMESTAMP),
  ('cat-decor', 'decor', 'ديكورات', 'Decor', '', '', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&fm=webp&w=640&q=72', true, 3, CURRENT_TIMESTAMP),
  ('cat-cnc', 'cnc', 'CNC', 'CNC', '', '', 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&fm=webp&w=640&q=72', true, 4, CURRENT_TIMESTAMP),
  ('cat-mdf', 'mdf', 'MDF', 'MDF', '', '', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&fm=webp&w=640&q=72', true, 5, CURRENT_TIMESTAMP),
  ('cat-facades', 'facades', 'واجهات', 'Facades', '', '', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&w=640&q=72', true, 6, CURRENT_TIMESTAMP),
  ('cat-staircases', 'staircases', 'درابزين', 'Staircases', '', '', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&fm=webp&w=640&q=72', true, 7, CURRENT_TIMESTAMP),
  ('cat-tables', 'tables', 'طاولات', 'Tables', '', '', 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&fm=webp&w=640&q=72', true, 8, CURRENT_TIMESTAMP),
  ('cat-cabinets', 'cabinets', 'خزائن', 'Cabinets', '', '', 'https://images.unsplash.com/photo-1595428774223-ef526241018b?auto=format&fit=crop&fm=webp&w=640&q=72', true, 9, CURRENT_TIMESTAMP)
) AS v("id", "slug", "titleAr", "titleEn", "descriptionAr", "descriptionEn", "image", "enabled", "sortOrder", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "PortfolioCategory" LIMIT 1);

-- Backfill categoryId from legacy Product.category slug keys
UPDATE "Product" p SET "categoryId" = 'cat-decor', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL AND p.category IN ('wallArt', 'decor');

UPDATE "Product" p SET "categoryId" = 'cat-doors', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL AND p.category = 'doors';

UPDATE "Product" p SET "categoryId" = 'cat-tables', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL AND p.category = 'furniture';

UPDATE "Product" p SET "categoryId" = 'cat-facades', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL AND p.category = 'panels';

UPDATE "Product" p SET "categoryId" = 'cat-cnc', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL AND p.category = 'custom';

UPDATE "Product" p SET "categoryId" = 'cat-decor', "displayNumber" = COALESCE("displayNumber", 0)
WHERE p."categoryId" IS NULL;

-- Per-category display numbers
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY "sortOrder" ASC, id ASC) AS rn
  FROM "Product"
  WHERE "categoryId" IS NOT NULL AND ("displayNumber" IS NULL OR "displayNumber" = 0)
)
UPDATE "Product" p SET "displayNumber" = ranked.rn
FROM ranked WHERE p.id = ranked.id;
