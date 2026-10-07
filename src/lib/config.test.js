import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  validConfig,
  migrateLegacy,
  loadConfig,
  saveConfig,
  STORAGE_KEY,
} from "./config.js";
import { fetchTelemetry } from "./telemetry.js";
const fresh = () => structuredClone(DEFAULT_CONFIG);
test("one BU owns multiple accounts, each with named numbers and distinct identities", () => {
  const c = fresh();
  c.accounts.push({
    ...structuredClone(c.accounts[0]),
    id: "second",
    wabaId: "222",
  });
  assert.ok(validConfig(c));
  const rows = fetchTelemetry(c);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map((r) => r.id)).size, 4);
  assert.equal(rows[0].displayName, "Tasya");
  assert.equal(rows[1].serviceId, rows[0].serviceId);
});
test("v3 migration preserves every unit, account and phone without inventing WABA IDs", () => {
  const old = {
    tenants: [
      { id: "awo", name: "AWO" },
      { id: "tso", name: "TSO", parentId: "awo" },
    ],
    services: [
      {
        id: "old",
        tenantId: "tso",
        name: "TSO - AWO",
        numbers: ["0815", "0816"],
      },
    ],
  };
  const c = migrateLegacy(old);
  assert.ok(validConfig(c));
  assert.equal(c.accounts[0].id, "old");
  assert.equal(c.accounts[0].wabaId, "");
  assert.deepEqual(
    c.accounts[0].numbers.map((n) => n.number),
    old.services[0].numbers,
  );
  assert.equal(c.businessUnits.length, 2);
  assert.deepEqual(
    loadConfig({
      getItem: (key) =>
        key === "waba-monitor-config-v3" ? JSON.stringify(old) : null,
    }),
    c,
  );
});
test("v2 unknown services preserved under unassigned", () => {
  const c = migrateLegacy({
    services: [{ name: "Other", numbers: ["+62812"] }],
  });
  assert.ok(validConfig(c));
  assert.equal(c.accounts[0].businessUnitId, "unassigned");
});
test("reject orphan account, duplicate phone, missing name; allow empty account", () => {
  for (const edit of [
    (c) => (c.accounts[0].businessUnitId = "missing"),
    (c) =>
      c.accounts[0].numbers.push({ ...c.accounts[0].numbers[0], id: "copy" }),
    (c) => (c.accounts[0].name = ""),
  ]) {
    const c = fresh();
    edit(c);
    assert.equal(validConfig(c), false);
  }
  const c = fresh();
  c.accounts[0].numbers = [];
  assert.ok(validConfig(c));
});
test("v4 roundtrip leaves previous storage unchanged and blocked storage uses fresh defaults", () => {
  const values = { "waba-monitor-config-v3": "original" };
  const storage = {
    getItem: (k) => values[k] || null,
    setItem: (k, v) => (values[k] = v),
  };
  saveConfig(fresh(), storage);
  assert.ok(values[STORAGE_KEY]);
  assert.deepEqual(loadConfig(storage), fresh());
  assert.equal(values["waba-monitor-config-v3"], "original");
  const c = loadConfig({
    getItem() {
      throw Error();
    },
  });
  c.businessUnits[0].name = "changed";
  assert.equal(DEFAULT_CONFIG.businessUnits[0].name, "ISO");
});
