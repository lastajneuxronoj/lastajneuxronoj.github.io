
# ==========================================
# MÓDULO DE GEOGRAFÍA
# ==========================================


# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

geography_ui <- nav_panel(
	"Geografía",
	
	layout_columns(
		div(
			class = "geo-indicator",
			value_box(
				title = "Visitas",
				value = textOutput("total_visits"),
				showcase = bsicons::bs_icon("eye")
			)
		),
		
		div(
			class = "geo-indicator",
			value_box(
				title = "Países identificados",
				value = textOutput("total_countries"),
				showcase = bsicons::bs_icon("globe")
			)
		),
		
		div(
			class = "geo-indicator",
			value_box(
				title = "País seleccionado",
				value = textOutput("selected_country"),
				showcase = bsicons::bs_icon("geo-alt")
			)
		),
		
		fill = FALSE
	),
	
	layout_columns(
		col_widths = c(7, 5),
		
		div(
			id = "country_left_column",
			class = "country-left-column",
			
			card(
				id = "country_map_card",
				card_header("Distribución geográfica"),
				leafletOutput("country_map", height = "300px")
			),
			
			card(
				id = "country_table_card",
				card_header(
					div(
						class = "d-flex justify-content-between align-items-center",
						"Detalle de visitas por país",
						actionButton(
							"country_table_toggle",
							"Maximizar / restaurar",
							icon = icon("expand"),
							class = "btn-sm"
						)
					)
				),
				DT::DTOutput("country_table")
			)
		),
		
		card(
			id = "country_chart_card",
			card_header("Visitas por país"),
			plotlyOutput("country_chart", height = "550px")
		)
	)
)


# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

geography_server <- function(
		input,
		output,
		filtered_data,
		filtered_combined_data,
		yearly_countries_wp,
		wordpress_monthly_visits,
		world
) {
	
	# Resumen por país
	country_data <- reactive({
		
		data <- filtered_data() %>%
			filter(country != "País no identificado") %>%
			count(country, name = "visits")
		
		if (isTRUE(input$include_wordpress)) {
			
			wp <- yearly_countries_wp %>%
				filter(
					year %in% c(2024, 2025, 2026)
				)
			
			if (!is.null(input$summary_year) &&
				input$summary_year != "all") {
				wp <- wp %>%
					filter(year == as.numeric(input$summary_year))
			}
			
			if (length(input$exclude_countries) > 0) {
				wp <- wp %>%
					filter(!country %in% input$exclude_countries)
			}
			
			wp <- wp %>%
				group_by(country) %>%
				summarise(visits = sum(visits), .groups = "drop")
			
			data <- bind_rows(data, wp) %>%
				group_by(country) %>%
				summarise(visits = sum(visits), .groups = "drop")
		}
		
		arrange(data, desc(visits))
	})
	
	
	# País seleccionado
	selected <- reactiveVal(NULL)
	
	country_table_proxy <- DT::dataTableProxy("country_table")
	
	
	# Total de visitas
	output$total_visits <- renderText({
		
		# Visitas históricas de WordPress
		wp_data <- wordpress_monthly_visits %>%
			filter(
				date <= as.Date("2026-07-01")
			)
		
		# Visitas de GoatCounter
		gc_data <- filtered_data() %>%
			filter(
				as.Date(Date, tz = "UTC") >= as.Date("2026-08-01")
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
		
		# Excluir WordPress si está desactivado
		wp_visits <- if (isTRUE(input$include_wordpress)) {
			sum(wp_data$visits, na.rm = TRUE)
		} else {
			0
		}
		
		# Descontar países excluidos de WordPress
		if (isTRUE(input$include_wordpress) &&
			length(input$exclude_countries) > 0) {
			
			excluded_wp_visits <- yearly_countries_wp %>%
				filter(
					country %in% input$exclude_countries
				) %>%
				{ 
					if (!is.null(input$summary_year) &&
						input$summary_year != "all") {
						filter(., year == as.integer(input$summary_year))
					} else {
						.
					}
				} %>%
				summarise(
					visits = sum(visits, na.rm = TRUE)
				) %>%
				pull(visits)
			
			wp_visits <- wp_visits - excluded_wp_visits
		}
		
		total <- wp_visits + nrow(gc_data)
		
		format(
			total,
			big.mark = ".",
			decimal.mark = ",",
			scientific = FALSE
		)
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
		
		# Visitas geográficas de GoatCounter
		gc_visits <- filtered_data() %>%
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
		
		# Visitas geográficas de WordPress
		if (isTRUE(input$include_wordpress)) {
			
			wp <- yearly_countries_wp %>%
				filter(year %in% c(2024, 2025, 2026))
			
			if (!is.null(input$summary_year) &&
				input$summary_year != "all") {
				wp <- wp %>%
					filter(year == as.integer(input$summary_year))
			}
			
			if (length(input$exclude_countries) > 0) {
				wp <- wp %>%
					filter(!country %in% input$exclude_countries)
			}
			
			wp_visits <- wp %>%
				mutate(
					iso3c = countrycode::countrycode(
						country,
						origin = "country.name.es",
						destination = "iso3c",
						warn = FALSE
					)
				) %>%
				filter(!is.na(iso3c)) %>%
				group_by(iso3c) %>%
				summarise(
					visits = sum(visits, na.rm = TRUE),
					.groups = "drop"
				)
			
			visits <- bind_rows(gc_visits, wp_visits) %>%
				group_by(iso3c) %>%
				summarise(
					visits = sum(visits, na.rm = TRUE),
					.groups = "drop"
				)
			
		} else {
			visits <- gc_visits
		}
		
		# Unir con el mapa mundial
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
		
		max_visits <- if (length(data$visits) > 0) {
			max(data$visits, na.rm = TRUE)
		} else {
			0
		}
		
		if (!is.finite(max_visits) || max_visits == 0) {
			max_visits <- 1
		}
		
		positive_pal <- leaflet::colorNumeric(
			palette = MAP_VISITS_PALETTE,
			domain = c(0, log1p(max_visits))
		)
		
		# Valores de referencia para la leyenda
		legend_values <- unique(round(pretty(
			c(1, max_visits),
			n = 5
		)))
		
		legend_values <- legend_values[
			legend_values >= 1 & legend_values <= max_visits
		]
		
		legend_values <- sort(unique(c(
			legend_values,
			1,
			max_visits
		)))
		
		# Construcción del mapa
		leaflet(data = data) %>%
			addTiles(
				urlTemplate = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
				attribution = paste(
					"&copy; <a href='https://www.openstreetmap.org/copyright'>",
					"OpenStreetMap</a> contributors"
				)
			) %>%
			addPolygons(
				fillColor = ~ifelse(
					visits == 0,
					"#E5E7EB",
					positive_pal(log1p(visits))
				),
				
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
				pal = positive_pal,
				values = log1p(legend_values),
				title = "Visitas",
				position = "bottomright",
				labFormat = labelFormat(
					transform = function(x) round(expm1(x))
				)
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
			) %>%
			apply_plotly_style()
		
		plot
		
	})
	
	
	# ----------------------------------------
	# TABLA DE PAÍSES
	# ----------------------------------------
	
	output$country_table <- DT::renderDT({
		
		data <- country_data() %>%
			mutate(
				country_iso = countrycode::countrycode(
					country,
					origin = "country.name.es",
					destination = "iso2c",
					warn = FALSE
				),
				country_label = ifelse(
					!is.na(country_iso),
					paste0(
						'<img src="https://flagcdn.com/',
						tolower(country_iso),
						'.svg" ',
						'alt="" ',
						'style="height:15px; width:20px; ',
						'object-fit:cover; border-radius:3px; ',
						'margin-right:6px; vertical-align:middle;">',
						htmltools::htmlEscape(country)
					),
					htmltools::htmlEscape(country)
				)
			) %>%
			transmute(
				País = country_label,
				Visitas = visits
			)
		
		DT::datatable(
			data,
			rownames = FALSE,
			escape = FALSE,
			selection = "single",
			options = list(
				dom = "t<'row align-items-center mt-2'<'col-md-6'f><'col-md-6'p>>",
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
