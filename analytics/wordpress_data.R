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