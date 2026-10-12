/* Veloura: rendering: views, player bar, panels, modals, menus */
(function () {
  const TF = (window.TF = window.TF || {});
  const store = TF.store;
  const api = TF.api;
  const player = TF.player;

  /* ================================================================== */
  /* icons                                                              */
  /* ================================================================== */
  const ICONS = {
    home: "M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3l9-8z",
    search: "M10.5 3a7.5 7.5 0 1 0 4.55 13.46l4.24 4.24 1.41-1.41-4.24-4.24A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z",
    library: "M3 22V4h2.2v18H3zm5.4 0V4h2.2v18H8.4zM15 4.6v17.4h2.2V4.6H15zm5.4 0v17.4h2.2V4.6h-2.2z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z",
    heart: "M12 20.7l-1.4-1.3C5.4 14.7 2 11.6 2 7.9 2 5.4 4 3.4 6.5 3.4c1.5 0 2.9.7 3.8 1.8L12 7l1.7-1.8c.9-1.1 2.3-1.8 3.8-1.8C20 3.4 22 5.4 22 7.9c0 3.7-3.4 6.8-8.6 11.5L12 20.7z",
    "heart-filled": "M12 20.7l-1.4-1.3C5.4 14.7 2 11.6 2 7.9 2 5.4 4 3.4 6.5 3.4c1.5 0 2.9.7 3.8 1.8L12 7l1.7-1.8c.9-1.1 2.3-1.8 3.8-1.8C20 3.4 22 5.4 22 7.9c0 3.7-3.4 6.8-8.6 11.5L12 20.7z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6V6h-2v7.4l5.2 3.1 1-1.7-4.2-2.2z",
    music: "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z",
    disc: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z",
    play: "M8 5v14l11-7L8 5z",
    pause: "M6 5h4v14H6V5zm8 0h4v14h-4V5z",
    prev: "M6 6h2v12H6V6zm3.5 6L18 6v12l-8.5-6z",
    next: "M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z",
    shuffle: "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
    repeat: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
    "repeat-one": "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
    queue: "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
    mic: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z",
    related: "M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    "volume-mute": "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
    gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z",
    "chevron-right": "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59z",
    "chevron-down": "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6l1.41-1.41z",
    expand: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    external: "M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    dots: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    list: "M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z",
    sort: "M3 6h18v2H3V6zm3 5h12v2H6v-2zm3 5h6v2H9v-2z",
    warn: "M12 3.4L22.2 21H1.8L12 3.4zM11 9.6v5h2v-5h-2zm0 6.6v2h2v-2h-2z"
  };

  function svg(name) {
    const path = ICONS[name] || ICONS.music;
    let extra = "";
    if (name === "repeat-one") {
      extra = '<text x="12" y="15.4" font-size="9" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">1</text>';
    }
    return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/>${extra}</svg>`;
  }

  function paintIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      if (el.dataset.painted === name) return;
      el.innerHTML = svg(name);
      el.dataset.painted = name;
      el.style.display = "grid";
      el.style.placeItems = "center";
    });
  }

  /* ================================================================== */
  /* helpers                                                            */
  /* ================================================================== */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                 : `${m}:${String(s).padStart(2, "0")}`;
  }

  function fmtNum(n) {
    n = +n || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function ago(iso) {
    if (!iso) return "";
    const d = Date.now() - new Date(iso).getTime();
    const days = Math.floor(d / 86400000);
    if (days < 1) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return days + " days ago";
    if (days < 365) return Math.floor(days / 30) + " months ago";
    return Math.floor(days / 365) + " years ago";
  }

  function coverImg(track, cls) {
    const src = track.thumbnail || "";
    return src
      ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">`
      : `<span class="${cls}" data-icon="music"></span>`;
  }

  /* ================================================================== */
  /* image fallbacks                                                     */
  /* ================================================================== */
  /* youtube thumbnail dead? retry hqdefault once, then swap the img for a
     flat tinted icon so covers never render as a broken/black box.      */
  function imgFail(img) {
    if (!img || !img.parentNode) return;
    const src = img.getAttribute("src") || "";
    if (img.dataset.fb === "1") return;
    const m = /^(https?:)?\/\/i\.ytimg\.com\/vi\/([^/]+)\/[a-z0-9_]+\.jpg/i.exec(src);
    if (m && img.dataset.fbTry !== "1") {
      img.dataset.fbTry = "1";
      img.src = "//i.ytimg.com/vi/" + m[2] + "/hqdefault.jpg";
      return;
    }
    img.dataset.fb = "1";
    const ph = document.createElement("span");
    ph.className = (img.className || "") + " img-fallback";
    if (img.closest(".q-row")) ph.className += " q-thumb";
    if (img.closest(".rel-card")) ph.className += " rc-fallback";
    if (img.closest(".artist-hero")) ph.className += " ah-fb";
    const big = img.closest(".cover, .lh-art, .artist-hero, .np-art");
    ph.innerHTML = svg(big ? "disc" : "music");
    img.replaceWith(ph);
  }

  /* player bar cover: hide the img and restore the built-in placeholder */
  function npFail(img) {
    if (!img) return;
    const src = (img.getAttribute("src") || "").trim();
    if (!src) { img.hidden = true; showCoverEmpty(img); return; }
    if (img.dataset.fb === "1") return;
    const m = /^(https?:)?\/\/i\.ytimg\.com\/vi\/([^/]+)\/[a-z0-9_]+\.jpg/i.exec(src);
    if (m && img.dataset.fbTry !== "1") {
      img.dataset.fbTry = "1";
      img.src = "//i.ytimg.com/vi/" + m[2] + "/hqdefault.jpg";
      return;
    }
    img.dataset.fb = "1";
    img.hidden = true;
    showCoverEmpty(img);
  }
  function showCoverEmpty(img) {
    const empty = img.id === "np-cover-img" ? document.querySelector(".np-cover-empty") : null;
    if (empty) empty.style.display = "grid";
    if (img.id === "np-art-img") {
      const ph = document.querySelector(".np-art-placeholder");
      if (ph) ph.style.display = "grid";
    }
  }

  /* ================================================================== */
  /* toast                                                              */
  /* ================================================================== */
  function toast(msg, type) {
    const wrap = document.getElementById("toast-wrap");
    const dur = type === "error" ? 4200 : 2400;
    const hide = (node) => {
      node.classList.add("out");
      node._t2 = setTimeout(() => node.remove(), 300);
    };
    // an identical message already on screen: refresh its timer instead of stacking a duplicate
    const dup = [...wrap.children].find((el) => el.textContent === msg && !el.classList.contains("out"));
    if (dup) {
      clearTimeout(dup._t1);
      clearTimeout(dup._t2);
      dup.className = "toast" + (type ? " " + type : "");
      dup._t1 = setTimeout(() => hide(dup), dur);
      return;
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    wrap.appendChild(el);
    // keep the stack short: drop the oldest beyond the cap
    while (wrap.children.length > 3) wrap.firstElementChild.remove();
    el._t1 = setTimeout(() => hide(el), dur);
  }

  /* ================================================================== */
  /* modals                                                             */
  /* ================================================================== */
  const modalRoot = () => document.getElementById("modal-root");

  function openModal(html, onMount) {
    const root = modalRoot();
    root.hidden = false;
    root.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    paintIcons(root);
    const modal = root.querySelector(".modal");
    if (onMount) onMount(modal);
    const first = modal.querySelector("input, button.btn-sm.primary");
    if (first) setTimeout(() => first.focus(), 30);
    return modal;
  }
  function closeModal() {
    const root = modalRoot();
    root.hidden = true;
    root.innerHTML = "";
  }
  function modalOpen() {
    return !modalRoot().hidden;
  }

  const modals = {
    settings() {
      const s = store.state.settings;
      const q = store.quota();
      const used = Math.min(100, Math.round((q.units / TF.CONFIG.DAILY_QUOTA_LIMIT) * 100));
      const cls = used > 90 ? "crit" : used > 60 ? "warn" : "";
      openModal(`
        <h3>Settings</h3>
        <p class="modal-sub">Veloura uses the YouTube Data API v3 to search for music and LRCLIB for synced lyrics.</p>
        <div class="field">
          <label for="set-key">YouTube API key</label>
          <input id="set-key" type="password" placeholder="AIza..." value="${esc(s.apiKey || "")}" autocomplete="off">
          <div class="hint">
            Leave blank to use the bundled key. Create your own key at
            <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener">Google Cloud Console</a>
            (enable “YouTube Data API v3”). Restrict it to that API only, and never expose a key with access to other Google APIs.
          </div>
        </div>
        <div class="switch-row">
          <div class="sr-text"><strong>Music videos only</strong><small>Filter search results to YouTube's Music category</small></div>
          <label class="switch"><input type="checkbox" id="set-music" ${s.musicOnly ? "checked" : ""}><span class="track"></span><span class="thumb"></span></label>
        </div>
        <div class="switch-row">
          <div class="sr-text"><strong>Liquid glass</strong><small>Frosted translucent panels, iOS 26 style</small></div>
          <label class="switch"><input type="checkbox" id="set-glass" ${s.glass ? "checked" : ""}><span class="track"></span><span class="thumb"></span></label>
        </div>
        <div class="switch-row">
          <div class="sr-text"><strong>API usage today</strong><small>${q.units.toLocaleString()} / ${TF.CONFIG.DAILY_QUOTA_LIMIT.toLocaleString()} units · ${q.searches} searches (search = 100 units)</small></div>
          <div style="width:110px">
            <div class="quota-bar"><i class="${cls}" style="width:${Math.max(2, used)}%"></i></div>
          </div>
        </div>
        <div class="switch-row">
          <div class="sr-text"><strong>Keyboard shortcuts</strong><small>Space play/pause · ← → seek · ↑ ↓ volume · M mute · L like · Q queue</small></div>
        </div>
        <div class="modal-actions">
          <button class="btn-sm danger" data-act="wipe">Erase all data</button>
          <button class="btn-sm" data-act="cancel">Cancel</button>
          <button class="btn-sm primary" data-act="save">Save</button>
        </div>
      `, (modal) => {
        modal.addEventListener("click", (e) => {
          const act = e.target.closest("[data-act]") && e.target.closest("[data-act]").dataset.act;
          if (act === "cancel") closeModal();
          if (act === "save") {
            store.saveSettings({
              apiKey: modal.querySelector("#set-key").value.trim(),
              musicOnly: modal.querySelector("#set-music").checked,
              glass: modal.querySelector("#set-glass").checked
            });
            closeModal();
            toast("Settings saved");
            if (TF.app && TF.app.applyGlass) TF.app.applyGlass();
            TF.app.rerender();
          }
          if (act === "wipe") {
            modals.confirm("Erase all local data?", "Liked songs, playlists, history and settings will be deleted.", () => {
              store.wipe();
              location.reload();
            });
          }
        });
        modal.querySelector("#set-key").addEventListener("keydown", (e) => {
          if (e.key === "Enter") modal.querySelector('[data-act="save"]').click();
        });
      });
    },

    playlistForm(playlist) {
      const isEdit = !!playlist;
      openModal(`
        <h3>${isEdit ? "Edit playlist" : "Create playlist"}</h3>
        <p class="modal-sub">${isEdit ? "Rename your playlist." : "Give your new playlist a name."}</p>
        <div class="field">
          <label for="pl-name">Playlist name</label>
          <input id="pl-name" type="text" maxlength="60" placeholder="My Playlist" value="${esc(isEdit ? playlist.name : "")}">
        </div>
        <div class="modal-actions">
          <button class="btn-sm" data-act="cancel">Cancel</button>
          <button class="btn-sm primary" data-act="save">${isEdit ? "Save" : "Create"}</button>
        </div>
      `, (modal) => {
        const input = modal.querySelector("#pl-name");
        input.select();
        const save = () => {
          const name = input.value.trim();
          if (!name) { input.focus(); return; }
          if (isEdit) { store.renamePlaylist(playlist.id, name); toast("Playlist renamed"); }
          else {
            const pl = store.createPlaylist(name);
            toast(`Playlist “${pl.name}” created`);
            TF.app.navigate({ name: "playlist", id: pl.id });
          }
          closeModal();
          TF.app.rerender();
        };
        modal.addEventListener("click", (e) => {
          const b = e.target.closest("[data-act]");
          if (!b) return;
          if (b.dataset.act === "cancel") closeModal();
          if (b.dataset.act === "save") save();
        });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
      });
    },

    addToPlaylist(track) {
      const lists = store.state.playlists;
      const rows = lists.length
        ? lists.map((p) => `
            <button class="ml-item" data-pl="${p.id}">
              <span class="ml-art" data-icon="list"></span>
              <span><strong>${esc(p.name)}</strong><small>${p.tracks.length} song${p.tracks.length === 1 ? "" : "s"}</small></span>
            </button>`).join("")
        : `<p class="modal-sub" style="padding:0 4px">You have no playlists yet.</p>`;
      openModal(`
        <h3>Add to playlist</h3>
        <p class="modal-sub">${esc(track.title)} · ${esc(track.artist)}</p>
        <div class="modal-list">${rows}</div>
        <div class="modal-actions">
          <button class="btn-sm" data-act="cancel">Close</button>
          <button class="btn-sm primary" data-act="new">New playlist</button>
        </div>
      `, (modal) => {
        modal.addEventListener("click", (e) => {
          const pl = e.target.closest("[data-pl]");
          if (pl) {
            const added = store.addToPlaylist(pl.dataset.pl, track);
            toast(added ? `Added to “${store.playlist(pl.dataset.pl).name}”` : "Already in that playlist");
            closeModal();
            TF.app.rerender();
            return;
          }
          const b = e.target.closest("[data-act]");
          if (!b) return;
          if (b.dataset.act === "cancel") closeModal();
          if (b.dataset.act === "new") {
            closeModal();
            modals.playlistForm();
          }
        });
      });
    },

    confirm(title, message, onYes) {
      openModal(`
        <h3>${esc(title)}</h3>
        <p class="modal-sub">${esc(message)}</p>
        <div class="modal-actions">
          <button class="btn-sm" data-act="cancel">Cancel</button>
          <button class="btn-sm danger" data-act="yes">Delete</button>
        </div>
      `, (modal) => {
        modal.addEventListener("click", (e) => {
          const b = e.target.closest("[data-act]");
          if (!b) return;
          if (b.dataset.act === "cancel") closeModal();
          if (b.dataset.act === "yes") { closeModal(); onYes(); }
        });
      });
    }
  };

  /* ================================================================== */
  /* context menu                                                       */
  /* ================================================================== */
  function openCtxMenu(items, x, y) {
    const el = document.getElementById("ctx-menu");
    el.innerHTML = items.map((it) => {
      if (it === "-") return `<div class="ctx-sep"></div>`;
      return `<button class="ctx-item" data-mi="${esc(it.id)}"><span data-icon="${it.icon}"></span>${esc(it.label)}</button>`;
    }).join("");
    el.hidden = false;
    paintIcons(el);
    el.querySelectorAll("[data-mi]").forEach((btn) => {
      const item = items.find((i) => i !== "-" && i.id === btn.dataset.mi);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeCtxMenu();
        item.run();
      });
    });
    el.style.visibility = "hidden";
    el.style.left = "0px";
    el.style.top = "0px";
    const r = el.getBoundingClientRect();
    el.style.left = Math.min(x, window.innerWidth - r.width - 10) + "px";
    el.style.top = Math.min(y, window.innerHeight - r.height - 10) + "px";
    el.style.visibility = "visible";
  }
  function closeCtxMenu() {
    const el = document.getElementById("ctx-menu");
    el.hidden = true;
    el.innerHTML = "";
    document.querySelectorAll(".row.menu-open").forEach((r) => r.classList.remove("menu-open"));
  }

  function trackMenuItems(track, ctx) {
    ctx = ctx || {};
    const liked = store.isLiked(track.id);
    const items = [
      { id: "next", icon: "list", label: "Add to queue", run: () => { player.enqueue(track, { next: true }); toast("Added to queue"); } },
      { id: "like", icon: liked ? "heart-filled" : "heart", label: liked ? "Remove from Liked Songs" : "Save to Liked Songs", run: () => { store.toggleLike(track); refreshLikes(); } },
      { id: "addpl", icon: "plus", label: "Add to playlist…", run: () => modals.addToPlaylist(track) }
    ];
    if (ctx.playlistId) {
      items.push({ id: "rmpl", icon: "trash", label: `Remove from this playlist`, run: () => { store.removeFromPlaylist(ctx.playlistId, track.id); toast("Removed from playlist"); rerender(); } });
    }
    items.push("-");
    items.push({ id: "artist", icon: "user", label: "Go to artist", run: () => TF.app.navigate({ name: "artist", channelId: track.channelId, artist: track.artist }) });
    items.push({ id: "yt", icon: "external", label: "Watch on YouTube", run: () => window.open("https://www.youtube.com/watch?v=" + track.id, "_blank") });
    return items;
  }

  /* ================================================================== */
  /* track rows                                                         */
  /* ================================================================== */
  function trackRow(track, opts) {
    opts = opts || {};
    const isCurrent = player.current && player.current.id === track.id;
    const liked = store.isLiked(track.id);
    const idx = opts.index != null ? opts.index + 1 : "";
    return `
      <div class="row ${isCurrent ? "current" : ""} ${isCurrent && player.playing ? "playing" : ""}"
           style="--i:${opts.index != null ? opts.index : 0}"
           data-action="play-track" data-id="${esc(track.id)}" data-index="${opts.index != null ? opts.index : ""}"
           ${opts.playlistId ? `data-playlist="${esc(opts.playlistId)}"` : ""}>
        <div class="num">
          <span class="idx">${idx}</span>
          <span class="eq-bars"><i></i><i></i><i></i><i></i></span>
          <button class="row-play" data-action="play-track" data-id="${esc(track.id)}" data-index="${opts.index != null ? opts.index : ""}"
                  ${opts.playlistId ? `data-playlist="${esc(opts.playlistId)}"` : ""} title="Play">
            <span data-icon="${isCurrent && player.playing ? "pause" : "play"}"></span>
          </button>
        </div>
        <div class="row-main">
          ${coverImg(track, "row-cover")}
          <div class="row-text">
            <div class="row-title" title="${esc(track.title)}">${esc(track.title)}</div>
            <div class="row-sub" data-action="go-artist" data-artist="${esc(track.artist)}" data-channel="${esc(track.channelId)}">${esc(track.artist)}</div>
          </div>
        </div>
        <div class="row-album" title="${esc(track.channelTitle)}">${esc(track.channelTitle)}</div>
        <div class="row-right">
          <button class="icon-btn sm row-like ${liked ? "on" : ""}" data-action="like-track" data-id="${esc(track.id)}"
                  title="${liked ? "Remove from Liked Songs" : "Save to Liked Songs"}"><span data-icon="${liked ? "heart-filled" : "heart"}"></span></button>
          <span class="row-dur">${track.duration ? fmtTime(track.duration) : "--:--"}</span>
          <button class="row-menu" data-action="track-menu" data-id="${esc(track.id)}" data-index="${opts.index != null ? opts.index : ""}"
                  ${opts.playlistId ? `data-playlist="${esc(opts.playlistId)}"` : ""} title="More options"><span data-icon="dots"></span></button>
        </div>
      </div>`;
  }

  function trackList(tracks, opts) {
    opts = opts || {};
    if (!tracks.length) {
      return `<div class="empty-state"><div class="big-ico" data-icon="music"></div><h3>No songs yet</h3><p>${esc(opts.emptyText || "Search for music and add it here.")}</p></div>`;
    }
    return `
      <div class="track-list">
        <div class="track-head">
          <div class="num">#</div>
          <div>Title</div>
          <div class="album-col">Album / Channel</div>
          <div class="dur" title="Duration"><span data-icon="clock"></span></div>
          <div></div>
        </div>
        ${tracks.map((t, i) => trackRow(t, Object.assign({}, opts, { index: i }))).join("")}
      </div>`;
  }

  function mediaCard(trackOrMix, opts) {
    opts = opts || {};
    const round = opts.round ? "round" : "";
    const sub = opts.sub != null ? opts.sub : (trackOrMix.artist || "");
    const title = opts.title != null ? opts.title : (trackOrMix.title || "");
    const img = opts.image != null ? opts.image : (trackOrMix.thumbnail || "");
    const attrs = opts.attrs || "";
    const iconCls = img ? "" : " cover--icon";
    return `
      <div class="media-card" ${attrs}>
        <div class="cover ${round}${iconCls}">
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">`
                : `<span data-icon="${opts.icon || "music"}"></span>`}
          ${opts.playAttrs ? `<button class="card-badge" ${opts.playAttrs} title="Play"><span data-icon="play"></span></button>` : ""}
        </div>
        <h4>${esc(title)}</h4>
        <p>${esc(sub)}</p>
      </div>`;
  }

  /* a track shown as a floating card (ctx: "search" | "recent" | "liked") */
  function trackCard(t, i, ctx) {
    const isCur = player.current && player.current.id === t.id;
    const attrs = ctx === "search"
      ? `data-action="play-track" data-id="${esc(t.id)}" data-ctx="search"`
      : `data-action="play-context" data-ctx="${esc(ctx)}" data-id="${esc(t.id)}"`;
    return `
      <div class="media-card ${isCur ? "is-current" : ""}" style="--i:${i}" ${attrs}>
        <div class="cover${t.thumbnail ? "" : " cover--icon"}">
          ${t.thumbnail ? `<img src="${esc(t.thumbnail)}" alt="" loading="lazy" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">`
                        : `<span data-icon="music"></span>`}
          <button class="card-badge" ${attrs} title="Play"><span data-icon="play"></span></button>
        </div>
        <h4>${esc(t.title)}</h4>
        <p>${esc(t.artist)}</p>
      </div>`;
  }

  function rowSection(title, cardsHtml, sub) {
    if (!cardsHtml) return "";
    return `
      <section class="row-section">
        <div class="row-section-head"><h2>${esc(title)}</h2>${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</div>
        <div class="h-scroll">${cardsHtml}</div>
      </section>`;
  }

  /* ================================================================== */
  /* views                                                              */
  /* ================================================================== */
  const app = () => TF.app;

  function homeView() {
    const s = store.state;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const genres = ["Pop", "Hip-Hop", "Rock", "Lo-Fi", "R&B", "Jazz", "Electronic", "Classical", "Metal", "Latin", "Country", "Reggae"];
    const hasAny = s.recent.length || s.liked.length || s.playlists.length;

    const hero = `
      <section class="hero">
        <h1>${hasAny ? greet : "Everything you love about <span class=\"grad\">YouTube</span>, in one player."}</h1>
        <p>${hasAny
          ? "Jump back in where you left off, or search for something new."
          : "Look up any song, artist or playlist, and Veloura plays it right here in your browser, with synced lyrics and a clean queue."}</p>
        <div class="hero-actions">
          <button class="btn-green" data-nav="search"><span data-icon="search"></span> Find music</button>
          ${hasAny && s.recent.length ? `<button class="btn-ghost" data-action="play-context" data-ctx="recent"><span data-icon="play"></span> Play recent</button>` : ""}
          <button class="btn-ghost" data-action="new-playlist"><span data-icon="plus"></span> New playlist</button>
        </div>
      </section>`;

    if (!hasAny) {
      return `
        ${hero}
        ${rowSection("Start with something popular",
          genres.map((g, i) => mediaCard({}, {
            title: g, sub: "Radio · YouTube", icon: "disc",
            attrs: `style="--i:${i}" data-action="quick-search" data-query="${esc(g)}"`,
            playAttrs: `data-action="quick-search-play" data-query="${esc(g)}"`
          })).join(""))}`;
    }

    const recent = s.recent.slice(0, 8);
    const artists = [];
    s.recent.forEach((t) => { if (!artists.includes(t.artist)) artists.push(t.artist); });
    const mixes = artists.slice(0, 6);

    return `
      ${hero}
      ${rowSection("Jump back in", recent.map((t, i) => trackCard(t, i, "recent")).join(""), "Recently played")}
      ${mixes.length ? rowSection("Made for you",
        mixes.map((artist, i) => mediaCard({}, {
          title: `${artist} Mix`, sub: "Playlist · YouTube", icon: "disc",
          attrs: `style="--i:${i}" data-action="quick-search" data-query="${esc(artist + " mix")}"`,
          playAttrs: `data-action="quick-search-play" data-query="${esc(artist + " mix")}"`
        })).join(""), "Based on what you play") : ""}
      ${s.liked.length ? rowSection("Your favorite songs",
        s.liked.slice(0, 8).map((t, i) => trackCard(t, i, "liked")).join(""), `${s.liked.length} liked`) : ""}
      ${s.playlists.length ? rowSection("Your playlists",
        s.playlists.map((p, i) => mediaCard({}, {
          title: p.name, sub: `${p.tracks.length} song${p.tracks.length === 1 ? "" : "s"}`, icon: "list",
          image: p.tracks[0] && p.tracks[0].thumbnail,
          attrs: `style="--i:${i}" data-action="open-playlist" data-pl="${esc(p.id)}"`,
          playAttrs: `data-action="play-playlist" data-pl="${esc(p.id)}"`
        })).join("")) : ""}`;
  }

  function searchView() {
    const st = app().search;
    const genres = ["Pop", "Hip-Hop", "Rock", "Lo-Fi", "R&B", "Jazz", "Electronic", "Classical", "Metal", "Latin", "Country", "Reggae"];

    if (!st.query.trim()) {
      const searches = store.state.searches;
      return `
        <div class="section-head"><div><h2>Search</h2><div class="sub">Find songs, artists and videos on YouTube</div></div></div>
        ${searches.length ? `
          <div class="section-head"><div><h2 style="font-size:16px">Recent searches</h2></div>
            <button class="text-btn" data-action="clear-searches">Clear recent searches</button></div>
          <div class="search-suggestions">
            ${searches.map((q) => `<span class="sugg" data-action="quick-search" data-query="${esc(q)}">
              <span data-icon="search"></span>${esc(q)}
              <button class="x" data-action="remove-search" data-query="${esc(q)}" title="Remove"><span data-icon="close"></span></button>
            </span>`).join("")}
          </div>` : ""}
        ${rowSection("Browse by genre",
          genres.map((g, i) => `
            <div class="genre-tile" style="--i:${i};background:hsl(${(i * 47) % 360} 42% 30%)"
                 data-action="quick-search" data-query="${esc(g)}">
              <strong>${esc(g)}</strong>
            </div>`).join(""))}`;
    }

    if (st.loading) {
      return `
        <div class="results-note">Searching for “${esc(st.query)}”…</div>
        <div class="h-scroll">
          ${Array.from({ length: 8 }).map((_, i) => `
            <div class="media-card" style="--i:${i};pointer-events:none">
              <div class="cover skeleton"></div>
              <div class="skeleton" style="height:13px;width:78%;margin-top:13px"></div>
              <div class="skeleton" style="height:11px;width:50%;margin-top:8px"></div>
            </div>`).join("")}
        </div>`;
    }

    if (st.error) {
      /* API down? still surface something playable from local storage */
      const s = store.state;
      const localCards = [
        s.liked.length ? { label: "Liked Songs", sub: s.liked.length + " songs", icon: "heart-filled", attrs: `data-nav="liked"` } : null,
        s.recent.length ? { label: "Recently Played", sub: s.recent.length + " songs", icon: "clock", attrs: `data-nav="recent"` } : null
      ].concat(s.playlists.map((p) => ({
        label: p.name, sub: p.tracks.length + " songs", icon: "list",
        attrs: `data-action="open-playlist" data-pl="${esc(p.id)}"`
      }))).filter(Boolean).slice(0, 8);

      return `
        <div class="empty-state">
          <div class="big-ico" data-icon="warn"></div>
          <h3>Something went wrong</h3>
          <p>${esc(st.error)}</p>
          <div class="hero-actions">
            <button class="btn-green" data-action="retry-search"><span data-icon="search"></span> Try again</button>
            <button class="btn-ghost" data-action="settings"><span data-icon="gear"></span> Settings</button>
          </div>
        </div>
        ${localCards.length ? `
          <section class="row-section">
            <div class="row-section-head"><h2>Your library</h2><span class="sub">Available offline</span></div>
            <div class="h-scroll">
              ${localCards.map((c, i) => `
                <div class="media-card" style="--i:${i}" ${c.attrs}>
                  <div class="cover cover--icon"><span data-icon="${c.icon}"></span></div>
                  <h4>${esc(c.label)}</h4><p>${esc(c.sub)}</p>
                </div>`).join("")}
            </div>
          </section>` : ""}`;
    }

    const tracks = st.tracks;
    if (!tracks.length) {
      return `
        <div class="results-note">No results for “${esc(st.query)}”</div>
        <div class="empty-state">
          <div class="big-ico" data-icon="search"></div>
          <h3>No matches found</h3>
          <p>Make sure your words are spelled correctly, or try different keywords. You can also switch off “Music videos only” in Settings.</p>
        </div>`;
    }

    const f = st.filter;
    const filters = [
      ["All", "search"], ["Tracks", "music"], ["Artists", "user"], ["Playlists", "list"]
    ];

    /* unique artists from the results */
    const artistMap = new Map();
    tracks.forEach((t) => {
      if (!artistMap.has(t.channelId)) {
        artistMap.set(t.channelId, { name: t.artist, channelId: t.channelId, thumb: t.thumbnail });
      }
    });
    const artists = [...artistMap.values()];

    /* playlists section: matching local playlists + generated artist mixes */
    const qNorm = st.query.toLowerCase();
    const localPls = store.state.playlists.filter((p) => p.name.toLowerCase().includes(qNorm));
    const mixes = artists.slice(0, 6);
    const playlistCards = [
      ...localPls.map((p, i) => mediaCard({}, {
        title: p.name, sub: `Playlist · ${p.tracks.length} song${p.tracks.length === 1 ? "" : "s"}`, icon: "list",
        image: p.tracks[0] && p.tracks[0].thumbnail,
        attrs: `style="--i:${i}" data-action="open-playlist" data-pl="${esc(p.id)}"`,
        playAttrs: `data-action="play-playlist" data-pl="${esc(p.id)}"`
      })),
      ...mixes.map((a, i) => mediaCard({}, {
        title: `${a.name} Mix`, sub: "Playlist · YouTube", icon: "disc",
        attrs: `style="--i:${i + localPls.length}" data-action="quick-search" data-query="${esc(a.name + " mix")}"`,
        playAttrs: `data-action="quick-search-play" data-query="${esc(a.name + " mix")}"`
      }))
    ].join("");

    return `
      <div class="section-head" style="margin-top:6px">
        <div><h2>Results for “${esc(st.query)}”</h2><div class="sub">${tracks.length} video${tracks.length === 1 ? "" : "s"} found${st.more ? " · scroll for more" : ""}</div></div>
        ${tracks.length ? `<button class="text-btn" data-action="play-context" data-ctx="search">Play all</button>` : ""}
      </div>
      <div class="filter-chips">
        ${filters.map(([name, ico]) => `<button class="chip ${f === name ? "active" : ""}" data-action="search-filter" data-filter="${name}"><span data-icon="${ico}"></span>${name}</button>`).join("")}
      </div>
      ${(f === "All" || f === "Tracks") ? rowSection("Tracks", tracks.map((t, i) => trackCard(t, i, "search")).join("")) : ""}
      ${(f === "All" || f === "Artists") ? rowSection("Artists",
        artists.slice(0, 10).map((a, i) => mediaCard({}, {
          title: a.name, sub: "Artist · YouTube", round: true, image: a.thumb, icon: "user",
          attrs: `style="--i:${i}" data-action="go-artist" data-artist="${esc(a.name)}" data-channel="${esc(a.channelId)}"`
        })).join("")) : ""}
      ${(f === "All" || f === "Playlists") ? rowSection("Playlists", playlistCards) : ""}
      ${st.more && (f === "All" || f === "Tracks") ? `<div class="loading-wrap"><div class="spinner"></div></div>` : ""}`;
  }

  function listView(title, tracks, opts) {
    opts = opts || {};
    return `
      <div class="list-hero">
        <div class="lh-art ${opts.round ? "round" : ""}" style="${opts.image ? `background-image:url('${esc(opts.image)}');background-size:cover` : ""}">
          ${opts.image ? "" : `<span data-icon="${opts.icon || "music"}"></span>`}
        </div>
        <div>
          <small>${esc(opts.kind || "Playlist")}</small>
          <h1>${esc(title)}</h1>
          <div class="lh-sub">${opts.sub || ""}</div>
          <div class="lh-actions list-actions">
            ${tracks.length ? `<button class="play-btn" data-action="play-context" data-ctx="${esc(opts.ctx)}" title="Play"><span data-icon="play"></span></button>` : ""}
            <button class="icon-btn lg" data-action="shuffle-context" data-ctx="${esc(opts.ctx)}" title="Shuffle"><span data-icon="shuffle"></span></button>
            ${opts.actions || ""}
          </div>
        </div>
      </div>
      ${trackList(tracks, { ctx: opts.ctx, playlistId: opts.playlistId, emptyText: opts.emptyText })}`;
  }

  function likedView() {
    const tracks = store.state.liked;
    return listView("Liked Songs", tracks, {
      kind: "Playlist",
      icon: "heart-filled",
      ctx: "liked",
      sub: `<b>${tracks.length}</b> song${tracks.length === 1 ? "" : "s"}`,
      emptyText: "Tap the heart on any song to save it here."
    });
  }

  function recentView() {
    const tracks = store.state.recent;
    return listView("Recently Played", tracks, {
      kind: "Collection",
      icon: "clock",
      ctx: "recent",
      sub: `<b>${tracks.length}</b> song${tracks.length === 1 ? "" : "s"} · your listening history on this device`,
      emptyText: "Songs you play will show up here."
    });
  }

  function playlistView(id) {
    const pl = store.playlist(id);
    if (!pl) {
      return `<div class="empty-state"><div class="big-ico" data-icon="list"></div><h3>Playlist not found</h3>
        <p>It may have been deleted.</p><button class="btn-green" data-nav="library">Back to Your Library</button></div>`;
    }
    const image = pl.tracks[0] && pl.tracks[0].thumbnail;
    return listView(pl.name, pl.tracks, {
      kind: "Playlist",
      icon: "list",
      image,
      ctx: "playlist:" + pl.id,
      playlistId: pl.id,
      sub: `<b>${store.state.playlists.find((p) => p.id === pl.id).tracks.length}</b> song${pl.tracks.length === 1 ? "" : "s"} · created ${ago(new Date(pl.createdAt).toISOString())}`,
      actions: `
        <button class="icon-btn lg" data-action="edit-playlist" data-pl="${esc(pl.id)}" title="Rename"><span data-icon="edit"></span></button>
        <button class="icon-btn lg" data-action="delete-playlist" data-pl="${esc(pl.id)}" title="Delete"><span data-icon="trash"></span></button>`,
      emptyText: "Open a song's ⋯ menu and choose “Add to playlist…”."
    });
  }

  function artistView() {
    const d = app().artist;
    if (d.loading) {
      return `<div class="loading-wrap"><div class="spinner"></div></div>`;
    }
    if (d.error) {
      return `<div class="empty-state"><div class="big-ico" data-icon="close"></div><h3>Couldn't load artist</h3><p>${esc(d.error)}</p></div>`;
    }
    const ch = d.channel;
    const tracks = d.tracks;
    const cleanName = (ch ? ch.title : app().route.artist || "")
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/\s*VEVO$/i, "")
      .trim() || (ch ? ch.title : app().route.artist);
    return `
      <div class="artist-hero">
        ${ch && ch.thumbnail ? `<img src="${esc(ch.thumbnail)}" alt="" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">` : `<img src="${esc(tracks[0] ? tracks[0].thumbnail : "")}" alt="" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">`}
        <div class="ah-meta">
          <small>Verified artist</small>
          <h1>${esc(cleanName)}</h1>
          <p>${ch && ch.subscribers ? fmtNum(ch.subscribers) + " subscribers" : ""} · ${tracks.length} video${tracks.length === 1 ? "" : "s"} on YouTube</p>
        </div>
      </div>
      <div class="lh-actions list-actions" style="margin:6px 0 20px">
        ${tracks.length ? `<button class="play-btn" data-action="play-context" data-ctx="artist" title="Play"><span data-icon="play"></span></button>` : ""}
        <button class="icon-btn lg" data-action="shuffle-context" data-ctx="artist" title="Shuffle"><span data-icon="shuffle"></span></button>
        <a class="btn-ghost" style="height:40px;font-size:13.5px" href="https://www.youtube.com/channel/${esc(app().route.channelId)}" target="_blank" rel="noopener">
          <span data-icon="external"></span> View on YouTube
        </a>
      </div>
      ${trackList(tracks, { ctx: "artist" })}`;
  }

  function libraryView() {
    const s = store.state;
    return `
      <div class="section-head" style="margin-top:6px">
        <div><h2>Your Library</h2><div class="sub">Everything saved on this device</div></div>
        <button class="text-btn" data-action="new-playlist">+ New playlist</button>
      </div>
      <div class="card-grid">
        <div class="media-card" data-nav="liked" style="--i:0">
          <span class="cover" style="background:#6d4bd6;color:#fff"><span data-icon="heart-filled"></span>
            <button class="card-badge" data-action="play-context" data-ctx="liked" title="Play"><span data-icon="play"></span></button>
          </span>
          <h4>Liked Songs</h4><p>${s.liked.length} song${s.liked.length === 1 ? "" : "s"}</p>
        </div>
        <div class="media-card" data-nav="recent" style="--i:1">
          <span class="cover" style="background:#2f3140;color:#fff"><span data-icon="clock"></span>
            <button class="card-badge" data-action="play-context" data-ctx="recent" title="Play"><span data-icon="play"></span></button>
          </span>
          <h4>Recently Played</h4><p>${s.recent.length} song${s.recent.length === 1 ? "" : "s"}</p>
        </div>
        ${s.playlists.map((p, i) => mediaCard({}, {
          title: p.name, sub: `${p.tracks.length} song${p.tracks.length === 1 ? "" : "s"}`,
          image: p.tracks[0] && p.tracks[0].thumbnail, icon: "list",
          attrs: `style="--i:${i + 2}" data-action="open-playlist" data-pl="${esc(p.id)}"`,
          playAttrs: `data-action="play-playlist" data-pl="${esc(p.id)}"`
        })).join("")}
        <div class="media-card" data-action="new-playlist" style="--i:${s.playlists.length + 2}">
          <span class="cover" style="background:#161618;color:var(--muted)"><span data-icon="plus"></span></span>
          <h4>Create playlist</h4><p>Start something new</p>
        </div>
      </div>`;
  }

  function renderView() {
    const view = document.getElementById("view");
    const r = app().route;
    let html = "";
    switch (r.name) {
      case "home": html = homeView(); break;
      case "search": html = searchView(); break;
      case "liked": html = likedView(); break;
      case "recent": html = recentView(); break;
      case "playlist": html = playlistView(r.id); break;
      case "artist": html = artistView(); break;
      case "library": html = libraryView(); break;
      default: html = homeView();
    }

    const st = app().search;
    const key = r.name === "search"
      ? "search:" + app().search.query + ":" + (st.loading ? "loading" : st.error ? "error" : st.tracks.length ? "done" : "empty")
      : r.name === "artist"
        ? "artist:" + (r.channelId || r.artist || "") + ":" + (app().artist && app().artist.loading ? "loading" : "done")
        : r.name + ":" + (r.id || r.channelId || "");
    const routeChanged = key !== app()._lastViewKey;

    view.classList.remove("view-enter");
    view.innerHTML = html;
    if (routeChanged) {
      void view.offsetWidth; /* restart animations */
      view.classList.add("view-enter");
      view.scrollTop = 0;
      app()._lastViewKey = key;
    }
    paintIcons(view);

    /* active rail button */
    document.querySelectorAll(".rail-btn[data-nav]").forEach((el) => {
      el.classList.toggle("active",
        el.dataset.nav === r.name ||
        (r.name === "playlist" && el.dataset.nav === "library") ||
        (r.name === "artist" && el.dataset.nav === "search"));
    });

    document.getElementById("search-box").hidden = r.name !== "search";
  }

  function panelOpen() {
    return document.body.classList.contains("panel-open");
  }

  /* lightweight refresh of playing/liked states without rebuilding the view */
  function updateRowStates() {
    const cur = player.current;
    document.querySelectorAll("#view .row").forEach((row) => {
      const isCur = !!(cur && row.dataset.id === cur.id);
      row.classList.toggle("current", isCur);
      row.classList.toggle("playing", isCur && player.playing);
      const icon = row.querySelector(".row-play [data-icon]");
      if (icon) {
        const name = isCur && player.playing ? "pause" : "play";
        if (icon.getAttribute("data-icon") !== name) {
          icon.setAttribute("data-icon", name);
          paintIcons(row);
        }
      }
    });
    document.querySelectorAll("#view .media-card[data-id]").forEach((card) => {
      card.classList.toggle("is-current", !!(cur && card.dataset.id === cur.id));
    });
    updateRowLikeStates();
  }

  function updateRowLikeStates() {
    document.querySelectorAll("#view .row-like[data-id]").forEach((b) => {
      const liked = store.isLiked(b.dataset.id);
      b.classList.toggle("on", liked);
      b.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
      const name = liked ? "heart-filled" : "heart";
      if (b.getAttribute("data-icon-owner") !== name) {
        const span = b.querySelector("[data-icon]") || b;
        span.setAttribute("data-icon", name);
        b.setAttribute("data-icon-owner", name);
        paintIcons(b);
      }
    });
  }

  /* like toggles update in place, no full re-render, no flicker */
  function refreshLikes() {
    updateRowLikeStates();
    renderPlayer();
    if (app().route.name === "liked") renderView(); /* membership of the list changed */
  }

  /* ================================================================== */
  /* player bar / now playing                                           */
  /* ================================================================== */
  function setRangeFill(input, pct) {
    input.style.setProperty("--fill", Math.max(0, Math.min(100, pct)) + "%");
  }

  function renderPlayer() {
    const t = player.current;
    const liked = t ? store.isLiked(t.id) : false;

    const img = document.getElementById("np-cover-img");
    const empty = document.querySelector(".np-cover-empty");
    if (t) {
      img.src = t.thumbnail || "";
      img.hidden = !t.thumbnail;
      if (empty) empty.style.display = t.thumbnail ? "none" : "grid";
      document.getElementById("np-title").textContent = t.title;
      document.getElementById("np-artist").textContent = t.artist;
      document.getElementById("np-source").textContent = "Playing from YouTube · " + t.channelTitle;
      const link = document.getElementById("np-yt-link");
      link.href = "https://www.youtube.com/watch?v=" + t.id;
    } else {
      img.hidden = true;
      if (empty) empty.style.display = "grid";
      document.getElementById("np-title").textContent = "Nothing playing";
      document.getElementById("np-artist").textContent = "Pick a song to start";
      document.getElementById("np-source").textContent = "Now playing";
    }

    ["np-like", "np-like-big"].forEach((id) => {
      const b = document.getElementById(id);
      if (!b) return;
      b.classList.toggle("on", liked);
      b.innerHTML = svg(liked ? "heart-filled" : "heart");
      b.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
    });

    const playIcon = player.playing ? "pause" : "play";
    ["btn-play", "btn-play-big"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) { b.innerHTML = svg(playIcon); b.title = player.playing ? "Pause" : "Play"; }
    });

    const shuf = player.shuffle;
    ["btn-shuffle", "btn-shuffle-big"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle("on", shuf);
    });
    const rep = player.repeat;
    ["btn-repeat", "btn-repeat-big"].forEach((id) => {
      const b = document.getElementById(id);
      if (!b) return;
      b.classList.toggle("on", rep !== "off");
      b.innerHTML = svg(rep === "one" ? "repeat-one" : "repeat");
      b.title = rep === "off" ? "Repeat off" : rep === "all" ? "Repeat queue" : "Repeat one";
    });

    document.body.classList.toggle("is-paused", !player.playing);

    // now-playing overlay
    const artImg = document.getElementById("np-art-img");
    const ambient = document.getElementById("np-ambient");
    if (t) {
      document.getElementById("np-detail-title").textContent = t.title;
      document.getElementById("np-detail-artist").textContent = t.artist;
      document.getElementById("np-detail-stats").textContent =
        `${t.channelTitle}${t.publishedAt ? " · " + ago(t.publishedAt) : ""}${player.duration ? " · " + fmtTime(player.duration) : ""}`;
      const big = t.highThumb || t.thumbnail || "";
      artImg.src = big;
      artImg.hidden = !big;
      if (big) {
        ambient.style.backgroundImage = `url("${big}")`;
        // try to upgrade to maxres artwork
        const probe = new Image();
        probe.onload = () => { artImg.src = probe.src; };
        probe.src = `https://i.ytimg.com/vi/${t.id}/maxresdefault.jpg`;
      } else {
        ambient.style.backgroundImage = "";
      }
    } else {
      artImg.hidden = true;
      document.getElementById("np-detail-title").textContent = "Nothing playing";
      document.getElementById("np-detail-artist").textContent = "";
      document.getElementById("np-detail-stats").textContent = "";
      ambient.style.backgroundImage = "";
    }

    renderVolume();
    renderTime();
  }

  function renderVolume() {
    const vol = document.getElementById("volume");
    const muted = store.state.settings.muted;
    const v = muted ? 0 : store.state.settings.volume;
    vol.value = v;
    setRangeFill(vol, v);
    const btn = document.getElementById("btn-vol");
    btn.innerHTML = svg(v === 0 ? "volume-mute" : "volume");
    btn.title = v === 0 ? "Unmute" : "Mute";
  }

  function renderTime() {
    const pct = player.duration ? (player.position / player.duration) * 100 : 0;
    ["seek", "seek-big"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!player._isSeeking()) {
        el.value = player.duration ? Math.round((player.position / player.duration) * 1000) : 0;
      }
      setRangeFill(el, player._isSeeking() ? el.value / 10 : pct);
    });
    document.getElementById("time-cur").textContent = fmtTime(player.position);
    document.getElementById("time-dur").textContent = player.duration ? fmtTime(player.duration) : "0:00";
    document.getElementById("time-cur-big").textContent = fmtTime(player.position);
    document.getElementById("time-dur-big").textContent = player.duration ? fmtTime(player.duration) : "0:00";
    highlightLyrics(player.position);
  }

  /* ================================================================== */
  /* queue drawer                                                       */
  /* ================================================================== */
  function renderQueue() {
    const body = document.getElementById("queue-body");
    const cur = player.current;
    const upcoming = player.queue.filter((_, i) => i !== player.index);

    if (!player.queue.length) {
      body.innerHTML = `<div class="empty-state" style="padding:40px 10px"><div class="big-ico" data-icon="queue"></div>
        <h3>Your queue is empty</h3><p>Search for songs, then use “Add to queue” to line them up.</p></div>`;
      paintIcons(body);
      return;
    }

    body.innerHTML = `
      ${cur ? `<div class="queue-label">Now playing</div>${queueRow(cur, player.index, true)}` : ""}
      ${upcoming.length ? `<div class="queue-label">Next up</div>` : ""}
      ${player.queue.map((t, i) => (i === player.index ? "" : queueRow(t, i, false))).join("")}
      ${!upcoming.length ? `<div class="lyrics-empty">End of queue: ${player.repeat === "all" ? "repeat queue is on" : "turn on repeat to loop"}</div>` : ""}`;
    paintIcons(body);
  }

  function queueRow(t, i, isCurrent) {
    return `
      <div class="q-row ${isCurrent ? "current" : ""}" style="--i:${i}" data-action="play-queue" data-index="${i}">
        ${t.thumbnail ? `<img src="${esc(t.thumbnail)}" alt="" loading="lazy" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">` : `<span class="pl-art" data-icon="music" style="width:40px;height:40px"></span>`}
        <div class="q-meta">
          <div class="q-title">${esc(t.title)}</div>
          <div class="q-sub">${esc(t.artist)}</div>
        </div>
        <div class="q-actions">
          ${isCurrent ? "" : `<button class="icon-btn sm" data-action="queue-up" data-index="${i}" title="Move up"><span data-icon="chevron-left" style="transform:rotate(90deg)"></span></button>`}
          ${isCurrent ? `<span class="eq-bars" style="display:flex;padding:0 8px"><i></i><i></i><i></i><i></i></span>`
                      : `<button class="icon-btn sm" data-action="queue-remove" data-index="${i}" title="Remove"><span data-icon="close"></span></button>`}
        </div>
      </div>`;
  }

  /* ================================================================== */
  /* right bar: lyrics + related                                        */
  /* ================================================================== */
  const lyricsCache = new Map();
  let relatedCache = { id: null, loading: false, items: null, error: null };
  let currentLyrics = null;

  function renderRightbar() {
    const tab = store.state.settings.rightbarTab;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    tab === "lyrics" ? renderLyricsPanel() : renderRelatedPanel();
  }

  function renderLyricsPanel() {
    const body = document.getElementById("rightbar-body");
    const t = player.current;
    if (!t) {
      body.innerHTML = `<div class="lyrics-empty">No song selected.<br>Play something to see its lyrics here.</div>`;
      return;
    }
    const cached = lyricsCache.get(t.id);
    if (cached === undefined) {
      body.innerHTML = `<div class="lyrics-empty"><div class="spinner"></div><div style="margin-top:14px">Fetching lyrics…</div></div>`;
      api.lyrics(t).then((res) => {
        lyricsCache.set(t.id, res);
        if (player.current && player.current.id === t.id && store.state.settings.rightbarTab === "lyrics") {
          currentLyrics = res;
          renderLyricsPanel();
        }
      }).catch(() => {
        lyricsCache.set(t.id, null);
        if (player.current && player.current.id === t.id) renderLyricsPanel();
      });
      return;
    }
    currentLyrics = cached;
    if (!cached) {
      body.innerHTML = `<div class="lyrics-empty"><b style="color:#fff">No lyrics found</b><br>
        for “${esc(t.title)}” by ${esc(t.artist)}.<br><br>
        <span style="font-size:12px">Lyrics provided by LRCLIB</span></div>`;
      return;
    }

    const hasSynced = cached.synced && cached.synced.length;
    body.innerHTML = `
      <div class="lyrics-card ${hasSynced ? "" : "plain"}">
        <h4>${esc(cached.trackName || t.title)}</h4>
        ${hasSynced
          ? cached.synced.map((l, i) => {
              /* split into word spans so we can highlight up to the current word */
              const words = String(l.text || "")
                .split(/(\s+)/)
                .map((part) => (/^\s+$/.test(part) ? part : part ? `<span class="w">${esc(part)}</span>` : ""))
                .join("");
              return `<div class="lyrics-line" data-lr="${l.t}" data-i="${i}">${words || "&nbsp;"}</div>`;
            }).join("")
          : `<div class="lyrics-line" style="white-space:pre-wrap;font-weight:500;font-size:15px">${esc(cached.plain)}</div>`}
        <div class="lyrics-credit">Source: ${esc(cached.source)}${hasSynced ? " · click a line to jump" : ""}</div>
      </div>`;

    body.querySelectorAll("[data-lr]").forEach((line) => {
      line.addEventListener("click", () => player.seekTo(parseFloat(line.dataset.lr)));
    });
    resetLyricsMark();
    highlightLyrics(player.position);
  }

  /* karaoke state: which line is active, which word we're on */
  let _lyricActive = -1;
  let _lyricEl = null;
  function resetLyricsMark() {
    _lyricActive = -1;
    _lyricEl = null;
  }

  function highlightLyrics(pos) {
    if (!currentLyrics || !currentLyrics.synced || !currentLyrics.synced.length) return;
    const lines = document.querySelectorAll("#rightbar-body .lyrics-line");
    if (!lines.length) return;
    const synced = currentLyrics.synced;

    let active = -1;
    for (let i = 0; i < synced.length; i++) {
      if (pos >= synced[i].t - 0.15) active = i;
      else break;
    }

    if (active !== _lyricActive) {
      lines.forEach((el, i) => {
        el.classList.toggle("active", i === active);
        el.classList.toggle("near-prev", i === active - 1);
        el.classList.toggle("far-prev", i < active - 1);
        el.classList.toggle("near-next", i === active + 1);
      });
      if (_lyricEl) _lyricEl.querySelectorAll(".w.on").forEach((w) => w.classList.remove("on"));
      _lyricActive = active;
      _lyricEl = active >= 0 ? lines[active] : null;

      /* smooth-scroll the new line into the middle */
      if (active >= 0 && panelOpen() && store.state.settings.rightbarTab === "lyrics") {
        const el = lines[active];
        const box = document.getElementById("rightbar-body");
        const target = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
        if (Math.abs(box.scrollTop - target) > 30) {
          if (box.scrollTo) box.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
          else box.scrollTop = Math.max(0, target);
        }
      }
    }

    /* word-by-word highlight inside the active line */
    if (active >= 0 && _lyricEl) {
      const words = _lyricEl.querySelectorAll(".w");
      if (words.length) {
        const start = synced[active].t;
        const end = active + 1 < synced.length
          ? synced[active + 1].t
          : start + Math.max(2.5, String(synced[active].text || "").length * 0.32);
        const p = Math.max(0, Math.min(1, (pos - start) / Math.max(0.4, end - start)));
        const wordIdx = Math.floor(p * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < wordIdx));
      }
    }
  }

  function renderRelatedPanel() {
    const body = document.getElementById("rightbar-body");
    const t = player.current;
    if (!t) {
      body.innerHTML = `<div class="lyrics-empty">Play a song to discover related tracks.</div>`;
      return;
    }
    if (relatedCache.id !== t.id) relatedCache = { id: t.id, loading: true, items: null, error: null };

    if (relatedCache.loading) {
      body.innerHTML = `<div class="lyrics-empty"><div class="spinner"></div><div style="margin-top:14px">Finding related songs…</div></div>`;
      api.related(t).then((items) => {
        relatedCache = { id: t.id, loading: false, items, error: null };
        if (player.current && player.current.id === t.id && store.state.settings.rightbarTab === "related") renderRelatedPanel();
      }).catch((e) => {
        relatedCache = { id: t.id, loading: false, items: null, error: e.message };
        if (player.current && player.current.id === t.id) renderRelatedPanel();
      });
      return;
    }
    if (relatedCache.error) {
      body.innerHTML = `<div class="lyrics-empty">${esc(relatedCache.error)}</div>`;
      return;
    }
    const items = relatedCache.items || [];
    if (!items.length) {
      body.innerHTML = `<div class="lyrics-empty">No related songs found.</div>`;
      return;
    }
    body.innerHTML = `
      <div class="rel-group-title">More like this</div>
      ${items.map((r, i) => `
        <div class="rel-card" style="--i:${i}" data-action="play-related" data-index="${i}">
          ${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="" loading="lazy" onerror="window.TF&&TF.ui&&TF.ui.imgFail(this)">` : `<span class="pl-art" data-icon="music" style="width:44px;height:44px"></span>`}
          <div class="rc-text"><div class="rc-title">${esc(r.title)}</div><div class="rc-sub">${esc(r.artist)}</div></div>
          <div class="rc-dur">${r.duration ? fmtTime(r.duration) : ""}</div>
        </div>`).join("")}`;
    paintIcons(body);
  }

  /* ================================================================== */
  /* misc                                                               */
  /* ================================================================== */
  function rerender() {
    renderView();
    renderPlayer();
    renderQueue();
    if (panelOpen()) renderRightbar();
    else resetLyricsMark();
  }

  TF.ui = {
    svg, paintIcons, esc, fmtTime, fmtNum, ago, toast,
    openModal, closeModal, modalOpen, modals,
    openCtxMenu, closeCtxMenu, trackMenuItems,
    trackList, trackRow,
    renderView, renderPlayer, renderQueue, renderRightbar, renderTime, renderVolume,
    updateRowStates, refreshLikes, panelOpen,
    rerender,
    imgFail, npFail,
    getRelatedCache: () => relatedCache,
    resetLyricsCache: () => { currentLyrics = null; resetLyricsMark(); }
  };
})();
