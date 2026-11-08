const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve("mermaid-inspect/package/dist");

const entries = [
    path.join(root, "mermaid.esm.min.mjs"),
    path.join(
        root,
        "chunks/mermaid.esm.min/flowDiagram-ZACVJCCL.mjs"
    )
];

const visited = new Set();

function inspect(file) {
    if (visited.has(file)) return;

    visited.add(file);

    const source = fs.readFileSync(file, "utf8");

    // Solo importaciones estáticas (no import())
    const imports = [
        ...source.matchAll(
            /(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g
        )
    ].map(match => match[1]);

    for (const dependency of imports) {
        if (!dependency.startsWith(".")) continue;

        const resolved = path.resolve(
            path.dirname(file),
            dependency
        );

        if (fs.existsSync(resolved)) {
            inspect(resolved);
        }
    }
}

for (const entry of entries) {
    inspect(entry);
}

let total = 0;

for (const file of visited) {
    total += fs.statSync(file).size;
}

console.log("Módulos:", visited.size);
console.log(
    "Tamaño:",
    (total / 1024).toFixed(2),
    "KB"
);

console.log("\nArchivos:");

for (const file of visited) {
    console.log(path.relative(root, file));
}