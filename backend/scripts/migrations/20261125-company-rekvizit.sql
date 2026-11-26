-- Tashkilot rekvizitlari: company maydonlari, bank hisoblari, ijtimoiy tarmoqlar, terminallar
-- Ishga tushirish: psql $DATABASE_URL -f backend/scripts/migrations/20261125-company-rekvizit.sql
-- Dev muhitida TypeORM synchronize + BootSeedService ham qo‘llaydi.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS "orgCode" varchar(32) NULL,
  ADD COLUMN IF NOT EXISTS "fullLegalName" varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS "legalAddress" varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS "phone" varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS "callCenterPhone" varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS "inn" varchar(32) NULL,
  ADD COLUMN IF NOT EXISTS "vatCode" varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS "rekvizitNote" text NULL,
  ADD COLUMN IF NOT EXISTS "cashCashboxName" varchar(200) NULL,
  ADD COLUMN IF NOT EXISTS "clickCashboxName" varchar(200) NULL,
  ADD COLUMN IF NOT EXISTS "primaryBankAccountId" uuid NULL;

CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "companyId" varchar(64) NOT NULL,
  code varchar(32) NULL,
  name varchar(200) NOT NULL,
  "accountNumber" varchar(32) NOT NULL,
  "bankName" varchar(200) NULL,
  mfo varchar(16) NULL,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_company
  ON company_bank_accounts ("companyId");

CREATE TABLE IF NOT EXISTS company_social_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "companyId" varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  url varchar(500) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_social_links_company
  ON company_social_links ("companyId");

ALTER TABLE payment_terminals
  ADD COLUMN IF NOT EXISTS "externalId" varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS "account23510" varchar(32) NULL,
  ADD COLUMN IF NOT EXISTS "bankAccountId" uuid NULL;
