import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import WorkerView from './components/WorkerView.jsx';

// Path-based routing without react-router. The worker page is a separate
// mobile-first surface served by the same SPA — see frontend/vercel.json
// for the rewrite that makes /worker/{id} hit index.html in production.
function pickRoot() {
  const m = window.location.pathname.match(/^\/worker\/([^/?#]+)/);
  if (m) return <WorkerView pinId={decodeURIComponent(m[1])} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(pickRoot());
