/* Veloura: router, search, event wiring */
(function () {
  const TF = (window.TF = window.TF || {});
  const store = TF.store;
  const api = TF.api;
  const player = TF.player;
  const ui = TF.ui;

  const app = {
    route: { name: "home" },
    history: { stack: [{ name: "home" }], pos: 0 },
    search: { query: "", tracks: [], loading: false, loadingMore: false, error: null, filter: "All", pageToken: null, more: false },
    artist: { loading: false, tracks: [], channel: null, error: null }
  };
  TF.app = app;

  const artistCache = new Map();
  let searchToken = 0;
  let searchTimer = null;

  /* ================================================================== */
  /* router                                                             */
  /* ================================================================== */
  function routeKey(r) {
    return r.name + ":" + (r.id || r.channelId || r.artist || "");
  }

  function sameRoute(a, b) {
    return routeKey(a) === routeKey(b);
  }

  function updateHistoryButtons() {
    const back = document.querySelector('[data-action="back"]');
    const fwd = document.querySelector('[data-action="forward"]');
    back.disabled = app.history.pos <= 0;
    fwd.disabled = app.history.pos >= app.history.stack.length - 1;
  }

  async function navigate(route, opts) {
    opts = opts || {};
    const h = app.history;
    if (!opts.initial && sameRoute(h.stack[h.pos], route) && !opts.force) {
      ui.renderView();
      return;
    }
    if (!opts.initial) {
      h.stack = h.stack.slice(0, h.pos + 1);
      h.stack.push(route);
      h.pos = h.stack.length - 1;
    }
    app.route = route;
    updateHistoryButtons();
    await loadRouteData();
    ui.renderView();
    if (route.name === "search") {
      const input = document.getElementById("search-input");
      input.value = app.search.query;
      document.getElementById("search-box").classList.toggle("has-text", !!input.value);
      if (opts.focus !== false) setTimeout(() => input.focus(), 40);
    }
  }

  function goBack() {
    if (app.history.pos <= 0) return;
    app.history.pos--;
    app.route = app.history.stack[app.history.pos];
    updateHistoryButtons();
    loadRouteData().then(() => ui.renderView());
  }

  function goForward() {
    if (app.history.pos >= app.history.stack.length - 1) return;
    app.history.pos++;
    app.route = app.history.stack[app.history.pos];
    updateHistoryButtons();
    loadRouteData().then(() => ui.renderView());
  }

  async function loadRouteData() {
    const r = app.route;
    if (r.name !== "artist") return;

    const key = r.channelId || r.artist;
    if (artistCache.has(key)) {
      app.artist = Object.assign({ loading: false, error: null }, artistCache.get(key));
      return;
    }

    app.artist = { loading: true, tracks: [], channel: null, error: null };
    ui.renderView();
    try {
      let channel = null;
      let tracks = [];
      if (r.channelId) {
        [channel, tracks] = await Promise.all([
          api.channel(r.channelId).catch(() => null),
          api.channelTracks(r.channelId).then((res) => res.tracks)
        ]);
      } else {
        tracks = (await api.search(r.artist, { musicOnly: true })).tracks;
      }
      const data = { channel, tracks };
      artistCache.set(key, data);
      if (routeKey(app.route) !== routeKey(r)) return; // navigated away
      app.artist = Object.assign({ loading: false, error: null }, data);
    } catch (e) {
      if (routeKey(app.route) !== routeKey(r)) return;
      app.artist = { loading: false, tracks: [], channel: null, error: e.message };
      ui.toast(e.message, "error");
    }
  }

  /* ================================================================== */
  /* search                                                             */
  /* ================================================================== */
  async function runSearch(query, opts) {
    opts = opts || {};
    const st = app.search;
    query = (query == null ? "" : String(query)).trim();
    st.query = query;
    const token = ++searchToken;

    if (!query) {
      st.tracks = []; st.loading = false; st.loadingMore = false;
      st.error = null; st.pageToken = null; st.more = false;
      if (app.route.name === "search") ui.renderView();
      return;
    }

    if (!opts.append) {
      st.loading = true; st.loadingMore = false; st.error = null;
      st.pageToken = null; st.more = false;
      if (app.route.name !== "search") navigate({ name: "search" });
      else ui.renderView();
    } else {
      st.loadingMore = true;
      ui.renderView();
    }

    try {
      const res = await api.search(query, { pageToken: opts.append ? st.pageToken : undefined });
      if (token !== searchToken) return;
      st.tracks = opts.append ? st.tracks.concat(res.tracks) : res.tracks;
      st.pageToken = res.nextPageToken;
      st.more = !!res.nextPageToken;
      st.loading = false;
      st.loadingMore = false;
      if (!opts.append) store.addSearch(query);
      ui.renderView();
      if (opts.play && st.tracks.length) player.setQueue(st.tracks, 0);
    } catch (e) {
      if (token !== searchToken) return;
      st.loading = false;
      st.loadingMore = false;
      st.error = e.message;
      ui.renderView();
      ui.toast(e.message, "error");
    }
  }

  /* ================================================================== */
  /* track lookup helpers                                               */
  /* ================================================================== */
  function resolveList(el) {
    const r = app.route;
    if (el.dataset.playlist) {
      const pl = store.playlist(el.dataset.playlist);
      return pl ? pl.tracks : [];
    }
    if (el.dataset.ctx === "search" || r.name === "search") return app.search.tracks;
    if (el.dataset.ctx === "liked" || r.name === "liked") return store.state.liked;
    if (el.dataset.ctx === "recent" || r.name === "recent") return store.state.recent;
    if (el.dataset.ctx === "artist" || r.name === "artist") return app.artist.tracks;
    if (el.dataset.ctx && el.dataset.ctx.startsWith("playlist:")) {
      const pl = store.playlist(el.dataset.ctx.slice(9));
      return pl ? pl.tracks : [];
    }
    return [];
  }

  function contextTracks(ctx) {
    if (!ctx || ctx === "search") return app.search.tracks;
    if (ctx === "liked") return store.state.liked;
    if (ctx === "recent") return store.state.recent;
    if (ctx === "artist") return app.artist.tracks;
    if (ctx.startsWith("playlist:")) {
      const pl = store.playlist(ctx.slice(9));
      return pl ? pl.tracks : [];
    }
    return [];
  }

  function findTrack(id) {
    const pools = [
      resolveList(document.body),
      player.queue,
      app.search.tracks,
      store.state.liked,
      store.state.recent,
      app.artist.tracks,
      ...store.state.playlists.map((p) => p.tracks)
    ];
    for (const pool of pools) {
      const hit = (pool || []).find((t) => t.id === id);
      if (hit) return hit;
    }
    return null;
  }

  /* ================================================================== */
  /* actions                                                            */
  /* ================================================================== */
  function handleAction(action, el, e) {
    const id = el.dataset.id;

    switch (action) {
      /* ---- navigation ---- */
      case "back": return goBack();
      case "forward": return goForward();
      case "open-playlist": return navigate({ name: "playlist", id: el.dataset.pl });
      case "go-artist": {
        const channelId = el.dataset.channel;
        const artist = el.dataset.artist;
        if (!artist) return;
        return navigate({ name: "artist", channelId: channelId || "", artist });
      }
      case "quick-search": {
        const q = el.dataset.query;
        document.getElementById("search-input").value = q;
        return runSearch(q);
      }
      case "quick-search-play": {
        const q = el.dataset.query;
        document.getElementById("search-input").value = q;
        return runSearch(q, { play: true });
      }
      case "search-filter":
        app.search.filter = el.dataset.filter;
        return ui.renderView();
      case "retry-search": return runSearch(app.search.query);
      case "api-retry": {
        const b = document.getElementById("api-banner");
        if (b) b.querySelector(".ab-btn").textContent = "Checking...";
        return api.ping().then((ok) => {
          if (b) b.querySelector(".ab-btn").textContent = "Try again";
          if (ok) { ui.toast("YouTube API is reachable again"); runSearch(app.search.query); }
          else ui.toast("YouTube API is still unreachable", "error");
        });
      }
      case "dismiss-api-banner":
        store.dismissApiBanner(api.status.reason);
        return syncApiBanner();
      case "clear-search": {
        document.getElementById("search-input").value = "";
        document.getElementById("search-box").classList.remove("has-text");
        return runSearch("");
      }
      case "clear-searches":
        store.clearSearches();
        app.search.searches = store.state.searches;
        return ui.renderView();
      case "remove-search":
        e.stopPropagation();
        store.removeSearch(el.dataset.query);
        app.search.searches = store.state.searches;
        return ui.renderView();

      /* ---- playback ---- */
      case "play-track": {
        const list = resolveList(el);
        const index = el.dataset.index !== "" && el.dataset.index != null && !Number.isNaN(+el.dataset.index)
          ? +el.dataset.index
          : list.findIndex((t) => t.id === id);
        if (player.current && player.current.id === id) return player.toggle();
        if (index >= 0 && list[index]) return player.setQueue(list, index);
        const track = findTrack(id);
        if (track) player.setQueue([track], 0);
        return;
      }
      case "play-queue": return player.playAt(+el.dataset.index);
      case "play-related": {
        const items = (ui.getRelatedCache().items || []);
        return player.setQueue(items, +el.dataset.index);
      }
      case "play-context": {
        const list = contextTracks(el.dataset.ctx);
        if (!list.length) return ui.toast("Nothing to play here yet", "info");
        let index = 0;
        if (el.dataset.id) {
          const byId = list.findIndex((t) => t.id === el.dataset.id);
          index = byId >= 0 ? byId : 0;
        }
        return player.setQueue(list, index);
      }
      case "shuffle-context": {
        const list = contextTracks(el.dataset.ctx);
        if (!list.length) return ui.toast("Nothing to shuffle here yet", "info");
        if (!player.shuffle) player.toggleShuffle();
        return player.setQueue(list, Math.floor(Math.random() * list.length));
      }
      case "play-playlist": {
        e.stopPropagation();
        const pl = store.playlist(el.dataset.pl);
        if (!pl || !pl.tracks.length) return ui.toast("This playlist is empty", "info");
        return player.setQueue(pl.tracks, 0);
      }
      case "toggle-play": return player.toggle();
      case "next": return player.next(false);
      case "prev": return player.prev();
      case "shuffle": return player.toggleShuffle();
      case "repeat": return player.cycleRepeat();
      case "mute": return player.toggleMute();

      /* ---- queue ---- */
      case "queue-remove": e.stopPropagation(); return player.removeQueueAt(+el.dataset.index);
      case "queue-up": e.stopPropagation(); return player.moveQueue(+el.dataset.index, +el.dataset.index - 1);
      case "clear-queue": return player.clearQueue();

      /* ---- likes / playlists ---- */
      case "like-track": {
        e.stopPropagation();
        const track = findTrack(id);
        if (!track) return;
        const added = store.toggleLike(track);
        ui.toast(added ? "Added to Liked Songs" : "Removed from Liked Songs");
        return ui.refreshLikes();
      }
      case "like-current": {
        if (!player.current) return ui.toast("Nothing is playing", "info");
        const added = store.toggleLike(player.current);
        ui.toast(added ? "Added to Liked Songs" : "Removed from Liked Songs");
        return ui.refreshLikes();
      }
      case "track-menu": {
        e.stopPropagation();
        const track = findTrack(id);
        if (!track) return;
        const row = el.closest(".row");
        if (row) row.classList.add("menu-open");
        ui.openCtxMenu(ui.trackMenuItems(track, { playlistId: el.dataset.playlist }), e.clientX, e.clientY);
        return;
      }
      case "track-menu-current": {
        if (!player.current) return;
        const r = el.getBoundingClientRect();
        return ui.openCtxMenu(ui.trackMenuItems(player.current, {}), r.left, r.top - 10);
      }
      case "new-playlist": return ui.modals.playlistForm();
      case "edit-playlist": {
        const pl = store.playlist(el.dataset.pl);
        if (pl) ui.modals.playlistForm(pl);
        return;
      }
      case "delete-playlist": {
        const pl = store.playlist(el.dataset.pl);
        if (!pl) return;
        return ui.modals.confirm("Delete playlist?", `“${pl.name}” and its ${pl.tracks.length} song${pl.tracks.length === 1 ? "" : "s"} will be removed.`, () => {
          store.deletePlaylist(pl.id);
          ui.toast("Playlist deleted");
          if (app.route.name === "playlist" && app.route.id === pl.id) navigate({ name: "library" });
          else ui.rerender();
        });
      }

      /* ---- panels ---- */
      case "toggle-queue": {
        const open = document.body.classList.toggle("queue-open");
        if (open) ui.renderQueue();
        return;
      }
      case "close-queue": document.body.classList.remove("queue-open"); return;
      case "right-tab":
        store.saveSettings({ rightbarTab: el.dataset.tab });
        showRightbar();
        return ui.renderRightbar();
      case "toggle-lyrics": return toggleRightbar("lyrics");
      case "toggle-related": return toggleRightbar("related");
      case "close-rightbar": return hideRightbar();
      case "open-np": {
        document.getElementById("np-overlay").hidden = false;
        return ui.renderPlayer();
      }
      case "close-np": document.getElementById("np-overlay").hidden = true; return;
      case "settings": return ui.modals.settings();
      case "install-info":
        return ui.toast("Use your browser menu → “Install app” / “Add to Home Screen”.", "info");
      default:
        return;
    }
  }

  /* ---- right panel visibility ---- */
  function showRightbar() {
    document.body.classList.add("panel-open");
  }
  function hideRightbar() {
    document.body.classList.remove("panel-open");
  }
  function toggleRightbar(tab) {
    const open = document.body.classList.contains("panel-open");
    const current = store.state.settings.rightbarTab;
    if (open && current === tab) {
      hideRightbar();
      return;
    }
    store.saveSettings({ rightbarTab: tab });
    showRightbar();
    ui.renderRightbar();
  }

  /* ================================================================== */
  /* event wiring                                                       */
  /* ================================================================== */
  function wireEvents() {
    /* one delegated click handler for the whole app */
    document.addEventListener("click", (e) => {
      if (e.target.closest("#ctx-menu")) return;
      if (e.target.id === "modal-root") { ui.closeModal(); return; }

      const el = e.target.closest("[data-action], [data-nav]");
      if (!el) { ui.closeCtxMenu(); return; }

      if (el.dataset.nav) {
        ui.closeCtxMenu();
        const nav = el.dataset.nav;
        navigate({ name: nav }).then(() => {
          if (nav === "search") document.getElementById("search-input").focus();
        });
        return;
      }
      handleAction(el.dataset.action, el, e);
    });

    /* search input */
    const input = document.getElementById("search-input");
    input.addEventListener("input", () => {
      document.getElementById("search-box").classList.toggle("has-text", !!input.value);
      clearTimeout(searchTimer);
      const q = input.value;
      if (app.route.name !== "search" && q) navigate({ name: "search", force: true });
      searchTimer = setTimeout(() => runSearch(q), 420);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { clearTimeout(searchTimer); runSearch(input.value); }
      if (e.key === "Escape") {
        if (input.value) { input.value = ""; runSearch(""); }
        else input.blur();
      }
      e.stopPropagation();
    });

    /* infinite scroll on search results */
    const view = document.getElementById("view");
    view.addEventListener("scroll", () => {
      const st = app.search;
      if (app.route.name !== "search" || !st.more || st.loading || st.loadingMore) return;
      if (st.filter === "Artists" || st.filter === "Playlists") return;
      if (view.scrollTop + view.clientHeight > view.scrollHeight - 400) {
        runSearch(st.query, { append: true });
      }
    });

    /* seek bars */
    ["seek", "seek-big"].forEach((id) => {
      const bar = document.getElementById(id);
      bar.addEventListener("pointerdown", () => player._setSeeking(true));
      bar.addEventListener("input", () => {
        const preview = (bar.value / 1000) * (player.duration || 0);
        document.getElementById("time-cur").textContent = ui.fmtTime(preview);
        document.getElementById("time-cur-big").textContent = ui.fmtTime(preview);
        bar.style.setProperty("--fill", bar.value / 10 + "%");
        const other = document.getElementById(id === "seek" ? "seek-big" : "seek");
        other.value = bar.value;
        other.style.setProperty("--fill", bar.value / 10 + "%");
      });
      const commit = () => {
        if (!player.duration) { player._setSeeking(false); return; }
        player.seekTo((bar.value / 1000) * player.duration);
        player._setSeeking(false);
      };
      bar.addEventListener("change", commit);
      bar.addEventListener("pointerup", commit);
    });

    /* volume */
    const vol = document.getElementById("volume");
    vol.addEventListener("input", () => player.setVolume(+vol.value));

    /* keyboard shortcuts */
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;

      if (e.key === "Escape") {
        if (!document.getElementById("ctx-menu").hidden) return ui.closeCtxMenu();
        if (ui.modalOpen()) return ui.closeModal();
        if (!document.getElementById("np-overlay").hidden) { document.getElementById("np-overlay").hidden = true; return; }
        if (document.body.classList.contains("panel-open")) { hideRightbar(); return; }
        if (document.body.classList.contains("queue-open")) { document.body.classList.remove("queue-open"); return; }
        return;
      }
      if (typing || ui.modalOpen()) return;

      if (e.key === "/" ) {
        e.preventDefault();
        navigate({ name: "search" }).then(() => document.getElementById("search-input").focus());
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        player.toggle();
        return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); return e.shiftKey ? player.next(false) : player.seekBy(5); }
      if (e.key === "ArrowLeft") { e.preventDefault(); return e.shiftKey ? player.prev() : player.seekBy(-5); }
      if (e.key === "ArrowUp") { e.preventDefault(); return player.setVolume(store.state.settings.volume + 5); }
      if (e.key === "ArrowDown") { e.preventDefault(); return player.setVolume(store.state.settings.volume - 5); }
      if (e.key.toLowerCase() === "m") return player.toggleMute();
      if (e.key.toLowerCase() === "l") {
        if (!player.current) return;
        const added = store.toggleLike(player.current);
        ui.toast(added ? "Added to Liked Songs" : "Removed from Liked Songs");
        return ui.refreshLikes();
      }
      if (e.key.toLowerCase() === "q") {
        const open = document.body.classList.toggle("queue-open");
        if (open) ui.renderQueue();
        return;
      }
    });

    /* player engine events */
    player.on("track", () => {
      ui.renderPlayer();
      ui.renderQueue();
      ui.updateRowStates();
      if (document.body.classList.contains("panel-open")) ui.renderRightbar();
      const t = player.current;
      document.title = t ? `${t.title} · ${t.artist} · Veloura` : "Veloura · Your YouTube library, one clean player";
    });
    player.on("state", () => {
      ui.renderPlayer();
      ui.updateRowStates();
    });
    player.on("time", () => ui.renderTime());
    player.on("queue", () => {
      ui.renderQueue();
      ui.updateRowStates();
    });
    player.on("volume", () => ui.renderVolume());
    player.on("error", (msg) => ui.toast(msg, "error"));
    player.on("ready", () => { /* engine ready */ });
  }

  /* ================================================================== */
  /* public surface used by the UI layer                                 */
  /* ================================================================== */
  app.navigate = navigate;
  app.goBack = goBack;
  app.goForward = goForward;
  app.runSearch = runSearch;
  app.rerender = () => ui.rerender();

  /* ================================================================== */
  /* ghost placeholder: the search pill cycles suggestions               */
  /* ================================================================== */
  const SUGGESTIONS = [
    "the weeknd blinding lights",
    "lofi beats to study to",
    "daft punk around the world",
    "juice wrld lucid dreams",
    "jazz for relaxing",
    "taylor swift",
    "rock anthems 90s",
    "drake one dance",
    "bad bunny",
    "epic orchestral mix"
  ];
  let ghostIdx = 0;

  function initGhost() {
    const ghost = document.getElementById("search-ghost");
    ghost.textContent = SUGGESTIONS[0];
    setInterval(() => {
      if (app.route.name !== "search") return;
      const input = document.getElementById("search-input");
      if (input.value || document.activeElement === input) return;
      ghost.classList.add("swap");
      setTimeout(() => {
        ghostIdx = (ghostIdx + 1) % SUGGESTIONS.length;
        ghost.textContent = SUGGESTIONS[ghostIdx];
        ghost.classList.remove("swap");
      }, 520);
    }, 3600);
  }

  /* ================================================================== */
  /* degraded-mode banner + liquid glass                                 */
  /* ================================================================== */
  function syncApiBanner() {
    const banner = document.getElementById("api-banner");
    if (!banner) return;
    /* dismissal survives reloads, but clears once the API recovers */
    if (!api.status.down && store.state.settings.apiBannerDismissed) {
      store.dismissApiBanner("");
    }
    const dismissed = store.state.settings.apiBannerDismissed === api.status.reason;
    const show = api.status.down && !dismissed && api.status.reason;
    banner.hidden = !show;
    document.body.classList.toggle("api-banner-open", show);
    if (show) {
      const msg = document.getElementById("api-banner-msg");
      if (msg) msg.textContent = api.status.reason;
      const h = banner.getBoundingClientRect().height;
      if (h) document.documentElement.style.setProperty("--ab-h", Math.round(h) + "px");
    } else {
      document.documentElement.style.removeProperty("--ab-h");
    }
  }

  function applyGlass() {
    document.body.classList.toggle("glass", !!store.state.settings.glass);
  }
  app.applyGlass = applyGlass;
  app.syncApiBanner = syncApiBanner;

  window.addEventListener("tf-api-status", syncApiBanner);
  window.addEventListener("offline", () => {
    api.status.down = true;
    api.status.reason = "You appear to be offline. Reconnect and try again.";
    syncApiBanner();
  });
  window.addEventListener("online", () => {
    api.ping().then((ok) => { if (ok) syncApiBanner(); });
  });

  /* ================================================================== */
  /* boot                                                               */
  /* ================================================================== */
  function restoreSession() {
    const last = store.state.last;
    if (!last || !last.track) return;
    player.queue = Array.isArray(last.queue) && last.queue.length ? last.queue : [last.track];
    player.index = typeof last.index === "number" ? Math.max(0, Math.min(last.index, player.queue.length - 1)) : 0;
    player.current = player.queue[player.index] || last.track;
    player.duration = player.current.duration || 0;
    document.body.classList.add("is-paused");
  }

  function init() {
    ui.paintIcons(document);
    applyGlass();
    app.search.searches = store.state.searches;
    restoreSession();
    wireEvents();
    initGhost();

    ui.renderPlayer();
    ui.renderQueue();
    navigate({ name: "home" }, { initial: true });
    player.init().catch((err) => ui.toast(err.message, "error"));

    if (!store.apiKey()) ui.toast("Add a YouTube API key in Settings to search.", "error");
    else if (navigator.onLine !== false) api.ping().then(syncApiBanner);
    else syncApiBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
