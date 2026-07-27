#!/usr/bin/env node
/**
 * Tarmal Task Ticketing — portable local server
 * Serves the app folder and opens the login page in the default browser.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const BASE_PORT = Number(process.env.TARMAL_PORT || 8080);
const MAX_PORT_TRIES = Number(process.env.TARMAL_PORT_TRIES || 10);

function getAppRoot() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return path.resolve(__dirname, "..");
}

const ROOT = getAppRoot();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function getLanAddresses() {
  const addresses = new Set();
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.add(entry.address);
      }
    });
  });
  return [...addresses];
}

function openBrowser(url) {
  if (process.env.TARMAL_NO_BROWSER === "1") return;
  const command = process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(command, () => {});
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": data.length,
    "Cache-Control": "no-cache"
  });
  res.end(data);
}

function createRequestHandler() {
  return (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let relativePath = urlPath === "/" ? "/login.html" : urlPath;
      relativePath = relativePath.replace(/^\/+/, "").split("/").join(path.sep);
      const filePath = path.normalize(path.join(ROOT, relativePath));

      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      sendFile(res, filePath);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server Error");
    }
  };
}

function printStartupBanner(port) {
  const localUrl = `http://localhost:${port}/login.html`;
  console.log("");
  console.log("  Tarmal IT Portal");
  console.log("  ---------------------");
  console.log(`  Local:   ${localUrl}`);
  getLanAddresses().forEach((address) => {
    console.log(`  Network: http://${address}:${port}/login.html`);
  });
  console.log("");
  console.log("  Login uses users from your Google Sheet (AppUsers tab).");
  console.log("  Keep this window open while using the app.");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
  return localUrl;
}

function failStartup(message) {
  console.error("");
  console.error("  Tarmal IT Portal could not start");
  console.error("  -------------------------------");
  console.error(`  ${message}`);
  console.error("");
  console.error("  Try closing other copies of this app, then run again.");
  console.error("  Or set TARMAL_PORT=8081 before starting.");
  console.error("");
  if (process.pkg && process.platform === "win32") {
    console.error("  This window will close in 20 seconds...");
    setTimeout(() => process.exit(1), 20000);
    return;
  }
  process.exit(1);
}

function startServer(port, triesLeft) {
  const server = http.createServer(createRequestHandler());

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && triesLeft > 1) {
      console.log(`  Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1, triesLeft - 1);
      return;
    }

    const detail = error.code === "EADDRINUSE"
      ? `Port ${port} is already in use.`
      : (error.message || "Unknown server error.");
    failStartup(detail);
  });

  server.listen(port, "0.0.0.0", () => {
    const localUrl = printStartupBanner(port);
    openBrowser(localUrl);
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
}

if (!fs.existsSync(path.join(ROOT, "login.html"))) {
  failStartup(`App files were not found in: ${ROOT}`);
} else {
  startServer(BASE_PORT, MAX_PORT_TRIES);
}
