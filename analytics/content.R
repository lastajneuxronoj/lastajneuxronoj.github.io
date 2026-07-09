# Análisis de evolución del contenido de Lastaj Neŭronoj
#
# Fuente:
# stats/history.json
#
# Objetivo:
# Explorar la evolución del contenido del blog (posts, palabras,
# traducciones, tiempos de lectura) a partir de snapshots históricos

# ==========================================
# Estadísticas de contenido
# ==========================================

# Librerías
library(jsonlite)
library(dplyr)
library(purrr)
library(tidyr)
library(lubridate)
library(ggplot2)
library(readr)


# ==========================================
# 1. Importar datos
# ==========================================

read_content_history <- function(file) {
  fromJSON(file, simplifyVector = FALSE)
}

history_raw <- read_content_history("stats/history.json")


# ==========================================
# 2. Limpieza y formato
# ==========================================

# --- 2.1 Tabla principal: un snapshot por fila ---

snapshot_to_row <- function(snap) {
  tibble(
    date = snap$date,

    total_posts          = snap$site$totalPosts,
    total_post_versions  = snap$site$totalPostVersions,
    total_pages          = snap$site$totalPages,

    posts_total       = snap$translations$posts$total,
    posts_expected     = snap$translations$posts$expected,
    posts_existing      = snap$translations$posts$existing,
    posts_incomplete    = snap$translations$posts$incomplete,
    posts_coverage      = snap$translations$posts$coverage,

    pages_total        = snap$translations$pages$total,
    pages_expected      = snap$translations$pages$expected,
    pages_existing      = snap$translations$pages$existing,
    pages_incomplete    = snap$translations$pages$incomplete,
    pages_coverage      = snap$translations$pages$coverage,

    total_words          = snap$content$totalWords,
    average_words        = snap$content$averageWords,
    total_reading_minutes = snap$content$totalReadingMinutes,

    longest_number = snap$longest$number,
    longest_title  = snap$longest$title,
    longest_lang   = snap$longest$lang,
    longest_words  = snap$longest$words,

    shortest_number = snap$shortest$number,
    shortest_title  = snap$shortest$title,
    shortest_lang   = snap$shortest$lang,
    shortest_words  = snap$shortest$words,

    words_change  = if (is.null(snap$changes)) NA_real_ else snap$changes$words,
    posts_change  = if (is.null(snap$changes)) NA_real_ else snap$changes$posts
  )
}

content_history <- map_dfr(history_raw, snapshot_to_row) |>
  mutate(
    date = ymd_hms(date),
    across(
      c(longest_number, longest_title, longest_lang,
        shortest_number, shortest_title, shortest_lang),
      as.character
    )
  ) |>
  arrange(date)


# --- 2.2 Tabla auxiliar: palabras por idioma en cada snapshot ---

words_by_lang <- map_dfr(history_raw, function(snap) {
  wbl <- snap$content$wordsByLanguage
  tibble(
    date = ymd_hms(snap$date),
    lang = names(wbl),
    words = as.numeric(unlist(wbl))
  )
})


# Revisar estructura
glimpse(content_history)
glimpse(words_by_lang)


# ==========================================
# 3. Estadísticas generales (último snapshot)
# ==========================================

latest <- content_history |>
  slice_max(date, n = 1)

latest


# Crecimiento total desde el primer snapshot
growth <- content_history |>
  summarise(
    first_date   = min(date),
    last_date    = max(date),
    words_start  = first(total_words, order_by = date),
    words_end    = last(total_words, order_by = date),
    words_growth = words_end - words_start,
    posts_start  = first(total_posts, order_by = date),
    posts_end    = last(total_posts, order_by = date),
    posts_growth = posts_end - posts_start
  )

growth


# ==========================================
# 4. Evolución del contenido en el tiempo
# ==========================================

# Palabras totales

ggplot(content_history, aes(date, total_words)) +
  geom_line() +
  geom_point() +
  labs(
    title = "Evolución de palabras totales",
    x = "Fecha",
    y = "Palabras"
  )


# Posts y páginas totales

content_history |>
  select(date, total_posts, total_pages) |>
  pivot_longer(-date, names_to = "tipo", values_to = "cantidad") |>
  ggplot(aes(date, cantidad, color = tipo)) +
  geom_step() +
  labs(
    title = "Evolución de posts y páginas",
    x = "Fecha",
    y = "Cantidad",
    color = NULL
  )


# ==========================================
# 5. Cobertura de traducción
# ==========================================

content_history |>
  select(date, posts_coverage, pages_coverage) |>
  pivot_longer(-date, names_to = "tipo", values_to = "cobertura") |>
  ggplot(aes(date, cobertura, color = tipo)) +
  geom_line() +
  geom_point() +
  scale_y_continuous(labels = scales::percent) +
  labs(
    title = "Cobertura de traducción en el tiempo",
    x = "Fecha",
    y = "Cobertura",
    color = NULL
  )


# ==========================================
# 6. Palabras por idioma
# ==========================================

ggplot(words_by_lang, aes(date, words, color = lang)) +
  geom_line() +
  geom_point() +
  labs(
    title = "Palabras por idioma",
    x = "Fecha",
    y = "Palabras",
    color = "Idioma"
  )


# ==========================================
# 7. Cambios entre snapshots
# ==========================================

changes_summary <- content_history |>
  select(date, words_change, posts_change) |>
  filter(!is.na(words_change) | !is.na(posts_change))

changes_summary


# ==========================================
# 8. Posts más largos / más cortos registrados
# ==========================================

longest_track <- content_history |>
  select(date, longest_title, longest_lang, longest_words)

shortest_track <- content_history |>
  select(date, shortest_title, shortest_lang, shortest_words)

longest_track
shortest_track


# ==========================================
# 9. Exportar datos procesados
# ==========================================

dir.create(
  "data/processed",
  recursive = TRUE,
  showWarnings = FALSE
)

write_csv(
  content_history,
  "data/processed/content_history.csv"
)

write_csv(
  words_by_lang,
  "data/processed/words_by_lang.csv"
)
