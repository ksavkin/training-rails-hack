export const ROUTES = {
  '1': {
    name: 'Corvallis–Albany',
    color: '#d6ff3d',
    coords: [
      [44.5638, -123.2620],
      [44.5780, -123.2300],
      [44.5950, -123.1950],
      [44.6150, -123.1500],
      [44.6365, -123.1059]
    ]
  },
  '2': {
    name: 'Portland–Eugene',
    color: '#5ab0ff',
    coords: [
      [45.5152, -122.6784],
      [45.3517, -122.6068],
      [45.1900, -122.7000],
      [44.9429, -123.0351],
      [44.6800, -123.0900],
      [44.6365, -123.1059],
      [44.5638, -123.2620],
      [44.3300, -123.1500],
      [44.0521, -123.0868]
    ]
  },
  '3': {
    name: 'Salem–Bend',
    color: '#ff7a45',
    coords: [
      [44.9429, -123.0351],
      [44.8200, -122.5500],
      [44.7500, -122.0000],
      [44.6500, -121.5000],
      [44.4500, -121.3000],
      [44.0582, -121.3153]
    ]
  },
  '4': {
    name: 'Seattle–Tacoma',
    color: '#c084fc',
    coords: [
      [47.6062, -122.3321],
      [47.5180, -122.3500],
      [47.3900, -122.3800],
      [47.2529, -122.4443]
    ]
  }
};

export const CITIES = [
  { name: 'Portland',  lat: 45.5152, lon: -122.6784, major: true },
  { name: 'Salem',     lat: 44.9429, lon: -123.0351, major: true },
  { name: 'Albany',    lat: 44.6365, lon: -123.1059, major: false },
  { name: 'Corvallis', lat: 44.5638, lon: -123.2620, major: true },
  { name: 'Eugene',    lat: 44.0521, lon: -123.0868, major: true },
  { name: 'Bend',      lat: 44.0582, lon: -121.3153, major: true },
  { name: 'Seattle',   lat: 47.6062, lon: -122.3321, major: true },
  { name: 'Tacoma',    lat: 47.2529, lon: -122.4443, major: true }
];

/** Local demo data when Supabase env is missing or fetch fails (no images — use DB `image_path` when live). */
const FALLBACK_PINS_BASE = [
  // Route 1
  { id: 'DEF-04881', line: '1', sev: 'med',  type: 'Loose fastener',     lat: 44.572, lon: -123.245, mp: '2+150',  conf: 0.72, capturedAt: '2026-04-29 14:06:27' },
  { id: 'DEF-04882', line: '1', sev: 'low',  type: 'Surface scratch',    lat: 44.581, lon: -123.220, mp: '4+780',  conf: 0.66, capturedAt: '2026-04-29 13:41:10' },
  { id: 'DEF-04883', line: '1', sev: 'high', type: 'Head check pattern', lat: 44.591, lon: -123.200, mp: '7+020',  conf: 0.83, capturedAt: '2026-04-29 14:12:14' },
  { id: 'DEF-04884', line: '1', sev: 'med',  type: 'Joint bolt loose',   lat: 44.601, lon: -123.180, mp: '9+200',  conf: 0.81, capturedAt: '2026-04-29 14:06:27' },
  { id: 'DEF-04885', line: '1', sev: 'low',  type: 'Vegetation',         lat: 44.611, lon: -123.155, mp: '12+440', conf: 0.68, capturedAt: '2026-04-29 14:13:55' },
  { id: 'DEF-04886', line: '1', sev: 'high', type: 'Surface wear',       lat: 44.620, lon: -123.135, mp: '15+650', conf: 0.79, capturedAt: '2026-04-29 14:21:48' },
  { id: 'DEF-04887', line: '1', sev: 'med',  type: 'Tie wear',           lat: 44.628, lon: -123.118, mp: '20+080', conf: 0.74, capturedAt: '2026-04-29 13:58:02' },
  // Route 2
  { id: 'DEF-04901', line: '2', sev: 'low',      type: 'Surface scratch',    lat: 45.470, lon: -122.660, mp: '5+200',   conf: 0.62, capturedAt: '2026-04-29 12:22:54' },
  { id: 'DEF-04902', line: '2', sev: 'med',      type: 'Loose fastener',     lat: 45.380, lon: -122.620, mp: '12+800',  conf: 0.74, capturedAt: '2026-04-29 12:35:11' },
  { id: 'DEF-04903', line: '2', sev: 'med',      type: 'Tie wear',           lat: 45.250, lon: -122.660, mp: '24+100',  conf: 0.71, capturedAt: '2026-04-29 12:48:29' },
  { id: 'DEF-04904', line: '2', sev: 'high',     type: 'Head check cluster', lat: 45.100, lon: -122.770, mp: '38+550',  conf: 0.85, capturedAt: '2026-04-29 13:02:17' },
  { id: 'DEF-04905', line: '2', sev: 'med',      type: 'Joint bolt loose',   lat: 44.943, lon: -123.035, mp: '52+200',  conf: 0.78, capturedAt: '2026-04-29 13:16:02' },
  { id: 'DEF-04906', line: '2', sev: 'low',      type: 'Ballast fouling',    lat: 44.840, lon: -123.060, mp: '63+780',  conf: 0.65, capturedAt: '2026-04-29 13:29:14' },
  { id: 'DEF-04907', line: '2', sev: 'med',      type: 'Surface wear',       lat: 44.730, lon: -123.080, mp: '74+910',  conf: 0.73, capturedAt: '2026-04-29 13:44:20' },
  { id: 'DEF-04908', line: '2', sev: 'resolved', type: 'Spike pulled',       lat: 44.636, lon: -123.106, mp: '85+440',  conf: 0.69, capturedAt: '2026-04-29 13:58:36' },
  { id: 'DEF-04909', line: '2', sev: 'high',     type: 'Defective fishplate',lat: 44.500, lon: -123.180, mp: '105+180', conf: 0.84, capturedAt: '2026-04-29 14:03:48' },
  { id: 'DEF-04910', line: '2', sev: 'med',      type: 'Gauge widening',     lat: 44.330, lon: -123.150, mp: '120+360', conf: 0.71, capturedAt: '2026-04-29 14:10:53' },
  { id: 'DEF-04911', line: '2', sev: 'low',      type: 'Vegetation',         lat: 44.200, lon: -123.110, mp: '140+200', conf: 0.66, capturedAt: '2026-04-29 14:13:55' },
  { id: 'DEF-04912', line: '2', sev: 'high',     type: 'Corrugation',        lat: 44.100, lon: -123.090, mp: '155+880', conf: 0.79, capturedAt: '2026-04-29 14:18:31' },
  // Route 3
  { id: 'DEF-04921', line: '3', sev: 'med',  type: 'Loose fastener',     lat: 44.890, lon: -122.800, mp: '14+580',  conf: 0.73, capturedAt: '2026-04-29 12:10:42' },
  { id: 'DEF-04922', line: '3', sev: 'high', type: 'Head check pattern', lat: 44.820, lon: -122.550, mp: '32+040',  conf: 0.83, capturedAt: '2026-04-29 12:24:08' },
  { id: 'DEF-04923', line: '3', sev: 'med',  type: 'Tie wear',           lat: 44.770, lon: -122.300, mp: '48+750',  conf: 0.71, capturedAt: '2026-04-29 12:39:54' },
  { id: 'DEF-04924', line: '3', sev: 'crit', type: 'Lateral misalign',   lat: 44.700, lon: -121.900, mp: '67+120',  conf: 0.91, capturedAt: '2026-04-29 14:19:02' },
  { id: 'DEF-04925', line: '3', sev: 'med',  type: 'Surface wear',       lat: 44.620, lon: -121.700, mp: '85+300',  conf: 0.74, capturedAt: '2026-04-29 12:59:16' },
  { id: 'DEF-04926', line: '3', sev: 'low',  type: 'Vegetation',         lat: 44.530, lon: -121.550, mp: '102+440', conf: 0.65, capturedAt: '2026-04-29 13:11:22' },
  { id: 'DEF-04927', line: '3', sev: 'high', type: 'Defective fishplate',lat: 44.400, lon: -121.420, mp: '125+880', conf: 0.84, capturedAt: '2026-04-29 13:25:03' },
  // Route 4
  { id: 'DEF-04931', line: '4', sev: 'low',  type: 'Surface scratch', lat: 47.560, lon: -122.342, mp: '4+200',  conf: 0.64, capturedAt: '2026-04-29 11:33:09' },
  { id: 'DEF-04932', line: '4', sev: 'med',  type: 'Loose fastener',  lat: 47.480, lon: -122.355, mp: '12+700', conf: 0.74, capturedAt: '2026-04-29 11:47:26' },
  { id: 'DEF-04933', line: '4', sev: 'high', type: 'Head check',      lat: 47.380, lon: -122.380, mp: '24+880', conf: 0.81, capturedAt: '2026-04-29 12:03:15' },
  { id: 'DEF-04934', line: '4', sev: 'med',  type: 'Tie wear',        lat: 47.290, lon: -122.420, mp: '38+040', conf: 0.72, capturedAt: '2026-04-29 12:15:44' }
];

export const FALLBACK_PINS = FALLBACK_PINS_BASE;

export const FOCUS_PIN = {
  id: 'DEF-04891', line: '1', sev: 'crit',
  type: 'Transverse crack', lat: 44.633, lon: -123.108, mp: '24+340', conf: 0.87,
  capturedAt: '2026-04-29 14:23:11'
};

export const CAMERAS = [
  {
    id: 'CAM-T422',
    label: 'T-422 Forward Cam',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    source: 'Placeholder stream · replace with production URL',
    line: '1'
  },
  {
    id: 'CAM-T388',
    label: 'T-388 Inspection Cam',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    source: 'Placeholder stream · replace with production URL',
    line: '3'
  }
];

export const TILE_PROVIDERS = [
  {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    options: { attribution: '© OSM · © CartoDB', subdomains: 'abcd', maxZoom: 19 }
  },
  {
    name: 'Stadia Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',
    options: { attribution: '© Stadia · © OSM', maxZoom: 20 }
  },
  {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: '© OSM', maxZoom: 19 }
  }
];
