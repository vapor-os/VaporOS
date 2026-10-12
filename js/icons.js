/* Inline SVG icon set. Stroke based, inherits currentColor. */
const S = (d, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;

export const icons = {
  back: S(`<path d="M15 5l-7 7 7 7"/>`),
  forward: S(`<path d="M9 5l7 7-7 7"/>`),
  reload: S(`<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>`),
  stop: S(`<path d="M6 6l12 12M18 6L6 18"/>`),
  home: S(`<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/>`),
  star: S(`<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/>`),
  starFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.4l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.8l6.1-.9z"/></svg>`,
  copy: S(`<rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5.5 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v.5"/>`),
  clock: S(`<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.9"/>`),
  gear: S(`<circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-1.9-3.3-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.3 3H9.7l-.3 2.2a7.6 7.6 0 0 0-2.6 1.5l-2-.8L2.9 9.2l1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 1.9 3.3 2-.8a7.6 7.6 0 0 0 2.6 1.5l.3 2.2h4.6l.3-2.2a7.6 7.6 0 0 0 2.6-1.5l2 .8 1.9-3.3z"/>`),
  bookmark: S(`<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>`),
  fullscreen: S(`<path d="M4 9V5.6A1.6 1.6 0 0 1 5.6 4H9"/><path d="M15 4h3.4A1.6 1.6 0 0 1 20 5.6V9"/><path d="M20 15v3.4a1.6 1.6 0 0 1-1.6 1.6H15"/><path d="M9 20H5.6A1.6 1.6 0 0 1 4 18.4V15"/>`),
  exitFullscreen: S(`<path d="M9 4v3.4A1.6 1.6 0 0 1 7.4 9H4"/><path d="M20 9h-3.4A1.6 1.6 0 0 1 15 7.4V4"/><path d="M15 20v-3.4a1.6 1.6 0 0 1 1.6-1.6H20"/><path d="M4 15h3.4A1.6 1.6 0 0 1 9 16.6V20"/>`),
  close: S(`<path d="M6 6l12 12M18 6L6 18"/>`),
  search: S(`<circle cx="11" cy="11" r="6.6"/><path d="M16 16l4.4 4.4"/>`),
  globe: S(`<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.2 2.4 3.3 5.3 3.3 8.4s-1.1 6-3.3 8.4c-2.2-2.4-3.3-5.3-3.3-8.4s1.1-6 3.3-8.4z"/>`),
  lock: S(`<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>`),
  flash: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 2L5 13.4h5.3L9.8 22 19 10.1h-5.6z"/></svg>`,
  chevron: S(`<path d="M7 10l5 5 5-5"/>`),
  check: S(`<path d="M5 12.5l4.6 4.5L19 7.5"/>`),
  trash: S(`<path d="M4.5 7h15"/><path d="M9.5 7V5.4A1.4 1.4 0 0 1 11 4h2a1.4 1.4 0 0 1 1.5 1.4V7"/><path d="M6.5 7l.8 12.1A1.6 1.6 0 0 0 9 20.6h6a1.6 1.6 0 0 0 1.7-1.5L17.5 7"/>`),
  minus: S(`<path d="M6 12h12"/>`),
  plus: S(`<path d="M12 6v12M6 12h12"/>`),
  window: S(`<rect x="3.5" y="5" width="17" height="14" rx="2.4"/><path d="M3.5 9.4h17"/>`),
  external: S(`<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18.5 14.5V18a1.6 1.6 0 0 1-1.6 1.6H6A1.6 1.6 0 0 1 4.4 18V7.1A1.6 1.6 0 0 1 6 5.5h3.5"/>`),
  history: S(`<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5V9h4.5"/><path d="M12 8v4.3l3 1.8"/>`),
  layers: S(`<path d="M12 3.6l8.4 4.6L12 12.8 3.6 8.2z"/><path d="M4 12.6L12 17l8-4.4"/><path d="M4 16.8L12 21l8-4.2"/>`),
  sparkle: S(`<path d="M12 4l1.7 4.6L18.3 10l-4.6 1.7L12 16.3l-1.7-4.6L5.7 10l4.6-1.4z"/><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>`),
  shield: S(`<path d="M12 3.4l7 2.6v5.4c0 4.2-2.9 7.6-7 9.2-4.1-1.6-7-5-7-9.2V6z"/><path d="M9 12l2.2 2.2L15.4 10"/>`),
  eye: S(`<path d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.7"/>`),
};

/** Flat monogram mark for engines without an official vector logo. */
const mark = (text, color, size = 15, baseline = 17) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="${baseline}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="700" fill="${color}">${text}</text></svg>`;

export const engineLogos = {
  google: `<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>`,
  bing: `<svg viewBox="0 0 24 24"><path fill="#008373" d="M6.5 3.6l4.7 1.4v11.7l3.2-1.8-.4-4.4 4.3 1.6-1.9 11.3-9.9-3 4.7-1.4V5.1z"/></svg>`,
  duckduckgo: `<svg viewBox="0 0 24 24"><path fill="#DE5833" d="M12 4.6c-4 0-7.3 2.9-7.3 6.6 0 1.9.9 3.6 2.4 4.8v3.2c0 .5.6.8 1 .5l2.5-1.7c.4.1.9.1 1.4.1 4 0 7.3-2.9 7.3-6.6S16 4.6 12 4.6z"/><circle cx="9.4" cy="10.7" r="1.1" fill="#fff"/><circle cx="14.6" cy="10.7" r="1.1" fill="#fff"/></svg>`,
  brave: `<svg viewBox="0 0 24 24"><path fill="#FB542B" d="M12 2.6l4.7 2.1 1.6-.4 3 3.4-.8 3.4 1.4 4.5-4.6 4.7-3.7-.4-3.7 1.6-4.5-3.4-1-4.6.9-4.2 1.7-3.4 4.4 1.9z"/><path fill="#fff" d="M12 7.4l1.9 3.3-1.9 2-1.9-2z"/></svg>`,
  startpage: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" fill="none" stroke="#6666ff" stroke-width="2"/><circle cx="12" cy="12" r="3.4" fill="#6666ff"/></svg>`,
  /* Flat monogram marks for the rest of the scraped set. */
  yahoo: mark("Y!", "#6001d2", 13, 17),
  ecosia: mark("e", "#328f1b", 17, 16.5),
  baidu: mark("B", "#2932e1", 15, 17),
  dogpile: mark("D", "#e8552d", 15, 17),
  lycos: mark("L", "#0057b8", 15, 17),
  mojeek: mark("m", "#e8890c", 15, 16.5),
  qwant: mark("Q", "#e6007e", 15, 17),
  yandex: mark("Y", "#fc3f1d", 15, 17),
  swisscows: `<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#d52b1e"/><path fill="#fff" d="M10.4 6.4h3.2v4h4v3.2h-4v4h-3.2v-4h-4v-3.2h4z"/></svg>`,
};
