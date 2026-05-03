import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Icon, IconSprite } from './Icons.jsx';
import { formatDefectType, severityIntToSevBand } from '../lib/pinMappers.js';
import { resolveDefectImageUrl } from '../lib/defectImageUrl.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ACTION_LABELS = {
  accepted: 'Accept',
  en_route: 'En route',
  completed: 'Completed',
  cannot_complete: 'Cannot complete',
};

// Required for Cannot complete; optional for the rest. Operator on the
// dispatcher side needs a written reason when work didn't get done.
const COMMENT_REQUIRED = new Set(['cannot_complete']);

// Mirror of backend `_NEXT_ACTIONS` in app/worker.py — UI hides buttons that
// the server would 409 anyway, so the worker doesn't see "press → fail".
// Keep in sync if either side changes.
const NEXT_ACTIONS = {
  null: ['accepted', 'cannot_complete'],
  accepted: ['en_route', 'completed', 'cannot_complete'],
  en_route: ['completed', 'cannot_complete'],
  completed: [],
  cannot_complete: [],
};

function availableActions(lastAction) {
  const key = lastAction == null ? 'null' : lastAction;
  return NEXT_ACTIONS[key] || [];
}

function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDeg(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function compass(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function defectIcon(sev) {
  const palette = {
    crit: '#ef4444',
    high: '#f97316',
    med: '#eab308',
    low: '#22c55e',
    resolved: '#10b981',
  };
  const color = palette[sev] || palette.med;
  return L.divIcon({
    className: 'worker-defect-marker',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function workerIcon() {
  return L.divIcon({
    className: 'worker-self-marker',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function WorkerView({ pinId }) {
  const [pin, setPin] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [workerPos, setWorkerPos] = useState(null);
  const [geoState, setGeoState] = useState('idle'); // idle | requesting | granted | denied | unsupported
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [submittedActions, setSubmittedActions] = useState([]); // for the timeline
  const [terminal, setTerminal] = useState(null); // 'completed' | 'cannot_complete' | null
  const [photoOpen, setPhotoOpen] = useState(false);

  // Esc closes the lightbox.
  useEffect(() => {
    if (!photoOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setPhotoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoOpen]);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const defectMarkerRef = useRef(null);
  const workerMarkerRef = useRef(null);
  const lineRef = useRef(null);

  // The dashboard locks body/html/#root to overflow:hidden for its fixed
  // layout. Worker view is a long mobile column — let the document scroll
  // natively (better touch scrolling on iOS than nested overflow:auto).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      rootOverflow: root?.style.overflow,
      rootHeight: root?.style.height,
    };
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      if (root) {
        root.style.overflow = prev.rootOverflow ?? '';
        root.style.height = prev.rootHeight ?? '';
      }
    };
  }, []);

  // Fetch pin details once.
  useEffect(() => {
    let alive = true;
    if (!pinId) {
      setLoadState('error');
      setErrorMsg('No pin id in URL');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/worker/pins/${encodeURIComponent(pinId)}`);
        if (!res.ok) {
          const text = await res.text();
          let detail = text;
          try { detail = JSON.parse(text).detail || text; } catch {}
          if (!alive) return;
          setErrorMsg(detail || `HTTP ${res.status}`);
          setLoadState('error');
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setPin(data);
        setLoadState('ready');
        // Restore terminal banner if the worker already finalized the pin
        // in a previous session (linked to the same SMS, opened twice).
        if (data.last_action === 'completed' || data.last_action === 'cannot_complete') {
          setTerminal(data.last_action);
        } else if (data.status === 'resolved') {
          setTerminal('completed');
        }
      } catch (err) {
        if (!alive) return;
        setErrorMsg(err.message || 'Network error');
        setLoadState('error');
      }
    })();
    return () => { alive = false; };
  }, [pinId]);

  // Geolocation. Watch instead of one-shot so the worker marker updates as
  // they drive toward the pin. Falls back to silent no-op without a fix.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('requesting');
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setWorkerPos({ lat: p.coords.latitude, lon: p.coords.longitude });
        setGeoState('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoState('denied');
        else setGeoState('idle');
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Init Leaflet once we have the pin.
  useEffect(() => {
    if (loadState !== 'ready' || !pin || !mapElRef.current || mapRef.current) return;

    const center = [Number(pin.lat), Number(pin.lon)];
    const map = L.map(mapElRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const sev = pin.status === 'resolved' ? 'resolved' : severityIntToSevBand(pin.severity);
    defectMarkerRef.current = L.marker(center, { icon: defectIcon(sev) }).addTo(map);
    mapRef.current = map;

    // Container size can change after init (viewport-meta apply, sidebar layout
    // shifts, mobile rotate). Leaflet caches the size at init, so without
    // invalidateSize() the world map renders into the OLD dimensions and
    // markers fall outside the visible window.
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      // Refit to whatever bounds exist right now (defect alone or with worker).
      const layers = [defectMarkerRef.current, workerMarkerRef.current].filter(Boolean);
      if (layers.length === 2) {
        map.fitBounds(L.featureGroup(layers).getBounds().pad(0.4), { animate: false });
      }
    });
    ro.observe(mapElRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      defectMarkerRef.current = null;
      workerMarkerRef.current = null;
      lineRef.current = null;
    };
  }, [loadState, pin]);

  // Keep the worker marker + connecting line in sync with geolocation updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pin || !workerPos) return;
    const wLatLng = [workerPos.lat, workerPos.lon];
    const dLatLng = [Number(pin.lat), Number(pin.lon)];

    if (workerMarkerRef.current) {
      workerMarkerRef.current.setLatLng(wLatLng);
    } else {
      workerMarkerRef.current = L.marker(wLatLng, { icon: workerIcon() }).addTo(map);
    }

    if (lineRef.current) {
      lineRef.current.setLatLngs([wLatLng, dLatLng]);
    } else {
      lineRef.current = L.polyline([wLatLng, dLatLng], {
        color: '#3b82f6', weight: 3, dashArray: '6,6', opacity: 0.85,
      }).addTo(map);
    }

    map.fitBounds(L.latLngBounds([wLatLng, dLatLng]).pad(0.4), { animate: false });
  }, [workerPos, pin]);

  const distance = workerPos && pin ? haversineKm(workerPos, { lat: Number(pin.lat), lon: Number(pin.lon) }) : null;
  const bearing = workerPos && pin ? bearingDeg(workerPos, { lat: Number(pin.lat), lon: Number(pin.lon) }) : null;

  const submit = useCallback(async (action) => {
    if (!pin?.id) return;
    if (COMMENT_REQUIRED.has(action) && !comment.trim()) {
      alert('Comment required for "Cannot complete".');
      return;
    }
    setPendingAction(action);
    try {
      const body = {
        action,
        comment: comment.trim() || undefined,
        worker_lat: workerPos?.lat,
        worker_lon: workerPos?.lon,
      };
      const res = await fetch(`${API_URL}/worker/pins/${encodeURIComponent(pin.id)}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch {}
        alert(`Failed: ${detail || res.status}`);
        return;
      }
      const data = await res.json();
      if (data.pin) setPin((p) => ({ ...p, ...data.pin }));
      setSubmittedActions((arr) => [...arr, { action, at: new Date().toISOString() }]);
      setComment('');
      if (action === 'completed' || action === 'cannot_complete') {
        setTerminal(action);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setPendingAction(null);
    }
  }, [pin, comment, workerPos]);

  if (loadState === 'loading') {
    return (
      <>
        <IconSprite />
        <div className="worker-shell">
          <div className="worker-loading">Loading…</div>
        </div>
      </>
    );
  }
  if (loadState === 'error') {
    return (
      <>
        <IconSprite />
        <div className="worker-shell">
          <div className="worker-error">
            <h1>Link error</h1>
            <p>{errorMsg}</p>
            <p className="muted">Check the SMS link or contact dispatch.</p>
          </div>
        </div>
      </>
    );
  }

  const sev = pin.status === 'resolved' ? 'resolved' : severityIntToSevBand(pin.severity);
  const imgUrl = resolveDefectImageUrl(pin.image_path);

  return (
    <>
    <IconSprite />
    <div className={`worker-shell sev-${sev}`}>
      <header className="worker-head">
        <div className="worker-head-row">
          <span className={`worker-sev-tag sev-${sev}`}>
            {sev === 'resolved' ? 'RESOLVED' : sev.toUpperCase()}
          </span>
          <span className="worker-type">{formatDefectType(pin.defect_type)}</span>
        </div>
        <div className="worker-sub">
          {pin.id} · {pin.milepost ? (/^mp\b/i.test(pin.milepost) ? pin.milepost : `MP ${pin.milepost}`) : '—'} · severity {pin.severity}/10
        </div>
      </header>

      <div ref={mapElRef} className="worker-map" />

      <div className="worker-distance">
        {workerPos ? (
          <>
            <span className="big">
              {distance != null ? `${distance.toFixed(distance < 10 ? 2 : 1)} km` : '—'}
            </span>
            <span className="dir">
              {bearing != null ? `${compass(bearing)} · ${Math.round(bearing)}°` : ''}
            </span>
          </>
        ) : geoState === 'denied' ? (
          <span className="muted">Location permission denied. Distance unavailable.</span>
        ) : geoState === 'unsupported' ? (
          <span className="muted">Browser does not support geolocation.</span>
        ) : (
          <span className="muted">Locating…</span>
        )}
      </div>

      {imgUrl && (
        <button
          type="button"
          className="worker-photo"
          onClick={() => setPhotoOpen(true)}
          aria-label="Open full-size photo"
        >
          <img src={imgUrl} alt={`${pin.id} defect`} />
        </button>
      )}

      <div className="worker-meta">
        <div className="row"><span>Status</span><b>{pin.status}</b></div>
        <div className="row"><span>Captured</span><b>{pin.captured_at || '—'}</b></div>
        <div className="row"><span>Coordinates</span><b>{Number(pin.lat).toFixed(5)}°, {Number(pin.lon).toFixed(5)}°</b></div>
        <div className="row"><span>Confidence</span><b>{pin.confidence}</b></div>
        {pin.work_order_text && (
          <div className="row notes"><span>Notes</span><b>{pin.work_order_text}</b></div>
        )}
      </div>

      {submittedActions.length > 0 && (
        <div className="worker-timeline">
          {submittedActions.map((s, i) => (
            <div className="step" key={i}>
              <Icon name="i-check" /> {ACTION_LABELS[s.action] || s.action}
            </div>
          ))}
        </div>
      )}

      {terminal ? (
        <div className={`worker-terminal ${terminal}`}>
          {terminal === 'completed' ? (
            <>
              <Icon name="i-check" />
              <div>
                <h2>Job completed</h2>
                <p>Thanks. Dispatch has been notified.</p>
              </div>
            </>
          ) : (
            <>
              <Icon name="i-alert" />
              <div>
                <h2>Escalated</h2>
                <p>Dispatch can now re-route this pin.</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="worker-comment">
            <label>
              Comment
              <span className="muted"> (required for Cannot complete)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional note for dispatcher"
              rows={3}
            />
          </div>

          <div className="worker-actions">
            {availableActions(pin?.last_action).map((a) => {
              const busy = pendingAction === a;
              const cls =
                a === 'completed' ? 'btn primary'
                : a === 'cannot_complete' ? 'btn danger'
                : 'btn';
              return (
                <button
                  key={a}
                  className={cls}
                  onClick={() => submit(a)}
                  disabled={!!pendingAction}
                >
                  {busy && <span className="spinner" />}
                  {ACTION_LABELS[a]}
                </button>
              );
            })}
          </div>
        </>
      )}

      <footer className="worker-foot">
        Training Rails · field dispatch
      </footer>

      {photoOpen && imgUrl && (
        <div
          className="worker-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            className="worker-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setPhotoOpen(false); }}
            aria-label="Close"
          >
            <Icon name="i-x" />
          </button>
          <img src={imgUrl} alt={`${pin.id} defect (full size)`} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
    </>
  );
}
