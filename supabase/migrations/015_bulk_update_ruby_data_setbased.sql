-- Migration 015: Set-based bulk_update_ruby_data RPC + partial index
-- Replaces the per-row loop in 014 with a single UPDATE..FROM unnest statement,
-- dramatically reducing WAL/IO per batch. Also adds a partial index to speed
-- the resumable cursor scan (WHERE ruby_data IS NULL).
--
-- The function name, signature, and RETURNS int are kept identical to 014 so
-- that scripts/precompute-furigana.ts needs no changes — this is a drop-in
-- replacement.
--
-- The parallel unnests (unnest(p_ids), unnest(p_ruby)) in the same SELECT
-- pair positionally in Postgres: p_ids[i] ↔ p_ruby[i].

CREATE OR REPLACE FUNCTION bulk_update_ruby_data(
  p_ids uuid[],
  p_ruby jsonb[]
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
BEGIN
  WITH u AS (
    SELECT unnest(p_ids) AS id, unnest(p_ruby) AS rd
  )
  UPDATE segments s SET ruby_data = u.rd FROM u WHERE s.id = u.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION bulk_update_ruby_data(uuid[], jsonb[]) IS
  'Set-based bulk-update segments.ruby_data via unnest. Replaces the per-row-loop 014 version — one UPDATE per batch, far less WAL/IO.';

-- ---------------------------------------------------------------------------
-- Partial index to speed the resumable cursor scan (WHERE ruby_data IS NULL).
-- CONCURRENTLY avoids locking but cannot run inside a transaction block.
-- If the Management API wraps in a txn or the DB is too exhausted to build,
-- fall back to a plain CREATE INDEX IF NOT EXISTS.
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seg_ruby_null
  ON segments (id) WHERE ruby_data IS NULL;
