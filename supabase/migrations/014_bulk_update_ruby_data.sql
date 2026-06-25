-- Migration 014: Bulk ruby_data UPDATE via plpgsql loop RPC
-- Phase 5.4a — eliminates the N-parallel-UPDATE write storm from the
-- furigana precompute pipeline by collapsing an entire batch into a single
-- RPC call that runs individual UPDATEs inside a server-side function.
--
-- The precompute writer previously issued BATCH_SIZE concurrent individual
-- UPDATEs via PostgREST, which reliably tripped free-tier Postgres
-- statement_timeout after ~3 batches (~234 rows) because PostgREST fires
-- each as a separate statement within the connection pool. This RPC
-- replaces that with one round-trip per batch, with sequential UPDATEs
-- inside the function (each UPDATE is fast on an indexed primary key).
--
-- Design:
--   - Accepts parallel arrays (p_ids uuid[], p_ruby jsonb[]).
--   - Loops over the arrays, issuing one UPDATE per row.
--   - Returns the count of rows updated.
--   - LANGUAGE plpgsql — the original LANGUAGE sql unnest version was
--     tested and found to hang on free-tier Supabase; the plpgsql loop
--     works reliably.

CREATE OR REPLACE FUNCTION bulk_update_ruby_data(
  p_ids uuid[],
  p_ruby jsonb[]
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  i int;
  total int := 0;
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE segments SET ruby_data = p_ruby[i] WHERE id = p_ids[i];
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$$;

COMMENT ON FUNCTION bulk_update_ruby_data(uuid[], jsonb[]) IS
  'Bulk-update segments.ruby_data via server-side loop. Eliminates the N-parallel-UPDATE write storm from the furigana precompute pipeline.';
