// Shared tools for the API tests. These tests start a real copy of the API and talk to a real
// database, so the first thing here is a set of safety rules: they only ever run against
// TEST_DATABASE_URL, never against the database the app itself uses.

import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsxCli = path.join(apiDir, "node_modules", "tsx", "dist", "cli.mjs");

export const TEST_PASSWORD = "Throwaway-pass-123";
const TEST_DOMAIN = "example.invalid"; // every account the tests create ends with this

// ---------------------------------------------------------------- safety

/** host:port/database, so two connection strings can be compared without their passwords */
export function databaseIdentity(url: string): string {
  const u = new URL(url);
  return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
}

/** The test database's address. Throws unless it is set and is not the app's own database. */
export function testDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const test = env.TEST_DATABASE_URL;
  if (!test) {
    throw new Error(
      "TEST_DATABASE_URL is not set. These tests need their own empty database and refuse to run without it.",
    );
  }
  const real = env.DATABASE_URL;
  if (real && databaseIdentity(real) === databaseIdentity(test)) {
    throw new Error(
      "TEST_DATABASE_URL points at the same database as DATABASE_URL. The tests would wipe real data, so they will not run.",
    );
  }
  return test;
}

const TEST_URL = testDatabaseUrl();

// ---------------------------------------------------------------- the test database

/** Run SQL on the test database */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    await client.end();
  }
}

/** Delete every account these tests made; their habits, check-ins and notes go with them */
export async function removeTestUsers(): Promise<void> {
  await sql(`DELETE FROM "User" WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}

/** Pretend a habit was created `days` days ago, so past days become allowed */
export async function backdateHabit(habitId: number, days: number): Promise<void> {
  await sql(`UPDATE "Habit" SET "createdAt" = NOW() - ($1 || ' days')::interval WHERE id = $2`, [String(days), habitId]);
}

// ---------------------------------------------------------------- running the API

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

export type RunningApi = {
  base: string;
  stop: () => Promise<void>;
  output: () => string;
};

/**
 * Start a copy of the API on a spare port, connected to the test database.
 * By default the rate limits are loosened a thousand times so tests can create many accounts;
 * pass RATE_LIMIT_MULTIPLIER "1" to test the real limits.
 */
export async function startApi(extraEnv: Record<string, string> = {}): Promise<RunningApi> {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let log = "";
  const child: ChildProcess = spawn(process.execPath, [tsxCli, "src/index.ts"], {
    cwd: apiDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: TEST_URL,
      JWT_SECRET: "test-only-secret-".padEnd(48, "x"),
      CORS_ORIGIN: "http://localhost:3999",
      TRUST_PROXY: "1",
      RATE_LIMIT_MULTIPLIER: "1000",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => (log += d));
  child.stderr?.on("data", (d) => (log += d));

  const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      // not up yet
    }
    if (child.exitCode !== null) throw new Error(`the API stopped while starting:\n${log}`);
    await new Promise((r) => setTimeout(r, 250));
    if (i === 119) throw new Error(`the API did not start in time:\n${log}`);
  }

  return {
    base,
    output: () => log,
    stop: async () => {
      if (child.exitCode === null) child.kill();
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    },
  };
}

/** Start the API with settings that should make it refuse to start; resolves with its exit code and output */
export async function startApiExpectingFailure(env: Record<string, string>): Promise<{ code: number | null; output: string }> {
  const port = await freePort();
  let log = "";
  const child = spawn(process.execPath, [tsxCli, "src/index.ts"], {
    cwd: apiDir,
    env: { ...process.env, PORT: String(port), DATABASE_URL: TEST_URL, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => (log += d));
  child.stderr?.on("data", (d) => (log += d));
  const code = await new Promise<number | null>((resolve) => {
    const timer = setTimeout(() => { child.kill(); resolve(null); }, 15000);
    child.on("exit", (c) => { clearTimeout(timer); resolve(c); });
  });
  return { code, output: log };
}

// ---------------------------------------------------------------- talking to it

export type Reply = { status: number; json: any; headers: Headers };

export type CallOptions = {
  token?: string;
  body?: unknown;
  /** a pretend visitor address, so rate limits and tests do not interfere */
  ip?: string;
  origin?: string;
  headers?: Record<string, string>;
};

let visitorCounter = 0;
/** A new made-up visitor address */
export const newVisitor = () => `10.${(Date.now() >> 8) & 255}.${Date.now() & 255}.${++visitorCounter}`;

export function client(base: string) {
  return async function call(method: string, urlPath: string, o: CallOptions = {}): Promise<Reply> {
    const res = await fetch(base + urlPath, {
      method,
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": o.ip ?? newVisitor(),
        ...(o.token ? { authorization: `Bearer ${o.token}` } : {}),
        ...(o.origin ? { origin: o.origin } : {}),
        ...(o.headers ?? {}),
      },
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // some answers have no body
    }
    return { status: res.status, json, headers: res.headers };
  };
}

export type Call = ReturnType<typeof client>;

export type TestUser = { token: string; email: string; password: string; id: number };

let userCounter = 0;
/** Create a throwaway account */
export async function signUp(call: Call): Promise<TestUser> {
  const email = `t${Date.now()}-${++userCounter}@${TEST_DOMAIN}`;
  const res = await call("POST", "/api/auth/register", { body: { email, password: TEST_PASSWORD } });
  if (res.status !== 201) throw new Error(`could not create a test account: ${res.status} ${JSON.stringify(res.json)}`);
  return { token: res.json.token, email, password: TEST_PASSWORD, id: res.json.user.id };
}

// ---------------------------------------------------------------- dates (UTC days, as the API counts)

export const day = (offset = 0): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
