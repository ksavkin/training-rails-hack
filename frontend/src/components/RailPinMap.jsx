import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import L from 'leaflet';
// Leaflet plugin must use this path: vite resolves `heatmap.js` to vendor patch, but keeps this import on node_modules (see vite.config.js aliases).
import HeatmapOverlayFactory from 'heatmap.js/plugins/leaflet-heatmap/leaflet-heatmap.js';
import { ROUTES, CITIES, FOCUS_PIN, CAMERAS, TILE_PROVIDERS } from '../data/railData.js';
import { makeDefectPinIcon, isPlaceholderMapImageUrl } from '../lib/leafletPinIcon.js';
import { formatDefectType } from '../lib/pinMappers.js';

const HeatmapOverlay = HeatmapOverlayFactory?.default ?? HeatmapOverlayFactory;

const SEV_HEAT = { crit: 10, high: 7, med: 5, low: 3, resolved: 2 };

function filterPinsByLine(pinList, lineFilter) {
  if (lineFilter === 'all') return pinList;
  return pinList.filter((p) => p.line === lineFilter);
}

function buildHeatmapPayload(pinList) {
  const data = pinList.map((pin) => ({
    lat: pin.lat,
    lng: pin.lon,
    count: SEV_HEAT[pin.sev] ?? 4
  }));
  const max = Math.max(1, ...data.map((d) => d.count));
  return { max, data };
}

function setupTilesWithFallback(map, badgeEl) {
  let providerIndex = 0;
  let currentLayer = null;
  let failCount = 0;
  let failResetAt = Date.now();

  function tryNext() {
    if (providerIndex >= TILE_PROVIDERS.length) {
      if (badgeEl) {
        badgeEl.textContent = 'No tiles · SVG fallback';
        badgeEl.classList.add('warn');
      }
      return;
    }
    const provider = TILE_PROVIDERS[providerIndex];
    if (badgeEl) {
      badgeEl.textContent = provider.name;
      badgeEl.classList.remove('warn');
    }
    if (currentLayer) map.removeLayer(currentLayer);
    failCount = 0;
    failResetAt = Date.now();

    currentLayer = L.tileLayer(provider.url, provider.options);
    currentLayer.on('tileerror', () => {
      const now = Date.now();
      if (now - failResetAt > 5000) { failCount = 0; failResetAt = now; }
      failCount++;
      if (failCount > 3) {
        providerIndex++;
        tryNext();
      }
    });
    currentLayer.addTo(map);
  }
  tryNext();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function statRow(label, value, valueClass = '') {
  if (value == null || value === '') return '';
  return (
    '<div class="pin-popup-stat">' +
    '<span class="pin-popup-stat-label">' +
    escapeHtml(label) +
    '</span>' +
    '<span class="pin-popup-stat-val ' +
    escapeHtml(valueClass) +
    '">' +
    escapeHtml(String(value)) +
    '</span>' +
    '</div>'
  );
}

function buildPopup(pin, onOpenDefect) {
  // Compact horizontal layout: photo on the left, identification + reduced
  // stats on the right. Reduces total height so the popup fits inside the
  // map viewport without forcing a Leaflet auto-pan, which was making the
  // map jiggle when the user hovered a pin near the edge. Full metadata
  // still lives in MapFocusPopup (opened via the "Open detail →" link).
  const wrap = document.createElement('div');
  const showImg = pin.imageUrl && !isPlaceholderMapImageUrl(pin.imageUrl);
  const preview = showImg
    ? '<div class="pin-popup-preview"><img src="' +
      escapeAttr(pin.imageUrl) +
      '" alt="" loading="lazy" decoding="async" /></div>'
    : '<div class="pin-popup-preview pin-popup-preview-empty"></div>';

  const confStr =
    pin.conf != null && Number.isFinite(Number(pin.conf))
      ? String(Math.round(Number(pin.conf) * 1000) / 1000)
      : pin.conf != null
        ? String(pin.conf)
        : '';

  const coords =
    Number.isFinite(pin.lat) && Number.isFinite(pin.lon)
      ? pin.lat.toFixed(4) + '°, ' + pin.lon.toFixed(4) + '°'
      : '';

  const stats =
    statRow('Line', pin.line) +
    statRow(
      'Severity',
      pin.severityNum != null
        ? String(pin.sev).toUpperCase() + ' · ' + pin.severityNum + '/10'
        : String(pin.sev).toUpperCase(),
      'pin-popup-severity-' + pin.sev
    ) +
    statRow('Confidence', confStr) +
    statRow('Captured', pin.capturedAt) +
    statRow('Coords', coords) +
    statRow('Status', pin.status);

  // Header carries the operator-relevant pair: severity tag + human-readable
  // defect type. The technical id+MP becomes a smaller caption below.
  const typeLabel = formatDefectType(pin.type);
  wrap.innerHTML =
    '<div class="pin-popup-grid">' +
    preview +
    '<div class="pin-popup-info">' +
    '<div class="pin-popup-header sev-badge ' +
    escapeHtml(pin.sev) +
    '">' +
    '<span class="pin-popup-header-sev">' +
    escapeHtml(String(pin.sev).toUpperCase()) +
    '</span>' +
    '<span class="pin-popup-header-type">' +
    escapeHtml(typeLabel) +
    '</span>' +
    '</div>' +
    '<div class="pin-popup-subtitle">' +
    escapeHtml(pin.id) +
    ' · MP ' +
    escapeHtml(pin.mp) +
    '</div>' +
    '<div class="pin-popup-stats">' +
    stats +
    '</div>' +
    '<a class="pin-popup-link" href="#">Open detail →</a>' +
    '</div>' +
    '</div>';
  // Whole popup (photo + info column + the explicit link) opens the full
  // MapFocusPopup. The link is kept as an explicit affordance, but a click
  // anywhere on the body works too — that matches what users expect when
  // the entire popup is the "card" for one defect.
  const openHandler = (e) => {
    e.preventDefault();
    onOpenDefect?.(pin);
  };
  wrap.querySelector('.pin-popup-grid')?.addEventListener('click', openHandler);
  return wrap;
}

function addCities(map) {
  CITIES.forEach((city) => {
    L.marker([city.lat, city.lon], {
      icon: L.divIcon({
        className: 'leaflet-city ' + (city.major ? 'major' : ''),
        html:
          '<div class="leaflet-city-content">' +
          '<span class="leaflet-city-dot"></span>' +
          '<span>' + city.name + '</span>' +
          '</div>',
        iconSize: [120, 12],
        iconAnchor: [0, 6]
      }),
      interactive: false,
      keyboard: false
    }).addTo(map);
  });
}

function addRoutes(map) {
  const bundles = {};
  Object.keys(ROUTES).forEach((id) => {
    const route = ROUTES[id];
    const glow = L.polyline(route.coords, { color: route.color, weight: 8, opacity: 0.18, lineCap: 'round' }).addTo(map);
    const main = L.polyline(route.coords, { color: route.color, weight: 3, opacity: 0.9, lineCap: 'round' }).addTo(map);
    const ties = L.polyline(route.coords, { color: route.color, weight: 6, opacity: 0.4, dashArray: '1, 12', lineCap: 'round' }).addTo(map);
    bundles[id] = [
      { layer: glow, originalOpacity: 0.18 },
      { layer: main, originalOpacity: 0.9 },
      { layer: ties, originalOpacity: 0.4 }
    ];
  });
  return bundles;
}

// Hover mode (default): open the popup on marker hover, keep it while the
// cursor is on the popup, close after a short grace period when the cursor
// leaves both. Click mode: skip hover handlers entirely — Leaflet's default
// click-toggle from bindPopup is sufficient. The mode is read live from
// `hoverPreviewRef` so toggling the dashboard checkbox doesn't require
// rebuilding markers.
const HOVER_CLOSE_GRACE_MS = 200;

function attachHoverHandlers(marker, hoverPreviewRef) {
  const clearTimer = () => {
    if (marker._closeTimer) {
      clearTimeout(marker._closeTimer);
      marker._closeTimer = null;
    }
  };
  const scheduleClose = () => {
    if (!hoverPreviewRef.current) return;
    clearTimer();
    marker._closeTimer = setTimeout(() => {
      marker.closePopup();
      marker._closeTimer = null;
    }, HOVER_CLOSE_GRACE_MS);
  };

  marker.on('mouseover', () => {
    if (!hoverPreviewRef.current) return;
    clearTimer();
    marker.openPopup();
  });
  marker.on('mouseout', scheduleClose);

  // Click on the marker pans the map smoothly to the pin. Leaflet's default
  // bindPopup click-to-toggle still runs (handles the click-mode preview).
  marker.on('click', () => {
    const map = marker._map;
    if (!map) return;
    map.panTo(marker.getLatLng(), { animate: true, duration: 0.5, easeLinearity: 0.5 });
  });

  marker.on('popupopen', (e) => {
    const el = e.popup.getElement();
    if (!el) return;
    el.addEventListener('mouseenter', clearTimer);
    el.addEventListener('mouseleave', scheduleClose);
    marker.once('popupclose', () => {
      clearTimer();
      el.removeEventListener('mouseenter', clearTimer);
      el.removeEventListener('mouseleave', scheduleClose);
    });
  });
}

function removeMarker(map, marker) {
  if (marker._closeTimer) {
    clearTimeout(marker._closeTimer);
    marker._closeTimer = null;
  }
  map.removeLayer(marker);
}

function popupOptions(pin) {
  return {
    closeButton: false,
    offset: [0, -18],
    maxWidth: 440,
    minWidth: 380,
    autoPan: false,
    className: `pin-popup pin-popup-${pin.sev || 'low'}`,
  };
}

function addPins(map, pinList, onOpenDefect, hoverPreviewRef) {
  const markers = [];
  const dataMap = new Map();
  pinList.forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lon], { icon: makeDefectPinIcon(pin, false) }).addTo(map);
    marker.bindPopup(buildPopup(pin, onOpenDefect), popupOptions(pin));
    attachHoverHandlers(marker, hoverPreviewRef);
    markers.push(marker);
    dataMap.set(marker, pin);
  });
  return { markers, dataMap };
}

function replacePinMarkers(map, pinStateRef, pinList, onOpenDefect, hoverPreviewRef) {
  const prev = pinStateRef.current;
  if (prev?.markers?.length) {
    prev.markers.forEach((m) => removeMarker(map, m));
  }
  pinStateRef.current = addPins(map, pinList, onOpenDefect, hoverPreviewRef);
}

function makeCameraIcon(label, cls) {
  return L.divIcon({
    className: 'leaflet-train-icon-wrap',
    html:
      '<div class="leaflet-train-wrap">' +
      '<span class="leaflet-train-label ' + cls + '">' + label + '</span>' +
      '<div class="leaflet-train-circle ' + cls + '">' +
      '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1l3-2v10l-3-2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="9" cy="12" r="2.1"/></svg>' +
      '</div>' +
      '</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

/** Bounding box of every route vertex — used so the map is zoomed in enough to see train motion. */
function boundsFromAllRoutes() {
  const pts = Object.values(ROUTES).flatMap((r) => r.coords);
  return L.latLngBounds(pts);
}

// Speed model for the demo train markers. Configurable via env so the
// demo can crank to e.g. 600 km/h for a more visually dynamic playback
// without code changes. Default 150 km/h is realistic for freight rail.
//   VITE_TRAIN_SPEED_KMH=150   (default)
//   VITE_TRAIN_SPEED_KMH=600   (zoomy demo mode)
const TRAIN_SPEED_KMH = (() => {
  const raw = Number(import.meta.env.VITE_TRAIN_SPEED_KMH);
  return Number.isFinite(raw) && raw > 0 ? raw : 150;
})();

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routeLengthKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function durationMsFor(coords, speedKmh = TRAIN_SPEED_KMH) {
  const km = routeLengthKm(coords);
  if (km <= 0 || speedKmh <= 0) return 60000;
  return Math.round((km / speedKmh) * 3600 * 1000);
}

function animateTrainAlongRoute(map, marker, coords, durationMs, stopRef) {
  const t0 = performance.now();
  function step(now) {
    if (stopRef.current) return;
    const root = map?.getContainer?.();
    if (!root || !map.hasLayer(marker)) return;

    const t = typeof now === 'number' ? now : performance.now();
    const elapsed = t - t0;
    const progress = (elapsed % durationMs) / durationMs;
    const idx = progress * (coords.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, coords.length - 1);
    const f = idx - i0;
    const lat = coords[i0][0] + (coords[i1][0] - coords[i0][0]) * f;
    const lon = coords[i0][1] + (coords[i1][1] - coords[i0][1]) * f;
    marker.setLatLng([lat, lon]);

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const RailPinMap = forwardRef(function RailPinMap(
  { pins = [], pageActive, lineFilter, heatmapEnabled = false, hoverPreview = true, onOpenDefect, onOpenCamera },
  ref
) {
  const containerRef = useRef(null);
  const badgeRef = useRef(null);
  const mapRef = useRef(null);
  const routeBundlesRef = useRef(null);
  const pinStateRef = useRef(null);
  const train422Ref = useRef(null);
  const demoMarkerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const stopAnimRef = useRef({ current: false });
  const onOpenDefectRef = useRef(onOpenDefect);
  const onOpenCameraRef = useRef(onOpenCamera);
  const lineFilterRef = useRef(lineFilter);
  const hoverPreviewRef = useRef(hoverPreview);
  const pinsRef = useRef(pins);
  lineFilterRef.current = lineFilter;
  hoverPreviewRef.current = hoverPreview;
  pinsRef.current = pins;

  // Keep callback ref in sync without re-running init effect
  useEffect(() => { onOpenDefectRef.current = onOpenDefect; }, [onOpenDefect]);
  useEffect(() => { onOpenCameraRef.current = onOpenCamera; }, [onOpenCamera]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true
    });
    mapRef.current = map;

    // Zoom ~7 showed the whole corridor as a few pixels; trains moved but were visually static.
    map.fitBounds(boundsFromAllRoutes(), { padding: [44, 44], maxZoom: 10 });

    setupTilesWithFallback(map, badgeRef.current);
    routeBundlesRef.current = addRoutes(map);
    addCities(map);
    pinStateRef.current = addPins(map, [], (pin) => onOpenDefectRef.current?.(pin), hoverPreviewRef);

    // --- Heatmap (overlay instance + ref only). Toggle lives in a separate useEffect; pins effect updates setData. Do not add camera/train logic here. ---
    const heatCfg = {
      // scaleRadius:true multiplies radius by 2^zoom (hundreds–thousands of px); keep fixed screen px.
      radius: 80,
      maxOpacity: 0.7,
      minOpacity: 0.15,
      blur: 0.65,
      scaleRadius: false,
      useLocalExtrema: false,
      latField: 'lat',
      lngField: 'lng',
      valueField: 'count'
    };
    const heatLayer = new HeatmapOverlay(heatCfg);
    heatLayer.setData(buildHeatmapPayload(filterPinsByLine([], lineFilterRef.current)));
    heatmapLayerRef.current = heatLayer;

    // --- Live camera markers (rAF path along ROUTES; unrelated to heatmap layer lifetime). ---
    const train422 = L.marker(ROUTES['1'].coords[0], { icon: makeCameraIcon('T-422', ''), zIndexOffset: 800 }).addTo(map);
    const train388 = L.marker(ROUTES['3'].coords[1], { icon: makeCameraIcon('T-388', 't-388'), zIndexOffset: 800 }).addTo(map);
    train422.on('click', () => onOpenCameraRef.current?.(CAMERAS[0]));
    train388.on('click', () => onOpenCameraRef.current?.(CAMERAS[1]));
    train422Ref.current = train422;

    const stopRef = { current: false };
    stopAnimRef.current = stopRef;

    const startTrainAnimations = () => {
      map.invalidateSize();
      animateTrainAlongRoute(map, train422, ROUTES['1'].coords, durationMsFor(ROUTES['1'].coords), stopRef);
      animateTrainAlongRoute(map, train388, ROUTES['3'].coords, durationMsFor(ROUTES['3'].coords), stopRef);
    };

    map.whenReady(() => {
      map.invalidateSize();
      requestAnimationFrame(() => {
        requestAnimationFrame(startTrainAnimations);
      });
    });

    let resizeObs = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObs.observe(containerRef.current);
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      stopRef.current = true;
      resizeObs?.disconnect();
      heatmapLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Resize when page becomes active (Leaflet inside hidden container fix)
  useEffect(() => {
    if (pageActive && mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 100);
    }
  }, [pageActive]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = heatmapLayerRef.current;
    if (!map || !layer) return;
    if (heatmapEnabled) {
      layer.addTo(map);
      layer.setData(buildHeatmapPayload(filterPinsByLine(pinsRef.current, lineFilterRef.current)));
    } else {
      map.removeLayer(layer);
    }
  }, [heatmapEnabled]);

  // Pins + line filter: markers, route emphasis, heatmap
  useEffect(() => {
    const map = mapRef.current;
    const bundles = routeBundlesRef.current;
    const pinState = pinStateRef.current;
    if (!map || !bundles || !pinState) return;

    replacePinMarkers(map, pinStateRef, pins, (pin) => onOpenDefectRef.current?.(pin), hoverPreviewRef);

    Object.keys(bundles).forEach((id) => {
      const visible = lineFilter === 'all' || lineFilter === id;
      bundles[id].forEach((item) => {
        const target = visible ? item.originalOpacity : 0.12;
        item.layer.setStyle({ opacity: target });
      });
    });

    const state = pinStateRef.current;
    state.markers.forEach((marker) => {
      const pin = state.dataMap.get(marker);
      if (!pin) return;
      const visible = lineFilter === 'all' || pin.line === lineFilter;
      const el = marker.getElement();
      if (el) {
        const inner = el.querySelector('.leaflet-pin');
        if (inner) {
          inner.style.opacity = visible ? '' : '0.15';
          inner.style.pointerEvents = visible ? '' : 'none';
        }
      }
    });

    if (demoMarkerRef.current) {
      const visible = lineFilter === 'all' || lineFilter === '1';
      const el = demoMarkerRef.current.getElement();
      if (el) {
        const inner = el.querySelector('.leaflet-pin');
        if (inner) {
          inner.style.opacity = visible ? '' : '0.15';
          inner.style.pointerEvents = visible ? '' : 'none';
        }
      }
    }

    const heat = heatmapLayerRef.current;
    if (heat) {
      heat.setData(buildHeatmapPayload(filterPinsByLine(pins, lineFilter)));
    }
  }, [pins, lineFilter]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    focusOnPin: ({ lat, lon, zoom = 12 }) => {
      const map = mapRef.current;
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      map.setView([lat, lon], zoom, { animate: true });
    },
    centerOnTrain: () => {
      const t = train422Ref.current;
      const m = mapRef.current;
      if (t && m) m.setView(t.getLatLng(), 12, { animate: true });
    },
    dropDemoPin: () => {
      const map = mapRef.current;
      if (!map) return;
      if (demoMarkerRef.current) {
        removeMarker(map, demoMarkerRef.current);
        demoMarkerRef.current = null;
      }
      const m = L.marker([FOCUS_PIN.lat, FOCUS_PIN.lon], {
        icon: makeDefectPinIcon(FOCUS_PIN, { isNewDrop: true })
      }).addTo(map);
      m.bindPopup(buildPopup(FOCUS_PIN, (pin) => onOpenDefectRef.current?.(pin)), popupOptions(FOCUS_PIN));
      attachHoverHandlers(m, hoverPreviewRef);
      demoMarkerRef.current = m;
      map.setView([FOCUS_PIN.lat, FOCUS_PIN.lon], 11, { animate: true });
    }
  }));

  return (
    <>
      <div id="dashboard-map-leaflet" ref={containerRef} />
      <div className="tile-provider-badge" ref={badgeRef}>Loading tiles…</div>
    </>
  );
});

export default RailPinMap;
