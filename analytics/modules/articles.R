# ==========================================
# MÓDULO DE ARTÍCULOS
# ==========================================

# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

articles_ui <- nav_panel(
	"Artículos",
	
	card(
		card_header("Visitas por artículo e idioma"),
		
		selectInput(
			"articles_order",
			"Ordenar artículos por:",
			choices = c(
				"Más visitas" = "visits",
				"Más recientes" = "id"
			),
			selected = "visits",
			width = "220px"
		),
		
		plotlyOutput("articles_chart", height = "800px")
	)
)

# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

articles_server <- function(input, output, filtered_combined_data) {
	
	# Preparar datos de los artículos
	articles_data <- reactive({
		
		data <- filtered_combined_data() %>%
			filter(type == "Artículo") %>%
			mutate(
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
		
		# Obtener un título por artículo.
		# Se prefiere la versión en esperanto.
		article_titles <- data %>%
			arrange(desc(article_language == "eo")) %>%
			distinct(article_id, .keep_all = TRUE) %>%
			mutate(
				article_label = paste0(
					"<b>",
					article_id,
					":</b> ",
					article_title
				)
			) %>%
			select(article_id, article_label)
		
		# Sumar visitas por artículo e idioma
		data %>%
			group_by(article_id, article_language) %>%
			summarise(
				visits = sum(visits, na.rm = TRUE),
				.groups = "drop"
			) %>%
			left_join(article_titles, by = "article_id") %>%
			group_by(article_id) %>%
			mutate(
				total_visits = sum(visits),
				percentage = visits / total_visits * 100
			) %>%
			ungroup() %>%
			mutate(
				language_label = unname(
					LANGUAGE_LABELS[article_language]
				),
				language_label = factor(
					language_label,
					levels = names(LANGUAGE_COLORS_BY_LABEL)
				),
				hover_text = paste0(
					"<b>", article_label, "</b>",
					"<br>Idioma: ", language_label,
					"<br>Visitas: ", visits,
					"<br>Porcentaje del artículo: ",
					sprintf("%.1f", percentage), "%",
					"<br>Total del artículo: ", total_visits
				)
			)
	})
	
	# Gráfico de visitas por artículo e idioma
	output$articles_chart <- renderPlotly({
		
		data <- articles_data()
		
		# Calcular visitas totales por artículo
		article_order <- data %>%
			group_by(article_id, article_label) %>%
			summarise(
				total_visits = sum(visits),
				.groups = "drop"
			)
		
		# Determinar el orden de los artículos
		if (input$articles_order == "visits") {
			
			article_order <- article_order %>%
				arrange(total_visits)
			
		} else {
			
			article_order <- article_order %>%
				arrange(as.integer(article_id))
		}
		
		# Definir los niveles de las categorías
		article_levels <- article_order$article_label
		
		data <- data %>%
			mutate(
				article_label = factor(
					article_label,
					levels = article_levels
				)
			)
		
		if (nrow(data) == 0) {
			return(
				plotly_empty() %>%
					layout(
						annotations = list(
							text = "No hay datos para los filtros seleccionados",
							showarrow = FALSE
						)
					)
			)
		}
		
		plot_ly(
			data = data,
			x = ~visits,
			y = ~article_label,
			color = ~language_label,
			colors = LANGUAGE_COLORS_BY_LABEL,
			type = "bar",
			orientation = "h",
			text = ~hover_text,
			hoverinfo = "text",
			textposition = "none"
		) %>%
			layout(
				barmode = "stack",
				xaxis = list(
					title = "Visitas",
					rangemode = "tozero"
				),
				yaxis = list(
					title = "",
					categoryorder = "array",
					categoryarray = article_levels
				),
				legend = list(
					title = list(text = "Idioma")
				)
			) %>%
			apply_plotly_style()
	}) %>%
		bindCache(
			filtered_combined_data(),
			input$articles_order
		)
}