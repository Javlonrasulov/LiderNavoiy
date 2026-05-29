-- PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Spatial index helper function
CREATE OR REPLACE FUNCTION create_location_point(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS geography AS $$
  SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
$$ LANGUAGE SQL IMMUTABLE;
