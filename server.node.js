// Node ESM entry to run the TanStack Start SSR bundle on Render/Node.
//
// Behavior:
// - Attempts to import the built server entry from likely locations
//   (supports both Vite default `dist/` and Nitro-like `.output/`).
// - Converts Node IncomingMessage -> Web Request and calls the server's fetch(request, env, ctx).
// - Streams the Web Response back to Node ServerResponse.
// - Listens on 0.0.0.0 and uses process.env.PORT.
//
// Requires Node 18+ (global fetch and Web Streams). If you must run older Node,
// either upgrade or polyfill fetch/Request/Response.

import http from "node:http";
import { Buffer } from "node:buffer";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Candidate import paths (ordered). Add more if your build places the server elsewhere.
const CANDIDATES = [
  "./.output/server/index.mjs",
  "./.output/server/server.mjs",
  "./.output/server/index.js",
  "./.output/server/server.js",
  "./dist/server/index.mjs",
  "./dist/server/server.mjs",
  "./dist/server/index.js",
  "./dist/server/server.js",
  "./dist/entry.mjs",
  "./dist/entry.js",
  "./server.js",
];

async function findServerModule() {
  for (const p of CANDIDATES) {
    try {
      // Use dynamic import; Node will throw if file doesn't exist/invalid.
      const mod = await import(p);
      console.log(`Loaded server module from ${p}`);
      return { mod, path: p };
    } catch (err) {
      // ignore and try next
    }
  }
  throw new Error(
    `Could not find built server entry. Looked for: ${CANDIDATES.join(", ")}. Make sure you ran 'npm run build'.`,
  );
}

function nodeReqToWebRequest(req) {
  const host = req.headers.host ?? `localhost:${PORT}`;
  const protocol = req.socket?.encrypted ? "https:" : "http:";
  const url = new URL(req.url ?? "/", `${protocol}//${host}`).toString();

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value != null) {
      headers.set(key, value);
    }
  }

  // For GET/HEAD we don't forward a body stream to fetch
  const hasBody = !["GET", "HEAD"].includes(req.method ?? "GET");
  const body = hasBody ? req : undefined;

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
}

async function respondWithWebResponse(res, webRes) {
  // status and headers
  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers) {
    // Node may throw on some headers; skip invalid ones
    try {
      res.setHeader(key, value);
    } catch (e) {}
  }

  // If body is null, end
  if (!webRes.body) {
    res.end();
    return;
  }

  // Attempt streaming when possible; fallback to buffering
  try {
    // webRes.body is a WHATWG ReadableStream
    const reader = webRes.body.getReader();
    const encoder = new TextEncoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    // Fallback: buffer whole body
    try {
      const arrayBuffer = await webRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err2) {
      res.end();
    }
  }
}

async function boot() {
  const { mod, path } = await findServerModule();

  // Normalize handler - the built module may export default or named exports.
  // Expect a handler that has a "fetch" method: handler.fetch(request, env, ctx)
  const candidateHandlers = [
    mod.default,
    mod.handler,
    mod.server,
    mod,
  ];

  const handler = candidateHandlers.find((h) => h && typeof h.fetch === "function");

  if (!handler) {
    console.error(`Loaded module (${path}) did not export a fetch handler. Exports: ${Object.keys(mod).join(", ")}`);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const webReq = nodeReqToWebRequest(req);

      // ctx.waitUntil compat: provide a no-op waitUntil that accepts a promise
      const ctx = {
        waitUntil(promise) {
          // don't block the response; log errors
          Promise.resolve(promise).catch((err) => {
            console.error("Background task error:", err);
          });
        },
      };

      const webRes = await handler.fetch(webReq, /* env */ {}, ctx);
      await respondWithWebResponse(res, webRes);
    } catch (err) {
      console.error("Server handler error:", err);
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

boot().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});