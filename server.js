const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(DATA, "mcmods.db"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS mods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Addon',
  edition TEXT NOT NULL DEFAULT 'Bedrock',
  version TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Anonymous',
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  downloads INTEGER NOT NULL DEFAULT 0
);
`);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, Date.now() + "-" + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(ROOT, "public")));

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mod";
}

app.get("/api/mods", (req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  let sql = "SELECT * FROM mods WHERE 1=1";
  const params = {};
  if (q) { sql += " AND (title LIKE @q OR description LIKE @q OR author LIKE @q)"; params.q = `%${q}%`; }
  if (category) { sql += " AND category=@category"; params.category = category; }
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(params));
});

app.get("/api/mods/:id", (req, res) => {
  const mod = db.prepare("SELECT * FROM mods WHERE id=?").get(req.params.id);
  if (!mod) return res.status(404).json({ error: "Mod not found" });
  res.json(mod);
});

app.post("/api/mods", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a file" });
    const title = String(req.body.title || "").trim();
    if (!title) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Title is required" });
    }

    let slug = slugify(title);
    let n = 2;
    while (db.prepare("SELECT 1 FROM mods WHERE slug=?").get(slug)) slug = slugify(title) + "-" + n++;

    const info = db.prepare(`
      INSERT INTO mods (title,slug,description,category,edition,version,author,file_name,original_name)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
      title,
      slug,
      String(req.body.description || ""),
      String(req.body.category || "Addon"),
      String(req.body.edition || "Bedrock"),
      String(req.body.version || ""),
      String(req.body.author || "Anonymous"),
      req.file.filename,
      req.file.originalname
    );
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/download/:id", (req, res) => {
  const mod = db.prepare("SELECT * FROM mods WHERE id=?").get(req.params.id);
  if (!mod) return res.status(404).send("File not found");
  const file = path.join(UPLOADS, mod.file_name);
  if (!fs.existsSync(file)) return res.status(404).send("Stored file not found");
  db.prepare("UPDATE mods SET downloads=downloads+1 WHERE id=?").run(mod.id);
  res.download(file, mod.original_name);
});

app.delete("/api/mods/:id", (req, res) => {
  const mod = db.prepare("SELECT * FROM mods WHERE id=?").get(req.params.id);
  if (!mod) return res.status(404).json({ error: "Not found" });
  const file = path.join(UPLOADS, mod.file_name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db.prepare("DELETE FROM mods WHERE id=?").run(mod.id);
  res.json({ ok: true });
});

app.get("*", (_, res) => res.sendFile(path.join(ROOT, "public", "index.html")));
app.listen(PORT, () => console.log(`MCMods MVP running at http://localhost:${PORT}`));

