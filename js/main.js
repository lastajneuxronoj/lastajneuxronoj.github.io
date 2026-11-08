// Inicialización de la página
document.addEventListener("DOMContentLoaded", async () => {

    const pwa = window.isPWA();
    
    // Estructura común del sitio.
    await loadHeader();
    await loadFooter();
    
    // Aviso de desconexión exclusivo de la PWA.
    if (pwa && window.setupOfflineNotice) {
        await window.setupOfflineNotice();
    }

    // Se ejecuta en ambos contextos para registrar
    // el Service Worker y comunicar el modo del cliente.
    if (window.setupPushControls) {
        await window.setupPushControls();
    }

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