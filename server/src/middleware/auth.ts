import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { User } from "../types";

/**
 * This is intentionally NOT real authentication. There's no password,
 * no session, no JWT signing. The "token" is just a user id that the
 * client stores after picking a seeded account on the login screen.
 *
 * Real auth (hashed passwords, sessions/JWTs, CSRF, etc.) was cut from
 * scope on purpose - see ARCHITECTURE.md for the reasoning. This layer
 * exists only so the rest of the app has a `req.user` to reason about
 * ownership and sharing against.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id header. Log in first." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unknown user. Your session may be stale, try logging in again." });
  }

  req.user = user;
  next();
}
