const fs = require("fs/promises");

const {
	generateStatistics,
	collectPostStats
} = require("./stats");


const POSTS_JSON_PATH = "./posts.json";
const PAGES_JSON_PATH = "./pages.json";


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


	const report =
		generateStatistics(
			posts,
			pages,
			postStats
		);


	// Mostrar en consola

	console.log(report);


	// Guardar archivo

	await fs.writeFile(
		"stats-report.txt",
		report,
		"utf8"
	);


	console.log(
		"\n✔ Informe generado: stats-report.txt"
	);
}


main()
	.catch(error => {
		console.error(
			"Error generando estadísticas:",
			error
		);
	});