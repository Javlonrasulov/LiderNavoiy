-- Apply before deploying the client audit change when TYPEORM_SYNC=false.
-- Additive only: existing client, GPS and request history are left intact.
BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS "changeAudit" jsonb NULL;

ALTER TABLE client_requests
  ADD COLUMN IF NOT EXISTS "submissionAudit" jsonb NULL;

COMMIT;
