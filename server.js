// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = process.env.NGINX_PORT ? Number(process.env.DEFAULT_APP_PORT) || 3e3 : Number(process.env.PORT) || Number(process.env.DEFAULT_APP_PORT) || 3e3;
var distPath = path.join(__dirname, "dist");
var indexPath = path.join(distPath, "index.html");
console.log(`[CI-AI Server] Starting on port ${port}...`);
if (!fs.existsSync(indexPath)) {
  console.log("[CI-AI Server] dist/index.html not found! Triggering vite build...");
  try {
    execSync("npx vite build", { stdio: "inherit", cwd: __dirname });
    console.log("[CI-AI Server] Build finished successfully.");
  } catch (err) {
    console.error("[CI-AI Server] On-the-fly build failed:", err);
  }
}
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
    res.status(503).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3"><title>CI-AI Research Lab</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>CI-AI Research Lab</h2><p>Application is building assets. Auto-refreshing in 3 seconds...</p></body></html>`);
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`[CI-AI Server] Production server listening at http://0.0.0.0:${port}`);
});
