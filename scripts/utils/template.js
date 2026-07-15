// Módulo común para varias funciones de renderizado por plantilla
const fs = require("fs/promises");
const path = require("path");

const {
	TEMPLATES_DIR
} = require("../config");

function loadTemplate(name) {

	return fs.readFile(
		path.join(
			TEMPLATES_DIR,
			name
		),
		"utf-8"
	);
}

function renderTemplate(template, data) {

	let out = template;

	for (const [key, value] of Object.entries(data)) {

		out = out.replaceAll(
			`{{${key}}}`,
			value ?? ""
		);
	}

	return out;
}

module.exports = {
	loadTemplate,
	renderTemplate
};