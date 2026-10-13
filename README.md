# UFQ – United For Quality website

Bilingual (Arabic / English) company website for **UFQ**, with an **admin page** for uploading
certificates and videos. Everything runs in one Docker container.

- **Public site:** Home (logo + company name) · Our Services · Certificates · Videos · About Us · Contact
  - Arabic is the default (right-to-left). The **EN / عربي** button switches language and the choice is remembered.
  - Link straight to a language with `?lang=en` or `?lang=ar`.
  - The **Videos** section and the **Our certificates** gallery only appear once you add something from the admin page.
- **Admin page:** `/admin/`, protected by a password
  - **Certificates:** upload an image (JPG, PNG, WebP) or a PDF, with an Arabic and an English title.
  - **Videos:** upload a video file (MP4, WebM, MOV) **or** paste a YouTube link.
  - Edit titles or delete items at any time. Changes show on the site immediately.

## Run it with Docker

Needs only Docker.

```bash
cp .env.example .env        # then open .env and set ADMIN_PASSWORD
docker compose up -d --build
```

- Site: <http://localhost:8080>
- Admin: <http://localhost:8080/admin/>

Port 8080 already in use? Change `WEB_PORT` in `.env` (e.g. `WEB_PORT=8090`) and run the command again.

Stop it with `docker compose down`. (Your uploads are kept; see below.)

### Settings (`.env`)

| Setting | What it does | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Password for `/admin/`. **Required**, at least 8 characters. Changing it logs everyone out. | – |
| `WEB_PORT` | Port on the machine where the site is published | `8080` |
| `MAX_UPLOAD_MB` | Largest upload allowed, in MB | `500` |
| `SESSION_HOURS` | How long an admin stays logged in | `12` |

## Where uploads are stored – and backups

Uploaded files and the list of certificates/videos are stored in the Docker volume **`ufq-data`**
(mounted at `/data` in the container). They survive restarts, rebuilds and updates.
`docker compose down -v` **deletes** them, so don't use `-v` unless you mean it.

Back up:

```bash
docker run --rm -v ufq-website_ufq-data:/data -v "$PWD":/backup alpine tar czf /backup/ufq-data.tgz -C /data .
```

Restore (e.g. on a new server, before starting the site):

```bash
docker volume create ufq-website_ufq-data
docker run --rm -v ufq-website_ufq-data:/data -v "$PWD":/backup alpine tar xzf /backup/ufq-data.tgz -C /data
```

> Tip: big video files make backups and servers heavy. For long videos, uploading to YouTube and
> pasting the link in the admin page is usually better.

## Moving it to other servers

**Option A – copy the project:** clone this repo on the server, create `.env`, run `docker compose up -d --build`.

**Option B – ship the image as a file (no source code needed on the server):**

```bash
docker build -t ufq-website:latest .
docker save ufq-website:latest -o ufq-website.tar
# copy ufq-website.tar to the server, then on the server:
docker load -i ufq-website.tar
docker run -d --name ufq-website --restart unless-stopped \
  -p 80:3000 -e ADMIN_PASSWORD='your-strong-password' \
  -v ufq-data:/data ufq-website:latest
```

**Option C – a registry (Docker Hub, GHCR…):** `docker tag` + `docker push` the image, then
`docker run` it on each server as in option B.

To carry existing uploads to the new server, use the backup/restore commands above.

### HTTPS

When the site is public, put it behind HTTPS (for example Caddy, Nginx Proxy Manager or Cloudflare)
so the admin password isn't sent in plain text. The app already works behind a reverse proxy.

## Editing the site text

| What | Where |
|---|---|
| Arabic text | `public/index.html` (the text inside each element) |
| English text | `public/assets/js/i18n.js` (same keys as the `data-i18n` attributes in `index.html`) |
| Colours, fonts, layout | `public/assets/css/style.css` (colours at the top in `:root`) |
| Logo | `public/assets/img/logo.png` and the browser-tab icon `favicon.png` |
| Phone / WhatsApp | search for `27687519` in `index.html` |

When you add new text, give it a `data-i18n="some.key"` attribute in `index.html` and add the English
for `some.key` in `i18n.js`. Rebuild afterwards: `docker compose up -d --build`.

## Running without Docker (for development)

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000 – admin password is "admin1234", uploads go to ./data
```

## Project layout

```
server/server.js     web server + admin API (Express)
public/              the website (HTML, CSS, JS, images)
public/admin/        the admin page
Dockerfile           container image
docker-compose.yml   one-command start, with the ufq-data volume
.env.example         settings template
```
