const fs = require("fs/promises");
const path = require("path");
const RSS = require("rss");

const {
	SITE_URL,
	POSTS_JSON_PATH,
	TRANSLATIONS_JSON_PATH,
	OUTPUT_DIR
} = require("./config");

const findCoverImage = require("./utils/find-cover-image");

async function buildRSS(language = "es") {

	const posts = JSON.parse(
		await fs.readFile(
			POSTS_JSON_PATH,
			"utf8"
		)
	);

	const translations = JSON.parse(
		await fs.readFile(
			TRANSLATIONS_JSON_PATH,
			"utf8"
		)
	);

	const siteUrl =
		SITE_URL.replace(/\/$/, "");

	const feed = new RSS({

		title:
			`Lastaj Neŭronoj`,

		description:
			language === "eo"
				? "Blogo pri sciencdisvastigo, lingvoj, tradukoj kaj personaj tekstoj."
				: "Blog sobre divulgación científica,  idiomas, traducciones y textos personales",

		site_url:
			siteUrl,

		feed_url:
			`${siteUrl}/blog/rss-${language}.xml`,

		language,

		image_url:
			`${siteUrl}/images/logo.png`,

		managingEditor:
			"Tomás",

		webMaster:
			"Tomás",

		copyright:
			"Lastaj Neŭronoj",

		generator:
			"Lastaj Neŭronoj Static Generator",

		ttl:
			60,

		pubDate:
			new Date()

	});

	const sortedPosts = [...posts]
		.filter(
			post =>
				post.title?.[language]
		)
		.sort(
			(a, b) =>
				new Date(b.date) -
				new Date(a.date)
		);

	for (const post of sortedPosts) {

		const fileName =
			post.file?.[language];

		if (!fileName)
			continue;

		const htmlFile =
    		path.basename(fileName)
    		    .replace(/_/g, "-")
    		    .replace(/\.md$/i, ".html");

		const postUrl =
			`${siteUrl}/blog/${htmlFile}`;

		const coverImage =
			await findCoverImage(post.number);

		const imageUrl =
			coverImage
				? `${siteUrl}/${coverImage}`
				: null;

		const excerpt =
			post.excerpt?.[language] ?? "";

		const description = imageUrl
			? `
				<img
					src="${imageUrl}"
					alt=""
					style="max-width:100%;height:auto;">
				<p>${excerpt}</p>
			  `
			: excerpt;

		let imageType = "image/png";

		if (imageUrl) {
		
			const ext =
				coverImage
					? path.extname(coverImage).toLowerCase()
					: "";

			if (ext === ".jpg" || ext === ".jpeg") {
				imageType = "image/jpeg";
			}
		
			else if (ext === ".webp") {
				imageType = "image/webp";
			}
		
			else if (ext === ".svg") {
				imageType = "image/svg+xml";
			}
		
		}

		feed.item({
		
			title:
				post.title[language],
		
			description,
		
			url:
				postUrl,
		
			guid:
				postUrl,
		
			date:
				post.date,
		
			categories:
				post.category
					? [
						translations[language]
							?.ui
							?.categories
							?.names?.[post.category]
						|| post.category
					]
					: [],
				
			author:
				post.author?.[language] ?? "",
				
		enclosure:
			imageUrl
				? {
					url: imageUrl,
					type: imageType
				}
				: undefined

				});

	}

	const rssXml =
		feed.xml({
			indent: true
		});

	await fs.writeFile(
		path.join(
			OUTPUT_DIR,
			`rss-${language}.xml`
		),
		rssXml,
		"utf8"
	);

	console.log(
		`✔ RSS generado: rss-${language}.xml`
	);

}

module.exports = buildRSS;