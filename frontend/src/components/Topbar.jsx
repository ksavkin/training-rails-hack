import { Icon } from './Icons.jsx';

const PAGE_NAMES = {
  dashboard: 'Dashboard',
  defect: 'Defect · DEF-2026-04891',
  track: 'Track · Corvallis–Albany'
};

export default function Topbar({ page, onTriggerCritical }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>RailPin</span>
        <span className="sep">/</span>
        <strong>{PAGE_NAMES[page] || page}</strong>
      </div>
      <div className="topbar-spacer" />
      <span className="live-pill mono">LIVE · 2 jets streaming</span>
      <button
        className="demo-btn"
        title="Trigger critical alert (Ctrl+Shift+A)"
        onClick={onTriggerCritical}
      >
        <Icon name="i-zap" />
        Trigger critical
      </button>
      <button className="icon-btn">
        <Icon name="i-bell" />
      </button>
    </header>
  );
}
