// The app's rate limiters, built once on an in-memory store. See rateLimit.ts for how to swap in
// Redis if the API ever runs as more than one copy.
import { readConfig } from "./config.js";
import { createLimiters, MemoryStore } from "./rateLimit.js";

export const limiters = createLimiters(new MemoryStore(), readConfig().rateLimitScale);
