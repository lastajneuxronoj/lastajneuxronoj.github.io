
summary_ui <- nav_panel(
	"Resumen",
	
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
	
	# Estadísticas geográficas
	layout_column_wrap(
		width = 1/2,
		
		card(
			card_header("Distribución geográfica de visitas"),
			leafletOutput(
				"summary_country_map",
				height = "450px"
			)
		),
		
		card(
			card_header("Países con más visitas"),
			DT::DTOutput("summary_top_countries")
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

summary_server <- function(input, output, session, goatcounter, goatcounter_normalized, wordpress_monthly_visits, wordpress_yearly_countries) {
	
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
				wordpress_monthly_visits$date,
				"%Y"
			),
			format(
				editorial_data$snapshots$date,
				"%Y"
			)
		)),
		decreasing = TRUE
	)
	
	# Seleccionar el año actual por defecto
	selected_year <- "all"
	
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
		
		# Visitas históricas de WordPress
		wp_data <- wordpress_monthly_visits %>%
			filter(
				date <= as.Date("2026-07-01")
			)
		
		# Visitas de GoatCounter
		gc_data <- goatcounter %>%
			filter(
				as.Date(Date, tz = "UTC") >= as.Date("2026-07-31")
			)
		
		# Aplicar año seleccionado
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			wp_data <- wp_data %>%
				filter(
					format(date, "%Y") == input$summary_year
				)
			
			gc_data <- gc_data %>%
				filter(
					format(Date, "%Y", tz = "UTC") == input$summary_year
				)
			
		}
		
		# WordPress de 2026 es opcional
		if (!isTRUE(input$include_wordpress)) {
			
			wp_data <- wp_data %>%
				filter(
					format(date, "%Y") != "2026"
				)
			
		}
		
		total_visits <- sum(wp_data$visits) + nrow(gc_data)
		
		format(
			total_visits,
			big.mark = ".",
			scientific = FALSE
		)
		
	})
	
	# Países alcanzados acumulados
	output$summary_countries <- renderText({
		
		wp_data <- wordpress_yearly_countries
		
		gc_data <- goatcounter %>%
			mutate(year = format(Date, "%Y", tz = "UTC"))
		
		if (!is.null(input$summary_year) && input$summary_year != "all") {
			wp_data <- wp_data %>%
				filter(year <= as.integer(input$summary_year))
			
			gc_data <- gc_data %>%
				filter(as.integer(year) <= as.integer(input$summary_year))
		}
		
		# WordPress de 2026 es opcional
		if (!isTRUE(input$include_wordpress)) {
			wp_data <- wp_data %>%
				filter(year != 2026)
		}
		
		wp_countries <- wp_data %>%
			filter(
				!is.na(country),
				country != "",
				country != "País no identificado"
			) %>%
			distinct(country)
		
		gc_countries <- gc_data %>%
			filter(
				!is.na(country),
				country != "",
				country != "País no identificado"
			) %>%
			distinct(country)
		
		total_countries <- bind_rows(wp_countries, gc_countries) %>%
			distinct(country) %>%
			nrow()
		
		format(total_countries, big.mark = ".", scientific = FALSE)
	})
	
	# Distribución geográfica de visitas
	summary_country_data <- reactive({
		
		# Visitas históricas de WordPress
		wp_data <- wordpress_yearly_countries
		
		# Visitas individuales de GoatCounter
		gc_data <- goatcounter %>%
			mutate(
				year = format(Date, "%Y", tz = "UTC")
			) %>%
			count(year, country, name = "visits")
		
		# Aplicar el año seleccionado
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			selected_year <- as.integer(input$summary_year)
			
			wp_data <- wp_data %>%
				filter(year == selected_year)
			
			gc_data <- gc_data %>%
				filter(as.integer(year) == selected_year)
		}
		
		# WordPress de 2026 es opcional
		if (!isTRUE(input$include_wordpress)) {
			wp_data <- wp_data %>%
				filter(year != 2026)
		}
		
		# Combinar ambas fuentes
		bind_rows(
			wp_data %>% select(country, visits),
			gc_data %>% select(country, visits)
		) %>%
			filter(
				!is.na(country),
				country != "",
				country != "País no identificado"
			) %>%
			group_by(country) %>%
			summarise(
				visits = sum(visits, na.rm = TRUE),
				.groups = "drop"
			) %>%
			arrange(desc(visits))
	})
	
	# Datos geográficos para el mapa
	summary_country_map_data <- reactive({
		
		data <- summary_country_data() %>%
			mutate(
				iso3c = countrycode::countrycode(
					country,
					origin = "country.name.es",
					destination = "iso3c",
					warn = FALSE
				)
			) %>%
			filter(!is.na(iso3c))
		
		world_data <- world %>%
			mutate(
				map_iso3c = if_else(
					iso_a3 == "-99",
					adm0_a3,
					iso_a3
				)
			)
		
		world_data %>%
			left_join(
				data,
				by = c("map_iso3c" = "iso3c")
			) %>%
			mutate(
				visits = tidyr::replace_na(visits, 0)
			)
	})
	
	# Mapa mundial de visitas
	output$summary_country_map <- renderLeaflet({
		
		data <- summary_country_map_data()
		
		# Escala de colores
		pal <- leaflet::colorNumeric(
			palette = "YlOrRd",
			domain = data$visits,
			na.color = "#eeeeee"
		)
		
		leaflet(data = data) %>%
			addTiles(
			    urlTemplate = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			    attribution = paste(
			        "&copy; <a href='https://www.openstreetmap.org/copyright'>",
			        "OpenStreetMap</a> contributors"
			    )
			) %>%
			addPolygons(
				fillColor = ~pal(visits),
				fillOpacity = 0.8,
				color = "#777777",
				weight = 0.4,
				opacity = 1,
				label = ~paste0(
					name,
					": ",
					format(
						visits,
						big.mark = ".",
						scientific = FALSE
					),
					" visitas"
				),
				highlightOptions = highlightOptions(
					weight = 2,
					color = "#333333",
					fillOpacity = 0.9,
					bringToFront = TRUE
				)
			) %>%
			addLegend(
				position = "bottomright",
				pal = pal,
				values = ~visits,
				title = "Visitas",
				labFormat = labelFormat(
					big.mark = "."
				),
				opacity = 0.8
			) %>%
			setView(
				lng = 0,
				lat = 20,
				zoom = 2
			)
	})
	
	# Tabla de los países con más visitas
	output$summary_top_countries <- DT::renderDT({
		
		data <- summary_country_data() %>%
			slice_head(n = 15) %>%
			mutate(
				Porcentaje = round(
					visits / sum(summary_country_data()$visits) * 100,
					1
				)
			) %>%
			transmute(
				País = country,
				Visitas = visits,
				`Porcentaje (%)` = Porcentaje
			)
		
		DT::datatable(
			data,
			rownames = FALSE,
			options = list(
				dom = "t",
				ordering = FALSE,
				autoWidth = TRUE,
				pageLength = 15
			)
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
		
		# Estadísticas históricas de WordPress
		wp_data <- wordpress_articles %>%
			filter(
				year != 2026 | isTRUE(input$include_wordpress)
			) %>%
			transmute(
				year = as.character(year),
				article_id,
				article_language = "eo",
				article_title = title,
				visits
			)
		
		# Estadísticas de GoatCounter
		gc_data <- goatcounter_normalized %>%
			filter(
				type == "Artículo",
				date >= as.Date("2026-08-01")
			) %>%
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
				),
				visits = 1
			) %>%
			filter(
				article_language %in% names(LANGUAGE_LABELS)
			) %>%
			select(
				year,
				article_id,
				article_language,
				article_title,
				visits
			)
		
		# Combinar ambas fuentes
		data <- bind_rows(wp_data, gc_data)
		
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
		
		# Sumar visitas de ambas fuentes
		data %>%
			group_by(article_id) %>%
			summarise(
				visits = sum(visits, na.rm = TRUE),
				.groups = "drop"
			) %>%
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
