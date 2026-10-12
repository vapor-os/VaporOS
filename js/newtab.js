/** The new-tab page: logo, search pill, speed tiles, status footer. */
import { icons } from "./icons.js";
import { store } from "./store.js";
import { SEARCH_ENGINES, getEngine, faviconFor } from "./engines.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const PLANET = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <g fill="#ff8fb8">
    <path d="M32 32C22 28 18 16 24 7c2.5 3.5 5 4.5 8 4.5s5.5-1 8-4.5c6 9 2 21-8 25z"/>
    <path transform="rotate(72 32 32)" d="M32 32C22 28 18 16 24 7c2.5 3.5 5 4.5 8 4.5s5.5-1 8-4.5c6 9 2 21-8 25z"/>
    <path transform="rotate(144 32 32)" d="M32 32C22 28 18 16 24 7c2.5 3.5 5 4.5 8 4.5s5.5-1 8-4.5c6 9 2 21-8 25z"/>
    <path transform="rotate(216 32 32)" d="M32 32C22 28 18 16 24 7c2.5 3.5 5 4.5 8 4.5s5.5-1 8-4.5c6 9 2 21-8 25z"/>
    <path transform="rotate(288 32 32)" d="M32 32C22 28 18 16 24 7c2.5 3.5 5 4.5 8 4.5s5.5-1 8-4.5c6 9 2 21-8 25z"/>
  </g>
  <circle cx="32" cy="32" r="4.6" fill="#fff2f7"/>
  <circle cx="32" cy="32" r="1.8" fill="#7c6cff"/>
</svg>`;

function tileEl(tile, api, index) {
  const el = document.createElement("div");
  el.className = "tile";
  el.style.animationDelay = `${0.38 + index * 0.05}s`;
  el.tabIndex = 0;
  const host = (() => {
    try {
      return new URL(tile.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const glyph = (tile.name[0] || "?").toUpperCase();
  el.innerHTML = `
    <div class="disc"></div>
    <span></span>
    <button class="del" title="Remove">${icons.close}</button>`;
  el.querySelector("span").textContent = tile.name;

  const disc = el.querySelector(".disc");
  const icon = faviconFor(tile.url);
  if (icon) {
    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      disc.innerHTML = "";
      const s = document.createElement("span");
      s.className = "glyph";
      s.textContent = glyph;
      disc.appendChild(s);
    });
    disc.appendChild(img);
  } else {
    disc.innerHTML = `<span class="glyph"></span>`;
    disc.firstChild.textContent = glyph;
  }

  el.addEventListener("click", (e) => {
    if (e.target.closest(".del")) return;
    api.openTile(tile.url, e.metaKey || e.ctrlKey || e.shiftKey);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") api.openTile(tile.url, e.metaKey || e.ctrlKey || e.shiftKey);
  });
  el.querySelector(".del").addEventListener("click", (e) => {
    e.stopPropagation();
    el.style.transition = "all .28s cubic-bezier(.22,1,.36,1)";
    el.style.opacity = "0";
    el.style.transform = "scale(.7)";
    setTimeout(() => {
      store.removeTile(tile.url);
      api.refresh();
    }, 240);
  });
  el.title = host || tile.url;
  return el;
}

function addTileEl(api, index) {
  const el = document.createElement("div");
  el.className = "tile add";
  el.style.animationDelay = `${0.38 + index * 0.05}s`;
  el.tabIndex = 0;
  el.innerHTML = `<div class="disc">${icons.plus}</div><span>New</span>`;
  const open = () => startAddForm();
  el.addEventListener("click", open);
  el.addEventListener("keydown", (e) => e.key === "Enter" && open());

  function startAddForm() {
    el.innerHTML = `
      <div class="disc" style="background:rgba(255,255,255,.08)">${icons.sparkle}</div>
      <form class="mini-form" style="display:flex;flex-direction:column;gap:6px;animation:fadeUp .3s both">
        <input class="field" placeholder="Name" required maxlength="18" style="min-width:0;width:96px;height:28px;padding:0 8px;font-size:12px">
        <input class="field" placeholder="https://…" required style="min-width:0;width:96px;height:28px;padding:0 8px;font-size:12px">
      </form>`;
    const inputs = el.querySelectorAll("input");
    inputs[0].focus();
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const [name, url] = [...inputs].map((i) => i.value.trim());
      if (!name || !url) return;
      store.addTile(name, url.includes("://") ? url : `https://${url}`);
      api.refresh();
    });
    inputs[1].addEventListener("blur", () => setTimeout(() => api.refresh(), 180));
  }
  return el;
}

/**
 * Build a new-tab view. `api` = { submit, openTile, refresh, engineId, proxy }
 */
export function createNewTabView(api) {
  const el = document.createElement("div");
  el.className = "newtab";
  const engine = getEngine(api.engineId);

  el.innerHTML = `
    <div class="newtab-inner">
      <div class="nt-eyebrow">${greeting()}</div>
      <div class="nt-logo">${PLANET}<span>kuroshi</span></div>
      <div class="nt-tag">Browse freely. Private, fast, uncensored.</div>

      <div class="nt-search">
        <span class="glass">${icons.search}</span>
        <input type="text" placeholder="Search ${engine.name} or enter a URL" spellcheck="false" autocomplete="off" />
        <button class="go" title="Search">${icons.forward}</button>
        <div class="suggest" hidden></div>
      </div>

      <div class="nt-hint">
        <span><kbd>Ctrl</kbd> <kbd>T</kbd> new tab</span>
        <span><kbd>Ctrl</kbd> <kbd>L</kbd> address bar</span>
        <span><kbd>F11</kbd> fullscreen</span>
        <span>engine · ${engine.name}</span>
      </div>

      <div class="tiles"></div>
    </div>

    <div class="nt-foot">
      <span class="pill"><span class="dot"></span> proxy <b>${api.proxyLabel}</b></span>
      <span class="pill">search <b>${engine.name}</b></span>
      <span class="pill">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
    </div>`;

  const tilesWrap = el.querySelector(".tiles");
  const input = el.querySelector(".nt-search input");
  const searchBox = el.querySelector(".nt-search");

  const paintTiles = () => {
    tilesWrap.innerHTML = "";
    const tiles = [...store.tiles];
    tiles.forEach((t, i) => tilesWrap.appendChild(tileEl(t, api, i)));
    tilesWrap.appendChild(addTileEl(api, tiles.length));
  };
  paintTiles();
  api.registerRefresh(paintTiles);

  input.addEventListener("focus", () => searchBox.classList.add("focus"));
  input.addEventListener("blur", () => searchBox.classList.remove("focus"));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      api.submit(input.value);
    }
    if (e.key === "Escape") input.blur();
  });
  el.querySelector(".go").addEventListener("click", () => api.submit(input.value));

  // give focus to the search field when the view becomes visible
  requestAnimationFrame(() => {
    if (api.wantsFocus) setTimeout(() => input.focus(), 320);
  });

  return el;
}

export { SEARCH_ENGINES };
