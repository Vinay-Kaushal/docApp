export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ShareRow {
  id: string;
  document_id: string;
  user_id: string;
  permission: "view" | "edit";
  created_at: string;
}

// Extends Express's Request with the resolved user, set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
