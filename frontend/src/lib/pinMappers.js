function formatCapturedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
 * Maps a `pins` table row (your Supabase schema) to the shape used by the map and popups.
 * @param {Record<string, unknown>} row
 */
export function rowToPin(row) {
  const id = row.id != null ? String(row.id) : '';
  return {
    _rowId: id,
    id,
    line: row.line_id != null ? String(row.line_id) : '',
    sev: resolveSevForRow(row),
    type: row.defect_type != null ? String(row.defect_type) : '',
    lat: Number(row.lat),
    lon: Number(row.lon),
    mp: row.milepost != null ? String(row.milepost) : '',
    conf: row.confidence != null ? Number(row.confidence) : 0,
    capturedAt: formatCapturedAt(row.captured_at),
    imageUrl: row.image_path != null ? String(row.image_path) : '',
    status: row.status != null ? String(row.status) : undefined,
    deviceId: row.device_id != null ? String(row.device_id) : undefined,
    frameId: row.frame_id != null ? Number(row.frame_id) : undefined
  };
}

export function sortPinsByCapturedAtDesc(pins) {
  return [...pins].sort((a, b) => {
    const ta = a.capturedAt ? new Date(a.capturedAt.replace(' ', 'T')).getTime() : 0;
    const tb = b.capturedAt ? new Date(b.capturedAt.replace(' ', 'T')).getTime() : 0;
    return tb - ta;
  });
}
