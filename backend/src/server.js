import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';

// Optional dev-only HTTPS, matching frontend/vite.config.js: the phone
// camera scanner needs a secure context end-to-end, so once the frontend is
// served over HTTPS, an HTTPS page can no longer call a plain-HTTP API
// (mixed content). If the same dev cert exists here, serve over HTTPS too.
const certDir = path.resolve(process.cwd(), '../certs');
const keyPath = path.join(certDir, 'dev-key.pem');
const certPath = path.join(certDir, 'dev-cert.pem');
const httpsCreds = env.nodeEnv !== 'production' && fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : null;

async function start() {
  await connectDB();

  const server = httpsCreds ? https.createServer(httpsCreds, app) : app;
  server.listen(env.port, () => {
    const scheme = httpsCreds ? 'https' : 'http';
    // eslint-disable-next-line no-console
    console.log(`[server] Kids Clothing Inventory API listening on ${scheme}://localhost:${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Failed to start:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Unhandled rejection:', err);
});
