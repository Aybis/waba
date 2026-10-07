export const STORAGE_KEY = "waba-monitor-config-v4";
export const LEGACY_STORAGE_KEY = "waba-monitor-config-v2";
export const DEFAULT_CONFIG = {
  businessUnits: [
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
  ].map((name) => ({ id: name.toLowerCase().replaceAll(" ", "-"), name })),
  accounts: [
    {
      id: "tso-demo",
      businessUnitId: "tso",
      name: "TSO",
      wabaId: "11234",
      numbers: [
        { id: "tasya", number: "0812xx", displayName: "Tasya" },
        { id: "cilandak", number: "0813xx", displayName: "TSO - Cilandak" },
      ],
    },
  ],
};
const nonempty = (value) => typeof value === "string" && !!value.trim();
const unique = (values) => new Set(values).size === values.length;
export function validConfig(c) {
  if (
    !c ||
    !Array.isArray(c.businessUnits) ||
    !c.businessUnits.length ||
    !Array.isArray(c.accounts)
  )
    return false;
  const units = c.businessUnits,
    accounts = c.accounts;
  return (
    units.every((u) => u && nonempty(u.id) && nonempty(u.name)) &&
    unique(units.map((u) => u.id)) &&
    accounts.every(
      (a) =>
        a &&
        nonempty(a.id) &&
        nonempty(a.name) &&
        typeof a.wabaId === "string" &&
        units.some((u) => u.id === a.businessUnitId) &&
        Array.isArray(a.numbers) &&
        a.numbers.every(
          (n) =>
            n &&
            nonempty(n.id) &&
            nonempty(n.number) &&
            typeof n.displayName === "string",
        ) &&
        unique(a.numbers.map((n) => n.id)) &&
        unique(a.numbers.map((n) => n.number.trim())),
    ) &&
    unique(accounts.map((a) => a.id))
  );
}
export const tenantPath = (units, id) =>
  units.find((u) => u.id === id)?.name || "";
export const tenantScopeIds = (units, id) =>
  new Set(units.filter((u) => !id || u.id === id).map((u) => u.id));
export const accountLabel = (account) =>
  `${account.name}${account.wabaId ? ` · ${account.wabaId}` : ""}`;
export const serviceLabel = (config, account) => accountLabel(account);
export function migrateLegacy(old) {
  if (!old || !Array.isArray(old.services)) return null;
  const businessUnits =
    old.tenants?.map(({ id, name }) => ({ id, name })) ||
    structuredClone(DEFAULT_CONFIG.businessUnits);
  const accounts = old.services.map((s, i) => {
    let businessUnitId = s.tenantId;
    if (!businessUnitId) {
      const name = s.name?.replace(/ - AWO$/i, "").replace(/^AWO - /i, "");
      businessUnitId = businessUnits.find(
        (u) => u.name.toLowerCase() === name?.toLowerCase(),
      )?.id;
      if (!businessUnitId) {
        businessUnitId = "unassigned";
        if (!businessUnits.some((u) => u.id === businessUnitId))
          businessUnits.push({ id: businessUnitId, name: "Belum dipetakan" });
      }
    }
    return {
      id: s.id || `migrated-${i}`,
      businessUnitId,
      name: s.name,
      wabaId: "",
      numbers: s.numbers?.map((number, j) => ({
        id: `number-${j}`,
        number,
        displayName: "",
      })),
    };
  });
  const result = { businessUnits, accounts };
  return validConfig(result) ? result : null;
}
export function loadConfig(storage = globalThis.localStorage) {
  for (const key of [
    STORAGE_KEY,
    "waba-monitor-config-v3",
    LEGACY_STORAGE_KEY,
  ]) {
    try {
      const raw = JSON.parse(storage.getItem(key));
      const value = key === STORAGE_KEY ? raw : migrateLegacy(raw);
      if (validConfig(value)) return value;
    } catch {
      /* Retain original storage; fall back without overwriting. */
    }
  }
  return structuredClone(DEFAULT_CONFIG);
}
export function saveConfig(config, storage = globalThis.localStorage) {
  if (!validConfig(config))
    throw new Error("Konfigurasi Business Unit / WABA tidak valid.");
  storage.setItem(STORAGE_KEY, JSON.stringify(config));
}
