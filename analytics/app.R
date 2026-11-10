
# ==========================================
# LASTAJ NEŬRONOJ — DASHBOARD
# ==========================================

library(shiny)
library(bslib)
library(dplyr)
library(plotly)
library(leaflet)
library(countrycode)
library(sf)
library(rnaturalearth)
library(tidyr)
library(shinyjs)

# ==========================================
# 1. CARGAR DATOS Y FUNCIONES
# ==========================================

APP_DIR <- if (!is.null(sys.frame(1)$ofile)) {
	dirname(
		normalizePath(
			sys.frame(1)$ofile,
			winslash = "/",
			mustWork = TRUE
		)
	)
} else {
	normalizePath(
		getwd(),
		winslash = "/",
		mustWork = TRUE
	)
}

source(file.path(APP_DIR, "config.R"))

# Cargar funciones reutilizables
source(file.path(APP_DIR, "goatcounter_functions.R"))

# Cargar y preparar datos
source(file.path(APP_DIR, "goatcounter_data.R"))
source(file.path(APP_DIR, "wordpress_data.R"))

goatcounter <- add_country_names(goatcounter)

# Cargar funciones para combinar las fuentes
source(file.path(APP_DIR, "combined_data.R"))

# Normalizar datos
wordpress_normalized <- normalize_wordpress(traffic_wp, wordpress_articles)

goatcounter_normalized <- normalize_goatcounter(goatcounter)

# Combinar datos
combined_data <- combine_traffic_data(
	wordpress_normalized,
	goatcounter_normalized
)

# Cargar geometrías de los países
world <- rnaturalearth::ne_countries(
	scale = "medium",
	returnclass = "sf"
) %>%
	sf::st_transform(4326)

# Cargar módulos

source(file.path(APP_DIR, "modules", "summary.R"))
source(file.path(APP_DIR, "modules", "geography.R"))
source(file.path(APP_DIR, "modules", "traffic.R"))
source(file.path(APP_DIR, "modules", "languages.R"))
source(file.path(APP_DIR, "modules", "articles.R"))
source(file.path(APP_DIR, "modules", "sources.R"))
source(file.path(APP_DIR, "modules", "editorial.R"))

# ==========================================
# 2. INTERFAZ
# ==========================================

ui <- page_sidebar(
	
	shinyjs::useShinyjs(),
	
	title = "Lastaj Neŭronoj — Estadísticas",
	
	theme = bs_theme(
		version = 5,
		bootswatch = "flatly"
	),
	
	tags$head(
		tags$style(HTML("
			.traffic-transition {
				transition: opacity 120ms ease-in-out;
			}

			.traffic-transition.transitioning {
				opacity: 0;
			}

			/* Tarjetas de la cronología editorial */
			.editorial-value-box .value-box-showcase {
				padding-top: 0.75rem;
			}
			
		")),
		
		tags$script(HTML("
    $(document).on('shiny:inputchanged', function(event) {
        if (event.name !== 'include_wordpress') return;

        const container = document.getElementById(
            'daily_traffic_container'
        );

        if (!container) return;

        container.classList.add('transitioning');

        setTimeout(function() {
            container.classList.remove('transitioning');
        }, 140);
    });
"))
	),
	
	sidebar = sidebar(
		id = "main_sidebar",
		title = "Filtros",
		
		# Período
		selectInput(
			inputId = "summary_year",
			label = "Período",
			choices = c("Todos" = "all"),
			selected = "all",
			width = "100%"
		),
		
		hr(),
		
		selectizeInput(
			inputId = "exclude_countries",
			label = "Excluir países",
			choices = sort(unique(
				goatcounter$country[
					!is.na(goatcounter$country) &
						goatcounter$country != "País no identificado"
				]
			)),
			selected = character(0),
			multiple = TRUE,
			options = list(
				placeholder = "Selecciona países...",
				plugins = list("remove_button")
			)
		),
		
		hr(),
		
		helpText(
			"Selecciona un país en el mapa o en el gráfico para destacarlo."
		),
		
		
		selectizeInput(
			inputId = "language",
			label = "Idioma",
			choices = c(
				setNames(
					names(LANGUAGE_LABELS),
					unname(LANGUAGE_LABELS)
				),
				"Sin identificar" = "unknown"
			),
			selected = character(0),
			multiple = TRUE,
			options = list(
				placeholder = "Todos los idiomas",
				plugins = list("remove_button")
			)
		),
		
		hr(),
		
		selectizeInput(
			inputId = "source_category_filter",
			label = "Categorías de fuentes",
			choices = names(SOURCE_COLORS),
			selected = character(0),
			multiple = TRUE,
			options = list(
				placeholder = "Todas las categorías",
				plugins = list("remove_button")
			)
		),
		
		hr(),
		
		checkboxInput(
			inputId = "include_wordpress",
			label = "Incluir WordPress",
			value = TRUE
		)
		
	),
	
	navset_card_tab(
		id = "main_tabs",
		summary_ui,
		geography_ui,
		traffic_ui,
		languages_ui,
		articles_ui,
		sources_ui,
		editorial_ui
	)
)


# ==========================================
# 3. SERVIDOR
# ==========================================

server <- function(input, output, session) {
	
	# Ocultar el sidebar en la pestaña Resumen
	observeEvent(input$main_tabs, {
		bslib::toggle_sidebar(
			id = "main_sidebar",
			open = input$main_tabs != "Resumen",
			session = session
		)
	})
	
	# Controlar disponibilidad de la casilla WordPress
	observeEvent(input$summary_year, {
		
		if (isTRUE(input$summary_year %in% c("2024", "2025"))) {
			
			updateCheckboxInput(
				session,
				"include_wordpress",
				value = TRUE
			)
			
			shinyjs::disable("include_wordpress")
			
		} else {
			
			shinyjs::enable("include_wordpress")
			
		}
		
	}, ignoreInit = FALSE)
	
	# Controlar disponibilidad de pestañas según la fuente de datos
	observeEvent(input$include_wordpress, {
		
		wordpress_enabled <- isTRUE(input$include_wordpress)
		
		# Si se activa WordPress estando en una pestaña
		# que quedará deshabilitada, cambiar primero a Tráfico.
		if (
			wordpress_enabled &&
			input$main_tabs %in% c("Geografía")
		) {
			nav_select("main_tabs", "Tráfico")
		}
		
		# Deshabilitar o habilitar las pestañas mediante JavaScript.
		disabled_js <- if (wordpress_enabled) "true" else "false"
		
		shinyjs::runjs(sprintf("
        (function() {
            const root = document.getElementById('main_tabs');
            if (!root) return;

            ['Geografía'].forEach(function(value) {
                const tab = root.querySelector(
                    '.nav-link[data-value=\"' + value + '\"]'
                );

                if (!tab) return;

                tab.classList.toggle('disabled', %s);

                if (%s) {
                    tab.setAttribute('aria-disabled', 'true');
                    tab.setAttribute('tabindex', '-1');
                } else {
                    tab.removeAttribute('aria-disabled');
                    tab.removeAttribute('tabindex');
                }
            });
        })();
    ", disabled_js, disabled_js))
		
	}, ignoreInit = FALSE)
	
	# Datos filtrados
	filtered_data <- reactive({
		
		data <- goatcounter
		
		# Filtrar por período
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(
					format(Date, "%Y", tz = "UTC") == input$summary_year
				)
			
		}
		
		# Filtrar por idioma
		if (length(input$language) > 0) {
			
			data <- data %>%
				filter(
					language %in% input$language |
						("unknown" %in% input$language & is.na(language))
				)
			
		}
		
		# Excluir Chile si está seleccionado
		if (length(input$exclude_countries) > 0) {
			data <- filter_goatcounter(
				data,
				exclude_countries = input$exclude_countries
			)
		}
		
		# Filtrar por categoría de fuente
		if (length(input$source_category_filter) > 0) {
			data <- data %>%
				filter(
					source_category %in% input$source_category_filter
				)
		}
		
		data
	})
	
	# Datos combinados para gráficos compatibles
	filtered_combined_data <- reactive({
		
		# Elegir la fuente de datos
		data <- if (isTRUE(input$include_wordpress)) {
			combined_data
		} else {
			goatcounter_normalized
		}
		
		# Filtrar por período
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(
					format(date, "%Y") == input$summary_year
				)
			
		}
		
		# Filtrar por idioma
		if (length(input$language) > 0) {
			
			data <- data %>%
				filter(
					language %in% input$language |
						("unknown" %in% input$language & is.na(language))
				)
			
		}
		
		data
	})
	
	# Datos de referentes filtrados
	filtered_referrer_data <- reactive({
		filtered_data()
	})
	
	# Servidor del módulo de Tráfico
	traffic_server(
		input = input,
		output = output,
		filtered_data = filtered_data,
		filtered_combined_data = filtered_combined_data,
		goatcounter = goatcounter,
		wordpress_monthly_visits = wordpress_monthly_visits
	)
	
	# Servidor del módulo de Geografía
	geography_server(
		input = input,
		output = output,
		filtered_data = filtered_data,
		world = world
	)
	

	# Servidor del módulo de Idiomas
	languages_server(
		output = output,
		filtered_combined_data = filtered_combined_data
	)
	
	# Servidor del módulo de Artículos
	articles_server(
		input = input,
		output = output,
		filtered_combined_data = filtered_combined_data
	)
	
	# Servidor del módulo de Fuentes
	sources_server(
		input = input,
		output = output,
		session = session,
		filtered_referrer_data = filtered_referrer_data,
		wordpress_sources = wordpress_sources
	)
	
	# Servidor del módulo de Editorial
	editorial_server(
		input,
		output
		)
	
	# Servidor del módulo de Resumen
	summary_server(
		input = input,
		output = output,
		session = session,
		goatcounter = goatcounter,
		goatcounter_normalized = goatcounter_normalized,
		wordpress_monthly_visits = wordpress_monthly_visits,
		wordpress_yearly_countries = wordpress_yearly_countries
	)
	
}


# ==========================================
# 4. INICIAR APLICACIÓN
# ==========================================

shinyApp(ui = ui, server = server)
