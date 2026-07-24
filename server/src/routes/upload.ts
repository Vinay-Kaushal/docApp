import { Router } from "express";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { DocumentRow } from "../types";

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

// Scope note: only plain text and markdown are supported. Parsing real
// .docx would mean pulling in a heavier library (mammoth, etc.) for a
// feature that's meant to demonstrate the upload -> editable-document
// flow, not full-fidelity conversion. Stated clearly here and in the UI.
const ALLOWED_EXTENSIONS = new Set([".txt", ".md"]);
const MAX_FILE_SIZE = 1_000_000; // 1MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`Unsupported file type "${ext || "unknown"}". Only .txt and .md are supported.`));
      return;
    }
    cb(null, true);
  },
});

// Very small markdown -> HTML pass, deliberately not a full markdown
// engine. Covers headings, bold/italic, and lists, which is what the
// rich text editor can already render. Anything fancier just falls
// through as a plain paragraph, which is an acceptable trade-off here.
function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineFormat(bullet[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n\r?\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

uploadRouter.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const text = req.file.buffer.toString("utf-8");
  const content = ext === ".md" ? markdownToHtml(text) : plainTextToHtml(text);
  const title = path.basename(req.file.originalname, ext).slice(0, 200) || "Imported document";

  const now = new Date().toISOString();
  const doc: DocumentRow = {
    id: `d_${nanoid(10)}`,
    title,
    content: content || "<p></p>",
    owner_id: req.user!.id,
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (@id, @title, @content, @owner_id, @created_at, @updated_at)`
  ).run({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    owner_id: doc.owner_id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  });

  res.status(201).json({ document: doc });
});

// Multer errors (bad type, too large) land here instead of crashing the process.
uploadRouter.use((err: Error, _req: any, res: any, _next: any) => {
  res.status(400).json({ error: err.message || "Upload failed" });
});

