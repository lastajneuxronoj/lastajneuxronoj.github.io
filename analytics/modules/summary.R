
summary_ui <- nav_panel(
	"Resumen",
	
	# Filtro temporal
	card(
		card_header("Período"),
		div(
			class = "d-flex align-items-center gap-3",
			strong("Año"),
			selectInput(
				"summary_year",
				NULL,
				choices = c("Todos" = "all"),
				selected = "all",
				width = "200px"
			)
		)
	),
	
	# Indicadores generales
	layout_column_wrap(
		width = 1/3,
		value_box(
			title = "Visitas",
			value = textOutput("summary_visits"),
			showcase = bsicons::bs_icon("eye")
		),
		value_box(
			title = "Países alcanzados acumulados",
			value = textOutput("summary_countries"),
			showcase = bsicons::bs_icon("globe")
		),
		value_box(
			title = "Artículos acumulados",
			value = textOutput("summary_articles"),
			showcase = bsicons::bs_icon("file-text")
		),
		value_box(
			title = "Versiones acumuladas",
			value = textOutput("summary_versions"),
			showcase = bsicons::bs_icon("translate")
		),
		value_box(
			title = "Palabras acumuladas",
			value = textOutput("summary_words"),
			showcase = bsicons::bs_icon("book")
		),
		value_box(
			title = "Tiempo de lectura acumulado",
			value = textOutput("summary_reading_time"),
			showcase = bsicons::bs_icon("clock")
		)
	),
	
	# Estadísticas de tráfico
	layout_column_wrap(
		width = 1/2,
		
		card(
			card_header("Distribución de visitas por idioma"),
			plotlyOutput(
				"summary_language_chart",
				height = "350px"
			)
		),
		
		card(
			card_header("Artículos más visitados"),
			DT::DTOutput("summary_top_articles")
		)
	)
)

summary_server <- function(input, output, session, goatcounter, goatcounter_normalized) {
	
	editorial_data <- load_editorial_data()
	current <- editorial_data$current
	
	# Años disponibles en los datos
	years <- sort(
		unique(c(
			format(
				goatcounter$Date[!is.na(goatcounter$Date)],
				"%Y",
				tz = "UTC"
			),
			format(
				editorial_data$snapshots$date,
				"%Y"
			)
		)),
		decreasing = TRUE
	)
	
	# Seleccionar el año actual por defecto
	current_year <- format(Sys.Date(), "%Y")
	
	selected_year <- if (current_year %in% years) {
		current_year
	} else if (length(years) > 0) {
		years[1]
	} else {
		"all"
	}
	
	# Actualizar el selector
	observe({
		updateSelectInput(
			session,
			"summary_year",
			choices = c("Todos" = "all", setNames(years, years)),
			selected = selected_year
		)
	})
	
	# Datos filtrados por año
	summary_data <- reactive({
		
		data <- goatcounter %>%
			mutate(
				year = format(Date, "%Y", tz = "UTC")
			)
		
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(year == input$summary_year)
			
		}
		
		data
	})
	
	# Snapshot editorial correspondiente al año seleccionado
	summary_editorial_snapshot <- reactive({
		
		snapshots <- editorial_data$snapshots
		
		if (is.null(input$summary_year) ||
			input$summary_year == "all") {
			
			return(snapshots[nrow(snapshots), , drop = FALSE])
		}
		
		snapshots <- snapshots %>%
			filter(
				format(date, "%Y") == input$summary_year
			)
		
		if (nrow(snapshots) == 0) {
			return(NULL)
		}
		
		snapshots[nrow(snapshots), , drop = FALSE]
	})
	
	# Visitas
	output$summary_visits <- renderText({
		format(
			nrow(summary_data()),
			big.mark = ".",
			scientific = FALSE
		)
	})
	
	# Países alcanzados acumulados
	output$summary_countries <- renderText({
		
		data <- goatcounter %>%
			mutate(
				year = format(Date, "%Y", tz = "UTC")
			)
		
		# Incluir todos los años hasta el seleccionado
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(year <= input$summary_year)
		}
		
		countries <- data %>%
			filter(
				!is.na(country),
				country != "País no identificado"
			) %>%
			distinct(country)
		
		format(
			nrow(countries),
			big.mark = ".",
			scientific = FALSE
		)
	})
	
	# Distribución de visitas por idioma
	output$summary_language_chart <- renderPlotly({
		
		if (!is.null(input$summary_year) &&
			input$summary_year %in% c("2024", "2025")) {
			
			data <- data.frame(
				language_label = "Esperanto",
				visits = 100
			)
			
		} else {
			
			data <- summary_data() %>%
				mutate(
					language_label = case_when(
						is.na(language) ~ "Sin identificar",
						language %in% names(LANGUAGE_LABELS) ~
							unname(LANGUAGE_LABELS[language]),
						TRUE ~ "Sin identificar"
					)
				) %>%
				count(language_label, name = "visits") %>%
				arrange(desc(visits))
		}
		
		colors <- c(
			LANGUAGE_COLORS_BY_LABEL,
			"Sin identificar" = COLOR_UNKNOWN
		)
		
		plot_ly(
			data = data,
			labels = ~language_label,
			values = ~visits,
			type = "pie",
			marker = list(
				colors = unname(colors[data$language_label])
			),
			textinfo = "label+percent",
			hovertemplate = paste(
				"<b>%{label}</b>",
				"<br>Porcentaje: %{percent}",
				"<extra></extra>"
			)
		) %>%
			layout(
				showlegend = TRUE,
				legend = list(
					orientation = "h",
					x = 0.5,
					xanchor = "center",
					y = -0.15
				)
			)
		
	})
	
	# Preparar datos de artículos destacados
	summary_articles_data <- reactive({
		
		data <- goatcounter_normalized %>%
			filter(type == "Artículo") %>%
			mutate(
				year = format(date, "%Y"),
				article_id = sub(
					"^article-",
					"",
					content_id
				),
				article_language = language,
				article_title = sub(
					" \\| Lastaj Neŭronoj$",
					"",
					title
				)
			) %>%
			filter(
				article_language %in% names(LANGUAGE_LABELS)
			)
		
		# Aplicar el año seleccionado
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(year == input$summary_year)
			
		}
		
		# Obtener el título de cada artículo.
		# Se prefiere la versión en esperanto.
		article_titles <- data %>%
			arrange(desc(article_language == "eo")) %>%
			distinct(article_id, .keep_all = TRUE) %>%
			select(article_id, article_title)
		
		# Identificar los idiomas disponibles
		article_languages <- data %>%
			distinct(article_id, article_language) %>%
			group_by(article_id) %>%
			summarise(
				languages = paste(
					unname(LANGUAGE_LABELS[article_language]),
					collapse = ", "
				),
				.groups = "drop"
			)
		
		# Contar visitas totales por artículo
		data %>%
			count(article_id, name = "visits") %>%
			left_join(article_titles, by = "article_id") %>%
			left_join(article_languages, by = "article_id") %>%
			arrange(desc(visits), as.integer(article_id)) %>%
			slice_head(n = 5) %>%
			transmute(
				Artículo = paste0(
					article_id,
					": ",
					article_title
				),
				Idiomas = languages,
				Visitas = visits
			)
	})
	
	# Tabla de los cinco artículos más visitados
	output$summary_top_articles <- DT::renderDT({
		
		DT::datatable(
			summary_articles_data(),
			rownames = FALSE,
			options = list(
				dom = "t",
				ordering = FALSE,
				autoWidth = TRUE
			)
		)
		
	})
	
	# Indicadores editoriales
	
	output$summary_articles <- renderText({
		
		data <- summary_editorial_snapshot()
		
		if (is.null(data)) {
			return("—")
		}
		
		format(data$articles, big.mark = ".", decimal.mark = ",")
	})
	
	output$summary_versions <- renderText({
		
		data <- summary_editorial_snapshot()
		
		if (is.null(data)) {
			return("—")
		}
		
		format(data$versions, big.mark = ".", decimal.mark = ",")
	})
	
	output$summary_words <- renderText({
		
		data <- summary_editorial_snapshot()
		
		if (is.null(data)) {
			return("—")
		}
		
		format(data$words, big.mark = ".", decimal.mark = ",")
	})
	
	output$summary_reading_time <- renderText({
		
		data <- summary_editorial_snapshot()
		
		if (is.null(data)) {
			return("—")
		}
		
		paste(data$reading_minutes, "min")
	})
	
}
