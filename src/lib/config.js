export const STORAGE_KEY = "waba-monitor-config-v3";
export const LEGACY_STORAGE_KEY = "waba-monitor-config-v2";
export const DEFAULT_TENANTS = [
  ...["ISO", "UDSO", "LSO", "HSO", "HO", "AWO"].map((name) => ({
    id: name.toLowerCase(),
    name,
    parentId: null,
  })),
  ...["TSO", "DSO", "ACC", "FIF", "Bank Saqu"].map((name) => ({
    id: `awo-${name.toLowerCase().replaceAll(" ", "-")}`,
    name,
    parentId: "awo",
  })),
];
export const DEFAULT_CONFIG = {
  tenants: DEFAULT_TENANTS,
  services: [
    {
      id: "awo-tso-waba",
      name: "TSO - AWO",
      tenantId: "awo-tso",
      numbers: ["0815", "0816", "0817", "0818", "0819", "0820"],
    },
    {
      id: "awo-dso-waba",
      name: "DSO - AWO",
      tenantId: "awo-dso",
      numbers: ["0815", "0816", "0817", "0818", "0819", "0820"],
    },
  ],
};
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
export function validConfig(config) {
  if (
    !config ||
    !Array.isArray(config.tenants) ||
    !config.tenants.length ||
    !Array.isArray(config.services)
  )
    return false;
  const { tenants, services } = config;
  if (
    !tenants.every(
      (tenant) => tenant && nonempty(tenant.id) && nonempty(tenant.name),
    ) ||
    !unique(tenants.map((tenant) => tenant.id))
  )
    return false;
  if (
    !unique(
      tenants.map(
        (tenant) =>
          `${tenant.parentId || ""}|${tenant.name.trim().toLowerCase()}`,
      ),
    )
  )
    return false;
  // Two explicit levels: a root tenant or a child of a root. No cycles/orphans.
  if (
    !tenants.every(
      (tenant) =>
        tenant.parentId == null ||
        tenants.some(
          (parent) =>
            parent.id === tenant.parentId &&
            parent.id !== tenant.id &&
            parent.parentId == null,
        ),
    )
  )
    return false;
  return (
    services.every(
      (service) =>
        service &&
        nonempty(service.id) &&
        nonempty(service.name) &&
        tenants.some((tenant) => tenant.id === service.tenantId) &&
        Array.isArray(service.numbers) &&
        service.numbers.length > 0 &&
        service.numbers.every(nonempty) &&
        unique(service.numbers),
    ) &&
    unique(services.map((service) => service.id)) &&
    unique(
      services.map(
        (service) => `${service.tenantId}|${service.name.trim().toLowerCase()}`,
      ),
    )
  );
}
export function tenantPath(tenants, id) {
  const tenant = tenants.find((item) => item.id === id);
  if (!tenant) return "";
  const parent = tenants.find((item) => item.id === tenant.parentId);
  return parent ? `${parent.name} / ${tenant.name}` : tenant.name;
}
export function tenantScopeIds(tenants, id) {
  if (!id) return new Set(tenants.map((tenant) => tenant.id));
  return new Set(
    tenants
      .filter((tenant) => tenant.id === id || tenant.parentId === id)
      .map((tenant) => tenant.id),
  );
}
export function serviceLabel(config, service) {
  const path = tenantPath(config.tenants, service.tenantId);
  const tenant = config.tenants.find((item) => item.id === service.tenantId);
  const parent = config.tenants.find((item) => item.id === tenant?.parentId);
  if (
    service.name === tenant?.name ||
    (parent &&
      [
        `${tenant.name} - ${parent.name}`,
        `${parent.name} - ${tenant.name}`,
      ].includes(service.name))
  )
    return path;
  return `${path} · ${service.name}`;
}
export function migrateLegacy(config) {
  if (
    !config ||
    !Array.isArray(config.services) ||
    !config.services.length ||
    !config.services.every(
      (service) =>
        service &&
        nonempty(service.name) &&
        Array.isArray(service.numbers) &&
        service.numbers.length &&
        service.numbers.every(nonempty),
    )
  )
    return null;
  const tenants = structuredClone(DEFAULT_TENANTS);
  const services = config.services.map((service, index) => {
    const name = service.name.trim();
    let tenant = tenants.find(
      (item) =>
        item.parentId === "awo" &&
        [`${item.name} - AWO`, `AWO - ${item.name}`].some(
          (label) => label.toLowerCase() === name.toLowerCase(),
        ),
    );
    tenant ||= tenants.find(
      (item) =>
        !item.parentId && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (!tenant) {
      tenant = tenants.find((item) => item.id === "unassigned");
      if (!tenant) {
        tenant = { id: "unassigned", name: "Belum dipetakan", parentId: null };
        tenants.push(tenant);
      }
    }
    return {
      id: `migrated-service-${index}`,
      name,
      tenantId: tenant.id,
      numbers: [...new Set(service.numbers.map((number) => number.trim()))],
    };
  });
  const result = { tenants, services };
  return validConfig(result) ? result : null;
}
export function loadConfig(storage = globalThis.localStorage) {
  try {
    const current = JSON.parse(storage.getItem(STORAGE_KEY));
    if (validConfig(current)) return current;
  } catch {
    /* Try the legacy config if the current value is corrupt or unavailable. */
  }
  try {
    const legacy = migrateLegacy(
      JSON.parse(storage.getItem(LEGACY_STORAGE_KEY)),
    );
    if (legacy) return legacy;
  } catch {
    /* Private browsing and invalid storage fall back to the demo. */
  }
  return structuredClone(DEFAULT_CONFIG);
}
export function saveConfig(config, storage = globalThis.localStorage) {
  if (!validConfig(config)) throw new Error("Konfigurasi tenant tidak valid.");
  storage.setItem(STORAGE_KEY, JSON.stringify(config));
}
