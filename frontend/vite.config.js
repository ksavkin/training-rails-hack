import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  resolve: {
    alias: [
      // Must be before the `heatmap.js` entry alias: some resolvers map `heatmap.js` to our
      // patched file and then append `/plugins/...`, which breaks if the alias is a file path.
      {
        find: 'heatmap.js/plugins/leaflet-heatmap/leaflet-heatmap.js',
        replacement: path.resolve(
          __dirname,
          'node_modules/heatmap.js/plugins/leaflet-heatmap/leaflet-heatmap.js'
        )
      },
      {
        find: /^heatmap\.js$/,
        replacement: path.resolve(__dirname, 'src/vendor/heatmap.patched.js')
      }
    ]
  }
});
