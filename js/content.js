function renderEmojiImg(emoji) {
	if (!emoji) return "";

	return twemoji.parse(emoji, {
		folder: "svg",
		ext: ".svg",
	});
}

function loadPosts() {

	const postList =
		document.getElementById("post-list");

	if (!postList) return;

	postList.innerHTML = "";

	const categorySlug = document.body.dataset.category || null;

	fetch("/posts.json")
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

			card.onclick = () => {
				location.href =
					`/blog/${post.number}-${lang}.html`;
			};

			postList.appendChild(card);

		});
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