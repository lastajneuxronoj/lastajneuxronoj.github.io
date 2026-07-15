const fs = require("fs/promises");
const path = require("path");

const slugify = require("slugify");

const {
	OUTPUT_DIR,
	CATEGORIES_META_PATH,
	SITE_URL
} = require("./config");

const {
	loadTemplate,
	renderTemplate
} = require("./utils/template");

const { buildPageTitle } = require("./utils/seo")

const { buildSEOData } = require("./utils/seo");

//Crea .json de categorías
async function buildJsonCategories(posts) {

	let meta = {};

	try {

		meta = JSON.parse(
			await fs.readFile(
				CATEGORIES_META_PATH,
				"utf-8"
			)
		);
	}
	catch {

		console.warn(
			"⚠ No se encontró categories-meta.json"
		);
	}


	const categories = {};
	const warned = new Set();


	for (const post of posts) {

		if (!post.category) {
			continue;
		}


		const slug = post.category;


		if (!categories[slug]) {

			categories[slug] = {
				count: {}
			};


			// Añadir metadatos opcionales
			if (meta[slug]) {

				Object.assign(
					categories[slug],
					meta[slug]
				);

			}
			else if (!warned.has(slug)) {

				console.warn(
					`⚠ Categoría sin metadatos: ${slug}`
				);

				warned.add(slug);
			}
		}


		for (const lang of Object.keys(post.file || {})) {

			if (!categories[slug].count[lang]) {

				categories[slug].count[lang] = 0;
			}

			categories[slug].count[lang]++;
		}
	}


	const outDir = path.join(
		OUTPUT_DIR,
		"categories"
	);


	await fs.mkdir(
		outDir,
		{
			recursive: true
		}
	);


	const outPath = path.join(
		outDir,
		"categories.json"
	);


	await fs.writeFile(
		outPath,
		JSON.stringify(
			categories,
			null,
			2
		),
		"utf-8"
	);


	console.log(
		`✔ Índice de categorías generado: ${outPath}`
	);


	return categories;
}

// Crea el índice de categorías
async function buildCategoriesIndex(
	translations
) {

	const defaultLang =
		Object.keys(translations)[0]
		|| "es";

	const categoryLabel =
		translations[defaultLang]
			?.ui
			?.categories
			?.title
		|| "Categorías";

	const template =
		await loadTemplate(
			"categories.html"
		);

	const url =
		`${SITE_URL}blog/categories/`;

	const seo = buildSEOData({
		title: categoryLabel,
		description: "",
		url,
		lang: defaultLang,
		type: "CollectionPage"
	});

	const rssLink = `
		<link
			rel="alternate"
			type="application/rss+xml"
			title="Lastaj Neŭronoj - ${defaultLang}"
			href="/rss-${defaultLang}.xml">
	`;

	const html = renderTemplate(
		template,
		{
			lang: defaultLang,

			title: buildPageTitle(
				categoryLabel
			),

			...seo,

			section_bg:
				categoryLabel,

			section_title:
				categoryLabel,

			rssLink
		}
	);

	const outDir =
		path.join(
			OUTPUT_DIR,
			"categories"
		);

	await fs.mkdir(
		outDir,
		{
			recursive: true
		}
	);

	const outPath =
		path.join(
			outDir,
			"index.html"
		);

	await fs.writeFile(
		outPath,
		html,
		"utf-8"
	);

	console.log(
		`✔ Índice de categorías generado: ${outPath}`
	);

	return 1;
}


// Crea páginas de categorías
async function buildCategoryPages(posts, translations) {

	let generated = 0;

	const categorySlugs = new Set();
	const categoryLangs = {};

	posts.forEach(post => {

		if (!post.category) {
			return;
		}

		categorySlugs.add(
			post.category
		);

		categoryLangs[post.category] ??=
			new Set();

		Object.keys(post.file || {})
			.forEach(lang => {

				categoryLangs[
					post.category
				].add(lang);

			});
	});

	const template =
		await loadTemplate(
			"category.html"
		);

	const defaultLang =
		Object.keys(translations)[0] || "es";

	for (const categorySlug of categorySlugs) {

		const categoryLabel =
			translations[defaultLang]
				?.ui
				?.categories
				?.title
			|| "Categorías";

		const url =
			`${SITE_URL}categories/${categorySlug}.html`;

		const seo = buildSEOData({
			title: `${categoryLabel}: ${categorySlug}`,
			description: "",
			url,
			lang: defaultLang,
			type: "CollectionPage"
		});

		const rssLink = `
			<link
				rel="alternate"
				type="application/rss+xml"
				title="Lastaj Neŭronoj - ${defaultLang}"
				href="/rss-${defaultLang}.xml">
		`;

		const html = renderTemplate(
			template,
			{
				lang: defaultLang,

				title: buildPageTitle(
					`${categoryLabel}: ${categorySlug}`
				),

				...seo,

				section_bg:
					categoryLabel,

				section_title:
					categorySlug,

				categorySlug,

				categoryAvailableLangs:
					[
						...(categoryLangs[
							categorySlug
						] || [])
					].join(","),

				titleId: slugify(
					categorySlug,
					{
						lower: true,
						strict: true
					}
				),

				rssLink
			}
		);

		const outDir =
			path.join(
				OUTPUT_DIR,
				"categories"
			);

		await fs.mkdir(
			outDir,
			{
				recursive: true
			}
		);

		const outPath =
			path.join(
				outDir,
				`${categorySlug}.html`
			);

		await fs.writeFile(
			outPath,
			html,
			"utf-8"
		);

		console.log(
			`✔ Página de categoría generada: ${outPath}`
		);

		generated++;
	}

	return generated;
}

module.exports = {
	buildJsonCategories,
	buildCategoriesIndex,
	buildCategoryPages,
};