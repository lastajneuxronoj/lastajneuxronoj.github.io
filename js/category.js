async function updateCategoryTexts() {

	const lang = getCurrentLang();

	const translations = await getTranslations();

	const t = translations[lang];

	if (!t) {
		return;
	}

	const slug = document.body.dataset.category;

	const categoryName =
		t.ui?.categories?.names?.[slug]
		|| slug;

	const categoryLabel =
		t.ui?.categories?.title
		|| "Categories";


	const titleElement =
		document.querySelector(".post-section-title");

	if (titleElement) {
		titleElement.textContent = categoryName;
	}


	const bgElement =
		document.querySelector(".section-title-bg");

	if (bgElement) {
		bgElement.textContent = categoryLabel;
	}
}



document.addEventListener(
	"DOMContentLoaded",
	updateCategoryTexts
);

window.addEventListener(
	"languageChanged",
	updateCategoryTexts
);