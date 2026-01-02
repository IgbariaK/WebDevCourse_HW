const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3000;

const DB_PATH = path.join(__dirname, "db", "users.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// ---------- helpers ----------
async function readUsers() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

function newId() {
  return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

// ---------- middleware ----------
app.use(express.json());
app.use(
  session({
    secret: "web-client-secret",
    resave: false,
    saveUninitialized: false
  })
);

// Serve client
app.use(express.static(PUBLIC_DIR));
// Serve uploaded mp3
app.use("/uploads", express.static(UPLOADS_DIR));

// Ensure uploads folder exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});

// ---------- AUTH API ----------
app.post("/api/register", async (req, res) => {
  const { username, password, email, firstName, lastName, imageUrl } = req.body || {};

  // Required fields
  if (!username || !password || !email || !firstName || !lastName || !imageUrl) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Password rules: min 6, at least 1 letter + 1 number
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (password.length < 6 || !hasLetter || !hasNumber) {
    return res.status(400).json({ error: "Password must be >= 6 and include 1 letter and 1 number" });
  }

  const users = await readUsers();
  const exists = users.some(u => u.username.toLowerCase() === String(username).toLowerCase());
  if (exists) return res.status(409).json({ error: "Username already exists" });

  users.push({
    username,
    password, // (for homework) plain-text
    email,
    firstName,
    lastName,
    imageUrl,
    playlists: [] // server-side playlists
  });

  await writeUsers(users);
  return res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const users = await readUsers();
  const user = users.find(
    u => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password
  );

  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  req.session.user = {
    username: user.username
  };

  return res.json({
    ok: true,
    user: {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl
    }
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/me", requireAuth, async (req, res) => {
  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  return res.json({
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
  });
});

// ---------- PLAYLISTS API ----------
app.get("/api/playlists", requireAuth, async (req, res) => {
  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  return res.json(user ? user.playlists || [] : []);
});

app.post("/api/playlists", requireAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Playlist name required" });

  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  user.playlists = user.playlists || [];
  if (user.playlists.some(p => p.name.toLowerCase() === String(name).toLowerCase())) {
    return res.status(409).json({ error: "Playlist already exists" });
  }

  const p = { id: newId(), name: String(name).trim(), items: [] };
  user.playlists.push(p);

  await writeUsers(users);
  return res.json(p);
});

app.delete("/api/playlists/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  user.playlists = (user.playlists || []).filter(p => p.id !== id);
  await writeUsers(users);
  return res.json({ ok: true });
});

// Add YouTube video to playlist
app.post("/api/playlists/:id/videos", requireAuth, async (req, res) => {
  const { id } = req.params;
  const video = req.body || {};

  if (!video.videoId || !video.title) {
    return res.status(400).json({ error: "videoId and title required" });
  }

  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  const p = (user.playlists || []).find(p => p.id === id);
  if (!p) return res.status(404).json({ error: "Playlist not found" });

  // Prevent duplicates in playlist
  p.items = p.items || [];
  if (p.items.some(x => x.type === "youtube" && x.videoId === video.videoId)) {
    return res.json({ ok: true, already: true });
  }

  p.items.push({
    type: "youtube",
    videoId: video.videoId,
    title: video.title,
    thumbnail: video.thumbnail || "",
    channelTitle: video.channelTitle || "",
    views: video.views || "0",
    duration: video.duration || ""
  });

  await writeUsers(users);
  return res.json({ ok: true });
});

// Remove item from playlist (YouTube)
app.delete("/api/playlists/:id/videos/:videoId", requireAuth, async (req, res) => {
  const { id, videoId } = req.params;

  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  const p = (user.playlists || []).find(p => p.id === id);
  if (!p) return res.status(404).json({ error: "Playlist not found" });

  p.items = (p.items || []).filter(x => !(x.type === "youtube" && x.videoId === videoId));
  await writeUsers(users);
  return res.json({ ok: true });
});

// ---------- MP3 upload (mandatory in screenshot extension) ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      await fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, Date.now() + "_" + safe);
    }
  })
});

app.post("/api/playlists/:id/mp3", requireAuth, upload.single("mp3"), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: "Missing mp3 file" });

  const users = await readUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Not found" });

  const p = (user.playlists || []).find(p => p.id === id);
  if (!p) return res.status(404).json({ error: "Playlist not found" });

  p.items = p.items || [];
  p.items.push({
    type: "mp3",
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: "/uploads/" + req.file.filename
  });

  await writeUsers(users);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
