
# ==========================================
# GOATCOUNTER — IMPORTACIÓN Y LIMPIEZA
# ==========================================

library(readr)
library(dplyr)
library(lubridate)
library(countrycode)
source(
  file.path(
    dirname(normalizePath(sys.frame(1)$ofile)),
    "config.R"
  )
)

# 1. Localizar el CSV más reciente
files <- list.files(
  RAW_DATA_DIR,
  pattern = "^hits_.*\\.csv$",
  full.names = TRUE
)

if (length(files) == 0) {
  stop("No se encontraron archivos CSV de GoatCounter.")
}

latest_file <- files[which.max(file.info(files)$mtime)]

cat("Archivo importado:", latest_file, "\n")

# 2. Importar los datos originales
goatcounter_raw <- read_csv(
  latest_file,
  show_col_types = FALSE,
  name_repair = "minimal"
)

# 3. Limpiar y transformar
goatcounter <- goatcounter_raw %>%
  rename(path = `2Path`) %>%
  mutate(
    Date = ymd_hms(Date, tz = "UTC"),
    date = as_date(Date),
    year = year(Date),
    month = month(Date),
    hour = hour(Date),
    
    language = case_when(
      grepl("-eo\\.html$", path) ~ "eo",
      grepl("-es\\.html$", path) ~ "es",
      TRUE ~ NA_character_
    ),
    
    page_type = case_when(
      path == "/" ~ "Inicio",
      grepl("^/blog/[0-9]+-(eo|es)\\.html$", path) ~ "Artículo",
      grepl("^/about-(eo|es)\\.html$", path) ~ "Página informativa",
      TRUE ~ "Otras"
    )
  )


# 4. Crear directorio de datos procesados
dir.create(
  PROCESSED_DATA_DIR,
  recursive = TRUE,
  showWarnings = FALSE
)

# 5. Exportar datos procesados
write_csv(
  goatcounter,
  file.path(PROCESSED_DATA_DIR, "goatcounter_processed.csv")
)

# 6. Mostrar resumen
cat("\n=== RESUMEN GOATCOUNTER ===\n")

cat("Registros:", nrow(goatcounter), "\n")
cat("Sesiones distintas:",
    n_distinct(goatcounter$Session), "\n")

cat("Primera fecha:",
    min(goatcounter$date, na.rm = TRUE), "\n")

cat("Última fecha:",
    max(goatcounter$date, na.rm = TRUE), "\n")

cat("\n=== VISITAS POR IDIOMA ===\n")

print(
  goatcounter %>%
    filter(!is.na(language)) %>%
    count(language, sort = TRUE)
)

cat("\n=== ARCHIVO PROCESADO ===\n")
cat(file.path(PROCESSED_DATA_DIR, "goatcounter_processed.csv"), "\n")


# ==========================================
# ANÁLISIS TEMPORAL
# ==========================================

library(ggplot2)
library(tidyr)

# 1. Clasificación de visitas por tipo de página
cat("\n=== VISITAS POR TIPO DE PÁGINA ===\n")

print(
  goatcounter %>%
    count(page_type, sort = TRUE)
)

# 2. Visitas diarias por idioma
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

# 3. Gráfico temporal
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

# 4. Guardar gráfico
ggsave(
  file.path(PROCESSED_DATA_DIR, "goatcounter_daily_views.png"),
  plot = traffic_plot,
  width = 11,
  height = 6,
  dpi = 300
)

# 5. Guardar tabla diaria
write_csv(
  daily_views,
  file.path(PROCESSED_DATA_DIR, "goatcounter_daily_views.csv")
)


# ==========================================
# MAPA DE CALOR — DÍA Y HORA
# ==========================================

# 1. Convertir la fecha UTC a hora local de Santiago
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

# 2. Crear el mapa de calor
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

# 3. Guardar gráfico
ggsave(
  file.path(PROCESSED_DATA_DIR, "goatcounter_heatmap.png"),
  plot = heatmap_plot,
  width = 11,
  height = 6,
  dpi = 300
)

# 4. Exportar datos
write_csv(
  heatmap_data,
  file.path(PROCESSED_DATA_DIR, "goatcounter_heatmap.csv")
)

cat("\nMapa de calor generado.\n")


# ==========================================
# DISTRIBUCIÓN DE VISITAS POR PAÍS
# ==========================================

# 1. Convertir códigos ISO a nombres de países
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

# 2. Mostrar resultados
cat("\n=== VISITAS POR PAÍS ===\n")
print(country_views)

# 3. Seleccionar los 15 países principales
countries_top <- country_views %>%
  slice_max(
    order_by = visits,
    n = 15,
    with_ties = FALSE
  )

# 4. Crear gráfico
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

# 5. Guardar gráfico
ggsave(
  file.path(PROCESSED_DATA_DIR, "goatcounter_country_distribution.png"),
  plot = country_plot,
  width = 9,
  height = 7,
  dpi = 300
)

# 6. Exportar tabla completa
write_csv(
  country_views,
  file.path(PROCESSED_DATA_DIR, "goatcounter_country_distribution.csv")
)

cat("\nAnálisis geográfico completado.\n")


cat("\nAnálisis temporal completado.\n")


# ==========================================
# DISTRIBUCIÓN DE VISITAS POR IDIOMA
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

# Gráfico de torta
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

# Guardar gráfico
ggsave(
  file.path(PROCESSED_DATA_DIR, "goatcounter_language_distribution.png"),
  plot = language_plot,
  width = 8,
  height = 6,
  dpi = 300
)

# Guardar tabla
write_csv(
  language_views,
  file.path(PROCESSED_DATA_DIR, "goatcounter_language_distribution.csv")
)


# ==========================================
# VISITAS POR ARTÍCULO
# ==========================================

library(tidyr)

# 1. Seleccionar únicamente las entradas del blog
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


# 2. Unir las versiones de cada artículo
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

# 3. Ordenar por ID
articles_by_id <- articles_comparison %>%
  arrange(article_id)

# 4. Ordenar por visitas
articles_by_views <- articles_comparison %>%
  arrange(desc(total_views), article_id)

# 5. Mostrar resultados
cat("\n=== ARTÍCULOS ORDENADOS POR ID ===\n")
print(articles_by_id)

cat("\n=== ARTÍCULOS ORDENADOS POR VISITAS ===\n")
print(articles_by_views)

# 6. Exportar ambas tablas
write_csv(
  articles_by_id,
  file.path(PROCESSED_DATA_DIR, "goatcounter_articles_by_id.csv")
)

write_csv(
  articles_by_views,
  file.path(PROCESSED_DATA_DIR, "goatcounter_articles_by_views.csv")
)


# ==========================================
# RANKING VISUAL DE ARTÍCULOS
# ==========================================

# Seleccionar los 15 artículos más visitados
articles_top <- articles_comparison %>%
  slice_max(
    order_by = total_views,
    n = 15,
    with_ties = FALSE
  )

# Preparar los datos para el gráfico
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

# Crear gráfico
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

# Guardar gráfico
ggsave(
  file.path(PROCESSED_DATA_DIR, "goatcounter_top_articles.png"),
  plot = articles_plot,
  width = 11,
  height = 8,
  dpi = 300
)

cat("\nRanking visual de artículos generado.\n")





# ==========================================
# ANÁLISIS DE FUENTES DE TRÁFICO
# ==========================================

# 1. Normalizar referentes
referrer_data <- goatcounter %>%
  mutate(
    referrer = trimws(as.character(Referrer)),
    referrer = gsub("\\\\", "", referrer),
    referrer = tolower(referrer),
    referrer = na_if(referrer, ""),
    referrer = coalesce(referrer, "Sin referente")
  )

# 2. Identificar plataformas y referentes
referrer_data <- referrer_data %>%
  mutate(
    source_platform = case_when(
      
      referrer == "sin referente" ~ "Sin referente",
      
      referrer == "ig" |
        grepl("instagram\\.com", referrer) ~ "Instagram",
      
      grepl("facebook\\.com", referrer) ~ "Facebook",
      
      grepl("threads\\.com", referrer) ~ "Threads",
      
      grepl("twitch\\.tv", referrer) ~ "Twitch",
      
      grepl("tiktok\\.com", referrer) ~ "TikTok",
      
      grepl("youtube\\.com|youtu\\.be", referrer) ~ "YouTube",
      
      grepl("reddit\\.com", referrer) ~ "Reddit",
      
      grepl("linkedin\\.com", referrer) ~ "LinkedIn",
      
      grepl("google", referrer) ~ "Google",
      
      grepl("bing\\.com", referrer) ~ "Bing",
      
      grepl("duckduckgo\\.com", referrer) ~ "DuckDuckGo",
      
      grepl("libro\\.ee", referrer) ~ "libro.ee",
      
      referrer == "chatgpt.com" ~ "ChatGPT",
      
      referrer == "lastajneuxronoj" ~ "Campaña propia",
      
      grepl(
        "lastajneuxronoj\\.goatcounter\\.com|github\\.com/lastajneuxronoj/.*deployments|localhost|172\\.19\\.144\\.1",
        referrer
      ) ~ "Entorno de administración y pruebas",
      
      grepl(
        "^lastajneuxronoj\\.github\\.io(/|$)",
        referrer
      ) ~ "Lastaj Neŭronoj",
      
      grepl(
        "^lastajneuxronoj\\.wordpress\\.com(/|$)",
        referrer
      ) ~ "Antiguo blog (WordPress)",
      
      TRUE ~ referrer
    )
  )

# 3. Clasificar las categorías generales
referrer_data <- referrer_data %>%
  mutate(
    source_category = case_when(
      
      source_platform == "Sin referente" ~
        "Sin referente identificable",
      
      source_platform == "Lastaj Neŭronoj" ~
        "Navegación interna",
      
      source_platform %in% c(
        "Entorno de administración y pruebas"
      ) ~ "Administración y pruebas",
      
      source_platform == "Campaña propia" ~
        "Campañas etiquetadas",
      
      source_platform %in% c(
        "Instagram",
        "Facebook",
        "Threads",
        "Twitch",
        "TikTok",
        "YouTube",
        "Reddit",
        "LinkedIn"
      ) ~ "Redes sociales y plataformas",
      
      source_platform %in% c(
        "Google",
        "Bing",
        "DuckDuckGo"
      ) ~ "Buscadores",
      
      source_platform == "ChatGPT" ~
        "Herramientas de IA",
      
      TRUE ~ "Otros sitios externos"
    )
  )

# 4. Resumen por categoría
source_summary <- referrer_data %>%
  count(source_category, name = "visits") %>%
  mutate(
    percentage = visits / sum(visits) * 100
  ) %>%
  arrange(desc(visits))

cat("\n=== VISITAS POR FUENTE DE TRÁFICO ===\n")
print(source_summary)

# 5. Resumen por plataforma
platform_summary <- referrer_data %>%
  count(
    source_category,
    source_platform,
    name = "visits"
  ) %>%
  arrange(source_category, desc(visits))

cat("\n=== VISITAS POR PLATAFORMA ===\n")
print(platform_summary, n = Inf)

# 6. Detalle de referentes originales
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

# 7. Gráfico general de fuentes
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

# 8. Guardar gráfico y tablas
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

cat("\nAnálisis de fuentes de tráfico completado.\n")
