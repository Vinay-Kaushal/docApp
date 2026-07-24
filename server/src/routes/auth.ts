import { Router } from "express";
import { db } from "../db";
import { User } from "../types";

export const authRouter = Router();

// Lets the login screen show who's available to sign in as.
authRouter.get("/users", (_req, res) => {
  const users = db.prepare("SELECT id, name, email, avatar_color FROM users").all() as User[];
  res.json({ users });
});

// "Login" = pick one of the seeded users. No password because there's
// nothing to check it against - see middleware/auth.ts.
authRouter.post("/auth/login", (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const user = db.prepare("SELECT id, name, email, avatar_color FROM users WHERE id = ?").get(userId) as
    | User
    | undefined;
  if (!user) return res.status(404).json({ error: "No user with that id" });

  res.json({ user, token: user.id });
});
