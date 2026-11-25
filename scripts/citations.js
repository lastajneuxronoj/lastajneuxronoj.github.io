"use strict";

const cheerio = require("cheerio");

function preprocessApaBibliography(markdown) {
	return markdown.replace(
		/^(\s*[-*+]\s*)\[bib:([a-z0-9][a-z0-9-]*)\]\s*/gim,
		(_, prefix, key) => `${prefix}<span class="apa-bibliography-key" data-apa-key="${key}"></span>`
	);
}

/**
 * Extrae las notas a una columna independiente. Los párrafos originales
 * permanecen como elementos <p> directos de .post-content, sin clones ni
 * envoltorios individuales. Cada párrafo genera una sola tarjeta agrupada.
 */
function renderApaCitations(html, { warn = console.warn } = {}) {
	const $ = cheerio.load(html);
	const bibliography = new Map();

	$(".apa-bibliography-key").each((_, marker) => {
		const key = $(marker).attr("data-apa-key");
		const item = $(marker).closest("li");
		if (!key || !item.length) {
			warn("[APA] La marca bibliográfica debe estar dentro de una lista.");
			return;
		}
		if (bibliography.has(key)) {
			warn(`[APA] Clave bibliográfica duplicada: ${key}`);
			return;
		}
		item.attr("id", `bib-${key}`);
		$(marker).remove();
		bibliography.set(key, item);
	});

	$(".apa-citation-row, .apa-citation-layout").remove();

	// Sin citas en el artículo: conserva el flujo y el aspecto anteriores.
	if (!$("a[href^=\"#cite:\"]").length) {
		return `<div class="post-content">${$("body").html()}</div>`;
	}
	const content = $("<div class=\"post-content apa-citation-content\"></div>");
	const sidebar = $('<aside class="apa-citation-sidebar" aria-label="Referencoj"></aside>');
	let paragraphIndex = 0;

	// Trabajamos sobre los párrafos del contenido original, excluyendo la
	// bibliografía y cualquier contenido ya situado en una nota.
	$("body > p, body > h1, body > h2, body > h3, body > h4, body > ul, body > ol, body > blockquote, body > figure, body > pre, body > table, body > div").each((_, node) => {
		const element = $(node);
		if (element.closest(".apa-citation-sidebar").length) return;
		if (element.hasClass("apa-citation-layout")) return;
		content.append(element);
	});

	// Si Cheerio no encontró elementos directos (por ejemplo, HTML fragmentado),
	// conserva el contenido íntegro en el contenedor principal.
	if (!content.children().length) content.append($("body").contents());

	content.find("p").each((_, paragraph) => {
		const p = $(paragraph);
		const links = p.find('a[href^="#cite:"]');
		if (!links.length) return;

		const keys = [...new Set(links.map((_, link) =>
			$(link).attr("href").slice("#cite:".length)
		).get())];

		const paragraphId = `apa-paragraph-${++paragraphIndex}`;
		p.attr("id", paragraphId).addClass("apa-cited-paragraph");
		links.each((_, link) => {
			const anchor = $(link);
			const key = anchor.attr("href").slice("#cite:".length);
			anchor.attr("href", `#bib-${key}`).addClass("apa-citation-link")
				.attr("aria-label", `Bibliografia referenco: ${key}`);
		});

		const card = $('<div class="apa-citation-card"></div>').attr("data-apa-target", paragraphId);
		const entries = $('<div class="apa-citation-entries"></div>');
		for (const key of keys) {
			const reference = bibliography.get(key);
			const entry = $('<div class="apa-citation-entry"></div>');
			const link = $('<a class="apa-citation-card-link"></a>').attr("href", `#bib-${key}`);
			if (reference) {
				link.append(reference.contents().clone());
			} else {
				entry.addClass("apa-citation-missing");
				link.text(`Mankas bibliografia enskribo: ${key}`);
				warn(`[APA] Ne troviĝis bibliografia enskribo por "${key}".`);
			}
			entry.append(link);
			entries.append(entry);
		}
		card.append(entries);
		sidebar.append(card);
	});

	const layout = $('<div class="apa-citation-layout"></div>').append(content, sidebar);
	$("body").empty().append(layout);
	return $("body").html();
}

module.exports = { preprocessApaBibliography, renderApaCitations };
