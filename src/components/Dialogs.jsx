import { useEffect, useId, useMemo, useRef, useState } from "react";
import { eventsFor, fmt, spansFor } from "../lib/telemetry.js";
import { DEFAULT_CONFIG, tenantPath, validConfig } from "../lib/config.js";
import { WorkstationState } from "../lib/state.js";
import { buttonClass, Icon, inputClass } from "./ui.jsx";

function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-24px)] overflow-y-auto rounded-2xl border border-stone-200 bg-[#fdfefb] p-4 text-[#283e34] shadow-2xl backdrop:bg-emerald-950/35 backdrop:backdrop-blur-sm sm:p-6 ${wide ? "max-w-3xl" : "max-w-xl"}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] tracking-widest text-stone-400">
            WABA OFFICE · SIMULASI
          </p>
          <h2
            id={titleId}
            className="mt-1 break-words text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
        </div>
        <button
          className={`${buttonClass} shrink-0 px-2`}
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function SessionDialog({ row, tick, onClose }) {
  const spans = useMemo(() => spansFor(row, tick), [row, tick]);
  const events = useMemo(() => eventsFor(row, tick), [row, tick]);
  const duration = spans.at(-1).start + spans.at(-1).dur - spans[0].start;
  const stats = [
    ["Nomor WABA", row.number],
    ["Tenant", row.tenantPath],
    ["Service", row.service],
    ["Status", WorkstationState.label(WorkstationState.resolve(row))],
    ["Pesan", fmt(row.total)],
    ["Error", fmt(row.errors)],
    ["Latency", `${row.latency}s`],
    ["Antrean", row.queueDepth],
    ["Success rate", `${((row.success / row.total) * 100).toFixed(1)}%`],
  ];
  return (
    <Dialog
      title={`Workstation ${row.number} — ${row.serviceLabel}`}
      onClose={onClose}
      wide
    >
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-3"
          >
            <p className="break-words font-mono text-sm font-medium">{value}</p>
            <p className="mt-1 text-[10px] text-stone-400">{label}</p>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold">
        Session terakhir · Waterfall simulasi
      </h3>
      <div className="my-3 space-y-2">
        {spans.map((span) => (
          <div
            key={span.name}
            className="rounded-lg border border-stone-200 p-3"
          >
            <div className="flex justify-between gap-3 font-mono text-[11px]">
              <span className="break-all">
                {span.kind === "err" ? "✕" : "✓"} {span.name}
              </span>
              <span className="shrink-0 text-stone-400">
                {Math.round(span.dur)}ms
              </span>
            </div>
            <div className="my-2 h-1 overflow-hidden rounded bg-stone-100">
              <div
                style={{
                  width: `${(span.dur / duration) * 100}%`,
                  marginLeft: `${((span.start - spans[0].start) / duration) * 100}%`,
                }}
                className={`h-full rounded ${span.kind === "err" ? "bg-rose-400" : "bg-emerald-400"}`}
              />
            </div>
            {span.extra && (
              <p
                className={`break-words text-[11px] leading-relaxed ${span.kind === "err" ? "text-rose-600" : "text-stone-500"}`}
              >
                {span.extra}
              </p>
            )}
          </div>
        ))}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-semibold">Event log simulasi</h3>
      {events.map((event, index) => (
        <div
          key={index}
          className="flex gap-3 border-b border-dashed border-stone-200 py-2 text-[11px]"
        >
          <time className="shrink-0 font-mono text-stone-400">{event.t}</time>
          <p
            className={`break-words ${event.k === "err" ? "text-rose-600" : "text-stone-600"}`}
          >
            {event.m}
          </p>
        </div>
      ))}
    </Dialog>
  );
}

export function SettingsDialog({ config, initialTenant, onSave, onClose }) {
  const [tenants, setTenants] = useState(() => structuredClone(config.tenants));
  const [draft, setDraft] = useState(() =>
    config.services.map((service) => ({
      ...service,
      numbers: service.numbers.join(", "),
    })),
  );
  const [tab, setTab] = useState("numbers");
  const [error, setError] = useState("");
  const roots = tenants.filter((tenant) => !tenant.parentId);
  function update(index, key, value) {
    setDraft((previous) =>
      previous.map((service, i) =>
        i === index ? { ...service, [key]: value } : service,
      ),
    );
  }
  function updateTenant(id, key, value) {
    setTenants((previous) =>
      previous.map((tenant) =>
        tenant.id === id ? { ...tenant, [key]: value } : tenant,
      ),
    );
  }
  function submit(event) {
    event.preventDefault();
    const next = {
      tenants: tenants.map((tenant) => ({
        ...tenant,
        name: tenant.name.trim(),
      })),
      services: draft.map((service) => ({
        ...service,
        name: service.name.trim(),
        numbers: [
          ...new Set(
            service.numbers
              .split(",")
              .map((number) => number.trim())
              .filter(Boolean),
          ),
        ],
      })),
    };
    if (!validConfig(next)) {
      setError(
        "Isi nama tenant, pilih induk yang valid, dan isi nama service serta nomor WABA. Nama harus unik dalam tenant atau induk yang sama.",
      );
      return;
    }
    try {
      onSave(next);
    } catch {
      setError(
        "Konfigurasi belum tersimpan. Penyimpanan browser tidak tersedia.",
      );
    }
  }
  function reset() {
    setTenants(structuredClone(DEFAULT_CONFIG.tenants));
    setDraft(
      DEFAULT_CONFIG.services.map((service) => ({
        ...service,
        numbers: service.numbers.join(", "),
      })),
    );
    setError("");
  }
  return (
    <Dialog title="Tenant & Nomor" onClose={onClose}>
      <div className="mb-4 flex gap-2">
        <button
          className={`${buttonClass} flex-1 ${tab === "numbers" ? "bg-emerald-50 text-emerald-800" : ""}`}
          aria-pressed={tab === "numbers"}
          onClick={() => setTab("numbers")}
        >
          Nomor & service
        </button>
        <button
          className={`${buttonClass} flex-1 ${tab === "tenants" ? "bg-emerald-50 text-emerald-800" : ""}`}
          aria-pressed={tab === "tenants"}
          onClick={() => setTab("tenants")}
        >
          Tenant & subtenant
        </button>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-stone-500">
        {tab === "numbers"
          ? "Pilih tenant pemilik service. Setiap nomor mendapat satu meja; pisahkan nomor dengan koma."
          : "Susun tenant utama dan subtenant. Tenant tanpa nomor tetap tersedia, tanpa data simulasi tambahan."}
      </p>
      <form onSubmit={submit}>
        {tab === "tenants" ? (
          <div className="space-y-3">
            {tenants.map((tenant) => {
              const used = draft.some(
                (service) => service.tenantId === tenant.id,
              );
              const hasChildren = tenants.some(
                (child) => child.parentId === tenant.id,
              );
              return (
                <fieldset
                  key={tenant.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="min-w-0 text-xs text-stone-500">
                      Nama tenant
                      <input
                        aria-label={`Nama tenant ${tenant.name || "baru"}`}
                        className={`${inputClass} mt-1`}
                        value={tenant.name}
                        onChange={(event) =>
                          updateTenant(tenant.id, "name", event.target.value)
                        }
                      />
                    </label>
                    <label className="min-w-0 text-xs text-stone-500">
                      Induk
                      <select
                        aria-label={`Induk ${tenant.name || "baru"}`}
                        disabled={hasChildren}
                        className={`${inputClass} mt-1 disabled:bg-stone-100`}
                        value={tenant.parentId || ""}
                        onChange={(event) =>
                          updateTenant(
                            tenant.id,
                            "parentId",
                            event.target.value || null,
                          )
                        }
                      >
                        <option value="">Tenant utama</option>
                        {roots
                          .filter((root) => root.id !== tenant.id)
                          .map((root) => (
                            <option key={root.id} value={root.id}>
                              {root.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-[10px] text-stone-400">
                      {hasChildren
                        ? "Memiliki subtenant"
                        : used
                          ? "Memiliki service"
                          : "Belum memiliki service"}
                    </p>
                    <button
                      type="button"
                      disabled={used || hasChildren || tenants.length === 1}
                      className="min-h-10 text-xs text-rose-600 disabled:cursor-not-allowed disabled:text-stone-300"
                      onClick={() =>
                        setTenants((previous) =>
                          previous.filter((item) => item.id !== tenant.id),
                        )
                      }
                    >
                      Hapus {tenant.name || "tenant"}
                    </button>
                  </div>
                </fieldset>
              );
            })}
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setTenants((previous) => [
                  ...previous,
                  { id: crypto.randomUUID(), name: "", parentId: null },
                ])
              }
            >
              + Tambah tenant
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {draft.map((service, index) => (
              <fieldset
                key={service.id}
                className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <legend className="px-1 text-xs text-stone-500">
                  Service {index + 1}
                </legend>
                <label className="block text-xs text-stone-500">
                  Tenant / subtenant
                  <select
                    aria-label={`Tenant service ${index + 1}`}
                    value={service.tenantId}
                    onChange={(event) =>
                      update(index, "tenantId", event.target.value)
                    }
                    className={`${inputClass} mt-1`}
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenantPath(tenants, tenant.id) || "Tenant baru"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-stone-500">
                  Nama service
                  <input
                    aria-label={`Nama service ${index + 1}`}
                    value={service.name}
                    onChange={(event) =>
                      update(index, "name", event.target.value)
                    }
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="block text-xs text-stone-500">
                  Nomor WABA
                  <input
                    aria-label={`Nomor WABA ${index + 1}`}
                    value={service.numbers}
                    onChange={(event) =>
                      update(index, "numbers", event.target.value)
                    }
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <button
                  type="button"
                  className="min-h-10 text-xs text-rose-600 underline underline-offset-4"
                  onClick={() =>
                    setDraft((previous) =>
                      previous.filter((_, i) => i !== index),
                    )
                  }
                >
                  Hapus service {index + 1}
                </button>
              </fieldset>
            ))}
            {!draft.length && (
              <p className="rounded-lg bg-stone-50 p-4 text-xs text-stone-500">
                Belum ada service. Tenant tetap tersimpan.
              </p>
            )}
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setDraft((previous) => [
                  ...previous,
                  {
                    id: crypto.randomUUID(),
                    tenantId: tenants.some((item) => item.id === initialTenant)
                      ? initialTenant
                      : tenants[0].id,
                    name: "",
                    numbers: "",
                  },
                ])
              }
            >
              + Tambah service
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-rose-600">
            {error}
          </p>
        )}
        <footer className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            className={`${buttonClass} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`}
          >
            Simpan perubahan
          </button>
          <button type="button" className={buttonClass} onClick={reset}>
            Reset default
          </button>
          <button type="button" className={buttonClass} onClick={onClose}>
            Batal
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
