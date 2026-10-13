import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

healthRouter.get("/db", async (_req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() AS time`;
    res.json({ status: "ok", db: "connected", result });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      db: "unreachable",
    });
  }
});
