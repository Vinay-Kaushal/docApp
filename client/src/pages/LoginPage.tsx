import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch(() => setError("Couldn't reach the server. Is the API running on port 4000?"));
  }, []);

  async function handleLogin(userId: string) {
    setPending(userId);
    setError(null);
    try {
      await login(userId);
      navigate("/");
    } catch {
      setError("Login failed. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">DocApp</p>
        <h1>Pick an account to continue</h1>
        <p className="auth-subtitle">
          There's no signup here — this demo uses three seeded accounts so you can see sharing work between
          two users. Any one of these logs you in.
        </p>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="account-list">
          {users.map((u) => (
            <button
              key={u.id}
              className="account-row"
              onClick={() => handleLogin(u.id)}
              disabled={pending !== null}
            >
              <span className="avatar" style={{ background: u.avatar_color }}>
                {u.name.charAt(0)}
              </span>
              <span className="account-meta">
                <span className="account-name">{u.name}</span>
                <span className="account-email">{u.email}</span>
              </span>
              <span className="account-action">{pending === u.id ? "Signing in…" : "Continue →"}</span>
            </button>
          ))}
          {users.length === 0 && !error && <p className="muted">Loading accounts…</p>}
        </div>
      </div>
    </div>
  );
}
