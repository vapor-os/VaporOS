/**
 * Search engines, scraped from the InvisiProxy settings bundle
 * (https://storage.googleapis.com/instructure/index.html, chunk CtNt4f3j.js).
 * Search URLs below are byte-for-byte the ones that bundle ships.
 */
import { engineLogos } from "./icons.js";

export const SEARCH_ENGINES = [
  { id: "google", name: "Google", search: "https://www.google.com/search?q=%s", logo: engineLogos.google },
  { id: "duckduckgo", name: "DuckDuckGo", search: "https://duckduckgo.com/?q=%s", logo: engineLogos.duckduckgo },
  { id: "bing", name: "Bing", search: "https://www.bing.com/search?q=%s", logo: engineLogos.bing },
  { id: "brave", name: "Brave", search: "https://search.brave.com/search?q=%s", logo: engineLogos.brave },
  { id: "yahoo", name: "Yahoo", search: "https://search.yahoo.com/search?p=%s", logo: engineLogos.yahoo },
  { id: "startpage", name: "Startpage", search: "https://www.startpage.com/sp/search?query=%s", logo: engineLogos.startpage },
  { id: "ecosia", name: "Ecosia", search: "https://www.ecosia.org/search?q=%s", logo: engineLogos.ecosia },
  { id: "baidu", name: "Baidu", search: "https://www.baidu.com/s?wd=%s", logo: engineLogos.baidu },
  { id: "dogpile", name: "Dogpile", search: "https://www.dogpile.com/serp?q=%s", logo: engineLogos.dogpile },
  { id: "lycos", name: "Lycos", search: "https://search.lycos.com/web/?q=%s", logo: engineLogos.lycos },
  { id: "mojeek", name: "Mojeek", search: "https://www.mojeek.com/search?q=%s", logo: engineLogos.mojeek },
  { id: "qwant", name: "Qwant", search: "https://www.qwant.com/?q=%s", logo: engineLogos.qwant },
  { id: "swisscows", name: "Swisscows", search: "https://swisscows.com/web?query=%s", logo: engineLogos.swisscows },
  { id: "yandex", name: "Yandex", search: "https://yandex.com/search/?text=%s", logo: engineLogos.yandex },
];

const DEFAULT_ENGINE = "duckduckgo";

export const getEngine = (id) =>
  SEARCH_ENGINES.find((e) => e.id === id) ||
  SEARCH_ENGINES.find((e) => e.id === DEFAULT_ENGINE) ||
  SEARCH_ENGINES[0];

/** Ultraviolet's XOR codec: encodes a URL for the /uv/service/ prefix. */
export function uvEncode(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    out += i % 2 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch;
  }
  return encodeURIComponent(out);
}

export function uvDecode(str) {
  const raw = decodeURIComponent(str);
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    out += i % 2 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch;
  }
  return out;
}

const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;
const LOCAL_RE = /^(about:|localhost|127\.0\.0\.1|\[::1\])([^\s]*)$/i;

/** Decide what pressing Enter in the omnibox should do. */
export function resolveInput(raw, engineId) {
  const input = raw.trim();
  if (!input) return null;

  if (/^(about:|kuroshi:)/i.test(input)) return { type: "url", url: input.toLowerCase() };
  if (/^https?:\/\//i.test(input)) {
    try {
      new URL(input);
      return { type: "url", url: input };
    } catch { /* fall through to search */ }
  }
  if (LOCAL_RE.test(input)) return { type: "url", url: input.startsWith("http") ? input : `http://${input}` };
  if (/\s/.test(input)) return { type: "search", url: searchUrl(engineId, input), query: input };
  if (URL_RE.test(input)) return { type: "url", url: (input.includes("://") ? "" : "https://") + input };
  return { type: "search", url: searchUrl(engineId, input), query: input };
}

export function searchUrl(engineId, query) {
  return getEngine(engineId).search.replace("%s", encodeURIComponent(query));
}

export function hostOf(url) {
  try {
    if (/^about:/.test(url)) return "about";
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Trim the address bar down to something readable. */
export function prettyUrl(url) {
  if (!url) return "";
  if (/^about:/.test(url)) return url;
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return u.hostname.replace(/^www\./, "") + path + u.search;
  } catch {
    return url;
  }
}

export function faviconFor(url) {
  const host = hostOf(url);
  // No icon service knows our own origin, so fall back to a flat colour tile.
  if (!host || host === "about" || host === "localhost" || host === "127.0.0.1") return null;
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
}

export function titleFromUrl(url) {
  const host = hostOf(url);
  return host ? host.charAt(0).toUpperCase() + host.slice(1) : url;
}
