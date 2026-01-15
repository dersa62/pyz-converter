import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

type JwtPayload = {
  userId: number;
  email: string;
  role: string;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
};

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, 10);

export const comparePassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

export const verifyToken = (token: string) =>
  jwt.verify(token, getJwtSecret()) as JwtPayload;

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyToken(token);
    (req as Request & { user?: JwtPayload }).user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

export const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";
  if (!adminEmail || !adminPassword) {
    return;
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length) {
    const passwordHash = await hashPassword(adminPassword);
    await db
      .update(users)
      .set({
        name: adminName,
        passwordHash,
        role: "admin",
        status: "approved",
      })
      .where(eq(users.email, adminEmail));
    return;
  }

  const passwordHash = await hashPassword(adminPassword);
  await db.insert(users).values({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "admin",
    status: "approved",
  });
};
