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

function sortObjectKeys(value) {

    if (Array.isArray(value)) {
        return value.map(sortObjectKeys);
    }

    if (value !== null && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
                result[key] = sortObjectKeys(value[key]);
                return result;
            }, {});
    }

    return value;
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

    const lastSnapshot =
        createHistorySnapshot(last);

    const currentSnapshot =
        createHistorySnapshot(currentStats);

	return JSON.stringify(sortObjectKeys(lastSnapshot)) !==
	    JSON.stringify(sortObjectKeys(currentSnapshot));
}

function getDeletedVersionKeys(history) {

    const deletedVersions = new Set();

    for (const snapshot of history) {

        for (const event of snapshot.events || []) {

            if (!event.number || !event.lang) {
                continue;
            }

            const key = `${event.number}-${event.lang}`;

            if (event.type === "deletion") {
                deletedVersions.add(key);
            } else if (
                [
                    "publication",
                    "translation",
                    "edition",
                    "restoration"
                ].includes(event.type)
            ) {
                deletedVersions.delete(key);
            }

        }

    }

    return deletedVersions;
}

// Campos utilizados para comparar snapshots
// y detectar cambios relevantes en el sitio.
function createHistorySnapshot(stats) {

    return {

        site: stats.site,

        translations: {
		    posts: {
		        ...stats.translations.posts,
		        languages: [...stats.translations.posts.languages].sort()
		    },
		    pages: {
		        ...stats.translations.pages,
		        languages: [...stats.translations.pages.languages].sort()
		    }
		},

        content: {

            totalWords:
                stats.content.totalWords,

            totalNormalWords:
                stats.content.totalNormalWords,

            totalDetailsWords:
                stats.content.totalDetailsWords,

            averageWords:
                stats.content.averageWords,

            wordsByLanguage:
                stats.content.wordsByLanguage,

            totalReadingMinutes:
                stats.content.totalReadingMinutes,

            totalReadingMinutesMin:
                stats.content.totalReadingMinutesMin,

            totalReadingMinutesMax:
                stats.content.totalReadingMinutesMax
        },

		longest:
		    stats.content.longest ?? stats.longest,

		shortest:
		    stats.content.shortest ?? stats.shortest,

        posts:
            stats.posts.map(post => ({
                number: post.number,
                lang: post.lang,
                title: post.title,
                author_id: post.author_id,
                words: post.words,
                normalWords: post.normalWords,
				detailsWords: post.detailsWords,
				contentHash: post.contentHash,
				readingMinutesMin: post.readingMinutesMin,
				readingMinutesMax: post.readingMinutesMax
            }))
    };
}

// Compara las versiones actuales con el último snapshot.
// Identifica publicaciones nuevas, modificaciones y eliminaciones.
function detectContentChanges(previousSnapshot, currentSnapshot) {

    const previousPosts = new Map(
        (previousSnapshot?.posts || []).map(post => [
            `${post.number}-${post.lang}`,
            post
        ])
    );

    const currentPosts = new Map(
        currentSnapshot.posts.map(post => [
            `${post.number}-${post.lang}`,
            post
        ])
    );

    const newVersions = [];
    const modifiedVersions = [];
    const deletedVersions = [];

    for (const post of currentSnapshot.posts) {

        const key = `${post.number}-${post.lang}`;
        const previousPost = previousPosts.get(key);

        if (!previousPost) {

            newVersions.push(post);

        } else if (
            previousPost.contentHash &&
            post.contentHash &&
            previousPost.contentHash !== post.contentHash
        ) {

            modifiedVersions.push({
                previous: previousPost,
                current: post
            });

        }

    }

    for (const [key, post] of previousPosts) {

        if (!currentPosts.has(key)) {
            deletedVersions.push(post);
        }

    }

    return {
        newVersions,
        modifiedVersions,
        deletedVersions
    };
}

// Convierte las diferencias detectadas en eventos editoriales.
function createHistoryEvents(
    changes,
    date,
    deletedVersions = new Set()
) {

    const events = [];

    for (const post of changes.newVersions) {

        const key = `${post.number}-${post.lang}`;

        let type;

        if (deletedVersions.has(key)) {
            type = "restoration";
        } else {
            type = post.lang === "eo"
                ? "publication"
                : "translation";
        }

        events.push({
            date,
            type,
            number: post.number,
            lang: post.lang,
            title: post.title,
            author_id: post.author_id,
            words: post.words,
            normalWords: post.normalWords,
            detailsWords: post.detailsWords,
            contentHash: post.contentHash,
            readingMinutesMin: post.readingMinutesMin,
            readingMinutesMax: post.readingMinutesMax
        });

    }

    for (const change of changes.modifiedVersions) {

        const post = change.current;

        events.push({
            date,
            type: "edition",
            number: post.number,
            lang: post.lang,
            title: post.title,
            author_id: post.author_id,
            words: post.words,
            normalWords: post.normalWords,
            detailsWords: post.detailsWords,
            contentHash: post.contentHash,
            readingMinutesMin: post.readingMinutesMin,
            readingMinutesMax: post.readingMinutesMax
        });

    }

    for (const post of changes.deletedVersions) {

        events.push({
            date,
            type: "deletion",
            number: post.number,
            lang: post.lang,
            title: post.title,
            author_id: post.author_id,
            words: post.words,
            normalWords: post.normalWords,
            detailsWords: post.detailsWords,
            contentHash: post.contentHash,
            readingMinutesMin: post.readingMinutesMin,
            readingMinutesMax: post.readingMinutesMax
        });

    }

    return events;
}

// Guarda snapshots históricos y registra los eventos editoriales.
// Conserva íntegramente los snapshots anteriores.
async function updateHistory(currentStats) {

    let history = [];

    try {

        const data = await fs.readFile(
            HISTORY_JSON_PATH,
            "utf8"
        );

        history = JSON.parse(data);

        if (!Array.isArray(history)) {
            throw new Error(
                "El formato de history.json no es válido: se esperaba un array."
            );
        }

    } catch (error) {

        if (error.code === "ENOENT") {
            history = [];
        } else {
            throw error;
        }

    }

    // No generar un snapshot si no hay cambios relevantes.
    if (!hasStatsChanged(history, currentStats)) {
        return false;
    }

    // Comparar el estado actual con el último snapshot.
    const previousSnapshot = history.length
        ? history[history.length - 1]
        : null;

    const currentSnapshot =
        createHistorySnapshot(currentStats);

    const changes = detectContentChanges(
        previousSnapshot,
        currentSnapshot
    );

    const date = new Intl.DateTimeFormat("en-CA", {
	    timeZone: "America/Santiago",
	    year: "numeric",
	    month: "2-digit",
	    day: "2-digit"
	}).format(new Date(currentStats.generatedAt));

	// Identificar versiones cuyo último evento fue una eliminación.
	const deletedVersions = getDeletedVersionKeys(history);

	// Generar eventos editoriales correspondientes.
	const events = createHistoryEvents(
	    changes,
	    date,
	    deletedVersions
	);

    // Añadir el nuevo snapshot sin modificar los anteriores.
    history.push({
        date: currentStats.generatedAt,
        ...currentSnapshot,
        events
    });

    // Escritura temporal para evitar dejar un JSON incompleto.
    const tempPath = `${HISTORY_JSON_PATH}.tmp`;

    await fs.writeFile(
        tempPath,
        JSON.stringify(history, null, 2),
        "utf8"
    );

    await fs.rename(
        tempPath,
        HISTORY_JSON_PATH
    );

    return true;
}



if (require.main === module) {
    main()
        .catch(error => {
            console.error(
                "Error generando estadísticas:",
                error
            );

            process.exitCode = 1;
        });
}

module.exports = {
    createHistorySnapshot,
    detectContentChanges,
    createHistoryEvents,
    getDeletedVersionKeys,
    updateHistory
};