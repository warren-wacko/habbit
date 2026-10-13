// Settings that come from the environment, and the checks that stop the API from starting
// in production with an unsafe set-up.

export const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const EXAMPLE_SECRET = "replace-with-a-long-random-string";
const MIN_SECRET_LENGTH = 32;

/** "https://a.app, https://b.app/" becomes ["https://a.app", "https://b.app"] */
export function parseOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export type Config = {
  production: boolean;
  corsOrigins: string[]; // the websites allowed to call the API from a browser
  trustProxy: number; // how many proxies sit in front of the API (0 when none)
  rateLimitScale: number; // multiplies every rate limit; 1 unless testing
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  const origins = parseOrigins(env.CORS_ORIGIN);
  const hops = Number(env.TRUST_PROXY ?? 0);
  const scale = Number(env.RATE_LIMIT_MULTIPLIER ?? 1);
  return {
    production,
    // locally the website runs on port 3000; in production nothing is allowed unless set
    corsOrigins: origins.length > 0 ? origins : production ? [] : DEV_ORIGINS,
    // anything that is not a whole number of hops is ignored: trusting no proxy is the safe default
    trustProxy: Number.isInteger(hops) && hops >= 0 ? hops : 0,
    rateLimitScale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  };
}

/** What is wrong with the environment for a production start. Empty when it is fine. */
export function productionProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const problems: string[] = [];
  const secret = env.JWT_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (secret === EXAMPLE_SECRET) problems.push("JWT_SECRET is still the example value");
  const origins = parseOrigins(env.CORS_ORIGIN);
  if (origins.length === 0) problems.push("CORS_ORIGIN must be set to the website's address");
  if (origins.includes("*")) problems.push("CORS_ORIGIN must not be *");
  if (!env.DATABASE_URL) problems.push("DATABASE_URL is not set");
  if (env.RATE_LIMIT_MULTIPLIER !== undefined && Number(env.RATE_LIMIT_MULTIPLIER) !== 1) {
    problems.push("RATE_LIMIT_MULTIPLIER must not be changed in production");
  }
  return problems;
}
