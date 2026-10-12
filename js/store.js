/** localStorage-backed app state: settings, history, bookmarks, speed tiles. */

const KEY = "kuroshi.v1";

const DEFAULTS = {
  settings: {
    engine: "duckduckgo",
    proxy: "scramjet",       // "scramjet" | "ultraviolet"
    transport: "epoxy",      // "epoxy" | "libcurl"
    wisp: "wss://invisiproxy.com/wisp/",
    zoom: 100,
    cloak: { enabled: false, title: "Google", icon: "https://www.gstatic.com/faviconv2/favicon.ico" },
    autoload: true,
  },
  history: [],              // { u, t, ti, at }
  bookmarks: [],            // { u, t, ti, pin }
  tiles: [
    { name: "Google", url: "https://www.google.com" },
    { name: "YouTube", url: "https://www.youtube.com" },
    { name: "Discord", url: "https://discord.com/app" },
    { name: "GitHub", url: "https://github.com" },
  ],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...data.settings, cloak: { ...DEFAULTS.settings.cloak, ...(data.settings?.cloak || {}) } },
      history: Array.isArray(data.history) ? data.history : [],
      bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
      tiles: Array.isArray(data.tiles) ? data.tiles : DEFAULTS.tiles,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

const state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled: keep running in memory */
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get settings() {
    return state.settings;
  },
  get history() {
    return state.history;
  },
  get bookmarks() {
    return state.bookmarks;
  },
  get tiles() {
    return state.tiles;
  },

  set(setting, value) {
    state.settings[setting] = value;
    persist();
  },
  patchSettings(obj) {
    Object.assign(state.settings, obj);
    persist();
  },

  addHistory(url, title) {
    if (!url || /^about:/.test(url) || /^kuroshi:/.test(url)) return;
    const top = state.history[0];
    if (top && top.u === url) {
      top.at = Date.now();
      top.ti = title || top.ti;
      persist();
      return;
    }
    state.history.unshift({ u: url, ti: title || url, at: Date.now() });
    if (state.history.length > 600) state.history.length = 600;
    persist();
  },
  removeHistory(url) {
    state.history = state.history.filter((h) => h.u !== url);
    persist();
  },
  clearHistory() {
    state.history = [];
    persist();
  },

  hasBookmark(url) {
    return state.bookmarks.some((b) => b.u === url);
  },
  toggleBookmark(url, title) {
    const i = state.bookmarks.findIndex((b) => b.u === url);
    if (i >= 0) {
      state.bookmarks.splice(i, 1);
      persist();
      return false;
    }
    state.bookmarks.unshift({ u: url, ti: title || url, at: Date.now() });
    persist();
    return true;
  },
  removeBookmark(url) {
    state.bookmarks = state.bookmarks.filter((b) => b.u !== url);
    persist();
  },
  clearBookmarks() {
    state.bookmarks = [];
    persist();
  },

  addTile(name, url) {
    state.tiles.push({ name, url });
    persist();
  },
  removeTile(url) {
    state.tiles = state.tiles.filter((t) => t.url !== url);
    persist();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
