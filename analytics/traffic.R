# Análisis de tráfico histórico de Lastaj Neŭronoj
#
# Fuente:
# data/worpress/posts_views_daily_wp.csv
#
# Objetivo:
# Explorar visitas históricas importadas desde Wordpress

# ==========================================
# Estadísticas blog WordPress
# ==========================================

# Librerías
library(readr)
library(dplyr)
library(lubridate)
library(ggplot2)
library(jsonlite)


# ==========================================
# 1. Importar datos
# ==========================================

read_wp_traffic <- function(file) {
  
  read_csv2(file) |>
    mutate(
      date = ymd(date),
      type = as.character(type),
      id = paste0("wp-", id),
      title = as.character(title),
      views = as.numeric(views)
    )
}


# ==========================================
# 2. Limpieza y formato
# ==========================================

traffic_wp <- traffic_wp |>
  mutate(
    date = ymd(date),
    type = as.character(type),
    id = as.character(id),
    title = as.character(title),
    views = as.numeric(views)
  )


# Revisar estructura
glimpse(traffic_wp)


# ==========================================
# 3. Estadísticas generales
# ==========================================

# Total de visitas históricas
total_views <- traffic_wp |>
  summarise(
    total = sum(views)
  )

total_views


# Número de días con actividad
active_days <- traffic_wp |>
  summarise(
    days = n_distinct(date)
  )

active_days


# Número de posts registrados
number_posts <- traffic_wp |>
  filter(type == "post") |>
  summarise(
    posts = n_distinct(id)
  )

number_posts


# ==========================================
# 4. Visitas por día
# ==========================================

daily_views <- traffic_wp |>
  group_by(date) |>
  summarise(
    views = sum(views),
    .groups = "drop"
  )


# Gráfico visitas diarias

ggplot(daily_views, aes(date, views)) +
  geom_line() +
  labs(
    title = "Visitas diarias del blog",
    x = "Fecha",
    y = "Visitas"
  )


# ==========================================
# 5. Posts más visitados
# ==========================================

post_ranking <- traffic_wp |>
  filter(type == "post") |>
  group_by(id, title) |>
  summarise(
    total_views = sum(views),
    .groups = "drop"
  ) |>
  arrange(desc(total_views))


post_ranking


# Gráfico top 10 posts

post_ranking |>
  slice_head(n = 10) |>
  ggplot(
    aes(
      x = reorder(title, total_views),
      y = total_views
    )
  ) +
  geom_col() +
  coord_flip() +
  labs(
    title = "Posts más visitados",
    x = NULL,
    y = "Visitas"
  )


# ==========================================
# 6. Evolución de posts individuales
# ==========================================

traffic_wp |>
  filter(type == "post") |>
  ggplot(
    aes(
      x = date,
      y = views,
      color = title
    )
  ) +
  geom_line() +
  labs(
    title = "Evolución de visitas por post",
    x = "Fecha",
    y = "Visitas"
  )


# ==========================================
# 7. Exportar datos procesados
# ==========================================

dir.create(
  "data/processed",
  recursive = TRUE,
  showWarnings = FALSE
)

write_csv(
  daily_views,
  "data/processed/daily_views_wp.csv"
)

write_csv(
  post_ranking,
  "data/processed/post_ranking_wp.csv"
)
