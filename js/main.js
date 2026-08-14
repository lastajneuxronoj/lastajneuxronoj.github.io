// Inicialización de la página
document.addEventListener("DOMContentLoaded", async () => {
	/*await getTranslations();*/
    await loadHeader();
	await loadFooter();

    if (document.getElementById("post-list")) {
            loadPosts();
        }

    if (document.getElementById("about-content")) {
        loadAboutContent();
    }

    if (document.getElementById("progress-bar")) {
        setupProgressBar();
    }

    setupDetailsAnimation();
    initializeTOC();
    await setupMermaid();
});


// Cambio de idioma
window.addEventListener("languageChanged", () => {
	updateLanguageDependentLinks();

	if (document.getElementById("post-list")) {
		loadPosts();
	}

	if (document.getElementById("about-content")) {
		loadAboutContent();
	}
});
