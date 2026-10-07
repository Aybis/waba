import { tenantPath, tenantScopeIds } from "../lib/config.js";
import { inputClass } from "./ui.jsx";

export function TenantTree({ config, selected, onSelect }) {
  const roots = config.tenants.filter((tenant) => !tenant.parentId);
  function count(id) {
    const scope = tenantScopeIds(config.tenants, id);
    return config.services
      .filter((service) => scope.has(service.tenantId))
      .reduce((sum, service) => sum + service.numbers.length, 0);
  }
  const selectedTenant = config.tenants.find(
    (tenant) => tenant.id === selected,
  );
  return (
    <div className="mt-7 hidden md:block">
      <div className="mb-3 flex items-center justify-between px-3 text-[9px] tracking-widest text-stone-400">
        <span>TENANTS</span>
        <span>{roots.length}</span>
      </div>
      <nav aria-label="Tenant hierarchy" className="space-y-1">
        <button
          onClick={() => onSelect("")}
          aria-pressed={!selected}
          className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-xs ${!selected ? "bg-[#e8eee2] text-emerald-800" : "text-stone-500 hover:bg-stone-100"}`}
        >
          <span>Semua tenant</span>
          <span className="font-mono text-[10px]">{count("")}</span>
        </button>
        {roots.map((tenant) => {
          const children = config.tenants.filter(
            (child) => child.parentId === tenant.id,
          );
          const inScope =
            selected === tenant.id || selectedTenant?.parentId === tenant.id;
          return (
            <div key={tenant.id}>
              <button
                onClick={() => onSelect(tenant.id)}
                aria-pressed={selected === tenant.id}
                className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs ${inScope ? "bg-[#edf1e7] font-medium text-emerald-800" : "text-stone-500 hover:bg-stone-100"}`}
              >
                <span className="text-stone-400">
                  {children.length ? "⌄" : "·"}
                </span>
                <span className="truncate">{tenant.name}</span>
                <span className="ml-auto font-mono text-[10px] text-stone-400">
                  {count(tenant.id)}
                </span>
              </button>
              {children.length > 0 && (
                <div className="ml-4 border-l border-stone-200 pl-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      aria-label={`Tenant ${tenant.name} / ${child.name}`}
                      aria-pressed={selected === child.id}
                      onClick={() => onSelect(child.id)}
                      className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-[11px] ${selected === child.id ? "bg-emerald-50 font-medium text-emerald-800" : "text-stone-500 hover:bg-stone-100"}`}
                    >
                      <span className="truncate">{child.name}</span>
                      <span className="font-mono text-[10px] text-stone-400">
                        {count(child.id)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <p className="mt-3 px-3 text-[9px] leading-relaxed text-stone-400">
        Angka menunjukkan jumlah nomor WABA, termasuk subtenant.
      </p>
    </div>
  );
}

export function TenantFilters({ config, selected, onSelect }) {
  const tenant = config.tenants.find((item) => item.id === selected);
  const rootId = tenant?.parentId || tenant?.id || "";
  const children = config.tenants.filter((item) => item.parentId === rootId);
  return (
    <section
      aria-label="Scope tenant"
      className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-stone-200 bg-[#fdfefb] p-3 sm:p-4"
    >
      <div className="min-w-0">
        <p className="text-[9px] tracking-widest text-stone-400">
          TENANT WORKSPACE
        </p>
        <h2 className="mt-1 break-words text-sm font-semibold">
          {selected ? tenantPath(config.tenants, selected) : "Semua tenant"}
        </h2>
        <p className="mt-1 text-[10px] text-stone-400">
          {children.length && selected === rootId
            ? "Ringkasan seluruh subtenant dalam tenant ini."
            : "Office, metrik, dan aktivitas mengikuti pilihan tenant."}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-72">
        <label className="min-w-0 text-[10px] text-stone-500">
          Tenant
          <select
            aria-label="Tenant utama"
            className={`${inputClass} mt-1`}
            value={rootId}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">Semua tenant</option>
            {config.tenants
              .filter((item) => !item.parentId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="min-w-0 text-[10px] text-stone-500">
          Subtenant
          <select
            aria-label="Subtenant"
            disabled={!children.length}
            className={`${inputClass} mt-1 disabled:bg-stone-100 disabled:text-stone-400`}
            value={tenant?.parentId ? tenant.id : ""}
            onChange={(event) => onSelect(event.target.value || rootId)}
          >
            <option value="">
              {children.length ? "Semua subtenant" : "Tidak ada subtenant"}
            </option>
            {children.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
