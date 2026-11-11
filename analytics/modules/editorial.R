
# ==========================================
# MÓDULO DE CRONOLOGÍA EDITORIAL
# ==========================================

# ------------------------------------------
# 1. CARGA Y TRANSFORMACIÓN DE DATOS
# ------------------------------------------



load_editorial_data <- function() {
	
	# Leer el historial editorial
	history <- jsonlite::fromJSON(
		HISTORY_JSON_PATH,
		simplifyVector = FALSE
	)
	
	# Comprobar que el historial contiene snapshots
	if (length(history) == 0) {
		stop("El historial editorial está vacío.")
	}
	
	# --------------------------------------
	# SNAPSHOTS
	# --------------------------------------
	
	# Identificar todos los idiomas presentes en el historial
	languages <- unique(unlist(
		lapply(history, function(snapshot) {
			names(snapshot[["content"]][["wordsByLanguage"]])
		})
	))
	
	# Preparar los snapshots
	snapshots_list <- vector("list", length(history))
	
	for (i in seq_along(history)) {
		
		snapshot <- history[[i]]
		content <- snapshot[["content"]]
		language_words <- content[["wordsByLanguage"]]
		
		snapshot_data <- data.frame(
			snapshot = i,
			date = as.Date(substr(snapshot[["date"]], 1, 10)),
			estimated_retrospective = isTRUE(
				snapshot[["estimatedRetrospective"]]
			),
			versions = length(snapshot[["posts"]]),
			articles = length(unique(vapply(
				snapshot[["posts"]],
				function(post) as.character(post[["number"]]),
				character(1)
			))),
			words = as.integer(content[["totalWords"]]),
			normal_words = as.integer(content[["totalNormalWords"]]),
			details_words = as.integer(content[["totalDetailsWords"]]),
			reading_minutes = as.integer(
				content[["totalReadingMinutes"]]
			)
		)
		
		# Añadir una columna para cada idioma
		for (lang in languages) {
			
			snapshot_data[[paste0("words_", lang)]] <-
				as.integer(language_words[[lang]] %||% 0)
		}
		
		snapshots_list[[i]] <- snapshot_data
	}
	
	snapshots <- dplyr::bind_rows(snapshots_list)
	
	# --------------------------------------
	# EVENTOS
	# --------------------------------------
	
	events_list <- list()
	
	for (snapshot in history) {
		
		snapshot_events <- snapshot[["events"]]
		
		if (length(snapshot_events) == 0) {
			next
		}
		
		for (event in snapshot_events) {
			
			events_list[[length(events_list) + 1]] <-
				tibble::as_tibble(event)
		}
	}
	
	events <- dplyr::bind_rows(events_list)
	
	# Cargar eventos editoriales manuales
	manual_events <- jsonlite::fromJSON(
		MANUAL_EVENTS_PATH,
		simplifyVector = TRUE
	)
	
	# Combinar eventos automáticos y manuales
	events <- dplyr::bind_rows(
		events,
		tibble::as_tibble(manual_events)
	) %>%
		mutate(date = as.Date(date)) %>%
		arrange(date)
	
	# --------------------------------------
	# RESULTADO
	# --------------------------------------
	
	list(
		snapshots = snapshots,
		events = events,
		current = snapshots[nrow(snapshots), ]
	)
}


# ------------------------------------------
# 2. INTERFAZ
# ------------------------------------------

editorial_ui <- nav_panel(
	"Editorial",
	
	layout_column_wrap(
		width = 1/5,
		
		value_box(
			title = "Versiones",
			value = textOutput("editorial_versions"),
			showcase = bsicons::bs_icon("files"),
			class = "editorial-value-box"
		),
		
		value_box(
			title = "Palabras totales",
			value = textOutput("editorial_words"),
			showcase = bsicons::bs_icon("book"),
			class = "editorial-value-box"
		),
		
		value_box(
			title = "Esperanto",
			value = textOutput("editorial_words_eo"),
			showcase = bsicons::bs_icon("translate"),
			class = "editorial-value-box"
		),
		
		value_box(
			title = "Español",
			value = textOutput("editorial_words_es"),
			showcase = bsicons::bs_icon("translate"),
			class = "editorial-value-box"
		),
		
		value_box(
			title = "Tiempo de lectura",
			value = textOutput("editorial_reading"),
			showcase = bsicons::bs_icon("clock"),
			class = "editorial-value-box"
		)
	),
	
	card(
		card_header("Desarrollo editorial"),
		
		div(
			class = "d-flex align-items-center gap-3 flex-wrap",
			
			selectInput(
				"editorial_chart_type",
				NULL,
				choices = c(
					"Evolución" = "evolution",
					"Distribución actual" = "distribution",
					"Actividad trimestral" = "activity"
				),
				selected = "evolution",
				width = "220px"
			),
			
			conditionalPanel(
				condition = "input.editorial_chart_type == 'evolution'",
				checkboxInput(
					"show_quarterly_growth",
					"Mostrar variación trimestral de la producción",
					value = FALSE
				)
			)
		),
		
		conditionalPanel(
			condition = "input.editorial_chart_type == 'evolution'",
			plotlyOutput("editorial_words_chart", height = "450px")
		),
		
		conditionalPanel(
			condition = "input.editorial_chart_type == 'distribution'",
			plotlyOutput("editorial_language_distribution", height = "450px")
		),
		
		conditionalPanel(
			condition = "input.editorial_chart_type == 'activity'",
			plotlyOutput("editorial_activity_chart", height = "450px")
		)
	)
)


# ------------------------------------------
# 3. SERVIDOR
# ------------------------------------------

editorial_server <- function(input, output) {
	
	editorial_data <- load_editorial_data()
	
	# Snapshot correspondiente al período seleccionado
	selected_snapshot <- reactive({
		
		snapshots <- editorial_data$snapshots
		
		if (is.null(input$summary_year) ||
			input$summary_year == "all") {
			
			return(snapshots[nrow(snapshots), , drop = FALSE])
		}
		
		snapshots <- snapshots %>%
			filter(format(date, "%Y") == input$summary_year)
		
		if (nrow(snapshots) == 0) {
			return(NULL)
		}
		
		snapshots[nrow(snapshots), , drop = FALSE]
	})
	
	# Preparar distribución de palabras por idioma
	language_distribution <- reactive({
		
		snapshot <- selected_snapshot()
		
		if (is.null(snapshot)) {
			return(tibble(
				language = character(),
				words = integer(),
				language_label = character(),
				color = character()
			))
		}
		
		snapshot %>%
			select(starts_with("words_")) %>%
			pivot_longer(
				cols = everything(),
				names_to = "language",
				names_prefix = "words_",
				values_to = "words"
			) %>%
			mutate(
				language_label = unname(LANGUAGE_LABELS[language]),
				color = unname(LANGUAGE_COLORS[language])
			)
	})
	
	# Preparar marcadores de eventos lingüísticos
	event_markers <- editorial_data$events %>%
		filter(
			(type == "publication" & lang == "eo") |
				(type == "translation" & lang == "es")
		) %>%
		group_by(date, lang) %>%
		summarise(
			title = paste(title, collapse = "\n"),
			words = sum(words, na.rm = TRUE),
			.groups = "drop"
		) %>%
		mutate(
			snapshot_index = findInterval(
				date,
				editorial_data$snapshots$date
			),
			language_label = unname(LANGUAGE_LABELS[lang]),
			cumulative_words = mapply(
				function(language, index) {
					editorial_data$snapshots[
						index,
						paste0("words_", language)
					]
				},
				lang,
				snapshot_index
			),
			hover_text = paste0(
				"<b>", title, "</b>",
				"<br>Fecha: ", format(date, "%d-%m-%Y"),
				"<br>Idioma: ", language_label,
				"<br>Palabras de los artículos: ",
				format(words, big.mark = ".", decimal.mark = ","),
				"<br>Palabras acumuladas: ",
				format(cumulative_words, big.mark = ".", decimal.mark = ",")
			)
		)
	
	# Preparar datos para la evolución de palabras
	words_data <- editorial_data$snapshots %>%
		select(date, starts_with("words_")) %>%
		tidyr::pivot_longer(
			cols = -date,
			names_to = "language",
			names_prefix = "words_",
			values_to = "words"
		) %>%
		mutate(
			language_label = unname(LANGUAGE_LABELS[language]),
			language_label = ifelse(
				is.na(language_label),
				language,
				language_label
			),
			hover_text = paste0(
				"<b>", language_label, "</b>",
				"<br>Fecha: ", format(date, "%d-%m-%Y"),
				"<br>Palabras: ",
				format(words, big.mark = ".", decimal.mark = ",")
			)
		)
	
	# Preparar marcadores de hitos generales
	general_markers <- editorial_data$events %>%
		filter(is.na(lang) | type == "new_language") %>%
		mutate(
			hover_text = paste0(
				"<b>", title, "</b>",
				"<br>Fecha: ", format(date, "%d-%m-%Y")
			)
		)
	
	
	# Preparar actividad editorial trimestral
	activity_data <- reactive({
		
		data <- editorial_data$events
		
		# Aplicar el año seleccionado
		if (!is.null(input$summary_year) &&
			input$summary_year != "all") {
			
			data <- data %>%
				filter(
					format(date, "%Y") == input$summary_year
				)
		}
		
		data <- data %>%
			filter(
				type %in% c(
					"publication",
					"translation",
					"edition",
					"deletion",
					"restoration",
					"site_launch",
					"new_language",
					"work_release"
				)
			)
		
		if (nrow(data) == 0) {
			return(tibble(
				quarter_date = as.Date(character()),
				type = character(),
				events = integer(),
				quarter = character()
			))
		}
		
		data %>%
			mutate(
				quarter_number = ceiling(
					as.integer(format(date, "%m")) / 3
				),
				quarter_date = as.Date(
					sprintf(
						"%s-%02d-01",
						format(date, "%Y"),
						(quarter_number - 1) * 3 + 1
					)
				)
			) %>%
			count(quarter_date, type, name = "events") %>%
			tidyr::complete(
				quarter_date = seq(
					min(quarter_date),
					max(quarter_date),
					by = "3 months"
				),
				type = c(
					"publication",
					"translation",
					"edition",
					"deletion",
					"restoration",
					"site_launch",
					"new_language",
					"work_release"
				),
				fill = list(events = 0)
			) %>%
			mutate(
				quarter = paste0(
					format(quarter_date, "%Y"),
					" T",
					ceiling(as.integer(format(quarter_date, "%m")) / 3)
				)
			) %>%
			arrange(quarter_date, type)
	})
	
	
	# Preparar producción de palabras por trimestre
	production_data <- editorial_data$events %>%
		filter(
			type %in% c("publication", "translation"),
			!is.na(words)
		) %>%
		mutate(
			quarter_number = ceiling(
				as.integer(format(date, "%m")) / 3
			),
			quarter_date = as.Date(
				sprintf(
					"%s-%02d-01",
					format(date, "%Y"),
					(quarter_number - 1) * 3 + 1
				)
			)
		) %>%
		group_by(quarter_date, lang) %>%
		summarise(
			words = sum(words),
			.groups = "drop"
		) %>%
		tidyr::complete(
			quarter_date = seq(
				min(quarter_date),
				max(quarter_date),
				by = "3 months"
			),
			lang = names(LANGUAGE_LABELS),
			fill = list(words = 0)
		) %>%
		mutate(
			quarter = paste0(
				format(quarter_date, "%Y"),
				" T",
				ceiling(as.integer(format(quarter_date, "%m")) / 3)
			),
			language_label = unname(LANGUAGE_LABELS[lang])
		) %>%
		arrange(quarter_date, lang)
	
	# Calcular variación porcentual trimestral
	growth_data <- production_data %>%
		group_by(lang) %>%
		arrange(quarter_date) %>%
		mutate(
			previous_words = lag(words),
			growth = ifelse(
				previous_words > 0,
				(words - previous_words) / previous_words * 100,
				NA_real_
			),
			language_label = unname(LANGUAGE_LABELS[lang])
		) %>%
		ungroup()
	
	output$editorial_versions <- renderText({
		data <- selected_snapshot()
		if (is.null(data)) return("—")
		
		format(data$versions, big.mark = ".", decimal.mark = ",")
	})
	
	output$editorial_words <- renderText({
		data <- selected_snapshot()
		if (is.null(data)) return("—")
		
		format(data$words, big.mark = ".", decimal.mark = ",")
	})
	
	output$editorial_words_eo <- renderText({
		data <- selected_snapshot()
		if (is.null(data)) return("—")
		
		format(data$words_eo, big.mark = ".", decimal.mark = ",")
	})
	
	output$editorial_words_es <- renderText({
		data <- selected_snapshot()
		if (is.null(data)) return("—")
		
		format(data$words_es, big.mark = ".", decimal.mark = ",")
	})
	
	output$editorial_reading <- renderText({
		data <- selected_snapshot()
		if (is.null(data)) return("—")
		
		paste(data$reading_minutes, "min")
	})
	
	
	# Evolución de palabras por idioma
	output$editorial_words_chart <- renderPlotly({
		
		if (input$editorial_chart_type != "evolution") {
			return(NULL)
		}
		
		# Leer la selección del sidebar
		selected_languages <- input$language
		
		# Sin selección explícita: mostrar todos los idiomas
		if (is.null(selected_languages) ||
			length(selected_languages) == 0) {
			
			selected_languages <- unique(as.character(words_data$language))
		}
		
		# Filtrar los datos
		# Esperanto siempre al fondo; los demás idiomas después
		language_order <- c(
			"eo",
			sort(setdiff(unique(words_data$language), "eo"))
		)
		
		data <- words_data %>%
			filter(language %in% selected_languages) %>%
			mutate(
				language = factor(language, levels = language_order)
			) %>%
			arrange(language, date)
		
		# Comprobar si existen datos
		if (nrow(data) == 0) {
			
			return(
				plotly_empty() %>%
					layout(
						annotations = list(
							text = "No hay datos para los idiomas seleccionados",
							showarrow = FALSE
						)
					)
			)
		}
		
		# Crear las trazas en un orden explícito:
		# Esperanto primero (al fondo), luego los demás idiomas.
		p <- plot_ly()
		
		for (lang in language_order[language_order %in% selected_languages]) {
			
			lang_data <- data %>%
				filter(as.character(language) == lang)
			
			if (nrow(lang_data) == 0) next
			
			lang_label <- lang_data$language_label[[1]]
			lang_color <- unname(LANGUAGE_COLORS[lang])
			
			p <- p %>%
				add_trace(
					data = lang_data,
					x = ~date,
					y = ~words,
					type = "scatter",
					mode = "lines",
					name = lang_label,
					line = list(color = lang_color),
					fill = "tozeroy",
					fillcolor = scales::alpha(lang_color, 0.55),
					text = ~hover_text,
					hoverinfo = "text"
				)
		}
		
		# Añadir variación porcentual trimestral
		if (isTRUE(input$show_quarterly_growth)) {
			
			for (lang in unique(growth_data$lang)) {
				
				if (!(lang %in% selected_languages)) next
				
				lang_data <- growth_data %>%
					filter(lang == !!lang)
				
				lang_label <- lang_data$language_label[[1]]
				lang_color <- unname(LANGUAGE_COLORS[lang])
				
				p <- p %>%
					add_trace(
						data = lang_data,
						x = ~quarter_date,
						y = ~growth,
						type = "bar",
						name = paste("Variación", lang_label),
						marker = list(
							color = lang_color,
							opacity = 0.7
						),
						yaxis = "y2",
						text = ~ifelse(
							is.na(growth),
							"",
							paste0(
								ifelse(growth > 0, "+", ""),
								round(growth),
								"%"
							)
						),
						textposition = "outside",
						hoverinfo = "text"
					)
			}
		}
		
		# Añadir marcadores de publicaciones y traducciones
		for (lang in unique(event_markers$lang)) {
			
			if (!(lang %in% selected_languages)) next
			
			lang_events <- event_markers %>%
				filter(lang == !!lang)
			
			p <- p %>%
				add_trace(
					data = lang_events,
					x = ~date,
					y = ~cumulative_words,
					type = "scatter",
					mode = "markers",
					marker = list(
						color = unname(LANGUAGE_COLORS[lang]),
						size = 9
					),
					name = paste("Hitos", unname(LANGUAGE_LABELS[lang])),
					text = ~hover_text,
					hovertemplate = "%{text}<extra></extra>"
				)
		}
		
		# Añadir marcadores de hitos generales del blog
		if (nrow(general_markers) > 0) {
			
			p <- p %>%
				add_trace(
					data = general_markers,
					x = ~date,
					y = 0,
					type = "scatter",
					mode = "markers",
					marker = list(
						color = "#777777",
						size = 11,
						symbol = "diamond"
					),
					name = "Hitos del blog",
					text = ~hover_text,
					hovertemplate = "%{text}<extra></extra>",
					showlegend = TRUE
				)
		}
		
		p %>%
			layout(
				xaxis = list(
					title = "",
					tickformat = "%b %Y"
				),
				yaxis = list(
					title = "Palabras acumuladas",
					rangemode = "tozero"
				),
				yaxis2 = list(
					title = "Variación trimestral (%)",
					overlaying = "y",
					side = "right",
					zeroline = TRUE,
					automargin = TRUE
				),
				legend = list(
					title = list(text = "Idioma"),
					traceorder = "normal",
					orientation = "h",
					y = -0.2,
					x = 0.5,
					xanchor = "center"
				),
				hovermode = "x unified"
			) %>%
			apply_plotly_style()
	})
	
	
	# Distribución de palabras por idioma
	output$editorial_language_distribution <- renderPlotly({
		
		if (input$editorial_chart_type != "distribution") {
			return(NULL)
		}
		
		data <- language_distribution() %>%
			filter(words > 0) %>%
			arrange(words)
		
		if (nrow(data) == 0) {
			return(plotly_empty() %>%
				   	layout(
				   		annotations = list(
				   			text = "No hay snapshots para el período seleccionado",
				   			showarrow = FALSE
				   		)
				   	))
		}
		
		plot_ly(
			data = data,
			x = ~words,
			y = ~reorder(language_label, words),
			type = "bar",
			orientation = "h",
			marker = list(
				color = ~color
			),
			text = ~paste0(
				language_label,
				": ",
				format(words, big.mark = ".", decimal.mark = ","),
				" palabras"
			),
			hoverinfo = "text"
		) %>%
			layout(
				xaxis = list(
					title = "Palabras",
					tickformat = ",.0f",
					rangemode = "tozero"
				),
				yaxis = list(
					title = ""
				),
				showlegend = FALSE,
				margin = list(
					l = 100
				)
			) %>%
			apply_plotly_style()
	})
	
	# Gráfico de actividad editorial trimestral
	output$editorial_activity_chart <- renderPlotly({
		
		event_labels <- c(
			publication = "Publicaciones",
			translation = "Traducciones",
			edition = "Ediciones",
			deletion = "Eliminaciones",
			restoration = "Restauraciones",
			new_language = "Nuevos idiomas",
			site_launch = "Lanzamientos",
			work_release = "Lanzamientos"
		)
		
		data <- activity_data() %>%
			mutate(
				event_label = factor(
					unname(event_labels[type]),
					levels = unique(unname(event_labels))
				)
			)
		
		plot_ly(
			data = data,
			x = ~quarter,
			y = ~events,
			color = ~event_label,
			type = "bar"
		) %>%
			layout(
				barmode = "stack",
				xaxis = list(
					title = "Trimestre",
					categoryorder = "array",
					categoryarray = unique(data$quarter)
				),
				yaxis = list(
					title = "Número de eventos",
					rangemode = "tozero",
					dtick = 1
				),
				legend = list(
					title = list(text = "Tipo de evento")
				)
			) %>%
			apply_plotly_style()
	})
}
