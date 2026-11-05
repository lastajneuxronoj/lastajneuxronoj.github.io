# # Lastaj Neŭronoj

Generador estático personalizado para el blog multilingüe **Lastaj Neŭronoj**.

El proyecto transforma archivos Markdown en un sitio web HTML completo, incorporando traducciones, referencias, fórmulas matemáticas, resaltado de código, categorías, búsqueda, RSS y estadísticas editoriales.

## Estructura

* `posts/` → archivos Markdown de los artículos.
* `blog/` → sitio HTML generado.
* `scripts/` → scripts del generador y herramientas auxiliares.
* `data/` → datos estructurados del proyecto (posts, traducciones, categorías, etc.).
* `stats/` → estadísticas editoriales e historial de actividad.
* `data/wordpress/` → datos históricos importados desde la versión anterior del blog.
* `analytics/` → análisis de datos y futuros dashboards en R/Shiny.

## Generación del sitio

El flujo principal procesa los archivos Markdown y genera automáticamente:

* páginas de artículos.
* páginas multilingües.
* índices y categorías.
* buscador.
* feeds RSS.
* sitemap.
* estadísticas editoriales.

## Scripts principales

* `build-posts.js` → genera las páginas del blog a partir de los artículos Markdown.
* `build-sitemap.js` → genera el sitemap del sitio.
* `build-stats.js` → calcula estadísticas editoriales e historial.
* `fetch-goatcounter.js` → importa estadísticas de tráfico.

Comandos disponibles:

```bash
npm run build
npm run sitemap
npm run stats
npm run fetch:goatcounter
```

## PWA y notificaciones push

El sitio se puede instalar como PWA mediante `manifest.webmanifest` y `sw.js`. El
service worker está en la raíz para controlar todo el sitio, conserva una caché
de los recursos visitados y muestra las notificaciones recibidas. El botón para
instalar aparece cuando el navegador ofrece la instalación; el de activar avisos
aparece en la cabecera sólo cuando el servicio se ha configurado. Nunca se
solicita permiso automáticamente.

GitHub Pages ofrece el HTTPS que requiere el navegador, pero no puede guardar
suscripciones ni enviar notificaciones. Por eso este repositorio incluye un
Worker de Cloudflare con KV en `push-worker/`: KV guarda las suscripciones y el
Worker las envía mediante Web Push/VAPID. La clave VAPID privada y el token de
envío no se publican ni se incorporan en el sitio.

### Configuración inicial

1. En `push-worker/`, instala las dependencias y genera una vez el par VAPID:

   ```bash
   npm install
   npm run keys
   ```

2. Crea el almacén KV y copia el identificador que devuelve Cloudflare en
   `push-worker/wrangler.toml`, sustituyendo `REPLACE_WITH_KV_NAMESPACE_ID`:

   ```bash
   npx wrangler kv namespace create SUBSCRIPTIONS
   ```

3. Configura los secretos del Worker. Usa el origen exacto, sin barra final, y
   un token largo aleatorio para los avisos:

   ```bash
   npx wrangler secret put ALLOWED_ORIGIN
   # https://lastajneuxronoj.github.io
   npx wrangler secret put VAPID_PUBLIC_KEY
   npx wrangler secret put VAPID_PRIVATE_KEY
   npx wrangler secret put VAPID_SUBJECT
   # mailto:tu-correo@ejemplo.org
   npx wrangler secret put NOTIFY_TOKEN
   npx wrangler deploy
   ```

4. Copia la URL publicada del Worker y la clave VAPID **pública** en
   `js/push-config.js`. No copies ahí la clave privada ni `NOTIFY_TOKEN`.

5. En los secretos del repositorio de GitHub, crea `PUSH_API_URL` (URL del
   Worker) y `PUSH_NOTIFY_TOKEN` (el mismo token de `NOTIFY_TOKEN`). El flujo
   `.github/workflows/notify-new-post.yml` compara `json/posts.json` con el
   commit anterior y avisa sólo de los números de entrada nuevos.

### Publicación y verificación

Tras añadir o editar una entrada, genera los archivos estáticos y publícalos
como se hace habitualmente:

```bash
npm run build
git add .
git commit -m "Publicar nueva entrada"
git push
```

El aviso se enviará al detectarse una entrada nueva en `json/posts.json`. Como
GitHub Pages y Actions se despliegan de forma independiente, puede haber un
breve intervalo antes de que el enlace de la notificación esté disponible.
Antes de activar los avisos para lectores, abre el sitio publicado, instálalo o
comprueba la pestaña *Application* del navegador, pulsa el botón de avisos y
prueba el endpoint `POST /notifications` con un único dispositivo suscrito.

Safari en iPhone/iPad admite Web Push para aplicaciones añadidas a la pantalla
de inicio (iOS/iPadOS 16.4 o posterior); no se puede garantizar push en Safari
sin instalar el sitio. Si se cambia el par VAPID, los visitantes tendrán que
suscribirse de nuevo.
