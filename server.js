"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const rootDir = __dirname;

require("dotenv").config({ path: path.join(rootDir, ".env") });

const dev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
process.env.NODE_ENV = dev ? "development" : "production";

const express = require("express");
const next = require("next");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(rootDir, "public", "uploads");

const compiledApi = path.join(rootDir, "dist", "server.js");

function loadApiApp() {
  if (dev) return require("./api/server.ts").default;
  if (!fs.existsSync(compiledApi)) {
    throw new Error("dist/server.js is missing. Run `npm run build` before `npm start`.");
  }
  return require(compiledApi).default;
}

function loadPrisma() {
  try {
    if (dev) return require("./api/lib/prisma.ts").prisma;
    const compiled = path.join(rootDir, "dist", "lib", "prisma.js");
    if (fs.existsSync(compiled)) return require(compiled).prisma;
  } catch (error) {
    console.error("could not load prisma for shutdown:", error.message);
  }
  return null;
}

let server;
let shuttingDown = false;

async function shutdown(reason, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`received ${reason}, shutting down gracefully…`);
  const forceTimer = setTimeout(() => {
    console.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    const prisma = loadPrisma();
    if (prisma) await prisma.$disconnect();
  } catch (error) {
    console.error("error during shutdown:", error);
  } finally {
    clearTimeout(forceTimer);
    process.exit(code);
  }
}

async function main() {
  const nextApp = next({ dev, dir: rootDir, hostname: host, port });
  const handle = nextApp.getRequestHandler();

  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    // Safe, non-restrictive baseline CSP (does not limit scripts/styles so it
    // cannot break the app) that blocks framing and plugin content.
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    if (!dev) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  const api = loadApiApp();

  app.use(api);
  // The API Express app uses Helmet's default CSP. Its middleware also runs
  // for requests that fall through to Next, where that policy blocks the
  // inline scripts Next uses to reveal streamed React content.
  app.use((req, res, next) => {
    res.removeHeader("Content-Security-Policy");
    next();
  });
  app.use((req, res) => handle(req, res));

  await nextApp.prepare();

  server = http.createServer(app);
  server.listen(port, host, () =>
    console.log(`store ready on http://${host}:${port} (${dev ? "development" : "production"})`),
  );
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// A rejected promise should never take the store down; log it and keep serving.
process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));
// An uncaught exception leaves the process in an unknown state, so log, close
// cleanly, and let the host restart policy bring it back.
process.on("uncaughtException", (error) => {
  console.error("uncaughtException:", error);
  shutdown("uncaughtException", 1);
});

main().catch((error) => {
  console.error("failed to start store server:", error);
  process.exit(1);
});
