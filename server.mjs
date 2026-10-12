/**
 * Kuroshi: tiny static server + search-suggest proxy.
 *
 * Service workers (Ultraviolet / Scramjet) are origin-bound, so Kuroshi must be
 * served over http://localhost or a real host. This server also exposes the
 * vendored proxy assets at their original paths (/uv/*, /scram/*, /sw.js ...) so
 * the unmodified upstream service-worker code keeps working.
 *
 *   node server.js            -> http://localhost:5173
 *   node server.js --port 8080
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, readFile } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/** Upstream proxy assets live in ./vendor but are served at their original paths. */
const VENDOR_PREFIXES = ["/uv/", "/scram/", "/baremux/", "/epoxy/", "/libcurl/"];
/**
 * Kuroshi's own files are always revalidated (they change while you develop);
 * only the vendored proxy runtime (which is content-frozen) is cached.
 */
const NO_CACHE = new Set(["/sw.js", "/uv/sw.js", "/index.html", "/app.js", "/styles.css", "/"]);

/* ---------------------------------------------------------------- search ---- */

/* Search engines with a public autocomplete endpoint. The search URLs themselves
 * live in js/engines.js (scraped from the InvisiProxy settings bundle); these are
 * only the suggestion feeds the omnibox calls through /api/suggest.
 * Engines without a public feed (Startpage, Dogpile, Lycos, Mojeek, Yandex)
 * simply answer [], and the omnibox falls back to its "Search X for ..." row. */
const ENGINES = {
  google: {
    url: "https://suggestqueries.google.com/complete/search?client=firefox&q=%s",
    pick: (d) => d?.[1],
  },
  duckduckgo: {
    url: "https://duckduckgo.com/ac/?q=%s",
    pick: (d) => d?.map((x) => x?.phrase),
  },
  bing: {
    url: "https://www.bing.com/AS/Suggestions?qry=%s&cvid=0",
    html: true,
  },
  brave: { url: "https://search.brave.com/api/suggest?q=%s" },
  yahoo: {
    url: "https://search.yahoo.com/sugg/ff?command=%s&output=js&n=10",
    pick: (d) => d?.gossip?.results?.map((x) => x?.key),
  },
  ecosia: {
    url: "https://ac.ecosia.org/autocomplete?q=%s",
    pick: (d) => d?.suggestions,
  },
  baidu: {
    url: "https://www.baidu.com/sugrec?prod=pc&wd=%s",
    pick: (d) => d?.g?.map((x) => x?.q),
  },
  qwant: {
    url: "https://api.qwant.com/v3/suggest?q=%s&count=8&locale=en_US&offset=0",
    pick: (d) => d?.data?.items?.map((x) => x?.value),
  },
  swisscows: {
    url: "https://api.swisscows.com/suggest?query=%s&language=en",
    pick: (d) => (Array.isArray(d) ? d : []),
  },
};

const suggestCache = new Map();

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

/** Bing answers with HTML, not JSON: suggestions sit in query="..." attributes. */
function parseBingHtml(text) {
  const out = [];
  for (const m of text.matchAll(/query="([^"]*)"/g)) out.push(decodeEntities(m[1]));
  return out;
}

/** Generic fallback for feeds with an unrecognised shape (currently only Brave). */
function collectStrings(node, depth, out) {
  if (depth > 5 || out.length >= 8) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node.trim());
  } else if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, depth + 1, out);
  } else if (node && typeof node === "object") {
    for (const key of ["phrase", "displayText", "value", "suggestion", "suggestions", "key"]) {
      if (typeof node[key] === "string") out.push(node[key]);
    }
    for (const value of Object.values(node)) collectStrings(value, depth + 1, out);
  }
}

/** Exported so other servers (e.g. a site's own local server) can mount the same feed logic. */
export async function suggest(engine, query) {
  const conf = ENGINES[engine];
  if (!conf) return [];
  const url = conf.url.replace("%s", encodeURIComponent(query));
  const key = `${engine}:${query.toLowerCase()}`;
  if (suggestCache.has(key)) return suggestCache.get(key);

  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: conf.html ? "text/html,*/*" : "*/*",
    },
    signal: AbortSignal.timeout(6000),
  });
  const text = await res.text();

  const raw = [];
  if (conf.html) {
    raw.push(...parseBingHtml(text));
  } else {
    let data;
    try {
      const t = text.trim();
      // plain JSON stays untouched; only a JSONP wrapper (callback(...)) is stripped
      data = JSON.parse(/^[[{]/.test(t) ? t : t.replace(/^[^(]*\(/, "").replace(/\);?$/, ""));
    } catch {
      data = null;
    }
    if (data) {
      if (conf.pick) {
        try {
          const picked = conf.pick(data);
          if (Array.isArray(picked)) raw.push(...picked);
        } catch {
          /* malformed payload: leave raw empty rather than guessing */
        }
      } else {
        collectStrings(data, 0, raw);
      }
    }
  }

  // engines wrap matches in <b> highlight tags; strip those before deduping.
  const clean = [
    ...new Set(
      raw
        .filter((s) => typeof s === "string" && s.trim())
        .map((s) => s.trim().replace(/<[^>]*>/g, ""))
        .filter(Boolean)
    ),
  ]
    .filter((s) => s.toLowerCase() !== query.toLowerCase())
    .slice(0, 8);
  suggestCache.set(key, clean);
  if (suggestCache.size > 400) suggestCache.delete(suggestCache.keys().next().value);
  return clean;
}

/* ---------------------------------------------------------------- server ---- */

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "x-content-type-options": "nosniff", ...headers });
  res.end(body);
}

async function serveFile(res, absPath, cache) {
  try {
    const info = await stat(absPath);
    if (!info.isFile()) return false;
    const type = MIME[extname(absPath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "content-length": info.size,
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    });
    createReadStream(absPath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith("/api/suggest")) {
    const engine = url.searchParams.get("engine") || "duckduckgo";
    const q = (url.searchParams.get("q") || "").slice(0, 80);
    if (!q) return send(res, 200, "[]", { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
    try {
      const items = await suggest(engine, q);
      return send(res, 200, JSON.stringify(items), {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=600",
      });
    } catch {
      return send(res, 200, "[]", { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
    }
  }

  // Prevent path traversal, then resolve against the right root.
  const safe = normalize(path).replace(/\\/g, "/").replace(/^(\.\.(?:\/|$))+/, "");
  const parts = safe.split("/").filter((p) => p && p !== ".");

  let target;
  if (parts[0] === "sw.js" && parts.length === 1) {
    target = join(ROOT, "vendor", "sw.js");
  } else if (VENDOR_PREFIXES.some((p) => safe.startsWith(p))) {
    target = join(ROOT, "vendor", ...parts);
  } else {
    target = join(ROOT, ...(parts.length ? parts : ["index.html"]));
  }

  if (!target.startsWith(ROOT)) return send(res, 403, "Forbidden", { "content-type": "text/plain" });

  const self = "/" + parts.join("/");
  const vendored = VENDOR_PREFIXES.some((p) => safe.startsWith(p)) || self === "/sw.js";
  const cache = NO_CACHE.has(self) || parts.length === 0
    ? "no-cache"
    : vendored
      ? "public, max-age=3600"
      : "no-cache";

  if (await serveFile(res, target, cache)) return;

  send(res, 404, "Not found", { "content-type": "text/plain" });
});

/* Listen only when run directly: importing this module (for `suggest`) must
   not start a second server on 5173. */
const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  server.listen(PORT, HOST, () => {
    console.log(`\n  ⚡ Kuroshi is running → http://localhost:${PORT}\n`);
  });
}
