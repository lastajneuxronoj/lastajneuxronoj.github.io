# ==========================================
# MÓDULO DE IDIOMAS
# ==========================================

# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

languages_ui <- nav_panel(
	"Idiomas",
	
	card(
		card_header("Distribución de visitas por idioma"),
		plotlyOutput("language_chart", height = "400px")
	)
)

# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

languages_server <- function(output, filtered_combined_data) {
	
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
	
}