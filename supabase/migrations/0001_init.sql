-- training-rails initial schema
-- Recreated from production project `railtrain` (ref: npidrybunnkmnkncnlph) on 2026-05-03

-- Enums
CREATE TYPE pin_status AS ENUM ('new', 'acknowledged', 'dispatched', 'resolved');
CREATE TYPE gps_fix_type AS ENUM ('no_fix', '2d', '3d');

-- Sequence for human-readable pin ids (DEF-00001, DEF-00002, ...)
CREATE SEQUENCE pin_seq;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Main table
CREATE TABLE public.pins (
  id              text PRIMARY KEY DEFAULT ('DEF-' || lpad(nextval('pin_seq')::text, 5, '0')),
  status          pin_status NOT NULL DEFAULT 'new',
  line_id         integer NOT NULL,
  lat             double precision NOT NULL,
  lon             double precision NOT NULL,
  milepost        text,
  defect_type     text NOT NULL,
  severity        integer NOT NULL,
  confidence      real NOT NULL,
  device_id       text NOT NULL,
  frame_id        bigint,
  bbox            jsonb,
  speed_mps       real,
  gps_fix         gps_fix_type,
  image_path      text,
  ai_verification text,
  captured_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  dispatched_at   timestamptz,
  resolved_at     timestamptz,
  work_order_text text,
  sms_sid         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX pins_status_detected_idx
  ON public.pins (status, captured_at DESC)
  WHERE status <> 'resolved'::pin_status;

CREATE INDEX pins_line_idx
  ON public.pins (line_id)
  WHERE status <> 'resolved'::pin_status;

CREATE INDEX pins_device_idx
  ON public.pins (device_id, captured_at DESC);

-- updated_at trigger
CREATE TRIGGER pins_updated_at
  BEFORE UPDATE ON public.pins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row level security
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_read_active
  ON public.pins
  FOR SELECT
  TO anon
  USING (
    status <> 'resolved'::pin_status
    OR resolved_at > now() - interval '24 hours'
  );

CREATE POLICY anon_update_status
  ON public.pins
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    status = ANY (ARRAY['acknowledged'::pin_status, 'resolved'::pin_status])
  );

-- Realtime: enable change broadcast for `pins`
ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;

-- Storage bucket for defect images (public, jpeg only)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('defect-images', 'defect-images', true, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
