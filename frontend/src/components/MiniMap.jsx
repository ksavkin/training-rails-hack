import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ROUTES, CITIES, FOCUS_PIN, TILE_PROVIDERS } from '../data/railData.js';
import { makeDefectPinIcon } from '../lib/leafletPinIcon.js';

function setupTiles(map) {
  let i = 0;
  let layer = null;
  let fail = 0;
  let resetAt = Date.now();
  function next() {
    if (i >= TILE_PROVIDERS.length) return;
    const p = TILE_PROVIDERS[i];
    if (layer) map.removeLayer(layer);
    fail = 0;
    resetAt = Date.now();
    layer = L.tileLayer(p.url, p.options);
    layer.on('tileerror', () => {
      const now = Date.now();
      if (now - resetAt > 5000) { fail = 0; resetAt = now; }
      fail++;
      if (fail > 3) { i++; next(); }
    });
    layer.addTo(map);
  }
  next();
}


export default function MiniMap({ pageActive, pins = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routePinsRef = useRef([]);
  const focusMarkerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      dragging: false,
      touchZoom: false
    }).setView([FOCUS_PIN.lat, FOCUS_PIN.lon], 12);
    mapRef.current = map;

    setupTiles(map);

    const r1 = ROUTES['1'];
    L.polyline(r1.coords, { color: r1.color, weight: 8, opacity: 0.18, lineCap: 'round' }).addTo(map);
    L.polyline(r1.coords, { color: r1.color, weight: 3, opacity: 0.9, lineCap: 'round' }).addTo(map);
    L.polyline(r1.coords, { color: r1.color, weight: 6, opacity: 0.4, dashArray: '1, 12', lineCap: 'round' }).addTo(map);

    [CITIES[3], CITIES[2]].forEach((c) => {
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: 'leaflet-city major',
          html:
            '<div class="leaflet-city-content">' +
            '<span class="leaflet-city-dot"></span>' +
            '<span>' + c.name + '</span>' +
            '</div>',
          iconSize: [120, 12],
          iconAnchor: [0, 6]
        }),
        interactive: false
      }).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      routePinsRef.current = [];
      focusMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routePinsRef.current.forEach((m) => map.removeLayer(m));
    routePinsRef.current = [];
    if (focusMarkerRef.current) {
      map.removeLayer(focusMarkerRef.current);
      focusMarkerRef.current = null;
    }
    pins
      .filter((p) => p.line === '1')
      .forEach((pin) => {
        const m = L.marker([pin.lat, pin.lon], { icon: makeDefectPinIcon(pin, { compact: true }) }).addTo(map);
        routePinsRef.current.push(m);
      });
    focusMarkerRef.current = L.marker([FOCUS_PIN.lat, FOCUS_PIN.lon], {
      icon: makeDefectPinIcon(FOCUS_PIN, { compact: true })
    }).addTo(map);
  }, [pins]);

  useEffect(() => {
    if (pageActive && mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 100);
    }
  }, [pageActive]);

  return <div id="defect-mini-map-leaflet" ref={containerRef} />;
}
