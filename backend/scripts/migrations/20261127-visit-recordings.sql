-- Visit audio recordings (Zapislar)
-- Production: psql "$DATABASE_URL" -f backend/scripts/migrations/20261127-visit-recordings.sql

ALTER TABLE distributor_profiles
  ADD COLUMN IF NOT EXISTS "recordVisitAudio" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS visit_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "visitId" uuid NOT NULL,
  "distributorId" uuid NOT NULL,
  "companyId" varchar(64) NULL,
  "clientId" uuid NOT NULL,
  "orderId" uuid NULL,
  "startedAt" timestamptz NOT NULL,
  "endedAt" timestamptz NULL,
  "durationSeconds" int NULL,
  status varchar(32) NOT NULL DEFAULT 'recording',
  "uploadStatus" varchar(32) NOT NULL DEFAULT 'none',
  "visitOutcome" varchar(32) NOT NULL DEFAULT 'unknown',
  "clientConsent" boolean NOT NULL DEFAULT false,
  "recordingEnabledAtStart" boolean NOT NULL DEFAULT true,
  "storageKey" varchar(512) NULL,
  "fileSizeBytes" bigint NULL,
  "mimeType" varchar(64) NULL,
  "expiresAt" timestamptz NOT NULL,
  "failureReason" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_recordings_visit
  ON visit_recordings ("visitId");

CREATE INDEX IF NOT EXISTS idx_visit_recordings_distributor_started
  ON visit_recordings ("distributorId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_visit_recordings_company_started
  ON visit_recordings ("companyId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_visit_recordings_expires
  ON visit_recordings ("expiresAt");

CREATE INDEX IF NOT EXISTS idx_visit_recordings_client
  ON visit_recordings ("clientId");
