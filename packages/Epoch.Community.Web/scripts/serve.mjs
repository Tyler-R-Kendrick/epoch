/**
 * Self-hosting for the browser suites. A gate that depends on someone having
 * left a dev server running is not a gate; each suite serves the exploration
 * itself on an ephemeral port and closes it when done.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

/** The app this serves is the package's app/ directory, not this scripts/ one. */
const ROOT = fileURLToPath(new URL("../app/", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export async function serveCommunityWebApp({ host = "127.0.0.1", port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid port: ${port}`);
  }
  const server = createServer(async (req, res) => {
    let path;
    try {
      path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("bad request\n");
      return;
    }
    if (path === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("ok\n");
      return;
    }
    if (path === "/community" || path.startsWith("/community/")) {
      res.writeHead(307, { location: path === "/community" ? "/" : "/board.html" }).end();
      return;
    }
    const file = join(ROOT, path === "/" || path === "\\" ? "index.html" : path.replace(/^[/\\]+/, ""));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Community Web did not bind a TCP port");
  return {
    url: `http://${host}:${address.port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
