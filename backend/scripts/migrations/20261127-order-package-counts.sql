-- Buyurtma: xalta/quti/paket/mayda va yaratuvchi
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "packageCounts" jsonb NULL,
  ADD COLUMN IF NOT EXISTS "createdByUserId" uuid NULL,
  ADD COLUMN IF NOT EXISTS "createdByName" varchar(160) NULL;
