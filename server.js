// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = Number(process.env.PORT) || 3e3;
var distPath = path.join(__dirname, "dist");
var indexPath = path.join(distPath, "index.html");
console.log(`[CI-AI Server] Initializing on port ${port}, dist: ${distPath}`);
app.get(["/health", "/api/health", "/_health"], (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: "1d",
    index: "index.html",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (filePath.includes("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  }));
} else {
  console.warn(`[CI-AI Server] Warning: distPath does not exist: ${distPath}`);
}
app.get("*", (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`<!DOCTYPE html><html><head><title>CI-AI Research Lab</title></head><body><h1>CI-AI Research Lab</h1><p>Application is building. Please refresh in a few moments.</p></body></html>`);
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
