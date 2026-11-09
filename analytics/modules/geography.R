
# ==========================================
# MÓDULO DE GEOGRAFÍA
# ==========================================


# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

geography_ui <- nav_panel(
	"Geografía",
	
	layout_columns(
		value_box(
			title = "Visitas",
			value = textOutput("total_visits"),
			showcase = bsicons::bs_icon("eye")
		),
		
		value_box(
			title = "Países identificados",
			value = textOutput("total_countries"),
			showcase = bsicons::bs_icon("globe")
		),
		
		value_box(
			title = "País seleccionado",
			value = textOutput("selected_country"),
			showcase = bsicons::bs_icon("geo-alt")
		)
	),
	
	layout_columns(
		card(
			card_header("Distribución geográfica"),
			leafletOutput("country_map", height = "550px")
		),
		
		card(
			card_header("Visitas por país"),
			plotlyOutput("country_chart", height = "550px")
		),
		
		accordion(
			open = FALSE,
			accordion_panel(
				"Detalle de visitas por país",
				DT::DTOutput("country_table")
			)
		),
		
		col_widths = c(7, 5)
	)
)


# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

geography_server <- function(input, output, filtered_data, world) {
	
	# Resumen por país
	country_data <- reactive({
		
		filtered_data() %>%
			filter(country != "País no identificado") %>%
			count(country, name = "visits") %>%
			arrange(desc(visits))
		
	})
	
	
	# País seleccionado
	selected <- reactiveVal(NULL)
	
	country_table_proxy <- DT::dataTableProxy("country_table")
	
	
	# Total de visitas
	output$total_visits <- renderText({
		nrow(filtered_data())
	})
	
	
	# Número de países
	output$total_countries <- renderText({
		nrow(country_data())
	})
	
	
	# País seleccionado
	output$selected_country <- renderText({
		
		if (is.null(selected())) {
			"Ninguno"
		} else {
			selected()
		}
		
	})
	
	
	# ----------------------------------------
	# PREPARAR DATOS DEL MAPA
	# ----------------------------------------
	
	map_data <- reactive({
		
		visits <- filtered_data() %>%
			mutate(
				iso3c = countrycode::countrycode(
					Location,
					origin = "iso2c",
					destination = "iso3c",
					warn = FALSE
				)
			) %>%
			filter(!is.na(iso3c)) %>%
			count(iso3c, name = "visits")
		
		world %>%
			left_join(
				visits,
				by = c("iso_a3" = "iso3c")
			) %>%
			mutate(
				visits = coalesce(visits, 0L),
				
				country_label = countrycode::countrycode(
					iso_a3,
					origin = "iso3c",
					destination = "country.name.es",
					warn = FALSE
				),
				
				country_label = if_else(
					is.na(country_label),
					admin,
					country_label
				),
				
				is_selected = if (is.null(selected())) {
					FALSE
				} else {
					country_label == selected()
				}
			)
		
	})
	
	
	# ----------------------------------------
	# MAPA MUNDIAL
	# ----------------------------------------
	
	output$country_map <- renderLeaflet({
		
		data <- map_data()
		
		pal <- colorNumeric(
			palette = "YlOrRd",
			domain = data$visits
		)
		
		leaflet(data) %>%
			addProviderTiles(
				providers$CartoDB.Positron
			) %>%
			addPolygons(
				fillColor = ~pal(visits),
				fillOpacity = ~ifelse(is_selected, 0.95, 0.8),
				
				color = ~ifelse(
					is_selected,
					"#009B3A",
					"#FFFFFF"
				),
				
				weight = ~ifelse(
					is_selected,
					3,
					0.5
				),
				
				layerId = ~country_label,
				
				label = ~paste0(
					country_label,
					": ",
					visits,
					" visitas"
				),
				
				highlightOptions = highlightOptions(
					weight = 2,
					color = "#333333",
					bringToFront = TRUE
				)
			) %>%
			addLegend(
				pal = pal,
				values = ~visits,
				title = "Visitas",
				position = "bottomright"
			)
		
	})
	
	
	# ----------------------------------------
	# SELECCIÓN DESDE EL MAPA
	# ----------------------------------------
	
	observeEvent(input$country_map_shape_click, {
		
		click <- input$country_map_shape_click
		
		if (!is.null(click$id)) {
			
			if (identical(selected(), click$id)) {
				selected(NULL)
			} else {
				selected(click$id)
			}
			
		}
		
	})
	
	
	# ----------------------------------------
	# SELECCIÓN DESDE LA TABLA
	# ----------------------------------------
	
	observeEvent(input$country_table_rows_selected, {
		
		selected_row <- input$country_table_rows_selected
		
		if (length(selected_row) == 1) {
			
			country <- country_data()$country[selected_row]
			
			if (!identical(selected(), country)) {
				selected(country)
			}
			
		} else {
			selected(NULL)
		}
		
	})
	
	
	# Sincronizar selección con la tabla
	observeEvent(selected(), {
		
		if (is.null(selected())) {
			
			DT::selectRows(country_table_proxy, NULL)
			
		} else {
			
			selected_row <- which(
				country_data()$country == selected()
			)
			
			if (length(selected_row) == 1) {
				DT::selectRows(country_table_proxy, selected_row)
			}
			
		}
		
	})
	
	
	# ----------------------------------------
	# GRÁFICO DE BARRAS
	# ----------------------------------------
	
	output$country_chart <- renderPlotly({
		
		data <- country_data()
		
		selected_colors <- if (is.null(selected())) {
			
			rep("#64748B", nrow(data))
			
		} else {
			
			ifelse(
				data$country == selected(),
				"#009B3A",
				"#64748B"
			)
			
		}
		
		plot <- plot_ly(
			data = data,
			x = ~visits,
			y = ~reorder(country, visits),
			type = "bar",
			orientation = "h",
			source = "country_chart",
			customdata = ~country,
			marker = list(color = selected_colors),
			hovertemplate = paste(
				"<b>%{customdata}</b>",
				"<br>Visitas: %{x}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(title = "Visitas"),
				yaxis = list(title = ""),
				margin = list(l = 110),
				showlegend = FALSE
			)
		
		plot
		
	})
	
	
	# ----------------------------------------
	# TABLA DE PAÍSES
	# ----------------------------------------
	
	output$country_table <- DT::renderDT({
		
		data <- country_data() %>%
			rename(
				País = country,
				Visitas = visits
			)
		
		DT::datatable(
			data,
			rownames = FALSE,
			selection = "single",
			options = list(
				pageLength = 10,
				searching = TRUE,
				ordering = TRUE,
				lengthChange = FALSE,
				language = list(
					search = "Buscar:",
					info = "Mostrando _START_ a _END_ de _TOTAL_ países",
					infoEmpty = "No hay países disponibles",
					zeroRecords = "No se encontraron resultados",
					paginate = list(
						previous = "Anterior",
						`next` = "Siguiente"
					)
				)
			)
		)
		
	})
	
	
	# ----------------------------------------
	# SELECCIÓN DESDE EL GRÁFICO
	# ----------------------------------------
	
	observeEvent(
		event_data("plotly_click", source = "country_chart"),
		{
			
			click <- event_data(
				"plotly_click",
				source = "country_chart"
			)
			
			if (!is.null(click)) {
				
				country <- click$customdata
				
				if (identical(selected(), country)) {
					selected(NULL)
				} else {
					selected(country)
				}
				
			}
			
		}
	)
	
	
	# ----------------------------------------
	# LIMPIAR SELECCIÓN SI SE EXCLUYE EL PAÍS
	# ----------------------------------------
	
	observeEvent(input$exclude_countries, {
		
		if (
			!is.null(selected()) &&
			selected() %in% input$exclude_countries
		) {
			selected(NULL)
		}
		
	})
	
}
