-- Mahsulot o'zgarishlar tarixi (kim / qachon / nima)
CREATE TABLE IF NOT EXISTS product_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" uuid NOT NULL,
  "actorUserId" uuid NULL,
  "actorName" varchar(160) NOT NULL,
  "actorRole" varchar(32) NOT NULL,
  action varchar(32) NOT NULL,
  summary text NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_audit_product_created
  ON product_audit_events ("productId", "createdAt" DESC);
