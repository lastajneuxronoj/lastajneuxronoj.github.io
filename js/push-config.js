/*
 * Public configuration for browser push.
 *
 * Replace both values after deploying push-worker. VAPID_PUBLIC_KEY is public;
 * never place VAPID_PRIVATE_KEY or NOTIFY_TOKEN in this file.
 */
window.PUSH_CONFIG = {
  apiUrl: "https://lastaj-neuronoj-push.lastajneuxronoj.workers.dev",
  vapidPublicKey: "BNf8i-Koim90JFc5qQ5GfhwzmlInSs05fhBugozwr7kmIjxlAjir0xLaz2NO4gzCOkkqObBJv3R81r1SdqXiLgI"
};
