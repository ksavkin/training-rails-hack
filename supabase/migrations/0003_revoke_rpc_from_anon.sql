-- 0003 — revoke EXECUTE on RPC mutation funcs from anon/authenticated
--
-- Why:
--   Project convention (CLAUDE.md "Architectural conventions") is that pin mutations
--   route through FastAPI endpoints, not Supabase from the browser. Migration 0002
--   added RPC SECURITY DEFINER functions as a stop-gap; with FastAPI endpoints in
--   place, anon should not have EXECUTE — defense-in-depth: even if frontend code
--   accidentally calls client.rpc(...), the call fails.
--
-- The functions themselves are kept (still callable by service_role, useful as
-- documentation of the allowed transitions). Drop them in a future migration if
-- they become orphaned.

REVOKE EXECUTE ON FUNCTION public.acknowledge_pin(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_pin(text)     FROM anon, authenticated;
