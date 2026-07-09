/**
 * Genera estadísticas editoriales del sitio.
 *
 * Produce:
 * - stats.json
 * - stats-report.txt
 * - history.json
 *
 * history.json almacena snapshots históricos para
 * analizar la evolución del contenido en el tiempo.
 */

const fs = require("fs/promises");

// Importa rutas desde config.js
const {buildStatistics, generateStatistics, collectPostStats} = require("./stats");
const {
	POSTS_JSON_PATH,
	PAGES_JSON_PATH,
	STATS_DIR,
	STATS_JSON_PATH,
	STATS_REPORT_PATH,
	HISTORY_JSON_PATH
} = require("./config");

async function main() {

	const posts = JSON.parse(
		await fs.readFile(
			POSTS_JSON_PATH,
			"utf8"
		)
	);

	const pages = JSON.parse(
		await fs.readFile(
			PAGES_JSON_PATH,
			"utf8"
		)
	);

	console.log("Calculando estadísticas...\n");


	const postStats =
		await collectPostStats(posts);

	const stats =
	buildStatistics(
		posts,
		pages,
		postStats
	);


	const report =
		generateStatistics(
			posts,
			pages,
			postStats
	);

	// Crear carpeta de estadísticas si no existe

	await fs.mkdir(
		STATS_DIR,
		{
			recursive: true
		}
	);

	// Mostrar en consola

	console.log(report);


	// Guardar archivo

	await fs.writeFile(
	    STATS_JSON_PATH,
	    JSON.stringify(
	        stats,
	        null,
	        2
	    ),
	    "utf8"
	);

	await fs.writeFile(
	    STATS_REPORT_PATH,
	    report,
	    "utf8"
	);

	const historyUpdated =
		await updateHistory(stats);

	console.log(
		"\n✔ Estadísticas generadas: en /stats"
	);

	const path = require("path");

	function relative(file) {
		return path.relative(
			process.cwd(),
			file
		);
	}

	console.log("\nArchivos generados:");

	console.log(
		`✔ ${relative(STATS_JSON_PATH)}`
	);

	console.log(
		`✔ ${relative(STATS_REPORT_PATH)}`
	);

	if (historyUpdated) {

		console.log(
			`✔ ${relative(HISTORY_JSON_PATH)}`
		);

	}

	if (historyUpdated) {

		console.log(
			"✔ Historial actualizado: history.json"
		);

	} else {

		console.log(
			"ℹ Historial sin cambios"
		);

	}
}

// Evita registrar entradas duplicadas cuando
// las estadísticas son idénticas a las últimas
// almacenadas en history.json.
function hasStatsChanged(history, currentStats) {

	if (!history.length) {
		return true;
	}


	const last =
		history[history.length - 1];


	const lastSnapshot = {

		site:
			last.site,

		translations:
			last.translations,

		content:
			last.content,

		longest:
			last.longest,

		shortest:
			last.shortest

	};


	const currentSnapshot =
		createHistorySnapshot(currentStats);


	return JSON.stringify(lastSnapshot) !==
		JSON.stringify(currentSnapshot);

}

// Campos utilizados para comparar snapshots
// y detectar cambios relevantes en el sitio.
function createHistorySnapshot(stats) {

	return {

		site:
			stats.site,

		translations:
			stats.translations,

		content: {

			totalWords:
				stats.content.totalWords,

			averageWords:
				stats.content.averageWords,

			wordsByLanguage:
				stats.content.wordsByLanguage,

			totalReadingMinutes:
				stats.content.totalReadingMinutes
		},

		longest:
			stats.content.longest,

		shortest:
			stats.content.shortest
	};
}

// Guarda snapshots históricos para análisis temporal.
// Sólo se agrega una nueva entrada cuando cambian
// las estadísticas relevantes del sitio.
async function updateHistory(currentStats) {

	let history = [];

	try {

		const data =
			await fs.readFile(
				HISTORY_JSON_PATH,
				"utf8"
			);

		history =
			JSON.parse(data);

	} catch {

		history = [];

	}


	if (!hasStatsChanged(history, currentStats)) {

		return false;

	}


	const snapshot =
		createHistorySnapshot(currentStats);


	history.push({

		date:
			currentStats.generatedAt,

		...snapshot

	});


	await fs.writeFile(
		HISTORY_JSON_PATH,
		JSON.stringify(
			history,
			null,
			2
		),
		"utf8"
	);


	return true;

}


main()
	.catch(error => {
		console.error(
			"Error generando estadísticas:",
			error
		);
	});