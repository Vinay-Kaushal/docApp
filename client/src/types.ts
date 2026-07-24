export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface DocSummary {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  owner_name: string;
  access: "owner" | "shared";
  created_at: string;
  updated_at: string;
}

export interface SharedWith {
  id: string;
  name: string;
  permission: "view" | "edit";
}

export interface DocDetail extends DocSummary {
  permission: "owner" | "view" | "edit";
  shared_with?: SharedWith[];
}
