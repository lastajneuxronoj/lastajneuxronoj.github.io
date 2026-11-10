
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


# ==========================================
# 3. CLASIFICACIÓN DE FUENTES DE TRÁFICO
# ==========================================

# Identificar y normalizar plataformas
identify_source_platform <- function(source) {
	
	source_clean <- trimws(as.character(source))
	source_lower <- tolower(source_clean)
	
	source_lower <- gsub("\\\\", "", source_lower)
	source_lower <- sub("^https?://", "", source_lower)
	source_lower <- sub("^www\\.", "", source_lower)
	
	case_when(
		
		is.na(source_clean) |
			source_lower %in% c("", "sin referente", "(direct)") ~
			"Sin referente",
		
		source_lower == "ig" |
			grepl("instagram\\.com", source_lower) ~
			"Instagram",
		
		grepl("facebook\\.com", source_lower) ~
			"Facebook",
		
		grepl("threads\\.com", source_lower) ~
			"Threads",
		
		grepl("twitch\\.tv", source_lower) ~
			"Twitch",
		
		grepl("tiktok\\.com", source_lower) ~
			"TikTok",
		
		grepl("youtube\\.com|youtu\\.be", source_lower) ~
			"YouTube",
		
		grepl("reddit\\.com", source_lower) ~
			"Reddit",
		
		grepl("linkedin\\.com", source_lower) ~
			"LinkedIn",
		
		source_lower %in% c("x", "twitter") |
			grepl("(^|[./])x\\.com", source_lower) |
			grepl("twitter\\.com", source_lower) ~
			"X",
		
		grepl("bsky\\.app|bluesky", source_lower) ~
			"Bluesky",
		
		grepl("mastodon", source_lower) ~
			"Mastodon",
		
		grepl("lemmy", source_lower) ~
			"Lemmy",
		
		grepl("google", source_lower) ~
			"Google",
		
		grepl("bing\\.com", source_lower) ~
			"Bing",
		
		grepl("duckduckgo\\.com", source_lower) ~
			"DuckDuckGo",
		
		grepl("libro\\.ee", source_lower) ~
			"libro.ee",
		
		grepl("chatgpt\\.com", source_lower) ~
			"ChatGPT",
		
		source_lower == "lastajneuronoj" ~
			"Campaña propia",
		
		grepl(
			"lastajneuxronoj\\.goatcounter\\.com|github\\.com/lastajneuxronoj/.*deployments|localhost|172\\.19\\.144\\.1",
			source_lower
		) ~
			"Entorno de administración y pruebas",
		
		grepl(
			"^lastajneuxronoj\\.github\\.io(/|$)",
			source_lower
		) ~
			"Lastaj Neŭronoj",
		
		grepl(
			"^lastajneuxronoj\\.wordpress\\.com(/|$)|^wordpress$",
			source_lower
		) ~
			"Lastaj Neŭronoj (WordPress)",
		
		grepl("miavivo", source_lower) ~
			"MiaVivo",
		
		grepl("microsoft teams|teams\\.microsoft\\.com", source_lower) ~
			"Microsoft Teams",
		
		TRUE ~ source_clean
	)
}


# Asignar categorías generales
classify_source_category <- function(source_platform) {
	
	case_when(
		
		source_platform == "Sin referente" ~
			"Sin referente identificable",
		
		source_platform %in% c(
			"Lastaj Neŭronoj",
			"Lastaj Neŭronoj (WordPress)"
		) ~
			"Navegación interna",
		
		source_platform == "Entorno de administración y pruebas" ~
			"Administración y pruebas",
		
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
			"LinkedIn",
			"X",
			"Bluesky",
			"Mastodon",
			"Lemmy",
			"MiaVivo",
			"Microsoft Teams"
		) ~
			"Redes sociales y plataformas",
		
		source_platform %in% c(
			"Google",
			"Bing",
			"DuckDuckGo"
		) ~
			"Buscadores",
		
		source_platform == "ChatGPT" ~
			"Herramientas de IA",
		
		TRUE ~ "Otros sitios externos"
	)
}


# Preparar fuentes de GoatCounter
prepare_goatcounter_sources <- function(data) {
	
	data %>%
		mutate(
			referrer = trimws(as.character(Referrer)),
			referrer = gsub("\\\\", "", referrer),
			referrer = na_if(referrer, ""),
			referrer = coalesce(referrer, "Sin referente"),
			
			source_platform = identify_source_platform(referrer),
			
			source_category = classify_source_category(source_platform)
		)
}

