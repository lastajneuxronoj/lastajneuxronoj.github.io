#!/usr/bin/env node

const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const before = process.argv[2];
const apiUrl = process.env.PUSH_API_URL;
const notifyToken = process.env.PUSH_NOTIFY_TOKEN;

if (!before || !apiUrl || !notifyToken) {
  console.log(
    "Push no configurado o sin revisión anterior; no se enviarán notificaciones."
  );
  process.exit(0);
}

function hasPreviousCommit(revision) {
  try {
    execFileSync(
      "git",
      ["cat-file", "-e", `${revision}^{commit}`],
      { cwd: root, stdio: "ignore" }
    );

    return true;
  } catch {
    return false;
  }
}

function detectEvents(revision) {
  const detectorPath = path.join(
    root,
    "scripts",
    "detect-post-events.js"
  );

  const output = execFileSync(
    process.execPath,
    [detectorPath, revision],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  return JSON.parse(output);
}

async function notify(events) {
  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/notifications`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${notifyToken}`
      },
      body: JSON.stringify({ events })
    }
  );

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Worker respondió ${response.status}: ${responseBody}`
    );
  }

  console.log("Respuesta del Worker:", responseBody);
}

async function main() {
  if (!hasPreviousCommit(before)) {
    console.log(
      `No se puede encontrar el commit anterior ${before}; se omiten las notificaciones.`
    );
    return;
  }

  const events = detectEvents(before);

  if (!Array.isArray(events)) {
    throw new Error(
      "El detector no devolvió una lista válida de eventos."
    );
  }

  if (events.length === 0) {
    console.log(
      "No hay entradas nuevas ni traducciones nuevas; no se enviarán notificaciones."
    );
    return;
  }

  console.log(
    `Se detectaron ${events.length} evento(s):`
  );

  for (const event of events) {
    console.log(
      `- Entrada ${event.number}: ${event.type} (${event.articleLanguages.join(", ")})`
    );
  }

  await notify(events);

  console.log(
    "Eventos enviados correctamente al Worker."
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});