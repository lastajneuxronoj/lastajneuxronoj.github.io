
const assert = require("assert");
const { detectEvents } = require("./detect-post-events");

// Traducciones de prueba.
const translations = {
  es: {
    languageNames: {
      eo: "esperanto",
      es: "español",
      tok: "toki Pona"
    },
    ui: {
      push: {
        messages: {
          newPost: {
            title: "Nuevo artículo: {title}",
            body: "Ya está disponible en Lastaj Neŭronoj en {languages}."
          },
          newTranslation: {
            title: "Nueva traducción: {title}",
            body: "Ya puedes leer esta traducción en Lastaj Neŭronoj en {languages}."
          }
        }
      }
    }
  },
  eo: {
    languageNames: {
      eo: "Esperanto",
      es: "la hispana",
      tok: "toki Pona"
    },
    ui: {
      push: {
        messages: {
          newPost: {
            title: "Nova blogaĵo: {title}",
            body: "Ĝi nun disponeblas ĉe Lastaj Neŭronoj en {languages}."
          },
          newTranslation: {
            title: "Nova traduko: {title}",
            body: "Vi nun povas legi ĉi tiun tradukon ĉe Lastaj Neŭronoj en {languages}."
          }
        }
      }
    }
  }
};

// Estado anterior del blog.
const previousPosts = [
  {
    number: "016",
    title: {
      eo: "Artikolo 016"
    },
    file: {
      eo: "eo/016_eo.md"
    }
  },
  {
    number: "019",
    title: {
      eo: "Artikolo 019",
      es: "Artículo 019"
    },
    file: {
      eo: "eo/019_eo.md",
      es: "es/019_es.md"
    }
  }
];

// Estado actual del blog.
const currentPosts = [
  {
    number: "016",
    title: {
      eo: "Artikolo 016",
      es: "Artículo 016"
    },
    file: {
      eo: "eo/016_eo.md",
      es: "es/016_es.md"
    }
  },
  {
    number: "019",
    title: {
      eo: "Artikolo 019",
      es: "Artículo 019"
    },
    file: {
      eo: "eo/019_eo.md",
      es: "es/019_es.md"
    }
  },
  {
    number: "021",
    title: {
      eo: "Artikolo 021",
      es: "Artículo 021"
    },
    file: {
      eo: "eo/021_eo.md",
      es: "es/021_es.md"
    }
  }
];

// Ejecutar detector.
const events = detectEvents(
  previousPosts,
  currentPosts,
  translations
);

// Comprobar cantidad de eventos.
assert.strictEqual(events.length, 2);

// Buscar eventos.
const translation016 = events.find(
  event => event.number === "016"
);

const newPost021 = events.find(
  event => event.number === "021"
);

const post019 = events.find(
  event => event.number === "019"
);

// Comprobar nueva traducción.
assert(translation016);
assert.strictEqual(
  translation016.type,
  "new_translation"
);
assert.deepStrictEqual(
  translation016.articleLanguages,
  ["es"]
);

// Comprobar nueva entrada.
assert(newPost021);
assert.strictEqual(
  newPost021.type,
  "new_post"
);
assert.deepStrictEqual(
  newPost021.articleLanguages,
  ["eo", "es"]
);

// Comprobar que 019 no genera eventos.
assert.strictEqual(post019, undefined);

// Comprobar mensajes de notificación.
for (const event of events) {
  assert(event.notifications);

  for (const language of ["es", "eo"]) {
    const notification = event.notifications[language];

    assert(notification);
    assert(notification.title);
    assert(notification.body);

    assert(!notification.title.includes("{title}"));
    assert(!notification.body.includes("{languages}"));
  }
}

// Comprobar título de la nueva entrada.
assert.strictEqual(
  newPost021.notifications.es.title,
  "Nuevo artículo: Artículo 021"
);

assert.strictEqual(
  newPost021.notifications.eo.title,
  "Nova blogaĵo: Artikolo 021"
);

console.log("¡Todas las pruebas pasaron correctamente!\n");

console.log(JSON.stringify(events, null, 2));
