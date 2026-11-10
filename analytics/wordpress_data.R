# ==========================================
# DATOS HISTÓRICOS DE WORDPRESS
# ==========================================

library(readr)
library(dplyr)
library(lubridate)

read_wp_traffic <- function(file) {
	
	read_csv2(file) |>
		mutate(
			date = ymd(date),
			type = as.character(type),
			id = as.character(id),
			content_id = paste0("wp-", id),
			title = as.character(title),
			views = as.numeric(views),
			language = "eo",
			platform = "WordPress"
		)
}

traffic_wp <- read_wp_traffic(
	file.path(PROJECT_ROOT, "data", "wordpress", "posts_views_daily_wp.csv")
)


# ==========================================
# VISITAS MENSUALES DE WORDPRESS (JETPACK)
# ==========================================

read_wp_monthly_visits <- function(file) {
	
	month_numbers <- c(
		jan = 1,
		feb = 2,
		mar = 3,
		apr = 4,
		may = 5,
		jun = 6,
		jul = 7,
		aug = 8,
		sep = 9,
		oct = 10,
		nov = 11,
		dec = 12
	)
	
	data <- readr::read_csv(
		file,
		show_col_types = FALSE
	)
	
	data %>%
		tidyr::pivot_longer(
			cols = tidyselect::all_of(names(month_numbers)),
			names_to = "month",
			values_to = "visits"
		) %>%
		mutate(
			month_number = unname(month_numbers[month]),
			date = as.Date(
				sprintf("%04d-%02d-01", year, month_number)
			),
			visits = as.numeric(visits)
		) %>%
		filter(!is.na(visits)) %>%
		select(date, visits) %>%
		arrange(date)
	
}

read_wp_yearly_countries <- function(file) {
	readr::read_csv(file, show_col_types = FALSE) %>%
		mutate(
			year = as.integer(year),
			country = trimws(as.character(country)),
			visits = as.numeric(visits)
		) %>%
		filter(
			!is.na(year),
			!is.na(country),
			country != "",
			country != "País no identificado",
			!is.na(visits)
		) %>%
		group_by(year, country) %>%
		summarise(
			visits = sum(visits),
			.groups = "drop"
		)
}

read_wp_articles <- function(file) {
	
	readr::read_csv(
		file,
		col_types = readr::cols(
			year = readr::col_integer(),
			article_id = readr::col_character(),
			title = readr::col_character(),
			visits = readr::col_double()
		),
		show_col_types = FALSE
	) %>%
		mutate(
			article_id = trimws(article_id),
			title = trimws(title),
			source = "WordPress"
		) %>%
		filter(
			!is.na(year),
			!is.na(article_id),
			article_id != "",
			!is.na(visits)
		)
}


read_wp_pages <- function(file) {
	
	readr::read_csv(
		file,
		col_types = readr::cols(
			year = readr::col_integer(),
			category_page = readr::col_character(),
			page_id = readr::col_character(),
			title = readr::col_character(),
			visits = readr::col_double()
		),
		show_col_types = FALSE
	) %>%
		mutate(
			category_page = trimws(category_page),
			page_id = trimws(page_id),
			title = trimws(title),
			source = "WordPress"
		) %>%
		filter(
			!is.na(year),
			!is.na(page_id),
			page_id != "",
			!is.na(visits)
		)
}

read_wp_sources <- function(file) {
	
	readr::read_csv(
		file,
		col_types = readr::cols(
			year = readr::col_integer(),
			source = readr::col_character(),
			visits = readr::col_double()
		),
		show_col_types = FALSE
	) %>%
		mutate(
			source = trimws(source)
		) %>%
		filter(
			!is.na(year),
			!is.na(source),
			source != "",
			!is.na(visits)
		) %>%
		group_by(year, source) %>%
		summarise(
			visits = sum(visits),
			.groups = "drop"
		)
}

wordpress_articles <- read_wp_articles(
	file.path(
		PROJECT_ROOT,
		"data",
		"wordpress",
		"wordpress_articles.csv"
	)
)

wordpress_pages <- read_wp_pages(
	file.path(
		PROJECT_ROOT,
		"data",
		"wordpress",
		"wordpress_pages.csv"
	)
)

wordpress_monthly_visits <- read_wp_monthly_visits(
	file.path(
		PROJECT_ROOT,
		"data",
		"wordpress",
		"wordpress_visits.csv"
	)
)

wordpress_yearly_countries <- read_wp_yearly_countries(
	file.path(PROJECT_ROOT, "data", "wordpress", "yearly_countries_wp.csv")
)

wordpress_sources <- read_wp_sources(
	file.path(
		PROJECT_ROOT,
		"data",
		"wordpress",
		"wordpress_sources.csv"
	)
)

