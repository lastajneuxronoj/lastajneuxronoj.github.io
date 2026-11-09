
# ==========================================
# GOATCOUNTER — PREPARACIÓN DE DATOS
# ==========================================

library(readr)
library(dplyr)
library(lubridate)

source(
	file.path(
		dirname(normalizePath(sys.frame(1)$ofile)),
		"config.R"
	)
)


# ==========================================
# 1. IMPORTACIÓN
# ==========================================

# Localizar el CSV más reciente
goatcounter_dir <- RAW_DATA_DIR

files <- list.files(
	goatcounter_dir,
	pattern = "^hits_.*\\.csv$",
	full.names = TRUE
)

if (length(files) == 0) {
	stop("No se encontraron archivos CSV de GoatCounter.")
}

latest_file <- files[which.max(file.info(files)$mtime)]

cat("Archivo importado:", latest_file, "\n")


# Importar los datos originales
goatcounter_raw <- read_csv(
	latest_file,
	show_col_types = FALSE,
	name_repair = "minimal"
)


# ==========================================
# 2. LIMPIEZA Y TRANSFORMACIÓN
# ==========================================

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


# ==========================================
# 3. DIRECTORIO Y EXPORTACIÓN
# ==========================================

dir.create(
	PROCESSED_DATA_DIR,
	recursive = TRUE,
	showWarnings = FALSE
)

write_csv(
	goatcounter,
	file.path(PROCESSED_DATA_DIR, "goatcounter_processed.csv")
)


# ==========================================
# 4. RESUMEN GENERAL
# ==========================================

cat("\n=== RESUMEN GOATCOUNTER ===\n")

cat("Registros:", nrow(goatcounter), "\n")

cat(
	"Sesiones distintas:",
	n_distinct(goatcounter$Session),
	"\n"
)

cat(
	"Primera fecha:",
	format(min(goatcounter$date, na.rm = TRUE), "%d-%m-%Y"),
	"\n"
)

cat(
	"Última fecha:",
	format(max(goatcounter$date, na.rm = TRUE), "%d-%m-%Y"),
	"\n"
)

cat("\n=== VISITAS POR IDIOMA ===\n")

print(
	goatcounter %>%
		filter(!is.na(language)) %>%
		count(language, sort = TRUE)
)

cat("\n=== ARCHIVO PROCESADO ===\n")
cat(file.path(PROCESSED_DATA_DIR, "goatcounter_processed.csv"), "\n")


# ==========================================
# 5. CLASIFICACIÓN DE FUENTES DE TRÁFICO
# ==========================================

# Normalizar referentes
goatcounter <- goatcounter %>%
	mutate(
		referrer = trimws(as.character(Referrer)),
		referrer = gsub("\\\\", "", referrer),
		referrer = tolower(referrer),
		referrer = na_if(referrer, ""),
		referrer = coalesce(referrer, "Sin referente")
	)


# Identificar plataformas y referentes
goatcounter <- goatcounter %>%
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
			
			referrer == "lastajneuronoj" ~ "Campaña propia",
			
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


# Clasificar las categorías generales
goatcounter <- goatcounter %>%
	mutate(
		source_category = case_when(
			
			source_platform == "Sin referente" ~
				"Sin referente identificable",
			
			source_platform == "Lastaj Neŭronoj" ~
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


# Mantener la estructura anterior para el módulo Fuentes
referrer_data <- goatcounter

cat("\nClasificación de fuentes preparada.\n")