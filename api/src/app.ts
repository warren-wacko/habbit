import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { habitsRouter } from "./routes/habits.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { readConfig } from "./lib/config.js";
import { limiters } from "./lib/limiters.js";

const config = readConfig();

export const app = express();
app.disable("x-powered-by"); // do not announce which framework this is
// how many proxies sit in front of the API: it decides whose address the rate limiter sees
app.set("trust proxy", config.trustProxy);
app.use(securityHeaders(config.production));
// only the website may call the API from a browser
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/api", limiters.global);
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/habits", requireAuth, limiters.user, habitsRouter);
app.use(errorHandler);
