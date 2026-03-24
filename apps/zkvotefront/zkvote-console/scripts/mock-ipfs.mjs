import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const storageDir = path.join(root, ".mock-ipfs");
const port = Number(process.env.MOCK_IPFS_PORT || 8787);
const host = process.env.MOCK_IPFS_HOST || "127.0.0.1";

function toCid(content) {
  return `bafy${createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 28)}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

await mkdir(storageDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/pin") {
      const body = await readBody(req);
      const content = body.content ?? null;

      if (!content) {
        json(res, 400, { error: "CONTENT_REQUIRED" });
        return;
      }

      const cid = toCid(content);
      const hash = `0x${createHash("sha256").update(JSON.stringify(content)).digest("hex")}`;
      await writeFile(path.join(storageDir, `${cid}.json`), JSON.stringify(content, null, 2));
      json(res, 200, { cid, uri: `ipfs://${cid}`, hash });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/ipfs/")) {
      const cid = req.url.replace("/ipfs/", "").replace(/^\/+/, "");
      const contents = await readFile(path.join(storageDir, `${cid}.json`), "utf8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(contents);
      return;
    }

    json(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "MOCK_IPFS_SERVER_ERROR"
    });
  }
});

server.listen(port, host, () => {
  console.log(`mock-ipfs listening on http://${host}:${port}`);
  console.log(`pin endpoint: http://${host}:${port}/pin`);
  console.log(`gateway base: http://${host}:${port}/ipfs`);
});
