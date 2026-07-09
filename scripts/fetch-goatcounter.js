// scripts/fetch-goatcounter.js
//
// Descarga un export de visitas desde GoatCounter y lo guarda
// como CSV en data/goatcounter/, listo para procesar con R.
//
// Uso: npm run fetch:goatcounter

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const TOKEN = process.env.GOATCOUNTER_TOKEN;
const SITE_CODE = process.env.GOATCOUNTER_SITE_CODE;
const API = `https://${SITE_CODE}.goatcounter.com/api/v0`;
const OUT_DIR = path.resolve(__dirname, "..", "data", "goatcounter");

if (!TOKEN || !SITE_CODE) {
  console.error(
    "Faltan variables de entorno: GOATCOUNTER_TOKEN y/o GOATCOUNTER_SITE_CODE"
  );
  process.exit(1);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };
}

// --- 1. Iniciar una nueva exportación ---
async function startExport() {
  const res = await fetch(`${API}/export`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ format: "csv" }), // exporta todo el historial disponible
  });

  if (!res.ok) {
    throw new Error(`Error al iniciar export: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  console.log(`Export iniciado, id: ${data.id}`);
  return data.id;
}

// --- 2. Esperar a que la exportación esté lista ---
async function waitForExport(id, { intervalMs = 5000, maxTries = 60 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetch(`${API}/export/${id}`, {
      headers: authHeaders(),
    });

    if (res.status === 202) {
      console.log("Export aún generándose, esperando...");
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Error consultando export: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();

    if (data.finished_at) {
      console.log("Export listo.");
      return data;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Se agotó el tiempo de espera para el export.");
}

// --- 3. Descargar y descomprimir el CSV ---
async function downloadExport(id) {
  const res = await fetch(`${API}/export/${id}/download`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error al descargar export: ${res.status} ${await res.text()}`);
  }

  const gzBuffer = Buffer.from(await res.arrayBuffer());
  const csvBuffer = zlib.gunzipSync(gzBuffer);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(OUT_DIR, `hits_${timestamp}.csv`);

  fs.writeFileSync(filePath, csvBuffer);
  console.log(`Guardado: ${filePath}`);

  return filePath;
}

// --- Ejecución principal ---
async function main() {
  const id = await startExport();
  await waitForExport(id);
  await downloadExport(id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});