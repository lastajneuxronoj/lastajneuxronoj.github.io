
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

APP_DIR <- local({
	
	candidates <- normalizePath(
		c(
			getwd(),
			file.path(getwd(), "analytics")
		),
		winslash = "/",
		mustWork = FALSE
	)
	
	valid <- candidates[
		file.exists(file.path(candidates, "config.R"))
	]
	
	if (length(valid) == 0) {
		stop("No se pudo encontrar el directorio de la aplicación.")
	}
	
	valid[[1]]
})

source(file.path(APP_DIR, "config.R"), local = TRUE)

# Cargar publicaciones
posts <- jsonlite::fromJSON(
	file.path(APP_DIR, "..", "json", "posts.json"),
	simplifyVector = FALSE
)

# Preparar disponibilidad de idiomas por publicación
posts_languages <- bind_rows(
	lapply(posts, function(post) {
		
		languages <- names(post$file)
		
		languages <- languages[
			vapply(
				post$file[languages],
				function(file) {
					!is.null(file) && nzchar(file)
				},
				logical(1)
			)
		]
		
		title <- if ("eo" %in% names(post$title)) {
			post$title[["eo"]]
		} else {
			post$title[[1]]
		}
		
		data.frame(
			number = post$number,
			title = title,
			language = languages,
			stringsAsFactors = FALSE
		)
	})
)

# Cargar funciones reutilizables
source(file.path(APP_DIR, "goatcounter_functions.R"), local = TRUE)
source(file.path(APP_DIR, "goatcounter_data.R"), local = TRUE)
source(file.path(APP_DIR, "wordpress_data.R"), local = TRUE)

goatcounter <- add_country_names(goatcounter)

load_goatcounter_data <- function() {
	env <- new.env(parent = globalenv())
	
	sys.source(
		file.path(APP_DIR, "goatcounter_data.R"),
		envir = env
	)
	
	gc <- add_country_names(env$goatcounter)
	gc_normalized <- normalize_goatcounter(gc)
	
	list(
		goatcounter = gc,
		goatcounter_normalized = gc_normalized,
		combined_data = combine_traffic_data(
			wordpress_normalized,
			gc_normalized
		)
	)
}

# Cargar funciones para combinar las fuentes
source(file.path(APP_DIR, "combined_data.R"), local = TRUE)

# Normalizar datos
wordpress_normalized <- normalize_wordpress(traffic_wp, wordpress_articles)

goatcounter_normalized <- normalize_goatcounter(goatcounter)

# Combinar datos
combined_data <- combine_traffic_data(
	wordpress_normalized,
	goatcounter_normalized
)


# Registro de la última actualización de GoatCounter
LAST_REFRESH_FILE <- file.path(
	PROCESSED_DATA_DIR,
	"last_goatcounter_refresh.txt"
)

read_last_refresh <- function() {
	
	if (!file.exists(LAST_REFRESH_FILE)) {
		return(NULL)
	}
	
	value <- readLines(
		LAST_REFRESH_FILE,
		n = 1,
		warn = FALSE
	)
	
	if (length(value) == 0 || !nzchar(value)) {
		return(NULL)
	}
	
	as.POSIXct(
		value,
		format = "%Y-%m-%dT%H:%M:%S",
		tz = "UTC"
	)
}

save_last_refresh <- function(time = Sys.time()) {
	
	dir.create(
		PROCESSED_DATA_DIR,
		recursive = TRUE,
		showWarnings = FALSE
	)
	
	writeLines(
		format(
			time,
			"%Y-%m-%dT%H:%M:%S",
			tz = "UTC"
		),
		LAST_REFRESH_FILE
	)
}

RATE_LIMIT_FILE <- file.path(
	PROCESSED_DATA_DIR,
	"goatcounter_rate_limit.txt"
)

read_rate_limit <- function() {
	if (!file.exists(RATE_LIMIT_FILE)) {
		return(NULL)
	}
	
	value <- readLines(
		RATE_LIMIT_FILE,
		n = 1,
		warn = FALSE
	)
	
	if (length(value) == 0 || !nzchar(value)) {
		return(NULL)
	}
	
	as.POSIXct(
		value,
		format = "%Y-%m-%dT%H:%M:%S",
		tz = "UTC"
	)
}

save_rate_limit <- function(time) {
	dir.create(
		PROCESSED_DATA_DIR,
		recursive = TRUE,
		showWarnings = FALSE
	)
	
	writeLines(
		format(
			time,
			"%Y-%m-%dT%H:%M:%S",
			tz = "UTC"
		),
		RATE_LIMIT_FILE
	)
}


# Cargar geometrías de los países
world <- rnaturalearth::ne_countries(
	scale = "medium",
	returnclass = "sf"
) %>%
	sf::st_transform(4326)

# Cargar módulos
source(file.path(APP_DIR, "modules", "summary.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "geography.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "traffic.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "languages.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "articles.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "sources.R"), local = TRUE)
source(file.path(APP_DIR, "modules", "editorial.R"), local = TRUE)

# ==========================================
# 2. INTERFAZ
# ==========================================

addResourcePath(
	"project-svg",
	file.path(PROJECT_ROOT, "svg")
)

ui <- page_sidebar(
	
	page_title = "Estadísticas — Lastaj Neŭronoj",
	
	shinyjs::useShinyjs(),
	
	# Pantalla de carga
	tags$div(
		id = "dashboard_loading",
		class = "dashboard-loading",
		
		tags$img(
			src = "project-svg/logo-dashboard.svg",
			class = "dashboard-loading-logo",
			alt = "Lastaj Neŭronoj"
		),
		
		tags$div(
			class = "dashboard-loading-message",
			"Cargando estadísticas..."
		)
	),
	
	title = tags$div(
		style = "display: flex; align-items: center; gap: 8px;",
		
		tags$img(
			src = "project-svg/logo-dashboard.svg",
			style = "height: 30px; width: auto; filter: invert(1);"
		),
		
		tags$span(
			style = "
            font-family: 'Playfair Display', serif;
            font-style: italic;
            font-weight: 600;
            font-size: 1.5rem
        ",
			"Lastaj Neŭronoj"
		),
		
		tags$span(
			style = "font-size: 1.2rem; font-weight: normal;",
			"— Estadísticas"
		)
	),
	
	theme = bs_theme(
		version = 5,
		bootswatch = "flatly",
		bg = BACKGROUND_COLOR,
		fg = PRIMARY_COLOR,
		primary = PRIMARY_COLOR,
		secondary = SECONDARY_COLOR,
		border = BASE_COLOR_SOLID
	),
	
	tags$head(
		tags$style(
			sprintf(
				":root {
                --card-background: %s;
                --plot-background: %s;
                --card-corner-radius: %s;
                --plot-corner-radius: %s;

                --background-color: %s;
                --base-color: %s;
                --base-color-solid: %s;
                --primary-color: %s;
                --secondary-color: %s;
                --tertiary-color: %s;
                --quaternary-color: %s;
            }",
				CARD_BACKGROUND,
				PLOT_BACKGROUND,
				CARD_CORNER_RADIUS,
				PLOT_CORNER_RADIUS,
				BACKGROUND_COLOR,
				BASE_COLOR,
				BASE_COLOR_SOLID,
				PRIMARY_COLOR,
				SECONDARY_COLOR,
				TERTIARY_COLOR,
				QUATERNARY_COLOR
			)
		),
		
		# Cargar Playfair Display
		tags$link(
			rel = "stylesheet",
			href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400..800&display=swap"
		),
		
		# Cargar estilos y scripts
		tags$link(
			rel = "stylesheet",
			href = "dashboard.css"
		),
		
		tags$script(
			src = "dashboard.js"
		)
	),
	
	sidebar = sidebar(
		id = "main_sidebar",
		title = "Filtros",
		bg = PRIMARY_COLOR,
		fg = BACKGROUND_COLOR,
		
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
		),
		
		hr(),
		
		actionButton(
			inputId = "refresh_goatcounter",
			label = "Actualizar datos",
			icon = icon("refresh"),
			width = "100%"
		),
		
		uiOutput("refresh_status")
		
		
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
	
	goatcounter_state <- reactiveVal(list(
		goatcounter = goatcounter,
		goatcounter_normalized = goatcounter_normalized,
		combined_data = combined_data
	))
	
	goatcounter_data <- reactive({
		goatcounter_state()$goatcounter
	})
	
	goatcounter_normalized_data <- reactive({
		goatcounter_state()$goatcounter_normalized
	})
	
	combined_data_reactive <- reactive({
		goatcounter_state()$combined_data
	})
	
	
	# Estado de actualización de GoatCounter
	last_refresh <- reactiveVal(read_last_refresh())
	rate_limit_until <- reactiveVal(read_rate_limit())
	refresh_running <- reactiveVal(FALSE)
	refresh_status <- reactiveVal("")
	refresh_process <- reactiveVal(NULL)
	refresh_output <- reactiveVal(character())
	refresh_error <- reactiveVal(character())
	
	
	
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
	
	
	# Datos filtrados
	filtered_data <- reactive({
		
		data <- goatcounter_data()
		
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
		data <- if (input$include_wordpress) {
			combined_data_reactive()
		} else {
			goatcounter_normalized_data()
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
		
		# Excluir países de GoatCounter
		if (length(input$exclude_countries) > 0) {
			data <- filter_goatcounter(
				data,
				exclude_countries = input$exclude_countries
			)
		}
		
		data
	})
	
	# Datos de referentes filtrados
	filtered_referrer_data <- reactive({
		filtered_data()
	})
	
	# Confirmación y control de frecuencia de actualización
	observeEvent(input$refresh_goatcounter, {
		
		if (isTRUE(refresh_running())) {
			return()
		}
		
		now <- Sys.time()
		
		# Comprobar el límite informado por GoatCounter
		server_limit <- rate_limit_until()
		
		if (!is.null(server_limit)) {
			
			if (now < server_limit) {
				
				remaining <- ceiling(
					as.numeric(difftime(server_limit, now, units = "secs")) / 60
				)
				
				refresh_status(
					paste(
						"GoatCounter permitirá otra exportación en",
						remaining,
						"minutos."
					)
				)
				
				return()
				
			} else {
				
				rate_limit_until(NULL)
				
				if (file.exists(RATE_LIMIT_FILE)) {
					file.remove(RATE_LIMIT_FILE)
				}
				
			}
		}
		
		# Comprobar el intervalo desde la última actualización exitosa
		previous_refresh <- last_refresh()
		
		if (!is.null(previous_refresh)) {
			
			elapsed <- as.numeric(
				difftime(now, previous_refresh, units = "secs")
			)
			
			if (elapsed < 3600) {
				
				remaining <- ceiling((3600 - elapsed) / 60)
				
				refresh_status(
					paste(
						"Podrás actualizar nuevamente en",
						remaining,
						"minutos."
					)
				)
				
				return()
			}
		}
		
		# Comprobar el intervalo desde la última actualización exitosa
		previous_refresh <- last_refresh()
		
		if (!is.null(previous_refresh)) {
			
			elapsed <- as.numeric(
				difftime(now, previous_refresh, units = "secs")
			)
			
			if (elapsed < 3600) {
				
				remaining <- ceiling((3600 - elapsed) / 60)
				
				refresh_status(
					paste(
						"Podrás actualizar nuevamente en",
						remaining,
						"minutos."
					)
				)
				
				return()
			}
		} else if (!is.null(server_limit)) {
			
			rate_limit_until(NULL)
			
			if (file.exists(RATE_LIMIT_FILE)) {
				file.remove(RATE_LIMIT_FILE)
			}
			
		}
		
		showModal(
			modalDialog(
				title = "Actualizar datos de GoatCounter",
				
				paste(
					"Esta acción descargará nuevamente las estadísticas",
					"de GoatCounter y actualizará los gráficos.",
					"Solo se permite una actualización cada 60 minutos.",
					"¿Deseas continuar?"
				),
				
				easyClose = FALSE,
				
				footer = tagList(
					modalButton("Cancelar"),
					actionButton(
						inputId = "confirm_refresh",
						label = "Actualizar",
						class = "btn-primary"
					)
				)
			)
		)
		
	})
	
	
	# Iniciar descarga de GoatCounter
	observeEvent(input$confirm_refresh, {
		
		removeModal()
		
		if (isTRUE(refresh_running())) {
			return()
		}
		
		refresh_running(TRUE)
		refresh_output(character())
		refresh_error(character())
		refresh_status("Descargando datos de GoatCounter...")
		
		tryCatch({
			
			command <- if (.Platform$OS.type == "windows") {
				Sys.getenv("COMSPEC", unset = "cmd.exe")
			} else {
				"npm"
			}
			
			args <- if (.Platform$OS.type == "windows") {
				c("/c", "npm", "run", "fetch:goatcounter")
			} else {
				c("run", "fetch:goatcounter")
			}
			
			proc <- processx::process$new(
				command = command,
				args = args,
				wd = PROJECT_ROOT,
				stdout = "|",
				stderr = "|", 
				cleanup = TRUE
			)
			
			refresh_process(proc)
			
		}, error = function(e) {
			
			refresh_process(NULL)
			refresh_running(FALSE)
			
			refresh_status(
				paste("No se pudo iniciar la descarga:", conditionMessage(e))
			)
			
		})
		
	}, ignoreInit = TRUE)
	
	
	# Supervisar el proceso de actualización
	observe({
		
		proc <- refresh_process()
		
		req(!is.null(proc))
		
		invalidateLater(500, session)
		
		# Leer y acumular la salida del proceso
		new_output <- proc$read_output_lines()
		new_error <- proc$read_error_lines()
		
		if (length(new_output) > 0) {
			refresh_output(c(refresh_output(), new_output))
		}
		
		if (length(new_error) > 0) {
			refresh_error(c(refresh_error(), new_error))
		}
		
		if (!proc$is_alive()) {
			
			exit_code <- proc$get_exit_status()
			
			refresh_process(NULL)
			
			if (!is.null(exit_code) && exit_code == 0) {
				
				tryCatch({
					
					# Recargar los datos
					new_data <- load_goatcounter_data()
					
					# Registrar la actualización exitosa
					now <- Sys.time()
					save_last_refresh(now)
					
					# Limpiar cualquier límite horario anterior
					rate_limit_until(NULL)
					
					if (file.exists(RATE_LIMIT_FILE)) {
						file.remove(RATE_LIMIT_FILE)
					}
					
					# Actualizar los datos reactivos
					goatcounter_state(new_data)
					last_refresh(now)
					
					# Actualizar las opciones del filtro de países
					countries <- sort(unique(
						new_data$goatcounter$country[
							!is.na(new_data$goatcounter$country) &
								new_data$goatcounter$country != "País no identificado"
						]
					))
					
					updateSelectizeInput(
						session,
						"exclude_countries",
						choices = countries,
						selected = intersect(input$exclude_countries, countries),
						server = TRUE
					)
					
					refresh_status(
						"Actualización completada. Podrás actualizar nuevamente en 60 minutos."
					)
					
				}, error = function(e) {
					
					refresh_status(
						paste(
							"La descarga terminó, pero no se pudieron recargar los datos:",
							conditionMessage(e)
						)
					)
					
				})
				
			} else {
				
				error_text <- paste(refresh_error(), collapse = "\n")
				
				# Intentar obtener el tiempo de espera indicado por GoatCounter
				match <- regexec(
					"Tiempo indicado por el servidor:\\s*([0-9]+)",
					error_text
				)
				
				parts <- regmatches(error_text, match)[[1]]
				
				if (length(parts) >= 2) {
					
					remaining_seconds <- as.numeric(parts[2])
					
					# Registrar cuándo volverá a estar disponible la exportación
					limit_time <- Sys.time() + remaining_seconds
					
					rate_limit_until(limit_time)
					save_rate_limit(limit_time)
					
					remaining_minutes <- ceiling(remaining_seconds / 60)
					
					refresh_status(
						paste(
							"GoatCounter no permite otra exportación todavía.",
							"Inténtalo nuevamente en",
							remaining_minutes,
							"minutos."
						)
					)
					
				} else {
					
					failure_message <- paste(
						"La descarga de GoatCounter falló. Código de salida:",
						exit_code
					)
					
					if (nzchar(error_text)) {
						failure_message <- paste(failure_message, "-", error_text)
					}
					
					refresh_status(failure_message)
					
				}
				
			}
			
			refresh_running(FALSE)
		}
		
	})
	
	
	# Controlar disponibilidad del botón de actualización
	observe({
		
		if (isTRUE(refresh_running())) {
			
			shinyjs::disable("refresh_goatcounter")
			
		} else {
			
			shinyjs::enable("refresh_goatcounter")
			
		}
		
	})
	
	# Servidor del módulo de Tráfico
	traffic_server(
		input = input,
		output = output,
		filtered_data = filtered_data,
		filtered_combined_data = filtered_combined_data,
		goatcounter=goatcounter_data,
		wordpress_monthly_visits = wordpress_monthly_visits
	)
	
	# Servidor del módulo de Geografía
	geography_server(
		input = input,
		output = output,
		filtered_data = filtered_data,
		filtered_combined_data = filtered_combined_data,
		yearly_countries_wp = wordpress_yearly_countries,
		wordpress_monthly_visits = wordpress_monthly_visits,
		world = world
	)
	

	# Servidor del módulo de Idiomas
	languages_server(
		output = output,
		filtered_combined_data = filtered_combined_data,
		posts_languages = posts_languages
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
		goatcounter = goatcounter_data,
		goatcounter_normalized = goatcounter_normalized_data,
		wordpress_monthly_visits = wordpress_monthly_visits,
		wordpress_yearly_countries = wordpress_yearly_countries,
		posts_languages = posts_languages
	)
	
	output$refresh_status <- renderUI({
		
		invalidateLater(1000, session)
		
		now <- Sys.time()
		status <- refresh_status()
		
		# Mientras se descarga, mostrar el estado del proceso
		if (isTRUE(refresh_running())) {
			return(
				helpText(
					style = "display: block; margin-top: 10px;",
					status
				)
			)
		}
		
		# Determinar cuándo estará disponible la próxima actualización
		deadline <- NULL
		
		server_limit <- rate_limit_until()
		
		if (!is.null(server_limit) && now < server_limit) {
			deadline <- server_limit
		}
		
		previous_refresh <- last_refresh()
		
		if (!is.null(previous_refresh)) {
			
			local_limit <- previous_refresh + 3600
			
			if (
				now < local_limit &&
				(is.null(deadline) || local_limit > deadline)
			) {
				deadline <- local_limit
			}
		}
		
		# Mostrar una cuenta regresiva dinámica
		if (!is.null(deadline)) {
			
			remaining <- ceiling(
				as.numeric(difftime(deadline, now, units = "secs"))
			)
			
			minutes <- remaining %/% 60
			seconds <- remaining %% 60
			
			return(
				helpText(
					style = "display: block; margin-top: 10px;",
					paste(
						"Próxima actualización disponible en",
						sprintf("%d min %02d s.", minutes, seconds)
					)
				)
			)
		}
		
		if (!nzchar(status)) {
			return(NULL)
		}
		
		helpText(
			paste(
				"Próxima actualización disponible en",
				sprintf("%d min %02d s.", minutes, seconds)
			)
		)
	})
	
}


# ==========================================
# 4. INICIAR APLICACIÓN
# ==========================================

shinyApp(ui = ui, server = server)
