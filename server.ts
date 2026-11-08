import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Port resolution:
// In Cloud Run standalone production, PORT (e.g. 8080) is provided.
// When running behind Nginx dev proxy (NGINX_PORT set), DEFAULT_APP_PORT is 3000.
const port = process.env.NGINX_PORT
  ? (Number(process.env.DEFAULT_APP_PORT) || 3000)
  : (Number(process.env.PORT) || Number(process.env.DEFAULT_APP_PORT) || 3000);

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log(`[CI-AI Server] Starting on port ${port}...`);

// Ensure dist/index.html exists; if missing, build on the fly
if (!fs.existsSync(indexPath)) {
  console.log('[CI-AI Server] dist/index.html not found! Triggering vite build...');
  try {
    execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });
    console.log('[CI-AI Server] Build finished successfully.');
  } catch (err) {
    console.error('[CI-AI Server] On-the-fly build failed:', err);
  }
}

// Health check endpoint for Cloud Run and internal probes
app.get(['/health', '/api/health', '/_health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve compiled static assets from dist
app.use(express.static(distPath, {
  maxAge: '1d',
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// Also serve public directory if it exists
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Explicit 404 for missing static assets to prevent returning index.html for scripts/CSS
app.use('/assets', (_req, res) => {
  res.status(404).type('text/plain').send('Asset not found');
});

// Catch-all SPA routing: Always return dist/index.html
app.get('*', (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If build is still pending, send a clean informative message
    res.status(503).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3"><title>CI-AI Research Lab</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>CI-AI Research Lab</h2><p>Application is building assets. Auto-refreshing in 3 seconds...</p></body></html>`);
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
