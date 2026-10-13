import { test } from "node:test";
import assert from "node:assert/strict";
import { exportFileName } from "./exportDownload";

test("the server's file name is used when it is a plain name", () => {
  assert.equal(
    exportFileName('attachment; filename="habbit-export-2026-10-12.json"', "json", "2026-10-12"),
    "habbit-export-2026-10-12.json",
  );
});

test("a missing header falls back to a dated name", () => {
  assert.equal(exportFileName(null, "csv", "2026-10-12"), "habbit-export-2026-10-12.csv");
});

test("a file name with folders or odd characters is not trusted", () => {
  assert.equal(
    exportFileName('attachment; filename="../../evil name.json"', "json", "2026-10-12"),
    "habbit-export-2026-10-12.json",
  );
  assert.equal(
    exportFileName('attachment; filename="a/b.csv"', "csv", "2026-10-12"),
    "habbit-export-2026-10-12.csv",
  );
});
