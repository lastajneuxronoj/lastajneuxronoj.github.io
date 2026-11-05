
import readline from "node:readline";
import { stdin, stdout } from "node:process";

const API_URL =
  "https://lastaj-neuronoj-push.lastajneuxronoj.workers.dev/notifications";

const DEFAULT_URL = "https://lastajneuxronoj.github.io/";

let rl = createReadline();

function createReadline() {
  return readline.createInterface({
    input: stdin,
    output: stdout
  });
}

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

// Solicita el secreto sin mostrarlo en pantalla.
function askSecret(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error(
        "Este script debe ejecutarse desde una terminal interactiva."
      ));
      return;
    }

    stdout.write(question);

    let secret = "";

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    function onData(key) {
      for (const char of Array.from(key.toString("utf8"))) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Operación cancelada."));
          return;
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(secret);
          return;
        }

        if (char === "\u007f" || char === "\b") {
          if (secret.length > 0) {
            secret = Array.from(secret).slice(0, -1).join("");
            stdout.write("\b \b");
          }

          continue;
        }

        if (char.charCodeAt(0) < 32) {
          continue;
        }

        secret += char;
        stdout.write("*");
      }
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  try {
    console.log("\n=== Lastaj Neŭronoj · Push test ===\n");

    console.log("Selecciona el idioma de la notificación:");
    console.log("1. Esperanto (eo)");
    console.log("2. Español (es)");

    const languageChoice = await ask("\nIdioma [1]: ") || "1";

    const languages = {
      "1": "eo",
      "2": "es"
    };

    const language = languages[languageChoice];

    if (!language) {
      throw new Error("Selección de idioma no válida.");
    }

    console.log(
      "\nEl idioma seleccionado debe coincidir con el configurado"
    );
    console.log("en la suscripción destinataria.");

    const endpoint = await ask("\nEndpoint de la suscripción: ");

    if (!endpoint.startsWith("https://")) {
      throw new Error("El endpoint debe comenzar con https://.");
    }

    // Cerramos readline para permitir la entrada oculta.
    rl.close();

    const secret = await askSecret("\nClave PUSH_SEND_SECRET: ");

    if (!secret.trim()) {
      throw new Error("La clave no puede estar vacía.");
    }

    // Creamos una nueva interfaz para continuar.
    rl = createReadline();

    const title = await ask("\nTítulo: ");
    const body = await ask("Mensaje: ");

    if (!title || !body) {
      throw new Error("El título y el mensaje son obligatorios.");
    }

    const payload = {
      test: true,
      testEndpoint: endpoint,
      events: [
        {
          number: "TEST",
          type: "new_post",
          articleLanguages: ["eo", "es"],
          notifications: {
            [language]: {
              title,
              body,
              url: DEFAULT_URL
            }
          }
        }
      ]
    };

    console.log("\nEnviando notificación de prueba...");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Respuesta no válida del Worker (HTTP ${response.status}).`
      );
    }

    console.log("\nRespuesta del servidor:");
    console.log(JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(
        result.error || `HTTP ${response.status}`
      );
    }

    if (result.delivered > 0) {
      console.log("\n¡Notificación enviada correctamente!");
    } else {
      console.log(
        "\nEl Worker no confirmó ninguna entrega."
      );
    }
  } finally {
    rl.close();
  }
}

main().catch(error => {
  console.error("\nError:", error.message);
  process.exitCode = 1;
});
