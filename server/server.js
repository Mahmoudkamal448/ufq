"use strict";

const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

// ---------------------------------------------------------------------------
// Settings (all from environment variables)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DATA_DIR = path.resolve(process.env.DATA_DIR || "/data");
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 500;
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 12;

if (ADMIN_PASSWORD.length < 8) {
  console.error("ADMIN_PASSWORD must be set and at least 8 characters long (see .env.example).");
  process.exit(1);
}

// Sessions are signed with this secret. Derived from the password when no
// SESSION_SECRET is given, so changing the password logs everyone out.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update("ufq-session:" + ADMIN_PASSWORD).digest("hex");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MEDIA_FILE = path.join(DATA_DIR, "media.json");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowed upload types. SVG/HTML are deliberately not allowed (they can carry scripts).
const ALLOWED = {
  certificate: {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf"
  },
  video: {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov"
  }
};

// ---------------------------------------------------------------------------
// Media store: a small JSON file in the data volume
// ---------------------------------------------------------------------------
async function readMedia() {
  try {
    return JSON.parse(await fsp.readFile(MEDIA_FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

let writeQueue = Promise.resolve();
// Runs fn(items) -> result one at a time, then saves the items atomically.
function updateMedia(fn) {
  const run = writeQueue.then(async () => {
    const items = await readMedia();
    const result = await fn(items);
    const tmp = MEDIA_FILE + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(items, null, 2));
    await fsp.rename(tmp, MEDIA_FILE);
    return result;
  });
  writeQueue = run.catch(() => {});
  return run;
}

function cleanText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function youtubeId(url) {
  const m = String(url || "").trim().match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function publicItem(item) {
  const out = {
    id: item.id,
    type: item.type,
    titleAr: item.titleAr,
    titleEn: item.titleEn,
    createdAt: item.createdAt
  };
  if (item.file) {
    out.url = "/uploads/" + item.file;
    out.mime = item.mime;
  }
  if (item.youtubeId) out.youtubeId = item.youtubeId;
  return out;
}

// ---------------------------------------------------------------------------
// Admin sessions (signed cookie, no server-side state)
// ---------------------------------------------------------------------------
const COOKIE = "ufq_admin";

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function makeToken() {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = "admin." + expires;
  return payload + "." + sign(payload);
}

function validToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return false;
  const payload = parts[0] + "." + parts[1];
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  return Number(parts[1]) > Date.now();
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setSessionCookie(req, res, token, maxAgeSec) {
  const attrs = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSec}`
  ];
  if (req.secure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function requireAdmin(req, res, next) {
  if (validToken(readCookie(req, COOKIE))) return next();
  res.status(401).json({ error: "Not logged in" });
}

function passwordMatches(given) {
  const a = crypto.createHash("sha256").update(String(given || "")).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// Simple brute-force protection: 10 failed logins per IP per 15 minutes.
const failures = new Map();
function tooManyFailures(ip) {
  const now = Date.now();
  const list = (failures.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  failures.set(ip, list);
  return list.length >= 10;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.disable("x-powered-by");
// Trust a reverse proxy on the same machine/network (for HTTPS + client IPs).
app.set("trust proxy", "loopback, linklocal, uniquelocal");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/healthz", (req, res) => res.send("ok"));

// ---- Public API ----
app.get("/api/media", async (req, res, next) => {
  try {
    const items = (await readMedia()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.setHeader("Cache-Control", "no-cache");
    res.json({
      certificates: items.filter((i) => i.type === "certificate").map(publicItem),
      videos: items.filter((i) => i.type === "video").map(publicItem)
    });
  } catch (err) {
    next(err);
  }
});

// ---- Admin auth ----
app.post("/api/login", express.json({ limit: "10kb" }), (req, res) => {
  const ip = req.ip;
  if (tooManyFailures(ip)) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  if (!passwordMatches(req.body && req.body.password)) {
    failures.get(ip).push(Date.now());
    return res.status(401).json({ error: "Wrong password" });
  }
  failures.delete(ip);
  setSessionCookie(req, res, makeToken(), SESSION_HOURS * 3600);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  setSessionCookie(req, res, "", 0);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  res.json({ loggedIn: validToken(readCookie(req, COOKIE)) });
});

// ---- Admin: add / edit / delete media ----
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = ALLOWED[req.params.type][file.mimetype];
      cb(null, Date.now() + "-" + crypto.randomBytes(8).toString("hex") + ext);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[req.params.type][file.mimetype]) return cb(null, true);
    const err = new Error("This file type is not allowed");
    err.status = 400;
    cb(err);
  }
});

function checkType(req, res, next) {
  if (ALLOWED[req.params.type]) return next();
  res.status(404).json({ error: "Unknown type" });
}

app.post("/api/media/:type", requireAdmin, checkType, upload.single("file"), async (req, res, next) => {
  const remove = () => req.file && fsp.unlink(req.file.path).catch(() => {});
  try {
    const type = req.params.type;
    const item = {
      id: crypto.randomUUID(),
      type,
      titleAr: cleanText(req.body.titleAr),
      titleEn: cleanText(req.body.titleEn),
      createdAt: new Date().toISOString()
    };
    if (req.file) {
      item.file = req.file.filename;
      item.mime = req.file.mimetype;
    } else if (type === "video" && req.body.youtube) {
      item.youtubeId = youtubeId(req.body.youtube);
      if (!item.youtubeId) return res.status(400).json({ error: "That doesn't look like a YouTube link" });
    } else {
      return res.status(400).json({ error: type === "video" ? "Choose a video file or paste a YouTube link" : "Choose a file" });
    }
    if (!item.titleAr && !item.titleEn) {
      remove();
      return res.status(400).json({ error: "Enter a title (Arabic or English)" });
    }
    await updateMedia((items) => items.push(item));
    res.status(201).json(publicItem(item));
  } catch (err) {
    remove();
    next(err);
  }
});

app.patch("/api/media/:id", requireAdmin, express.json({ limit: "10kb" }), async (req, res, next) => {
  try {
    const updated = await updateMedia((items) => {
      const item = items.find((i) => i.id === req.params.id);
      if (!item) return null;
      if ("titleAr" in req.body) item.titleAr = cleanText(req.body.titleAr);
      if ("titleEn" in req.body) item.titleEn = cleanText(req.body.titleEn);
      return publicItem(item);
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/media/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await updateMedia((items) => {
      const i = items.findIndex((x) => x.id === req.params.id);
      return i === -1 ? null : items.splice(i, 1)[0];
    });
    if (!removed) return res.status(404).json({ error: "Not found" });
    if (removed.file) await fsp.unlink(path.join(UPLOAD_DIR, removed.file)).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Files ----
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", index: false, dotfiles: "deny" }));
app.use(express.static(PUBLIC_DIR, { maxAge: "1h" }));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html")));

// ---- Errors ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? `File is too large (max ${MAX_UPLOAD_MB} MB)` : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(PORT, () => {
  console.log(`UFQ website running on http://localhost:${PORT}  (admin: /admin/)`);
});
// Allow slow, large video uploads.
server.requestTimeout = 0;

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
