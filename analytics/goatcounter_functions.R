
# ==========================================
# FUNCIONES REUTILIZABLES — GOATCOUNTER
# ==========================================

library(dplyr)
library(countrycode)


# ==========================================
# 1. CONVERTIR CÓDIGOS DE PAÍS
# ==========================================

add_country_names <- function(data) {
	
	data %>%
		mutate(
			country_code = toupper(trimws(as.character(Location))),
			
			country = countrycode(
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
		)
}


# ==========================================
# 2. FILTRAR REGISTROS
# ==========================================

filter_goatcounter <- function(
		data,
		start_date = NULL,
		end_date = NULL,
		exclude_countries = NULL,
		languages = NULL
) {
	
	filtered_data <- data
	
	if (!is.null(start_date)) {
		filtered_data <- filtered_data %>%
			filter(date >= as.Date(start_date))
	}
	
	if (!is.null(end_date)) {
		filtered_data <- filtered_data %>%
			filter(date <= as.Date(end_date))
	}
	
	if (!is.null(exclude_countries) &&
		length(exclude_countries) > 0) {
		
		filtered_data <- filtered_data %>%
			filter(!country %in% exclude_countries)
	}
	
	if (!is.null(languages) &&
		length(languages) > 0) {
		
		filtered_data <- filtered_data %>%
			filter(language %in% languages)
	}
	
	filtered_data
}
