import { useCallback, useEffect, useRef, useState } from 'react';
import { useRailPins } from './hooks/useRailPins.js';
import { IconSprite } from './components/Icons.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import DefectDetail from './components/DefectDetail.jsx';
import TrackView from './components/TrackView.jsx';
import VideoPopup from './components/VideoPopup.jsx';
import DispatchModal from './components/DispatchModal.jsx';
import CriticalAlert, { playBeep } from './components/CriticalAlert.jsx';
import MapFocusPopup from './components/MapFocusPopup.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

function apiHeaders(extra = {}) {
  const base = { 'Content-Type': 'application/json', ...extra };
  if (API_TOKEN) base.Authorization = `Bearer ${API_TOKEN}`;
  return base;
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [line, setLine] = useState('all');
  const [videoOpen, setVideoOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [resolved, setResolved] = useState(false);
  // Which mutation is in flight: 'acknowledge' | 'resolve' | 'reopen' | null.
  // Drives both the global "disable other buttons" guard and the per-button
  // spinner inside DefectActions.
  const [pendingAction, setPendingAction] = useState(null);
  const [critCount, setCritCount] = useState(3);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [criticalBannerDetail, setCriticalBannerDetail] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [mapFocus, setMapFocus] = useState({ open: false, mode: null, data: null });
  const mapRef = useRef(null);

  const goPage = useCallback((p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const onCriticalSeverityPin = useCallback((pin) => {
    setSelectedPin(pin);
    goPage('dashboard');
    setFlashKey((k) => k + 1);
    playBeep();
    setBannerOpen(true);
    const parts = [
      pin.type,
      pin.mp && `MP ${pin.mp}`,
      pin.severityNum != null && `severity ${pin.severityNum}/10`
    ].filter(Boolean);
    setCriticalBannerDetail(parts.length ? parts.join(' · ').toUpperCase() : null);
    setTimeout(() => setBannerOpen(false), 6000);
    setTimeout(() => {
      if (Number.isFinite(pin.lat) && Number.isFinite(pin.lon)) {
        mapRef.current?.focusOnPin?.({ lat: pin.lat, lon: pin.lon });
      }
    }, 250);
    setCritCount((c) => c + 1);
  }, [goPage]);

  const {
    pins,
    openPinCount,
    resolvedPinCount,
    status: pinsStatus,
    error: pinsError
  } = useRailPins({ onCriticalSeverity: onCriticalSeverityPin });

  // Inspect button (sidebar / topbar / critical alert) used to navigate to
  // the full-page DefectDetail. We've consolidated to MapFocusPopup as the
  // single overlay-style detail view, so all "Inspect" entry points now
  // trigger the same modal.
  const openMapDefect = useCallback((pin) => {
    if (pin?.id) {
      setSelectedPin(pin);
      setResolved(pin.sev === 'resolved');
    }
    setMapFocus({ open: true, mode: 'defect', data: pin });
  }, []);
  const openDetail = useCallback((pin) => {
    let target = pin?.id ? pin : null;
    if (!target) {
      target = pins.find((p) => p.sev !== 'resolved') ?? pins[0] ?? null;
    }
    if (target?.id) {
      setSelectedPin(target);
      setResolved(target.sev === 'resolved');
      setMapFocus({ open: true, mode: 'defect', data: target });
    }
  }, [pins]);
  const openVideo = useCallback(() => setVideoOpen(true), []);
  const openDispatch = useCallback(() => setDispatchOpen(true), []);
  const openMapCamera = useCallback((camera) => {
    setMapFocus({ open: true, mode: 'camera', data: camera });
  }, []);

  const pinActionInFlightRef = useRef(false);
  const callPinAction = useCallback(async (path) => {
    if (pinActionInFlightRef.current) return null;
    const pinId = selectedPin?.id;
    if (!pinId) {
      console.warn('[pin action] no pin selected');
      return null;
    }
    pinActionInFlightRef.current = true;
    setPendingAction(path);
    try {
      const res = await fetch(`${API_URL}/pins/${encodeURIComponent(pinId)}/${path}`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[pin ${path}] ${res.status}: ${body}`);
        alert(`Failed to ${path} pin: ${body}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.error(`[pin ${path}] network error`, err);
      alert(`Network error: ${err.message}`);
      return null;
    } finally {
      setPendingAction(null);
      pinActionInFlightRef.current = false;
    }
  }, [selectedPin]);

  const handleAcknowledge = useCallback(async () => {
    await callPinAction('acknowledge');
    // MapFocusPopup stays open; realtime UPDATE flips the action set.
  }, [callPinAction]);

  const handleResolve = useCallback(async () => {
    const updated = await callPinAction('resolve');
    if (updated) {
      setResolved(true);
      setCritCount((c) => Math.max(0, c - 1));
    }
  }, [callPinAction]);

  const handleReopen = useCallback(async () => {
    const updated = await callPinAction('reopen');
    if (updated) {
      setResolved(false);
      // Realtime UPDATE will sync selectedPin; resolved flag must reset now
      // so the action card re-renders the active-pin button set immediately.
    }
  }, [callPinAction]);

  const fireCriticalAlert = useCallback(() => {
    goPage('dashboard');
    setFlashKey((k) => k + 1);
    playBeep();
    setBannerOpen(true);
    setCriticalBannerDetail(null);
    setTimeout(() => setBannerOpen(false), 6000);
    setTimeout(() => mapRef.current?.dropDemoPin(), 250);
    setCritCount((c) => c + 1);
  }, [goPage]);

  // Keep selectedPin in sync with realtime updates from useRailPins. If the
  // pin disappears from the feed (DELETE event, RLS resolved-after-24h cutoff,
  // filter change), clear the selection so action handlers and the dispatch
  // modal don't fire against a non-existent record.
  useEffect(() => {
    if (!selectedPin?.id) return;
    const updated = pins.find((p) => p.id === selectedPin.id);
    if (!updated) {
      setSelectedPin(null);
      setResolved(false);
      setDispatchOpen(false);
      // Only close the map-focus overlay if it was showing THIS pin —
      // the camera modal shares the same state and shouldn't be killed
      // when an unrelated pin disappears from the feed.
      setMapFocus((prev) => {
        if (prev.open && prev.mode === 'defect' && prev.data?.id === selectedPin.id) {
          return { open: false, mode: null, data: null };
        }
        return prev;
      });
      if (page === 'defect') goPage('dashboard');
      return;
    }
    if (updated === selectedPin) return;
    setSelectedPin(updated);
    setResolved(updated.sev === 'resolved');
  }, [pins, selectedPin, page, goPage]);

  // Global keyboard
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        fireCriticalAlert();
      }
      if (e.key === 'Escape') {
        setVideoOpen(false);
        setDispatchOpen(false);
        setMapFocus({ open: false, mode: null, data: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fireCriticalAlert]);

  return (
    <>
      <IconSprite />

      <div className="app">
        <Sidebar page={page} setPage={goPage} line={line} setLine={setLine} />
        <main className="main">
          <Topbar page={page} onTriggerCritical={fireCriticalAlert} />

          <Dashboard
            active={page === 'dashboard'}
            critCount={critCount}
            lineFilter={line}
            mapRef={mapRef}
            pins={pins}
            openPinCount={openPinCount}
            resolvedPinCount={resolvedPinCount}
            pinsStatus={pinsStatus}
            pinsError={pinsError}
            onOpenDetail={openDetail}
            onOpenVideo={openVideo}
            onOpenMapDefect={openMapDefect}
            onOpenMapCamera={openMapCamera}
          />
          <DefectDetail
            active={page === 'defect'}
            pins={pins}
            selectedPin={selectedPin}
            onBack={() => goPage('dashboard')}
            onOpenDispatch={openDispatch}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            onReopen={handleReopen}
            resolved={resolved}
            pendingAction={pendingAction}
          />
          <TrackView
            active={page === 'track'}
            onOpenDetail={openDetail}
            onOpenCamera={openMapCamera}
          />
        </main>
      </div>

      <VideoPopup open={videoOpen} onClose={() => setVideoOpen(false)} />
      <MapFocusPopup
        open={mapFocus.open}
        mode={mapFocus.mode}
        data={mapFocus.data}
        onClose={() => setMapFocus({ open: false, mode: null, data: null })}
        pin={selectedPin}
        resolved={resolved}
        pendingAction={pendingAction}
        onOpenDispatch={openDispatch}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onReopen={handleReopen}
      />
      <CriticalAlert
        flashKey={flashKey}
        bannerOpen={bannerOpen}
        bannerDetail={criticalBannerDetail}
        onInspect={openDetail}
        onClose={() => {
          setBannerOpen(false);
          setCriticalBannerDetail(null);
        }}
      />
      <DispatchModal
        open={dispatchOpen}
        pin={selectedPin}
        apiUrl={API_URL}
        apiToken={API_TOKEN}
        onClose={() => setDispatchOpen(false)}
      />
    </>
  );
}
