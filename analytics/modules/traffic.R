# ==========================================
# MÓDULO DE TRÁFICO
# ==========================================


# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

traffic_ui <- nav_panel(
	"Tráfico",
	
	card(
		card_header("Evolución diaria de visitas"),
		div(
			id = "daily_traffic_container",
			class = "traffic-transition",
			plotlyOutput(
				"daily_traffic",
				height = "400px"
			)
		)
	),
	
	conditionalPanel(
		condition = "!input.include_wordpress",
		
		accordion(
			open = FALSE,
			accordion_panel(
				"Distribución de visitas por día y hora",
				plotlyOutput("traffic_heatmap", height = "400px")
			)
		)
	)
)

# ------------------------------------------
# 2. SERVIDOR
# ------------------------------------------

traffic_server <- function(output, filtered_data, filtered_combined_data) {
	
	
	# ----------------------------------------
	# TRÁFICO DIARIO
	# ----------------------------------------
	
	daily_data <- reactive({
		
		filtered_combined_data() %>%
			mutate(day = as.Date(date)) %>%
			count(day, name = "visits") %>%
			arrange(day)
		
	})
	
	
	# ----------------------------------------
	# MAPA DE CALOR — DÍAS Y HORAS
	# ----------------------------------------
	
	heatmap_data <- reactive({
		
		data <- filtered_data() %>%
			mutate(
				local_time = lubridate::with_tz(
					Date,
					tzone = "America/Santiago"
				),
				weekday_num = lubridate::wday(
					local_time,
					week_start = 1
				),
				hour = lubridate::hour(local_time)
			) %>%
			count(weekday_num, hour, name = "visits")
		
		grid <- expand.grid(
			weekday_num = 1:7,
			hour = 0:23
		)
		
		grid %>%
			left_join(
				data,
				by = c("weekday_num", "hour")
			) %>%
			mutate(
				visits = coalesce(visits, 0L),
				weekday = factor(
					weekday_num,
					levels = 1:7,
					labels = c(
						"Lunes",
						"Martes",
						"Miércoles",
						"Jueves",
						"Viernes",
						"Sábado",
						"Domingo"
					)
				)
			) %>%
			arrange(weekday_num, hour)
		
	})
	
	
	# ----------------------------------------
	# TRÁFICO DIARIO
	# ----------------------------------------
	
	output$daily_traffic <- renderPlotly({
		
		message("Calculando gráfico de tráfico diario...")
		
		data <- daily_data()
		
		plot_ly(
			data = data,
			x = ~day,
			y = ~visits,
			type = "scatter",
			mode = "lines+markers",
			hovertemplate = paste(
				"<b>%{x|%d-%m-%Y}</b>",
				"<br>Visitas: %{y}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(title = "Fecha"),
				yaxis = list(title = "Visitas"),
				hovermode = "x unified"
			)
		
	}) %>%
		bindCache(filtered_combined_data())
	
	
	# ----------------------------------------
	# MAPA DE CALOR — DÍAS Y HORAS
	# ----------------------------------------
	
	output$traffic_heatmap <- renderPlotly({
		
		data <- heatmap_data()
		
		plot_ly(
			data = data,
			x = ~hour,
			y = ~weekday,
			z = ~visits,
			type = "heatmap",
			colorscale = "YlGnBu",
			hovertemplate = paste(
				"<b>%{y}</b>",
				"<br>Hora: %{x}:00",
				"<br>Visitas: %{z}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(
					title = "Hora (Chile)",
					tickmode = "linear",
					dtick = 2
				),
				yaxis = list(
					title = "",
					autorange = "reversed"
				)
			)
		
	})
	
}