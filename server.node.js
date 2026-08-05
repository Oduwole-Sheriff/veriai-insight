import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const { default: serverEntry } = await import("./dist/server/index.js");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOST ?? "0.0.0.0";
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(rootDir, "dist/client");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function createRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "http";
  const host = req.headers.host ?? `localhost:${port}`;
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);
  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers: req.headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (!response.body) {
    res.end();
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
}

async function tryServeStaticAsset(pathname, res) {
  if (!pathname.startsWith("/assets/") && pathname !== "/favicon.ico") {
    return false;
  }

  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(clientDir, normalizedPath);

  if (!filePath.startsWith(clientDir)) {
    res.writeHead(400).end("Bad request");
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    res.writeHead(200, {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": fileStat.size,
      "content-type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

createServer(async (req, res) => {
  try {
    const request = createRequest(req);
    const url = new URL(request.url);

    if (await tryServeStaticAsset(url.pathname, res)) {
      return;
    }

    const response = await serverEntry.fetch(request, process.env, {
      passThroughOnException() {},
      waitUntil(promise) {
        promise.catch((error) => console.error(error));
      },
    });

    await sendResponse(res, response);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end("Internal Server Error");
  }
}).listen(port, hostname, () => {
  console.log(`Node server listening on http://${hostname}:${port}`);
});
