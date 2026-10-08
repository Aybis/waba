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

// One-time demo expansion requested by the user. Never replaces existing numbers.
export function withDemoNumbers(config) {
  const next = structuredClone(config);
  next.businessUnits.forEach((unit, index) => {
    if (
      next.accounts.some(
        (account) =>
          account.businessUnitId === unit.id && account.numbers.length,
      )
    )
      return;
    let id = `demo-${unit.id}`;
    while (next.accounts.some((account) => account.id === id)) id += "-sample";
    next.accounts.push({
      id,
      businessUnitId: unit.id,
      name: `${unit.name} Demo`,
      wabaId: `DEMO-${String(index + 1).padStart(3, "0")}`,
      numbers: Array.from({ length: 2 + (index % 2) }, (_, i) => ({
        id: `${id}-number-${i + 1}`,
        number: `08${String(index + 1).padStart(2, "0")}xx${i + 1}`,
        displayName: `${unit.name} Agent ${i + 1}`,
      })),
    });
  });
  // Replace only the original four-digit simulation placeholders, which were
  // duplicated between TSO and DSO. Preserve user-entered real phone numbers.
  next.accounts.forEach((account) => {
    const unitIndex = next.businessUnits.findIndex(
      (unit) => unit.id === account.businessUnitId,
    );
    account.numbers = account.numbers.map((phone, index) =>
      /^08(15|16|17|18|19|20)$/.test(phone.number)
        ? {
            ...phone,
            number: `08${String(unitIndex + 1).padStart(2, "0")}xx${index + 1}`,
          }
        : phone,
    );
  });
  next.demoCoverageVersion = 2;
  return next;
}
export function loadDemoWorkspace(storage = globalThis.localStorage) {
  const config = loadConfig(storage);
  if (config.demoCoverageVersion === 2) return config;
  const expanded = withDemoNumbers(config);
  try {
    saveConfig(expanded, storage);
  } catch {
    /* Demo remains usable without storage. */
  }
  return expanded;
}
