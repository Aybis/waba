import test from "node:test";
import assert from "node:assert/strict";
import { businessTheme } from "./business-colors.js";
import { withDemoNumbers } from "./config.js";
test("eleven BUs have distinct stable colors and TSO is green", () => {
  const names = [
    "ISO",
    "UDSO",
    "LSO",
    "HSO",
    "HO",
    "AWO",
    "TSO",
    "DSO",
    "ACC",
    "FIF",
    "Bank Saqu",
  ];
  assert.equal(
    new Set(names.map((name) => businessTheme(name, name).accent)).size,
    11,
  );
  assert.equal(businessTheme("awo-tso", "TSO").accent, "#288255");
  assert.deepEqual(
    businessTheme("awo-tso", "TSO"),
    businessTheme("tso", "TSO"),
  );
});
test("original duplicate sample numbers become unique across business units", () => {
  const config = {
    businessUnits: [
      { id: "tso", name: "TSO" },
      { id: "dso", name: "DSO" },
    ],
    accounts: ["tso", "dso"].map((id) => ({
      id,
      businessUnitId: id,
      name: id,
      wabaId: "",
      numbers: [{ id: "one", number: "0815", displayName: "" }],
    })),
  };
  const result = withDemoNumbers(config);
  assert.equal(
    new Set(result.accounts.flatMap((a) => a.numbers.map((n) => n.number)))
      .size,
    2,
  );
  assert.deepEqual(withDemoNumbers(result), result);
});
