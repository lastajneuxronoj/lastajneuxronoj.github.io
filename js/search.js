function renderEmojiImg(emoji) {
	if (!emoji) return "";

	return twemoji.parse(emoji, {
		folder: "svg",
		ext: ".svg",
		base: "/twemoji/14.0.2/",
	});
}

let searchTranslations = { noResults: "Ne estas rezultoj" };

function setupSearch() {
	let searchIndex = [];
	let searchIndexes = {};
	const button = 	document.getElementById("search-switch");
	const overlay = document.getElementById("search-overlay");
	const input = document.getElementById("search-input");
	const results = document.getElementById("search-results");

	if (!button || !overlay || !input || !results) {
		return;
	}

	async function loadSearchIndex(lang) {
		if (searchIndexes[lang]) {
			searchIndex =
				searchIndexes[lang];

			console.log(
				`Índice de búsqueda recuperado de memoria: ${lang}`
			);
			return;
		}

		try {
			const response =
				await fetch(`/search/search-${lang}.json`);

			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}`
				);
			}

			searchIndexes[lang] =
				await response.json();

			searchIndex =
				searchIndexes[lang];

			console.log(
				`Índice de búsqueda cargado: ${lang} (${searchIndex.length} entradas)`
			);

		} catch (error) {
			console.error(
				"Error cargando índice de búsqueda:",
				error
			);
		}
	}

	window.reloadSearchIndex = loadSearchIndex;

function renderResults(matches) {
	results.innerHTML = "";

	if (matches.length === 0) {
		results.innerHTML =
			`
			<div class="search-no-results">
				${searchTranslations.noResults}
			</div>
			`;
		return;
	}


	for (const item of matches) {
		const link = document.createElement("a");

		link.href = item.url;

		link.className = "search-result";


		link.innerHTML =
			`
			<div class="post-card search-card">
				<div class="post-main">
					<div class="post-number">
						${item.number || ""}
					</div>
					<div class="post-content">
						<div class="post-title-index">
							${item.title}
						</div>
					</div>
				</div>
                ${
                    item.cover

                    ?

                    `
                    <div class="post-card-media">
                    	<img
                    		class="post-card-cover"
                    		src="${item.cover}"
                    		alt="">
                    	${
                    		item.emoji
                    		?
                    		`
                    		<div class="post-card-emoji">
                    			${renderEmojiImg(item.emoji)}
                    		</div>
                    		`
                    		:
                    		""
                    	}

                    </div>
                    `
                    :
                    item.emoji
                    ?
                    `
                    <div class="post-card-emoji-only">

                    	${renderEmojiImg(item.emoji)}

                    </div>
                    `
                    :
                    ""
                }
			</div>
			`;
		results.appendChild(link);
	}
}



function search(query) {
	query = normalizeSearchText(query.trim());

	if (!query) {
		results.innerHTML = "";
		return;
	}

	const normalizedQuery =	query.replace(/^0+/, "");

	const matches =
		searchIndex
			.map(item => {
				let score = 0;

				const number =
					String(item.number || "");

				const normalizedNumber =
					number.replace(/^0+/, "");

				const title =
					normalizeSearchText(
						item.title || ""
					);
				
				const excerpt =
					normalizeSearchText(
						item.excerpt || ""
					);


				// Prioridad máxima: ID exacto
				if (
					number === query ||
					normalizedNumber === normalizedQuery
				) {
					score += 100;

				}

				// ID parcial
				else if (
					number.includes(query) ||
					normalizedNumber.includes(normalizedQuery)
				) {

					score += 80;

				}


				// Título
				if (title.startsWith(query)) {

					score += 60;

				}

				else if (title.includes(query)) {

					score += 40;

				}


				// Descripción
				if (excerpt.includes(query)) {

					score += 20;

				}


				return {
					item,
					score
				};

			})

			.filter(result => result.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 10)
			.map(result => result.item);
	renderResults(matches);

}



function openSearch() {
	const header = document.querySelector(".top-bar");

	if (header) {
		const headerHeight = header.offsetHeight;
		overlay.style.paddingTop = `${headerHeight + 20}px`;
	}

	overlay.classList.remove("hidden");
	window.bringModalToFront?.(overlay);
	input.focus();
}

window.openSearch = openSearch;


	function closeSearch() {
		overlay.classList.add("hidden");
		input.blur();
		input.value = "";
		results.innerHTML = "";
	}



	window.closeSearch = closeSearch;

	button.addEventListener(
		"click",
		openSearch
	);



	overlay.addEventListener(
		"click",
		event => {

			if (event.target === overlay) {

				closeSearch();

			}

		}
	);



document.addEventListener(
	"keydown",
	event => {

		const tag =
			event.target.tagName.toLowerCase();


		if (
			event.ctrlKey &&
			event.key.toLowerCase() === "k" &&
			tag !== "input" &&
			tag !== "textarea"
		) {

			event.preventDefault();

			openSearch();

		}


		if (event.key === "Escape") {

			closeSearch();

		}

	}
);



	input.addEventListener(
		"input",
		() => {

			search(input.value);

		}
	);



	loadSearchIndex(document.documentElement.lang || "eo");

}



document.addEventListener("DOMContentLoaded", () => {

	const lang =
		document.documentElement.lang || "eo";

	setupSearchTranslations(lang);

});


document.addEventListener(
	"languageChanged",
	event => {

		const lang = event.detail.lang;

		setupSearchTranslations(lang);

		if (window.reloadSearchIndex) {
			window.reloadSearchIndex(lang);
		}
	}
);

async function setupSearchTranslations(lang) {

	try {
		const response = 
			await fetch("/json/translations.json");

		const translations =
			await response.json();

		const t = translations[lang];

		if (!t) return;

		searchTranslations.noResults =
			t.errors?.noResults ||
			searchTranslations.noResults;

		const input = document.getElementById("search-input");
		const button = document.getElementById("search-switch");
		const placeholder =	t.ui?.search;


		if (input && placeholder) {
			input.placeholder = placeholder;
		}


		if (button && placeholder) {
			button.setAttribute(
				"aria-label",
				placeholder
			);
		}

	} catch (error) {
		console.error(
			"Error cargando traducciones de búsqueda:",
			error
		);
	}
}

// Búsqueda tolerable con y sin acentos o circunflejos
function normalizeSearchText(text) {

	return text

		.toLowerCase()

		// Esperanto x-sistemo
		.replace(/cx/g, "ĉ")
		.replace(/gx/g, "ĝ")
		.replace(/hx/g, "ĥ")
		.replace(/jx/g, "ĵ")
		.replace(/sx/g, "ŝ")
		.replace(/ux/g, "ŭ")

		// Esperanto h-sistemo
		//.replace(/ch/g, "ĉ")
		//.replace(/gh/g, "ĝ")
		//.replace(/hh/g, "ĥ")
		//.replace(/jh/g, "ĵ")
		//.replace(/sh/g, "ŝ")

		// Eliminar acentos y diacríticos
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

}