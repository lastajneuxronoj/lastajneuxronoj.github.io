async function loadHeader() {
	const container = document.getElementById("header-container");
	if (!container) return;

	let html = sessionStorage.getItem("header");

	if (!html) {
		const res = await fetch("/components/header.html");

		if (!res.ok) {
			console.error("No se pudo cargar el header");
			return;
		}

		html = await res.text();
		sessionStorage.setItem("header", html);
	}

	container.innerHTML = html;

	await initHeaderFeatures();
}


async function loadFooter() {
	const container = document.getElementById("footer-container");
	if (!container) return;

	let html = sessionStorage.getItem("footer");

	if (!html) {
		const res = await fetch("/components/footer.html");

		if (!res.ok) {
			console.error("No se pudo cargar el footer");
			return;
		}

		html = await res.text();
		sessionStorage.setItem("footer", html);
	}

	container.innerHTML = html;
}


async function initHeaderFeatures() {
	setupMenu();
	setupTheme();
	setupLangToggle();

	await updateLanguageDependentLinks();

	applyTranslations();
}

let menuOpen = false;


function updateMenuIcon() {
	const menuIcon = document.getElementById("menu-icon");
	if (!menuIcon) return;

	const isDark = document.body.classList.contains("dark");

	if (menuOpen) {
		menuIcon.src = isDark
			? "/svg/close_menu_w.svg"
			: "/svg/close_menu_b.svg";
	} else {
		menuIcon.src = isDark
			? "/svg/menu_w.svg"
			: "/svg/menu_b.svg";
	}
}


function setupMenu() {

	const menuToggle = document.getElementById("menu-toggle");
	const headerLinks = document.getElementById("header-links");

	const progressContainer =
		document.getElementById("progress-bar-container");


	if (!menuToggle || !headerLinks) return;


	menuToggle.addEventListener("click", () => {

		menuOpen = !menuOpen;

		headerLinks.classList.toggle("open");

		menuToggle.setAttribute(
			"aria-label",
			menuOpen ? "Cerrar menú" : "Abrir menú"
		);

		updateMenuIcon();


		if (progressContainer) {
			progressContainer.style.top =
				menuOpen ? "217px" : "67px";
		}
	});


	updateMenuIcon();
}

function setupTheme() {
	const theme = localStorage.getItem("theme") || "light";

	const body = document.body;
	const html = document.documentElement;

	const icon = document.getElementById("theme-icon");
	const themeSwitch = document.getElementById("theme-switch");


	function setIconSrc(theme, animate = false) {

		if (!icon) return;

		const newSrc =
			theme === "dark"
				? "/svg/moon_b.svg"
				: "/svg/sun_w.svg";


		if (animate) {
			icon.classList.add("icon-swapping");

			setTimeout(() => {
				icon.src = newSrc;
				icon.classList.remove("icon-swapping");
			}, 300);

		} else {
			icon.src = newSrc;
		}


		icon.alt =
			theme === "dark"
				? "Modo claro"
				: "Modo oscuro";
	}


	function applyTheme(theme, animate = false) {

		if (theme === "dark") {
			body.classList.add("dark");
			html.classList.add("dark");
		} else {
			body.classList.remove("dark");
			html.classList.remove("dark");
		}


		const backIcon = document.getElementById("back-icon");

		if (backIcon) {
			backIcon.src =
				theme === "dark"
					? "/svg/left_arrow_w.svg"
					: "/svg/left_arrow_b.svg";
		}


		updateMenuIcon();

		setIconSrc(theme, animate);
	}


	applyTheme(theme);


	if (!themeSwitch) return;


	themeSwitch.addEventListener("click", () => {

		const current =
			localStorage.getItem("theme") || "light";

		const next =
			current === "light"
				? "dark"
				: "light";


		localStorage.setItem("theme", next);

		applyTheme(next, true);
	});
}

// ---------- BARRA DE PROGRESO ----------
function setupProgressBar() {
	const progressBar = document.getElementById("progress-bar");
	if (!progressBar) return;

	function updateProgress() {
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;

		// Evita división por cero en páginas cortas
		if (docHeight <= 0) {
			progressBar.style.width = "100%";
			progressBar.classList.add("complete");
			return;
		}

		const scrollPercent = (scrollTop / docHeight) * 100;

		progressBar.style.width = `${scrollPercent}%`;

		if (scrollPercent >= 85) {
			progressBar.classList.add("complete");
		} else {
			progressBar.classList.remove("complete");
		}
	}

	window.addEventListener("scroll", updateProgress);

	// Ejecutar una vez al cargar
	updateProgress();
}

async function updateLanguageDependentLinks(userInitiated = false) {
	const lang = getCurrentLang();

	document.documentElement.lang = lang;
	localStorage.setItem("lang", lang);

	const links = {
		"header-about": "about"
	};

	for (const [id, page] of Object.entries(links)) {
		const el = document.getElementById(id);
		if (el) {
			el.href = `/${page}-${lang}.html`;
		}
	}

	const page = document.body.dataset.page;
	const postNumber = document.body.dataset.number;

	let targetUrl = null;

	if (page === "post" && postNumber) {
		const availableLangs = (document.body.dataset.availableLangs || "").split(",");

		if (!availableLangs.includes(lang)) {
			if (userInitiated) {
				await showLangUnavailableError(availableLangs);
			}
			return; // no navegar, ni en carga ni en click
		}

		targetUrl = `/blog/${postNumber}-${lang}.html`;
	} else if (page === "about") {
		targetUrl = `/about-${lang}.html`;
	}

	// Solo redirigir si el usuario lo pidió explícitamente
	if (userInitiated && targetUrl && window.location.pathname !== targetUrl) {
		window.location.href = targetUrl;
	}
}

async function showLangUnavailableError(availableLangs) {
	const translations = await getTranslations();
	const currentLang = getCurrentLang();
	const t = translations[currentLang];

	const number = document.body.dataset.number;

	let titles = {};
	try {
		titles = JSON.parse(document.body.dataset.titles || "{}");
	} catch {
		titles = {};
	}

	const overlay = document.getElementById("lang-modal-overlay");
	const message = document.getElementById("lang-modal-message");
	const list = document.getElementById("lang-modal-list");
	const closeBtn = document.getElementById("lang-modal-close");

	if (!overlay || !message || !list) {
		alert(t.errors.onlyAvailableIn.replace("{langs}", availableLangs.join(", ")));
		return;
	}

	if (overlay.parentElement !== document.body) {
		document.body.appendChild(overlay);
	}

	message.textContent = t.errors.onlyAvailableIn.replace("{langs}", "");

	list.innerHTML = "";

		list.innerHTML = "";

			availableLangs.forEach((code) => {
				const li = document.createElement("li");
				const a = document.createElement("a");
			
				const flagImg = document.createElement("img");
				flagImg.className = "lang-modal-flag";
				flagImg.src = `/svg/flag_${code}.svg`;
				flagImg.alt = "";
				flagImg.setAttribute("aria-hidden", "true");
			
				const textWrapper = document.createElement("span");
				textWrapper.className = "lang-modal-text";
			
				const langSpan = document.createElement("span");
				langSpan.className = "lang-modal-lang";
				langSpan.textContent = titles[code]
					? `${t.languageNames[code] || code}:`
					: (t.languageNames[code] || code);
			
				textWrapper.appendChild(langSpan);
			
				if (titles[code]) {
					const titleSpan = document.createElement("span");
					titleSpan.className = "lang-modal-title";
					titleSpan.textContent = ` ${titles[code]}`;
				
					textWrapper.appendChild(titleSpan);
				}
			
				a.href = `/blog/${number}-${code}.html`;
				a.dataset.lang = code;
				a.appendChild(flagImg);
				a.appendChild(textWrapper);
			
				li.appendChild(a);
				list.appendChild(li);
			});

	overlay.classList.remove("hidden");

	function close() {
		overlay.classList.add("hidden");
		closeBtn.removeEventListener("click", close);
		overlay.removeEventListener("click", onOverlayClick);
	}

	function onOverlayClick(e) {
		if (e.target === overlay) close();
	}

	closeBtn.addEventListener("click", close);
	overlay.addEventListener("click", onOverlayClick);
}

function setupDetailsAnimation() {
	document.querySelectorAll("details").forEach((details) => {
		const summary = details.querySelector("summary");

		if (!summary) return;

		summary.addEventListener("click", (e) => {
			e.preventDefault();

			if (details.hasAttribute("open")) {
				// primero animamos hacia cerrado
				details.classList.add("closing");

				setTimeout(() => {
					details.removeAttribute("open");
					details.classList.remove("closing");
				}, 200);

			} else {
				details.setAttribute("open", "");
			}
		});
	});
}