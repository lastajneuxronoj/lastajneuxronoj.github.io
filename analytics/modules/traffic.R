# ==========================================
# MÓDULO DE TRÁFICO
# ==========================================


# ------------------------------------------
# 1. INTERFAZ
# ------------------------------------------

traffic_ui <- nav_panel(
	"Tráfico",
	
	layout_column_wrap(
		width = 1/2,
		
		card(
			card_header("Visitas diarias — GoatCounter"),
			plotlyOutput("daily_traffic", height = "350px")
		),
		
		card(
			card_header("Visitas mensuales — GoatCounter"),
			plotlyOutput("monthly_traffic", height = "350px")
		)
	),
	
	card(
		card_header("Visitas anuales — todas las plataformas"),
		plotlyOutput("yearly_traffic", height = "400px")
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

traffic_server <- function(
		input,
		output,
		filtered_data,
		filtered_combined_data,
		goatcounter,
		wordpress_monthly_visits
) {
	
	
	# ----------------------------------------
	# TRÁFICO DIARIO — GOATCOUNTER
	# ----------------------------------------
	
	daily_data <- reactive({
		
		filtered_data() %>%
			mutate(day = as.Date(Date, tz = "America/Santiago")) %>%
			count(day, name = "visits") %>%
			arrange(day)
		
	})
	
	
	# ----------------------------------------
	# TRÁFICO MENSUAL — GOATCOUNTER
	# ----------------------------------------
	
	monthly_data <- reactive({
		
		filtered_data() %>%
			mutate(
				month = as.Date(
					format(
						Date,
						"%Y-%m-01",
						tz = "America/Santiago"
					)
				)
			) %>%
			count(month, name = "visits") %>%
			arrange(month)
		
	})
	
	
	# ----------------------------------------
	# TRÁFICO ANUAL — TODAS LAS PLATAFORMAS
	# ----------------------------------------
	
	yearly_data <- reactive({
		
		# Visitas históricas de WordPress
		wp_data <- wordpress_monthly_visits %>%
			filter(
				date <= as.Date("2026-07-01")
			) %>%
			transmute(
				year = format(date, "%Y"),
				visits = visits
			)
		
		# Visitas de GoatCounter
		gc_data <- goatcounter() %>%
			filter(as.Date(Date, tz = "UTC") >= as.Date("2026-08-01")) %>%
			mutate(year=format(Date,"%Y",tz="UTC")) %>%
			count(year,name="visits")
		
		# Aplicar el año seleccionado
		if (
			!is.null(input$summary_year) &&
			input$summary_year != "all"
		) {
			
			wp_data <- wp_data %>%
				filter(year == input$summary_year)
			
			gc_data <- gc_data %>%
				filter(year == input$summary_year)
			
		}
		
		# WordPress de 2026 es opcional
		if (!isTRUE(input$include_wordpress)) {
			
			wp_data <- wp_data %>%
				filter(year != "2026")
			
		}
		
		# Combinar y sumar las visitas
		bind_rows(wp_data, gc_data) %>%
			group_by(year) %>%
			summarise(
				visits = sum(visits, na.rm = TRUE),
				.groups = "drop"
			) %>%
			arrange(year)
		
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
	# GRÁFICO DIARIO
	# ----------------------------------------
	
	output$daily_traffic <- renderPlotly({
		
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
			) %>%
			apply_plotly_style()
		
	})
	
	
	# ----------------------------------------
	# GRÁFICO MENSUAL
	# ----------------------------------------
	
	output$monthly_traffic <- renderPlotly({
		
		data <- monthly_data()
		
		plot_ly(
			data = data,
			x = ~month,
			y = ~visits,
			type = "scatter",
			mode = "lines+markers",
			hovertemplate = paste(
				"<b>%{x|%m-%Y}</b>",
				"<br>Visitas: %{y}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(title = "Mes"),
				yaxis = list(title = "Visitas"),
				hovermode = "x unified"
			) %>%
			apply_plotly_style()
		
	})
	
	
	# ----------------------------------------
	# GRÁFICO ANUAL
	# ----------------------------------------
	
	output$yearly_traffic <- renderPlotly({
		
		data <- yearly_data()
		
		plot_ly(
			data = data,
			x = ~year,
			y = ~visits,
			type = "bar",
			hovertemplate = paste(
				"<b>%{x}</b>",
				"<br>Visitas: %{y}",
				"<extra></extra>"
			)
		) %>%
			layout(
				xaxis = list(title = "Año"),
				yaxis = list(title = "Visitas"),
				hovermode = "x"
			) %>%
			apply_plotly_style()
		
	})
	
	
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