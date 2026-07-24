import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import type { DocSummary } from "../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function DashboardPage() {
  const [owned, setOwned] = useState<DocSummary[]>([]);
  const [shared, setShared] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.listDocuments();
      setOwned(res.owned);
      setShared(res.shared);
      setError(null);
    } catch {
      setError("Couldn't load your documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await api.createDocument("Untitled document");
      navigate(`/documents/${res.document.id}`);
    } catch {
      setError("Couldn't create the document.");
      setCreating(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setUploadError(null);
    try {
      const res = await api.uploadFile(file);
      navigate(`/documents/${res.document.id}`);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Dc</span>
          <span>DocApp</span>
        </div>
        <div className="topbar-actions">
          <span className="current-user">
            <span className="avatar avatar--sm" style={{ background: user?.avatar_color }}>
              {user?.name.charAt(0)}
            </span>
            {user?.name}
          </span>
          <button className="btn btn--ghost" onClick={logout}>
            Switch account
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Your documents</h1>
            <p className="muted">Create, edit, and share write-ups with the rest of the team.</p>
          </div>
          <div className="dashboard-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              hidden
              onChange={handleFileChosen}
            />
            <button className="btn btn--secondary" onClick={() => fileInputRef.current?.click()}>
              Upload .txt / .md
            </button>
            <button className="btn btn--primary" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "+ New document"}
            </button>
          </div>
        </div>

        {uploadError && <div className="banner banner--error">{uploadError}</div>}
        {error && <div className="banner banner--error">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <section className="doc-section">
              <h2>Owned by you ({owned.length})</h2>
              {owned.length === 0 ? (
                <p className="empty-state">
                  Nothing here yet. Start with "New document" or import a .txt / .md file.
                </p>
              ) : (
                <div className="doc-grid">
                  {owned.map((doc) => (
                    <button key={doc.id} className="doc-card" onClick={() => navigate(`/documents/${doc.id}`)}>
                      <span className="doc-card-title">{doc.title}</span>
                      <span className="doc-card-preview">{stripHtml(doc.content) || "Empty document"}</span>
                      <span className="doc-card-meta">
                        <span className="badge badge--owner">Owner</span>
                        <span>{timeAgo(doc.updated_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="doc-section">
              <h2>Shared with you ({shared.length})</h2>
              {shared.length === 0 ? (
                <p className="empty-state">Nobody has shared a document with you yet.</p>
              ) : (
                <div className="doc-grid">
                  {shared.map((doc) => (
                    <button key={doc.id} className="doc-card" onClick={() => navigate(`/documents/${doc.id}`)}>
                      <span className="doc-card-title">{doc.title}</span>
                      <span className="doc-card-preview">{stripHtml(doc.content) || "Empty document"}</span>
                      <span className="doc-card-meta">
                        <span className="badge badge--shared">Shared by {doc.owner_name}</span>
                        <span>{timeAgo(doc.updated_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
