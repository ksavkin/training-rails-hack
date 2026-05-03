import L from 'leaflet';

/** Demo / generic placeholders — use severity-colored marker instead of a fake thumbnail. */
export function isPlaceholderMapImageUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase();
  return u.includes('placehold.co') || u.includes('via.placeholder') || u.includes('placeholder.com');
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Leaflet divIcon for a defect pin: optional real thumbnail inside the head, else severity fill.
 * @param {object} pin — expects `sev`, `imageUrl`
 * @param {{ isNewDrop?: boolean, compact?: boolean }} [options]
 */
export function makeDefectPinIcon(pin, options = {}) {
  const { isNewDrop = false, compact = false } = options;
  const sev = pin?.sev || 'med';
  const url = pin?.imageUrl;
  const useImg = Boolean(url) && !isPlaceholderMapImageUrl(url);
  const headInner = useImg
    ? `<img class="leaflet-pin-thumb" src="${escapeAttr(url)}" alt="" loading="lazy" decoding="async" />`
    : '<span class="leaflet-pin-head-fill"></span>';

  const cls =
    'leaflet-pin ' +
    sev +
    (isNewDrop ? ' new-drop' : '') +
    (useImg ? ' has-thumb' : '') +
    (compact ? ' leaflet-pin--compact' : '');

  const html =
    `<div class="${cls}">` +
    '<span class="leaflet-pin-head">' +
    headInner +
    '</span>' +
    '<span class="leaflet-pin-tip"></span>' +
    '</div>';

  if (compact) {
    return L.divIcon({
      className: 'pin-icon-wrap pin-icon-wrap--compact',
      html,
      iconSize: [16, 24],
      iconAnchor: [8, 22]
    });
  }

  return L.divIcon({
    className: 'pin-icon-wrap',
    html,
    iconSize: [22, 30],
    iconAnchor: [11, 29]
  });
}
