import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import L from 'leaflet';
import HeatmapOverlayFactory from 'heatmap.js/plugins/leaflet-heatmap/leaflet-heatmap.js';
import { ROUTES, CITIES, FOCUS_PIN, CAMERAS, TILE_PROVIDERS } from '../data/railData.js';

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

function makePinIcon(sev, isNewDrop) {
  const cls = 'leaflet-pin ' + sev + (isNewDrop ? ' new-drop' : '');
  return L.divIcon({
    className: 'pin-icon-wrap',
    html:
      '<div class="' + cls + '">' +
      '<span class="leaflet-pin-head"></span>' +
      '<span class="leaflet-pin-tip"></span>' +
      '</div>',
    iconSize: [22, 30],
    iconAnchor: [11, 29]
  });
}

function buildPopup(pin, onOpenDefect) {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<div class="pin-popup-id">' + pin.id + ' · MP ' + pin.mp + '</div>' +
    '<span class="sev-badge ' + pin.sev + '">' + pin.sev.toUpperCase() + '</span>' +
    '<div class="pin-popup-title" style="margin-top:6px;">' + pin.type + '</div>' +
    '<div class="pin-popup-meta">' +
      'Confidence ' + pin.conf + '<br>' +
      pin.lat.toFixed(4) + '°N · ' + (-pin.lon).toFixed(4) + '°W' +
    '</div>' +
    '<a class="pin-popup-link">Open popup →</a>';
  const link = wrap.querySelector('.pin-popup-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onOpenDefect?.(pin);
    });
  }
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

function addPins(map, pinList, onOpenDefect) {
  const markers = [];
  const dataMap = new Map();
  pinList.forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lon], { icon: makePinIcon(pin.sev, false) }).addTo(map);
    marker.on('click', () => onOpenDefect?.(pin));
    marker.bindPopup(buildPopup(pin, onOpenDefect), { closeButton: false, offset: [0, -18] });
    markers.push(marker);
    dataMap.set(marker, pin);
  });
  return { markers, dataMap };
}

function replacePinMarkers(map, pinStateRef, pinList, onOpenDefect) {
  const prev = pinStateRef.current;
  if (prev?.markers?.length) {
    prev.markers.forEach((m) => {
      map.removeLayer(m);
    });
  }
  pinStateRef.current = addPins(map, pinList, onOpenDefect);
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
  { pins = [], pageActive, lineFilter, heatmapEnabled = false, onOpenDefect, onOpenCamera },
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
  lineFilterRef.current = lineFilter;

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
    pinStateRef.current = addPins(map, [], (pin) => onOpenDefectRef.current?.(pin));

    const train422 = L.marker(ROUTES['1'].coords[0], { icon: makeCameraIcon('T-422', ''), zIndexOffset: 800 }).addTo(map);
    const train388 = L.marker(ROUTES['3'].coords[1], { icon: makeCameraIcon('T-388', 't-388'), zIndexOffset: 800 }).addTo(map);
    train422.on('click', () => onOpenCameraRef.current?.(CAMERAS[0]));
    train388.on('click', () => onOpenCameraRef.current?.(CAMERAS[1]));
    train422Ref.current = train422;

    const stopRef = { current: false };
    stopAnimRef.current = stopRef;

    const startTrainAnimations = () => {
      map.invalidateSize();
      animateTrainAlongRoute(map, train422, ROUTES['1'].coords, 30000, stopRef);
      animateTrainAlongRoute(map, train388, ROUTES['3'].coords, 90000, stopRef);
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

    const heatCfg = {
      radius: 2,
      maxOpacity: 0.34,
      minOpacity: 0.04,
      blur: 0.78,
      scaleRadius: true,
      useLocalExtrema: true,
      latField: 'lat',
      lngField: 'lng',
      valueField: 'count'
    };
    const heatLayer = new HeatmapOverlay(heatCfg);
    heatLayer.setData(buildHeatmapPayload(filterPinsByLine([], lineFilterRef.current)));
    heatmapLayerRef.current = heatLayer;

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
      if (typeof layer.bringToBack === 'function') layer.bringToBack();
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

    replacePinMarkers(map, pinStateRef, pins, (pin) => onOpenDefectRef.current?.(pin));

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
    centerOnTrain: () => {
      const t = train422Ref.current;
      const m = mapRef.current;
      if (t && m) m.setView(t.getLatLng(), 12, { animate: true });
    },
    dropDemoPin: () => {
      const map = mapRef.current;
      if (!map) return;
      if (demoMarkerRef.current) {
        map.removeLayer(demoMarkerRef.current);
        demoMarkerRef.current = null;
      }
      const m = L.marker([FOCUS_PIN.lat, FOCUS_PIN.lon], {
        icon: makePinIcon('crit', true)
      }).addTo(map);
      m.on('click', () => onOpenDefectRef.current?.(FOCUS_PIN));
      m.bindPopup(buildPopup(FOCUS_PIN, (pin) => onOpenDefectRef.current?.(pin)), { closeButton: false, offset: [0, -18] });
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
