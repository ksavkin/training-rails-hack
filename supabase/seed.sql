-- Seed demo pins on Corvallis -> Albany route
-- Mixed severity, mixed statuses, varied defect types

INSERT INTO public.pins
  (line_id, lat, lon, milepost, defect_type, severity, confidence,
   device_id, bbox, speed_mps, gps_fix, image_path, status, captured_at)
VALUES
  (1, 44.5638, -123.2794, 'MP 24+340 · L1', 'transverse_crack', 9, 0.87,
   'JET-DEMO', '[420,310,560,410]'::jsonb, 5.1, '3d',
   'pins/seed/demo_001.jpg', 'new', now() - interval '2 minutes'),

  (1, 44.5905, -123.2410, 'MP 26+120 · L1', 'longitudinal_crack', 8, 0.79,
   'JET-DEMO', '[210,180,380,290]'::jsonb, 5.4, '3d',
   'pins/seed/demo_002.jpg', 'new', now() - interval '5 minutes'),

  (1, 44.6020, -123.2210, 'MP 26+880 · R1', 'spalling', 6, 0.74,
   'JET-DEMO', '[140,260,300,360]'::jsonb, 5.8, '3d',
   'pins/seed/demo_003.jpg', 'acknowledged', now() - interval '12 minutes'),

  (2, 44.6210, -123.1890, 'MP 28+440 · L2', 'joint_defect', 5, 0.71,
   'JET-DEMO', '[330,210,470,310]'::jsonb, 6.0, '3d',
   'pins/seed/demo_004.jpg', 'dispatched', now() - interval '20 minutes'),

  (1, 44.6360, -123.1545, 'MP 29+880 · R1', 'missing_fastener', 7, 0.83,
   'JET-DEMO', '[260,290,360,370]'::jsonb, 5.9, '3d',
   'pins/seed/demo_005.jpg', 'new', now() - interval '8 minutes'),

  (1, 44.5790, -123.2615, 'MP 25+140 · L1', 'spalling', 3, 0.62,
   'JET-DEMO', '[400,180,510,260]'::jsonb, 5.5, '3d',
   'pins/seed/demo_006.jpg', 'acknowledged', now() - interval '25 minutes');
