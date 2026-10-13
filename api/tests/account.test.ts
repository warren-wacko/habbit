import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { client, day, removeTestUsers, signUp, startApi, TEST_PASSWORD, type Call, type RunningApi } from "./helpers.js";

let api: RunningApi;
let call: Call;

before(async () => {
  await removeTestUsers();
  api = await startApi();
  call = client(api.base);
});

after(async () => {
  await api.stop();
  await removeTestUsers();
});

const email = () => `acct${Date.now()}${Math.floor(Math.random() * 1e6)}@example.invalid`;

describe("registering and signing in", () => {
  it("creates an account and returns a token, and refuses a second account with the same email", async () => {
    const e = email();
    const r = await call("POST", "/api/auth/register", { body: { email: e, password: TEST_PASSWORD } });
    assert.equal(r.status, 201);
    assert.ok(r.json.token);
    assert.equal(r.json.user.email, e);
    assert.ok(!("passwordHash" in r.json.user));
    const again = await call("POST", "/api/auth/register", { body: { email: e, password: TEST_PASSWORD } });
    assert.equal(again.status, 409);
  });

  it("validates the email and the password length", async () => {
    for (const body of [
      { email: "not-an-email", password: TEST_PASSWORD },
      { email: email(), password: "short" },
      { email: email(), password: "x".repeat(73) },
      { email: email() },
      {},
    ]) {
      assert.equal((await call("POST", "/api/auth/register", { body })).status, 400, JSON.stringify(body));
    }
  });

  it("signs in with the right password, and refuses wrong ones with the same message as unknown emails", async () => {
    const user = await signUp(call);
    const ok = await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } });
    assert.equal(ok.status, 200);
    assert.ok(ok.json.token);
    const wrong = await call("POST", "/api/auth/login", { body: { email: user.email, password: "wrong-password" } });
    const unknown = await call("POST", "/api/auth/login", { body: { email: email(), password: "wrong-password" } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.json.error, unknown.json.error, "an attacker cannot tell which emails exist");
  });

  it("treats the email case-insensitively", async () => {
    const user = await signUp(call);
    const r = await call("POST", "/api/auth/login", { body: { email: user.email.toUpperCase(), password: user.password } });
    assert.equal(r.status, 200);
  });
});

describe("the profile", () => {
  it("starts with no nickname or icon, the volt colour and theme, and the tour not yet seen", async () => {
    const user = await signUp(call);
    const me = await call("GET", "/api/auth/me", { token: user.token });
    assert.equal(me.status, 200);
    assert.deepEqual(
      [me.json.nickname, me.json.avatarIcon, me.json.avatarColor, me.json.accent, me.json.onboardedAt],
      [null, null, "volt", "volt", null],
    );
    assert.ok(!("passwordHash" in me.json));
  });

  it("changes the nickname, avatar and colour theme, each on its own, and persists them", async () => {
    const user = await signUp(call);
    let r = await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "  Sam  ", avatarIcon: "run", avatarColor: "aqua" } });
    assert.deepEqual([r.status, r.json.nickname, r.json.avatarIcon, r.json.avatarColor], [200, "Sam", "run", "aqua"]);
    r = await call("PATCH", "/api/auth/me", { token: user.token, body: { accent: "violet" } });
    assert.equal(r.json.accent, "violet");
    const me = (await call("GET", "/api/auth/me", { token: user.token })).json;
    assert.deepEqual([me.nickname, me.avatarIcon, me.avatarColor, me.accent], ["Sam", "run", "aqua", "violet"]);
    const login = await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } });
    const fresh = (await call("GET", "/api/auth/me", { token: login.json.token })).json;
    assert.equal(fresh.accent, "violet", "the theme follows the account to a new session");
  });

  it("clears the nickname and the icon, and keeps markup and accents as plain text", async () => {
    const user = await signUp(call);
    await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "Sam", avatarIcon: "run" } });
    let r = await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "   ", avatarIcon: null } });
    assert.deepEqual([r.json.nickname, r.json.avatarIcon], [null, null]);
    r = await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "<b>hi</b> José 🌱" } });
    assert.equal(r.json.nickname, "<b>hi</b> José 🌱");
  });

  it("refuses bad nicknames, icons, colours, themes and empty edits", async () => {
    const user = await signUp(call);
    for (const body of [
      { nickname: "x".repeat(31) },
      { nickname: "line\nbreak" },
      { nickname: "bad‮name" },
      { nickname: 5 },
      { avatarIcon: "skull" },
      { avatarColor: "teal" },
      { accent: "teal" },
      { accent: "#ff0000" },
      { accent: null },
      { onboarded: false },
      {},
    ]) {
      const r = await call("PATCH", "/api/auth/me", { token: user.token, body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
    assert.equal((await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "x".repeat(30) } })).status, 200);
  });

  it("marks the tour as seen, and that can never be undone", async () => {
    const user = await signUp(call);
    const r = await call("PATCH", "/api/auth/me", { token: user.token, body: { onboarded: true } });
    assert.equal(r.status, 200);
    assert.equal(typeof r.json.onboardedAt, "string");
    assert.equal((await call("PATCH", "/api/auth/me", { token: user.token, body: { onboarded: null } })).status, 400);
    assert.notEqual((await call("GET", "/api/auth/me", { token: user.token })).json.onboardedAt, null);
  });

  it("ignores attempts to change the email, the id or the password hash, and never touches other accounts", async () => {
    const user = await signUp(call);
    const bystander = await signUp(call);
    const r = await call("PATCH", "/api/auth/me", {
      token: user.token,
      body: { nickname: "Mine", email: "hacker@example.invalid", id: 1, passwordHash: "x" },
    });
    assert.equal(r.status, 200);
    const me = (await call("GET", "/api/auth/me", { token: user.token })).json;
    assert.equal(me.email, user.email);
    assert.equal(me.id, user.id);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } })).status, 200);
    assert.equal((await call("GET", "/api/auth/me", { token: bystander.token })).json.nickname, null);
  });

  it("needs a signed-in user", async () => {
    assert.equal((await call("GET", "/api/auth/me")).status, 401);
    assert.equal((await call("PATCH", "/api/auth/me", { body: { nickname: "x" } })).status, 401);
    assert.equal((await call("GET", "/api/auth/me", { token: "garbage" })).status, 401);
  });

  it("puts the profile in the data export", async () => {
    const user = await signUp(call);
    await call("PATCH", "/api/auth/me", { token: user.token, body: { nickname: "Exported", accent: "rose" } });
    const exp = await call("GET", "/api/habits/export", { token: user.token });
    assert.deepEqual([exp.json.profile.nickname, exp.json.profile.accent], ["Exported", "rose"]);
  });
});

describe("changing the password and deleting the account", () => {
  it("refuses a wrong current password and accepts the right one", async () => {
    const user = await signUp(call);
    const bad = await call("PATCH", "/api/auth/password", { token: user.token, body: { currentPassword: "nope-nope", newPassword: "Another-pass-456" } });
    assert.equal(bad.status, 400);
    const short = await call("PATCH", "/api/auth/password", { token: user.token, body: { currentPassword: user.password, newPassword: "short" } });
    assert.equal(short.status, 400);
    const ok = await call("PATCH", "/api/auth/password", { token: user.token, body: { currentPassword: user.password, newPassword: "Another-pass-456" } });
    assert.equal(ok.status, 204);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } })).status, 401, "the old password no longer works");
    assert.equal((await call("POST", "/api/auth/login", { body: { email: user.email, password: "Another-pass-456" } })).status, 200);
  });

  it("deletes the account and everything under it, only with the right password", async () => {
    const user = await signUp(call);
    const h = await call("POST", "/api/habits", { token: user.token, body: { name: "Gone soon" } });
    await call("POST", `/api/habits/${h.json.id}/toggle`, { token: user.token, body: { date: day(0) } });

    assert.equal((await call("DELETE", "/api/auth/me", { token: user.token, body: { password: "wrong-password" } })).status, 400);
    assert.equal((await call("GET", "/api/auth/me", { token: user.token })).status, 200, "a wrong password deletes nothing");

    assert.equal((await call("DELETE", "/api/auth/me", { token: user.token, body: { password: user.password } })).status, 204);
    assert.equal((await call("GET", "/api/auth/me", { token: user.token })).status, 401);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } })).status, 401);
  });
});
