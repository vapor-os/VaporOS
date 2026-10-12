/**
 * Proxy layer: boots the vendored Scramjet + Ultraviolet runtimes.
 *
 * Service workers are origin-bound, so both proxies run from *this* origin:
 * their assets are vendored under /uv, /scram, /baremux, /epoxy, /libcurl and
 * registered by server.js (see scripts/vendor.mjs for where they come from).
 */
import { store } from "./store.js";
import { uvEncode, uvDecode } from "./engines.js";
const SKBASE = (() => { let l = location; try { if (window.parent !== window && window.parent.location) l = window.parent.location; } catch { /* opaque parent */ } return l.pathname.replace(/[^/]*$/, ""); })();


export const proxy = {
  ready: false,
  error: null,
  controller: null,          // Scramjet controller
  transport: null,           // live wisp transport (epoxy / libcurl)
  frames: new Map(),         // tabId -> Scramjet frame
  bareMux: null,
  onTransportRecover: null,  // app.js hook: heal a page left broken by a dead tunnel
};

// Debug handle (handy in the DevTools console: __kuroshi.proxy.controller.id).
if (typeof window !== "undefined") window.__kuroshi = { proxy };

const TRANSPORTS = {
  epoxy: SKBASE + "epoxy/index.mjs",
  libcurl: SKBASE + "libcurl/index.mjs",
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);

/** Create the Scramjet transport instance (epoxy / libcurl over wisp). */
async function makeTransport() {
  const path = TRANSPORTS[store.settings.transport] || TRANSPORTS.epoxy;
  const mod = await import(/* @vite-ignore */ path);
  const Transport = mod.default;
  const transport = new Transport({ wisp: store.settings.wisp });
  if (typeof transport.init === "function") await transport.init();
  return transport;
}

/**
 * Boot everything. `onStatus(step, progress)` drives the loading screen.
 * Throws with a human-readable message on failure.
 */
export async function bootProxy(onStatus = () => {}) {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    throw new Error("Service workers need http://localhost. Run <code>node server.js</code> and open the printed URL.");
  }

  onStatus("Loading proxy runtime…", 0.15);
  await loadScript(SKBASE + "baremux/index.js");
  await loadScript(SKBASE + "scram/scramjet.js");
  await loadScript(SKBASE + "scram/controller.api.js");
  await loadScript(SKBASE + "scram/scramjet-utils.js");

  onStatus("Connecting transport…", 0.38);
  proxy.bareMux = new window.BareMux.BareMuxConnection(SKBASE + "baremux/worker.js");
  await withTimeout(
    // setTransport(url, constructorArgs): args are spread into the transport ctor
    proxy.bareMux.setTransport(TRANSPORTS[store.settings.transport] || TRANSPORTS.epoxy, [
      { wisp: store.settings.wisp },
    ]),
    15000,
    "Transport setup"
  );

  onStatus("Starting service workers…", 0.6);
  await navigator.serviceWorker.register(SKBASE + "sw.js", { scope: SKBASE });
  await navigator.serviceWorker.register(SKBASE + "uv/sw.js", { scope: SKBASE + "uv/" });
  await withTimeout(navigator.serviceWorker.ready, 20000, "Service worker registration");

  if (!navigator.serviceWorker.controller) {
    onStatus("Activating service workers…", 0.72);
    await new Promise((resolve) => {
      const done = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", done);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
      setTimeout(done, 6000);
    });
  }

  onStatus("Preparing Scramjet…", 0.85);
  await createScramjetController();
  await ensureScramjet();

  // A service-worker restart (or an early activation race) can silently drop
  // the controller registration: re-establish it whenever the controller changes.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    rebindScramjet();
  });

  onStatus("Ready", 1);
  proxy.ready = true;
  startTunnelHeartbeat();
}

/**
 * Re-register the Scramjet controller with the *current* service worker.
 *
 * The controller keeps a reference to the ServiceWorker it was constructed
 * with; after a SW update/restart that reference is stale, so it would post
 * `$controller$init` into the void and every /scram/network/* request 404s.
 */
function rebindScramjet() {
  const controller = proxy.controller;
  if (!controller) return false;
  try {
    const current = navigator.serviceWorker.controller;
    if (current && "serviceWorkerController" in controller) {
      controller.serviceWorkerController = current;
    }
    controller.setupMessagePort?.();
    return true;
  } catch (err) {
    console.warn("Scramjet re-init failed", err);
    return false;
  }
}

async function createScramjetController() {
  const { Controller } = window.$scramjetController;
  const { defaultConfig } = window.$scramjet;
  const transport = await makeTransport();

  proxy.controller = new Controller({
    serviceworker: navigator.serviceWorker.controller,
    transport,
    config: {
      prefix: SKBASE + "scram/network/",
      scramjetPath: SKBASE + "scram/scramjet.js",
      wasmPath: SKBASE + "scram/scramjet.wasm",
      injectPath: SKBASE + "scram/controller.inject.js",
    },
    scramjetConfig: {
      ...defaultConfig,
      flags: { ...defaultConfig.flags, allowFailedIntercepts: true, allowInvalidJs: true },
    },
  });
  proxy.transport = transport;
  wrapTransport(transport);
  await withTimeout(proxy.controller.wait(), 25000, "Scramjet handshake");
}

/* Scramjet routing self-check -------------------------------------------- */
let lastProbe = 0;

async function scramjetRouted() {
  if (!proxy.controller) return false;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return false;
  const path = SKBASE + "scram/network/" + proxy.controller.id + "/probe/x";

  // Fast path: ask the service worker directly (no network, no console noise).
  // One retry absorbs the wake-up latency of a service worker that was parked.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => reject(new Error("ping timeout")), 1500);
        channel.port1.onmessage = (e) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(!!e.data?.$kuroshi$pong);
        };
        sw.postMessage({ $kuroshi$ping: 1, path }, [channel.port2]);
      });
    } catch {
      /* retry once, then fall through (SW predates the Kuroshi ping patch) */
    }
  }

  // Fallback probe: the service worker answers 500 when it routes the request
  // (the controller has no such frame) and 404 when it lets it hit the disk.
  try {
    const res = await fetch(path, { cache: "no-store" });
    return res.status !== 404;
  } catch {
    return false;
  }
}

/** Verify the service worker still knows our controller; repair it if not. */
export async function ensureScramjet() {
  if (!proxy.controller) await createScramjetController();
  // After a quiet stretch the wisp server may have dropped us: prove the tunnel
  // works before navigating, instead of letting the page load blank.
  if (Date.now() - lastTransportOk > PROBE_QUIET_MS) await verifyOrRecover();
  if (Date.now() - lastProbe < 15000) return;
  lastProbe = Date.now();
  if (await scramjetRouted()) return;

  rebindScramjet();
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await scramjetRouted()) return;
    if (attempt === 1) rebindScramjet();
  }
  lastProbe = 0; // retry on the next navigation
  throw new Error("Scramjet routing is unavailable. Check that <code>server.js</code> is running.");
}

/* --------------------------------------------------- tunnel self-healing --- */
/**
 * The wisp tunnel can die silently: the public server drops it, or the
 * multiplexor ends mid-page (`Wisp(MuxTaskEnded)`). Nothing in the vendored
 * runtimes ever recreates it, so after the first page every later navigation
 * 500s into a blank frame. We therefore watch every transport request, keep
 * the tunnel warm with a tiny HEAD probe, and rebuild the transport in place
 * (a fresh EpoxyClient = a fresh wisp socket) when it goes stale.
 */
const TUNNEL_PROBE = "https://example.com/";
const PROBE_QUIET_MS = 15000;     // silent this long -> prove the tunnel before navigating
const HEARTBEAT_MS = 20000;
const RECOVER_DEBOUNCE_MS = 3000;

let lastTransportOk = Date.now();
let healing = false;
let lastHealAt = 0;

const tunnelError = (err) =>
  /MuxTaskEnded|Wisp|hyper_util|websocket|transport closed|network error/i.test(String(err?.message || err));

function wrapTransport(t) {
  if (!t || t.__kuroshiWrapped) return;
  t.__kuroshiWrapped = true;
  const request = t.request.bind(t);
  t.request = async (...args) => {
    try {
      const res = await request(...args);
      lastTransportOk = Date.now();
      return res;
    } catch (err) {
      if (tunnelError(err)) scheduleRecovery("request failed");
      throw err;
    }
  };
}

/** One cheap round trip through the tunnel: resolves only if it is alive. */
async function probeTunnel() {
  if (!proxy.transport) throw new Error("no transport");
  return proxy.transport.request(new URL(TUNNEL_PROBE), "HEAD", null, new Headers(), null);
}

async function verifyOrRecover() {
  if (!proxy.transport) return false;
  try {
    await probeTunnel();
    lastTransportOk = Date.now();
    return true;
  } catch {
    return recoverTransport("health check");
  }
}

function scheduleRecovery(reason) {
  if (healing || Date.now() - lastHealAt < RECOVER_DEBOUNCE_MS) return;
  recoverTransport(reason).catch((err) => console.warn("[kuroshi] tunnel recovery failed", err));
}

/** Rebuild the wisp connection inside the *existing* transport object, so every
 *  frame's fetch handler (which holds that reference) starts working again. */
async function recoverTransport(reason) {
  if (healing || Date.now() - lastHealAt < RECOVER_DEBOUNCE_MS) return false;
  healing = true;
  lastHealAt = Date.now();
  try {
    console.warn(`[kuroshi] rebuilding wisp tunnel (${reason})`);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        if (typeof proxy.transport?.init !== "function") throw new Error("transport cannot be rebuilt");
        await proxy.transport.init(); // fresh EpoxyClient = fresh wisp socket
        await probeTunnel();
        ok = true;
      } catch {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    if (!ok) return false;
    lastTransportOk = Date.now();
    lastProbe = 0; // re-verify the service-worker routing as well
    if (store.settings.proxy === "ultraviolet") {
      // UV talks through a *separate* worker-side (BareMux) connection: refresh it too
      try {
        await proxy.bareMux?.setTransport(TRANSPORTS[store.settings.transport] || TRANSPORTS.epoxy, [
          { wisp: store.settings.wisp },
        ]);
      } catch { /* the next UV request will surface its own error */ }
    }
    proxy.onTransportRecover?.(reason);
    return true;
  } finally {
    healing = false;
  }
}

/** Keep the tunnel warm while the tab is visible, so an idle server close is
 *  caught and repaired before the next navigation notices. */
function startTunnelHeartbeat() {
  clearInterval(window.__kuroshiHeartbeat);
  window.__kuroshiHeartbeat = setInterval(() => {
    if (healing || document.hidden || !proxy.ready) return;
    verifyOrRecover();
  }, HEARTBEAT_MS);
}

/* ------------------------------------------------------------- navigation -- */

export function proxiedUrl(engine, url) {
  if (url.startsWith("about:") || url.startsWith("kuroshi:")) return url;
  return engine === "ultraviolet" ? SKBASE + "uv/service/" + uvEncode(url) : url;
}

/** Build (or reuse) the Scramjet frame wrapper bound to a tab's iframe. */
export function scramjetFrameFor(tab) {
  if (!proxy.controller) throw new Error("Scramjet is not ready yet");
  let frame = proxy.frames.get(tab.id);
  if (frame) return frame;

  const plugins = [];
  if (window.$scramjetUtils?.HttpCachePlugin) plugins.push(new window.$scramjetUtils.HttpCachePlugin());
  if (window.$scramjetUtils?.UrlWatcherPlugin) {
    plugins.push(
      new window.$scramjetUtils.UrlWatcherPlugin((url) => {
        if (url && tab.onFrameUrl) tab.onFrameUrl(url);
      })
    );
  }

  frame = proxy.controller.createFrame(tab.iframe, { plugins });
  proxy.frames.set(tab.id, frame);
  return frame;
}

/** Load a URL into a tab using the currently selected engine. */
export async function loadFrame(tab, url, engine) {
  tab.engine = engine;
  if (url.startsWith("about:")) {
    tab.iframe.src = "about:blank";
    return;
  }
  if (engine === "ultraviolet") {
    tab.iframe.src = SKBASE + "uv/service/" + uvEncode(url);
  } else {
    await ensureScramjet(); // heals a stale/absent service-worker registration
    if (tab.engine !== "ultraviolet") scramjetFrameFor(tab).go(url);
  }
}

/** Ask the frame what real URL it is currently showing. */
export function readFrameUrl(tab) {
  const engine = tab.engine || store.settings.proxy;
  if (engine === "ultraviolet") {
    try {
      const href = tab.iframe.contentWindow?.location?.href || "";
      if (href.includes("/uv/service/")) {
        const enc = href.split("/uv/service/")[1].split(/[?#]/)[0];
        return uvDecode(enc);
      }
      if (href && href !== "about:blank") return href;
    } catch {
      /* cross-origin mid-navigation */
    }
    return null;
  }
  // Scramjet reports real URLs through the UrlWatcher plugin; fall back to the
  // frame's location when the runtime hasn't started yet.
  try {
    const href = tab.iframe.contentWindow?.location?.href || "";
    if (href && !href.includes("/scram/network/") && href !== "about:blank") return href;
  } catch {
    /* ignore */
  }
  return null;
}

export function frameHistoryAction(tab, action) {
  try {
    if (action === "back") tab.iframe.contentWindow.history.back();
    else if (action === "forward") tab.iframe.contentWindow.history.forward();
    else tab.iframe.contentWindow.location.reload();
    return true;
  } catch {
    return false;
  }
}
