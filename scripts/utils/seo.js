// Función de metadatos para SEO
const {
    SITE_NAME,
    SITE_URL,
} = require("../config");

function buildSEOData({
	title,
	description = "",
	url,
	lang,
	availableLangs = [],
	alternates = {},
	type = "z",
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

function buildPageTitle(title) {
	return `${title} | ${SITE_NAME}`;
}

module.exports = {
	buildSEOData,
	buildPageTitle
};