import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  backdateHabit,
  client,
  day,
  removeTestUsers,
  signUp,
  startApi,
  type Call,
  type RunningApi,
  type TestUser,
} from "./helpers.js";

let api: RunningApi;
let call: Call;
let me: TestUser;
let other: TestUser;

before(async () => {
  await removeTestUsers();
  api = await startApi();
  call = client(api.base);
  me = await signUp(call);
  other = await signUp(call);
});

after(async () => {
  await api.stop();
  await removeTestUsers();
});

/** Create a habit for `me`, optionally made to look like it was created `backdate` days ago */
async function habit(body: Record<string, unknown> = {}, backdate = 0) {
  const res = await call("POST", "/api/habits", { token: me.token, body: { name: "Test habit", ...body } });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  if (backdate) await backdateHabit(res.json.id, backdate);
  return res.json as { id: number; target: number; unit: string | null };
}

/** The list for a date, as the Today screen reads it */
async function listFor(date: string, token = me.token) {
  const res = await call("GET", `/api/habits?date=${date}`, { token });
  assert.equal(res.status, 200);
  return res.json as any[];
}
const stateOf = async (id: number, date: string) => (await listFor(date)).find((h) => h.id === id);

describe("ticking and the start-day rule", () => {
  it("ticks today, undoes it with a second tap, and ignores other people's habits", async () => {
    const h = await habit();
    let r = await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    assert.equal(r.status, 200);
    assert.equal(r.json.done, true);
    assert.equal((await stateOf(h.id, day(0))).doneOnDate, true);
    r = await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    assert.equal(r.json.done, false);
    r = await call("POST", `/api/habits/${h.id}/toggle`, { token: other.token, body: { date: day(0) } });
    assert.equal(r.status, 404);
  });

  it("refuses days before a habit existed, but allows one day of slack", async () => {
    const h = await habit();
    assert.equal((await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(-1) } })).status, 200);
    const early = await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(-2) } });
    assert.equal(early.status, 400);
    assert.match(early.json.error, /did not exist/);
    assert.equal((await stateOf(h.id, day(-2))).doneOnDate, false, "a refused tick leaves nothing behind");
  });

  it("applies the same rule to amounts, count-as-done and skips", async () => {
    const h = await habit({ target: 10, unit: "pages" });
    for (const [path, body] of [
      [`/api/habits/${h.id}/progress`, { date: day(-3), amount: 3 }],
      [`/api/habits/${h.id}/count-as-done`, { date: day(-3) }],
      [`/api/habits/${h.id}/skip`, { date: day(-3) }],
    ] as const) {
      const r = await call("POST", path, { token: me.token, body });
      assert.equal(r.status, 400, path);
    }
  });

  it("allows older days once the habit is old enough, up to a year back, never the future", async () => {
    const h = await habit({}, 30);
    assert.equal((await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(-20) } })).status, 200);
    assert.equal((await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: "2099-01-01" } })).status, 400);
    const old = await habit({}, 400);
    assert.equal((await call("POST", `/api/habits/${old.id}/toggle`, { token: me.token, body: { date: day(-366) } })).status, 400);
    assert.equal((await call("POST", `/api/habits/${old.id}/toggle`, { token: me.token, body: { date: day(-300) } })).status, 200);
  });
});

describe("skipping a day", () => {
  it("skips a scheduled day, shows it everywhere, and un-skips with a second tap", async () => {
    const h = await habit({}, 5);
    const date = day(-1);
    let r = await call("POST", `/api/habits/${h.id}/skip`, { token: me.token, body: { date } });
    assert.deepEqual([r.status, r.json.skipped], [200, true]);
    assert.equal((await stateOf(h.id, date)).skippedOnDate, true);

    const hist = await call("GET", `/api/habits/history?from=${day(-5)}&to=${day(0)}`, { token: me.token });
    assert.ok(hist.json.habits.find((x: any) => x.id === h.id).skips.includes(date));

    const stats = await call("GET", `/api/habits/stats?days=7&today=${day(0)}`, { token: me.token });
    assert.equal(stats.json.habits.find((x: any) => x.id === h.id).scheduled, 6, "a skipped day comes off the scheduled count");

    const exp = await call("GET", "/api/habits/export", { token: me.token });
    assert.ok(exp.json.habits.find((x: any) => x.id === h.id).skippedDates.includes(date));

    r = await call("POST", `/api/habits/${h.id}/skip`, { token: me.token, body: { date } });
    assert.equal(r.json.skipped, false);
  });

  it("is replaced by a tick, and cannot be added to a done day", async () => {
    const h = await habit({}, 5);
    const date = day(-1);
    await call("POST", `/api/habits/${h.id}/skip`, { token: me.token, body: { date } });
    const tick = await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date } });
    assert.equal(tick.json.done, true);
    const hist = await call("GET", `/api/habits/history?from=${day(-5)}&to=${day(0)}`, { token: me.token });
    assert.equal(hist.json.habits.find((x: any) => x.id === h.id).skips.length, 0, "the skip is gone");
    const again = await call("POST", `/api/habits/${h.id}/skip`, { token: me.token, body: { date } });
    assert.equal(again.status, 409);
  });

  it("refuses an unscheduled day, a future day, and someone else's habit", async () => {
    const weekdays = await habit({ scheduleDays: 0b0011111, name: "Weekdays" }, 10);
    let saturday = "";
    for (let i = -6; i <= 0; i++) if (new Date(day(i) + "T00:00:00Z").getUTCDay() === 6) saturday = day(i);
    assert.equal((await call("POST", `/api/habits/${weekdays.id}/skip`, { token: me.token, body: { date: saturday } })).status, 400);
    assert.equal((await call("POST", `/api/habits/${weekdays.id}/skip`, { token: me.token, body: { date: "2099-01-01" } })).status, 400);
    assert.equal((await call("POST", `/api/habits/${weekdays.id}/skip`, { token: other.token, body: { date: day(0) } })).status, 404);
  });
});

describe("goals, progress and count as done", () => {
  it("creates a counted habit with a unit and validates the limits", async () => {
    const h = await habit({ target: 20, unit: "pages" });
    assert.equal(h.target, 20);
    assert.equal(h.unit, "pages");
    for (const bad of [{ target: 10001 }, { target: 0 }, { target: 2.5 }, { target: 2, unit: "x".repeat(21) }]) {
      const r = await call("POST", "/api/habits", { token: me.token, body: { name: "Bad", ...bad } });
      assert.equal(r.status, 400, JSON.stringify(bad));
    }
  });

  it("a day is done when the amount reaches the goal, and amounts are bounded", async () => {
    const h = await habit({ target: 20, unit: "pages" });
    let r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(0), amount: 12 } });
    assert.deepEqual([r.json.done, r.json.amount], [false, 12]);
    let s = await stateOf(h.id, day(0));
    assert.deepEqual([s.amountOnDate, s.targetOnDate, s.doneOnDate], [12, 20, false]);
    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(0), amount: 20 } });
    assert.equal(r.json.done, true);
    assert.equal((await stateOf(h.id, day(0))).doneOnDate, true);
    for (const amount of [201, -1, 2.5, "5"]) {
      const bad = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(0), amount } });
      assert.equal(bad.status, 400, String(amount));
    }
    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(0), amount: 0 } });
    assert.equal(r.json.done, false);
    s = await stateOf(h.id, day(0));
    assert.deepEqual([s.amountOnDate, s.doneOnDate], [null, false], "an amount of 0 clears the day");
  });

  it("a finished day keeps its own goal when the goal is raised (Monday and Wednesday)", async () => {
    const h = await habit({ target: 20, unit: "pages", name: "Read" }, 10);
    const monday = day(-2);
    const wednesday = day(0);
    await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: monday, amount: 20 } });
    assert.equal((await stateOf(h.id, monday)).doneOnDate, true);

    const raise = await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { target: 30, today: day(0) } });
    assert.equal(raise.status, 200);

    const m = await stateOf(h.id, monday);
    assert.deepEqual([m.doneOnDate, m.amountOnDate, m.targetOnDate, m.target], [true, 20, 20, 30], "Monday stays done under 20");
    const hist = await call("GET", `/api/habits/history?from=${day(-5)}&to=${day(0)}`, { token: me.token });
    assert.ok(hist.json.habits.find((x: any) => x.id === h.id).dates.includes(monday));

    let r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: wednesday, amount: 25 } });
    assert.deepEqual([r.json.done, r.json.target], [false, 30], "Wednesday needs the new 30");
    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: wednesday, amount: 30 } });
    assert.equal(r.json.done, true);

    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: monday, amount: 25 } });
    assert.deepEqual([r.json.done, r.json.target], [true, 20], "editing Monday keeps it done under its own 20");
    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: monday, amount: 15 } });
    assert.equal(r.json.done, false, "dropping below its own goal un-does it");
    const after = await stateOf(h.id, monday);
    assert.deepEqual([after.doneOnDate, after.targetOnDate, after.amountOnDate], [false, 30, 15], "and it now follows the new goal");
  });

  it("ticking a counted habit in one go counts as the full goal, and unticking clears it", async () => {
    const h = await habit({ target: 30, unit: "minutes" });
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    let s = await stateOf(h.id, day(0));
    assert.deepEqual([s.doneOnDate, s.amountOnDate, s.targetOnDate], [true, 30, 30]);
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    s = await stateOf(h.id, day(0));
    assert.deepEqual([s.doneOnDate, s.amountOnDate], [false, null]);
  });

  it("a plain habit that becomes counted keeps its old tick as done", async () => {
    const h = await habit({}, 5);
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(-1) } });
    await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { target: 5, unit: "reps" } });
    const s = await stateOf(h.id, day(-1));
    assert.deepEqual([s.doneOnDate, s.amountOnDate, s.targetOnDate], [true, null, 1]);
  });

  it("lowering the goal finishes today if it already has enough, and never re-judges past days", async () => {
    const h = await habit({ target: 30, unit: "pages" }, 10);
    await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(-3), amount: 20 } });
    await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(0), amount: 12 } });
    const r = await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { target: 10, today: day(0) } });
    assert.equal(r.status, 200);
    const today = await stateOf(h.id, day(0));
    assert.deepEqual([today.doneOnDate, today.targetOnDate], [true, 10]);
    const past = await stateOf(h.id, day(-3));
    assert.deepEqual([past.doneOnDate, past.amountOnDate], [false, 20], "the past day is left alone");

    const raised = await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { target: 40, today: day(0) } });
    assert.equal(raised.status, 200);
    const keep = await stateOf(h.id, day(0));
    assert.deepEqual([keep.doneOnDate, keep.targetOnDate, keep.target], [true, 10, 40], "a finished day keeps its goal");

    assert.equal((await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { target: 5, today: "2030-01-01" } })).status, 400);
    assert.equal((await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { today: day(0) } })).status, 400, "a date alone is nothing to update");
  });

  it("count as done makes what was done that day's goal, and the habit's goal stays", async () => {
    const h = await habit({ target: 30, unit: "minutes" });
    const today = day(0);
    await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: today, amount: 10 } });
    let r = await call("POST", `/api/habits/${h.id}/count-as-done`, { token: me.token, body: { date: today } });
    assert.deepEqual([r.status, r.json.done, r.json.target], [200, true, 10]);
    const s = await stateOf(h.id, today);
    assert.deepEqual([s.doneOnDate, s.amountOnDate, s.targetOnDate, s.target], [true, 10, 10, 30]);

    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: today, amount: 11 } });
    assert.deepEqual([r.json.done, r.json.target], [true, 10], "adding one more keeps it done");
    r = await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: today, amount: 8 } });
    assert.deepEqual([r.json.done, r.json.target], [false, 30], "dropping below what was counted un-does it");
    r = await call("POST", `/api/habits/${h.id}/count-as-done`, { token: me.token, body: { date: today } });
    assert.equal(r.json.target, 8, "and it can be counted again at the new amount");
  });

  it("count as done refuses days with no progress, days that already reached the goal, and other people", async () => {
    const h = await habit({ target: 30, unit: "minutes" }, 5);
    assert.equal((await call("POST", `/api/habits/${h.id}/count-as-done`, { token: me.token, body: { date: day(-1) } })).status, 409);
    await call("POST", `/api/habits/${h.id}/progress`, { token: me.token, body: { date: day(-1), amount: 30 } });
    assert.equal((await call("POST", `/api/habits/${h.id}/count-as-done`, { token: me.token, body: { date: day(-1) } })).status, 409);
    assert.equal((await call("POST", `/api/habits/${h.id}/count-as-done`, { token: me.token, body: { date: "2099-01-01" } })).status, 400);
    assert.equal((await call("POST", `/api/habits/${h.id}/count-as-done`, { token: other.token, body: { date: day(-1) } })).status, 404);
  });
});

describe("notes", () => {
  it("adds a trimmed note, lists newest first, keeps line breaks, and replaces on edit", async () => {
    const h = await habit({}, 10);
    let r = await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "  felt great  " } });
    assert.deepEqual([r.status, r.json.text], [200, "felt great"]);
    assert.equal((await stateOf(h.id, day(0))).note, "felt great");
    assert.equal((await stateOf(h.id, day(-1))).note, null);

    await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(-3), text: "short one\nsecond line" } });
    let list = await call("GET", `/api/habits/${h.id}/notes`, { token: me.token });
    assert.deepEqual(list.json.map((n: any) => n.date), [day(0), day(-3)]);
    assert.equal(list.json[1].text, "short one\nsecond line");

    await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "changed my mind" } });
    list = await call("GET", `/api/habits/${h.id}/notes`, { token: me.token });
    assert.equal(list.json.length, 2, "editing replaces, it does not add");
    assert.equal(list.json[0].text, "changed my mind");
  });

  it("survives ticking and un-ticking, and works on days that were never done", async () => {
    const h = await habit({}, 10);
    await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "keep me" } });
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(0) } });
    assert.equal((await stateOf(h.id, day(0))).note, "keep me");
    await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(-4), text: "a missed day" } });
    assert.equal((await stateOf(h.id, day(-4))).note, "a missed day");
  });

  it("returns markup as plain text and enforces its limits", async () => {
    const h = await habit({}, 10);
    const evil = '<script>alert(1)</script> =HYPERLINK("x")';
    let r = await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: evil } });
    assert.equal(r.json.text, evil);
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "x".repeat(281) } })).status, 400);
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "x".repeat(280) } })).status, 200);
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: "2099-01-01", text: "future" } })).status, 400);
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(-400), text: "old" } })).status, 400);
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: 5 } })).status, 400);
    r = await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "   " } });
    assert.equal(r.json.text, null, "empty text removes the note");
  });

  it("keeps notes private and removes them with the habit", async () => {
    const h = await habit({}, 10);
    await call("PUT", `/api/habits/${h.id}/note`, { token: me.token, body: { date: day(0), text: "mine" } });
    assert.equal((await call("PUT", `/api/habits/${h.id}/note`, { token: other.token, body: { date: day(0), text: "yours now" } })).status, 404);
    assert.equal((await call("GET", `/api/habits/${h.id}/notes`, { token: other.token })).status, 404);
    assert.equal((await call("GET", `/api/habits/${h.id}/notes`, { ip: "10.9.9.9" })).status, 401);
    const exp = await call("GET", "/api/habits/export", { token: me.token });
    assert.equal(exp.json.habits.find((x: any) => x.id === h.id).notes.length, 1, "the export carries notes");
    await call("DELETE", `/api/habits/${h.id}`, { token: me.token });
    const after = await call("GET", "/api/habits/export", { token: me.token });
    assert.equal(after.json.habits.find((x: any) => x.id === h.id), undefined);
  });
});

describe("order and time of day", () => {
  // a fresh account, so the order of its habits is predictable
  let owner: TestUser;
  const names = async () => (await listFor(day(0), owner.token)).map((h) => `${h.name}:${h.timeOfDay}`).join(",");
  const make = async (name: string, extra: Record<string, unknown> = {}) =>
    (await call("POST", "/api/habits", { token: owner.token, body: { name, ...extra } })).json;

  it("lists habits in creation order with new ones last, and saves time of day", async () => {
    owner = await signUp(call);
    await make("A");
    await make("B", { timeOfDay: "morning" });
    await make("C", { timeOfDay: "evening" });
    assert.equal(await names(), "A:anytime,B:morning,C:evening");
  });

  it("saves a new order and the history follows it", async () => {
    const list = await listFor(day(0), owner.token);
    const [a, b, c] = ["A", "B", "C"].map((n) => list.find((h) => h.name === n).id);
    const r = await call("PUT", "/api/habits/order", { token: owner.token, body: { ids: [c, a, b] } });
    assert.equal(r.status, 200);
    assert.equal(await names(), "C:evening,A:anytime,B:morning");
    const hist = await call("GET", `/api/habits/history?from=${day(-3)}&to=${day(0)}`, { token: owner.token });
    assert.deepEqual(hist.json.habits.map((h: any) => h.name), ["C", "A", "B"]);
    await make("D");
    assert.equal(await names(), "C:evening,A:anytime,B:morning,D:anytime", "a habit made later lands last");
  });

  it("refuses bad orders: duplicates, empty, too many, non-numbers, no sign-in, someone else's habit", async () => {
    const list = await listFor(day(0), owner.token);
    const d = list.find((h) => h.name === "D").id;
    const put = (body: unknown, token?: string) => call("PUT", "/api/habits/order", { token, body });
    assert.equal((await put({ ids: [d, d] }, owner.token)).status, 400);
    assert.equal((await put({ ids: [] }, owner.token)).status, 400);
    assert.equal((await put({ ids: Array.from({ length: 201 }, (_, i) => i + 1) }, owner.token)).status, 400);
    assert.equal((await put({ ids: ["x"] }, owner.token)).status, 400);
    assert.equal((await put({ ids: [d] })).status, 401);

    const theirs = (await call("POST", "/api/habits", { token: other.token, body: { name: "Theirs" } })).json;
    const before = await names();
    assert.equal((await put({ ids: [d, theirs.id] }, owner.token)).status, 404);
    assert.equal(await names(), before, "the order did not change");
    const theirList = await listFor(day(0), other.token);
    assert.equal(theirList.find((h) => h.id === theirs.id).timeOfDay, "anytime", "their habit was not touched");
  });

  it("saves order and time-of-day changes together, and refuses unsafe ones", async () => {
    const list = await listFor(day(0), owner.token);
    const id = (n: string) => list.find((h) => h.name === n).id;
    const a = id("A"), b = id("B"), c = id("C");
    let r = await call("PUT", "/api/habits/order", { token: owner.token, body: { ids: [a, b, c], timeOfDay: { [a]: "morning", [b]: "afternoon" } } });
    assert.equal(r.status, 200);
    assert.match(await names(), /^A:morning,B:afternoon,C:evening/);

    for (const timeOfDay of [{ [id("D")]: "morning" }, { [a]: "midnight" }, { x: "morning" }]) {
      r = await call("PUT", "/api/habits/order", { token: owner.token, body: { ids: [a], timeOfDay } });
      assert.equal(r.status, 400, JSON.stringify(timeOfDay));
    }
    const theirs = (await call("POST", "/api/habits", { token: other.token, body: { name: "T2" } })).json;
    r = await call("PUT", "/api/habits/order", { token: owner.token, body: { ids: [a], timeOfDay: { [theirs.id]: "evening" } } });
    assert.equal(r.status, 400, "a time for someone else's habit is refused");
  });

  it("edits and validates the time of day on a single habit", async () => {
    const list = await listFor(day(0), owner.token);
    const a = list.find((h) => h.name === "A").id;
    assert.equal((await call("PATCH", `/api/habits/${a}`, { token: owner.token, body: { timeOfDay: "afternoon" } })).status, 200);
    assert.equal((await listFor(day(0), owner.token)).find((h) => h.id === a).timeOfDay, "afternoon");
    assert.equal((await call("PATCH", `/api/habits/${a}`, { token: owner.token, body: { timeOfDay: "midnight" } })).status, 400);
    assert.equal((await call("POST", "/api/habits", { token: owner.token, body: { name: "Bad", timeOfDay: "noon" } })).status, 400);
  });
});

describe("history, stats, insights and export", () => {
  it("history lists finished days, and its range is validated", async () => {
    const h = await habit({}, 10);
    await call("POST", `/api/habits/${h.id}/toggle`, { token: me.token, body: { date: day(-2) } });
    const r = await call("GET", `/api/habits/history?from=${day(-5)}&to=${day(0)}`, { token: me.token });
    assert.ok(r.json.habits.find((x: any) => x.id === h.id).dates.includes(day(-2)));
    assert.equal((await call("GET", `/api/habits/history?from=${day(0)}&to=${day(-5)}`, { token: me.token })).status, 400);
    assert.equal((await call("GET", `/api/habits/history?from=${day(-400)}&to=${day(0)}`, { token: me.token })).status, 400);
  });

  it("stats and insights return their shapes and validate their ranges", async () => {
    const stats = await call("GET", `/api/habits/stats?days=7&today=${day(0)}`, { token: me.token });
    assert.equal(stats.status, 200);
    assert.ok(Array.isArray(stats.json.habits));
    assert.equal((await call("GET", "/api/habits/stats?days=0", { token: me.token })).status, 400);
    const insights = await call("GET", `/api/habits/insights?days=90&today=${day(0)}`, { token: me.token });
    assert.equal(insights.status, 200);
    assert.ok("weekdays" in insights.json && "trend" in insights.json);
    assert.equal((await call("GET", "/api/habits/insights?days=10", { token: me.token })).status, 400);
  });

  it("the JSON export is a full backup and the CSV has its header", async () => {
    const exp = await call("GET", "/api/habits/export", { token: me.token });
    assert.equal(exp.status, 200);
    assert.equal(exp.json.app, "habbit");
    assert.equal(exp.json.profile.accent, "volt");
    const first = exp.json.habits[0];
    for (const key of ["target", "unit", "timeOfDay", "sortOrder", "completedDates", "skippedDates", "progress", "notes"]) {
      assert.ok(key in first, `export is missing ${key}`);
    }
    const csv = await fetch(`${api.base}/api/habits/export?format=csv`, { headers: { authorization: `Bearer ${me.token}` } });
    const text = await csv.text();
    assert.ok(text.startsWith("completed_on,habit,habit_archived"));
    assert.ok(!text.includes("felt great"), "notes are not in the CSV");
    assert.equal((await call("GET", "/api/habits/export?format=xml", { token: me.token })).status, 400);
  });

  it("archived habits leave Today and come back when restored", async () => {
    const h = await habit({ name: "Archive me" });
    assert.equal((await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { archived: true } })).status, 200);
    assert.equal((await listFor(day(0))).find((x) => x.id === h.id), undefined);
    const archived = await call("GET", `/api/habits?date=${day(0)}&archived=true`, { token: me.token });
    assert.ok(archived.json.find((x: any) => x.id === h.id));
    await call("PATCH", `/api/habits/${h.id}`, { token: me.token, body: { archived: false } });
    assert.ok((await listFor(day(0))).find((x) => x.id === h.id));
  });

  it("habit routes refuse a missing or invalid token", async () => {
    assert.equal((await call("GET", `/api/habits?date=${day(0)}`, { ip: "10.9.9.8" })).status, 401);
    assert.equal((await call("GET", `/api/habits?date=${day(0)}`, { token: "not-a-token" })).status, 401);
  });
});
