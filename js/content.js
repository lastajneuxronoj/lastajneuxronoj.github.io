function renderEmojiImg(emoji) {
	if (!emoji) return "";

	return twemoji.parse(emoji, {
		folder: "svg",
		ext: ".svg",
		base: "/twemoji/14.0.2/",
	});
}

// COMPROBACIÓN DE DISPONIBILIDAD OFFLINE

const ARTICLES_CACHE_NAME = "lastaj-neuronoj-articles-v1";
const ARTICLE_TTL = 30 * 24 * 60 * 60 * 1000;

async function updateArticleCardAvailability() {
    const cards = document.querySelectorAll(
        ".post-card[data-article-url]"
    );

    // Mientras haya conexión, todas las tarjetas se ven normalmente.
    if (navigator.onLine) {
        cards.forEach(card => {
            card.classList.remove("post-card-unavailable");
        });

        return;
    }

    try {
        const cache = await caches.open(ARTICLES_CACHE_NAME);

        await Promise.all(
            [...cards].map(async card => {
                const response = await cache.match(
                    card.dataset.articleUrl
                );

                const lastAccess = Number(
                    response?.headers.get("X-Lastaj-Last-Access")
                );

                const isAvailable =
                    response &&
                    lastAccess > 0 &&
                    Date.now() - lastAccess <= ARTICLE_TTL;

                card.classList.toggle(
                    "post-card-unavailable",
                    !isAvailable
                );
            })
        );

    } catch (error) {
        console.error(
            "No se pudo comprobar la disponibilidad de los artículos:",
            error
        );

        cards.forEach(card => {
            card.classList.add("post-card-unavailable");
        });
    }
}

// Evitamos registrar los mismos eventos varias veces.
let offlineAvailabilityListenersInitialized = false;

function setupOfflineAvailabilityListeners() {
    if (offlineAvailabilityListenersInitialized) return;

    window.addEventListener(
        "offline",
        updateArticleCardAvailability
    );

    window.addEventListener(
        "online",
        updateArticleCardAvailability
    );

    offlineAvailabilityListenersInitialized = true;
}

function loadPosts() {

	const postList =
		document.getElementById("post-list");

	if (!postList) return;

	postList.innerHTML = "";

	const categorySlug = document.body.dataset.category || null;

	fetch("/json/posts.json")
	.then(res => res.json())
	.then(posts => {

		const lang = getCurrentLang();

		posts
		.filter(post => post.file?.[lang])
		.filter(post => !categorySlug || post.category === categorySlug)
		.forEach(post => {

			const card =
				document.createElement("div");

			card.className = "post-card";

			let media = "";

			// Imagen (con o sin emoji)
			if (post.cover) {

				media = `
					<div class="post-card-media">

						<img
							class="post-card-cover"
							src="${post.cover}"
							alt=""
						>

						${post.emoji ? `
							<div class="post-card-emoji">
								${renderEmojiImg(post.emoji)}
							</div>
						` : ""}

					</div>
				`;

			}

			// Sólo emoji
			else if (post.emoji) {

				media = `
					<div class="post-card-emoji-only">
						${renderEmojiImg(post.emoji)}
					</div>
				`;

			}

			card.innerHTML = `

				<div class="post-main">

					<div class="post-number">
						${post.number || "000"}
					</div>

					<div class="post-content">

						<div class="post-date">
							${post.date || ""}
						</div>

						<div class="post-title-index">
							${post.title[lang]}
						</div>

						<p class="post-excerpt">
							${post.excerpt?.[lang] || ""}
						</p>

					</div>

				</div>

				${media}

			`;

				const articleUrl = `/blog/${post.number}-${lang}.html`;

				card.dataset.articleUrl = articleUrl;

				card.onclick = () => {
					location.href = articleUrl;
				};

			postList.appendChild(card);

		});
		
		setupOfflineAvailabilityListeners();
		updateArticleCardAvailability();
	});
}



function loadAboutContent() {

	const container =
		document.getElementById("about-content");


	if (!container) return;


	const lang = getCurrentLang();


	fetch(`/about_${lang}.html`)
	.then(res => res.text())
	.then(html => {
		container.innerHTML = html;
	});
}