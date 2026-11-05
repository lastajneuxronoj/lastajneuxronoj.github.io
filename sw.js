const CACHE_NAME = "lastaj-neuronoj-v2";
const APP_SHELL = [
	"/",
	"/index.html",
	"/manifest.webmanifest",
	"/css/style.css",
	"/css/header_footer.css",
	"/css/mobile.css",
	"/js/main.js",
	"/js/ui.js",
	"/js/push-config.js",
	"/js/push.js",
	"/images/logo.png"
];

self.addEventListener("install", event => {
        event.waitUntil(
                Promise.all([
                        caches.open(CACHE_NAME).then(cache =>
                                cache.addAll(APP_SHELL)
                        ),
                        self.skipWaiting()
                ])
        );
});

self.addEventListener("activate", event => {
	event.waitUntil(
		Promise.all([
			caches.keys().then(keys =>
				Promise.all(
					keys
						.filter(key =>
							key.startsWith("lastaj-neuronoj-") &&
							key !== CACHE_NAME
						)
						.map(key => caches.delete(key))
				)
			),
			self.clients.claim()
		])
	);
});

self.addEventListener("fetch", event => {
        const request = event.request;

        if (
                request.method !== "GET" ||
                new URL(request.url).origin !== self.location.origin
        ) {
                return;
        }

        // Las navegaciones deben priorizar el contenido actualizado.
        if (request.mode === "navigate") {
                event.respondWith(
                        (async () => {
                                try {
                                        const response = await fetch(request);

                                        if (response.ok) {
                                                const cache = await caches.open(CACHE_NAME);
                                                await cache.put(request, response.clone());
                                        }

                                        return response;

                                } catch {
                                        return (
                                                await caches.match(request) ||
                                                await caches.match("/index.html")
                                        );
                                }
                        })()
                );

                return;
        }

        // Los recursos estáticos utilizan cache-first.
        event.respondWith(
                (async () => {
                        const cached = await caches.match(request);

                        if (cached) return cached;

                        const response = await fetch(request);

                        if (response.ok) {
                                const cache = await caches.open(CACHE_NAME);
                                await cache.put(request, response.clone());
                        }

                        return response;
                })()
        );
});

self.addEventListener("push", event => {
	const fallback = {
		title: "Lastaj Neŭronoj",
		body: "Nova blogaĵo disponeblas.",
		url: "/index.html"
	};

	let payload = fallback;
	try {
		payload = { ...fallback, ...event.data.json() };
	} catch (_) {
		// A push without JSON still produces a useful notification.
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: "/images/logo.png",
			badge: "/images/logo.png",
			data: { url: payload.url },
			tag: payload.tag || "lastaj-neuronoj-new-post",
			renotify: false
		})
	);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  let target;

  try {
    target = new URL(
      event.notification.data?.url || "/index.html",
      self.location.origin
    );

    if (target.origin !== self.location.origin) {
      target = new URL("/index.html", self.location.origin);
    }
  } catch {
    target = new URL("/index.html", self.location.origin);
  }

  const url = target.href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windows => {
      const matching = windows.find(windowClient => {
        return new URL(windowClient.url).href === url;
      });

      return matching
        ? matching.focus()
        : clients.openWindow(url);
    })
  );
});
