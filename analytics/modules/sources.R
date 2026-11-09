# ==========================================
# MÓDULO: FUENTES DE TRÁFICO
# ==========================================

sources_ui <- nav_panel(
	"Fuentes",
	
	# Distribución de fuentes y referentes específicos
	layout_column_wrap(
		width = 1/2,
		
		card(
			card_header("Distribución de fuentes"),
			plotlyOutput("sources_distribution", height = "400px")
		),
		
		card(
			card_header("Referentes específicos"),
			plotlyOutput("sources_referrers", height = "400px")
		)
	),
	
	# Evolución temporal de las fuentes
	card(
		card_header("Evolución de las fuentes"),
		plotlyOutput("sources_evolution", height = "450px")
	)
)

sources_server <- function(input, output, session, filtered_referrer_data) {
	
	# Categoría de fuente seleccionada
	selected_source <- reactiveVal(NULL)
	
	# Sincronizar el desplegable con la selección
	observeEvent(input$source_category_filter, {
		
		selected <- input$source_category_filter
		
		if (is.null(selected) || length(selected) == 0) {
			selected_source(NULL)
		} else {
			selected_source(selected)
		}
		
	}, ignoreInit = TRUE)
	
	
	# Actualizar el desplegable al hacer clic en la dona
	observeEvent(selected_source(), {
		
		selected <- selected_source()
		
		updateSelectizeInput(
			session,
			"source_category_filter",
			selected = if (is.null(selected)) character(0) else selected
		)
		
	}, ignoreInit = TRUE)
	
	output$sources_selection <- renderUI({
		
		selected <- selected_source()
		
		if (is.null(selected)) {
			selected <- "Todas las categorías"
		}
		
		tagList(
			h6("Distribución de fuentes"),
			div(
				style = paste(
					"padding: 8px 12px;",
					"border-radius: 6px;",
					"background-color: #eaf2f8;",
					"border-left: 4px solid #0072B2;",
					"font-weight: 500;"
				),
				selected
			),
			div(
				style = "font-size: 12px; color: #6c757d; margin-top: 6px;",
				"Selección interactiva"
			)
		)
	})
	
	# Detectar clics en la dona
	observeEvent(
		event_data(
			"plotly_click",
			source = "sources_distribution",
			priority = "event"
		),
		{
			click <- event_data(
				"plotly_click",
				source = "sources_distribution",
				priority = "event"
			)
			
			selected <- sources_distribution_data()$source_category[
				click$pointNumber + 1
			]
			
			current <- selected_source()
			
			if (selected %in% current) {
				current <- setdiff(current, selected)
			} else {
				current <- c(current, selected)
			}
			
			if (length(current) == 0) {
				selected_source(NULL)
			} else {
				selected_source(current)
			}
		},
		ignoreInit = TRUE
	)
	
	# Distribución de fuentes
	sources_distribution_data <- reactive({
		filtered_referrer_data() %>%
			count(source_category, name = "visits") %>%
			arrange(desc(visits))
	})
	
	output$sources_distribution <- renderPlotly({
		
		data <- sources_distribution_data()
		
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
		
		p <- plot_ly(
			data = data,
			source = "sources_distribution",
			labels = ~source_category,
			values = ~visits,
			type = "pie",
			hole = 0.55,
			rotation = 90,
			textinfo = "percent",
			marker = list(
				colors = SOURCE_COLORS[data$source_category]
			),
			hovertemplate = paste0(
				"<b>%{label}</b>",
				"<br>Visitas: %{value}",
				"<br>Porcentaje: %{percent}",
				"<extra></extra>"
			)
		)
		
		p <- layout(
			p,
			showlegend = TRUE,
			legend = list(
				orientation = "v",
				x = 1.02,
				y = 0.5
			),
			margin = list(r = 160)
		)
		
		event_register(p, "plotly_click")
	}) %>%
		bindCache(filtered_referrer_data())
	
	outputOptions(
		output,
		"sources_distribution",
		suspendWhenHidden = FALSE
	)
	
	# Referentes específicos
	sources_referrers_data <- reactive({
		
		filtered_referrer_data() %>%
			filter(
				!source_platform %in% c(
					"Sin referente",
					"Lastaj Neŭronoj",
					"Entorno de administración y pruebas",
					"Campaña propia"
				)
			) %>%
			{
				if (!is.null(selected_source())) {
					filter(., source_category == selected_source())
				} else {
					.
				}
			} %>%
			count(source_platform, name = "visits") %>%
			arrange(desc(visits)) %>%
			slice_head(n = 15) %>%
			mutate(
				hover_text = paste0(
					"<b>", source_platform, "</b>",
					"<br>Visitas: ", visits
				)
			)
	})
	
	output$sources_referrers <- renderPlotly({
		
		data <- sources_referrers_data()
		
		if (nrow(data) == 0) {
			return(
				plotly_empty() %>%
					layout(
						annotations = list(
							text = "No hay referentes externos para los filtros seleccionados",
							showarrow = FALSE
						)
					)
			)
		}
		
		plot_ly(
			data = data,
			x = ~visits,
			y = ~reorder(source_platform, visits),
			type = "bar",
			orientation = "h",
			text = ~hover_text,
			hoverinfo = "text",
			textposition = "none"
		) %>%
			layout(
				xaxis = list(
					title = "Visitas",
					rangemode = "tozero"
				),
				yaxis = list(title = ""),
				showlegend = FALSE
			)
	}) %>%
		bindCache(
			filtered_referrer_data(),
			selected_source()
		)
	
	# Evolución temporal de las fuentes
	sources_evolution_data <- reactive({
		
		filtered_referrer_data() %>%
			mutate(date = as.Date(Date, tz = "UTC")) %>%
			{
				if (!is.null(selected_source())) {
					filter(., source_category == selected_source())
				} else {
					.
				}
			} %>%
			count(date, source_category, name = "visits") %>%
			arrange(date)
	})

    output$sources_evolution <- renderPlotly({

        data <- sources_evolution_data()

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
            x = ~date,
            y = ~visits,
            color = ~source_category,
            colors = SOURCE_COLORS,
            type = "scatter",
            mode = "lines",
            hovertemplate = paste0(
                "<b>%{fullData.name}</b>",
                "<br>Fecha: %{x|%d-%m-%Y}",
                "<br>Visitas: %{y}",
                "<extra></extra>"
            )
        ) %>%
            layout(
                xaxis = list(
                    title = "Fecha"
                ),
                yaxis = list(
                    title = "Visitas",
                    rangemode = "tozero"
                ),
                legend = list(
                    orientation = "h",
                    y = -0.25
                ),
                hovermode = "x unified"
            )
    })  %>%
    	bindCache(
    		filtered_referrer_data(),
    		selected_source()
    	)
}