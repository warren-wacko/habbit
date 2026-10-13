import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { limiters } from "../lib/limiters.js";
import {
  changePasswordBody,
  deleteAccountBody,
  loginBody,
  profileBody,
  registerBody,
} from "../schemas/auth.js";

export const authRouter = Router();

// What the app may know about the signed-in user (never the password hash)
const PROFILE_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  nickname: true,
  avatarIcon: true,
  avatarColor: true,
  accent: true,
  onboardedAt: true,
} as const;

// Used when the email doesn't exist, so login takes about the same time either way
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

authRouter.post("/register", limiters.register, async (req, res) => {
  const { email, password } = registerBody.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "Email already in use");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });

  res.status(201).json({ user, token: signToken(user.id) });
});

authRouter.post("/login", limiters.loginIp, limiters.loginEmail, async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    throw new HttpError(401, "Invalid email or password");
  }

  res.json({
    user: { id: user.id, email: user.email },
    token: signToken(user.id),
  });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: PROFILE_SELECT,
  });

  if (!user) throw new HttpError(401, "User no longer exists");

  res.json(user);
});

// Change the nickname and avatar of the signed-in user (only their own row)
authRouter.patch("/me", requireAuth, async (req, res) => {
  const userId: number = res.locals.userId;
  const { nickname, avatarIcon, avatarColor, accent, onboarded } = profileBody.parse(req.body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      // an empty nickname clears it
      ...(nickname === undefined ? {} : { nickname: nickname || null }),
      ...(avatarIcon === undefined ? {} : { avatarIcon }),
      ...(avatarColor === undefined ? {} : { avatarColor }),
      ...(accent === undefined ? {} : { accent }),
      ...(onboarded ? { onboardedAt: new Date() } : {}),
    },
    select: PROFILE_SELECT,
  });

  res.json(user);
});

authRouter.patch("/password", requireAuth, limiters.sensitive, async (req, res) => {
  const userId: number = res.locals.userId;
  const { currentPassword, newPassword } = changePasswordBody.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpError(401, "User no longer exists");

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  res.status(204).end();
});

authRouter.delete("/me", requireAuth, limiters.sensitive, async (req, res) => {
  const userId: number = res.locals.userId;
  const { password } = deleteAccountBody.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new HttpError(401, "User no longer exists");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  await prisma.user.delete({
    where: { id: userId },
  });

  res.status(204).end();
});
