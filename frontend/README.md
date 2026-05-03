# RailPin (React)

React port of the original `m.html` single-file dashboard. Same look, same Leaflet maps, same critical-alert demo — split into components and driven by React state.

## Run

```bash
npm install
npm run dev
```

Vite serves the app at http://localhost:5173.

To point the T-422 live feed at the Jetson/ngrok MJPEG stream, set this in `frontend/.env`:

```env
VITE_JETSON_STREAM_URL=https://your-ngrok-url/stream
```

## Build

```bash
npm run build
npm run preview
```

## Layout

```
src/
  main.jsx              entry; imports leaflet css + index.css
  App.jsx               page state, modals, global keyboard
  index.css             original styles, copied verbatim
  data/railData.js      routes, cities, pins, focus pin, tile providers
  components/
    Icons.jsx           SVG sprite + <Icon name="i-..." />
    Sidebar.jsx         brand, nav, line filter, devices
    Topbar.jsx          breadcrumb, search (⌘K), critical demo button
    Dashboard.jsx       KPI grid + map panel + live mini + events
    DefectDetail.jsx    photo, mini-map, severity, AI verifier, actions
    TrackView.jsx       MP strip + defects table
    LiveFeed.jsx        full-width feed + detections + pipeline
    RailPinMap.jsx      vanilla Leaflet inside useEffect; ref API:
                        zoomIn / zoomOut / centerOnTrain / dropDemoPin
    MiniMap.jsx         single-line Leaflet for the defect page
    CriticalAlert.jsx   red flash + drop-down banner + beep
    DispatchModal.jsx   simulated work-order + SMS preview
    VideoPopup.jsx      live cam expand modal
```

## Hotkeys

- `⌘K` / `Ctrl+K` — focus search
- `⌘⇧A` / `Ctrl+Shift+A` — fire critical alert demo
- `Esc` — close video / dispatch modals
