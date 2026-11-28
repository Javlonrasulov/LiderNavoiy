-- Kirim-chiqim: kategoriya, operatsiya, mahsulot tannarxi

CREATE TABLE IF NOT EXISTS cash_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" varchar(64) NULL,
  "parentId" uuid NULL,
  name varchar(255) NOT NULL,
  kind varchar(16) NOT NULL DEFAULT 'expense',
  "sortOrder" int NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_categories_company ON cash_categories ("companyId");
CREATE INDEX IF NOT EXISTS idx_cash_categories_parent ON cash_categories ("parentId");

CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" varchar(64) NOT NULL,
  type varchar(16) NOT NULL,
  "categoryId" uuid NULL,
  "categoryPath" varchar(512) NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  method varchar(16) NOT NULL DEFAULT 'cash',
  cashbox varchar(128) NULL,
  counterparty varchar(255) NULL,
  note text NULL,
  "occurredAt" timestamptz NOT NULL,
  "sourceType" varchar(32) NOT NULL DEFAULT 'manual',
  "sourceId" uuid NULL,
  "orderId" uuid NULL,
  "createdByUserId" uuid NULL,
  "createdByName" varchar(160) NULL,
  "isDeleted" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_company_date ON cash_movements ("companyId", "occurredAt");
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements (type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_category ON cash_movements ("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_source_unique
  ON cash_movements ("sourceType", "sourceId")
  WHERE "sourceId" IS NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "costPrice" numeric(15,2) NOT NULL DEFAULT 0;

ALTER TABLE order_payments
  ADD COLUMN IF NOT EXISTS "paidAt" timestamptz NULL;
