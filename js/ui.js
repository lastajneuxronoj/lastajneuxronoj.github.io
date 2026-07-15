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

	applyTranslations();
	updateLanguageDependentLinks();
	setupSearch();
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

	const preloadIcons = [
		"/svg/sun_w.svg",
		"/svg/moon_b.svg"
	];

	preloadIcons.forEach(src => {
		const img = new Image();
		img.src = src;
	});

	const savedTheme = localStorage.getItem("theme");

	const theme =
		savedTheme ||
		(
			window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
		);

	const body = document.body;
	const html = document.documentElement;

	const icon = document.getElementById("theme-icon");
	const themeSwitch = document.getElementById("theme-switch");


function setIconSrc(theme) {

	if (!icon) return;

	icon.src =
		theme === "dark"
			? "/svg/moon_b.svg"
			: "/svg/sun_w.svg";


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

		const searchIcon = document.getElementById("search-icon");

		if (searchIcon) {
			searchIcon.src =
				theme === "dark"
					? "/svg/search_b.svg"
					: "/svg/search_w.svg";
		}

		updateMenuIcon();

		setIconSrc(theme);

		updateHighlightTheme(theme);
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

	document.dispatchEvent(
		new CustomEvent("languageChanged", {
			detail: {
				lang: lang
			}
		})
	);
	
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

	let targetUrl = null;
	let availableLangs = null;
	let buildLinkForLang = null;

	if (page === "post") {
		const postNumber = document.body.dataset.number;
		availableLangs = (document.body.dataset.availableLangs || "").split(",");
		targetUrl = `/blog/${postNumber}-${lang}.html`;
		buildLinkForLang = (code) => `/blog/${postNumber}-${code}.html`;

	} else if (page === "page") {
		const pageId = document.body.dataset.pageId;
		availableLangs = (document.body.dataset.availableLangs || "").split(",");
		targetUrl = `/${pageId}-${lang}.html`;
		buildLinkForLang = (code) => `/${pageId}-${code}.html`;

	} else if (page === "category") {
		const categorySlug = document.body.dataset.category;
		availableLangs = (document.body.dataset.availableLangs || "").split(",");
		targetUrl = `/blog/categories/${categorySlug}.html`;
		buildLinkForLang = () => `/blog/categories/${categorySlug}.html`;
	}

	if (availableLangs && !availableLangs.includes(lang)) {
		if (userInitiated) {
			await showLangUnavailableError(availableLangs, buildLinkForLang);
		}
		return; // no navegar, ni en carga ni en click
	}

	if (userInitiated && targetUrl && window.location.pathname !== targetUrl) {
		window.location.href = targetUrl;
	}
}

async function showLangUnavailableError(availableLangs, buildLinkForLang) {
	const translations = await getTranslations();
	const currentLang = getCurrentLang();
	const t = translations[currentLang];

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

		a.href = buildLinkForLang ? buildLinkForLang(code) : "#";
		a.dataset.lang = code;
		a.appendChild(flagImg);
		a.appendChild(textWrapper);

		li.appendChild(a);
		list.appendChild(li);

		a.addEventListener("click", () => {
		localStorage.setItem("lang", code);
	});

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

// Cambia los colores del pre code (invertido)
function updateHighlightTheme(theme) {
	const light = document.getElementById("hljs-dark");
	const dark = document.getElementById("hljs-light");

	if (!light || !dark) return;

	const isDark = theme === "dark";

	light.disabled = isDark;
	dark.disabled = !isDark;
}



// Agrega un scroll suave
document.querySelectorAll('a[href^="#"]').forEach(link => {
	link.addEventListener("click", function (event) {
		const id = this.getAttribute("href");

		if (id === "#") return;

		const target = document.querySelector(id);

		if (!target) return;

		event.preventDefault();

		target.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});

		history.pushState(null, "", id);

		highlightCaption(target);
	});
});

// Encuentra la descripción asociada a un elemento referenciado
function findCaption(target) {
	if (target.matches(".equation-block")) {
		return target.querySelector(".equation-number") || target;
	}

	if (target.tagName === "FIGURE") {
		return target.querySelector("figcaption") || target;
	}

	if (target.matches(".table-wrapper")) {
		const sibling = target.nextElementSibling;
		if (sibling && sibling.classList.contains("table-caption")) {
			return sibling;
		}
	}

	return target; // fallback: resalta el propio elemento
}

// Dispara la animación de resaltado (soporta clicks repetidos)
function highlightCaption(target) {

	const caption = findCaption(target);

	const isHeading =
		/^H[1-6]$/.test(caption.tagName);

	const highlightClass = isHeading
		? "highlight-heading"
		: "highlight-flash";

	caption.classList.remove(highlightClass);

	void caption.offsetWidth;

	caption.classList.add(highlightClass);

	caption.addEventListener("animationend", () => {
		caption.classList.remove(highlightClass);
	}, { once: true });

}

// Botón de copiar código
document.querySelectorAll(".copy-button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const code = btn.closest(".code-language").nextElementSibling.querySelector("code");
    const icon = btn.querySelector("i");
    try {
      await navigator.clipboard.writeText(code.textContent);
      icon.className = "ti ti-check";
      setTimeout(() => { icon.className = "ti ti-copy"; }, 1500);
    } catch {
      icon.className = "ti ti-x";
    }
  });
});

function initializeTOC() {

	const headings = document.querySelectorAll(
		"h1[id], h2[id], h3[id], h4[id]"
	);

	const tocItems = document.querySelectorAll(
		".toc-item"
	);

	if (!headings.length || !tocItems.length) {
		return;
	}

	const observer = new IntersectionObserver(

		(entries) => {

			entries.forEach(entry => {

				if (!entry.isIntersecting) {
					return;
				}

				const id = entry.target.id;

				tocItems.forEach(item => {
					item.classList.remove("active");
				});

				const activeItem = document.querySelector(
					`.toc-item[data-target="${id}"]`
				);

				if (activeItem) {
					activeItem.classList.add("active");
				}

			});

		},

		{
			rootMargin: "-20% 0px -70% 0px"
		}

	);

	headings.forEach(heading => {
		observer.observe(heading);
	});

}