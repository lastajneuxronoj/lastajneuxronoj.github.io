# ==========================================
# CONFIGURACIÓN GENERAL
# ==========================================

# Idiomas y sus colores
LANGUAGE_COLORS <- c(
	"eo" = "#009B3A",
	"es" = "#D52B1E"
)

# Nombres de los idiomas
LANGUAGE_LABELS <- c(
	"eo" = "Esperanto",
	"es" = "Español"
)

# Color para registros sin idioma identificado
COLOR_UNKNOWN <- "#9E9E9E"

# Paleta usando los nombres visibles de los idiomas
LANGUAGE_COLORS_BY_LABEL <- setNames(
	LANGUAGE_COLORS,
	LANGUAGE_LABELS[names(LANGUAGE_COLORS)]
)

# Recursos estáticos
addResourcePath(
	"svg",
	file.path(APP_DIR, "..", "svg")
)

# ==========================================
# COLORES DE LAS FUENTES DE TRÁFICO
# ==========================================

SOURCE_COLORS <- c(
	"Navegación interna" = "#0072B2",
	"Sin referente identificable" = "#999999",
	"Redes sociales y plataformas" = "#E69F00",
	"Administración y pruebas" = "#666666",
	"Buscadores" = "#009E73",
	"Campañas etiquetadas" = "#CC79A7",
	"Herramientas de IA" = "#56B4E9",
	"Otros sitios externos" = "#D55E00"
)

# ==========================================
# PALETAS DE MAPAS
# ==========================================

MAP_VISITS_PALETTE <- c(
	"#FFFFE5",
	"#FFF7BC",
	"#FEC44F",
	"#EC7014",
	"#8C2D04"
)



# ==========================================
# RUTAS DEL PROYECTO
# ==========================================

if (exists("APP_DIR", inherits = FALSE)) {
	CONFIG_FILE <- file.path(APP_DIR, "config.R")
} else {
	CONFIG_FILE <- normalizePath(
		sys.frame(1)$ofile,
		winslash = "/",
		mustWork = TRUE
	)
}

PROJECT_ROOT <- dirname(dirname(CONFIG_FILE))

DATA_DIR <- file.path(PROJECT_ROOT, "data")
RAW_DATA_DIR <- file.path(DATA_DIR, "goatcounter")
PROCESSED_DATA_DIR <- file.path(DATA_DIR, "processed")

# ==========================================
# HISTORIAL EDITORIAL
# ==========================================

HISTORY_JSON_PATH <- file.path(
	PROJECT_ROOT,
	"stats",
	"history.json"
	)

MANUAL_EVENTS_PATH <- file.path(
	dirname(HISTORY_JSON_PATH),
	"manual-events.json"
)