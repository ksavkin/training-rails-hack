import { useState } from 'react';
import { Icon } from './Icons.jsx';
import RailPinMap from './RailPinMap.jsx';

export default function Dashboard({
  active,
  critCount,
  lineFilter,
  mapRef,
  pins,
  openPinCount,
  resolvedPinCount,
  pinsStatus,
  pinsError,
  onOpenMapDefect,
  onOpenMapCamera
}) {
  const [heatmapOn, setHeatmapOn] = useState(false);

  return (
    <section className={`page dashboard-page ${active ? 'active' : ''}`}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub mono">29 APR 2026 · 4 LINES · 3 DEVICES · 47 KM SCANNED TODAY</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost"><Icon name="i-export" />Export</button>
          <button className="btn primary"><Icon name="i-target" />Live mode</button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Network map</span>
            <span className="panel-meta">
              {openPinCount} open · {resolvedPinCount} resolved
              {pinsStatus === 'remote'
                ? ' · live'
                : pinsStatus === 'loading'
                  ? ' · loading…'
                  : pinsStatus === 'local'
                    ? ' · demo data'
                    : pinsError
                      ? ' · not connected'
                      : ''}
            </span>
          </div>
          <div className="map-wrap">
            {pinsError && (
              <div className="map-data-banner map-data-banner--error">{pinsError}</div>
            )}
            <RailPinMap
              ref={mapRef}
              pins={pins}
              pageActive={active}
              lineFilter={lineFilter}
              heatmapEnabled={heatmapOn}
              onOpenDefect={onOpenMapDefect}
              onOpenCamera={onOpenMapCamera}
            />

            <div className="map-controls">
              <button title="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Icon name="i-plus" /></button>
              <button title="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Icon name="i-minus" /></button>
              <button title="Center on T-422" onClick={() => mapRef.current?.centerOnTrain()}><Icon name="i-target" /></button>
              <button
                type="button"
                title={heatmapOn ? 'Hide defect density heatmap' : 'Show defect density heatmap'}
                className={heatmapOn ? 'active' : ''}
                aria-pressed={heatmapOn}
                onClick={() => setHeatmapOn((v) => !v)}
              >
                <Icon name="i-heatmap" />
              </button>
            </div>

            <div className="map-stats">
              <div className="stat-block"><strong>2</strong><span>JETS LIVE</span></div>
              <div className="stat-block"><strong>{openPinCount}</strong><span>OPEN PINS</span></div>
              <div className="stat-block"><strong>{critCount}</strong><span>CRITICAL</span></div>
            </div>

            <div className="map-legend">
              <div className="item"><span className="dot" style={{ background: 'var(--crit)' }} />CRIT 8–10</div>
              <div className="item"><span className="dot" style={{ background: 'var(--high)' }} />HIGH 6–7</div>
              <div className="item"><span className="dot" style={{ background: 'var(--warn)' }} />MED 4–5</div>
              <div className="item"><span className="dot" style={{ background: 'var(--info)' }} />LOW 1–3</div>
              <div className="item"><span className="dot" style={{ background: 'var(--ok)' }} />RESOLVED</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
