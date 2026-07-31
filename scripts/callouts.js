/**
 * Preprocesador de bloques callout para Markdown
 *
 * Sintaxis:
 *
 * :::note
 * Texto de la nota.
 * :::
 *
 * Tipos disponibles:
 * - note
 * - warning
 * - tip
 * - definition
 * - example
 */

/**
 * Preprocesador de bloques callout para Markdown
 *
 * Sintaxis:
 *
 * :::note
 * Texto
 * :::
 *
 * :::warning Título personalizado
 * Texto
 * :::
 */

function preprocessCallouts(md, translations) {

md = md.replace(
	/^:::tokipona\s*\n([\s\S]*?)\n:::/gm,
	(_, content) => {

		return `
<div class="sitelen-pona-block">

${content.trim()}

</div>
`;
	}
);

	const calloutTypes = [
		"note",
		"warning",
		"tip",
		"definition",
		"example",
		"media"
	];

	const calloutIcons = {
		note: "📝",
		warning: "⚠️",
		tip: "💡",
		definition: "📖",
		example: "🔎",
		media: "⏯️"
	};

	const regex = new RegExp(
		`^:::(${calloutTypes.join("|")})(?:[ \\t]+([^\\n]+))?[ \\t]*\\n([\\s\\S]*?)\\n:::`,
		"gm"
	);

	return md.replace(
		regex,
		(_, type, title, content) => {

			const calloutTitle =
				title?.trim() ||
				translations?.callouts?.[type] ||
				type;

			const icon = calloutIcons[type] || "";

			return `
<div class="callout callout-${type}">

<div class="callout-title">
	<span class="callout-icon">${icon}</span>
	<span class="callout-label">${calloutTitle}</span>
</div>

<div class="callout-content">

${content}

</div>

</div>
`;
		}
	);
}

module.exports = {
	preprocessCallouts
};