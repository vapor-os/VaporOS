/* Veloura: YouTube Data API v3 + LRCLIB lyrics client */
(function () {
  const TF = (window.TF = window.TF || {});
  const C = TF.CONFIG;

  /* ------------------------------------------------------------------ */
  /* API availability status                                             */
  /* ------------------------------------------------------------------ */

  /* { down: boolean, reason: string } mirrored to a window event so the
     shell can show / hide the degraded-mode banner.                     */
  const status = { down: false, reason: "" };

  function setStatus(down, reason) {
    const r = down ? String(reason || "request failed") : "";
    if (status.down === !!down && status.reason === r) return;
    status.down = !!down;
    status.reason = r;
    try {
      window.dispatchEvent(new CustomEvent("tf-api-status", { detail: { down: status.down, reason: status.reason } }));
    } catch (e) { /* CustomEvent unsupported */ }
  }

  /* 1-unit videos.list ping: cheapest way to test the key + endpoint */
  async function ping() {
    try {
      await yt("videos", { part: "id", id: "dQw4w9WgXcQ" }, { soft: true });
      setStatus(false, "");
      return true;
    } catch (e) {
      if (e && e.name === "ApiError" && e.status && e.status < 500 && e.status !== 403) {
        /* key/endpoint answered (even with an error body): API reachable */
        setStatus(false, "");
        return true;
      }
      setStatus(true, (e && e.message) || "request failed");
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  const ENTITIES = {
    "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'",
    "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&#x27;": "'", "&#x2F;": "/"
  };

  function unescapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
      .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&[a-z]+;/gi, (m) => ENTITIES[m] || m);
  }

  function isoToSeconds(iso) {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
    if (!m) return 0;
    return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
  }

  /* Noise suffixes common in YouTube music uploads */
  const NOISE = [
    /\((?:official\s*)?(?:music\s*)?video\)/gi,
    /\((?:official\s*)?audio\)/gi,
    /\((?:official\s*)?lyric(?:s)?\s*(?:video)?\)/gi,
    /\((?:official\s*)?visualizer\)/gi,
    /\[?(?:official\s*)?(?:music\s*)?video\]?/gi,
    /\[?(?:official\s*)?audio\]?/gi,
    /\((?:hq\s*)?audio\)/gi,
    /\((?:full\s*)?album\)/gi,
    /\(feat\.[^)]*\)/gi,
    /\(ft\.[^)]*\)/gi,
    /\((?:4k|1080p|hd)\)/gi,
    /\s[-\u2013\u2014]\s?topic$/gi
  ];

  function cleanText(s) {
    let out = unescapeHtml(s);
    NOISE.forEach((re) => (out = out.replace(re, "")));
    return out.replace(/\s{2,}/g, " ").trim();
  }

  /*
   * Turn a raw YouTube title + channel into { title, artist }.
   * Handles: "Artist - Song (Official Video)", "Song" w/ "Artist - Topic" channel, VEVO channels.
   */
  function parseMeta(rawTitle, channelTitle) {
    const raw = unescapeHtml(rawTitle || "");
    const channel = unescapeHtml(channelTitle || "");
    let artist = channel
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/\s*VEVO$/i, "")
      .trim();

    let title = raw;

    // "Artist - Song" pattern (dash may be a hyphen or a dash variant)
    const dash = raw.split(/\s+[-\u2013\u2014]\s+/);
    if (dash.length >= 2) {
      const maybeArtist = cleanText(dash[0]);
      const maybeTitle = cleanText(dash.slice(1).join(" - "));
      if (maybeArtist && maybeTitle) {
        // Prefer the title/channel split when the channel is a generic uploader
        if (!artist || /^artist$/i.test(artist)) artist = maybeArtist;
        else if (maybeArtist.split(/\s+/).length <= 4 && dash[0].length < 60) artist = maybeArtist;
        title = maybeTitle;
      }
    } else {
      title = cleanText(raw);
    }

    title = cleanText(title);
    if (!artist) artist = "Unknown artist";
    if (!title) title = raw;
    return { title, artist };
  }

  function mapSearchItem(item) {
    if (!item || !item.snippet || !item.id || item.id.kind !== "youtube#video" || !item.id.videoId) {
      return null;
    }
    const s = item.snippet;
    const th = s.thumbnails || {};
    const meta = parseMeta(s.title, s.channelTitle);
    return {
      id: item.id.videoId,
      title: meta.title,
      artist: meta.artist,
      rawTitle: unescapeHtml(s.title),
      channelId: s.channelId,
      channelTitle: unescapeHtml(s.channelTitle || ""),
      thumbnail: (th.medium || th.high || th.default || {}).url || "",
      highThumb: (th.high || th.medium || th.default || {}).url || "",
      publishedAt: s.publishedAt || "",
      duration: 0 // filled by getDurations()
    };
  }

  function ApiError(message, status, body) {
    const e = new Error(message);
    e.name = "ApiError";
    e.status = status;
    e.body = body;
    return e;
  }

  function friendlyError(status, body) {
    let reason = "";
    let msg = "";
    try {
      const err = body.error || {};
      msg = err.message || "";
      const d = (err.errors && err.errors[0]) || {};
      reason = d.reason || "";
    } catch (e) { /* not JSON */ }

    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded")
      return "YouTube API daily quota exceeded. Try again tomorrow or add your own key in Settings.";
    if (reason === "keyInvalid" || status === 400 && /api key/i.test(msg))
      return "The YouTube API key is invalid. Add a valid key in Settings.";
    if (reason === "ipRefererBlocked" || reason === "refererNotAllowed")
      return "This API key is restricted by HTTP referrer/IP. Remove that restriction in Google Cloud Console.";
    if (reason === "accessNotConfigured")
      return "YouTube Data API v3 is not enabled for this key's project. Enable it in Google Cloud Console.";
    if (reason === "youtubeSignupRequired")
      return "This video requires a YouTube account to watch.";
    if (status === 403) return "YouTube rejected the request (403): " + (msg || reason || "check your API key in Settings.");
    if (status === 400) return "YouTube API error (400): " + (msg || "bad request.");
    return msg || "YouTube API request failed (" + status + ").";
  }

  /* ------------------------------------------------------------------ */
  /* core request                                                        */
  /* ------------------------------------------------------------------ */

  async function yt(kind, params, opts) {
    opts = opts || {};
    const key = TF.store.apiKey();
    if (!key) throw ApiError("No API key configured. Open Settings and add your YouTube Data API key.", 0, null);

    const url = new URL(C.YT_API_BASE + "/" + kind);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    url.searchParams.set("key", key);

    let res;
    try {
      res = await fetch(url.toString());
    } catch (e) {
      const msg = navigator.onLine === false
        ? "You appear to be offline. Reconnect and try again."
        : "Network error reaching YouTube. Check your connection.";
      if (!opts.soft) setStatus(true, msg);
      throw ApiError(msg, 0, null);
    }

    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch (e) { /* non-JSON */ }

    if (!res.ok) {
      const err = ApiError(friendlyError(res.status, body || {}), res.status, body);
      /* 4xx = key/params problem (API reachable); 5xx/network = API down */
      if (!opts.soft && res.status >= 500) setStatus(true, err.message);
      throw err;
    }

    if (!opts.soft) setStatus(false, "");
    TF.store.addQuota(kind);
    return body;
  }

  async function fillDurations(tracks) {
    const missing = tracks.filter((t) => !t.duration).map((t) => t.id);
    if (!missing.length) return tracks;
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const body = await yt("videos", { part: "contentDetails", id: chunk.join(",") }, { soft: true });
      const map = {};
      (body.items || []).forEach((v) => (map[v.id] = isoToSeconds(v.contentDetails && v.contentDetails.duration)));
      tracks.forEach((t) => {
        if (map[t.id] !== undefined) t.duration = map[t.id];
      });
    }
    return tracks;
  }

  /* ------------------------------------------------------------------ */
  /* API surface                                                         */
  /* ------------------------------------------------------------------ */

  const relatedCache = new Map();

  const api = {
    parseMeta,
    mapSearchItem,

    /**
     * Search YouTube for music.
     * @returns {Promise<{tracks: Array, nextPageToken: string|null}>}
     */
    async search(query, opts) {
      opts = opts || {};
      const base = {
        part: "snippet",
        type: "video",
        q: query,
        maxResults: opts.maxResults || C.SEARCH_RESULTS,
        videoEmbeddable: "true",
        order: opts.order || "relevance"
      };
      if (opts.channelId) base.channelId = opts.channelId;
      if (opts.pageToken) base.pageToken = opts.pageToken;
      if (opts.musicOnly !== false && TF.store.state.settings.musicOnly && !opts.channelId) {
        base.videoCategoryId = "10"; // Music
      }

      let body = await yt("search", base);

      // Music-category filter can be over-restrictive, retry without it.
      if ((!body.items || !body.items.length) && base.videoCategoryId) {
        delete base.videoCategoryId;
        body = await yt("search", base);
      }

      let tracks = (body.items || []).map(mapSearchItem).filter(Boolean);
      try {
        await fillDurations(tracks);
      } catch (e) {
        /* duration lookup is best-effort */
      }
      return { tracks, nextPageToken: body.nextPageToken || null };
    },

    /** Channel metadata (for artist pages). */
    async channel(channelId) {
      const body = await yt("channels", { part: "snippet,statistics", id: channelId });
      const c = (body.items || [])[0];
      if (!c) return null;
      const th = (c.snippet.thumbnails || {});
      return {
        id: c.id,
        title: unescapeHtml(c.snippet.title),
        description: (c.snippet.description || "").slice(0, 240),
        thumbnail: (th.medium || th.high || th.default || {}).url || "",
        subscribers: (c.statistics && c.statistics.subscriberCount) || ""
      };
    },

    /** Most recent uploads from a channel (no query, every upload). */
    async channelTracks(channelId, pageToken) {
      return api.search("", {
        channelId,
        pageToken,
        order: "date",
        musicOnly: false,
        maxResults: C.RELATED_RESULTS
      });
    },

    /**
     * Related songs for a track. Tries the official related endpoint first,
     * falls back to the artist's other uploads, then a keyword search.
     * Cached per video id for the lifetime of the tab.
     */
    async related(track) {
      if (relatedCache.has(track.id)) return relatedCache.get(track.id);

      // The official relatedToVideoId endpoint was retired by Google (400),
      // so build a "related" list from the artist's uploads plus a keyword search.
      const merges = [];
      if (track.channelId) {
        merges.push(api.channelTracks(track.channelId).then((r) => r.tracks).catch(() => []));
      }
      merges.push(
        api.search(`${track.artist} ${track.title}`, { musicOnly: true })
          .then((r) => r.tracks)
          .catch(() => [])
      );

      const results = await Promise.all(merges);
      const seen = new Set([track.id]);
      const merged = [];
      results.forEach((list) => {
        list.forEach((t) => {
          if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
        });
      });

      if (!merged.length) {
        // last resort: anything by this artist
        try {
          const res = await api.search(track.artist, { musicOnly: true });
          res.tracks.filter((t) => t.id !== track.id).forEach((t) => {
            if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
          });
        } catch (e) { /* give up */ }
      }

      relatedCache.set(track.id, merged.slice(0, C.RELATED_RESULTS));
      return relatedCache.get(track.id);
    },

    /* ---------------- lyrics (lrclib.net, keyless + CORS friendly) ---------------- */

    /**
     * @returns {Promise<{plain: string, synced: Array<{t:number, text:string}>}|null>}
     */
    async lyrics(track) {
      const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const attempts = [
        `${C.LYRICS_API_BASE}/search?track_name=${encodeURIComponent(track.title)}&artist_name=${encodeURIComponent(track.artist)}`,
        `${C.LYRICS_API_BASE}/search?q=${encodeURIComponent(track.rawTitle || track.title + " " + track.artist)}`
      ];

      for (const url of attempts) {
        try {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) continue;
          const list = await res.json();
          if (!Array.isArray(list) || !list.length) continue;

          // prefer an entry that has synced lyrics and matches title+artist best
          let best = null;
          let bestScore = -1;
          for (const entry of list) {
            let score = 0;
            if (entry.syncedLyrics) score += 4;
            if (norm(entry.trackName) === norm(track.title)) score += 3;
            if (norm(entry.artistName) === norm(track.artist)) score += 3;
            else if (norm(entry.artistName || "").includes(norm(track.artist)) || norm(track.artist).includes(norm(entry.artistName || ""))) score += 2;
            if (score > bestScore) { bestScore = score; best = entry; }
          }
          if (!best) continue;

          const plain = best.plainLyrics || "";
          const synced = parseLrc(best.syncedLyrics || "");
          if (!plain && !synced.length) continue;
          return {
            plain,
            synced,
            source: "LRCLIB",
            trackName: best.trackName,
            artistName: best.artistName
          };
        } catch (e) {
          /* try next source */
        }
      }
      return null;
    }
  };

  function parseLrc(lrc) {
    if (!lrc) return [];
    const lines = [];
    lrc.split(/\r?\n/).forEach((line) => {
      const tags = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      const text = line.replace(/\[[^\]]+\]/g, "").trim();
      if (!tags.length) return;
      tags.forEach((t) => {
        const min = +t[1];
        const sec = +t[2];
        const frac = t[3] ? +("0." + t[3]) : 0;
        lines.push({ t: min * 60 + sec + frac, text });
      });
    });
    return lines.sort((a, b) => a.t - b.t);
  }

  TF.api = api;
  api.ping = ping;
  api.status = status;
})();
