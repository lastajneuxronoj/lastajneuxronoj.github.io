/**
 * rebuild-history.js
 *
 * Reconstruye retrospectivamente el historial editorial
 * a partir de los HTML generados del blog.
 *
 * Genera:
 * - stats/history-preview.json
 *
 * IMPORTANTE:
 * No modifica stats/history.json.
 */

const fs = require("fs/promises");
const path = require("path");
const cheerio = require("cheerio");

const {
    extractContentStats
} = require("./stats");

const {
    POSTS_JSON_PATH,
    PAGES_JSON_PATH,
    TRANSLATIONS_JSON_PATH,
    OUTPUT_DIR,
    STATS_DIR
} = require("./config");

const SPANISH_AVAILABLE_FROM = "2026-08-02";
const SPANISH_PUBLICATION_DATES = {
    "014": "2025-01-09"
};
const PAGES_AVAILABLE_FROM = "2026-07-31";

const MILESTONES = [
    {
        date: "2026-07-08",
        type: "site_launch",
        title: "Lanzamiento de GitHub Pages"
    },
    {
        date: "2026-07-31",
        type: "content_migration",
        title: "Incorporación del contenido histórico"
    },
    {
        date: "2026-08-02",
        type: "new_language",
        lang: "es",
        title: "Incorporación del español"
    }
];


// =========================
// LECTURA DE ARCHIVOS
// =========================

async function readJSON(filePath) {

    return JSON.parse(
        await fs.readFile(filePath, "utf8")
    );

}


// =========================
// ESTADÍSTICAS DE HTML
// =========================

async function readPostStats(post, lang) {

    const filename =
        `${post.number}-${lang}.html`;

    const htmlPath = path.join(
        OUTPUT_DIR,
        filename
    );

    let html;

    try {

        html = await fs.readFile(
            htmlPath,
            "utf8"
        );

    } catch (error) {

        if (error.code === "ENOENT") {
            throw new Error(
                `No se encontró el HTML: ${htmlPath}. ` +
                "Ejecuta npm run build antes de reconstruir el historial."
            );
        }

        throw error;

    }

    const $ = cheerio.load(html);

    const articleContent =
        $(".post-content").html();

    if (articleContent === undefined) {
        throw new Error(
            `No se encontró .post-content en ${filename}`
        );
    }

    const contentStats =
        extractContentStats(articleContent);

    return {
        number: post.number,
        title: post.title?.[lang],
        lang,
        author_id: post.author_id || "unknown",
        ...contentStats
    };

}


// =========================
// DISPONIBILIDAD HISTÓRICA
// =========================

function getAvailablePostLanguages(post, date, languages) {

    const available = [];

    if (
        post.file?.eo &&
        post.date <= date &&
        languages.includes("eo")
    ) {
        available.push("eo");
    }

    const spanishDate =
        SPANISH_PUBLICATION_DATES[post.number] ||
        SPANISH_AVAILABLE_FROM;

    if (
        post.file?.es &&
        spanishDate <= date &&
        languages.includes("es")
    ) {
        available.push("es");
    }

    return available;
}


function getAvailablePages(pages, date, languages) {

    if (date < PAGES_AVAILABLE_FROM) {
        return {
            total: 0,
            existing: 0
        };
    }

    let existing = 0;

    for (const page of pages) {

        for (const lang of Object.keys(page.file || {})) {

            if (languages.includes(lang)) {

                if (lang === "es" && date < SPANISH_AVAILABLE_FROM) {
                    continue;
                }

                existing++;

            }

        }

    }

    return {
        total: pages.length,
        existing
    };

}


// =========================
// ESTADÍSTICAS AGREGADAS
// =========================

function generateContentSummary(postStats) {

    if (!postStats.length) {

        return {
            totalWords: 0,
            totalNormalWords: 0,
            totalDetailsWords: 0,
            averageWords: 0,
            wordsByLanguage: {},
            totalReadingMinutes: 0,
            totalReadingMinutesMin: 0,
            totalReadingMinutesMax: 0
        };

    }

    const totalWords = postStats.reduce(
        (sum, post) => sum + post.words,
        0
    );

    const totalNormalWords = postStats.reduce(
        (sum, post) => sum + post.normalWords,
        0
    );

    const totalDetailsWords = postStats.reduce(
        (sum, post) => sum + post.detailsWords,
        0
    );

    const totalReadingMinutesMin = postStats.reduce(
        (sum, post) => sum + post.readingMinutesMin,
        0
    );

    const totalReadingMinutesMax = postStats.reduce(
        (sum, post) => sum + post.readingMinutesMax,
        0
    );

    const wordsByLanguage = {};

    for (const post of postStats) {

        wordsByLanguage[post.lang] =
            (wordsByLanguage[post.lang] || 0) +
            post.words;

    }

    return {

        totalWords,

        totalNormalWords,

        totalDetailsWords,

        averageWords:
            totalWords / postStats.length,

        wordsByLanguage,

        totalReadingMinutes:
            totalReadingMinutesMax,

        totalReadingMinutesMin,

        totalReadingMinutesMax

    };

}


// =========================
// CONSTRUCCIÓN DE SNAPSHOTS
// =========================

async function buildSnapshot(date, posts, pages, languages, postStatsCache) {

    const eligiblePosts = [];
    const snapshotPosts = [];

    // Incorporar cada entrada cuando haya aparecido
    // al menos una de sus versiones lingüísticas.
    for (const post of posts) {

        const availableLanguages =
            getAvailablePostLanguages(post, date, languages);

        if (!availableLanguages.length) {
            continue;
        }

        eligiblePosts.push(post);

        for (const lang of availableLanguages) {

            const cacheKey = `${post.number}-${lang}`;

            if (!postStatsCache.has(cacheKey)) {
                const stats = await readPostStats(post, lang);
                postStatsCache.set(cacheKey, stats);
            }

            snapshotPosts.push(postStatsCache.get(cacheKey));
        }
    }

    // Calcular las versiones que deberían existir
    // según sus fechas de aparición.
    let expectedPostVersions = 0;
    const expectedPostLanguages = new Set();

    for (const post of eligiblePosts) {

        if (post.date <= date) {
            expectedPostVersions++;
            expectedPostLanguages.add("eo");
        }

        const spanishDate =
            SPANISH_PUBLICATION_DATES[post.number] ||
            SPANISH_AVAILABLE_FROM;

        if (spanishDate <= date) {
            expectedPostVersions++;
            expectedPostLanguages.add("es");
        }
    }

    const postLanguages =
        languages.filter(lang => expectedPostLanguages.has(lang));

    // Las páginas siguen su propia cronología.
    const pageLanguages =
        date >= SPANISH_AVAILABLE_FROM
            ? languages
            : languages.filter(lang => lang !== "es");

    const pageStats =
        getAvailablePages(pages, date, pageLanguages);

    const totalPosts = eligiblePosts.length;
    const totalPostVersions = snapshotPosts.length;
    const totalPages = pageStats.total;

    const expectedPageVersions =
        totalPages * pageLanguages.length;

    // Identificar los eventos editoriales de esta fecha.
    const events = [];

    for (const post of posts) {

        // Publicación original en Esperanto.
        if (
            post.file?.eo &&
            post.date === date &&
            languages.includes("eo")
        ) {
            const stats = postStatsCache.get(`${post.number}-eo`);

            events.push({
                date,
                type: "publication",
                number: post.number,
                lang: "eo",
                title: post.title?.eo,
                ...stats
            });
        }

        // Aparición de la versión española.
        const spanishDate =
            SPANISH_PUBLICATION_DATES[post.number] ||
            SPANISH_AVAILABLE_FROM;

        if (
            post.file?.es &&
            spanishDate === date &&
            languages.includes("es")
        ) {
            const stats = postStatsCache.get(`${post.number}-es`);

            events.push({
                date,
                type: "translation",
                number: post.number,
                lang: "es",
                title: post.title?.es,
                ...stats
            });
        }
    }

    // Incorporar los hitos del sitio.
    for (const milestone of MILESTONES) {

        if (milestone.date === date) {
            events.push({
                ...milestone
            });
        }
    }

    const content =
        generateContentSummary(snapshotPosts);

    const longest = snapshotPosts.length
        ? snapshotPosts.reduce((max, post) =>
            post.words > max.words ? post : max)
        : null;

    const shortest = snapshotPosts.length
        ? snapshotPosts.reduce((min, post) =>
            post.words < min.words ? post : min)
        : null;

    return {

        date: `${date}T12:00:00.000Z`,
        estimatedRetrospective: true,

        site: {
            totalPosts,
            totalPostVersions,
            totalPages
        },

        translations: {

            posts: {
                total: totalPosts,
                languages: postLanguages,
                expected: expectedPostVersions,
                existing: totalPostVersions,
                incomplete: expectedPostVersions - totalPostVersions,
                coverage: expectedPostVersions
                    ? totalPostVersions / expectedPostVersions
                    : 0
            },

            pages: {
                total: totalPages,
                languages: pageLanguages,
                expected: expectedPageVersions,
                existing: pageStats.existing,
                incomplete: expectedPageVersions - pageStats.existing,
                coverage: expectedPageVersions
                    ? pageStats.existing / expectedPageVersions
                    : 0
            }
        },

        content,
        longest,
        shortest,
        posts: snapshotPosts,
        events
    };
}

// =========================
// RECONSTRUCCIÓN
// =========================

async function main() {

    console.log("\nReconstruyendo historial editorial...\n");

    const posts = await readJSON(POSTS_JSON_PATH);
    const pages = await readJSON(PAGES_JSON_PATH);
    const translations = await readJSON(TRANSLATIONS_JSON_PATH);

    const languages = Object.keys(translations);

    // Reunir fechas de publicación y acontecimientos.
    const dates = new Set([
        ...posts.map(post => post.date),
        ...Object.values(SPANISH_PUBLICATION_DATES),
        ...MILESTONES.map(event => event.date)
    ]);

    const sortedDates = [...dates].sort();

    const postStatsCache = new Map();

    const history = [];

    for (const date of sortedDates) {

        const snapshot = await buildSnapshot(
            date,
            posts,
            pages,
            languages,
            postStatsCache
        );

        history.push(snapshot);

        console.log(
            `${date} | ` +
            `${snapshot.site.totalPosts} entradas | ` +
            `${snapshot.site.totalPostVersions} versiones | ` +
            `${snapshot.content.totalWords.toLocaleString("es-CL")} palabras`
        );

    }

    // Guardar una vista previa sin modificar history.json.
    await fs.mkdir(
        STATS_DIR,
        { recursive: true }
    );

    const previewPath = path.join(
        STATS_DIR,
        "history-preview.json"
    );

    await fs.writeFile(
        previewPath,
        JSON.stringify(history, null, 2),
        "utf8"
    );

    console.log("\n==============================");
    console.log("✔ Reconstrucción terminada");
    console.log(`✔ Snapshots: ${history.length}`);
    console.log(`✔ Vista previa: ${previewPath}`);
    console.log("ℹ history.json no fue modificado.");
    console.log("==============================\n");

}


main().catch(error => {

    console.error(
        "\nError reconstruyendo el historial:",
        error
    );

    process.exitCode = 1;

});