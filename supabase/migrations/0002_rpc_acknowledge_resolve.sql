-- 0002 — replace overly permissive anon_update_status RLS with narrow RPC functions
--
-- Why:
--   The original policy had USING (true) and only constrained the FINAL status, so anon
--   clients could modify any column on any pin as long as the resulting row ended up with
--   status acknowledged/resolved. RPC SECURITY DEFINER functions force the exact
--   transition contract (only status + *_at timestamps change, only allowed transitions).
--
-- TODO: This is a stop-gap. The intended long-term architecture is to route Acknowledge
--   and Resolve through FastAPI endpoints (POST /pins/{id}/acknowledge,
--   POST /pins/{id}/resolve) so all mutations live alongside /dispatch and audit logging
--   is centralized in one Python service. See CLAUDE.md "Architectural conventions".

DROP POLICY IF EXISTS anon_update_status ON public.pins;

CREATE OR REPLACE FUNCTION public.acknowledge_pin(pin_id text)
RETURNS public.pins
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pins
  SET status = 'acknowledged'::pin_status,
      acknowledged_at = COALESCE(acknowledged_at, now())
  WHERE id = pin_id
    AND status = 'new'::pin_status
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.resolve_pin(pin_id text)
RETURNS public.pins
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pins
  SET status = 'resolved'::pin_status,
      resolved_at = COALESCE(resolved_at, now())
  WHERE id = pin_id
    AND status IN ('new'::pin_status, 'acknowledged'::pin_status, 'dispatched'::pin_status)
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_pin(text)     TO anon, authenticated;

-- Belt-and-suspenders: even if a future migration accidentally re-adds a UPDATE policy
-- for anon, the table-level grant is gone.
REVOKE UPDATE ON public.pins FROM anon;
