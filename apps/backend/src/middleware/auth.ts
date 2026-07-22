import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: { message: "Missing bearer token", code: "unauthorized" } });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: { message: "Invalid or expired token", code: "unauthorized" } });
    return;
  }

  req.userId = data.user.id;
  next();
}
