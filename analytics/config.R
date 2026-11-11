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
# PALETA GENERAL
# ==========================================

BACKGROUND_COLOR <- "#F4F1EC"

BASE_COLOR <- "rgba(220, 211, 197, 0.50)"
BASE_COLOR_SOLID <- "rgba(220, 211, 197, 1)"

PRIMARY_COLOR <- "#222831"
SECONDARY_COLOR <- "#393E46"
TERTIARY_COLOR <- "#948979"
QUATERNARY_COLOR <- "#DFD0B8"

LANG_MODAL_HOVER_BG <- QUATERNARY_COLOR
TABLE_HOVER_COLOR <- QUATERNARY_COLOR

PROGRESS_COLOR <- PRIMARY_COLOR
PROGRESS_COMPLETE <- "#006400"

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
# ESTILO GENERAL DE GRÁFICOS Y TARJETAS
# ==========================================

# Tipografía
PLOT_FONT <- "Arial, sans-serif"

# Colores
PLOT_TEXT_COLOR <- SECONDARY_COLOR
PLOT_GRID_COLOR <- BASE_COLOR

# Fondos
CARD_BACKGROUND <- "#EAE6DF"
PLOT_BACKGROUND <- CARD_BACKGROUND

# Radios de esquinas
CARD_CORNER_RADIUS <- "10px"
PLOT_CORNER_RADIUS <- CARD_CORNER_RADIUS

# Márgenes predeterminados
PLOT_MARGINS <- list(
	l = 55,
	r = 25,
	t = 45,
	b = 50
)

# Estilo de la leyenda
PLOT_LEGEND_STYLE <- list(
	orientation = "h",
	y = -0.2,
	x = 0,
	font = list(size = 11)
)

# Estilo de las etiquetas emergentes
PLOT_HOVER_STYLE <- list(
	bgcolor = BASE_COLOR_SOLID,
	bordercolor = TERTIARY_COLOR,
	font = list(
		family = PLOT_FONT,
		size = 12,
		color = PRIMARY_COLOR
	)
)

# Función para aplicar el estilo general
apply_plotly_style <- function(plot) {
	
	plot %>%
		plotly::layout(
			font = list(
				family = PLOT_FONT,
				size = 12,
				color = PLOT_TEXT_COLOR
			),
			paper_bgcolor = PLOT_BACKGROUND,
			plot_bgcolor = PLOT_BACKGROUND,
			margin = PLOT_MARGINS,
			hoverlabel = PLOT_HOVER_STYLE
		)
}


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