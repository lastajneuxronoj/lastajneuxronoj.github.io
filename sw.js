
const CACHE_NAME = "lastaj-neuronoj-v4";
const ARTICLES_CACHE_NAME = "lastaj-neuronoj-articles-v1";
const MERMAID_CACHE_NAME = "lastaj-neuronoj-mermaid-v1";
const TWEMOJI_CACHE_NAME = "lastaj-neuronoj-twemoji-v1";
const CLIENT_MODES_CACHE_NAME = "lastaj-neuronoj-client-modes-v1";

const MERMAID_CHUNKS_PATH =
	"/js/vendor/mermaid/chunks/mermaid.esm.min/";

const MERMAID_CDN_BASE =
	"https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/chunks/mermaid.esm.min/";

const MAX_CACHED_ARTICLES = 50;
const ARTICLE_TTL = 30 * 24 * 60 * 60 * 1000;
const LAST_ACCESS_HEADER = "X-Lastaj-Last-Access";

const MERMAID_MAX_CACHE_SIZE = 20 * 1024 * 1024;
const MERMAID_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const MERMAID_LAST_ACCESS_HEADER = "X-Lastaj-Mermaid-Last-Access";
const MERMAID_SIZE_HEADER = "X-Lastaj-Mermaid-Size";

const TWEMOJI_PATH = "/twemoji/14.0.2/svg/";
const TWEMOJI_CDN_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";
const TWEMOJI_MAX_CACHE_SIZE = 5 * 1024 * 1024;
const TWEMOJI_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const TWEMOJI_LAST_ACCESS_HEADER = "X-Lastaj-Twemoji-Last-Access";
const TWEMOJI_SIZE_HEADER = "X-Lastaj-Twemoji-Size";

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
	"/images/logo.png",
	"/css/post.css",
	"/css/katex.css",
	"/js/translation.js",
	"/js/content.js",
	"/js/offline.js",
	"/js/search.js",
	"/json/posts.json",
	"/components/header.html",
	"/components/footer.html",
	"/json/translations.json",
	"/svg/logo.svg",
	"/svg/menu_b.svg",
	"/svg/menu_w.svg",
	"/svg/close_menu_b.svg",
	"/svg/close_menu_w.svg",
	"/svg/left_arrow_w.svg",
	"/svg/left_arrow_b.svg",
	"/svg/sun_w.svg",
	"/svg/moon_b.svg",
	"/svg/search_w.svg",
	"/svg/search_b.svg",
	"/svg/social_w.svg",
	"/svg/social_b.svg",
	"/svg/flag_eo.svg",
	"/svg/flag_es.svg",
	"/svg/facebook.svg",
	"/svg/tiktok.svg",
	"/svg/spotify.svg",
	"/svg/mail.svg",
	"/svg/twitch.svg",
	"/svg/rss.svg"
];


const CACHE_PREFIX = "lastaj-neuronoj-";

const CURRENT_CACHES = new Set([
    CACHE_NAME,
    ARTICLES_CACHE_NAME,
    MERMAID_CACHE_NAME,
    TWEMOJI_CACHE_NAME,
    CLIENT_MODES_CACHE_NAME
]);

// Genera una clave independiente para cada cliente.
function getClientModeRequest(clientId) {
    return new Request(
        `${self.location.origin}/__client-mode__/${encodeURIComponent(clientId)}`
    );
}

// Comprueba si el cliente tiene habilitadas las funciones offline.
async function isOfflineEnabled(clientId) {
  if (!clientId) return false;

  const cache = await caches.open(CLIENT_MODES_CACHE_NAME);
  return Boolean(await cache.match(getClientModeRequest(clientId)));
}

async function enableOfflineForClient(clientId) {
  if (!clientId) return false;

  const cache = await caches.open(CLIENT_MODES_CACHE_NAME);
  await cache.put(
    getClientModeRequest(clientId),
    new Response("enabled")
  );

  return true;
}

async function inheritOfflineMode(sourceClientId, destinationClientId) {
    if (!sourceClientId || !destinationClientId) {
        return false;
    }

    const enabled = await isOfflineEnabled(sourceClientId);

    if (enabled) {
        await enableOfflineForClient(destinationClientId);
    }

    return enabled;
}

// Registra los cambios de modo comunicados por la página.
self.addEventListener("message", event => {
    if (event.data?.type !== "CLIENT_MODE") return;

    const client = event.source;
    const port = event.ports[0];

    event.waitUntil(
        (async () => {
            try {
                if (
                    !client?.id ||
                    new URL(client.url).origin !== self.location.origin
                ) {
                    throw new Error("Cliente no válido.");
                }

                const cache = await caches.open(
                    CLIENT_MODES_CACHE_NAME
                );

                const key = getClientModeRequest(client.id);

                if (event.data.enabled === true) {
                    await cache.put(
                        key,
                        new Response("enabled")
                    );
                } else {
                    await cache.delete(key);
                }

                port?.postMessage({
                    ok: true,
                    enabled: event.data.enabled === true
                });

            } catch (error) {
                console.error(
                    "No se pudo actualizar el modo del cliente:",
                    error
                );

                port?.postMessage({ ok: false });
            }
        })()
    );
});


// Reconoce artículos como /blog/001-eo.html o /blog/001-es.html.
function isArticleRequest(request) {
	const url = new URL(request.url);

	return /^\/blog\/\d{3}-[a-z]{2,3}\.html?$/i.test(url.pathname);
}

// Detecta el idioma a partir de la URL solicitada o de su referente.
function getRequestLanguage(request) {
	const url = new URL(request.url);

	// Primero intentamos obtenerlo de la URL solicitada.
	const queryLang = url.searchParams.get("lang");

	if (queryLang && /^[a-z]{2,3}$/i.test(queryLang)) {
		return queryLang.toLowerCase();
	}

	const pathMatch = url.pathname.match(/-([a-z]{2,3})\.html?$/i);

	if (pathMatch) {
		return pathMatch[1].toLowerCase();
	}

	// Si no está en la URL, intentamos obtenerlo de la página anterior.
	if (request.referrer) {
		const referrer = new URL(request.referrer);

		const referrerLang = referrer.searchParams.get("lang");

		if (referrerLang && /^[a-z]{2,3}$/i.test(referrerLang)) {
			return referrerLang.toLowerCase();
		}

		const referrerMatch = referrer.pathname.match(
			/-([a-z]{2,3})\.html?$/i
		);

		if (referrerMatch) {
			return referrerMatch[1].toLowerCase();
		}
	}

	// Idioma predeterminado del sitio.
	return "eo";
}

// Evita que los textos traducidos puedan introducir HTML.
function escapeHTML(value) {
	return String(value).replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	})[character]);
}

// Genera una página informativa cuando un recurso no está disponible offline.
async function createOfflinePage(request, type) {
	const lang = getRequestLanguage(request);

	let text = {};

	try {
		const cache = await caches.open(CACHE_NAME);
		const response = await cache.match("/json/translations.json");

		if (response) {
			const translations = await response.json();

			text =
				translations[lang]?.ui?.offlineFallback ||
				translations.eo?.ui?.offlineFallback ||
				{};
		}
	} catch (error) {
		console.error("No se pudieron cargar las traducciones offline:", error);
	}

	const isArticle = type === "article";

	const title = isArticle
		? text.articleTitle
		: text.pageTitle;

	const message = isArticle
		? text.articleMessage
		: text.pageMessage;

	const homeLink = text.homeLink || "Lastaj Neŭronoj";

	const html = `<!DOCTYPE html>
<html lang="${escapeHTML(lang)}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#ffffff">
	<title>${escapeHTML(title || "Senreta enhavo")}</title>
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			min-height: 100vh;
			margin: 0;
			padding: 2rem 1.25rem;
			display: flex;
			align-items: center;
			justify-content: center;
			background: #f7f5f0;
			color: #292929;
			font-family: sans-serif;
			text-align: center;
		}

		main {
			width: 100%;
			max-width: 520px;
		}

		img {
			width: 110px;
			max-width: 35%;
			height: auto;
			margin-bottom: 1.5rem;
		}

		h1 {
			font-size: 1.6rem;
			margin-bottom: 1rem;
		}

		p {
			line-height: 1.6;
			margin-bottom: 2rem;
		}

		a {
			display: inline-block;
			padding: 0.75rem 1.25rem;
			border-radius: 6px;
			background: #292929;
			color: white;
			text-decoration: none;
		}
	</style>
</head>
<body>
	<main>
		<img src="/svg/logo.svg" alt="Lastaj Neŭronoj">
		<h1>${escapeHTML(title || "Senreta enhavo")}</h1>
		<p>${escapeHTML(message || "Tiu ĉi enhavo ne disponeblas sen interreta konekto.")}</p>
		<a href="/index.html">${escapeHTML(homeLink)}</a>
	</main>
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store"
		}
	});
}

function isHomeRequest(request) {
	const url = new URL(request.url);

	return url.pathname === "/" ||
		   url.pathname === "/index.html";
}

// Guarda una respuesta con la fecha de último acceso.
async function cacheArticle(cache, request, response) {
	const copy = response.clone();
	const headers = new Headers(copy.headers);

	headers.set(LAST_ACCESS_HEADER, Date.now().toString());

	const storedResponse = new Response(copy.body, {
		status: copy.status,
		statusText: copy.statusText,
		headers
	});

	await cache.put(request, storedResponse);
}

// Elimina artículos antiguos y aplica el límite de almacenamiento.
async function pruneArticleCache(cache) {
	const requests = await cache.keys();
	const now = Date.now();
	const articles = [];

	for (const request of requests) {
		const response = await cache.match(request);
		if (!response) continue;

		const lastAccess = Number(
			response.headers.get(LAST_ACCESS_HEADER)
		);

		if (!lastAccess || now - lastAccess > ARTICLE_TTL) {
			await cache.delete(request);
			continue;
		}

		articles.push({ request, lastAccess });
	}

	articles.sort((a, b) => b.lastAccess - a.lastAccess);

	for (const article of articles.slice(MAX_CACHED_ARTICLES)) {
		await cache.delete(article.request);
	}
}

// Recupera los artículos guardados en la caché anterior.
async function migrateArticles() {
	const keys = await caches.keys();
	const articleCache = await caches.open(ARTICLES_CACHE_NAME);

	for (const key of keys) {
		if (
		    !key.startsWith("lastaj-neuronoj-") ||
		    key === CACHE_NAME ||
		    key === ARTICLES_CACHE_NAME ||
		    key === MERMAID_CACHE_NAME ||
		    key === TWEMOJI_CACHE_NAME ||
		    key === CLIENT_MODES_CACHE_NAME
		) {
		    continue;
		}

		const oldCache = await caches.open(key);
		const requests = await oldCache.keys();

		for (const request of requests) {
			if (!isArticleRequest(request)) continue;
			if (await articleCache.match(request)) continue;

			const response = await oldCache.match(request);

			if (response?.ok) {
				// Los artículos migrados comienzan con una nueva fecha
				// de acceso, porque la caché anterior no guardaba esa fecha.
				await cacheArticle(articleCache, request, response);
			}
		}
	}

	await pruneArticleCache(articleCache);
}

// Guarda un módulo Mermaid con metadatos de acceso y tamaño.
async function cacheMermaidResponse(cache, request, response) {
	const copy = response.clone();
	const body = await copy.arrayBuffer();
	const headers = new Headers(copy.headers);

	headers.set(
		MERMAID_LAST_ACCESS_HEADER,
		Date.now().toString()
	);

	headers.set(
		MERMAID_SIZE_HEADER,
		body.byteLength.toString()
	);

	const storedResponse = new Response(body, {
		status: copy.status,
		statusText: copy.statusText,
		headers
	});

	await cache.put(request, storedResponse);
}

// Elimina módulos caducados y aplica el límite de almacenamiento.
async function pruneMermaidCache(cache) {
	const requests = await cache.keys();
	const now = Date.now();
	const modules = [];
	let totalSize = 0;

	for (const request of requests) {
		const response = await cache.match(request);

		if (!response) continue;

		const lastAccess = Number(
			response.headers.get(MERMAID_LAST_ACCESS_HEADER)
		);

		const size = Number(
			response.headers.get(MERMAID_SIZE_HEADER)
		);

		// Eliminamos entradas sin metadatos válidos o caducadas.
		if (
			!lastAccess ||
			!Number.isFinite(size) ||
			size < 0 ||
			now - lastAccess > MERMAID_CACHE_TTL
		) {
			await cache.delete(request);
			continue;
		}

		modules.push({
			request,
			lastAccess,
			size
		});

		totalSize += size;
	}

	// Los módulos menos utilizados se eliminan primero.
	modules.sort((a, b) => a.lastAccess - b.lastAccess);

	while (totalSize > MERMAID_MAX_CACHE_SIZE && modules.length) {
		const module = modules.shift();

		await cache.delete(module.request);
		totalSize -= module.size;
	}
}


// Descarga Mermaid sin almacenar nada para clientes normales.
async function fetchMermaidWithoutCache(request) {
    try {
        const localResponse = await fetch(request);

        if (localResponse.ok) {
            return localResponse;
        }
    } catch (_) {
        // Intentamos el CDN.
    }

    const url = new URL(request.url);

    const relativePath = url.pathname.slice(
        MERMAID_CHUNKS_PATH.length
    );

    try {
        return await fetch(MERMAID_CDN_BASE + relativePath);
    } catch (_) {
        return Response.error();
    }
}

// Descarga Twemoji sin utilizar su caché para clientes normales.
async function fetchTwemojiWithoutCache(request) {
    const url = new URL(request.url);

    const relativePath = url.pathname.slice(
        TWEMOJI_PATH.length
    );

    try {
        return await fetch(TWEMOJI_CDN_BASE + relativePath);
    } catch (_) {
        return Response.error();
    }
}


// Gestiona los módulos de Mermaid con una estrategia híbrida.
async function handleMermaidChunk(request) {
	const mainCache = await caches.open(CACHE_NAME);
	const mermaidCache = await caches.open(MERMAID_CACHE_NAME);
	await pruneMermaidCache(mermaidCache);

	// 1. Los módulos locales ya guardados tienen prioridad.
	const localCached = await mainCache.match(request);

	if (localCached) {
		return localCached;
	}

	// 2. Intentamos obtener el módulo desde el repositorio local.
	let localResponse = null;

	try {
		localResponse = await fetch(request);

		if (localResponse.ok) {
			try {
				await mainCache.put(request, localResponse.clone());
			} catch (error) {
				console.warn("No se pudo guardar el módulo local:", error);
			}

			return localResponse;
		}

	} catch (_) {
		// Sin conexión o recurso local inaccesible.
	}

	// 3. Si no existe localmente, comprobamos la caché Mermaid.
	const cached = await mermaidCache.match(request);

	if (cached) {
		// Actualizamos su último acceso.
		try {
			await cacheMermaidResponse(
				mermaidCache,
				request,
				cached
			);

		} catch (error) {
			console.warn("No se pudo actualizar la caché Mermaid:", error);
		}

		return cached;
	}

	// 4. Si tampoco está almacenado, acudimos a jsDelivr.
	const url = new URL(request.url);

	const relativePath = url.pathname.slice(
		MERMAID_CHUNKS_PATH.length
	);

	const cdnUrl = MERMAID_CDN_BASE + relativePath;

	try {
		const cdnResponse = await fetch(cdnUrl);

		if (cdnResponse.ok) {
			try {
				await cacheMermaidResponse(
					mermaidCache,
					request,
					cdnResponse
				);

			} catch (error) {
				console.warn("No se pudo almacenar el módulo Mermaid:", error);
			}
		}

		return cdnResponse;

	} catch (error) {
		// Si no hay conexión, devolvemos el recurso local si existe.
		return localResponse || Response.error();
	}
}

// Guarda un emoji con metadatos de acceso y tamaño.
async function cacheTwemojiResponse(cache, request, response) {
	const copy = response.clone();
	const body = await copy.arrayBuffer();
	const headers = new Headers(copy.headers);

	headers.set(
		TWEMOJI_LAST_ACCESS_HEADER,
		Date.now().toString()
	);

	headers.set(
		TWEMOJI_SIZE_HEADER,
		body.byteLength.toString()
	);

	const storedResponse = new Response(body, {
		status: copy.status,
		statusText: copy.statusText,
		headers
	});

	await cache.put(request, storedResponse);
}

// Elimina emojis caducados y aplica el límite de almacenamiento.
async function pruneTwemojiCache(cache) {
	const requests = await cache.keys();
	const now = Date.now();
	const emojis = [];
	let totalSize = 0;

	for (const request of requests) {
		const response = await cache.match(request);

		if (!response) continue;

		const lastAccess = Number(
			response.headers.get(TWEMOJI_LAST_ACCESS_HEADER)
		);

		const size = Number(
			response.headers.get(TWEMOJI_SIZE_HEADER)
		);

		if (
			!lastAccess ||
			!Number.isFinite(size) ||
			size < 0 ||
			now - lastAccess > TWEMOJI_CACHE_TTL
		) {
			await cache.delete(request);
			continue;
		}

		emojis.push({
			request,
			lastAccess,
			size
		});

		totalSize += size;
	}

	// Los emojis menos utilizados se eliminan primero.
	emojis.sort((a, b) => a.lastAccess - b.lastAccess);

	while (totalSize > TWEMOJI_MAX_CACHE_SIZE && emojis.length) {
		const emoji = emojis.shift();

		await cache.delete(emoji.request);
		totalSize -= emoji.size;
	}
}

// Gestiona los SVG de Twemoji con descarga bajo demanda.
async function handleTwemojiRequest(request) {
	const cache = await caches.open(TWEMOJI_CACHE_NAME);

	// Primero eliminamos las entradas caducadas.
	await pruneTwemojiCache(cache);

	// Comprobamos si el emoji ya está almacenado.
	const cached = await cache.match(request);

	if (cached) {
		try {
			await cacheTwemojiResponse(cache, request, cached);
		} catch (error) {
			console.warn("No se pudo actualizar el acceso al emoji:", error);
		}

		return cached;
	}

	// Si no está almacenado, lo descargamos desde Twemoji.
	const url = new URL(request.url);

	const relativePath = url.pathname.slice(
		TWEMOJI_PATH.length
	);

	const cdnUrl = TWEMOJI_CDN_BASE + relativePath;

	try {
		const response = await fetch(cdnUrl);

		if (response.ok) {
			try {
				await cacheTwemojiResponse(cache, request, response);
				await pruneTwemojiCache(cache);
			} catch (error) {
				console.warn("No se pudo almacenar el emoji:", error);
			}
		}

		return response;

	} catch (error) {
		return Response.error();
	}
}

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
        (async () => {

            // Primero migramos los artículos antiguos.
            await migrateArticles();

            // Después eliminamos las cachés obsoletas.
            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter(key =>
                        key.startsWith(CACHE_PREFIX) &&
                        !CURRENT_CACHES.has(key)
                    )
                    .map(key => caches.delete(key))
            );

            // Finalmente reclamamos los clientes.
            await self.clients.claim();

        })()
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

    const url = new URL(request.url);
    const requestPath = url.pathname;
    const clientId = event.clientId;

    // MERMAID
    if (
        requestPath.startsWith(MERMAID_CHUNKS_PATH) &&
        requestPath.endsWith(".mjs")
    ) {
        event.respondWith(
            (async () => {
                const enabled = await isOfflineEnabled(clientId);

                return enabled
                    ? handleMermaidChunk(request)
                    : fetchMermaidWithoutCache(request);
            })()
        );

        return;
    }

    // TWEMOJI
    if (
        requestPath.startsWith(TWEMOJI_PATH) &&
        requestPath.endsWith(".svg")
    ) {
        event.respondWith(
            (async () => {
                const enabled = await isOfflineEnabled(clientId);

                return enabled
                    ? handleTwemojiRequest(request)
                    : fetchTwemojiWithoutCache(request);
            })()
        );

        return;
    }

    // NAVEGACIONES
    if (request.mode === "navigate") {
	
		// Identificar el inicio de la PWA.
    	if (url.searchParams.get("pwa") === "1") {
    	    event.respondWith((async () => {
    	        const clientId = event.resultingClientId;

    	        await enableOfflineForClient(clientId);

    	        const cache = await caches.open(CACHE_NAME);

    	        try {
    	            const response = await fetch(request);

    	            if (response.ok) {
    	                await cache.put(
    	                    "/index.html",
    	                    response.clone()
    	                );
    	            }

    	            return response;
    	        } catch {
    	            const cached = await cache.match("/index.html");

    	            return cached || createOfflinePage(request, "page");
    	        }
    	    })());

    	    return;
    	}

        // ARTÍCULOS
        if (isArticleRequest(request)) {
            event.respondWith(
                (async () => {
                    const enabled = await inheritOfflineMode(
					    clientId,
					    event.resultingClientId
					);

                    // Navegador normal: solamente red.
					if (!enabled) {
					    return fetch(request);
					}

                    // PWA: red primero y caché como alternativa.
                    const cache = await caches.open(
                        ARTICLES_CACHE_NAME
                    );

                    try {
                        const response = await fetch(request);

                        if (response.ok) {
                            await cacheArticle(
                                cache,
                                request,
                                response
                            );

                            await pruneArticleCache(cache);
                        }

                        return response;

                    } catch {
                        const cached = await cache.match(request);

                        if (cached) {
                            await cacheArticle(
                                cache,
                                request,
                                cached
                            );

                            await pruneArticleCache(cache);

                            return cached;
                        }

                        return createOfflinePage(request, "article");
                    }
                })()
            );

            return;
        }

        // PORTADA: caché offline exclusiva de la PWA.
		if (requestPath === "/" || requestPath === "/index.html") {
		    event.respondWith((async () => {
		        const enabled = await inheritOfflineMode(
				    clientId,
				    event.resultingClientId
				);
			
		        // Navegador normal: solo red.
		        if (!enabled) {
		            return fetch(request);
		        }
			
		        const cache = await caches.open(CACHE_NAME);
			
		        try {
		            const response = await fetch(request);
				
		            if (response.ok) {
		                await cache.put(
		                    "/index.html",
		                    response.clone()
		                );
		            }
				
		            return response;
				
		        } catch {
		            const cached =
		                await cache.match(request) ||
		                await cache.match("/index.html") ||
		                await cache.match("/");
				
		            return cached || createOfflinePage(request, "page");
		        }
		    })());
		
		    return;
		}

		// RESTO DE NAVEGACIONES
		event.respondWith(
		    (async () => {
		        const enabled = await inheritOfflineMode(
				    clientId,
				    event.resultingClientId
				);
			
		        // Navegador normal: solamente red.
		        if (!enabled) {
		            return fetch(request);
		        }
			
		        // PWA: red primero, pantalla offline como alternativa.
		        try {
		            return await fetch(request);
		        } catch {
		            return createOfflinePage(request, "page");
		        }
		    })()
		);

        return;
    }

    // RECURSOS ESTÁTICOS
    event.respondWith(
        (async () => {
			const enabled = await isOfflineEnabled(clientId);

			// Navegador normal: solamente red.
			if (!enabled) {
			    return fetch(request);
			}

			// PWA: estrategia de caché.
			const cache = await caches.open(CACHE_NAME);

            // La PWA utiliza cache-first para los demás recursos.
            const cached = await cache.match(request);

            if (cached) {
                return cached;
            }

            const response = await fetch(request);

            if (response.ok) {
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
