import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExport, csvCell, toCsv, type ExportHabit } from "./exportData.js";

const habit = (over: Partial<ExportHabit> = {}): ExportHabit => ({
  id: 1,
  name: "Morning run",
  color: "coral",
  icon: "🏃",
  scheduleDays: 127,
  archivedAt: null,
  createdAt: new Date("2026-09-01T08:00:00.000Z"),
  logs: [
    { date: new Date("2026-10-11T00:00:00.000Z") },
    { date: new Date("2026-10-10T00:00:00.000Z") },
  ],
  ...over,
});

const NOW = new Date("2026-10-12T10:00:00.000Z");

test("buildExport keeps every habit field and sorts the completed dates", () => {
  const out = buildExport([habit()], NOW);
  assert.equal(out.app, "habbit");
  assert.equal(out.version, 1);
  assert.equal(out.exportedAt, "2026-10-12T10:00:00.000Z");
  assert.deepEqual(out.habits[0], {
    id: 1,
    name: "Morning run",
    color: "coral",
    icon: "🏃",
    scheduleDays: 127,
    archived: false,
    archivedAt: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    completedDates: ["2026-10-10", "2026-10-11"],
    skippedDates: [],
    target: 1,
    unit: null,
    timeOfDay: "anytime",
    sortOrder: 0,
    progress: [],
    notes: [],
  });
});

test("buildExport includes archived habits and marks them", () => {
  const archivedAt = new Date("2026-10-01T00:00:00.000Z");
  const out = buildExport([habit({ archivedAt })], NOW);
  assert.equal(out.habits[0].archived, true);
  assert.equal(out.habits[0].archivedAt, "2026-10-01T00:00:00.000Z");
});

test("csvCell quotes commas, quotes and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
});

test("csvCell defuses spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("normal - dash"), "normal - dash");
});

test("toCsv writes a header and one row per completed day, oldest first", () => {
  const out = buildExport(
    [
      habit({ id: 1, name: "Run" }),
      habit({
        id: 2,
        name: "Read, daily",
        logs: [{ date: new Date("2026-10-09T00:00:00.000Z") }],
      }),
    ],
    NOW,
  );
  assert.equal(
    toCsv(out),
    [
      "completed_on,habit,habit_archived",
      '2026-10-09,"Read, daily",false',
      "2026-10-10,Run,false",
      "2026-10-11,Run,false",
      "",
    ].join("\r\n"),
  );
});

test("toCsv of an empty account is just the header", () => {
  assert.equal(toCsv(buildExport([], NOW)), "completed_on,habit,habit_archived\r\n");
});

test("the JSON export lists skipped days", () => {
  const data = buildExport(
    [
      {
        id: 1,
        name: "Read",
        color: "volt",
        icon: null,
        scheduleDays: 127,
        archivedAt: null,
        createdAt: new Date("2026-10-01T00:00:00Z"),
        logs: [],
        skips: [{ date: new Date("2026-10-05T00:00:00Z") }, { date: new Date("2026-10-03T00:00:00Z") }],
      },
    ],
    new Date("2026-10-12T00:00:00Z"),
  );
  assert.deepEqual(data.habits[0].skippedDates, ["2026-10-03", "2026-10-05"]);
});

test("the JSON export lists notes oldest first", () => {
  const data = buildExport(
    [
      habit({
        notes: [
          { date: new Date("2026-10-05T00:00:00Z"), text: "short one" },
          { date: new Date("2026-10-03T00:00:00Z"), text: "felt great" },
        ],
      }),
    ],
    NOW,
  );
  assert.deepEqual(data.habits[0].notes, [
    { date: "2026-10-03", text: "felt great" },
    { date: "2026-10-05", text: "short one" },
  ]);
});
