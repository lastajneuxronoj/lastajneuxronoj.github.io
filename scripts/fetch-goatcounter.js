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
const OUT_DIR = path.resolve(__dirname, "..", "data", "goatcounter");

const API = `https://${SITE_CODE}.goatcounter.com/api/v0`;
console.log("API:", API);

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

async function checkAuth() {
  const res = await fetch(`${API}/me`, {
    headers: authHeaders(),
  });

  console.log("Estado de autenticación:", res.status);

  if (!res.ok) {
    throw new Error(
      `Error de autenticación: ${res.status} ${await res.text()}`
    );
  }

  console.log("Autenticación correcta.");
}

// --- 1. Iniciar una nueva exportación ---
async function startExport() {
	const res = await fetch(`${API}/export`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({ format: "csv" }),
	});

	const responseText = await res.text();

	let data = null;

	try {
		data = JSON.parse(responseText);
	} catch {
		// La respuesta no contiene JSON válido.
	}

	if (res.status === 429) {
		const retryAfter = res.headers.get("Retry-After");

		throw new Error(
			`Límite de exportaciones de GoatCounter alcanzado. ${
				data?.error || responseText
			} ${
				retryAfter
					? `Tiempo indicado por el servidor: ${retryAfter}.`
					: ""
			}`
		);
	}

	if (res.status !== 202) {
		throw new Error(
			`Error al iniciar export: ${res.status} ${
				data?.error || responseText
			}`
		);
	}

	if (!data || data.id == null) {
		throw new Error(
			"GoatCounter aceptó la solicitud, pero no devolvió un ID válido."
		);
	}

	console.log(`Export iniciado, id: ${data.id}`);

	return data.id;
}

// --- 2. Esperar a que la exportación esté lista ---
async function waitForExport(id, { intervalMs = 5000, maxTries = 60 } = {}) {
	for (let i = 0; i < maxTries; i++) {
		const res = await fetch(`${API}/export/${id}`, {
			headers: authHeaders(),
		});

		if (!res.ok) {
			throw new Error(
				`Error consultando export: ${res.status} ${await res.text()}`
			);
		}

		const data = await res.json();

		if (data.error || data.errors) {
			throw new Error(
				`Error de GoatCounter: ${JSON.stringify(data.error || data.errors)}`
			);
		}

		if (data.finished_at) {
			console.log("Export listo.");
			console.log(`Filas exportadas: ${data.num_rows}`);
			console.log(`Tamaño: ${data.size} MB`);
			return data;
		}

		console.log(
			`Export aún generándose (${i + 1}/${maxTries}). Esperando...`
		);

		await new Promise((r) => setTimeout(r, intervalMs));
	}

	throw new Error(
		"Se agotó el tiempo de espera. La exportación podría seguir generándose."
	);
}

// --- 3. Descargar y descomprimir el CSV ---
async function downloadExport(id) {
	const res = await fetch(`${API}/export/${id}/download`, {
		headers: authHeaders(),
	});

	if (res.status === 202) {
		throw new Error(
			"La exportación todavía se está generando. Inténtalo nuevamente más tarde."
		);
	}

	if (!res.ok) {
		throw new Error(
			`Error al descargar export: ${res.status} ${await res.text()}`
		);
	}

	const gzBuffer = Buffer.from(await res.arrayBuffer());

	// Comprobar la firma del archivo GZIP
	if (gzBuffer.length < 2 || gzBuffer[0] !== 0x1f || gzBuffer[1] !== 0x8b) {
		throw new Error(
			"El archivo descargado no tiene una firma GZIP válida."
		);
	}

	let csvBuffer;

	try {
		csvBuffer = zlib.gunzipSync(gzBuffer);
	} catch (err) {
		throw new Error(`Error al descomprimir el CSV: ${err.message}`);
	}

	fs.mkdirSync(OUT_DIR, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filePath = path.join(OUT_DIR, `hits_${timestamp}.csv`);

	fs.writeFileSync(filePath, csvBuffer);

	console.log(`Guardado: ${filePath}`);
	console.log(`Tamaño: ${(csvBuffer.length / 1024).toFixed(2)} KB`);

	return filePath;
}

// --- Ejecución principal ---
async function main() {
  await checkAuth();

  const id = await startExport();
  await waitForExport(id);

  const filePath = await downloadExport(id);

  console.log("\n¡Exportación completada correctamente!");
  console.log(`Archivo: ${filePath}`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});