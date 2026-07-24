import path from "path";
import fs from "fs";

const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

// Keep the sqlite file outside src/ so `npm run build` never touches it,
// and so it survives restarts during local dev.
const DATA_DIR = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "docapp.sqlite3");
export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'edit', -- 'view' | 'edit'
    created_at TEXT NOT NULL,
    UNIQUE(document_id, user_id)
  );
`);

// --- seed data -------------------------------------------------------
// Three fixed demo accounts so a reviewer can log in without a signup
// flow. Real auth was explicitly out of scope for this exercise (see
// ARCHITECTURE.md) so this is a deliberate stand-in, not an oversight.
const seedUsers = [
  { id: "u_vinay", name: "Vinay Kumar", email: "vinay@demo.dev", avatar_color: "#7C5CFC" },
  { id: "u_asha", name: "Asha Rao", email: "asha@demo.dev", avatar_color: "#E8734A" },
  { id: "u_marcus", name: "Marcus Lee", email: "marcus@demo.dev", avatar_color: "#1E9E6B" },
];

const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users (id, name, email, avatar_color) VALUES (@id, @name, @email, @avatar_color)`
);
for (const u of seedUsers) insertUser.run(u);

// A couple of starter documents so the app isn't empty on first run.
const existingDocs = db.prepare(`SELECT COUNT(*) as count FROM documents`).get() as { count: number };
if (existingDocs.count === 0) {
  const now = new Date().toISOString();
  const insertDoc = db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at) VALUES (@id, @title, @content, @owner_id, @created_at, @updated_at)`
  );
  const insertShare = db.prepare(
    `INSERT INTO shares (id, document_id, user_id, permission, created_at) VALUES (@id, @document_id, @user_id, @permission, @created_at)`
  );

  insertDoc.run({
    id: "d_welcome",
    title: "Welcome to DocApp",
    content: "<h1>Welcome to DocApp</h1><p>This is a starter document owned by <strong>Vinay Kumar</strong>. Try editing it, then share it with Asha or Marcus from the top bar.</p>",
    owner_id: "u_vinay",
    created_at: now,
    updated_at: now,
  });
  insertShare.run({
    id: "s_welcome_asha",
    document_id: "d_welcome",
    user_id: "u_asha",
    permission: "edit",
    created_at: now,
  });

  insertDoc.run({
    id: "d_notes",
    title: "Asha's Meeting Notes",
    content: "<h2>Q3 sync</h2><ul><li>Ship the editor MVP</li><li>Decide on sharing model</li></ul>",
    owner_id: "u_asha",
    created_at: now,
    updated_at: now,
  });
}
