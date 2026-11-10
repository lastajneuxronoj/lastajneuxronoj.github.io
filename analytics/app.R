
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

source(file.path(APP_DIR, "goatcounter_data.R"))

source(file.path(APP_DIR, "wordpress_data.R"))

source(file.path(APP_DIR, "goatcounter_functions.R"))

goatcounter <- add_country_names(goatcounter)

# Cargar funciones para combinar las fuentes
source(file.path(APP_DIR, "combined_data.R"))

# Normalizar datos
wordpress_normalized <- normalize_wordpress(traffic_wp)

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
			
			.bslib-sidebar-layout.summary-active > .collapse-toggle {
				display: none !important;
			}
		")),
		
		tags$script(HTML("
			$(document).on('shiny:inputchanged', function(event) {

				if (event.name === 'main_tabs') {

					const sidebar = document.getElementById('main_sidebar');
					const layout = sidebar?.closest('.bslib-sidebar-layout');

					if (layout) {
						layout.classList.toggle(
						'summary-active',
						event.value === 'Resumen'
					);
				}

				return;
			}

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
		
		dateRangeInput(
			inputId = "date_range",
			label = "Período de visitas",
			start = as.Date(min(combined_data$date)),
			end = as.Date(max(combined_data$date)),
			min = as.Date(min(combined_data$date)),
			max = as.Date(max(combined_data$date)),
			language = "es",
			separator = " hasta "
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
			value = FALSE
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
	
	# Mostrar u ocultar pestañas según la fuente de datos
	observeEvent(input$include_wordpress, {
		
		if (isTRUE(input$include_wordpress)) {
			
			# Si estamos en una pestaña que desaparecerá,
			# seleccionar primero Tráfico
			if (input$main_tabs %in% c("Geografía", "Fuentes")) {
				nav_select("main_tabs", "Tráfico")
			}
			
			nav_hide("main_tabs", "Geografía")
			nav_hide("main_tabs", "Fuentes")
			
		} else {
			
			nav_show("main_tabs", "Geografía")
			nav_show("main_tabs", "Fuentes")
			
		}
		
	}, ignoreInit = FALSE)
	
	# Datos filtrados
	filtered_data <- reactive({
		
		data <- goatcounter
		
		# Filtrar por período
		data <- data %>%
			filter(
				Date >= as.POSIXct(input$date_range[1], tz = "UTC"),
				Date < as.POSIXct(input$date_range[2] + 1, tz = "UTC")
			)
		
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
		data <- data %>%
			filter(
				date >= as.Date(input$date_range[1]),
				date <= as.Date(input$date_range[2])
			)
		
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
		output = output,
		filtered_data = filtered_data,
		filtered_combined_data = filtered_combined_data
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
		filtered_referrer_data = filtered_referrer_data
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
		goatcounter_normalized = goatcounter_normalized
	)
	
}


# ==========================================
# 4. INICIAR APLICACIÓN
# ==========================================

shinyApp(ui = ui, server = server)
