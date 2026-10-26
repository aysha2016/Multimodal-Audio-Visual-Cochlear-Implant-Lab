// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = process.env.NGINX_PORT ? Number(process.env.DEFAULT_APP_PORT) || 3e3 : Number(process.env.PORT) || Number(process.env.DEFAULT_APP_PORT) || 3e3;
var distPath = path.join(__dirname, "dist");
var indexPath = path.join(distPath, "index.html");
console.log(`[CI-AI Server] Initializing on port ${port}, dist: ${distPath}`);
app.get(["/health", "/api/health", "/_health"], (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use(express.static(distPath, {
  maxAge: "1d",
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else if (filePath.includes("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));
var publicPath = path.join(__dirname, "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
app.use("/assets", (_req, res) => {
  res.status(404).type("text/plain").send("Asset not found");
});
app.get("*", (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const rootIndex = path.join(__dirname, "index.html");
    if (fs.existsSync(rootIndex)) {
      res.sendFile(rootIndex);
    } else {
      res.status(200).send(`<!DOCTYPE html><html><head><title>CI-AI Research Lab</title></head><body><h1>CI-AI Research Lab</h1><p>Application is building. Please refresh in a few moments.</p></body></html>`);
    }
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
