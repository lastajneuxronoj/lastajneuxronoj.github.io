const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = path.resolve("mermaid-inspect/package/dist");
const targetRoot = path.resolve("js/vendor/mermaid");

const files = [
    "mermaid.esm.min.mjs",
    "chunks/mermaid.esm.min/chunk-Y3FQM624.mjs",
    "chunks/mermaid.esm.min/chunk-KEUXMURM.mjs",
    "chunks/mermaid.esm.min/chunk-LIEV3EAG.mjs",
    "chunks/mermaid.esm.min/chunk-AQ6EADP3.mjs",
    "chunks/mermaid.esm.min/chunk-7FYTHRHK.mjs",
    "chunks/mermaid.esm.min/chunk-QU2NO3GS.mjs",
    "chunks/mermaid.esm.min/chunk-6C3L5S6U.mjs",
    "chunks/mermaid.esm.min/chunk-KTKOSTGQ.mjs",
    "chunks/mermaid.esm.min/chunk-5IMINLNL.mjs",
    "chunks/mermaid.esm.min/chunk-SXFNDEX5.mjs",
    "chunks/mermaid.esm.min/chunk-STADKHD7.mjs",
    "chunks/mermaid.esm.min/chunk-ENMKPL7Y.mjs",
    "chunks/mermaid.esm.min/chunk-STOV2HOB.mjs",
    "chunks/mermaid.esm.min/chunk-SZQNAPRP.mjs",
    "chunks/mermaid.esm.min/chunk-MXWVPPQS.mjs",
    "chunks/mermaid.esm.min/chunk-5VCL7Z4A.mjs",
    "chunks/mermaid.esm.min/flowDiagram-ZACVJCCL.mjs",
    "chunks/mermaid.esm.min/chunk-LUNKGL7L.mjs",
    "chunks/mermaid.esm.min/chunk-AZZRMDJM.mjs",
    "chunks/mermaid.esm.min/chunk-VE5CLXGZ.mjs",
    "chunks/mermaid.esm.min/chunk-4S3VB3X6.mjs",
    "chunks/mermaid.esm.min/chunk-HCQLZPVX.mjs"
];

for (const file of files) {
    const source = path.join(sourceRoot, file);
    const target = path.join(targetRoot, file);

    if (!fs.existsSync(source)) {
        console.error(`No encontrado: ${file}`);
        continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);

    console.log(`Copiado: ${file}`);
}

console.log("\nCopia terminada.");