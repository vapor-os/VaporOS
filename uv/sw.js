(()=>{importScripts("./uv.bundle.js");importScripts("./uv.config.js");importScripts(self.__uv$config.sw||"./uv.sw.js");var t=new UVServiceWorker;self.addEventListener("fetch",r=>{r.respondWith((async()=>t.route(r)?await t.fetch(r):await fetch(r.request))())});})();
//# sourceMappingURL=sw.js.map
