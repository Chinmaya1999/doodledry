import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional dev-only HTTPS: the camera scanner (getUserMedia) only works over
// a secure context, and phones don't treat a plain LAN IP as one. If a cert
// exists at ../certs/dev-*.pem (see README "Testing on a phone"), serve over
// HTTPS with it; otherwise fall back to plain HTTP as before.
const certDir = path.resolve(__dirname, '../certs');
const keyPath = path.join(certDir, 'dev-key.pem');
const certPath = path.join(certDir, 'dev-cert.pem');
const httpsConfig = fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
  },
});
