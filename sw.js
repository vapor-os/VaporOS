importScripts('./scram/controller.sw.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if ($scramjetController.shouldRoute(event))
        return $scramjetController.route(event);

      return fetch(event.request);
    })()
  );
});

/* ── Kuroshi patch ───────────────────────────────────────────────────────────
   Silent routing self-check. js/proxy.js asks the service worker whether any
   Scramjet controller is registered (i.e. whether /scram/network/* requests
   will be routed) without firing a real proxied request — a real probe would
   log "No frame found for request" plus a 500 in the page console every time. */
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object" || !msg.$kuroshi$ping) return;
  const path = typeof msg.path === "string" ? msg.path : "/scram/network/";
  let routed = false;
  try {
    routed = $scramjetController.shouldRoute({ request: { url: "http://localhost" + path } });
  } catch (err) {
    routed = false;
  }
  const port = event.ports && event.ports[0];
  if (port) port.postMessage({ $kuroshi$pong: routed });
});
