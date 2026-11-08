(function () {
	"use strict";

	let deferredInstallPrompt = null;
	let pushAvailable = false;
	let pushSubscribed = false;
	let pushRegistration = null;
	let controlRoot = null;
	let translationsCache = null;
	let setupPromise = null;
	let menuCloseTimeout = null;
	let menuBottomObserver = null;

	function configIsReady() {
		const config = window.PUSH_CONFIG || {};
		return Boolean(config.apiUrl && config.vapidPublicKey);
	}

	function canUsePush() {
		return "serviceWorker" in navigator
			&& "PushManager" in window
			&& "Notification" in window;
	}

	async function getTranslations() {
		if (translationsCache) return translationsCache;

		const response = await fetch("/json/translations.json");

		if (!response.ok) {
			throw new Error("No se pudieron cargar las traducciones");
		}

		translationsCache = await response.json();
		return translationsCache;
	}

	async function currentLabels() {
		const translations = await getTranslations();
		const lang = document.documentElement.lang || "eo";
	
		return translations[lang]?.ui?.push
			|| translations.eo.ui.push;
	}

	async function currentLanguage() {
		const translations = await getTranslations();
		const lang = document.documentElement.lang || "eo";

		return translations[lang] ? lang : "eo";
	}

	function capitalizeLanguageName(name) {
		if (!name) return name;

		return name.charAt(0).toLocaleUpperCase() + name.slice(1);
	}

	function base64UrlToUint8Array(value) {
		const padded =
			`${value}${"=".repeat((4 - value.length % 4) % 4)}`;

		const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
		const raw = window.atob(base64);

		return Uint8Array.from(
			raw,
			char => char.charCodeAt(0)
		);
	}

	function createIcon(name, alt = "") {
		const img = document.createElement("img");
		img.src = `/svg/${name}.svg`;
		img.alt = alt;
		img.setAttribute("aria-hidden", "true");
		return img;
	}

	function createMenuItem(iconName, label, action) {
		const item = document.createElement("button");
		item.type = "button";
		item.className = "app-menu-item";

		item.append(createIcon(iconName));

		const text = document.createElement("span");
		text.textContent = label;
		item.append(text);

		item.addEventListener("click", action);
		return item;
	}

	function showStatus(message) {
		const status = controlRoot?.querySelector(".app-status");
		if (status) status.textContent = message;
	}


	function shouldKeepMenuOpen() {
		const menu = controlRoot?.querySelector(".app-menu");
		if (!menu) return false;

		const panels = menu.querySelectorAll(
			".push-newsletter, .push-preferences"
		);

		for (const panel of panels) {
			// Mantener el menú abierto mientras un control
			// del formulario tiene el foco.
			if (panel.contains(document.activeElement)) {
				return true;
			}

			// Mantenerlo abierto si ya hubo interacción
			// con algún control del formulario.
			if (panel.dataset.userInteracted === "true") {
				return true;
			}
		}

		return false;
	}

	function trackPanelInteraction(panel) {
		function markInteraction(event) {
			if (event.target.closest("input, button, select, textarea")) {
				panel.dataset.userInteracted = "true";
			}
		}

		panel.addEventListener("click", markInteraction);
		panel.addEventListener("input", markInteraction);
		panel.addEventListener("change", markInteraction);
	}

	function showNewsletterForm(event) {
		const triggerButton = event?.currentTarget;
		const menu = controlRoot?.querySelector(".app-menu");

		if (!menu) return;

		// Si el boletín ya está abierto, cerrarlo.
		const existing = menu.querySelector(".push-newsletter");

		if (existing) {
			existing.remove();
			return;
		}

		// Si las preferencias están abiertas, cerrarlas.
		menu.querySelector(".push-preferences")?.remove();

		currentLabels()
			.then(async text => {
				const translations = await getTranslations();
							
				const LANGUAGES = Object.keys(translations)
					.filter(language => translations[language]?.ui?.push);
							
				const interfaceLanguage = document.documentElement.lang || "eo";
							
				const lang = LANGUAGES.includes(interfaceLanguage)
					? interfaceLanguage
					: LANGUAGES.includes("eo")
						? "eo"
						: LANGUAGES[0];

				// Evitar crear un duplicado si ya existe.
				const current = menu.querySelector(".push-newsletter");

				if (current) {
					current.remove();
					return;
				}

				const panel = document.createElement("div");
				panel.className = "push-newsletter";
				trackPanelInteraction(panel);

				const description = document.createElement("p");
				description.className = "push-newsletter-description";
				description.textContent = text.newsletterDescription;

				const form = document.createElement("form");
				form.className = "push-newsletter-form";
				form.action =
					"https://buttondown.com/api/emails/embed-subscribe/lastajneuxronoj";
				form.method = "post";

				// Correo electrónico.
				const emailLabel = document.createElement("label");
				emailLabel.htmlFor = "push-newsletter-email";
				emailLabel.textContent = text.newsletterEmail;

				const email = document.createElement("input");
				email.type = "email";
				email.name = "email";
				email.id = "push-newsletter-email";
				email.required = true;
				email.autocomplete = "email";

				// Idioma preferido.
				const languageLabel = document.createElement("label");
				languageLabel.textContent = text.newsletterPreferredLanguage;

				const languageSelector = document.createElement("div");
				languageSelector.className =
					"push-language-selector push-newsletter-language-selector";

				const languageInput = document.createElement("input");
				languageInput.type = "hidden";
				languageInput.name = "metadata__language";
				languageInput.value = lang;

				const languageButton = document.createElement("button");
				languageButton.type = "button";
				languageButton.className = "push-language-button";
				languageButton.setAttribute("aria-haspopup", "listbox");
				languageButton.setAttribute("aria-expanded", "false");

				const languageMenu = document.createElement("div");
				languageMenu.className = "push-language-menu";
				languageMenu.setAttribute("role", "listbox");
				languageMenu.hidden = true;

				// Actualizar el idioma seleccionado.
				function updateNewsletterLanguageButton(selectedLanguage) {
					if (!LANGUAGES.includes(selectedLanguage)) return;
				
					languageInput.value = selectedLanguage;
				
					languageButton.replaceChildren();
				
					const flag = document.createElement("img");
					flag.src = `/svg/flag_${selectedLanguage}.svg`;
					flag.alt = "";
					flag.className = "push-language-flag";
					flag.setAttribute("aria-hidden", "true");
				
					const name = document.createElement("span");
					name.textContent = capitalizeLanguageName(text[selectedLanguage]);
				
					const arrow = document.createElement("span");
					arrow.className = "push-language-arrow";
					arrow.textContent = "▾";
					arrow.setAttribute("aria-hidden", "true");
				
					languageButton.append(flag, name, arrow);
				
					languageMenu.querySelectorAll(".push-language-option")
						.forEach(option => {
							option.setAttribute(
								"aria-selected",
								String(option.dataset.language === selectedLanguage)
							);
						});
				}

				// Crear las opciones de idioma.
				LANGUAGES.forEach(language => {
					const option = document.createElement("button");
					option.type = "button";
					option.className = "push-language-option";
					option.setAttribute("role", "option");
					option.dataset.language = language;
				
					const flag = document.createElement("img");
					flag.src = `/svg/flag_${language}.svg`;
					flag.alt = "";
					flag.className = "push-language-flag";
					flag.setAttribute("aria-hidden", "true");
				
					const name = document.createElement("span");
					name.textContent = capitalizeLanguageName(text[language]);
				
					option.append(flag, name);
				
					option.addEventListener("click", () => {
						updateNewsletterLanguageButton(language);
					
						languageMenu.hidden = true;
						languageButton.setAttribute("aria-expanded", "false");
					});
				
					languageMenu.append(option);
				});

				// Abrir y cerrar el selector.
				languageButton.addEventListener("click", () => {
					languageMenu.hidden = !languageMenu.hidden;

					languageButton.setAttribute(
						"aria-expanded",
						String(!languageMenu.hidden)
					);
				});

				// Inicializar con el idioma de la interfaz.
				updateNewsletterLanguageButton(lang);

				languageSelector.append(
					languageButton,
					languageMenu,
					languageInput
				);

				// Botón de suscripción.
				const submit = document.createElement("button");
				submit.type = "submit";
				submit.className = "push-newsletter-submit";
				submit.textContent = text.newsletterSubscribe;

				const powered = document.createElement("p");
				powered.className = "push-newsletter-powered";
				powered.append(
					document.createTextNode(`${text.newsletterPowered} `)
				);

				const link = document.createElement("a");
				link.href = "https://buttondown.com/refer/lastajneuxronoj";
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				link.textContent = "Buttondown";
				powered.append(link, document.createTextNode("."));

				form.append(
					emailLabel,
					email,
					languageLabel,
					languageSelector,
					submit
				);

				panel.append(description, form, powered);

				// Insertar el formulario debajo de su botón.
				if (triggerButton?.parentNode === menu) {
					triggerButton.insertAdjacentElement("afterend", panel);
				} else {
					const status = menu.querySelector(".app-status");
					menu.insertBefore(panel, status || null);
				}

				email.focus();
			})
			.catch(error => {
				console.error(
					"No se pudo mostrar el formulario del boletín",
					error
				);
			});
	}



	function updateMenuBottom(menu) {
		if (!menu) return;

		// Eliminar la marca anterior.
		menu.querySelectorAll(":scope > .is-menu-bottom")
			.forEach(element => {
				element.classList.remove("is-menu-bottom");
			});

		// Obtener los elementos directos que están visibles.
		const visibleItems = [...menu.children].filter(element => {
			return (
				!element.hidden &&
				getComputedStyle(element).display !== "none"
			);
		});

		// Marcar el último elemento visible.
		visibleItems.at(-1)?.classList.add("is-menu-bottom");
	}

	function observeMenuBottom(menu) {
		if (!menu) return;

		menuBottomObserver?.disconnect();

		updateMenuBottom(menu);

		menuBottomObserver = new MutationObserver(() => {
			updateMenuBottom(menu);
		});

		menuBottomObserver.observe(menu, {
			childList: true,
			attributes: true,
			attributeFilter: ["hidden", "style"]
		});
	}

	function closeMenu() {
		clearTimeout(menuCloseTimeout);
		menuCloseTimeout = null;

		if (!controlRoot) return;

		const trigger = controlRoot.querySelector(".app-control");
		const menu = controlRoot.querySelector(".app-menu");

		if (menu) menu.hidden = true;
		if (trigger) trigger.setAttribute("aria-expanded", "false");
	}

	function openMenu() {
		clearTimeout(menuCloseTimeout);
		menuCloseTimeout = null;

		if (!controlRoot) return;

		const trigger = controlRoot.querySelector(".app-control");
		const menu = controlRoot.querySelector(".app-menu");

		if (menu) menu.hidden = false;
		if (trigger) trigger.setAttribute("aria-expanded", "true");
	}


	function scheduleMenuClose() {
		clearTimeout(menuCloseTimeout);

		menuCloseTimeout = setTimeout(() => {
			menuCloseTimeout = null;

			if (
				!controlRoot?.matches(":hover")
				&& !shouldKeepMenuOpen()
			) {
				closeMenu();
			}
		}, 300);
	}


	function toggleMenu() {
		const menu = controlRoot?.querySelector(".app-menu");
		if (!menu) return;

		if (menu.hidden) openMenu();
		else closeMenu();
	}

	async function requestApi(path, body) {
		const apiUrl = window.PUSH_CONFIG.apiUrl.replace(/\/$/, "");

		const response = await fetch(`${apiUrl}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});

		let result = {};

		try {
			result = await response.json();
		} catch {
			// La respuesta puede no contener JSON.
		}

		if (!response.ok) {
			throw new Error(result.error || `Error HTTP ${response.status}`);
		}

		return result;
	}

	async function saveSubscription(subscription, preferences) {
		const data = subscription.toJSON();

		data.notificationLanguage = preferences.notificationLanguage;
		data.articleLanguages = preferences.articleLanguages;

		await requestApi("/subscriptions", data);
	}

	async function deleteSubscription(subscription) {
		await requestApi("/subscriptions/delete", subscription.toJSON());
	}


	function addLanguageCheckbox(container, language, label, checked) {
		const wrapper = document.createElement("label");
		wrapper.className = "push-language-option";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.name = "articleLanguages";
		checkbox.value = language;
		checkbox.checked = checked;

		const flag = document.createElement("img");
		flag.src = `/svg/flag_${language}.svg`;
		flag.alt = "";
		flag.className = "push-language-flag";
		flag.setAttribute("aria-hidden", "true");

		const text = document.createElement("span");
		text.textContent = capitalizeLanguageName(label);

		wrapper.append(checkbox, flag, text);
		container.append(wrapper);
	}


	async function showPreferences(event) {
		const triggerButton = event?.currentTarget;
		const translations = await getTranslations();
		const text = await currentLabels();

		const LANGUAGES = Object.keys(translations)
			.filter(language => translations[language]?.ui?.push);

		const interfaceLanguage = document.documentElement.lang || "eo";

		const defaultLanguage = LANGUAGES.includes(interfaceLanguage)
			? interfaceLanguage
			: "eo";

		if (!configIsReady()) {
			showStatus(text.notConfigured);
			return;
		}

		if (!canUsePush() || !pushRegistration) {
			showStatus(text.unavailable);
			return;
		}

		const menu = controlRoot?.querySelector(".app-menu");
		if (!menu) return;

		// Si las preferencias ya están abiertas, cerrarlas.
		const existing = menu.querySelector(".push-preferences");

		if (existing) {
			existing.remove();
			return;
		}

		// Cerrar el formulario del boletín si está abierto.
		menu.querySelector(".push-newsletter")?.remove();

		// Recuperar las preferencias guardadas en el servidor.
		let savedPreferences = null;

		try {
		  const subscription =
			await pushRegistration.pushManager.getSubscription();
		
		  if (subscription) {
			const result = await requestApi(
			  "/subscriptions/preferences",
			  subscription.toJSON()
			);
		
			if (result.found) {
			  savedPreferences = result;
			}
		  }
		} catch (error) {
		  console.error(
			"No se pudieron recuperar las preferencias",
			error
		  );
		}

		const panel = document.createElement("form");
		panel.className = "push-preferences";
		trackPanelInteraction(panel);

		
		const notificationLabel = document.createElement("label");
		notificationLabel.className = "push-notification-label";
		notificationLabel.textContent = text.notificationLanguage;

		const languageSelector = document.createElement("div");
		languageSelector.className = "push-language-selector";

		const notificationSelect = document.createElement("input");
		notificationSelect.type = "hidden";
		notificationSelect.name = "notificationLanguage";
		const savedNotificationLanguage =
		  savedPreferences?.notificationLanguage;

		const selectedNotificationLanguage =
		  LANGUAGES.includes(savedNotificationLanguage)
			? savedNotificationLanguage
			: defaultLanguage;

		notificationSelect.value = selectedNotificationLanguage;

		const languageButton = document.createElement("button");
		languageButton.type = "button";
		languageButton.className = "push-language-button";
		languageButton.setAttribute("aria-haspopup", "listbox");
		languageButton.setAttribute("aria-expanded", "false");

		const languageMenu = document.createElement("div");
		languageMenu.className = "push-language-menu";
		languageMenu.setAttribute("role", "listbox");
		languageMenu.hidden = true;

function updateLanguageButton(language) {
	languageButton.replaceChildren();

	const flag = document.createElement("img");
	flag.src = `/svg/flag_${language}.svg`;
	flag.alt = "";
	flag.className = "push-language-flag";
	flag.setAttribute("aria-hidden", "true");
	languageButton.append(flag);

	const name = document.createElement("span");
	name.textContent = capitalizeLanguageName(text[language]);
	languageButton.append(name);

	const arrow = document.createElement("span");
	arrow.className = "push-language-arrow";
	arrow.textContent = "▾";
	arrow.setAttribute("aria-hidden", "true");
	languageButton.append(arrow);
	}

	for (const language of LANGUAGES) {
		const option = document.createElement("button");
		option.type = "button";
		option.className = "push-language-option";
		option.setAttribute("role", "option");
		option.setAttribute(
			"aria-selected",
			String(language === selectedNotificationLanguage)
		);

		const flag = document.createElement("img");
		flag.src = `/svg/flag_${language}.svg`;
		flag.alt = "";
		flag.className = "push-language-flag";
		flag.setAttribute("aria-hidden", "true");
		option.append(flag);

		const name = document.createElement("span");
		name.textContent = capitalizeLanguageName(text[language]);
		option.append(name);

		option.addEventListener("click", () => {
			notificationSelect.value = language;

			for (const item of languageMenu.querySelectorAll(
				".push-language-option"
			)) {
				item.setAttribute(
					"aria-selected",
					String(item === option)
				);
			}

			updateLanguageButton(language);
			languageMenu.hidden = true;
			languageButton.setAttribute("aria-expanded", "false");
		});

		languageMenu.append(option);
	}

	updateLanguageButton(selectedNotificationLanguage);

	languageButton.addEventListener("click", () => {
		languageMenu.hidden = !languageMenu.hidden;
		languageButton.setAttribute(
			"aria-expanded",
			String(!languageMenu.hidden)
		);
	});

	languageSelector.append(
		languageButton,
		languageMenu,
		notificationSelect
	);

	notificationLabel.append(languageSelector);

		const articleTitle = document.createElement("p");
		articleTitle.className = "push-article-title";
		articleTitle.textContent = text.articleLanguages;

		const articleSelector = document.createElement("div");
		articleSelector.className = "push-article-selector";

		const articleButton = document.createElement("button");
		articleButton.type = "button";
		articleButton.className = "push-article-button";
		articleButton.setAttribute("aria-expanded", "false");

		const articleButtonLabel = document.createElement("span");
		articleButtonLabel.className = "push-article-button-label";
		articleButton.append(articleButtonLabel);

		const articleArrow = document.createElement("span");
		articleArrow.className = "push-language-arrow";
		articleArrow.textContent = "▾";
		articleArrow.setAttribute("aria-hidden", "true");
		articleButton.append(articleArrow);

		const articleMenu = document.createElement("div");
		articleMenu.className = "push-article-menu";
		articleMenu.hidden = true;

		const articleOptions = document.createElement("div");
		articleOptions.className = "push-language-options";


		const savedArticleLanguages = Array.isArray(
			savedPreferences?.articleLanguages
		)
			? savedPreferences.articleLanguages.filter(
				language => LANGUAGES.includes(language)
			)
			: [];
		
		const selectedArticleLanguages =
			savedArticleLanguages.length > 0
				? savedArticleLanguages
				: [defaultLanguage];
		
		for (const language of LANGUAGES) {
			addLanguageCheckbox(
				articleOptions,
				language,
				text[language],
				selectedArticleLanguages.includes(language)
			);
		}


		function updateArticleButton() {
			const selected = Array.from(
				articleOptions.querySelectorAll(
					'input[name="articleLanguages"]:checked'
				)
			);
		
			articleButtonLabel.replaceChildren();
		
			if (selected.length === 0) {
				articleButtonLabel.textContent =
					text.selectArticleLanguage;
				articleButton.setAttribute(
					"aria-label",
					text.selectArticleLanguage
				);
				return;
			}
		
			for (const input of selected) {
				const language = input.value;
			
				const item = document.createElement("span");
				item.className = "push-article-selected-language";
			
				const flag = document.createElement("img");
				flag.src = `/svg/flag_${language}.svg`;
				flag.alt = "";
				flag.className = "push-language-flag";
				flag.setAttribute("aria-hidden", "true");
			
				const code = document.createElement("span");
				code.textContent = language.toUpperCase();
				code.setAttribute("aria-hidden", "true");
			
				item.append(flag, code);
				articleButtonLabel.append(item);
			}
		
			articleButton.setAttribute(
				"aria-label",
				selected.map(input =>
					capitalizeLanguageName(text[input.value])
				).join(", ")
			);
		}



		articleOptions.addEventListener("change", updateArticleButton);

		articleButton.addEventListener("click", () => {
			articleMenu.hidden = !articleMenu.hidden;
			articleButton.setAttribute(
				"aria-expanded",
				String(!articleMenu.hidden)
			);
		});

		articleMenu.append(articleOptions);
		articleSelector.append(articleButton, articleMenu);
		updateArticleButton();


		const saveButton = document.createElement("button");
		const disableButton = document.createElement("button");
		disableButton.type = "button";
		disableButton.className = "push-disable-action push-disable-button";
		disableButton.textContent = text.disableNotifications;
		disableButton.addEventListener("click", disableNotifications);
		saveButton.type = "submit";
		saveButton.className = "push-save-button";
		saveButton.textContent = text.savePreferences;

		panel.append(
			notificationLabel,
			articleTitle,
			articleSelector,
			saveButton,
			disableButton
		);

		panel.addEventListener("submit", async event => {
			event.preventDefault();

			const articleLanguages = Array.from(
				panel.querySelectorAll(
					'input[name="articleLanguages"]:checked'
				)
			).map(input => input.value);

			if (articleLanguages.length === 0) {
				showStatus(text.selectArticleLanguage);
				return;
			}

			saveButton.disabled = true;
			saveButton.classList.add("is-saving");

			try {
				let subscription =
					await pushRegistration.pushManager.getSubscription();

				if (!subscription) {
					if (Notification.permission === "denied") {
						showStatus(text.denied);
						return;
					}

					if (Notification.permission !== "granted") {
						const permission =
							await Notification.requestPermission();

						if (permission !== "granted") {
							showStatus(text.denied);
							return;
						}
					}

					subscription =
						await pushRegistration.pushManager.subscribe({
							userVisibleOnly: true,
							applicationServerKey:
								base64UrlToUint8Array(
									window.PUSH_CONFIG.vapidPublicKey
								)
						});
				}

				await saveSubscription(subscription, {
					notificationLanguage:
						notificationSelect.value,
					articleLanguages
				});

				pushSubscribed = true;

				saveButton.disabled = true;
				saveButton.classList.add("is-saved");
				saveButton.replaceChildren();

				const checkmark = document.createElement("span");
				checkmark.textContent = "✓ ";
				checkmark.setAttribute("aria-hidden", "true");

				const savedText = document.createElement("span");
				savedText.textContent = text.preferencesSaved;

				saveButton.append(checkmark, savedText);

				await new Promise(resolve => setTimeout(resolve, 1200));

				renderControl();

			} catch (error) {
				console.error(
					"No se pudieron guardar las preferencias",
					error
				);
				showStatus(text.preferencesError);
			} finally {
				saveButton.classList.remove("is-saving");
				saveButton.disabled = false;
			}
		});

		if (triggerButton?.parentNode === menu) {
			triggerButton.insertAdjacentElement("afterend", panel);
		} else {
			const status = menu.querySelector(".app-status");
			menu.insertBefore(panel, status || null);
		}
	}

	async function disableNotifications() {
		const text = await currentLabels();

		if (!configIsReady()) {
			showStatus(text.notConfigured);
			return;
		}

		const button =
			controlRoot?.querySelector(".push-disable-action");

		if (button) button.disabled = true;

		try {
			const subscription =
				await pushRegistration?.pushManager.getSubscription();

			if (!subscription) {
				pushSubscribed = false;
				await renderControl();
				showStatus(text.disabled);
				return;
			}

			// Cancelar primero la suscripción del navegador.
			const unsubscribed = await subscription.unsubscribe();

			if (!unsubscribed) {
				throw new Error("El navegador no canceló la suscripción");
			}

			// Después eliminar el registro del servidor.
			await deleteSubscription(subscription);

			pushSubscribed = false;
			await renderControl();
			showStatus(text.disabled);

		} catch (error) {
			console.error(
				"No se pudieron desactivar las notificaciones",
				error
			);

			showStatus(text.disableError);

			if (button) button.disabled = false;
		}
	}

	async function installApp() {
		const prompt = deferredInstallPrompt;
		if (!prompt) return;

		try {
			await prompt.prompt();
			const choice = await prompt.userChoice;

			if (choice.outcome === "accepted") {
				deferredInstallPrompt = null;
				closeMenu();
				renderControl();
			}
		} catch (error) {
			console.error("No se pudo iniciar la instalación", error);
		}
	}

	async function renderControl() {
		const nav = document.getElementById("header-links");
		if (!nav) return;

		const installAvailable = Boolean(deferredInstallPrompt);
		const text = await currentLabels();

		menuBottomObserver?.disconnect();
		menuBottomObserver = null;

		controlRoot?.remove();
		controlRoot = null;

		if (!installAvailable && !pushAvailable) return;

		const root = document.createElement("div");
		root.className = "app-control-wrap";
		controlRoot = root;

		const trigger = document.createElement("button");
		trigger.type = "button";
		trigger.id = "app-control";
		trigger.className = "header-button app-control";
		trigger.setAttribute("aria-label", text.menu);
		trigger.setAttribute("aria-expanded", "false");

		if (installAvailable) {
			trigger.append(createIcon("install"));
		}

		if (installAvailable && pushAvailable) {
			const separator = document.createElement("span");
			separator.className = "app-control-separator";
			separator.textContent = "/";
			separator.setAttribute("aria-hidden", "true");
			trigger.append(separator);
		}

		if (pushAvailable) {
			trigger.append(createIcon("bell"));
		}

		const menu = document.createElement("div");
		menu.className = "app-menu";
		menu.setAttribute("aria-label", text.menu);
		menu.hidden = true;

		if (installAvailable) {
			menu.append(
				createMenuItem("install", text.install, installApp)
			);
		}

		if (pushAvailable) {
			menu.append(
				createMenuItem(
					pushSubscribed ? "settings" : "bell",
					pushSubscribed
						? text.changePreferences
						: text.subscribe,
					showPreferences
				)
			);
		}

		menu.append(
			createMenuItem(
				"mail",
				text.newsletterTitle,
				showNewsletterForm
			)
		);

		const status = document.createElement("p");
		status.className = "app-status";
		status.setAttribute("role", "status");
		status.setAttribute("aria-live", "polite");

		menu.append(status);
		root.append(trigger, menu);
		nav.append(root);
		observeMenuBottom(menu);

		trigger.addEventListener("click", () => {
			if (installAvailable && !pushAvailable) {
				installApp();
			} else {
				toggleMenu();
			}
		});

		if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
			root.addEventListener("mouseenter", event => {
				if (event.buttons !== 0) return;
				openMenu();
			});

			root.addEventListener("mouseleave", scheduleMenuClose);
		}

		trigger.addEventListener("keydown", event => {
			if (event.key === "ArrowDown" && !menu.hidden) {
				event.preventDefault();
				menu.querySelector("button:not(:disabled)")?.focus();
			}
		});

		root.addEventListener("keydown", event => {
			if (event.key === "Escape") {
				closeMenu();
				trigger.focus();
			}
		});
	}

	window.addEventListener("beforeinstallprompt", event => {
		event.preventDefault();
		deferredInstallPrompt = event;
		renderControl();
	});

	window.addEventListener("appinstalled", () => {
		deferredInstallPrompt = null;
		renderControl();
	});


	document.addEventListener("click", event => {
		if (
			controlRoot
			&& !controlRoot.contains(event.target)
		) {
			closeMenu();
		}
	});


	window.addEventListener("languageChanged", () => {
		renderControl();
	});

	async function setupPushControls() {
	if (setupPromise) return setupPromise;

	setupPromise = (async () => {
		try {
			if (!("serviceWorker" in navigator)) {
				await renderControl();
				return;
			}

			const registration = await navigator.serviceWorker.register("/sw.js", {
			    scope: "/"
			});

			// Esperamos a que el service worker esté activo.
			const readyRegistration = await navigator.serviceWorker.ready;

			// Comunicamos si este cliente está funcionando como PWA.
			if (window.setupOfflineMode) {
			    await window.setupOfflineMode(readyRegistration);
			}


			if (canUsePush()) {
				pushRegistration = await navigator.serviceWorker.ready;
				pushAvailable = true;

				const subscription =
					await pushRegistration.pushManager.getSubscription();

				pushSubscribed = Boolean(subscription);
			}

			await renderControl();

		} catch (error) {
			console.error(
				"No se pudieron inicializar las funciones de la aplicación",
				error
			);

			setupPromise = null;

			await renderControl();
		}
	})();

	return setupPromise;
	}

	window.setupPushControls = setupPushControls;
})();
