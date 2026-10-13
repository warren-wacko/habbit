import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseIdentity, testDatabaseUrl } from "./helpers.js";

test("two connection strings are compared by host, port and database, never by password", () => {
  assert.equal(databaseIdentity("postgresql://u:secret@localhost:5432/habbit"), "localhost:5432/habbit");
  assert.equal(databaseIdentity("postgresql://other:different@localhost/habbit"), "localhost:5432/habbit");
});

test("the tests refuse to run without a test database", () => {
  assert.throws(() => testDatabaseUrl({ DATABASE_URL: "postgresql://u:p@localhost:5432/habbit" }), /TEST_DATABASE_URL is not set/);
});

test("the tests refuse to run when the test database is the app's own database", () => {
  assert.throws(
    () =>
      testDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@localhost:5432/habbit",
        TEST_DATABASE_URL: "postgresql://x:y@localhost:5432/habbit",
      }),
    /same database/,
  );
});

test("a different database on the same server is accepted", () => {
  const url = "postgresql://u:p@localhost:5432/habbit_test";
  assert.equal(
    testDatabaseUrl({ DATABASE_URL: "postgresql://u:p@localhost:5432/habbit", TEST_DATABASE_URL: url }),
    url,
  );
});

test("a test database is accepted when the app's own address is not set at all", () => {
  const url = "postgresql://u:p@localhost:5432/habbit_test";
  assert.equal(testDatabaseUrl({ TEST_DATABASE_URL: url }), url);
});
