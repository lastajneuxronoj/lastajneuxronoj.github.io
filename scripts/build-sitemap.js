/**
 * Genera sitemap.xml para motores de búsqueda.
 *
 * Fuentes:
 * - posts.json
 * - sitemap-extra.json
 *
 * Salida:
 * - sitemap.xml
 */

const fs = require("fs/promises");
const { POSTS_JSON_PATH,
        PAGES_JSON_PATH,
        SITEMAP_PATH,
        SITEMAP_EXTRA_PATH,
        SITE_URL
     } = require("./config");

async function main() {

	const posts = JSON.parse(
		await fs.readFile(
			POSTS_JSON_PATH,
			"utf-8"
		)
	);

	const pages = JSON.parse(
		await fs.readFile(
			PAGES_JSON_PATH,
			"utf-8"
		)
	);

	await buildSitemap(posts, pages);

}

async function buildSitemap(posts, pages) {

	const urls = [];

	const siteUrl =
		SITE_URL.replace(/\/$/, "");


	// =========================
	// Página principal
	// =========================

	urls.push(`
		<url>
			<loc>${siteUrl}/</loc>
		</url>
	`);


	// =========================
	// Índice del blog
	// =========================

	urls.push(`
		<url>
			<loc>${siteUrl}/blog/</loc>
		</url>
	`);


	// =========================
	// Posts generados
	// =========================

	posts.forEach(post => {

		Object.keys(post.file || {})
			.forEach(lang => {

				urls.push(`
		<url>
			<loc>${siteUrl}/blog/${post.number}-${lang}.html</loc>
			<lastmod>${post.date}</lastmod>
		</url>
				`);

			});

	});


	// =========================
	// Páginas estáticas
	// =========================

	pages.forEach(page => {

		Object.keys(page.file || {})
			.forEach(lang => {

				urls.push(`
		<url>
			<loc>${siteUrl}/${page.id}-${lang}.html</loc>
		</url>
				`);

			});

	});

	// =========================
	// Índice de categorías
	// =========================

	urls.push(`
		<url>
			<loc>${siteUrl}/blog/categories/</loc>
		</url>
	`);


	// =========================
	// Páginas de categorías
	// =========================
	const categories = new Set();

	posts.forEach(post => {

		if (!post.category)
			return;

		categories.add(post.category);

	});

	for (const category of categories) {

		urls.push(`
			<url>
				<loc>${siteUrl}/blog/categories/${category}.html</loc>
			</url>
		`);

	}


	// =========================
	// URLs adicionales manuales
	// =========================

	try {

		const extraPages = JSON.parse(
			await fs.readFile(
				SITEMAP_EXTRA_PATH,
				"utf-8"
			)
		);


		extraPages.forEach(page => {

			urls.push(`
		<url>
			<loc>${siteUrl}/${page.path.replace(/^\//, "")}</loc>
			${page.lastmod
				? `<lastmod>${page.lastmod}</lastmod>`
				: ""}
		</url>
			`);

		});


	} catch {

		console.log(
			"⚠ No se encontró sitemap-extra.json"
		);

	}


	// =========================
	// Crear XML
	// =========================

	const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
	xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls.join("\n")}

</urlset>
`;


	await fs.writeFile(
		SITEMAP_PATH,
		sitemap.trim(),
		"utf-8"
	);


	console.log(
		`✔ ${SITEMAP_PATH}`
	);

}

module.exports = {
	buildSitemap
};

if (require.main === module) {
	main().catch(console.error);
}