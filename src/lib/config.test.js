import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  loadConfig,
  migrateLegacy,
  saveConfig,
  tenantPath,
  tenantScopeIds,
  validConfig,
} from "./config.js";
import { fetchTelemetry } from "./telemetry.js";

const fresh = () => structuredClone(DEFAULT_CONFIG);
const storage = (values) => ({
  getItem: (key) => values[key] ?? null,
  setItem: (key, value) => {
    values[key] = value;
  },
});

test("six root tenants and five AWO children exist without inventing numbers", () => {
  const config = fresh();
  assert.equal(validConfig(config), true);
  assert.deepEqual(
    config.tenants.filter((item) => !item.parentId).map((item) => item.name),
    ["ISO", "UDSO", "LSO", "HSO", "HO", "AWO"],
  );
  assert.deepEqual(
    config.tenants
      .filter((item) => item.parentId === "awo")
      .map((item) => item.name),
    ["TSO", "DSO", "ACC", "FIF", "Bank Saqu"],
  );
  assert.equal(fetchTelemetry(config).length, 12);
});

test("parent scope aggregates children, child and empty tenant remain isolated", () => {
  const config = fresh();
  const rows = fetchTelemetry(config);
  for (const [id, expected] of [
    ["awo", 12],
    ["awo-tso", 6],
    ["awo-dso", 6],
    ["iso", 0],
    ["awo-acc", 0],
    ["", 12],
    ["unknown", 0],
  ]) {
    const scope = tenantScopeIds(config.tenants, id);
    assert.equal(
      rows.filter((row) => scope.has(row.tenantId)).length,
      expected,
    );
  }
  assert.equal(tenantPath(config.tenants, "awo-tso"), "AWO / TSO");
});

test("legacy services and numbers survive migration; unknown services are not guessed", () => {
  const legacy = {
    services: [
      { name: "TSO - AWO", numbers: ["0815", "0816"] },
      { name: "Other Support", numbers: ["+62812123"] },
    ],
  };
  const migrated = migrateLegacy(legacy);
  assert.equal(validConfig(migrated), true);
  assert.equal(migrated.services[0].tenantId, "awo-tso");
  assert.deepEqual(migrated.services[0].numbers, legacy.services[0].numbers);
  assert.equal(migrated.services[1].tenantId, "unassigned");
  assert.equal(tenantPath(migrated.tenants, "unassigned"), "Belum dipetakan");
  assert.deepEqual(
    loadConfig(
      storage({
        [LEGACY_STORAGE_KEY]: JSON.stringify(legacy),
        [STORAGE_KEY]: "broken",
      }),
    ),
    migrated,
  );
});

test("rejects cycles, orphan services, duplicate siblings and duplicate identities", () => {
  const cases = [
    (config) => {
      config.tenants.find((t) => t.id === "awo").parentId = "awo-tso";
    },
    (config) => {
      config.services[0].tenantId = "missing";
    },
    (config) => {
      config.tenants.push({ id: "other-iso", name: "iso", parentId: null });
    },
    (config) => {
      config.services[1].id = config.services[0].id;
    },
    (config) => {
      config.services[0].numbers = ["0815", "0815"];
    },
  ];
  for (const change of cases) {
    const config = fresh();
    change(config);
    assert.equal(validConfig(config), false);
  }
});

test("same service name and phone in different tenants produce distinct row identities", () => {
  const config = fresh();
  config.services = [
    { id: "iso-support", tenantId: "iso", name: "Support", numbers: ["0815"] },
    { id: "ho-support", tenantId: "ho", name: "Support", numbers: ["0815"] },
  ];
  assert.equal(validConfig(config), true);
  const rows = fetchTelemetry(config);
  assert.notEqual(rows[0].id, rows[1].id);
  assert.notEqual(rows[0].serviceLabel, rows[1].serviceLabel);
  assert.equal(rows[0].tenantPath, "ISO");
  assert.equal(rows[1].tenantPath, "HO");
});

test("configuration persistence uses v3 and leaves original v2 data intact", () => {
  const values = { [LEGACY_STORAGE_KEY]: "original" };
  saveConfig(fresh(), storage(values));
  assert.deepEqual(loadConfig(storage(values)), fresh());
  assert.equal(values[LEGACY_STORAGE_KEY], "original");
  assert.throws(() => saveConfig({ services: [] }, storage(values)));
});

test("tenants without services are valid; blocked storage falls back to an independent default", () => {
  const config = fresh();
  config.services = [];
  assert.equal(validConfig(config), true);
  assert.deepEqual(fetchTelemetry(config), []);
  const fallback = loadConfig({
    getItem() {
      throw new Error("blocked");
    },
  });
  fallback.tenants[0].name = "edited";
  assert.equal(DEFAULT_CONFIG.tenants[0].name, "ISO");
});
