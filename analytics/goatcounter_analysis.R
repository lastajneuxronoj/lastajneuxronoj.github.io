
# ==========================================
# GOATCOUNTER — ANÁLISIS Y VISUALIZACIÓN
# ==========================================


# ==========================================
# 1. CARGAR DATOS Y LIBRERÍAS
# ==========================================

library(ggplot2)
library(dplyr)
library(tidyr)
library(lubridate)
library(countrycode)


APP_DIR <- dirname(
	normalizePath(
		sys.frame(1)$ofile,
		winslash = "/",
		mustWork = TRUE
	)
)

source(file.path(APP_DIR, "goatcounter_data.R"))

# ==========================================
# 2. ANÁLISIS TEMPORAL
# ==========================================

# Visitas por tipo de página
cat("\n=== VISITAS POR TIPO DE PÁGINA ===\n")

print(
	goatcounter %>%
		count(page_type, sort = TRUE)
)


# Visitas diarias por idioma
daily_views <- goatcounter %>%
	mutate(
		language = coalesce(language, "Sin idioma")
	) %>%
	count(date, language, name = "visits") %>%
	complete(
		date = seq(
			min(date),
			max(date),
			by = "day"
		),
		language,
		fill = list(visits = 0)
	)


# Gráfico temporal
traffic_plot <- ggplot(
	daily_views,
	aes(
		x = date,
		y = visits,
		color = language,
		group = language
	)
) +
	geom_line(linewidth = 0.8) +
	geom_point(size = 1.5) +
	scale_x_date(
		date_breaks = "2 weeks",
		date_labels = "%d %b"
	) +
	scale_color_manual(
		values = c(
			LANGUAGE_COLORS,
			"Sin idioma" = COLOR_UNKNOWN
		),
		labels = c(
			LANGUAGE_LABELS,
			"Sin idioma" = "Sin idioma"
		)
	) +
	labs(
		title = "Tráfico diario — Lastaj Neŭronoj",
		subtitle = "Visitas registradas por GoatCounter",
		x = "Fecha",
		y = "Visitas",
		color = "Idioma"
	) +
	theme_minimal() +
	theme(
		axis.text.x = element_text(
			angle = 45,
			hjust = 1
		)
	)

print(traffic_plot)


# Exportar gráfico y tabla
ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_daily_views.png"),
	plot = traffic_plot,
	width = 11,
	height = 6,
	dpi = 300
)

write_csv(
	daily_views,
	file.path(PROCESSED_DATA_DIR, "goatcounter_daily_views.csv")
)


# ==========================================
# 3. MAPA DE CALOR — DÍA Y HORA
# ==========================================

heatmap_data <- goatcounter %>%
	mutate(
		local_datetime = with_tz(Date, "America/Santiago"),
		weekday_number = wday(local_datetime, week_start = 1),
		hour = hour(local_datetime),
		weekday = factor(
			weekday_number,
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
	count(weekday, hour, name = "visits") %>%
	complete(
		weekday,
		hour = 0:23,
		fill = list(visits = 0)
	)


heatmap_plot <- ggplot(
	heatmap_data,
	aes(
		x = hour,
		y = weekday,
		fill = visits
	)
) +
	geom_tile(
		color = "white",
		linewidth = 0.3
	) +
	scale_x_continuous(
		breaks = 0:23,
		limits = c(-0.5, 23.5),
		expand = c(0, 0)
	) +
	scale_y_discrete(
		limits = rev(levels(heatmap_data$weekday))
	) +
	scale_fill_viridis_c(
		option = "C",
		name = "Visitas"
	) +
	labs(
		title = "Actividad del blog por día y hora",
		subtitle = "Horario local de Santiago (Chile)",
		x = "Hora del día",
		y = NULL
	) +
	theme_minimal() +
	theme(
		plot.title = element_text(face = "bold"),
		panel.grid = element_blank()
	)

print(heatmap_plot)


ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_heatmap.png"),
	plot = heatmap_plot,
	width = 11,
	height = 6,
	dpi = 300
)

write_csv(
	heatmap_data,
	file.path(PROCESSED_DATA_DIR, "goatcounter_heatmap.csv")
)


# ==========================================
# 4. DISTRIBUCIÓN DE VISITAS POR PAÍS
# ==========================================

country_views <- goatcounter %>%
	mutate(
		country_code = toupper(trimws(as.character(Location))),
		country = countrycode::countrycode(
			country_code,
			origin = "iso2c",
			destination = "country.name.es",
			warn = FALSE
		),
		country = if_else(
			is.na(country) | country == "",
			"País no identificado",
			country
		)
	) %>%
	count(country, name = "visits") %>%
	arrange(desc(visits))


cat("\n=== VISITAS POR PAÍS ===\n")
print(country_views)


# Seleccionar los 15 países principales
countries_top <- country_views %>%
	slice_max(
		order_by = visits,
		n = 15,
		with_ties = FALSE
	)


# Gráfico de países
country_plot <- ggplot(
	countries_top,
	aes(
		x = reorder(country, visits),
		y = visits
	)
) +
	geom_col(
		fill = "#64748B",
		width = 0.7
	) +
	coord_flip() +
	labs(
		title = "Visitas por país",
		subtitle = "Los 15 países con más visitas registradas",
		x = NULL,
		y = "Visitas"
	) +
	theme_minimal() +
	theme(
		plot.title = element_text(face = "bold"),
		axis.text.y = element_text(size = 9)
	)

print(country_plot)


ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_country_distribution.png"),
	plot = country_plot,
	width = 9,
	height = 7,
	dpi = 300
)

write_csv(
	country_views,
	file.path(PROCESSED_DATA_DIR, "goatcounter_country_distribution.csv")
)


# ==========================================
# 5. DISTRIBUCIÓN DE VISITAS POR IDIOMA
# ==========================================

language_views <- goatcounter %>%
	mutate(
		language = case_when(
			language == "eo" ~ "Esperanto",
			language == "es" ~ "Español",
			TRUE ~ "Sin idioma identificado"
		)
	) %>%
	count(language, name = "visits") %>%
	mutate(
		percentage = visits / sum(visits) * 100,
		label = paste0(
			language,
			"\n",
			visits,
			" (",
			round(percentage, 1),
			"%)"
		)
	)


language_plot <- ggplot(
	language_views,
	aes(x = "", y = visits, fill = language)
) +
	geom_col(width = 1, color = "white") +
	coord_polar(theta = "y") +
	geom_text(
		aes(label = label),
		position = position_stack(vjust = 0.5),
		size = 3.5
	) +
	scale_fill_manual(
		values = c(
			LANGUAGE_COLORS_BY_LABEL,
			"Sin idioma identificado" = COLOR_UNKNOWN
		)
	) +
	labs(
		title = "Distribución de visitas por idioma",
		subtitle = "Incluye páginas sin idioma identificado",
		fill = "Idioma"
	) +
	theme_void() +
	theme(
		plot.title = element_text(
			hjust = 0.5,
			face = "bold"
		),
		plot.subtitle = element_text(hjust = 0.5)
	)

print(language_plot)


ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_language_distribution.png"),
	plot = language_plot,
	width = 8,
	height = 6,
	dpi = 300
)

write_csv(
	language_views,
	file.path(PROCESSED_DATA_DIR, "goatcounter_language_distribution.csv")
)


# ==========================================
# 6. VISITAS POR ARTÍCULO
# ==========================================

article_views <- goatcounter %>%
	filter(
		grepl("^/blog/[0-9]{3}-(eo|es)\\.html$", path)
	) %>%
	mutate(
		article_id = as.integer(
			sub("^/blog/([0-9]{3})-.*$", "\\1", path)
		),
		article_language = sub(
			"^/blog/[0-9]{3}-(eo|es)\\.html$",
			"\\1",
			path
		),
		article_title = sub(
			"\\s*\\|\\s*Lastaj Neŭronoj$",
			"",
			Title
		)
	) %>%
	count(
		article_id,
		article_language,
		article_title,
		name = "visits"
	)


# Unir las versiones de cada artículo
articles_comparison <- article_views %>%
	pivot_wider(
		names_from = article_language,
		values_from = c(article_title, visits),
		names_glue = "{.value}_{article_language}",
		values_fill = list(visits = 0)
	) %>%
	mutate(
		views_eo = coalesce(visits_eo, 0L),
		views_es = coalesce(visits_es, 0L),
		total_views = views_eo + views_es,
		
		title = if_else(
			!is.na(article_title_eo) & article_title_eo != "",
			article_title_eo,
			paste("ID", sprintf("%03d", article_id))
		)
	) %>%
	select(
		article_id,
		title,
		views_eo,
		views_es,
		total_views
	)


# Ordenar por ID y por visitas
articles_by_id <- articles_comparison %>%
	arrange(article_id)

articles_by_views <- articles_comparison %>%
	arrange(desc(total_views), article_id)


cat("\n=== ARTÍCULOS ORDENADOS POR ID ===\n")
print(articles_by_id)

cat("\n=== ARTÍCULOS ORDENADOS POR VISITAS ===\n")
print(articles_by_views)


write_csv(
	articles_by_id,
	file.path(PROCESSED_DATA_DIR, "goatcounter_articles_by_id.csv")
)

write_csv(
	articles_by_views,
	file.path(PROCESSED_DATA_DIR, "goatcounter_articles_by_views.csv")
)


# ==========================================
# 7. RANKING VISUAL DE ARTÍCULOS
# ==========================================

articles_top <- articles_comparison %>%
	slice_max(
		order_by = total_views,
		n = 15,
		with_ties = FALSE
	)


articles_chart <- articles_top %>%
	select(title, total_views, views_eo, views_es) %>%
	pivot_longer(
		cols = c(views_eo, views_es),
		names_to = "language",
		values_to = "visits"
	) %>%
	mutate(
		language = recode(
			language,
			views_eo = "Esperanto",
			views_es = "Español"
		)
	)


articles_plot <- ggplot(
	articles_chart,
	aes(
		x = reorder(title, total_views),
		y = visits,
		fill = language
	)
) +
	geom_col(width = 0.7) +
	coord_flip() +
	scale_fill_manual(
		values = LANGUAGE_COLORS_BY_LABEL
	) +
	labs(
		title = "Artículos más visitados",
		subtitle = "Comparación de visitas por idioma",
		x = NULL,
		y = "Visitas",
		fill = "Idioma"
	) +
	theme_minimal() +
	theme(
		plot.title = element_text(face = "bold"),
		axis.text.y = element_text(size = 9)
	)

print(articles_plot)


ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_top_articles.png"),
	plot = articles_plot,
	width = 11,
	height = 8,
	dpi = 300
)


# ==========================================
# 8. ANÁLISIS DE FUENTES DE TRÁFICO
# ==========================================

# Resumen por categoría
source_summary <- referrer_data %>%
	count(source_category, name = "visits") %>%
	mutate(
		percentage = visits / sum(visits) * 100
	) %>%
	arrange(desc(visits))


cat("\n=== VISITAS POR FUENTE DE TRÁFICO ===\n")
print(source_summary)


# Resumen por plataforma
platform_summary <- referrer_data %>%
	count(
		source_category,
		source_platform,
		name = "visits"
	) %>%
	arrange(source_category, desc(visits))


cat("\n=== VISITAS POR PLATAFORMA ===\n")
print(platform_summary, n = Inf)


# Detalle de referentes originales
source_details <- referrer_data %>%
	count(
		source_category,
		source_platform,
		referrer,
		name = "visits"
	) %>%
	arrange(source_category, desc(visits))


cat("\n=== DETALLE DE REFERENTES ===\n")
print(source_details, n = Inf)


# Gráfico general de fuentes
source_plot <- ggplot(
	source_summary,
	aes(
		x = reorder(source_category, visits),
		y = visits
	)
) +
	geom_col(
		fill = "#64748B",
		width = 0.7
	) +
	coord_flip() +
	labs(
		title = "Fuentes de tráfico",
		subtitle = "Distribución de visitas por procedencia",
		x = NULL,
		y = "Visitas"
	) +
	theme_minimal() +
	theme(
		plot.title = element_text(face = "bold")
	)

print(source_plot)


# Exportar gráfico y tablas
ggsave(
	file.path(PROCESSED_DATA_DIR, "goatcounter_traffic_sources.png"),
	plot = source_plot,
	width = 10,
	height = 6,
	dpi = 300
)

write_csv(
	source_summary,
	file.path(PROCESSED_DATA_DIR, "goatcounter_traffic_sources.csv")
)

write_csv(
	platform_summary,
	file.path(PROCESSED_DATA_DIR, "goatcounter_platforms.csv")
)

write_csv(
	source_details,
	file.path(PROCESSED_DATA_DIR, "goatcounter_referrer_details.csv")
)


# ==========================================
# 9. FINALIZACIÓN
# ==========================================

cat("\n==========================================\n")
cat("ANÁLISIS GOATCOUNTER COMPLETADO\n")
cat("==========================================\n")
