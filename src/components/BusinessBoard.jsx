import { useRef } from "react";
import { WorkstationState } from "../lib/state.js";
import { buttonClass, Icon } from "./ui.jsx";
export function BusinessBoard({
  config,
  rows,
  selectedUnit,
  onSelect,
  onSettings,
}) {
  const panels = useRef({});
  const units = config.businessUnits.filter(
    (u) => !selectedUnit || u.id === selectedUnit,
  );
  units.sort((a, b) => {
    const score = (unit) =>
      rows
        .filter((r) => r.tenantId === unit.id)
        .reduce(
          (sum, r) =>
            sum +
            (WorkstationState.resolve(r) === "error"
              ? 1000
              : WorkstationState.resolve(r) === "warning"
                ? 100
                : 1),
          0,
        );
    return score(b) - score(a);
  });
  const errors = rows.filter((r) => WorkstationState.resolve(r) === "error");
  return (
    <section aria-label="Business Unit operations" className="space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${errors.length ? "border-red-300 bg-red-50" : "border-stone-200 bg-white"}`}
      >
        <div>
          <h2 className="text-lg font-semibold">
            Business Unit command center
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            {units.length} BU ditampilkan · {rows.length} nomor sesuai filter ·
            data simulasi · prioritas error
          </p>
        </div>
        <strong className={errors.length ? "text-red-700" : "text-emerald-700"}>
          {errors.length
            ? `! ${errors.length} nomor bermasalah`
            : "Tidak ada error pada scope ini"}
        </strong>
      </div>
      <nav
        aria-label="All Business Units overview"
        className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11"
      >
        {units.map((u) => {
          const members = rows.filter((r) => r.tenantId === u.id);
          const errors = members.filter(
            (r) => WorkstationState.resolve(r) === "error",
          ).length;
          return (
            <button
              key={u.id}
              onClick={() =>
                panels.current[u.id]?.scrollIntoView({
                  block: "center",
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                })
              }
              className={`rounded-lg border p-3 text-left ${errors ? "border-red-700 bg-red-600 text-white" : members.length ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50 text-stone-400"}`}
            >
              <strong className="block text-xs">{u.name}</strong>
              <span className="text-[9px]">
                {errors
                  ? `${errors} error`
                  : members.length
                    ? `${members.length} nomor`
                    : "Belum ada nomor"}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {units.map((unit) => {
          const accounts = config.accounts.filter(
            (a) => a.businessUnitId === unit.id,
          );
          const members = rows.filter((r) => r.tenantId === unit.id);
          const failing = members.filter(
            (r) => WorkstationState.resolve(r) === "error",
          ).length;
          const configured = accounts.reduce((s, a) => s + a.numbers.length, 0);
          return (
            <article
              key={unit.id}
              ref={(element) => {
                panels.current[unit.id] = element;
              }}
              data-testid="bu-panel"
              className={`min-w-0 overflow-hidden rounded-xl border-2 ${failing ? "border-red-400 bg-red-50/40 shadow-[0_0_0_3px_#fee2e2]" : "border-stone-200 bg-white"}`}
            >
              <header
                className={`flex items-center justify-between gap-2 border-b p-4 ${failing ? "border-red-200 bg-red-100" : "border-stone-100 bg-[#edf1e7]"}`}
              >
                <div>
                  <h3 className="text-lg font-bold">{unit.name}</h3>
                  <p className="text-[10px] text-stone-500">
                    {accounts.length} WABA Account · {configured} WA number
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${failing ? "bg-red-700 text-white" : "bg-white text-stone-500"}`}
                >
                  {failing
                    ? `${failing} ERROR`
                    : configured
                      ? "MONITORED"
                      : "BELUM TERHUBUNG"}
                </span>
              </header>
              <div className="space-y-3 p-3">
                {accounts.map((a) => {
                  const numbers = members.filter((r) => r.serviceId === a.id);
                  return (
                    <section
                      key={a.id}
                      className="rounded-lg border border-stone-200 p-2"
                    >
                      <h4 className="mb-2 break-words text-xs font-semibold">
                        {a.name}{" "}
                        <span className="font-normal text-stone-400">
                          · {a.wabaId || "WABA ID belum diisi"}
                        </span>
                      </h4>
                      <div className="grid gap-2 min-[420px]:grid-cols-2">
                        {numbers.map((r) => {
                          const state = WorkstationState.resolve(r);
                          return (
                            <button
                              key={r.id}
                              onClick={() => onSelect(r)}
                              aria-label={`Detail ${unit.name} ${r.number} ${state}`}
                              className={`min-w-0 rounded-lg border-2 p-3 text-left transition hover:-translate-y-0.5 ${state === "error" ? "border-red-600 bg-red-600 text-white shadow-md" : state === "warning" ? "border-amber-400 bg-amber-50" : "border-emerald-100 bg-emerald-50/40"}`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <Icon name="monitor" className="size-6" />
                                <span className="text-[10px] font-bold uppercase">
                                  {state === "error"
                                    ? "! Error"
                                    : WorkstationState.label(state)}
                                </span>
                              </div>
                              <strong className="block break-all font-mono text-sm">
                                {r.number}
                              </strong>
                              <span className="block truncate text-[11px]">
                                {r.displayName || "WA number"}
                              </span>
                              <p
                                className={`mt-2 text-[10px] ${state === "error" ? "text-red-50" : "text-stone-500"}`}
                              >
                                {state === "error"
                                  ? r.errType === "SERVER"
                                    ? "Meta tidak merespons"
                                    : "Pengiriman gagal"
                                  : state === "warning"
                                    ? `${r.queueDepth} antrean · ${r.latency}s`
                                    : "Klik untuk detail sesi"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {!numbers.length && (
                        <p className="py-3 text-[11px] text-stone-400">
                          {a.numbers.length
                            ? "Tidak cocok dengan filter aktif."
                            : "Belum ada nomor dalam akun ini."}
                        </p>
                      )}
                    </section>
                  );
                })}
                {!accounts.length && (
                  <div className="py-4 text-center">
                    <Icon
                      name="office"
                      className="mx-auto mb-2 size-7 text-stone-300"
                    />
                    <p className="text-xs text-stone-500">
                      BU tersedia. Akun dan nomor belum dikonfigurasi.
                    </p>
                    <button
                      className={`${buttonClass} mt-3`}
                      onClick={() => onSettings(unit.id)}
                    >
                      + Hubungkan WABA Account
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
