import { useCallback, useEffect, useRef, useState } from 'react';
import { useRailPins } from './hooks/useRailPins.js';
import { IconSprite } from './components/Icons.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import DefectDetail from './components/DefectDetail.jsx';
import TrackView from './components/TrackView.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import VideoPopup from './components/VideoPopup.jsx';
import DispatchModal from './components/DispatchModal.jsx';
import CriticalAlert, { playBeep } from './components/CriticalAlert.jsx';
import MapFocusPopup from './components/MapFocusPopup.jsx';

export default function App() {
  const {
    pins,
    openPinCount,
    resolvedPinCount,
    status: pinsStatus,
    error: pinsError
  } = useRailPins();
  const [page, setPage] = useState('dashboard');
  const [line, setLine] = useState('all');
  const [videoOpen, setVideoOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [critCount, setCritCount] = useState(3);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [mapFocus, setMapFocus] = useState({ open: false, mode: null, data: null });
  const mapRef = useRef(null);

  const goPage = useCallback((p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const openDetail = useCallback(() => goPage('defect'), [goPage]);
  const openVideo = useCallback(() => setVideoOpen(true), []);
  const openDispatch = useCallback(() => setDispatchOpen(true), []);
  const openMapDefect = useCallback((pin) => {
    setMapFocus({ open: true, mode: 'defect', data: pin });
  }, []);
  const openMapCamera = useCallback((camera) => {
    setMapFocus({ open: true, mode: 'camera', data: camera });
  }, []);

  const handleResolve = useCallback(() => {
    setResolved(true);
    setCritCount((c) => Math.max(0, c - 1));
    setTimeout(() => goPage('dashboard'), 1000);
  }, [goPage]);

  const fireCriticalAlert = useCallback(() => {
    goPage('dashboard');
    setFlashKey((k) => k + 1);
    playBeep();
    setBannerOpen(true);
    setTimeout(() => setBannerOpen(false), 6000);
    setTimeout(() => mapRef.current?.dropDemoPin(), 250);
    setCritCount((c) => c + 1);
  }, [goPage]);

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
            onBack={() => goPage('dashboard')}
            onOpenDispatch={openDispatch}
            onResolve={handleResolve}
            resolved={resolved}
          />
          <TrackView
            active={page === 'track'}
            onOpenDetail={openDetail}
          />
          <LiveFeed
            active={page === 'feed'}
            onOpenDetail={openDetail}
          />
        </main>
      </div>

      <VideoPopup open={videoOpen} onClose={() => setVideoOpen(false)} />
      <MapFocusPopup
        open={mapFocus.open}
        mode={mapFocus.mode}
        data={mapFocus.data}
        onClose={() => setMapFocus({ open: false, mode: null, data: null })}
      />
      <CriticalAlert
        flashKey={flashKey}
        bannerOpen={bannerOpen}
        onInspect={openDetail}
        onClose={() => setBannerOpen(false)}
      />
      <DispatchModal open={dispatchOpen} onClose={() => setDispatchOpen(false)} />
    </>
  );
}
