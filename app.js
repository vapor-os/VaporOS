/**
 * Kuroshi: main application.
 * Tabs, omnibox, history, bookmarks, zoom, fullscreen, settings, shortcuts.
 */
import { icons } from "./js/icons.js";
import { store, } from "./js/store.js";
import { SEARCH_ENGINES, getEngine, resolveInput, prettyUrl, faviconFor, titleFromUrl, hostOf } from "./js/engines.js";
import { bootProxy, proxy, loadFrame, readFrameUrl, proxiedUrl, frameHistoryAction } from "./js/proxy.js";
import { createNewTabView } from "./js/newtab.js";

/* ───────────────────────────────── helpers ───────────────────────────────── */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(message, kind = "", ms = 2600) {
  const t = el("div", `toast ${kind}`, `<span class="dot"></span><span></span>`);
  t.lastChild.textContent = message;
  $("toasts").appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 320);
  }, ms);
}

/* static icon injection */
const ICONS = {
  btnBack: icons.back, btnForward: icons.forward, btnReload: icons.reload, btnHome: icons.home,
  btnStar: icons.star, btnCopy: icons.copy, btnLibrary: icons.clock, btnSettings: icons.gear,
  btnNewWindow: icons.window, btnFullscreen: icons.fullscreen, panelClose: icons.close,
  settingsClose: icons.close, peekBack: icons.back, peekFwd: icons.forward,
  peekReload: icons.reload, peekExit: icons.exitFullscreen,
};
Object.entries(ICONS).forEach(([id, svg]) => { const n = $(id); if (n) n.innerHTML = svg; });
$("tabAdd").title = "New tab (Ctrl+T)";

/* ────────────────────────────────── tabs ─────────────────────────────────── */
const tabsEl = $("tabs");
const contentEl = $("content");
let tabs = [];
let active = null;
let uid = 0;

function newTab({ url = null, focus = true, engine = null } = {}) {
  const id = `t${++uid}`;
  const view = el("div", "view");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("allow", "fullscreen; autoplay; encrypted-media; clipboard-read; clipboard-write");
  iframe.referrerPolicy = "no-referrer";
  view.appendChild(iframe);
  contentEl.appendChild(view);

  const tab = {
    id, view, iframe, newtabEl: null, el: null,
    url: "", title: "New Tab", favicon: null, engine: engine || store.settings.proxy,
    isNewtab: true, stack: [], idx: -1, loading: false, zoom: store.settings.zoom,
    onFrameUrl: null,
  };

  // tab strip item
  const item = el("div", "tab");
  item.setAttribute("role", "tab");
  item.innerHTML = `<span class="fav-wrap"></span><span class="label"></span><button class="x" title="Close tab">${icons.close}</button>`;
  item.querySelector(".label").textContent = "New Tab";
  item.querySelector(".x").addEventListener("click", (e) => { e.stopPropagation(); closeTab(tab); });
  item.addEventListener("click", () => activate(tab));
  item.addEventListener("auxclick", (e) => { if (e.button === 1) closeTab(tab); });
  item.addEventListener("contextmenu", (e) => { e.preventDefault(); closeTab(tab); });
  tabsEl.appendChild(item);
  tab.el = item;
  paintFavicon(tab); // gradient placeholder until the page reports its icon

  // loading spinner inside the tab
  const setTabLoading = (on) => {
    const wrap = item.querySelector(".fav-wrap");
    if (on) {
      if (!wrap.querySelector(".fav-spin")) {
        wrap.innerHTML = `<span class="fav-spin"></span>`;
      }
    } else {
      paintFavicon(tab);
    }
  };
  tab.setTabLoading = setTabLoading;

  iframe.addEventListener("load", () => onLoad(tab));
  tab.onFrameUrl = (url) => onFrameNavigation(tab, url);

  tabs.push(tab);
  showNewTab(tab);
  if (focus) activate(tab);
  return tab;
}

function paintFavicon(tab) {
  const wrap = tab.el.querySelector(".fav-wrap");
  wrap.innerHTML = "";
  if (tab.favicon) {
    const img = el("img", "fav");
    img.src = tab.favicon;
    img.alt = "";
    img.addEventListener("error", () => img.replaceWith(el("span", "fav")));
    wrap.appendChild(img);
  } else {
    const img = el("img", "fav");
    img.src = $("favicon").href; // new tabs wear the app's own mark
    img.alt = "";
    img.addEventListener("error", () => {
      const s = el("span", "fav");
      s.style.background = "#7c6cff";
      img.replaceWith(s);
    });
    wrap.appendChild(img);
  }
}

function closeTab(tab) {
  if (!tabs.includes(tab)) return;
  const i = tabs.indexOf(tab);
  const wasActive = active === tab;
  tab.el.classList.add("closing");
  setTimeout(() => {
    tab.el.remove();
    tab.view.remove();
    proxy.frames.delete(tab.id);
    tabs = tabs.filter((t) => t !== tab);
    if (wasActive) {
      const next = tabs[Math.min(i, tabs.length - 1)];
      if (next) activate(next);
      else newTab();
    } else {
      updateWindow();
    }
  }, 260);
}

function activate(tab) {
  if (!tab || active === tab) { if (tab) syncOmni(tab); return; }
  active = tab;
  tabs.forEach((t) => {
    t.el.classList.toggle("active", t === tab);
    t.view.classList.toggle("active", t === tab);
  });
  tab.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  syncOmni(tab);
  syncToolbar();
  updateWindow();
}

/* ─────────────────────────── new tab rendering ───────────────────────────── */
function showNewTab(tab) {
  tab.isNewtab = true;
  tab.url = "";
  if (tab.newtabEl) tab.newtabEl.remove();
  tab.newtabEl = createNewTabView({
    engineId: store.settings.engine,
    proxyLabel: proxy.ready ? (store.settings.proxy === "scramjet" ? "Scramjet" : "Ultraviolet") : "starting…",
    wantsFocus: active === tab || !active,
    registerRefresh(fn) { tab.refreshNewtab = fn; },
    submit: (value) => submitFrom(tab, value),
    openTile: (url, newWindow) => {
      if (newWindow) stealthOpen(url);
      else navigate(tab, url);
    },
    refresh: () => tab.refreshNewtab && tab.refreshNewtab(),
  });
  tab.view.appendChild(tab.newtabEl);
  tab.view.classList.add("nt");
  if (active === tab) syncOmni(tab);
}

function hideNewTab(tab) {
  tab.isNewtab = false;
  tab.view.classList.remove("nt");
  if (tab.newtabEl) {
    const n = tab.newtabEl;
    n.style.transition = "opacity .25s";
    n.style.opacity = "0";
    setTimeout(() => n.remove(), 260);
    tab.newtabEl = null;
  }
}

/* ─────────────────────────────── navigation ──────────────────────────────── */
function submitFrom(tab, value) {
  const res = resolveInput(value, store.settings.engine);
  if (!res) return;
  if (res.type === "url" && res.url === "kuroshi://newtab") return showNewTab(tab);
  navigate(tab, res.url);
}

async function navigate(tab, url, { push = true, engine = null } = {}) {
  if (!proxy.ready && !url.startsWith("about:")) {
    toast("Proxy is still starting…", "warn");
    return;
  }
  try {
    if (tab.isNewtab) hideNewTab(tab);

    tab.engine = engine || store.settings.proxy;
    tab.url = url;
    tab._navAt = Date.now();
    tab.title = titleFromUrl(url);
    tab.favicon = faviconFor(url);
    paintFavicon(tab);
    renderTabTitle(tab);
    startLoading(tab);

    if (push) {
      tab.stack = tab.stack.slice(0, tab.idx + 1);
      tab.stack.push(url);
      tab.idx = tab.stack.length - 1;
    }
    await loadFrame(tab, url, tab.engine);
    if (active === tab) syncOmni(tab);
    syncToolbar();
  } catch (err) {
    console.error(err);
    toast(err.message || "Could not load this page", "err");
    finishLoading(tab);
  }
}

function goHistory(tab, delta) {
  const next = tab.idx + delta;
  if (next < 0 || next >= tab.stack.length) return;
  tab.idx = next;
  const url = tab.stack[tab.idx];
  if (tab.isNewtab) hideNewTab(tab);
  tab.url = url;
  tab.title = titleFromUrl(url);
  tab.favicon = faviconFor(url);
  paintFavicon(tab);
  renderTabTitle(tab);
  startLoading(tab);
  loadFrame(tab, url, tab.engine || store.settings.proxy).catch((err) => {
    console.error(err);
    toast(err.message || "Could not load this page", "err");
    finishLoading(tab);
  });
  syncOmni(tab);
  syncToolbar();
}

function reloadActive() {
  if (!active) return;
  if (active.isNewtab) { showNewTab(active); return; }
  startLoading(active);
  if (active.url.startsWith("about:")) active.iframe.src = "about:blank";
  else if (!frameHistoryAction(active, "reload")) {
    loadFrame(active, active.url, active.engine).catch((err) => {
      console.error(err);
      toast(err.message || "Could not reload this page", "err");
      finishLoading(active);
    });
  }
}

function stopActive() {
  if (!active) return;
  try { active.iframe.contentWindow?.stop?.(); } catch { /* ignore */ }
  finishLoading(active);
}

/**
 * The wisp tunnel can die and be rebuilt under us (js/proxy.js). If that left
 * the visible page blank, or it happened while a page was still loading, reload
 * it now that the connection is back.
 */
proxy.onTransportRecover = () => {
  const tab = active;
  if (!tab || tab.isNewtab || !tab.url || tab.url.startsWith("about:")) return;
  const recentNav = Date.now() - (tab._navAt || 0) < 8000;
  let blank = false;
  try {
    const doc = tab.iframe.contentDocument;
    blank = !doc || (!(doc.title || "").trim() && (doc.body?.innerText || "").trim().length < 200);
  } catch {
    /* cross-origin frame: leave it alone */
  }
  if (recentNav || blank) {
    startLoading(tab);
    loadFrame(tab, tab.url, tab.engine || store.settings.proxy).catch((err) => {
      console.error(err);
      toast(err.message || "Could not load this page", "err");
      finishLoading(tab);
    });
  }
  toast("Connection restored", "ok");
};

function startLoading(tab) {
  tab.loading = true;
  tab.setTabLoading(true);
  if (active === tab) $("progress").classList.add("on");
  syncToolbar();
}

function finishLoading(tab) {
  tab.loading = false;
  tab.setTabLoading(false);
  if (active === tab) $("progress").classList.remove("on");
  syncToolbar();
}

function onLoad(tab) {
  finishLoading(tab);
  syncTabMeta(tab);
  if (tab.url) store.addHistory(tab.url, tab.title);
  if (active === tab) syncOmni(tab);
}

function onFrameNavigation(tab, url) {
  if (!url || url === tab.url) return;
  if (tab.stack[tab.idx] !== url) {
    tab.stack = tab.stack.slice(0, tab.idx + 1);
    tab.stack.push(url);
    tab.idx = tab.stack.length - 1;
  }
  tab.url = url;
  tab.title = titleFromUrl(url);
  tab.favicon = faviconFor(url);
  paintFavicon(tab);
  renderTabTitle(tab);
  startLoading(tab);
  syncToolbar();
  if (active === tab) syncOmni(tab);
}

/** Read title / icon / real URL out of a tab's frame (same-origin proxied docs). */
function syncTabMeta(tab) {
  if (tab.isNewtab) return;
  let doc = null;
  try { doc = tab.iframe.contentDocument; } catch { doc = null; }
  if (doc) {
    const title = (doc.title || "").trim();
    if (title) { tab.title = title; renderTabTitle(tab); }
    try {
      const link = doc.querySelector("link[rel~='icon'], link[rel='shortcut icon']");
      if (link?.href && link.href !== tab.favicon) {
        tab.favicon = link.href;
        paintFavicon(tab);
      }
    } catch { /* ignore */ }
  }
  const real = readFrameUrl(tab);
  if (real && real !== tab.url && !real.startsWith("about:")) {
    onFrameNavigation(tab, real);
  }
}

function renderTabTitle(tab) {
  const label = tab.el.querySelector(".label");
  const text = tab.isNewtab ? "New Tab" : tab.title || prettyUrl(tab.url) || "New Tab";
  label.textContent = text;
  tab.el.title = text;
  if (active === tab) updateWindow();
}

function updateWindow() {
  if (!active) return;
  const base = active.isNewtab ? "New Tab" : active.title || prettyUrl(active.url);
  const cloak = store.settings.cloak;
  document.title = cloak.enabled ? cloak.title : `${base} · Kuroshi`;
}

/* ─────────────────────────────── omnibox ─────────────────────────────────── */
const omni = $("omni");
const omniInput = $("omniInput");
const suggestBox = $("suggest");
let omniFocused = false;
let selIndex = -1;

function syncOmni(tab) {
  if (!omniFocused) {
    omniInput.value = tab && !tab.isNewtab ? prettyUrl(tab.url) : "";
  }
  omniInput.placeholder = tab && !tab.isNewtab && !omniFocused ? "" : "Search the web or enter a URL";
  const star = $("btnStar");
  const bookmarked = tab && !tab.isNewtab && store.hasBookmark(tab.url);
  star.classList.toggle("on", !!bookmarked);
  star.innerHTML = bookmarked ? icons.starFill : icons.star;
}

function syncToolbar() {
  const t = active;
  $("btnBack").disabled = !t || t.idx <= 0;
  $("btnForward").disabled = !t || t.idx >= t.stack.length - 1;
  $("btnReload").innerHTML = t && t.loading ? icons.stop : icons.reload;
  $("btnReload").title = t && t.loading ? "Stop (Esc)" : "Reload (Ctrl+R)";
  const star = $("btnStar");
  const bookmarked = t && !t.isNewtab && store.hasBookmark(t.url);
  star.classList.toggle("on", !!bookmarked);
  star.innerHTML = bookmarked ? icons.starFill : icons.star;
}

/* suggestions ------------------------------------------------------------- */
function row(kind, text, sub, iconSvg) {
  const r = el("div", "suggest-row");
  r.innerHTML = `${iconSvg}<span></span><span class="kind"></span>`;
  r.querySelector("span").textContent = text;
  r.querySelector(".kind").textContent = kind;
  r.dataset.value = sub;
  return r;
}

let sugToken = 0;
async function renderSuggestions(value) {
  const token = ++sugToken;
  const q = value.trim();
  suggestBox.innerHTML = "";
  selIndex = -1;

  const pool = [];
  if (!q) {
    store.history.slice(0, 6).forEach((h) => pool.push(row("history", prettyUrl(h.u), h.u, icons.clock)));
    store.bookmarks.slice(0, 4).forEach((b) => pool.push(row("bookmark", prettyUrl(b.u), b.u, icons.bookmark)));
  } else {
    const lower = q.toLowerCase();
    const hits = [
      ...store.history.filter((h) => h.u.toLowerCase().includes(lower) || (h.ti || "").toLowerCase().includes(lower)),
      ...store.bookmarks.filter((b) => b.u.toLowerCase().includes(lower)),
    ];
    hits.slice(0, 5).forEach((h) => pool.push(row("history", prettyUrl(h.u), h.u, icons.clock)));
    if (!/^(https?:\/\/|about:)/i.test(q)) {
      const res = resolveInput(q, store.settings.engine);
      if (res?.type === "search") pool.push(row("search", `Search ${getEngine(store.settings.engine).name} for “${q}”`, q, icons.search));
      else if (res) pool.push(row("open", prettyUrl(res.url), res.url, icons.globe));
    }
  }
  pool.forEach((r) => suggestBox.appendChild(r));
  suggestBox.hidden = pool.length === 0;

  // remote suggestions from the selected engine
  if (q && !/^(https?:\/\/|about:)/i.test(q)) {
    try {
      const list = await remoteSuggestions(store.settings.engine, q);
      if (token !== sugToken || !Array.isArray(list)) return;
      const existing = new Set([...suggestBox.querySelectorAll(".suggest-row")].map((r) => r.dataset.value.toLowerCase()));
      list.filter((s) => !existing.has(s.toLowerCase())).forEach((s) => {
        const r = row("suggest", s, s, icons.sparkle);
        suggestBox.appendChild(r);
      });
      suggestBox.hidden = suggestBox.childElementCount === 0;
    } catch { /* offline / blocked: local suggestions still work */ }
  }
}

/* Remote suggestions when Kuroshi runs without server.js (plain static
   hosting): /api/suggest 404s there, so switch for the session to asking the
   engine's own feed from the browser. CORS refusals just leave the local
   suggestion rows in place. */
let suggestViaProxy = true;

/* Same feed table as server.js, minus Bing (its HTML scraper needs the server)
   and the engines with no public feed at all. */
const DIRECT_SUGGEST = {
  google: { url: "https://suggestqueries.google.com/complete/search?client=firefox&q=%s", pick: (d) => d?.[1] },
  duckduckgo: { url: "https://duckduckgo.com/ac/?q=%s", pick: (d) => d?.map((x) => x?.phrase) },
  brave: { url: "https://search.brave.com/api/suggest?q=%s" },
  yahoo: { url: "https://search.yahoo.com/sugg/ff?command=%s&output=js&n=10", pick: (d) => d?.gossip?.results?.map((x) => x?.key) },
  ecosia: { url: "https://ac.ecosia.org/autocomplete?q=%s", pick: (d) => d?.suggestions },
  baidu: { url: "https://www.baidu.com/sugrec?prod=pc&wd=%s", pick: (d) => d?.g?.map((x) => x?.q) },
  qwant: { url: "https://api.qwant.com/v3/suggest?q=%s&count=8&locale=en_US&offset=0", pick: (d) => d?.data?.items?.map((x) => x?.value) },
  swisscows: { url: "https://api.swisscows.com/suggest?query=%s&language=en", pick: (d) => (Array.isArray(d) ? d : []) },
};

/** Brave has no stable key: pull the first few strings out of its payload. */
function collectSuggestStrings(node, depth, out) {
  if (depth > 5 || out.length >= 8) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node.trim());
  } else if (Array.isArray(node)) {
    for (const item of node) collectSuggestStrings(item, depth + 1, out);
  } else if (node && typeof node === "object") {
    for (const key of ["phrase", "displayText", "value", "suggestion", "suggestions", "key"]) {
      if (typeof node[key] === "string") out.push(node[key]);
    }
    for (const value of Object.values(node)) collectSuggestStrings(value, depth + 1, out);
  }
}

function parseSuggestJson(text) {
  const t = text.trim();
  try {
    return JSON.parse(t); // plain JSON: keep it as-is
  } catch { /* not plain JSON */ }
  try {
    return JSON.parse(t.replace(/^[^(]*\(/, "").replace(/\);?$/, "")); // JSONP wrapper
  } catch {
    return null;
  }
}

async function directSuggestions(engine, q) {
  const conf = DIRECT_SUGGEST[engine];
  if (!conf) return [];
  try {
    const res = await fetch(conf.url.replace("%s", encodeURIComponent(q)), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = parseSuggestJson(await res.text());
    if (!data) return [];
    const out = [];
    if (conf.pick) {
      try {
        const picked = conf.pick(data);
        if (Array.isArray(picked)) out.push(...picked);
      } catch { /* malformed payload: leave out empty rather than guessing */ }
    } else {
      collectSuggestStrings(data, 0, out);
    }
    return cleanSuggestList(out);
  } catch {
    /* CORS refused or offline: no remote rows */
  }
  return [];
}

function cleanSuggestList(list) {
  return [
    ...new Set(
      list
        .filter((s) => typeof s === "string" && s.trim())
        .map((s) => s.replace(/<\/?b>/gi, "").trim())
    ),
  ];
}

/* Feeds that refuse CORS but answer a JSONP callback: loaded with a <script>
   tag, which no origin policy blocks. Verified live: Google and Baidu.
   Engines with no JSONP feed of their own (duckduckgo, brave, ...) fall back
   to Google's, so a static host never leaves the omnibox without remote rows. */
const JSONP_SUGGEST = {
  google: {
    url: "https://suggestqueries.google.com/complete/search?client=firefox&q=%s&callback=%cb",
    pick: (d) => d?.[1],
  },
  baidu: { url: "https://www.baidu.com/sugrec?prod=pc&wd=%s&cb=%cb", pick: (d) => d?.g?.map((x) => x?.q) },
};

function jsonpSuggestions(engine, q) {
  const conf = JSONP_SUGGEST[engine] || JSONP_SUGGEST.google;
  if (!conf) return Promise.resolve([]);
  return new Promise((resolve) => {
    const cb = `__kuroshi_sug_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement("script");
    let settled = false;
    const finish = (list) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete window[cb];
      script.remove();
      resolve(cleanSuggestList(list));
    };
    const timer = setTimeout(() => finish([]), 5000);
    window[cb] = (data) => {
      let picked = [];
      try {
        const p = conf.pick(data);
        if (Array.isArray(p)) picked = p;
      } catch { /* malformed payload */ }
      finish(picked);
    };
    script.src = conf.url.replace("%s", encodeURIComponent(q)).replace("%cb", cb);
    script.onerror = () => finish([]);
    document.head.appendChild(script);
  });
}

async function remoteSuggestions(engine, q) {
  if (suggestViaProxy) {
    try {
      const res = await fetch(`/api/suggest?engine=${encodeURIComponent(engine)}&q=${encodeURIComponent(q)}`);
      const list = res.ok ? await res.json() : null;
      if (Array.isArray(list)) return list;
      if (res.ok || res.status === 404 || res.status === 501) suggestViaProxy = false;
      else return []; // proxy present but its upstream failed: keep it for the next query
    } catch {
      suggestViaProxy = false; // no JSON at all (static host or SPA fallback)
    }
  }
  const list = await directSuggestions(engine, q);
  return list.length ? list : jsonpSuggestions(engine, q);
}

function closeSuggest() {
  sugToken++; // drop any in-flight /api/suggest response so it cannot re-open the box
  suggestBox.hidden = true;
  suggestBox.innerHTML = "";
  selIndex = -1;
}

function moveSuggestion(delta) {
  const rows = [...suggestBox.querySelectorAll(".suggest-row")];
  if (!rows.length) return;
  selIndex = (selIndex + delta + rows.length) % rows.length;
  rows.forEach((r, i) => r.classList.toggle("sel", i === selIndex));
  rows[selIndex].scrollIntoView({ block: "nearest" });
}

function acceptSuggestion() {
  const rows = [...suggestBox.querySelectorAll(".suggest-row")];
  const value = selIndex >= 0 && rows[selIndex] ? rows[selIndex].dataset.value : omniInput.value;
  closeSuggest();
  omniInput.blur();
  if (active) submitFrom(active, value);
}

omniInput.addEventListener("focus", () => {
  omniFocused = true;
  omni.classList.add("focus");
  omniInput.select();
  renderSuggestions(omniInput.value);
});
omniInput.addEventListener("blur", () => {
  omniFocused = false;
  omni.classList.remove("focus");
  setTimeout(() => { closeSuggest(); syncOmni(active); }, 160);
});
omniInput.addEventListener("input", () => renderSuggestions(omniInput.value));
omniInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); moveSuggestion(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); moveSuggestion(-1); }
  else if (e.key === "Enter") { e.preventDefault(); acceptSuggestion(); }
  else if (e.key === "Escape") { closeSuggest(); omniInput.blur(); }
});
suggestBox.addEventListener("mousedown", (e) => {
  const r = e.target.closest(".suggest-row");
  if (!r) return;
  e.preventDefault();
  const v = r.dataset.value;
  closeSuggest();
  omniInput.blur();
  if (active) submitFrom(active, v);
});
$("omniBadge").innerHTML = getEngine(store.settings.engine).logo;

/* ─────────────────────────── toolbar actions ─────────────────────────────── */
$("tabAdd").addEventListener("click", () => newTab());
$("brandBtn").addEventListener("click", () => { if (active) showNewTab(active); });
$("btnHome").addEventListener("click", () => { if (active) showNewTab(active); });
$("btnBack").addEventListener("click", () => active && goHistory(active, -1));
$("btnForward").addEventListener("click", () => active && goHistory(active, 1));
$("btnReload").addEventListener("click", () => (active?.loading ? stopActive() : reloadActive()));
$("btnStar").addEventListener("click", () => {
  if (!active || active.isNewtab) return toast("Nothing to bookmark yet", "warn");
  const added = store.toggleBookmark(active.url, active.title);
  toast(added ? "Bookmarked" : "Bookmark removed", added ? "ok" : "");
  syncToolbar();
  if ($("panel").classList.contains("open")) renderPanel();
});
$("btnCopy").addEventListener("click", async () => {
  if (!active || active.isNewtab) return;
  try {
    await navigator.clipboard.writeText(active.url);
    toast("Link copied", "ok");
  } catch { toast("Could not copy link", "err"); }
});
$("btnNewWindow").addEventListener("click", () => {
  const url = active && !active.isNewtab ? active.url : "";
  stealthOpen(url);
});

/* stealth window: opens about:blank with the proxied page inside */
function stealthOpen(url) {
  const win = window.open("about:blank", "_blank");
  if (!win) return toast("Popup blocked. Allow popups for this site.", "err");
  // The popup is same-origin, so Ultraviolet's service worker covers it too.
  const src = url ? proxiedUrl("ultraviolet", url) : "about:blank";
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title></title>
    <style>html,body{margin:0;height:100%;background:#0a0c14;overflow:hidden}
    iframe{border:0;width:100%;height:100%;display:block}</style></head>
    <body><iframe src="${escapeHtml(src)}" allow="fullscreen; autoplay; clipboard-read; clipboard-write"></iframe></body></html>`);
  win.document.close();
  toast("Opened a stealth window (address bar shows about:blank)", "ok");
}

/* ──────────────────────────────── library ────────────────────────────────── */
const panel = $("panel");
let panelView = "history";

function setPanelView(view) {
  panelView = view;
  document.querySelectorAll(".panel-tab").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  renderPanel();
}

$("btnLibrary").addEventListener("click", () => togglePanel());
$("panelClose").addEventListener("click", () => togglePanel(false));
document.querySelectorAll(".panel-tab").forEach((b) =>
  b.addEventListener("click", () => setPanelView(b.dataset.view))
);
$("panelFilter").addEventListener("input", renderPanel);
$("panelClear").addEventListener("click", () => {
  if (panelView === "history") { store.clearHistory(); toast("History cleared", "ok"); }
  else { store.clearBookmarks(); toast("Bookmarks cleared", "ok"); }
  renderPanel();
});

function togglePanel(force) {
  const open = force !== undefined ? force : !panel.classList.contains("open");
  panel.classList.toggle("open", open);
  panel.setAttribute("aria-hidden", String(!open));
  if (open) {
    renderPanel();
    setTimeout(() => $("panelFilter").focus(), 300);
  }
}

function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function historyRow(item, i) {
  const r = el("div", "row");
  r.style.animationDelay = `${Math.min(i, 12) * 0.02}s`;
  const icon = faviconFor(item.u);
  r.innerHTML = `${icon ? `<img src="${escapeHtml(icon)}" alt="">` : `<span class="glyph"></span>`}
    <div class="txt"><div class="t"></div><div class="u"></div></div>
    <span class="when"></span>
    <button class="kill" title="Remove">${icons.close}</button>`;
  r.querySelector(".t").textContent = item.ti || prettyUrl(item.u);
  r.querySelector(".u").textContent = prettyUrl(item.u);
  r.querySelector(".when").textContent = new Date(item.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  r.querySelector(".kill").addEventListener("click", (e) => {
    e.stopPropagation();
    if (panelView === "history") store.removeHistory(item.u);
    else store.removeBookmark(item.u);
    renderPanel();
  });
  r.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) newTab({ url: item.u });
    else { if (active) navigate(active, item.u); togglePanel(false); }
  });
  return r;
}

function renderPanel() {
  const q = $("panelFilter").value.trim().toLowerCase();
  const body = $("panelBody");
  body.innerHTML = "";
  const source = panelView === "history" ? store.history : store.bookmarks;
  const items = source.filter((h) => !q || h.u.toLowerCase().includes(q) || (h.ti || "").toLowerCase().includes(q));
  $("panelCount").textContent = `${items.length} ${items.length === 1 ? "entry" : "entries"}`;
  $("panelClear").textContent = panelView === "history" ? "Clear history" : "Clear all";

  if (!items.length) {
    body.appendChild(el("div", "empty",
      `${panelView === "history" ? icons.history : icons.bookmark}<div>${q ? "Nothing matches that." : panelView === "history" ? "No history yet. Pages you visit will show up here." : "No bookmarks yet. Hit the star in the toolbar."}</div>`));
    return;
  }

  if (panelView === "history") {
    let label = null;
    items.forEach((item, i) => {
      const l = dayLabel(item.at);
      if (l !== label) {
        label = l;
        body.appendChild(el("div", "panel-group", l));
      }
      body.appendChild(historyRow(item, i));
    });
  } else {
    items.forEach((item, i) => body.appendChild(historyRow(item, i)));
  }
}

/* ─────────────────────────────── popovers ────────────────────────────────── */
function positionPop(pop, anchor, align = "right") {
  const a = anchor.getBoundingClientRect();
  const host = $("app").getBoundingClientRect();
  pop.style.visibility = "hidden";
  pop.hidden = false;
  const p = pop.getBoundingClientRect();
  let left = align === "right" ? a.right - p.width : a.left;
  left = Math.max(8, Math.min(left, host.width - p.width - 8));
  let top = a.bottom - host.top + 8;
  if (top + p.height > host.height - 8) top = a.top - host.top - p.height - 8;
  pop.style.left = `${left}px`;
  pop.style.top = `${Math.max(8, top)}px`;
  pop.style.visibility = "visible";
}
function closePops() {
  $("menuProxy").hidden = true;
  $("menuZoom").hidden = true;
}

$("proxyChip").addEventListener("click", (e) => {
  e.stopPropagation();
  const pop = $("menuProxy");
  if (!pop.hidden) return closePops();
  closePops();
  pop.className = "pop";
  pop.innerHTML = "";
  [
    { id: "scramjet", name: "Scramjet", sub: "recommended" },
    { id: "ultraviolet", name: "Ultraviolet", sub: "fallback" },
  ].forEach((p) => {
    const b = el("button", `pop-item ${store.settings.proxy === p.id ? "sel" : ""}`,
      `${icons.flash}<span>${p.name}</span><span class="sub">${p.sub}</span>`);
    b.addEventListener("click", () => setProxy(p.id));
    pop.appendChild(b);
  });
  pop.appendChild(el("div", "pop-sep"));
  const note = el("div", "pop-item", `${icons.shield}<span style="font-size:11.5px;color:var(--faint)">Switching reloads this tab through the new engine.</span>`);
  note.style.cursor = "default";
  pop.appendChild(note);
  positionPop(pop, $("proxyChip"));
});

function setProxy(id) {
  closePops();
  if (store.settings.proxy === id) return;
  store.set("proxy", id);
  $("proxyLabel").textContent = id === "scramjet" ? "Scramjet" : "Ultraviolet";
  toast(`Proxy → ${id === "scramjet" ? "Scramjet" : "Ultraviolet"}`, "ok");
  if (active && !active.isNewtab && !active.url.startsWith("about:")) {
    navigate(active, active.url, { push: false, engine: id });
  }
}

$("zoomChip").addEventListener("click", (e) => {
  e.stopPropagation();
  const pop = $("menuZoom");
  if (!pop.hidden) return closePops();
  closePops();
  pop.className = "pop zoom-pop";
  const z = active ? active.zoom : store.settings.zoom;
  pop.innerHTML = `
    <div class="z-head"><span>Zoom</span><span class="v">${Math.round(z)}%</span></div>
    <div class="z-ctrl">
      <button class="icon-btn sm" data-a="-">${icons.minus}</button>
      <input type="range" min="25" max="300" step="5" value="${z}">
      <button class="icon-btn sm" data-a="+">${icons.plus}</button>
    </div>
    <div class="z-foot">
      <button class="btn ghost" data-a="reset">Reset</button>
      <button class="btn ghost" data-a="default">Set as default</button>
    </div>`;
  const apply = (v) => setZoom(v, pop);
  pop.querySelector('input[type="range"]').addEventListener("input", (e) => apply(Number(e.target.value)));
  pop.querySelectorAll("[data-a]").forEach((b) =>
    b.addEventListener("click", () => {
      const a = b.dataset.a;
      const cur = active ? active.zoom : store.settings.zoom;
      if (a === "-") apply(stepZoom(cur, -1));
      else if (a === "+") apply(stepZoom(cur, 1));
      else if (a === "reset") apply(100);
      else if (a === "default") { store.set("zoom", Math.round(cur)); toast("Default zoom saved", "ok"); }
    })
  );
  positionPop(pop, $("zoomChip"));
});

const ZOOM_STEPS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
function stepZoom(cur, dir) {
  if (dir > 0) return ZOOM_STEPS.find((s) => s > cur) || 300;
  return [...ZOOM_STEPS].reverse().find((s) => s < cur) || 25;
}

function setZoom(value, pop) {
  const v = Math.max(25, Math.min(300, Math.round(value)));
  if (active) {
    active.zoom = v;
    active.iframe.style.zoom = `${v}%`;
    active.newtabEl && (active.newtabEl.style.zoom = `${v}%`);
  }
  $("zoomLabel").textContent = `${v}%`;
  if (pop) {
    pop.querySelector(".v").textContent = `${v}%`;
    pop.querySelector('input[type="range"]').value = v;
  }
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".pop") && !e.target.closest("#proxyChip") && !e.target.closest("#zoomChip")) closePops();
});

/* ─────────────────────────────── fullscreen ──────────────────────────────── */
let peekTimer = null;
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => toast("Fullscreen was blocked", "err"));
}
$("btnFullscreen").addEventListener("click", toggleFullscreen);
$("peekExit").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  const on = !!document.fullscreenElement;
  $("app").classList.toggle("fullscreen", on);
  $("btnFullscreen").innerHTML = on ? icons.exitFullscreen : icons.fullscreen;
  if (!on) $("peek").classList.remove("show");
});
window.addEventListener("mousemove", (e) => {
  if (!document.fullscreenElement) return;
  const peek = $("peek");
  if (e.clientY < 40) {
    peek.classList.add("show");
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => peek.classList.remove("show"), 2200);
  }
});
$("peekBack").addEventListener("click", () => active && goHistory(active, -1));
$("peekFwd").addEventListener("click", () => active && goHistory(active, 1));
$("peekReload").addEventListener("click", reloadActive);

/* ─────────────────────────────── settings ────────────────────────────────── */
const scrim = $("settingsScrim");
$("btnSettings").addEventListener("click", () => openSettings());
$("settingsClose").addEventListener("click", () => (scrim.hidden = true));
scrim.addEventListener("click", (e) => { if (e.target === scrim) scrim.hidden = true; });

const CLOAK_PRESETS = [
  { name: "Google", title: "Google", icon: "https://www.gstatic.com/faviconv2/favicon.ico" },
  { name: "Classroom", title: "Classes", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
  { name: "Drive", title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/docs/doclist/images/drive_22.png" },
  { name: "Docs", title: "Untitled document - Google Docs", icon: "https://ssl.gstatic.com/docs/favicon-32_32.png" },
  { name: "Gmail", title: "Inbox (0) - Gmail", icon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
];

function optionRow(items, current, onPick) {
  const wrap = el("div", "opts");
  items.forEach((item) => {
    const b = el("button", `opt ${item.id === current ? "sel" : ""}`,
      `${item.logo || ""}<span></span><span class="tick">${icons.check}</span>`);
    b.querySelector("span").textContent = item.name;
    b.addEventListener("click", () => { onPick(item.id); openSettings(); });
    wrap.appendChild(b);
  });
  return wrap;
}

function group(title, desc, ...children) {
  const g = el("div", "set-group");
  g.appendChild(el("h3", "", title));
  if (desc) g.appendChild(el("p", "desc", desc));
  children.forEach((c) => c && g.appendChild(c));
  return g;
}

function rowEl(title, desc, control) {
  const r = el("div", "set-row");
  const info = el("div", "info");
  info.appendChild(el("div", "t", title));
  if (desc) info.appendChild(el("div", "d", desc));
  r.appendChild(info);
  if (control) r.appendChild(control);
  return r;
}

function openSettings() {
  const body = $("settingsBody");
  body.innerHTML = "";
  const s = store.settings;

  body.appendChild(group("Search engine", "Used by the omnibox and the new-tab search bar.",
    optionRow(SEARCH_ENGINES.map((e) => ({ id: e.id, name: e.name, logo: e.logo })), s.engine,
      (id) => { store.set("engine", id); $("omniBadge").innerHTML = getEngine(id).logo; toast(`Search → ${getEngine(id).name}`, "ok"); })));

  body.appendChild(group("Proxy engine", "Both run locally through the vendored runtimes.",
    optionRow([
      { id: "scramjet", name: "Scramjet" },
      { id: "ultraviolet", name: "Ultraviolet" },
    ], s.proxy, setProxy)));

  const transportOpts = el("div", "opts");
  [
    { id: "epoxy", name: "Epoxy", sub: "Chromium / Apple, fastest" },
    { id: "libcurl", name: "Libcurl", sub: "Cross-browser, most secure" },
  ].forEach((t) => {
    const b = el("button", `opt ${s.transport === t.id ? "sel" : ""}`, `<span></span><span class="tick">${icons.check}</span>`);
    b.querySelector("span").textContent = t.name;
    b.title = t.sub;
    b.addEventListener("click", () => {
      store.set("transport", t.id);
      toast(`${t.name} transport: reloading to apply`, "ok");
      setTimeout(() => location.reload(), 700);
    });
    transportOpts.appendChild(b);
  });
  body.appendChild(group("Wisp transport", "The tunnel both proxies use. Default: InvisiProxy's public wisp server.", transportOpts));

  const wispField = el("input", "field");
  wispField.value = s.wisp;
  wispField.addEventListener("change", () => {
    store.set("wisp", wispField.value.trim());
    toast("Wisp endpoint saved. Reloading…", "ok");
    setTimeout(() => location.reload(), 700);
  });
  body.appendChild(rowEl("Wisp endpoint", "wss://… (change if you host your own wisp server)", wispField));

  /* zoom default */
  const zoomOpts = el("div", "opts");
  [50, 75, 100, 125, 150, 200].forEach((z) => {
    const b = el("button", `opt ${s.zoom === z ? "sel" : ""}`, `<span>${z}%</span><span class="tick">${icons.check}</span>`);
    b.addEventListener("click", () => { store.set("zoom", z); openSettings(); });
    zoomOpts.appendChild(b);
  });
  body.appendChild(group("Default zoom", "Applied to every new tab.", zoomOpts));

  /* tab cloak */
  const cloakSwitch = el("button", `switch ${s.cloak.enabled ? "on" : ""}`);
  cloakSwitch.addEventListener("click", () => {
    s.cloak.enabled = !s.cloak.enabled;
    store.patchSettings({ cloak: s.cloak });
    cloakSwitch.classList.toggle("on", s.cloak.enabled);
    updateWindow();
    toast(s.cloak.enabled ? "Tab cloak enabled" : "Tab cloak disabled", s.cloak.enabled ? "ok" : "");
  });
  const cloakWrap = el("div");
  cloakWrap.appendChild(rowEl("Tab cloak", "Disguise this browser tab's title and favicon.", cloakSwitch));

  const titleField = el("input", "field");
  titleField.value = s.cloak.title;
  titleField.addEventListener("change", () => { s.cloak.title = titleField.value; store.patchSettings({ cloak: s.cloak }); updateWindow(); });
  cloakWrap.appendChild(rowEl("Cloak title", null, titleField));

  const iconField = el("input", "field");
  iconField.value = s.cloak.icon;
  iconField.addEventListener("change", () => { s.cloak.icon = iconField.value; store.patchSettings({ cloak: s.cloak }); applyCloak(); });
  cloakWrap.appendChild(rowEl("Cloak favicon URL", null, iconField));

  const presets = el("div", "opts");
  CLOAK_PRESETS.forEach((p) => {
    const b = el("button", `opt ${s.cloak.title === p.title ? "sel" : ""}`, `<span></span><span class="tick">${icons.check}</span>`);
    b.querySelector("span").textContent = p.name;
    b.addEventListener("click", () => {
      s.cloak.title = p.title; s.cloak.icon = p.icon; s.cloak.enabled = true;
      store.patchSettings({ cloak: s.cloak });
      openSettings(); updateWindow(); applyCloak();
    });
    presets.appendChild(b);
  });
  cloakWrap.appendChild(presets);
  body.appendChild(group("Browser tab cloak", "Makes the tab look like a normal school page.", cloakWrap));

  /* data */
  const dataWrap = el("div", "opts");
  const clearH = el("button", "btn danger", "Clear history");
  clearH.addEventListener("click", () => { store.clearHistory(); toast("History cleared", "ok"); });
  const clearB = el("button", "btn danger", "Clear bookmarks");
  clearB.addEventListener("click", () => { store.clearBookmarks(); toast("Bookmarks cleared", "ok"); });
  const clearAll = el("button", "btn ghost", "Reset everything");
  clearAll.addEventListener("click", () => { localStorage.removeItem("kuroshi.v1"); location.reload(); });
  dataWrap.append(clearH, clearB, clearAll);
  body.appendChild(group("Data", "Everything lives in this browser's local storage.", dataWrap));

  /* shortcuts */
  const grid = el("div", "kbd-grid");
  [
    ["New tab", "Ctrl T"], ["Close tab", "Ctrl W"], ["Address bar", "Ctrl L"], ["Reload", "Ctrl R"],
    ["Back / forward", "Alt ← →"], ["Switch tab", "Ctrl 1…9"], ["Zoom in / out", "Ctrl + / −"],
    ["Reset zoom", "Ctrl 0"], ["Fullscreen", "F11"], ["Bookmark", "Ctrl D"], ["History", "Ctrl H"], ["Stop loading", "Esc"],
  ].forEach(([k, v]) => grid.appendChild(el("div", "kbd-row", `<span>${k}</span><kbd>${v}</kbd>`)));
  body.appendChild(group("Keyboard shortcuts", null, grid));

  body.appendChild(group("About",
    `Kuroshi v1.0: tabs, history, bookmarks, zoom, fullscreen and cloaking.<br>
     Proxies: <b>Scramjet</b> &amp; <b>Ultraviolet</b> (TitaniumNetwork / InvisiProxy), vendored locally and served from this origin.<br>
     Transports: Epoxy &amp; Libcurl over Wisp. Re-run <code>node scripts/vendor.mjs</code> to refresh proxy assets.`));

  scrim.hidden = false;
}

/* ───────────────────────────── tab cloak ─────────────────────────────────── */
let cloakIconHref = null;
function applyCloak() {
  const c = store.settings.cloak;
  const link = $("favicon");
  if (c.enabled && c.icon) {
    if (!cloakIconHref) cloakIconHref = link.href;
    link.href = c.icon;
  } else if (cloakIconHref) {
    link.href = cloakIconHref;
    cloakIconHref = null;
  }
}
setInterval(() => {
  const c = store.settings.cloak;
  if (c.enabled) {
    if (document.title !== c.title) document.title = c.title;
    applyCloak();
  } else {
    updateWindow();
  }
}, 2500);

/* ───────────────────────── frame sync polling ────────────────────────────── */
setInterval(() => {
  if (!active || active.isNewtab) return;
  syncTabMeta(active);
}, 700);

/* ───────────────────────────── shortcuts ─────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");

  if (e.key === "Escape") {
    if (!suggestBox.hidden) return closeSuggest();
    if (!scrim.hidden) return (scrim.hidden = true);
    if (panel.classList.contains("open")) return togglePanel(false);
    if (!$("menuProxy").hidden || !$("menuZoom").hidden) return closePops();
    if (active?.loading) return stopActive();
  }

  if (mod && e.key.toLowerCase() === "t") { e.preventDefault(); newTab(); return; }
  if (mod && e.key.toLowerCase() === "w") { e.preventDefault(); if (active) closeTab(active); return; }
  if (mod && e.key.toLowerCase() === "l") { e.preventDefault(); omniInput.focus(); return; }
  if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); omniInput.focus(); return; }
  if (e.altKey && e.key === "d") { e.preventDefault(); omniInput.focus(); return; }
  if (mod && e.key.toLowerCase() === "r") { e.preventDefault(); reloadActive(); return; }
  if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); $("btnStar").click(); return; }
  if (mod && e.key.toLowerCase() === "h") { e.preventDefault(); setPanelView("history"); togglePanel(true); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); setPanelView("bookmarks"); togglePanel(true); return; }
  if (e.key === "F5") { e.preventDefault(); reloadActive(); return; }
  if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); return; }
  if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); active && goHistory(active, -1); return; }
  if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); active && goHistory(active, 1); return; }

  if (mod && (e.key === "+" || e.key === "=")) { e.preventDefault(); setZoom(stepZoom(active?.zoom || 100, 1)); return; }
  if (mod && e.key === "-") { e.preventDefault(); setZoom(stepZoom(active?.zoom || 100, -1)); return; }
  if (mod && e.key === "0") { e.preventDefault(); setZoom(100); return; }

  if (mod && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const i = Number(e.key) - 1;
    if (i === 8) activate(tabs[tabs.length - 1]);
    else if (tabs[i]) activate(tabs[i]);
    return;
  }
  if (mod && e.key === "Tab") {
    e.preventDefault();
    const i = tabs.indexOf(active);
    const next = e.shiftKey ? (i - 1 + tabs.length) % tabs.length : (i + 1) % tabs.length;
    activate(tabs[next]);
    return;
  }
  if (e.key === "F6") { e.preventDefault(); omniInput.focus(); return; }

  // quick-find style: start typing in the omnibox from anywhere
  if (!typing && !mod && !e.altKey && e.key.length === 1 && document.activeElement === document.body) {
    omniInput.focus();
  }
});

/* ─────────────────────────────── boot ────────────────────────────────────── */
const bootEl = $("boot");
const bootStatus = $("bootStatus");
const bootBar = $("bootBar");

async function boot() {
  try {
    await bootProxy((step, p) => {
      bootStatus.textContent = step;
      bootBar.style.right = `${Math.max(0, (1 - p) * 100)}%`;
    });
    $("proxyChip").querySelector(".chip-dot").classList.remove("busy", "off");
    bootEl.classList.add("hidden");
    if (!tabs.length) newTab();
    else showNewTab(tabs[0]);
    setTimeout(() => bootEl.remove(), 700);
  } catch (err) {
    console.error(err);
    bootStatus.textContent = "Could not start the proxy";
    bootBar.style.right = "100%";
    let box = bootEl.querySelector(".boot-error");
    if (!box) {
      box = el("div", "boot-error");
      bootEl.querySelector(".boot-inner").appendChild(box);
      const retry = el("button", "btn", "Retry");
      retry.style.marginTop = "12px";
      retry.addEventListener("click", () => location.reload());
      bootEl.querySelector(".boot-inner").appendChild(retry);
    }
    box.innerHTML = `${err.message || err}<br><br><code>node server.js</code> then open <code>http://localhost:5173</code>`;
    box.classList.add("show");
    $("proxyChip").querySelector(".chip-dot").classList.add("off");
  }
}

/* initial UI state */
$("proxyLabel").textContent = store.settings.proxy === "scramjet" ? "Scramjet" : "Ultraviolet";
$("proxyChip").querySelector(".chip-dot").classList.add("busy");
$("zoomLabel").textContent = `${store.settings.zoom}%`;
$("omniBadge").innerHTML = getEngine(store.settings.engine).logo;
syncToolbar();
boot();
