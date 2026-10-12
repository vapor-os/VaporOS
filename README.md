# SakuraOS UBG

**An all-in-one unblocked gaming platform that runs entirely in your browser  no install, no extensions, no backend.**

SakuraOS UBG is a web-based unblocked games site built as a full desktop experience. Open the page and you get a complete operating-system-style environment with a start menu, taskbar, dock and windowed apps, packed with:

- **Games hub  2,100+ titles** in one searchable library: 105 games bundled locally that open instantly (even offline), plus thousands more streamed from three online catalogs (UBG Hyper, DuckMath, GS & COS) with cover art, instant search and source toggles.
- **Proxy browsers** a real browser inside the site, powered by two switchable proxy engines (Ultraviolet and Scramjet), with tabs, bookmarks, history, zoom, fullscreen, a stealth window and 14 search engines with live suggestions.
- **Discord-style chat app**  a themed chat experience matching the look and feel of Discord, built into the desktop.
- **YouTube copy**  a full YouTube-style client with a music player, search, channels and playback inside the OS.
- **59 live wallpapers** animated video wallpapers with poster-frame picker, brightness/blur/night-light filters and adaptive theming.
- **A suite of themed apps**  Veloura, Hanakuro, Sakurune, Kumora, Sakumo, Kurova, Numera, Sakuro, Kurocast, Nexora and Kuroshi  plus a settings app covering themes, accents, fonts, language, cursor, device metrics and a tab cloak that disguises the browser tab.
- **Privacy by design**  everything runs client-side in your browser. No accounts, no analytics, no server of ours sees anything; your bookmarks, history and settings stay in your own browser's local storage.

Deployable to any static host (GitHub Pages, Netlify, Cloudflare Pages) with no build step, and runnable locally with the bundled optional server.

---

## Features

### Games hub

- **2,100+ games** in a single searchable library, sorted into sources you can toggle on or off.
- **105 games bundled locally.** They ship as compressed payloads in `games/` and unpack in the browser, so they open instantly and need no internet connection at all.
- **Three online catalogs** (UBG Hyper, DuckMath, GS & COS) that refresh on demand and add thousands of cloud titles to the same list.
- Instant search across every source, with cover art and icons served from local folders.
- Games launch in a sandboxed frame right inside the hub, so you never lose your place on the desktop.

### Proxy browser

- **Two proxy engines, Ultraviolet and Scramjet**, switchable at runtime from the toolbar so you can pick whichever one gets through your network.
- Real browser chrome: tabs, back and forward, reload, bookmarks, history, zoom, and a stealth window that opens in `about:blank`.
- **14 search engines** in the address bar (Google, DuckDuckGo, Brave, Startpage, Ecosia and more) with live suggestions as you type.
- Fullscreen mode with a peek bar, plus a stealth window for quick private detours.
- Runs as an origin bound service worker, which is why the bundled server exists.

### Live wallpapers

- **59 animated wallpapers**, mixing looping video clips and converted high definition loops.
- The picker shows poster frames, so it never has to decode a whole video just to render thumbnails.
- Applies to the desktop behind everything, with brightness, blur and night light filters layered on top.
- Every clip lives in `wallpapers/` next to the page instead of being embedded in the HTML.

### Desktop and apps

- A familiar desktop: start menu, taskbar, dock, windowed apps with minimize, maximize and close.
- **Themed app experiences** including Veloura, Hanakuro, Sakurane, Kumora, Sakumo, Kurova, Numera, Sakura, Kurocast, Nexora and Kuroshi.
- Settings app covering themes, accents, fonts, language, cursor, device metrics and tab cloak.
- **Four performance tiers** (High, Medium, Low, Potato) that throttle animation and compositing on weak hardware.
- Adaptive theming that reacts to the wallpaper you pick.

### Privacy

- Everything runs client-side in your browser. There is no backend, no account and no analytics.
- Your bookmarks, history and settings stay in your browser's local storage.
- The only traffic that leaves your machine is the sites you choose to open through the proxy, and the optional game catalog refresh.

---

## Quick start

### Run it online (no .bat, no Node needed)

This copy of the project is fully static: every internal path is resolved relative to wherever the site is served from, so it works on GitHub Pages, Netlify, Cloudflare Pages or any web server  at the domain root or under a subpath. See **Deploying** below.

### Run it locally (optional)

Running locally is optional now, but it still works if you want it:

```
node sakura-local-server.js
```

Then open http://localhost:8123 in your browser.

On Windows you can double click `Open SakuraOS.bat` instead.

### Run the standalone proxy browser

```
node server.mjs
```

Then open http://localhost:5173 in your browser.

Use a different port with `node server.mjs --port 8080`.

**The old caveat, for context.** The proxy code uses service workers, and service workers are origin bound, so opening `index.html` straight from the file system will not work. This deploy build is made for `http://` or `https://` hosting; the bundled server above is only a local convenience.

---

## Deploying

Everything needed is in this folder. No build step, no server, no environment variables.

### GitHub Pages

1. Create a new GitHub repository and push this folder:
   ```
   git init
   git add .
   git commit -m "SakuraOS"
   git branch -M main
   git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**.
3. The site appears at `https://YOUR_NAME.github.io/YOUR_REPO/`. `index.html` instantly redirects into `SakuraOS v1.3.html` (the desktop).

### Netlify / Cloudflare Pages / anything else

Drag this folder into Netlify's deploy UI, or point the service at this repo with publish directory `.` and no build command. Static hosts serve `index.html` at `/`, so the redirect handles the rest.

### Notes for any host

- **Subpaths are supported.** Every service worker registration, proxy runtime path and Scramjet/Ultraviolet prefix is computed from the page's own directory at runtime, so hosting under `https://host/some/folder/` works the same as the domain root.
- **`/api/suggest` and `/api/presence` have graceful fallbacks.** Those two endpoints existed only in the local Node server. On static hosts the omnibox switches to the engines' public suggestion feeds (JSONP/CORS) and the presence counter falls back to counting this browser's own copies. Nothing breaks.
- **The proxy uses public wisp servers** (default `wss://invisiproxy.com/wisp/`, changeable in the browser's Settings), so browsing works without you hosting any backend.
- Files larger than ~50 MB (`gsh-54.gz`, `HANAKURO.html`, `Sakarune.html`, `SakuraOS v1.3.html`) are under GitHub's 100 MB per-file limit, so the repo pushes fine — the first push is just slow.

---

## Project structure

| Path | What it is |
| --- | --- |
| `SakuraOS v1.3.html` | The standalone desktop build: OS shell, games hub, wallpapers and apps in one file. |
| `games/` | Bundled game payloads (`gsh-*.gz`) and their icons (`gsi-*`). |
| `wallpapers/` | Every live wallpaper clip plus its poster frame. |
| `catalog-images/` | Cover art for the store and game catalog tiles. |
| `index.html` | Launcher: redirects into the desktop build. |
| `kuroshi.html`, `app.js`, `styles.css`, `sw.js` | The standalone Kuroshi proxy browser interface and its service worker. |
| `js/` | Browser logic: `proxy.js`, `engines.js`, `ui.js`, `player.js`, `store.js`, `icons.js`, `newtab.js`, `api.js`. |
| `vendor/` | Vendored proxy runtime (Ultraviolet, Scramjet, baremux, epoxy, libcurl) mapped to its original paths so the unmodified upstream service worker keeps working. |
| `uv/`, `scram/`, `baremux/`, `epoxy/`, `libcurl/` | The same proxy files at top level. |
| `server.mjs` | Static server plus the `/api/suggest` search proxy for the browser. |
| `sakura-local-server.js` | Server for the standalone SakuraOS desktop build. |
| `HANAKURO.html`, `Sakarune.html`, `kuroshi.html` | Standalone single file builds of the sibling projects. |

---

## Size notes

The desktop build was originally a single 529 MB HTML file because every wallpaper, game payload and catalog cover was embedded in it as base64. It is now **36.5 MB**, with roughly 490 MB of media extracted into the `games/`, `wallpapers/` and `catalog-images/` folders where the page loads them on demand.

That work is what makes the project shippable as a repository, so keep those three folders next to the HTML file.

---

## Not included in this repo

GitHub refuses any single file over 100 MB, and a few local files are far larger than that. These stay on the local machine only:

- `wallpapers-original/` (1.57 GB of raw source video)
- Any pre-extraction backup copies of the desktop build

None of them are needed to run the site. They are source material and backups.

---

## Disclaimer

This project exists for people who want to play games and browse the web on restricted networks. Using it is entirely your own choice and your own responsibility.

**If you use this site and get in trouble — at school, at work, or anywhere else — that is on you and not on the creator of this project.** The creator is not responsible for any consequences arising from its use. Check your local rules before you use it.

---

## License

No license has been added yet, so all rights are reserved by the author.
