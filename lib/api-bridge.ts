import { createServer, request as httpRequest, type Server } from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Express } from "express";

export const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

export const UPSTREAM_TIMEOUT_MS = Number(process.env.API_BRIDGE_TIMEOUT_MS || 20000);

export type Upstream = {
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

let apiHandle: Promise<Server> | null = null;
const isWindows = process.platform === "win32";
const socketPath = isWindows ? null : path.join(os.tmpdir(), `epic-store-${process.pid}.sock`);
let activePort = Number(process.env.API_BRIDGE_PORT || 41235);

async function loadApiApp() {
  const apiModule = await import("../api/server");
  const apiApp = apiModule.default as unknown as Express;
  apiApp.set("trust proxy", 1);
  return apiApp;
}

export function startApiServer(): Promise<Server> {
  if (!apiHandle) {
    apiHandle = (async () => {
      const apiApp = await loadApiApp();
      const server: Server = createServer(apiApp);

      if (socketPath) {
        try {
          fs.unlinkSync(socketPath);
        } catch {
          // ignore if doesn't exist
        }
        await new Promise<void>((resolve, reject) => {
          const onError = (err: unknown) => {
            server.removeListener("error", onError);
            reject(err);
          };
          server.once("error", onError);
          Reflect.apply(net.Server.prototype.listen, server, [
            socketPath,
            () => {
              server.removeListener("error", onError);
              resolve();
            },
          ]);
        });
        process.on("exit", () => {
          try {
            fs.unlinkSync(socketPath);
          } catch {
            // ignore
          }
        });
        console.log(`[api-bridge] listening on unix socket: ${socketPath}`);
      } else {
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          Reflect.apply(net.Server.prototype.listen, server, [
            activePort,
            "127.0.0.1",
            () => resolve(),
          ]);
        });
        console.log(`[api-bridge] listening on 127.0.0.1:${activePort}`);
      }

      return server;
    })().catch((error) => {
      apiHandle = null;
      throw error;
    });
  }
  return apiHandle;
}

export async function warmApi(): Promise<void> {
  await startApiServer();
}

export async function apiOrigin(): Promise<string> {
  await startApiServer();
  return socketPath ? socketPath : `http://127.0.0.1:${activePort}`;
}

export function proxyRequest(
  pathname: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | null,
): Promise<Upstream> {
  return new Promise((resolve, reject) => {
    const reqOptions = socketPath
      ? { socketPath, path: pathname, method, headers }
      : { host: "127.0.0.1", port: activePort, path: pathname, method, headers };

    const req = httpRequest(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 502,
          statusText: res.statusMessage ?? "",
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      );
      res.on("error", reject);
    });
    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      req.destroy(new Error(`API did not respond within ${UPSTREAM_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    if (body && body.length) req.end(body);
    else req.end();
  });
}