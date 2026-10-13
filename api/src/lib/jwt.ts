import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): number {
  const payload = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Bad token payload");
  }
  const id = Number(payload.sub);
  if (!Number.isInteger(id)) throw new Error("Bad token payload");
  return id;
}
