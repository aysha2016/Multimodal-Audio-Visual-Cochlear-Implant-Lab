import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Log startup details
console.log(`[CI-AI Server] Initializing on port ${port}, dist: ${distPath}`);

// Health check endpoint for Cloud Run and internal probes
app.get(['/health', '/api/health', '/_health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static assets from dist
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1d',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
} else {
  console.warn(`[CI-AI Server] Warning: distPath does not exist: ${distPath}`);
}

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`<!DOCTYPE html><html><head><title>CI-AI Research Lab</title></head><body><h1>CI-AI Research Lab</h1><p>Application is building. Please refresh in a few moments.</p></body></html>`);
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
