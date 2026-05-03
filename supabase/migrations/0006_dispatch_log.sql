-- Field-worker action audit trail.
--
-- A dispatched worker opens a per-pin deep-link from their SMS and presses
-- one of: Accept / En route / Completed / Cannot complete. Each press writes
-- a row here. `pins.status` is only flipped on Completed (-> resolved) and
-- Cannot complete (-> acknowledged); intermediate states (accepted, en_route)
-- live ONLY in this log. Keeping pins.status coarse avoids enum churn.
--
-- Auth model for the v1 demo: open URL keyed by pin_id (UUID-ish), no JWT.
-- worker_id stays NULL because we have no Twilio inbound webhook to map a
-- session back to a phone number. Tighten with signed tokens post-demo.

CREATE TYPE dispatch_log_action AS ENUM (
  'accepted',
  'en_route',
  'completed',
  'cannot_complete'
);

CREATE TABLE public.dispatch_log (
  id          bigserial PRIMARY KEY,
  pin_id      text NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  action      dispatch_log_action NOT NULL,
  comment     text,
  worker_id   text,
  worker_lat  double precision,
  worker_lon  double precision,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dispatch_log_pin_idx ON public.dispatch_log (pin_id, created_at DESC);

ALTER TABLE public.dispatch_log ENABLE ROW LEVEL SECURITY;

-- Dashboard / worker page can read entries (no PII in v1 schema).
CREATE POLICY anon_read_dispatch_log
  ON public.dispatch_log
  FOR SELECT
  TO anon
  USING (true);

-- Writes go exclusively through FastAPI under service_role. Anon has no
-- INSERT policy here, matching the "mutations route through backend"
-- convention from CLAUDE.md.
