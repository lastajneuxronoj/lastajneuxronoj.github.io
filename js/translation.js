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

	applyText("logo-text", t.header.logo_text);
	applyText("header-home", t.header.header_home);
	applyText("header-about", t.header.header_about);
	applyText("header-categories", t.header.header_categories);
	applyText("header-proyects", t.header.header_proyects);
	applyText("lang-switch", t.header.lang_code);

	applyText("posts-label-bg", t.posts.label_bg);
	applyText("posts-label", t.posts.label);

	applyText("back-to-home", t.backToHome);
	applyText("footer-text", t.footer_text);
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