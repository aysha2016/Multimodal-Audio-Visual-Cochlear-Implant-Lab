import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In environments with Nginx reverse proxy (NGINX_PORT set), Nginx proxies to DEFAULT_APP_PORT (3000).
// In standalone environments without Nginx, the app listens directly on PORT (default 3000 or 8080).
const port = process.env.NGINX_PORT
  ? (Number(process.env.DEFAULT_APP_PORT) || 3000)
  : (Number(process.env.PORT) || Number(process.env.DEFAULT_APP_PORT) || 3000);
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log(`[CI-AI Server] Initializing on port ${port}, dist: ${distPath}`);

// Health check endpoint for Cloud Run and internal probes
app.get(['/health', '/api/health', '/_health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Always mount static middleware for dist
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

// Also serve public directory
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Crucial: 404 for unhandled asset requests so the browser does not receive HTML for scripts
app.use('/assets', (_req, res) => {
  res.status(404).type('text/plain').send('Asset not found');
});

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const rootIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndex)) {
      res.sendFile(rootIndex);
    } else {
      res.status(200).send(`<!DOCTYPE html><html><head><title>CI-AI Research Lab</title></head><body><h1>CI-AI Research Lab</h1><p>Application is building. Please refresh in a few moments.</p></body></html>`);
    }
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
