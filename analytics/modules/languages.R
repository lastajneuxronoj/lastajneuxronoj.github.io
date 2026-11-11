# ==========================================
# MÓDULO DE IDIOMAS
# ==========================================

# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

languages_ui <- nav_panel(
	"Idiomas",
	
	layout_columns(
		col_widths = c(6, 6),
		
		card(
			card_header("Distribución de visitas por idioma"),
			plotlyOutput("language_chart", height = "400px")
		),
		
		card(
			card_header("Cobertura de publicaciones por idioma"),
			plotlyOutput("language_coverage_chart", height = "400px")
		)
	),
	
	card(
		card_header("Idiomas disponibles por publicación"),
		uiOutput("language_coverage_table")
	)
)

# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

languages_server <- function(
		output,
		filtered_combined_data,
		posts_languages
) {
	
	# ----------------------------------------
	# PREPARAR DATOS
	# ----------------------------------------
	
	language_data <- reactive({
		
		filtered_combined_data() %>%
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
		
	})
	
	
	# ----------------------------------------
	# GRÁFICO DE TORTA
	# ----------------------------------------
	
	output$language_chart <- renderPlotly({
		
		data <- language_data()
		
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
				"<br>Visitas: %{value}",
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
		
	}) %>%
		bindCache(filtered_combined_data())
	
	# ----------------------------------------
	# COBERTURA POR IDIOMA
	# ----------------------------------------
	
	language_coverage_data <- reactive({
		
		posts_languages %>%
			distinct(number, language) %>%
			count(language, name = "articles") %>%
			mutate(
				language_label = ifelse(
					language %in% names(LANGUAGE_LABELS),
					unname(LANGUAGE_LABELS[language]),
					language
				)
			) %>%
			arrange(articles)
		
	})
	
	output$language_coverage_chart <- renderPlotly({
		
		data <- language_coverage_data()
		
		if (nrow(data) == 0) {
			return(plotly_empty())
		}
		
		plot_ly(
			data = data,
			x = ~articles,
			y = ~reorder(language_label, articles),
			type = "bar",
			orientation = "h",
			marker = list(
				color = unname(LANGUAGE_COLORS[data$language])
			),
			text = ~articles,
			textposition = "outside",
			hovertemplate = paste(
				"<b>%{y}</b>",
				"<br>Publicaciones: %{x}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(
					title = "Número de publicaciones",
					rangemode = "tozero"
				),
				yaxis = list(title = ""),
				showlegend = FALSE
			)
		
	})
	
	
	# ----------------------------------------
	# TABLA DE COBERTURA POR PUBLICACIÓN
	# ----------------------------------------
	
	output$language_coverage_table <- renderUI({
		
		data <- posts_languages %>%
			group_by(number, title) %>%
			summarise(
				languages = list(sort(unique(language))),
				.groups = "drop"
			) %>%
			arrange(desc(as.integer(number)))
		
		tags$table(
			class = "table table-striped",
			
			tags$thead(
				tags$tr(
					tags$th("N.º"),
					tags$th("Publicación"),
					tags$th("Idiomas")
				)
			),
			
			tags$tbody(
				lapply(seq_len(nrow(data)), function(i) {
					
					languages <- data$languages[[i]]
					
					tags$tr(
						tags$td(data$number[i]),
						tags$td(data$title[i]),
						tags$td(
							lapply(languages, function(lang) {
								
								flag_file <- file.path(
									APP_DIR,
									"..",
									"svg",
									paste0("flag_", lang, ".svg")
								)
								
								label <- if (lang %in% names(LANGUAGE_LABELS)) {
									unname(LANGUAGE_LABELS[lang])
								} else {
									lang
								}
								
								if (file.exists(flag_file)) {
									tags$img(
										src = paste0(
											"svg/flag_", lang, ".svg"
										),
										alt = label,
										title = label,
										style = paste(
											"height: 20px;",
											"width: auto;",
											"margin-right: 6px;",
											"border-radius: 3px;"
										)
									)
								} else {
									tags$span(
										title = label,
										label
									)
								}
							})
						)
					)
				})
			)
		)
	})
}