#!/usr/bin/env node
/**
 * build-posts.js
 * Genera las páginas HTML del sitio a partir de los
 * archivos Markdown y los metadatos definidos en posts.json
 * y pages.json.
 *
 * Salida:
 * - blog/*.html
 *
 * Requiere: npm install marked
 * Uso: node build-posts.js
 */

/**
 * Pipeline de generación:
 *
 * Markdown
 *   ↓
 * preprocessReferences()
 *   ↓
 * marked.parse()
 *   ↓
 * KaTeX + referencias
 *   ↓
 * Twemoji
 *   ↓
 * plantilla HTML
 *
 * El orden es importante.
 */

const fs = require("fs/promises");
const path = require("path");
const { marked } = require("marked");
const katex = require("katex");
const twemoji = require("@twemoji/api");
const cheerio = require("cheerio");
const hljs = require("highlight.js");
const slugify = require('slugify');
const { preprocessCallouts } = require("./callouts");


const ROOT = path.resolve(__dirname, "..");

const {generateStatistics} = require("./stats");
const {POSTS_JSON_PATH, PAGES_JSON_PATH, OUTPUT_DIR} = require("./config");

const TRANSLATIONS_JSON_PATH = path.join(ROOT, "translations.json");

const POSTS_MD_DIR = path.join(ROOT, "posts");
const ABOUT_MD_DIR = path.join(ROOT, "posts");

const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const SITEMAP_EXTRA_PATH = path.join(ROOT, "sitemap-extra.json");

const SITE_NAME = "Lastaj Neŭronoj";
const SITE_URL = "https://lastajneuxronoj.github.io/";

function buildPageTitle(title) {
	return `${title} | ${SITE_NAME}`;
}

// Función de metadatos para SEO
function buildSEOData({
	title,
	description = "",
	url,
	lang,
	availableLangs = [],
	alternates = {},
	type = "WebPage",
	image = ""
}) {

	const hreflang = Object.entries(alternates)
		.map(([lang, href]) =>
			`<link rel="alternate" hreflang="${lang}" href="${href}">`
		)
		.join("\n");


	const jsonLD = JSON.stringify({
		"@context": "https://schema.org",
		"@type": type,
		"headline": title,
		"name": title,
		"description": description,
		"url": url,
		"inLanguage": lang,
		"publisher": {
			"@type": "Organization",
			"name": SITE_NAME
		}
	});


	return {
		description,
		url,
		hreflang,
		jsonLD,
		ogTitle: title,
		ogDescription: description,
		ogType: type === "BlogPosting" ? "article" : "website",
		ogUrl: url,
		ogLocale: lang,
		ogImage: image ? `${SITE_URL}${image}` : "",
		twitterCard: "summary_large_image",
		twitterTitle: title,
		twitterDescription: description,
		twitterImage: image ? `${SITE_URL}${image}` : "",
	};
}

// Cuenta referencias
function parseAttributes(attrs = "") {

	const idMatch = attrs.match(
		/#\s*([a-z]+:[a-zA-Z0-9_-]+)/
	);

	const titleMatch = attrs.match(
		/title\s*=\s*"([^"]*)"/
	);

	return {
		label: idMatch ? idMatch[1] : null,
		title: titleMatch ? titleMatch[1] : ""
	};
}

function preprocessReferences(markdown) {
	let equationNumber = 0;
	let figureNumber = 0;
	let tableNumber = 0;
	let codeNumber = 0;

	const referenceMap = {};

	// Ecuaciones
	markdown = markdown.replace(
		/\$\$([\s\S]*?)\$\$\s*\{([^}]*)\}/g,
		(_, formula, attrs) => {

			const {label, title} = parseAttributes(attrs);

			if (!label) return _;

			equationNumber++;

			referenceMap[label] = {
				type: "eq",
				number: equationNumber,
				formula: formula.trim(),
				description: title
			};

			return `@@REF:${label}@@`;
		}
	);

	// Figuras
	markdown = markdown.replace(
		/!\[([^\]]*)\]\(([^)]+)\)\s*\{([^}]*)\}/g,
		(_, alt, src, attrs) => {

			const {label, title} = parseAttributes(attrs);

			if (!label || !label.startsWith("fig:")) {
				return _;
			}

			figureNumber++;

			referenceMap[label] = {
				type: "fig",
				number: figureNumber,
				alt,
				src,
				description: title
			};

			return `@@REF:${label}@@`;
		}
	);

	// Tablas: {#tbl:xxx} Descripción opcional
	markdown = markdown.replace(
		/\{([^}]*)\}/g,
		(match, attrs) => {

			const {label, title} = parseAttributes(attrs);

			if (!label || !label.startsWith("tbl:")) {
				return match;
			}

			tableNumber++;

			referenceMap[label] = {
				type: "tbl",
				number: tableNumber,
				description: title
			};

			return `@@REF:${label}@@`;
		}
	);

	// Código
	// Bloques de código con referencia
	markdown = markdown.replace(
		/```(\w+)?\s*\{([^}]*)\}\s*\n([\s\S]*?)```/g,
		(_, language, attrs, code) => {
		
			const {label, title} = parseAttributes(attrs);
		
			if (!label || !label.startsWith("code:")) {
				return _;
			}
		
			codeNumber++;
		
			referenceMap[label] = {
				type: "code",
				number: codeNumber,
				language: language || "",
				code: code.trim(),
				description: title
			};
		
			return `@@REF:${label}@@`;
		}
	);

	return { markdown, referenceMap };
}

function renderReferences(html, referenceMap = {}, lang, translations) {
	const labels = translations?.[lang]?.references || {
		equation: "Ekvacio",
		figure: "Figuro",
		table: "Tabelo",
		code: "Kodo"
	};
	// Inline math
	html = html.replace(
			/\$([^$\n]+)\$/g,
			(_, formula) => {
				return katex.renderToString(
					formula.trim(),
					{ displayMode: false, throwOnError: false }
				);
			}
		);

	// Plantilla del sistema de referencias
	html = html.replace(
		/@@REF:([a-z]+:[a-zA-Z0-9_-]+)@@/g,
		(_, label) => {

			const ref = referenceMap[label];
			if (!ref) return label;

			const id = label.replace(":", "-");

			switch (ref.type) {

				case "eq":
					return `
					<div class="equation-block" id="${id}">
						<div class="equation-content">
							${katex.renderToString(ref.formula, {
								displayMode: true,
								throwOnError: false
							})}
						</div>
						<div class="equation-number">${labels.equation} ${ref.number}${ref.description ? `: ${ref.description}` : ""}</div>
					</div>
					`;

				case "fig":
					return `
					<figure id="${id}">
						<img src="${ref.src}" alt="${ref.alt}">
						<figcaption class="figure-caption">
							${labels.figure} ${ref.number}${ref.description ? `: ${ref.description}` : ""}
						</figcaption>
					</figure>
					`;

				case "tbl":
					return `
					<div class="table-anchor" data-table-id="${id}"></div>
					<figcaption class="table-caption">
						${labels.table} ${ref.number}${ref.description ? `: ${ref.description}` : ""}
					</figcaption>
					`;

case "code":
	return `
<figure class="code-block" id="${id}">
<pre><code class="language-${ref.language}">${escapeHTML(ref.code)}</code></pre>
<figcaption class="code-caption">${labels.code} ${ref.number}${ref.description ? `: ${ref.description}` : ""}</figcaption>
</figure>
`;
			}
		}
	);

	return html;
}

function replaceReferences(html, referenceMap, lang, translations) {

	const labels = translations[lang].references;

	return html.replace(
		/@([a-z]+:[a-zA-Z0-9_-]+)/g,
		(_, label) => {

			const ref = referenceMap[label];
			if (!ref) return label;

			const id = label.replace(":", "-");

			switch (ref.type) {
				case "eq":
					return `<a href="#${id}" title="${ref.description || ""}">${labels.equation} ${ref.number}</a>`;
				case "fig":
					return `<a href="#${id}">${labels.figure} ${ref.number}</a>`;
				case "tbl":
					return `<a href="#${id}">${labels.table} ${ref.number}</a>`;
				case "code":
					return `<a href="#${id}" title="${ref.description || ""}">${labels.code} ${ref.number}</a>`;
			}
		}
	);
}

// =========================
// MAIN
// =========================

function loadTemplate(name) {
	return fs.readFile(path.join(ROOT, "templates", name), "utf-8");
}

function renderTemplate(template, data) {
	let out = template;

	for (const [key, value] of Object.entries(data)) {
		out = out.replaceAll(`{{${key}}}`, value ?? "");
	}

	return out;
}

async function buildSitemap(posts) {
	const urls = [];

	// Página principal
	urls.push(`
		<url>
			<loc>${SITE_URL}</loc>
		</url>
	`);

	// Posts generados
	posts.forEach(post => {
		Object.keys(post.file || {}).forEach(lang => {
			urls.push(`
		<url>
			<loc>${SITE_URL}blog/${post.number}-${lang}.html</loc>
			<lastmod>${post.date}</lastmod>
		</url>
			`);
		});
	});


	// Páginas estáticas adicionales
	try {
		const extraPages = JSON.parse(
			await fs.readFile(SITEMAP_EXTRA_PATH, "utf-8")
		);

		extraPages.forEach(page => {
			urls.push(`
		<url>
			<loc>${SITE_URL}${page.path.replace(/^\//, "")}</loc>
			${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ""}
		</url>
			`);
		});

	} catch {
		console.log("⚠ No se encontró sitemap-extra.json");
	}


	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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

	console.log(`✔ ${SITEMAP_PATH}`);
}

async function main() {
	const posts = JSON.parse(await fs.readFile(POSTS_JSON_PATH, "utf-8"));
	const translations = JSON.parse(await fs.readFile(TRANSLATIONS_JSON_PATH, "utf-8"));
	const pages = JSON.parse(await fs.readFile(PAGES_JSON_PATH, "utf-8"));

	await fs.mkdir(OUTPUT_DIR, { recursive: true });

	// agrupar por idioma
	const byLang = {};
	posts.forEach((post) => {
		Object.keys(post.file || {}).forEach((lang) => {
			byLang[lang] = byLang[lang] || [];
			byLang[lang].push(post);
		});
	});

	console.log("\n--- Entradas de blog ---");
	let generatedPosts = 0;
	let generatedPages = 0;
	let warnings = 0;
	const postStats = [];

	// =========================
	// POSTS
	// =========================
	for (const [lang, langPosts] of Object.entries(byLang)) {
		for (let i = 0; i < langPosts.length; i++) {
			const post = langPosts[i];
			const prevPost = langPosts[i + 1];
			const nextPost = langPosts[i - 1];

			const mdPath = path.join(POSTS_MD_DIR, post.file[lang]);
			const md = await fs.readFile(mdPath, "utf-8");

			const htmlContent = renderMarkdownContent(
				md,
				lang,
				translations
			);

			const readingTime = estimateReadingTime(htmlContent);

			const words = countWords(htmlContent);

			postStats.push({
				number: post.number,
				lang,
				author_id: post.author_id || "unknown",
				words,
				readingMinutes: Math.ceil(words / 200)
			});

			const coverImage = await findCoverImage(post.number);

			const html = await renderPage({
				type: "post",
				data: {
					post,
					lang,
					htmlContent,
					readingTime,
					prevPost,
					nextPost,
					translations,
					availableLangs: Object.keys(post.file),
					coverImage,
				},
			});

			const outPath = path.join(OUTPUT_DIR, `${post.number}-${lang}.html`);
			await fs.writeFile(outPath, html, "utf-8");

			console.log(`✔ Post generado: ${outPath}`);
			generatedPosts++;
	
		}
	}

	// =========================
	// STATIC PAGES
	// =========================

	console.log("\n--- Páginas estáticas ---");

	generatedPages = await buildStaticPages(
		pages,
		translations
	);

	await buildSitemap(posts);

	generateStatistics(
	posts,
	pages,
	postStats,
	generatedPosts,
	generatedPages,
	warnings
);

	console.log("==============================\n");
	}


// =========================
// STATIC BUILDER
// =========================

async function buildStaticPages(pages, translations) {

	let generated = 0;

	for (const page of pages) {

		const availableLangs = Object.keys(page.file);

		for (const lang of availableLangs) {

			const mdPath = path.join(
				ROOT,
				"posts",
				page.file[lang]
			);

			try {
				await fs.access(mdPath);
			} catch {
				warnings++;
				console.warn(`⚠ Archivo faltante: ${mdPath}`);
				continue;
			}

			const md = await fs.readFile(mdPath, "utf-8");

			const htmlContent = renderMarkdownContent(
				md,
				lang,
				translations
			);

			const coverImage = await findCoverImage(page.id);
			const html = await renderPage({
				type: "page",
				data: {
					page,
					lang,
					htmlContent,
					translations,
					availableLangs,
					coverImage,
				},
			});

			const outPath = path.join(
				ROOT,
				`${page.id}-${lang}.html`
			);

			await fs.writeFile(
				outPath,
				html,
				"utf-8"
			);

			generated++;

			console.log(`✔ Página generada: ${outPath}`);

		}
	}

	return generated;
}


// =========================
// RENDER SYSTEM
// =========================

// Devuelve solo el <img> del emoji del cover (o "" si no hay)
function renderEmojiImg(emoji) {
	if (!emoji) return "";

	return twemoji.parse(emoji, {
		folder: "svg",
		ext: ".svg",
	});
}

function renderMarkdownContent(md, lang, translations) {

	// Extensiones Markdown propias
	let processedMarkdown = preprocessCallouts(md, translations[lang]);

	const {
		markdown,
		referenceMap
	} = preprocessReferences(processedMarkdown);

	// Markdown → HTML
	let html = marked.parse(markdown);

	// Renderizar KaTeX y bloques con referencias
	html = renderReferences(
		html,
		referenceMap,
		lang,
		translations
	);

	// Envolver tablas
	html = html.replace(
		/<table[\s\S]*?<\/table>\s*(?:<p>)?\s*<div class="table-anchor" data-table-id="([^"]+)"><\/div>\s*(?:<\/p>)?/g,
		(match, id) => {

			const table = match
				.replace(/<div class="table-anchor"[\s\S]*?<\/div>/, "")
				.replace(/<\/?p>/g, "")
				.trim();

			return `
			<div class="table-wrapper" id="${id}">
				${table}
			</div>`;
		}
	);

	// Reemplazar referencias
	html = replaceReferences(
		html,
		referenceMap,
		lang,
		translations
	);

	// Twemoji al final
	html = renderTwemojiContent(html);

	// Código
	html = addCodeLanguageLabels(html);
	html = highlightCodeBlocks(html);
	html = addLineNumbers(html);

	html = processHeadings(html);

	return html;
}


// Texto de bloque de código con formato
function highlightCodeBlocks(html) {
  const $ = cheerio.load(html);

  $("pre code").each((_, element) => {
    const el = $(element);
    const code = el.text();

    const className = el.attr("class") || "";
    const match = className.match(/language-([a-zA-Z0-9_-]+)/);
    const languageId = match ? match[1] : null;

    const highlighted = languageId && hljs.getLanguage(languageId)
      ? hljs.highlight(code, { language: languageId })
      : hljs.highlightAuto(code);

    el.addClass(`hljs ${highlighted.language || ""}`.trim());
    el.html(highlighted.value);
  });

  return $.html();
}

function addLineNumbers(html) {
  const $ = cheerio.load(html);

  $("pre > code").each((_, code) => {
    const el = $(code);
    const text = el.text();
    const lineCount = text.replace(/\n$/, "").split("\n").length;

    const rows = Array.from({ length: lineCount }, () => "<span></span>").join("");

    el.parent().addClass("has-line-numbers");
    el.before(`<span class="line-numbers-rows" aria-hidden="true">${rows}</span>`);
  });

  return $.html();
}

function addCodeLanguageLabels(html) {

	const $ = cheerio.load(html);

	const languageNames = {
		js: "JavaScript",
		ts: "TypeScript",
		r: "R",
		py: "Python",
		bash: "Bash",
		sh: "Shell",
		html: "HTML",
		css: "CSS",
		json: "JSON",
		sql: "SQL",
		yaml: "YAML",
		md: "Markdown"
	};

	$("pre").each((_, pre) => {

		const code = $(pre).find("code");

		if (!code.length) return;

		const className = code.attr("class") || "";
		const match = className.match(/language-([a-zA-Z0-9_-]+)/);

		if (!match) return;

		const languageId = match[1].toLowerCase();

		const language =
			languageNames[languageId] || match[1];

		$(pre).before(
		  `<div class="code-language">
		    <span class="code-language-name">${language}</span>
		    <button type="button" class="copy-button" aria-label="Copiar código">
		      <i class="ti ti-copy" aria-hidden="true"></i>
		    </button>
		  </div>`
		);

	});

	return $.html();
}

// Renderiza emojis dentro del post
function renderTwemojiContent(html) {

	const $ = cheerio.load(html);

	$("*").each((_, element) => {

		// Ignorar bloques de código
		if ($(element).closest("pre, code").length > 0) {
			return;
		}

		const content = $(element).html();

		if (!content) {
			return;
		}

		$(element).html(
			twemoji.parse(content, {
				folder: "svg",
				ext: ".svg",
			})
		);

	});

	return $.root().html();
}

// Arma el bloque de portada: imagen + badge de emoji superpuesto
function renderCover({ image, emoji }) {
	const emojiImg = renderEmojiImg(emoji);
	const hasImage = Boolean(image);
	const hasEmoji = Boolean(emojiImg);

	const imageTag = hasImage
		? `<img src="/${image}" alt="" class="post-cover-image">`
		: "";

	const badgeTag = hasEmoji
		? `<div class="post-emoji-badge">${emojiImg}</div>`
		: "";

	// Caso 1: imagen + emoji → badge superpuesto sobre el borde
	if (hasImage && hasEmoji) {
		return `
<div class="post-cover has-image has-emoji">
	${imageTag}
	${badgeTag}
</div>`;
	}

	// Caso 2: solo imagen → sin badge
	if (hasImage && !hasEmoji) {
		return `
<div class="post-cover has-image">
	${imageTag}
</div>`;
	}

	// Caso 3: solo emoji → badge suelto, sin imagen ni superposición
	if (!hasImage && hasEmoji) {
		return `
<div class="post-cover has-emoji">
	${badgeTag}
</div>`;
	}

	// Caso 4: nada → no se renderiza contenedor alguno
	return "";
}


//Busca imagen de portada
const COVERS_DIR = path.join(ROOT, "covers");
const COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

async function findCoverImage(id) {
	for (const ext of COVER_EXTENSIONS) {
		const filePath = path.join(COVERS_DIR, `${id}.${ext}`);

		try {
			await fs.access(filePath);
			return `covers/${id}.${ext}`; // ruta relativa, para usar en src/og:image
		} catch {
			// no existe con esta extensión, prueba la siguiente
		}
	}

	return null; // no hay portada para este id
}

function escapeHTML(text = "") {
	return text
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeJSON(text = "") {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n");
}

async function renderPage({ type, data }) {
	
	// Renderizar la página como post
	if (type === "post") {
			const template = await loadTemplate("post.html");

			const meta = [
				data.post.date,
				data.post.type?.[data.lang],
				data.post.author?.[data.lang]
			]

			.filter(Boolean)
			.join(" | ");

			const url = `${SITE_URL}blog/${data.post.number}-${data.lang}.html`;

			const seo = buildSEOData({
				title: data.post.title[data.lang],
				description: data.post.excerpt?.[data.lang] || "",
				url,
				lang: data.lang,
				type: "BlogPosting",
				image: data.coverImage || "",
				alternates: Object.fromEntries(
					data.availableLangs.map(lang => [
						lang,
						`${SITE_URL}blog/${data.post.number}-${lang}.html`
					])
				)
			});

			const langMap = {};

			data.availableLangs.forEach((lang) => {
				langMap[lang] = `/blog/${data.post.number}-${lang}.html`;
			});

			const titles = {};

			data.availableLangs.forEach((lang) => {
				titles[lang] = data.post.title[lang];
			});

				// Navegación entre posts
			const navControls = `
				<div class="post-nav-controls">
					${
						data.prevPost
							? `<a class="post-nav prev-post" href="/blog/${data.prevPost.number}-${data.lang}.html">
								<span>← ${data.translations[data.lang].post.previousPost}</span>
								<strong>${data.prevPost.title[data.lang]}</strong>
							</a>`
							: ""
					}
				
					${
						data.nextPost
							? `<a class="post-nav next-post" href="/blog/${data.nextPost.number}-${data.lang}.html">
								<span>${data.translations[data.lang].post.nextPost} →</span>
								<strong>${data.nextPost.title[data.lang]}</strong>
							</a>`
							: ""
					}
				</div>
			`;

			const coverHtml = renderCover({
				image: data.coverImage,
				emoji: data.post.emoji,
			});

			return renderTemplate(template, {
				lang: data.lang,
				title: buildPageTitle(data.post.title[data.lang]),
				postTitle: data.post.title[data.lang],
				cover: coverHtml,
				number: data.post.number,
				date: data.post.date,
				meta,
				readingTime: data.readingTime,
				readingLabel: data.translations[data.lang]?.reading_time || "",
				body: data.htmlContent,
				backToHome: data.translations[data.lang].backToHome,
				langMap: JSON.stringify(langMap),
				navControls,
				availableLangs: data.availableLangs.join(","),
				titles: JSON.stringify(titles).replace(/"/g, "&quot;"),
				...seo,
			});
		}

		// Renderizar la página como page
		if (type === "page") {
			const template = await loadTemplate(`${data.page.template || "page"}.html`
);
		
			const url = `${SITE_URL}${data.page.id}-${data.lang}.html`;
		
			const langMap = {};
		
			data.availableLangs.forEach(lang => {
				langMap[lang] = `/${data.page.id}-${lang}.html`;
			});
		
			const seo = buildSEOData({
				title: data.page.title[data.lang],
				description: data.page.description?.[data.lang] || "",
				url,
				lang: data.lang,
				type: data.page.id === "about" ? "AboutPage" : "WebPage",
				image: data.coverImage || "",   // <-- actualizado
				alternates: Object.fromEntries(
					data.availableLangs.map(lang => [
						lang,
						`${SITE_URL}${data.page.id}-${lang}.html`
					])
				)
			});
		
			const coverHtml = renderCover({
				image: data.coverImage,
				emoji: data.page.emoji,
			});

			return renderTemplate(template, {
				lang: data.lang,
				title: buildPageTitle(data.page.title[data.lang]),
				cover: coverHtml,
				...seo,
			
				langMap: JSON.stringify(langMap),
			
				body: data.htmlContent,
			
				section_bg: data.page.section_bg?.[data.lang] || "",
				section_title: data.page.section_title?.[data.lang] || "",
			
				backToHome: data.translations[data.lang].backToHome
			});
		}

	throw new Error("Unknown type: " + type);
}

// Calcula tiempo estimado en minutos de lectura de un HTML, considerando el texto visible y el texto dentro de los elementos <details> (desplegables).
function estimateReadingTime(html) {
	// Extraer texto visible
	const normalText = html
		.replace(/<details[\s\S]*?<\/details>/gi, "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Extraer texto dentro de desplegables
	const detailsText = [...html.matchAll(/<details[\s\S]*?<\/details>/gi)]
		.map(match => match[0])
		.join(" ")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();


	const countWords = text =>
		text ? text.split(/\s+/).length : 0;


	const normalWords = countWords(normalText);
	const detailsWords = countWords(detailsText);


	const wordsPerMinute = 200;


	const normalTime = Math.ceil(normalWords / wordsPerMinute);
	const detailsTime = Math.ceil(detailsWords / wordsPerMinute);


	if (detailsTime > 0) {
		return `${normalTime}–${normalTime + detailsTime} min`;
	}

	return `${normalTime} min`;
}

function countWords(html) {
	const text = html
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return text
		? text.split(/\s+/).length
		: 0;
}

function processHeadings(html) {

	const $ = cheerio.load(html);
	const toc = [];
	
	$("h2, h3, h4").each((i, el) => {
	
		const text = $(el).text();
	
		const id = slugify(text, {
			lower: true,
			strict: true
		});
	
		$(el).attr("id", id);
	
		toc.push({
			text,
			id,
			level: Number(el.tagName.substring(1))
		});
	
	});

	const tocHtml = `
	<nav class="toc-sidebar">
		${toc.map(item => `
			<a
				href="#${item.id}"
				class="toc-item level-${item.level}"
				data-title="${item.text}"
				data-target="${item.id}">
			</a>
		`).join("")}
	</nav>
	`;

		if (toc.length > 0) {
		$("body").append(tocHtml);
	}
	
	return $.html();

}

// =========================
// RUN
// =========================

main().catch((err) => {
	console.error("Error generando posts:", err);
	process.exit(1);
});