const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("docapp_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "x-user-id": token } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (shouldn't normally happen)
  }

  if (!res.ok) {
    throw new ApiError(res.status, body?.error || `Request failed with status ${res.status}`);
  }

  return body as T;
}

export const api = {
  setToken(token: string | null) {
    if (token) localStorage.setItem("docapp_token", token);
    else localStorage.removeItem("docapp_token");
  },
  getToken,

  listUsers: () => request<{ users: import("./types").User[] }>("/users"),
  login: (userId: string) =>
    request<{ user: import("./types").User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  listDocuments: () =>
    request<{ owned: import("./types").DocSummary[]; shared: import("./types").DocSummary[] }>("/documents"),
  getDocument: (id: string) => request<{ document: import("./types").DocDetail }>(`/documents/${id}`),
  createDocument: (title: string, content = "") =>
    request<{ document: import("./types").DocDetail }>("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    }),
  updateDocument: (id: string, patch: { title?: string; content?: string }) =>
    request<{ document: import("./types").DocDetail }>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  shareDocument: (id: string, userId: string, permission: "view" | "edit") =>
    request<{ shared_with: import("./types").SharedWith[] }>(`/documents/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ userId, permission }),
    }),
  revokeShare: (id: string, userId: string) =>
    request<void>(`/documents/${id}/share/${userId}`, { method: "DELETE" }),

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ document: import("./types").DocDetail }>("/upload", { method: "POST", body: form });
  },
};

export { ApiError };
