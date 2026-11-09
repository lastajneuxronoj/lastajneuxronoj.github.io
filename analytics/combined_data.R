# ==========================================
# MODELO COMÚN DE DATOS
# ==========================================

library(dplyr)

# ------------------------------------------
# 1. Normalizar datos de WordPress
# ------------------------------------------

normalize_wordpress <- function(data) {
	
	data %>%
		transmute(
			date = date,
			
			content_id = case_when(
				type == "post" ~ paste0(
					"article-",
					sprintf(
						"%03d",
						as.integer(if_else(type == "post", id, "0"))
					)
				),
				TRUE ~ paste0("wp-", id)
			),
			
			title = title,
			type_original = type,
			
			type = case_when(
				type == "post" ~ "Artículo",
				type == "page" ~ "Página informativa",
				type == "index" ~ "Índice",
				TRUE ~ "Otras"
			),
			
			language = language,
			platform = platform,
			visits = views,
			source_category = NA_character_,
			source_platform = NA_character_
		)
	
}

# ------------------------------------------
# 2. Normalizar datos de GoatCounter
# ------------------------------------------

normalize_goatcounter <- function(data) {
	
	data %>%
		transmute(
			date = date,
			
			content_id = if_else(
				page_type == "Artículo",
				paste0(
					"article-",
					sub(
						"^/blog/([0-9]+)-.*$",
						"\\1",
						path
					)
				),
				paste0("gc-", path)
			),
			
			title = Title,
			type_original = page_type,
			
			type = case_when(
				page_type == "Artículo" ~ "Artículo",
				page_type == "Página informativa" ~ "Página informativa",
				page_type == "Inicio" ~ "Índice",
				TRUE ~ "Otras"
			),
			
			language = language,
			platform = "GoatCounter",
			visits = 1,
			source_category = source_category,
			source_platform = source_platform
		)
	
}

# ------------------------------------------
# 3. Combinar fuentes de datos
# ------------------------------------------

combine_traffic_data <- function(
		wordpress_data,
		goatcounter_data
) {
	
	bind_rows(
		wordpress_data,
		goatcounter_data
	) %>%
		arrange(date)
	
}