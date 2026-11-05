
import { sendPushNotification } from "@mmmike/web-push/send";

const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });

function cors(request, env) {
  const origin = request.headers.get("Origin");

  const allowedOrigins = [
    env.ALLOWED_ORIGIN,
    "http://localhost:5500"
  ];

  return allowedOrigins.includes(origin)
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }
    : {};
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");

  return (
    origin === env.ALLOWED_ORIGIN ||
    origin === "http://localhost:5500"
  );
}

function validSubscription(subscription) {
  return Boolean(
    subscription &&
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.startsWith("https://") &&
    subscription.keys &&
    typeof subscription.keys.p256dh === "string" &&
    typeof subscription.keys.auth === "string"
  );
}

function supportedLanguages(env) {
  return (env.SUPPORTED_LANGUAGES || "eo,es")
    .split(",")
    .map(language => language.trim())
    .filter(Boolean);
}

function validLanguages(languages, env) {
  const supported = supportedLanguages(env);

  return (
    Array.isArray(languages) &&
    languages.length > 0 &&
    languages.every(language => supported.includes(language)) &&
    new Set(languages).size === languages.length
  );
}


async function saveSubscription(request, env, headers) {
  if (!allowedOrigin(request, env)) {
    return json({ error: "origin_not_allowed" }, 403, headers);
  }

  const data = await request.json().catch(() => null);

  // push.js envía estos campos al mismo nivel:
  // endpoint, keys, notificationLanguage y articleLanguages.
  if (!validSubscription(data)) {
    return json({ error: "invalid_subscription" }, 400, headers);
  }

  const notificationLanguage = data.notificationLanguage;
  const articleLanguages = data.articleLanguages;

  if (
    !supportedLanguages(env).includes(notificationLanguage) ||
    !validLanguages(articleLanguages, env)
  ) {
    return json({ error: "invalid_preferences" }, 400, headers);
  }

  await env.DB.prepare(`
    INSERT INTO subscriptions
      (endpoint, p256dh, auth, notification_language, article_languages)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      notification_language = excluded.notification_language,
      article_languages = excluded.article_languages
  `).bind(
    data.endpoint,
    data.keys.p256dh,
    data.keys.auth,
    notificationLanguage,
    JSON.stringify(articleLanguages)
  ).run();

  return json({ ok: true }, 200, headers);
}

async function getSubscriptionPreferences(request, env, headers) {
  if (!allowedOrigin(request, env)) {
    return json({ error: "origin_not_allowed" }, 403, headers);
  }

  const data = await request.json().catch(() => null);

  if (!data || typeof data.endpoint !== "string") {
    return json({ error: "invalid_subscription" }, 400, headers);
  }

  const result = await env.DB.prepare(`
    SELECT notification_language, article_languages
    FROM subscriptions
    WHERE endpoint = ?
  `).bind(data.endpoint).first();

  if (!result) {
    return json({ found: false }, 200, headers);
  }

  let articleLanguages;

  try {
    articleLanguages = JSON.parse(result.article_languages);
  } catch {
    return json({ error: "invalid_stored_preferences" }, 500, headers);
  }

  if (
    !validLanguages(articleLanguages, env) ||
    !supportedLanguages(env).includes(result.notification_language)
  ) {
    return json({ error: "invalid_stored_preferences" }, 500, headers);
  }

  return json({
    found: true,
    notificationLanguage: result.notification_language,
    articleLanguages
  }, 200, headers);
}

async function deleteSubscription(request, env, headers) {
  if (!allowedOrigin(request, env)) {
    return json({ error: "origin_not_allowed" }, 403, headers);
  }

  const data = await request.json().catch(() => null);
  const subscription = data?.subscription ?? data;

  if (!validSubscription(subscription)) {
    return json({ error: "invalid_subscription" }, 400, headers);
  }

  await env.DB.prepare(
    "DELETE FROM subscriptions WHERE endpoint = ?"
  ).bind(subscription.endpoint).run();

  return json({ ok: true }, 200, headers);
}

function authorized(request, env) {
  const secret = env.PUSH_SEND_SECRET;
  return Boolean(
    secret &&
    request.headers.get("Authorization") === `Bearer ${secret}`
  );
}

async function sendNotifications(request, env) {
  if (!authorized(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  const payload = await request.json().catch(() => null);

  const testMode = payload?.test === true;
  const testEndpoint = payload?.testEndpoint;

  /*
   * Expected payload:
   * {
   *   "events": [
   *     {
   *       "number": "021",
   *       "type": "new_post",
   *       "articleLanguages": ["eo", "es"],
   *       "notifications": {
   *         "eo": { "title": "...", "body": "...", "url": "..." },
   *         "es": { "title": "...", "body": "...", "url": "..." }
   *       }
   *     }
   *   ]
   * }
   */

  if (
    !payload ||
    !Array.isArray(payload.events) ||
    payload.events.length === 0
  ) {
    return json({ error: "invalid_payload" }, 400);
  }

  // El modo de prueba debe contener exactamente un evento
  // y una suscripción de destino.
  if (
    payload.test !== undefined &&
    typeof payload.test !== "boolean"
  ) {
    return json({ error: "invalid_test_mode" }, 400);
  }
  
  if (
    testMode &&
    (
      typeof testEndpoint !== "string" ||
      !testEndpoint.startsWith("https://") ||
      payload.events.length !== 1 ||
      payload.events[0]?.number !== "TEST"
    )
  ) {
    return json({ error: "invalid_test_payload" }, 400);
  }

  // No permitir especificar un endpoint sin activar
  // explícitamente el modo de prueba.
  if (!testMode && payload.testEndpoint !== undefined) {
    return json({ error: "invalid_test_mode" }, 400);
  }

  const supported = supportedLanguages(env);

  // Validar todos los eventos antes de procesarlos.
  for (const event of payload.events) {
    if (
      !event ||
      !["new_post", "new_translation"].includes(event.type) ||
      !validLanguages(event.articleLanguages, env) ||
      !event.notifications ||
      typeof event.notifications !== "object" ||
      Array.isArray(event.notifications)
    ) {
      return json({ error: "invalid_event" }, 400);
    }

    for (const [language, notification] of Object.entries(
      event.notifications
    )) {
      if (
        !supported.includes(language) ||
        !notification ||
        typeof notification.title !== "string" ||
        typeof notification.body !== "string" ||
        typeof notification.url !== "string"
      ) {
        return json({ error: "invalid_notification" }, 400);
      }

      try {
        const target = new URL(notification.url);

        if (
          target.origin !== env.ALLOWED_ORIGIN ||
          !["http:", "https:"].includes(target.protocol)
        ) {
          return json({ error: "invalid_notification_url" }, 400);
        }
      } catch {
        return json({ error: "invalid_notification_url" }, 400);
      }
    }
  }

  const query = testMode
    ? env.DB.prepare(`
        SELECT endpoint, p256dh, auth,
               notification_language, article_languages
        FROM subscriptions
        WHERE endpoint = ?
      `).bind(testEndpoint)
    : env.DB.prepare(`
        SELECT endpoint, p256dh, auth,
               notification_language, article_languages
        FROM subscriptions
      `);

  const { results } = await query.all();

  if (testMode && (!results || results.length !== 1)) {
    return json({ error: "test_subscription_not_found" }, 404);
  }

  let delivered = 0;
  let simulated = 0;
  let skipped = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all((results ?? []).map(async row => {
    let preferredLanguages;

    try {
      preferredLanguages = JSON.parse(row.article_languages);
    } catch {
      skipped += payload.events.length;
      return;
    }

    const notificationLanguage = row.notification_language;

    if (
      !validLanguages(preferredLanguages, env) ||
      !supported.includes(notificationLanguage)
    ) {
      skipped += payload.events.length;
      return;
    }

    // Procesar cada evento para este suscriptor.
    for (const event of payload.events) {
      const matchingLanguages = event.articleLanguages.filter(
        language => preferredLanguages.includes(language)
      );

      if (matchingLanguages.length === 0) {
        skipped++;
        continue;
      }

      const notification =
        event.notifications[notificationLanguage];

      // Este evento no tiene traducción del mensaje
      // en el idioma preferido del suscriptor.
      if (!notification) {
        skipped++;
        continue;
      }

      if (env.DRY_RUN === "true" && !testMode) {
        simulated++;

        console.log(
          `DRY RUN: event ${event.number}, notification language "${notificationLanguage}" would be sent.`
        );

        continue;
      }

      try {
        const result = await sendPushNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          {
            ...notification,
            tag: `lastaj-neuronoj-${event.number}`
          },
          {
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
            subject: env.VAPID_SUBJECT
          }
        );

        if (result) {
          delivered++;
        } else {
          await env.DB.prepare(
            "DELETE FROM subscriptions WHERE endpoint = ?"
          ).bind(row.endpoint).run();

          removed++;

          // No seguir intentando enviar a esta suscripción.
          break;
        }
      } catch (error) {
        failed++;
        console.error("Push delivery failed:", String(error));
      }
    }
  }));

  return json({
    ok: true,
    events: payload.events.length,
    delivered,
    simulated,
    skipped,
    removed,
    failed
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);

    

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true });
    }

    if (
      url.pathname === "/subscriptions" &&
      request.method === "POST"
    ) {
      return saveSubscription(request, env, headers);
    }

    if (
      url.pathname === "/subscriptions/preferences" &&
      request.method === "POST"
    ) {
      return getSubscriptionPreferences(request, env, headers);
    }

    if (
      (url.pathname === "/subscriptions/delete" &&
        request.method === "POST") ||
      (url.pathname === "/subscriptions" &&
        request.method === "DELETE")
    ) {
      return deleteSubscription(request, env, headers);
    }

    if (
      url.pathname === "/notifications" &&
      request.method === "POST"
    ) {
      return sendNotifications(request, env);
    }

    return json({ error: "not_found" }, 404, headers);
  }
};
