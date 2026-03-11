import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/connection";
import { validate } from "../middleware/validate";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { RegisterInput, LoginInput } from "./schemas";
import type { UserRow } from "../types";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  validate(RegisterInput),
  asyncHandler(async (req, res) => {
    const { email, password, name, role, regional_office_id, industry_id } = req.body;

    const existing = await db("users").where({ email }).first();
    if (existing) {
      res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [id] = await db("users").insert({
      email,
      password_hash,
      name,
      role,
      regional_office_id: regional_office_id || null,
      industry_id: industry_id || null,
    });

    const token = jwt.sign(
      { id, email, role, regionId: regional_office_id },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" },
    );

    res.status(201).json({ token, user: { id, email, name, role } });
  }),
);

// POST /api/auth/login
router.post(
  "/login",
  validate(LoginInput),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await db<UserRow>("users").where({ email }).first();
    if (!user) {
      res.status(401).json({ error: "Invalid credentials", code: "AUTH_FAILED" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials", code: "AUTH_FAILED" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, regionId: user.regional_office_id },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }),
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await db<UserRow>("users")
      .where({ id: req.user!.id })
      .select("id", "email", "name", "role", "regional_office_id", "industry_id")
      .first();
    if (!user) {
      res.status(404).json({ error: "User not found", code: "NOT_FOUND" });
      return;
    }
    res.json(user);
  }),
);

export { router as authRouter };
