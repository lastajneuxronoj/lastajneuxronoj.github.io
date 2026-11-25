"use strict";

const assert = require("node:assert/strict");
const { preprocessApaBibliography, renderApaCitations } = require("./citations");

const markdown = [
	"Paragrafo kun [Xu & Garcia, 2008](#cite:xu-garcia-2008) kaj [Gomberoff, 2024](#cite:gomberoff-2024).",
	"",
	"## Bibliografio",
	"",
	"- [bib:xu-garcia-2008] Xu, F., & Garcia, V. (2008). *Intuitive statistics*. https://doi.org/example",
	"- [bib:gomberoff-2024] Gomberoff, A. (2024). *El Instinto Científico*."
].join("\n");

const processed = preprocessApaBibliography(markdown);
const html = renderApaCitations(require("marked").marked.parse(processed), { warn: () => {} });

assert.match(html, /class="apa-citation-row"/);
assert.match(html, /class="apa-citation-notes"/);
assert.match(html, /id="bib-xu-garcia-2008"/);
assert.match(html, /href="#bib-xu-garcia-2008"/);
assert.match(html, /href="#bib-gomberoff-2024"/);
assert.equal((html.match(/class="apa-citation-card"/g) || []).length, 2);

const legacy = renderApaCitations("<p>Un párrafo antiguo, sin marcas.</p>");
assert.equal(legacy, "<html><head></head><body><p>Un párrafo antiguo, sin marcas.</p></body></html>");

console.log("✔ Pruebas de citas APA superadas.");
