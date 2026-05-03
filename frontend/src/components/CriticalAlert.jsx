import { useEffect, useRef } from 'react';

export default function CriticalAlert({ flashKey, bannerOpen, onInspect, onClose }) {
  const flashRef = useRef(null);

  useEffect(() => {
    if (flashKey === 0) return;
    const el = flashRef.current;
    if (!el) return;
    el.classList.remove('fire');
    // force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('fire');
  }, [flashKey]);

  return (
    <>
      <div className="crit-flash" ref={flashRef} />
      <div className={`crit-banner ${bannerOpen ? 'show' : ''}`}>
        <div className="crit-banner-row">
          <div className="crit-banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="crit-banner-text">
            <div className="crit-banner-title">Critical defect detected</div>
            <div className="crit-banner-sub">TRANSVERSE CRACK · MP 24+340 · CONF 0.87</div>
          </div>
          <button
            className="crit-banner-action"
            onClick={() => { onInspect(); onClose(); }}
          >
            Inspect
          </button>
        </div>
      </div>
    </>
  );
}

export function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    beep(880, 0, 0.18);
    beep(1180, 0.22, 0.18);
    beep(880, 0.46, 0.30);
  } catch {
    /* ignore */
  }
}
