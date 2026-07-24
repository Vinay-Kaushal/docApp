import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { DocumentRow, ShareRow, User } from "../types";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 2_000_000; // ~2MB of HTML, generous for this scope

type DocWithMeta = DocumentRow & {
  owner_name: string;
  access: "owner" | "shared";
  permission: "owner" | "view" | "edit";
  shared_with?: { id: string; name: string; permission: string }[];
};

function canAccess(doc: DocumentRow, userId: string): "owner" | "edit" | "view" | null {
  if (doc.owner_id === userId) return "owner";
  const share = db
    .prepare("SELECT * FROM shares WHERE document_id = ? AND user_id = ?")
    .get(doc.id, userId) as unknown as ShareRow | undefined;
  return share ? share.permission : null;
}

// GET /api/documents - everything the current user owns or has been shared
documentsRouter.get("/documents", (req, res) => {
  const userId = req.user!.id;

  const owned = db
    .prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY updated_at DESC")
    .all(userId) as unknown as DocumentRow[];

  const shared = db
    .prepare(
      `SELECT d.* FROM documents d
       JOIN shares s ON s.document_id = d.id
       WHERE s.user_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(userId) as unknown as DocumentRow[];

  const attachOwnerName = (doc: DocumentRow, access: "owner" | "shared") => {
    const owner = db.prepare("SELECT name FROM users WHERE id = ?").get(doc.owner_id) as unknown as { name: string };
    return { ...doc, owner_name: owner.name, access };
  };

  res.json({
    owned: owned.map((d) => attachOwnerName(d, "owner")),
    shared: shared.map((d) => attachOwnerName(d, "shared")),
  });
});

// POST /api/documents - create a blank (or pre-filled) document
documentsRouter.post("/documents", (req, res) => {
  const { title, content } = req.body as { title?: string; content?: string };
  const cleanTitle = (title ?? "Untitled document").trim().slice(0, MAX_TITLE_LENGTH);

  if ((content ?? "").length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({ error: "Document content is too large." });
  }

  const now = new Date().toISOString();
  const doc: DocumentRow = {
    id: `d_${nanoid(10)}`,
    title: cleanTitle || "Untitled document",
    content: content ?? "",
    owner_id: req.user!.id,
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(doc.id, doc.title, doc.content, doc.owner_id, doc.created_at, doc.updated_at);

  res.status(201).json({ document: doc });
});

// GET /api/documents/:id
documentsRouter.get("/documents/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as unknown as DocumentRow | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const permission = canAccess(doc, req.user!.id);
  if (!permission) return res.status(403).json({ error: "You don't have access to this document" });

  const owner = db.prepare("SELECT name FROM users WHERE id = ?").get(doc.owner_id) as unknown as { name: string };
  const shares = db
    .prepare(
      `SELECT u.id, u.name, s.permission FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?`
    )
    .all(doc.id) as unknown as { id: string; name: string; permission: string }[];

  const response: DocWithMeta = {
    ...doc,
    owner_name: owner.name,
    access: permission === "owner" ? "owner" : "shared",
    permission,
    shared_with: permission === "owner" ? shares : undefined,
  };

  res.json({ document: response });
});

// PATCH /api/documents/:id - rename and/or edit content
documentsRouter.patch("/documents/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as unknown as DocumentRow | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const permission = canAccess(doc, req.user!.id);
  if (!permission) return res.status(403).json({ error: "You don't have access to this document" });
  if (permission === "view") return res.status(403).json({ error: "You only have view access to this document" });

  const { title, content } = req.body as { title?: string; content?: string };

  if (title !== undefined && title.trim().length === 0) {
    return res.status(400).json({ error: "Title can't be empty" });
  }
  if (content !== undefined && content.length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({ error: "Document content is too large." });
  }

  const updated: DocumentRow = {
    ...doc,
    title: title !== undefined ? title.trim().slice(0, MAX_TITLE_LENGTH) : doc.title,
    content: content !== undefined ? content : doc.content,
    updated_at: new Date().toISOString(),
  };

  db.prepare("UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ?").run(
    updated.title,
    updated.content,
    updated.updated_at,
    updated.id
  );

  res.json({ document: updated });
});

// DELETE /api/documents/:id - owner only
documentsRouter.delete("/documents/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as unknown as DocumentRow | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user!.id) return res.status(403).json({ error: "Only the owner can delete this document" });

  db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
  res.status(204).send();
});

// POST /api/documents/:id/share - owner grants access to another user
documentsRouter.post("/documents/:id/share", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as unknown as DocumentRow | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user!.id) return res.status(403).json({ error: "Only the owner can share this document" });

  const { userId, permission } = req.body as { userId?: string; permission?: "view" | "edit" };
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (userId === doc.owner_id) return res.status(400).json({ error: "Document is already owned by that user" });

  const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as unknown as User | undefined;
  if (!targetUser) return res.status(404).json({ error: "No user with that id" });

  const perm = permission === "view" ? "view" : "edit";
  const existing = db
    .prepare("SELECT * FROM shares WHERE document_id = ? AND user_id = ?")
    .get(doc.id, userId) as unknown as ShareRow | undefined;

  if (existing) {
    db.prepare("UPDATE shares SET permission = ? WHERE id = ?").run(perm, existing.id);
  } else {
    db.prepare(
      `INSERT INTO shares (id, document_id, user_id, permission, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(`s_${nanoid(10)}`, doc.id, userId, perm, new Date().toISOString());
  }

  const shares = db
    .prepare(
      `SELECT u.id, u.name, s.permission FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?`
    )
    .all(doc.id);

  res.status(201).json({ shared_with: shares });
});

// DELETE /api/documents/:id/share/:userId - owner revokes access
documentsRouter.delete("/documents/:id/share/:userId", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as unknown as DocumentRow | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user!.id) return res.status(403).json({ error: "Only the owner can manage sharing" });

  db.prepare("DELETE FROM shares WHERE document_id = ? AND user_id = ?").run(doc.id, req.params.userId);
  res.status(204).send();
});

