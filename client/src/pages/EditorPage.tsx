import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type { DocDetail, SharedWith } from "../types";
import RichTextEditor from "../components/RichTextEditor";
import ShareDialog from "../components/ShareDialog";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [shareOpen, setShareOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!id) return;
    isFirstLoad.current = true;
    api
      .getDocument(id)
      .then((res) => {
        setDoc(res.document);
        setTitle(res.document.title);
        setContent(res.document.content);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this document."));
  }, [id]);

  const persist = useCallback(
    (patch: { title?: string; content?: string }) => {
      if (!id) return;
      setSaveStatus("saving");
      api
        .updateDocument(id, patch)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    },
    [id]
  );

  // Debounced autosave: wait for a short pause in typing before hitting the API,
  // rather than saving on every keystroke.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist({ title, content }), 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  async function handleDelete() {
    if (!id || !doc) return;
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      await api.deleteDocument(id);
      navigate("/");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't delete this document.");
    }
  }

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="editor-error">
          <p>{loadError}</p>
          <button className="btn btn--secondary" onClick={() => navigate("/")}>
            Back to documents
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="app-shell">
        <p className="muted" style={{ padding: 32 }}>
          Loading…
        </p>
      </div>
    );
  }

  const isOwner = doc.permission === "owner";
  const canEdit = doc.permission === "owner" || doc.permission === "edit";

  return (
    <div className="app-shell">
      <header className="topbar topbar--editor">
        <button className="btn btn--ghost" onClick={() => navigate("/")}>
          ← Documents
        </button>
        <span className="save-status" data-status={saveStatus}>
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Couldn't save"}
        </span>
        <div className="topbar-actions">
          {!canEdit && <span className="badge badge--view">View only</span>}
          {isOwner && (
            <button className="btn btn--secondary" onClick={() => setShareOpen(true)}>
              Share
            </button>
          )}
          {isOwner && (
            <button className="btn btn--ghost btn--danger" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </header>

      <main className="editor-page">
        <input
          className="doc-title-input"
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Document title"
        />
        <p className="muted doc-owner-line">
          {isOwner ? "Owned by you" : `Owned by ${doc.owner_name} · you have ${doc.permission} access`}
        </p>

        <RichTextEditor content={content} editable={canEdit} onChange={setContent} />
      </main>

      {shareOpen && (
        <ShareDialog
          documentId={doc.id}
          ownerId={doc.owner_id}
          sharedWith={doc.shared_with ?? []}
          onClose={() => setShareOpen(false)}
          onChange={(sharedWith: SharedWith[]) => setDoc({ ...doc, shared_with: sharedWith })}
        />
      )}
    </div>
  );
}
