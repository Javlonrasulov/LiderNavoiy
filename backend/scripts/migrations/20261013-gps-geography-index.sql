-- Run before deploying the indexed last GPS visit query.
-- CONCURRENTLY keeps GPS inserts available. Do not wrap this file in BEGIN/COMMIT.
-- Adds an index only; existing rows and columns are unchanged.
SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_points_geography
  ON public.location_points USING gist
  ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_am a ON a.oid = c.relam
    WHERE c.oid = to_regclass('public.idx_location_points_geography')
      AND i.indrelid = 'public.location_points'::regclass
      AND i.indisvalid AND i.indisready AND a.amname = 'gist'
      AND pg_get_expr(i.indexprs, i.indrelid) =
        '(st_setsrid(st_makepoint(longitude, latitude), 4326))::geography'
  ) THEN
    RAISE EXCEPTION 'GPS geography index is missing, invalid, or incompatible';
  END IF;
END $$;

RESET lock_timeout;
RESET statement_timeout;
