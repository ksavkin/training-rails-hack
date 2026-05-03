-- 0004 — close OV [P1] #3 ("RPC EXECUTE not revoked from PUBLIC")
--
-- Background:
--   Migrations 0002 and 0003 introduced acknowledge_pin / resolve_pin as
--   SECURITY DEFINER stop-gaps and tried to lock them down with
--   `REVOKE EXECUTE ... FROM anon, authenticated`. That's incomplete:
--   Postgres `CREATE FUNCTION` implicitly grants EXECUTE to PUBLIC, and anon
--   inherits PUBLIC, so the functions stayed callable. Confirmed live: an
--   anon-key request to `/rest/v1/rpc/acknowledge_pin` succeeded.
--
-- Fix (D + B from the discussion):
--   D — drop the functions entirely. Project convention is that pin mutations
--       route through FastAPI under service_role. The RPCs were "kept as
--       documentation"; in practice they were an unguarded backdoor.
--   B — pre-emptively revoke EXECUTE on FUNCTIONS from PUBLIC by default for
--       this schema, so any future functions don't reopen the same hole.

DROP FUNCTION IF EXISTS public.acknowledge_pin(text);
DROP FUNCTION IF EXISTS public.resolve_pin(text);

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
