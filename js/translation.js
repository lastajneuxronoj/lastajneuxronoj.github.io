// CONFIG DE IDIOMAS
const LANGUAGES = ["es", "eo"];
const DEFAULT_LANG = "eo";

// CACHE DE TRADUCCIONES
let translationsCache = null;

async function getTranslations() {
	if (translationsCache) return translationsCache;

	const res = await fetch("/json/translations.json");
	translationsCache = await res.json();
	return translationsCache;
}

// IDIOMA ACTUAL
function getCurrentLang() {
	const lang = localStorage.getItem("lang");
	return LANGUAGES.includes(lang) ? lang : DEFAULT_LANG;
}

function toggleLanguage() {
	const current = getCurrentLang();
	const index = LANGUAGES.indexOf(current);
	return LANGUAGES[(index + 1) % LANGUAGES.length];
}

// APLICAR TRADUCCIONES
async function applyTranslations() {
	const lang = getCurrentLang();
	const translations = await getTranslations();
	const t = translations[lang];

	if (!t) {
		console.error(`No hay traducciones para "${lang}"`);
		return;
	}

	const applyText = (id, value) => {
		const el = document.getElementById(id);
		if (el && value !== undefined) {
			el.textContent = value;
		}
	};

	const tocLabel = document.querySelector(".toc-label");

	if (tocLabel) {
		tocLabel.textContent = t.ui.toc.title;
	}

	const musicLabel = document.querySelector(
		'.media-title[data-type="music"]'
	);

	if (musicLabel) {
		musicLabel.textContent = t.ui.toc.music;
	}

	const podcastLabel = document.querySelector(
		'.media-title[data-type="podcast"]'
	);
	
	if (podcastLabel) {
		podcastLabel.textContent = t.ui.toc.podcast;
	}

	applyText("logo-text", t.header.logo_text);
	applyText("header-home", t.header.header_home);
	applyText("header-about", t.header.header_about);
	applyText("header-categories", t.header.header_categories);
	applyText("header-projects", t.header.header_projects);
	applyText("lang-switch", t.header.lang_code);

	applyText("posts-label-bg", t.posts.label_bg);
	applyText("posts-label", t.posts.label);

	applyText("back-to-home", t.backToHome);
	applyText("footer-text", t.footer_text);

	document
	    .querySelectorAll(".media-item")
	    .forEach(el => {
	        const mediaTitle = el.dataset.mediaTitle;

	        if (!mediaTitle) return;

	        const mediaType = el.dataset.mediaType;

	        let label = t.ui.toc.play;

	        if (mediaType === "podcast") {
	            label = t.ui.toc.podcastLabel;
	        } else if (mediaType === "video") {
	            label = t.ui.toc.videoLabel;
	        }

	        el.dataset.title = `${label}: ${mediaTitle}`;
	    });

	const citationToggle = document.querySelector(
	    ".apa-citation-toggle"
	);

	if (citationToggle) {
	    const citationsVisible =
	        citationToggle.getAttribute("aria-expanded") !== "false";

	    citationToggle.textContent = citationsVisible
	        ? t.ui.toc.hideCitations
	        : t.ui.toc.showCitations;
	}
}



// CAMBIO CENTRALIZADO DE IDIOMA
function setLanguage(lang) {
	if (!LANGUAGES.includes(lang)) return;

	localStorage.setItem("lang", lang);

	document.documentElement.lang = lang;

	window.dispatchEvent(
		new CustomEvent("languageChanged", {
			detail: { lang }
		})
	);
}

// TOGGLE DE IDIOMA
function setupLangToggle() {

	const langSwitch =
		document.getElementById("lang-switch");

	if (!langSwitch) return;


	langSwitch.addEventListener("click", async () => {

		const next = toggleLanguage();

		setLanguage(next);

		await updateLanguageDependentLinks(true);

		applyTranslations();

	});
}