/* Veloura: YouTube IFrame playback engine + queue */
(function () {
  const TF = (window.TF = window.TF || {});

  const listeners = {};
  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  }

  let yt = null;               // YT.Player instance
  let apiReady = null;         // Promise resolved when the IFrame API is loaded
  let duration = 0;
  let seeking = false;         // true while the user drags the seek bar
  let failCount = 0;
  let loadToken = 0;

  const player = {
    queue: [],
    index: -1,
    current: null,
    playing: false,
    buffering: false,
    position: 0,
    duration: 0,
    shuffle: TF.store.state.settings.shuffle,
    repeat: TF.store.state.settings.repeat, // off | all | one

    /* ---------------- events ---------------- */
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    emit,

    /* ---------------- engine bootstrap ---------------- */
    init() {
      if (apiReady) return apiReady;
      apiReady = new Promise((resolve, reject) => {
        if (window.YT && window.YT.Player) return resolve();
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
          if (typeof prev === "function") prev();
          resolve();
        };
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.onerror = () => reject(new Error("Could not load the YouTube player script."));
        document.head.appendChild(s);
      }).then(() => createPlayer());
      return apiReady;
    },

    /* ---------------- queue management ---------------- */
    setQueue(tracks, startIndex, opts) {
      opts = opts || {};
      this.queue = tracks.slice();
      this.index = Math.max(0, Math.min(startIndex || 0, this.queue.length - 1));
      failCount = 0; // a fresh context starts with a clean failure budget
      if (this.shuffle && this.queue.length > 1) this.shuffleFrom(this.index);
      if (opts.play !== false) this.playAt(this.index);
      else {
        this.current = this.queue[this.index] || null;
        persist();
        emit("queue");
        emit("track");
      }
    },

    enqueue(track, opts) {
      opts = opts || {};
      if (!this.queue.length) {
        this.setQueue([track], 0, { play: opts.play !== false });
        return;
      }
      if (opts.next) {
        this.queue.splice(this.index + 1, 0, track);
      } else {
        this.queue.push(track);
      }
      persist();
      emit("queue");
    },

    removeQueueAt(i) {
      if (i < 0 || i >= this.queue.length) return;
      this.queue.splice(i, 1);
      if (i < this.index) this.index -= 1;
      else if (i === this.index) {
        this.index = Math.min(this.index, this.queue.length - 1);
        if (this.queue[this.index]) this.playAt(this.index, { play: this.playing });
      }
      persist();
      emit("queue");
    },

    moveQueue(from, to) {
      if (from === to || from < 0 || to < 0 || from >= this.queue.length || to >= this.queue.length) return;
      const [item] = this.queue.splice(from, 1);
      this.queue.splice(to, 0, item);
      if (from === this.index) this.index = to;
      else if (from < this.index && to >= this.index) this.index -= 1;
      else if (from > this.index && to <= this.index) this.index += 1;
      persist();
      emit("queue");
    },

    clearQueue() {
      this.queue = this.current ? [this.current] : [];
      this.index = this.current ? 0 : -1;
      persist();
      emit("queue");
    },

    /* ---------------- playback ---------------- */
    playAt(i, opts) {
      opts = opts || {};
      if (!this.queue.length) return;
      i = Math.max(0, Math.min(i, this.queue.length - 1));
      this.index = i;
      const track = this.queue[i];
      this.current = track;
      this.position = 0;
      this.duration = track.duration || 0;
      // NOTE: failCount is intentionally NOT reset here - auto-skips from onError
      // go through playAt, and resetting made the "repeated failures" guard dead.
      // It resets when a track actually reaches PLAYING, or on a fresh setQueue.
      emit("queue");
      emit("track");
      persist();

      if (!yt) {
        // engine not created yet (no user gesture / still loading)
        player.init().then(() => loadVideo(track, opts)).catch((e) => emit("error", e.message));
        return;
      }
      loadVideo(track, opts);
    },

    playContext(tracks, startIndex, opts) {
      this.setQueue(tracks, startIndex, opts);
    },

    toggle() {
      if (!this.current) {
        // nothing loaded: start the first available thing
        if (this.queue.length) this.playAt(this.index >= 0 ? this.index : 0);
        return;
      }
      if (this.playing) this.pause();
      else this.play();
    },

    play() {
      if (!yt || !this._ready) {
        if (this.current) player.init().then(() => { if (this._ready) loadVideo(this.current, {}); }).catch((e) => emit("error", e.message));
        return;
      }
      if (this.index < 0 && this.queue.length) this.index = 0;
      let vid = null;
      try { vid = yt.getVideoData && yt.getVideoData(); } catch (e) { vid = null; }
      if (!vid || !vid.video_id) {
        if (this.current) loadVideo(this.current, {});
        return;
      }
      yt.playVideo();
    },

    pause() {
      if (yt) yt.pauseVideo();
    },

    next(auto) {
      if (!this.queue.length) return;
      if (auto && this.repeat === "one") {
        yt && yt.seekTo(0, true);
        yt && yt.playVideo();
        return;
      }
      let nextIndex = this.index + 1;
      if (nextIndex >= this.queue.length) {
        if (auto && this.repeat !== "all") {
          // end of queue, stop like Spotify does
          this.pause();
          emit("state");
          return;
        }
        nextIndex = 0;
      }
      this.playAt(nextIndex);
    },

    prev() {
      if (!this.queue.length) return;
      if (this.position > 3 || this.index === 0) {
        this.seekTo(0);
        if (!this.playing) this.play();
        return;
      }
      this.playAt(this.index - 1);
    },

    seekTo(sec) {
      if (yt && yt.seekTo) yt.seekTo(Math.max(0, sec), true);
      this.position = Math.max(0, sec);
      emit("time");
    },

    seekBy(delta) {
      this.seekTo(Math.max(0, Math.min(this.duration || 0, this.position + delta)));
    },

    setVolume(v) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      TF.store.saveSettings({ volume: v });
      if (yt && yt.setVolume) yt.setVolume(v);
      if (v > 0 && TF.store.state.settings.muted) {
        TF.store.saveSettings({ muted: false });
        if (yt && yt.unMute) yt.unMute();
      }
      emit("volume");
    },

    toggleMute() {
      const muted = !TF.store.state.settings.muted;
      TF.store.saveSettings({ muted });
      if (yt) muted ? yt.mute() : yt.unMute();
      emit("volume");
    },

    toggleShuffle() {
      this.shuffle = !this.shuffle;
      TF.store.saveSettings({ shuffle: this.shuffle });
      if (this.shuffle && this.queue.length > 1) this.shuffleFrom(this.index);
      else if (!this.shuffle && this._base) {
        // restore the original order
        this.queue = this._base.slice();
        this._base = null;
        const cur = this.current;
        const i = cur ? this.queue.findIndex((t) => t.id === cur.id) : -1;
        if (i >= 0) this.index = i;
      }
      persist();
      emit("queue");
      emit("state");
    },

    shuffleFrom(i) {
      this._base = this._base || this.queue.slice();
      const rest = this.queue.filter((_, idx) => idx !== i);
      for (let k = rest.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [rest[k], rest[j]] = [rest[j], rest[k]];
      }
      const head = this.queue[i] ? [this.queue[i]] : [];
      this.queue = head.concat(rest);
      this.index = 0;
    },

    cycleRepeat() {
      const order = ["off", "all", "one"];
      this.repeat = order[(order.indexOf(this.repeat) + 1) % order.length];
      TF.store.saveSettings({ repeat: this.repeat });
      emit("state");
    },

    /* ---------------- internals ---------------- */
    _setSeeking(v) { seeking = v; },
    _isSeeking() { return seeking; }
  };

  /* ------------------------------------------------------------------ */

  function persist() {
    TF.store.saveSession(player.current, player.queue, player.index);
  }

  function loadVideo(track, opts) {
    const token = ++loadToken;
    if (!yt || !track) return;
    player.buffering = true;
    emit("state");
    if (opts && opts.play === false) yt.cueVideoById(track.id);
    else yt.loadVideoById(track.id);
    if (TF.store.state.settings.muted) yt.mute();
    else yt.unMute();
    yt.setVolume(TF.store.state.settings.volume);
    // guard against a stale token triggering a spurious "still loading" state
    setTimeout(() => { if (token === loadToken) emit("time"); }, 1500);
  }

  function createPlayer() {
    return new Promise((resolve) => {
      const playerVars = {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        fs: 0
      };
      // only send origin when served over http(s); file:// has no usable origin
      if (location.protocol.startsWith("http")) playerVars.origin = location.origin;

      yt = new YT.Player("yt-player", {
        width: "200",
        height: "120",
        videoId: "",
        playerVars,
        events: {
          onReady: () => {
            try { yt.setVolume(TF.store.state.settings.volume); } catch (e) {}
            player._ready = true;
            startTicker();
            resolve(player);
            emit("ready");
          },
          onStateChange: (e) => {
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) {
              player.playing = true;
              player.buffering = false;
              failCount = 0;
              duration = yt.getDuration() || player.current?.duration || 0;
              player.duration = duration;
              if (player.current) TF.store.addRecent(player.current);
            } else if (e.data === S.PAUSED) {
              player.playing = false;
              player.buffering = false;
            } else if (e.data === S.ENDED) {
              player.playing = false;
              player.next(true);
            } else if (e.data === S.BUFFERING) {
              player.buffering = true;
            } else if (e.data === S.CUED) {
              player.buffering = false;
            }
            document.body.classList.toggle("is-paused", !player.playing);
            emit("state");
            emit("time");
          },
          onError: (e) => {
            const messages = {
              2: "The video ID is invalid.",
              5: "This video cannot be played in the embedded player.",
              100: "This video was removed or is private.",
              101: "The owner has disabled embedding for this video.",
              150: "The owner has disabled embedding for this video.",
              153: blockedReferrerMessage()
            };
            const msg = messages[e.data] ||
              (e.data == null ? "Playback failed." : "Playback failed (error " + e.data + ").");
            failCount += 1;
            // 153 is structural: no referrer can ever be sent from this context,
            // so every track would fail identically. Stop at once with one toast.
            if (e.data === 153) {
              player.playing = false;
              document.body.classList.add("is-paused");
              emit("state");
              emit("error", msg);
              return;
            }
            // a single-track queue has nothing to skip to: report plainly
            if (player.queue.length <= 1) {
              player.playing = false;
              document.body.classList.add("is-paused");
              emit("state");
              emit("error", msg);
              return;
            }
            if (failCount >= 3) {
              player.playing = false;
              document.body.classList.add("is-paused");
              emit("state");
              emit("error", msg + " Skipping is disabled after repeated failures.");
              return;
            }
            emit("error", msg + " Skipping to the next track…");
            setTimeout(() => player.next(true), 900);
          }
        }
      });
    });
  }

  /* YouTube error 153: the player request carried no referrer or client
     identification. A local file:// page can never send one (Chrome sends no
     file:// referrers at all), so say what actually helps instead of failing
     generically. */
  function blockedReferrerMessage() {
    let localFile = false;
    try { localFile = window.top.location.protocol === "file:"; } catch (err) { /* cross-origin top: unknown */ }
    return localFile
      ? "YouTube will not play from local files. Open this page through a local web server (for example http://localhost) and playback will work."
      : "YouTube blocked playback because this page sent no referrer. A privacy extension or strict referrer setting may be blocking it.";
  }

  function startTicker() {
    setInterval(() => {
      if (!yt || typeof yt.getCurrentTime !== "function") return;
      try {
        if (!player._isSeeking()) {
          player.position = yt.getCurrentTime() || 0;
          const d = yt.getDuration() || 0;
          if (d && d !== player.duration) player.duration = d;
        }
        emit("time");
      } catch (e) { /* player not ready yet */ }
    }, 250);
  }

  TF.player = player;
})();
