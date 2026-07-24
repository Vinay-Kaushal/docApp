import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { SharedWith, User } from "../types";

interface Props {
  documentId: string;
  ownerId: string;
  sharedWith: SharedWith[];
  onClose: () => void;
  onChange: (sharedWith: SharedWith[]) => void;
}

export default function ShareDialog({ documentId, ownerId, sharedWith, onClose, onChange }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    api.listUsers().then((res) => setUsers(res.users.filter((u) => u.id !== ownerId)));
  }, [ownerId]);

  const sharedIds = new Set(sharedWith.map((s) => s.id));

  async function grant(userId: string, permission: "view" | "edit") {
    setBusyUserId(userId);
    setError(null);
    try {
      const res = await api.shareDocument(documentId, userId, permission);
      onChange(res.shared_with);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update sharing.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function revoke(userId: string) {
    setBusyUserId(userId);
    setError(null);
    try {
      await api.revokeShare(documentId, userId);
      onChange(sharedWith.filter((s) => s.id !== userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove access.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share document</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="share-list">
          {users.map((u) => {
            const share = sharedWith.find((s) => s.id === u.id);
            const isBusy = busyUserId === u.id;
            return (
              <div key={u.id} className="share-row">
                <span className="avatar avatar--sm" style={{ background: u.avatar_color }}>
                  {u.name.charAt(0)}
                </span>
                <span className="share-name">{u.name}</span>

                {share ? (
                  <div className="share-controls">
                    <select
                      value={share.permission}
                      disabled={isBusy}
                      onChange={(e) => grant(u.id, e.target.value as "view" | "edit")}
                    >
                      <option value="view">Can view</option>
                      <option value="edit">Can edit</option>
                    </select>
                    <button className="btn btn--ghost btn--sm" disabled={isBusy} onClick={() => revoke(u.id)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <button className="btn btn--secondary btn--sm" disabled={isBusy} onClick={() => grant(u.id, "edit")}>
                    {isBusy ? "Sharing…" : "Share"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="muted modal-footnote">
          {sharedIds.size === 0 ? "Not shared with anyone yet." : `Shared with ${sharedIds.size} ${sharedIds.size === 1 ? "person" : "people"}.`}
        </p>
      </div>
    </div>
  );
}
