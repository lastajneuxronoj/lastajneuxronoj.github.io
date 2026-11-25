"use strict";

const cheerio = require("cheerio");

/**
 * Marca entradas bibliográficas en el Markdown sin repetir su contenido.
 * Sintaxis de la fuente: - [bib:clave] Texto completo de la referencia
 */
function preprocessApaBibliography(markdown) {
	return markdown.replace(
		/^(\s*[-*+]\s*)\[bib:([a-z0-9][a-z0-9-]*)\]\s*/gim,
		(_, listPrefix, key) =>
			`${listPrefix}<span class="apa-bibliography-key" data-apa-key="${key}"></span>`
	);
}

/**
 * Convierte citas especiales en notas laterales. La tarjeta se copia desde
 * la entrada bibliográfica marcada en el mismo Markdown; JSON no interviene.
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
		// Cheerio .each() entrega el nodo DOM, no un objeto Cheerio.
		// Envolverlo con $ permite usar la API de eliminación de Cheerio.
		$(marker).remove();
		bibliography.set(key, item);
	});

	$(".apa-citation-row").remove();

	$("p").each((_, paragraph) => {
		const p = $(paragraph);
		const citationLinks = p.find('a[href^="#cite:"]');
		if (!citationLinks.length) return;

		const keys = [...new Set(citationLinks.map((_, link) =>
			$(link).attr("href").slice("#cite:".length)
		).get())];

		const row = $('<div class="apa-citation-row"></div>');
		const main = $('<div class="apa-citation-main"></div>');
		const notes = $('<aside class="apa-citation-notes" aria-label="Referencoj"></aside>');

		p.clone().appendTo(main);

		for (const key of keys) {
			const reference = bibliography.get(key);
			const links = p.find(`a[href="#cite:${key}"]`);
			links.attr("href", `#bib-${key}`).addClass("apa-citation-link")
				.attr("aria-label", `Bibliografia referenco: ${key}`);
			main.find(`a[href="#cite:${key}"]`).attr("href", `#bib-${key}`).addClass("apa-citation-link");

			const card = $('<div class="apa-citation-card"></div>');
			const cardLink = $('<a class="apa-citation-card-link"></a>')
				.attr("href", `#bib-${key}`);
			if (reference) {
				cardLink.append(reference.contents().clone());
			} else {
				card.addClass("apa-citation-missing");
				cardLink.text(`Mankas bibliografia enskribo: ${key}`);
				warn(`[APA] Ne troviĝis bibliografia enskribo por "${key}".`);
			}
			card.append(cardLink);
			notes.append(card);
		}

		row.append(main, notes);
		p.replaceWith(row);
	});

	return $.root().html();
}

module.exports = {
	preprocessApaBibliography,
	renderApaCitations
};
