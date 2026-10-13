import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  EVERY_DAY,
  isScheduled,
  parseLocal,
  scheduleLabel,
  toISO,
  weekOf,
} from "./dates";

test("toISO and parseLocal round-trip a calendar day", () => {
  assert.equal(toISO(parseLocal("2026-10-12")), "2026-10-12");
  assert.equal(toISO(parseLocal("2026-01-01")), "2026-01-01");
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-12", 7), "2026-10-19");
  assert.equal(addDays("2026-10-01", -1), "2026-09-30");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("weekOf returns Monday to Sunday containing the day", () => {
  const expected = [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ];
  assert.deepEqual(weekOf("2026-10-12"), expected); // a Monday
  assert.deepEqual(weekOf("2026-10-15"), expected); // mid-week
  assert.deepEqual(weekOf("2026-10-18"), expected); // a Sunday
});

test("isScheduled reads the bitmask with Monday as bit 0", () => {
  const weekdays = 0b0011111;
  assert.equal(isScheduled("2026-10-12", weekdays), true); // Monday
  assert.equal(isScheduled("2026-10-16", weekdays), true); // Friday
  assert.equal(isScheduled("2026-10-17", weekdays), false); // Saturday
  assert.equal(isScheduled("2026-10-18", weekdays), false); // Sunday
});

test("scheduleLabel names common schedules and lists the rest", () => {
  assert.equal(scheduleLabel(EVERY_DAY), "");
  assert.equal(scheduleLabel(0b0011111), "Weekdays");
  assert.equal(scheduleLabel(0b1100000), "Weekends");
  assert.equal(scheduleLabel(0b0010101), "Mon · Wed · Fri");
});
