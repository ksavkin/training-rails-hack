import { resolveDefectImageUrl } from './defectImageUrl.js';

export const DEFECT_CATEGORIES = ['Squats', 'Flaking', 'Crack', 'Spalling', 'Shelling'];

export function displayDefectCategory(value, seed = '') {
  const normalized = value != null ? String(value).trim().toLowerCase() : '';
  const direct = DEFECT_CATEGORIES.find((category) => category.toLowerCase() === normalized);
  if (direct) return direct;
  if (normalized.includes('squat')) return 'Squats';
  if (normalized.includes('flak')) return 'Flaking';
  if (normalized.includes('crack') || normalized.includes('fracture')) return 'Crack';
  if (normalized.includes('spall')) return 'Spalling';
  if (normalized.includes('shell')) return 'Shelling';

  const text = `${seed || value || ''}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return DEFECT_CATEGORIES[hash % DEFECT_CATEGORIES.length];
}

function formatCapturedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Raw DB severity at/above this triggers real-time critical alert + map focus (1–10 scale). */
export const CRITICAL_ALERT_SEVERITY_THRESHOLD = 7;

/**
 * Map numeric severity (e.g. 1–10 score) to heatmap / marker band used by the UI.
 * Adjust here if your `pins.severity` uses a different scale.
 */
export function severityIntToSevBand(severity) {
  const n = Number(severity);
  if (!Number.isFinite(n)) return 'med';
  if (n >= 9) return 'crit';
  if (n >= 7) return 'high';
  if (n >= 5) return 'med';
  if (n >= 3) return 'low';
  return 'low';
}

function rowLooksResolved(row) {
  if (row.resolved_at != null) return true;
  const s = row.status != null ? String(row.status).toLowerCase() : '';
  return (
    s.includes('resolved') ||
    s === 'closed' ||
    s === 'complete' ||
    s === 'dismissed'
  );
}

function resolveSevForRow(row) {
  if (rowLooksResolved(row)) return 'resolved';
  return severityIntToSevBand(row.severity);
}

/**
 * True when a realtime INSERT or UPDATE should surface the critical UI (not on initial fetch).
 * Fires for new rows at/above threshold, or when severity crosses up into the critical band.
 */
export function shouldTriggerCriticalRealtimeAlert(prevRow, nextRow) {
  if (!nextRow) return false;
  if (rowLooksResolved(nextRow)) return false;
  const next = Number(nextRow.severity);
  if (!Number.isFinite(next) || next < CRITICAL_ALERT_SEVERITY_THRESHOLD) return false;

  const prevSev = prevRow != null ? Number(prevRow.severity) : NaN;
  const hadCriticalAlready = Number.isFinite(prevSev) && prevSev >= CRITICAL_ALERT_SEVERITY_THRESHOLD;
  if (hadCriticalAlready) return false;

  return true;
}

/**
 * Maps a `pins` table row (your Supabase schema) to the shape used by the map and popups.
 * @param {Record<string, unknown>} row
 */
function pickImagePath(row) {
  const v = row.image_path ?? row.imagePath;
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

export function rowToPin(row) {
  const id = row.id != null ? String(row.id) : '';
  const severityNum = row.severity != null ? Number(row.severity) : null;
  const notesRaw = row.notes != null ? String(row.notes).trim() : '';
  const imagePath = pickImagePath(row);
  return {
    _rowId: id,
    id,
    line: row.line_id != null ? String(row.line_id) : '',
    sev: resolveSevForRow(row),
    severityNum: Number.isFinite(severityNum) ? severityNum : null,
    type: displayDefectCategory(row.defect_type, id),
    lat: Number(row.lat),
    lon: Number(row.lon),
    mp: row.milepost != null ? String(row.milepost) : '',
    conf: row.confidence != null ? Number(row.confidence) : 0,
    capturedAt: formatCapturedAt(row.captured_at),
    imageUrl: resolveDefectImageUrl(imagePath),
    imagePath: imagePath || undefined,
    status: row.status != null ? String(row.status) : undefined,
    deviceId: row.device_id != null ? String(row.device_id) : undefined,
    frameId: row.frame_id != null ? Number(row.frame_id) : undefined,
    resolvedAt: row.resolved_at != null ? formatCapturedAt(row.resolved_at) : undefined,
    createdAt: row.created_at != null ? formatCapturedAt(row.created_at) : undefined,
    updatedAt: row.updated_at != null ? formatCapturedAt(row.updated_at) : undefined,
    notes: notesRaw || undefined
  };
}

export function sortPinsByCapturedAtDesc(pins) {
  return [...pins].sort((a, b) => {
    const ta = a.capturedAt ? new Date(a.capturedAt.replace(' ', 'T')).getTime() : 0;
    const tb = b.capturedAt ? new Date(b.capturedAt.replace(' ', 'T')).getTime() : 0;
    return tb - ta;
  });
}
