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

assert.match(html, /class="apa-citation-layout"/);
assert.match(html, /class="post-content apa-citation-content"/);
assert.match(html, /class="apa-citation-sidebar"/);
assert.doesNotMatch(html, /apa-citation-main/);
assert.doesNotMatch(html, /apa-citation-row/);
assert.match(html, /class="apa-citation-notes"/);
assert.match(html, /id="bib-xu-garcia-2008"/);
// Regression: bibliography marker is removed without discarding the entry text.
assert.doesNotMatch(html, /apa-bibliography-key/);
assert.match(html, /Intuitive statistics/);
assert.match(html, /href="#bib-xu-garcia-2008"/);
assert.match(html, /href="#bib-gomberoff-2024"/);
assert.equal((html.match(/class="apa-citation-card"/g) || []).length, 1);
assert.equal((html.match(/class="apa-citation-entry"/g) || []).length, 2);
assert.match(html, /Paragrafo kun/);
assert.match(html, /<p id="apa-paragraph-1" class="apa-cited-paragraph">/);

const legacy = renderApaCitations("<p>Un párrafo antiguo, sin marcas.</p>");
assert.equal(legacy, '<div class="post-content"><p>Un párrafo antiguo, sin marcas.</p></div>');

console.log("✔ Pruebas de citas APA superadas.");
