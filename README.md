# UFQ – United For Quality website

Bilingual (Arabic / English) company website for **UFQ**, with an **admin page** for uploading
certificates and videos. Everything runs in one Docker container.

- **Public site:** Home (logo + company name) · Our Services · Certificates · Videos · About Us · Contact
  - Arabic is the default (right-to-left). The **EN / عربي** button switches language and the choice is remembered.
  - Link straight to a language with `?lang=en` or `?lang=ar`.
  - The **Videos** section and the **Our certificates** gallery only appear once you add something from the admin page.
- **Admin page:** `/admin/`, protected by a password
  - **Site content:** edit every section of the site in Arabic and English, with no code:
    logo & company name, menu, home banner, services (add / remove / reorder services and their points),
    certificate badges, videos section, about us & "why choose us", contact details (phone, WhatsApp,
    email, Facebook / Instagram / LinkedIn, address) and the footer. Press **Save changes** and the site
    updates immediately. **Restore defaults** brings back the original texts.
  - **Certificates:** upload an image (JPG, PNG, WebP) or a PDF, with an Arabic and an English title.
  - **Videos:** upload a video file (MP4, WebM, MOV) **or** paste a YouTube link.
  - Edit titles or delete certificates/videos at any time.

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

## Editing the site

All texts, the logo and contact details are edited from **/admin/ → Site content**. They are saved in the
`ufq-data` volume (`content.json`) together with the uploads, so the backup above covers them too.
If an English text is left empty, the Arabic one is shown instead (and the other way round).

For a developer:

| What | Where |
|---|---|
| Default texts, and which fields the admin page shows | `server/content-schema.js` |
| Page layout (HTML) | `server/render.js` |
| Colours, fonts, styling | `public/assets/css/style.css` (colours at the top in `:root`) |
| Browser-tab icon | `public/assets/img/favicon.png` |

To add a new editable field: add it to `SCHEMA` and `DEFAULTS` in `content-schema.js`, then use it in
`render.js`. The admin form picks it up automatically. Rebuild afterwards: `docker compose up -d --build`.

## Running on Windows

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (keep "Use WSL 2" ticked) and
[Git](https://git-scm.com/download/win), start Docker Desktop, then in PowerShell:

```powershell
git clone https://github.com/Mahmoudkamal448/ufq.git
cd ufq
copy .env.example .env
notepad .env                  # set ADMIN_PASSWORD, save, close
docker compose up -d --build
```

Without Docker (Node.js 20+), in PowerShell:

```powershell
npm install
$env:ADMIN_PASSWORD="MyStrongPass123"; $env:DATA_DIR=".\data"; $env:PORT="8080"
npm start
```

## Running without Docker (for development)

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000 – admin password is "admin1234", uploads go to ./data
```

## Project layout

```
server/server.js          web server + admin API (Express)
server/content-schema.js  editable fields + default texts
server/content.js         saves/validates the site content
server/render.js          builds the home page from the content
public/                   CSS, JS, images
public/admin/             the admin page
Dockerfile                container image
docker-compose.yml        one-command start, with the ufq-data volume
.env.example              settings template
```
