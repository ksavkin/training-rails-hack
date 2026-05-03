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
  const thumbHtml = useImg
    ? `<img class="leaflet-pin-thumb" src="${escapeAttr(url)}" alt="" loading="lazy" decoding="async" />`
    : '';

  const cls =
    'leaflet-pin ' +
    sev +
    (isNewDrop ? ' new-drop' : '') +
    (useImg ? ' has-thumb' : '') +
    (compact ? ' leaflet-pin--compact' : '');

  // Solid teardrop (Material-style map pin); optional circular thumb in the bulb.
  const pinPath =
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

  const html =
    `<div class="${cls}">` +
    '<svg class="leaflet-pin-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    `<path class="leaflet-pin-drop" fill="currentColor" d="${pinPath}"/>` +
    '</svg>' +
    thumbHtml +
    '</div>';

  if (compact) {
    return L.divIcon({
      className: 'pin-icon-wrap pin-icon-wrap--compact',
      html,
      iconSize: [18, 22],
      iconAnchor: [9, 20]
    });
  }

  return L.divIcon({
    className: 'pin-icon-wrap',
    html,
    iconSize: [26, 32],
    iconAnchor: [13, 29]
  });
}
