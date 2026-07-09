/**
 * stats.js
 * Utilidades para calcular estadísticas editoriales.
 *
 * Incluye:
 * - conteo de palabras
 * - tiempos de lectura
 * - cobertura de traducciones
 * - resúmenes para consola
 */


const fs = require("fs/promises");
const path = require("path");


function countWords(text) {
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.length;
}


async function collectPostStats(posts) {

	const stats = [];

	for (const post of posts) {

		for (const [lang, filename] of Object.entries(post.file || {})) {

			const md = await fs.readFile(
				path.join("posts", filename),
				"utf8"
			);

			const words = countWords(md);

			stats.push({
				number: post.number,
				title: post.title?.[lang],
				lang,
				words
			});
		}
	}

	return stats;
}

function generateContentStatistics(postStats) {

	if (!postStats.length) {
		return null;
	}

    const readingMinutes =
    	postStats.map(post =>
    		Math.ceil(post.words / 200)
    	);

    const totalReadingMinutes =
    	readingMinutes.reduce(
    		(sum, minutes) => sum + minutes,
    		0
    	);

    const averageReadingMinutes =
    	totalReadingMinutes / postStats.length;

	const totalWords =
		postStats.reduce(
			(sum, post) => sum + post.words,
			0
		);


	const averageWords =
		totalWords / postStats.length;


	const longest =
		postStats.reduce(
			(max, post) =>
				post.words > max.words ? post : max
		);


	const shortest =
		postStats.reduce(
			(min, post) =>
				post.words < min.words ? post : min
		);


	const wordsByLanguage = {};

	postStats.forEach(post => {

		wordsByLanguage[post.lang] =
			(wordsByLanguage[post.lang] || 0)
			+ post.words;
	});


	return {
		totalWords,
		averageWords,
		longest,
		shortest,
		wordsByLanguage,
		totalReadingMinutes,
        averageReadingMinutes
	};
}

function getContentStatisticsReport(postStats) {

	const stats =
		generateContentStatistics(postStats);

	if (!stats) return "";

	const lines = [];

	lines.push("Contenido:");
	lines.push("");

	lines.push(
		`  Palabras totales: ${stats.totalWords}`
	);

	lines.push(
		`  Promedio por post: ${Math.round(stats.averageWords)}`
	);

	lines.push(
		`  Lectura promedio: ${stats.averageReadingMinutes.toFixed(1)} min`
	);


	lines.push("");
	lines.push("  Post más largo:");

	lines.push(
		`    ${stats.longest.number} - ${stats.longest.title}`
	);

	lines.push(
		`    ${stats.longest.words} palabras`
	);


	lines.push("");
	lines.push("  Post más corto:");

	lines.push(
		`    ${stats.shortest.number} - ${stats.shortest.title}`
	);

	lines.push(
		`    ${stats.shortest.words} palabras`
	);


	lines.push("");
	lines.push("  Palabras por idioma:");

	Object.entries(stats.wordsByLanguage)
		.forEach(([lang, words]) => {
			lines.push(
				`    ${lang}: ${words}`
			);
		});


	lines.push("");

	lines.push(
		`  Tiempo total de lectura: ${stats.totalReadingMinutes} min`
	);


	return createReport(lines);
}

function getTranslationStatsReport(items, label) {

	const lines = [];

	lines.push(`${label}:`);
	lines.push(`  Total: ${items.length}`);

	const allLanguages = [
		...new Set(
			items.flatMap(item =>
				Object.keys(item.file || {})
			)
		)
	];


	// Versiones publicadas

	const languages = items.flatMap(item =>
		Object.keys(item.file || {})
	);

	lines.push("");
	lines.push("  Idiomas (versiones publicadas):");

	Object.entries(countOccurrences(languages))
		.sort((a, b) => b[1] - a[1])
		.forEach(([lang, count]) => {

			const percentage =
				(count / languages.length * 100)
				.toFixed(1);

			lines.push(
				`    ${lang}: ${count} (${percentage}%)`
			);
		});


	// Cobertura

	lines.push("");
	lines.push("  Cobertura de traducción:");

	const coverage = {};

	items.forEach(item => {

		Object.keys(item.file || {})
			.forEach(lang => {

				coverage[lang] =
					(coverage[lang] || 0) + 1;
			});
	});


	Object.entries(coverage)
		.sort((a, b) => b[1] - a[1])
		.forEach(([lang, count]) => {

			const percentage =
				(count / items.length * 100)
				.toFixed(1);

			lines.push(
				`    ${lang}: ${count}/${items.length} (${percentage}%)`
			);
		});


	// Completitud

	const expected =
		items.length * allLanguages.length;

	const existing =
		items.reduce(
			(sum, item) =>
				sum + Object.keys(item.file || {}).length,
			0
		);

	const completion =
		expected > 0
			? Number((existing / expected * 100).toFixed(1))
			: 100;


	lines.push("");
	lines.push("  Completitud:");
	lines.push(
		`    ${existing}/${expected} (${completion}%)`
	);


	// Faltantes

	lines.push("");
	lines.push("  Traducciones faltantes:");

	let missing = 0;

	items.forEach(item => {

		const available =
			Object.keys(item.file || {});


		const missingLangs =
			allLanguages.filter(
				lang => !available.includes(lang)
			);


		if (!missingLangs.length) return;


		missing++;

		const title =
			item.title?.eo ||
			item.title?.es ||
			Object.values(item.title || {})[0] ||
			"(sin título)";


		const identifier =
			item.number ??
			item.id ??
			"(sin identificador)";


		lines.push(
			`    ${identifier} - ${title}`
		);

		lines.push(
			`        Falta: ${missingLangs.join(", ")}`
		);
	});


	if (missing === 0) {
		lines.push("    Ninguna 🎉");
	}


	return createReport(lines);
}

function countOccurrences(values) {
	const counts = {};
	values.forEach(value => {
		if (!value) return;
		counts[value] = (counts[value] || 0) + 1;
	});
	return counts;
}

function getTranslationSummary(items) {

	const allLanguages = [
		...new Set(
			items.flatMap(item =>
				Object.keys(item.file || {})
			)
		)
	];

	const expected =
		items.length * allLanguages.length;

	const existing =
		items.reduce(
			(sum, item) =>
				sum + Object.keys(item.file || {}).length,
			0
		);

	const incomplete =
		items.filter(item =>
			Object.keys(item.file || {}).length <
			allLanguages.length
		).length;

	return {
		total: items.length,
		languages: allLanguages,
		expected,
		existing,
		incomplete,
		coverage:
			expected > 0
				? Number((existing / expected).toFixed(3))
				: 1
	};
}

function buildStatistics(
	posts,
	pages,
	postStats = []
) {

	const authors = posts
		.map(post => post.author_id)
		.filter(Boolean);


	return {
		generatedAt:
			new Date().toISOString(),
	
		site: {
			totalPosts: posts.length,
			totalPostVersions: postStats.length,
			totalPages: pages.length
		},
	
		authors: countOccurrences(authors),
	
		translations: {
			posts: getTranslationSummary(posts),
			pages: getTranslationSummary(pages)
		},
	
		content: generateContentStatistics(postStats),
	
		posts: postStats
	};

}

function generateStatistics(
	posts,
	pages,
	postStats = [],
	generatedPosts = null,
	generatedPages = null,
	warnings = 0
) {

	const lines = [];

	lines.push("==============================");
	lines.push(" Generación completada");
	lines.push("==============================");

	if (generatedPosts !== null) {
	lines.push(`Posts generados: ${generatedPosts}`);
    }
    
    if (generatedPages !== null) {
    	lines.push(`Páginas estáticas: ${generatedPages}`);
    }

    const postSummary =
	getTranslationSummary(posts);

    const pageSummary =
    	getTranslationSummary(pages);

    const totalExisting =
    	postSummary.existing +
    	pageSummary.existing;

    const totalExpected =
    	postSummary.expected +
    	pageSummary.expected;

    const totalCoverage =
    	totalExpected > 0
    		? totalExisting / totalExpected
    		: 1;

	if (warnings > 0) {
		lines.push(`Advertencias: ${warnings}`);
	}

    lines.push("Resumen editorial:");

    lines.push(
    	`  Posts sin traducir: ${postSummary.incomplete}`
    );
    
    lines.push(
    	`  Páginas sin traducir: ${pageSummary.incomplete}`
    );
    
    lines.push(
    	`  Cobertura total del sitio: ${(totalCoverage * 100).toFixed(1)}%`
    );

	// =========================
	// POSTS
	// =========================

    lines.push(
    	getTranslationStatsReport(posts, "Posts")
    );

	// =========================
	// AUTORES
	// =========================

	const authors = posts
		.map(post => post.author_id)
		.filter(Boolean);

	lines.push("Autores:");

	Object.entries(countOccurrences(authors))
		.sort((a, b) => b[1] - a[1])
		.forEach(([author, count]) => {

			const percentage =
				(count / posts.length * 100)
				.toFixed(1);

			lines.push(
				`  ${author}: ${count} (${percentage}%)`
			);
		});

        if (postStats && postStats.length) {
        	lines.push(
        		getContentStatisticsReport(postStats)
        	);
        }

    lines.push(
    	getTranslationStatsReport(pages, "Páginas")
    );
	lines.push("==============================");
    return createReport(lines);
}

function generateReport(data) {

    	return `
    ================================
     Lastaj Neŭronoj - Estadísticas
    ================================

    Fecha:
    ${new Date().toISOString().split("T")[0]}

    ${data}

    ================================
    `;
}

function createReport(lines) {
    return lines.join("\n");
}

module.exports = {
	buildStatistics,
	generateStatistics,
	collectPostStats,
	generateContentStatistics,
	getContentStatisticsReport,
	getTranslationStatsReport
};

if (require.main === module) {
	runStatistics();
}