
// DETECCIÓN Y CONFIGURACIÓN DEL MODO OFFLINE

const standaloneQuery = window.matchMedia(
    "(display-mode: standalone)"
);

const fullscreenQuery = window.matchMedia(
    "(display-mode: fullscreen)"
);

const minimalUIQuery = window.matchMedia(
    "(display-mode: minimal-ui)"
);

window.isPWA = function () {
    return (
        standaloneQuery.matches ||
        fullscreenQuery.matches ||
        minimalUIQuery.matches ||
        navigator.standalone === true
    );
};

// Comunica al service worker el modo de este cliente.

window.setupOfflineMode = async function (registration) {
    if (!registration) return;

    async function updateMode() {
        const worker =
            navigator.serviceWorker.controller ||
            registration.active;

        if (!worker) return false;

        // Esperamos confirmación del service worker.
        const channel = new MessageChannel();

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                channel.port1.close();
                resolve(false);
            }, 5000);

            channel.port1.onmessage = event => {
                clearTimeout(timeout);
                channel.port1.close();

                resolve(event.data?.ok === true);
            };

            worker.postMessage(
                {
                    type: "CLIENT_MODE",
                    enabled: window.isPWA()
                },
                [channel.port2]
            );
        });
    }

    const initialized = await updateMode();

    if (!initialized) {
        console.warn(
            "El service worker no confirmó el modo offline."
        );
    }

    async function handleModeChange() {
        const success = await updateMode();

        if (!success) {
            console.warn(
                "No se pudo actualizar el modo offline."
            );
        }
    }

    for (const query of [
        standaloneQuery,
        fullscreenQuery,
        minimalUIQuery
    ]) {
        query.addEventListener("change", handleModeChange);
    }

    navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleModeChange
    );

    return initialized;
};



// AVISO DE CONEXIÓN

async function setupOfflineNotice() {
    const notice = document.createElement("aside");

    notice.id = "offline-notice";
    notice.className = "offline-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.hidden = true;

    notice.innerHTML = `
        <span class="offline-indicator" aria-hidden="true"></span>
        <div class="offline-notice-text">
            <strong class="offline-notice-title"></strong>
            <span class="offline-notice-message"></span>
        </div>
    `;

    document.body.appendChild(notice);

    const title = notice.querySelector(".offline-notice-title");
    const message = notice.querySelector(".offline-notice-message");

    async function updateTranslations() {
        try {
            const lang = getCurrentLang();
            const translations = await getTranslations();
            const text = translations[lang]?.ui?.offline;

            if (!text) return;

            title.textContent = text.title;
            message.textContent = text.message;

        } catch (error) {
            console.error(
                "No se pudieron cargar las traducciones del aviso offline:",
                error
            );
        }
    }

    function showNotice() {
        notice.hidden = false;
    }

    function hideNotice() {
        notice.hidden = true;
    }

    await updateTranslations();

    if (!navigator.onLine) {
        showNotice();
    }

    window.addEventListener("offline", showNotice);
    window.addEventListener("online", hideNotice);
    window.addEventListener("languageChanged", updateTranslations);
}
