
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const POSTS_PATH = "json/posts.json";
const TRANSLATIONS_PATH = "json/translations.json";

const SITE_URL = "https://lastajneuxronoj.github.io";

const CURRENT_POSTS_PATH = path.join(process.cwd(), POSTS_PATH);
const CURRENT_TRANSLATIONS_PATH = path.join(
	process.cwd(),
	TRANSLATIONS_PATH
);

function readJson(content, source) {
	try {
		return JSON.parse(content);
	} catch (error) {
		throw new Error(
			`No se pudo interpretar ${source}: ${error.message}`
		);
	}
}

function getPosts(data, source) {
	const posts = Array.isArray(data) ? data : data?.posts;

	if (!Array.isArray(posts)) {
		throw new Error(`${source} no contiene una lista de artículos.`);
	}

	return posts;
}

function getLanguages(post) {
	if (
		!post.file ||
		typeof post.file !== "object" ||
		Array.isArray(post.file)
	) {
		return [];
	}

	return Object.keys(post.file);
}

function getPostData(post, languages) {
	const titles = {};
	const urls = {};

	for (const language of languages) {
		const title = post.title?.[language];
		const file = post.file?.[language];

		if (typeof title !== "string" || !title.trim()) {
			throw new Error(
				`Falta el título de la entrada ${post.number} en "${language}".`
			);
		}

		if (typeof file !== "string" || !file.trim()) {
			throw new Error(
				`Falta el archivo de la entrada ${post.number} en "${language}".`
			);
		}

		titles[language] = title;

		urls[language] =
			`${SITE_URL}/blog/${post.number}-${language}.html`;
	}

	return { titles, urls };
}

function buildNotifications(
	titles,
	urls,
	articleLanguages,
	type,
	translationData
) {
	const notifications = {};

	const messageType = type === "new_post"
		? "newPost"
		: "newTranslation";

	for (const language of Object.keys(translationData.messages)) {
		const templates =
			translationData.messages[language][messageType];

		const languageNames =
			translationData.languageNames[language] || {};

		const names = articleLanguages.map(
			code => languageNames[code] || code
		);

		let formattedLanguages;

		if (language === "eo") {
			if (names.length <= 1) {
				formattedLanguages = names[0] || "";
			} else if (names.length === 2) {
				formattedLanguages = `${names[0]} kaj ${names[1]}`;
			} else {
				formattedLanguages =
					`${names.slice(0, -1).join(", ")} kaj ${names.at(-1)}`;
			}
		} else {
			formattedLanguages = new Intl.ListFormat(
				language,
				{
					style: "long",
					type: "conjunction"
				}
			).format(names);
		}

		// Elegir el idioma del título.
		const title =
			titles[language] ||
			titles.eo ||
			Object.values(titles)[0];

		// Elegir el idioma del enlace.
		let urlLanguage;

		if (type === "new_translation") {
			urlLanguage = articleLanguages.find(
				code => urls[code]
			);
		} else {
			urlLanguage =
				urls[language]
					? language
					: urls.eo
						? "eo"
						: Object.keys(urls)[0];
		}

		const replacements = {
			title,
			languages: formattedLanguages
		};

		function formatMessage(template) {
			return template.replace(
				/\{(\w+)\}/g,
				(match, key) => replacements[key] ?? match
			);
		}

		notifications[language] = {
			title: formatMessage(templates.title),
			body: formatMessage(templates.body),
			url: urls[urlLanguage]
		};
	}

	return notifications;
}

function getTranslationData(translations) {
	const messages = {};
	const languageNames = {};

	for (const [language, data] of Object.entries(translations)) {
		const pushMessages = data?.ui?.push?.messages;
		const names = data?.languageNames;

		if (
			!pushMessages?.newPost ||
			!pushMessages?.newTranslation ||
			!names ||
			typeof names !== "object"
		) {
			continue;
		}

		messages[language] = {
			newPost: pushMessages.newPost,
			newTranslation: pushMessages.newTranslation
		};

		languageNames[language] = names;
	}

	return { messages, languageNames };
}

function createEvent(
	post,
	type,
	articleLanguages,
	translationData
) {
	const allLanguages = getLanguages(post);

	const { titles, urls } = getPostData(
		post,
		allLanguages
	);

	const notifications = buildNotifications(
		titles,
		urls,
		articleLanguages,
		type,
		translationData
	);

	return {
		number: String(post.number),
		type,
		articleLanguages,
		titles,
		urls,
		notifications
	};
}

function detectEvents(previousPosts, currentPosts, translations) {
	const previousByNumber = new Map(
		previousPosts.map(post => [
			String(post.number),
			post
		])
	);

	const translationData = getTranslationData(translations);

	const events = [];

	for (const post of currentPosts) {
		const number = String(post.number);
		const previousPost = previousByNumber.get(number);

		const currentLanguages = getLanguages(post);

		// Artículo completamente nuevo.
		if (!previousPost) {
			if (currentLanguages.length > 0) {
				events.push(
					createEvent(
						post,
						"new_post",
						currentLanguages,
						translationData
					)
				);
			}

			continue;
		}

		// Artículo existente: detectar solamente idiomas nuevos.
		const previousLanguages = new Set(
			getLanguages(previousPost)
		);

		const newLanguages = currentLanguages.filter(
			language => !previousLanguages.has(language)
		);

		if (newLanguages.length > 0) {
			events.push(
				createEvent(
					post,
					"new_translation",
					newLanguages,
					translationData
				)
			);
		}
	}

	return events;
}

function main() {
	const baseSha = process.argv[2];

	if (!baseSha) {
		throw new Error(
			"Falta el SHA del commit anterior. " +
			"Uso: node scripts/detect-post-events.js <SHA>"
		);
	}

	if (!fs.existsSync(CURRENT_POSTS_PATH)) {
		throw new Error(`No se encontró ${CURRENT_POSTS_PATH}`);
	}

	if (!fs.existsSync(CURRENT_TRANSLATIONS_PATH)) {
		throw new Error(
			`No se encontró ${CURRENT_TRANSLATIONS_PATH}`
		);
	}

	const previousContent = execFileSync(
		"git",
		["show", `${baseSha}:${POSTS_PATH}`],
		{ encoding: "utf8" }
	);

	const currentContent = fs.readFileSync(
		CURRENT_POSTS_PATH,
		"utf8"
	);

	const translationsContent = fs.readFileSync(
		CURRENT_TRANSLATIONS_PATH,
		"utf8"
	);

	const previousPosts = getPosts(
		readJson(previousContent, "posts.json anterior"),
		"posts.json anterior"
	);

	const currentPosts = getPosts(
		readJson(currentContent, "posts.json actual"),
		"posts.json actual"
	);

	const translations = readJson(
		translationsContent,
		"translations.json"
	);

	const events = detectEvents(
		previousPosts,
		currentPosts,
		translations
	);

	console.log(JSON.stringify(events, null, 2));
}

module.exports = {
	detectEvents,
	getLanguages,
	getPostData,
	getTranslationData
};

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
