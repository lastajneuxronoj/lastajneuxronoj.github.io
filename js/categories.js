async function updateCategoriesPage() {

	const lang =
		getCurrentLang();

	const translations =
		await getTranslations();

	const t =
		translations[lang];

	if (!t) {
		return;
	}

	const categoryTitle =
		t.ui?.categories?.title
		|| "Categories";

	const categorySubtitle =
		t.ui?.categories?.subtitle
		|| categoryTitle;

	const titleElement =
		document.querySelector(
			".post-section-title"
		);

	if (titleElement) {

		titleElement.textContent =
			categorySubtitle;
	}

	const bgElement =
		document.querySelector(
			".section-title-bg"
		);

	if (bgElement) {

		bgElement.textContent =
			categoryTitle;
	}

	const response =
		await fetch(
			"/blog/categories/categories.json"
		);

	const categories =
		await response.json();

	const grid =
		document.getElementById(
			"categories-grid"
		);

	if (!grid) {
		return;
	}

	grid.innerHTML = "";

	for (
		const [slug, category]
		of Object.entries(categories)
	) {

		const count =
			category.count?.[lang]
			|| 0;

			console.log(slug, lang, count);

		// Ocultar categorías sin posts
		// en el idioma actual
		if (count === 0) {
			continue;
		}

		const categoryName =
			t.ui?.categories?.names?.[slug]
			|| slug;

		const emoji =
			category.emoji
			|| "📁";

		const description =
			category.description?.[lang]
			|| "";

		const card =
			document.createElement("a");

		card.className =
			"post-card";

		card.href =
			`/blog/categories/${slug}.html`;

		card.innerHTML = `
			<div class="post-main">

				<div class="category-number">
					( ${count} )
				</div>

				<div class="post-content">

					<div class="post-title-index">
						${categoryName}
					</div>

					<p class="post-excerpt">
						${description}
					</p>

				</div>

			</div>

			<div class="post-card-emoji-only">
				${emoji}
			</div>
		`;

		grid.appendChild(card);
	}

	if (window.twemoji) {

		twemoji.parse(
			grid,
			{
				folder: "svg",
				ext: ".svg"
			}
		);
	}
}



document.addEventListener(
	"DOMContentLoaded",
	updateCategoriesPage
);

window.addEventListener(
	"languageChanged",
	updateCategoriesPage
);