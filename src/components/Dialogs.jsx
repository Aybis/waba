import { useEffect, useId, useMemo, useRef, useState } from "react";
import { eventsFor, fmt, spansFor } from "../lib/telemetry.js";
import { DEFAULT_CONFIG, validConfig } from "../lib/config.js";
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
    ["Business Unit", row.tenantPath],
    ["WABA Account", row.serviceLabel],
    ["Display name", row.displayName || "—"],
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
  const [draft, setDraft] = useState(() => structuredClone(config));
  const [error, setError] = useState("");
  const [tab, setTab] = useState("accounts");
  const change = (id, key, value) =>
    setDraft((d) => ({
      ...d,
      accounts: d.accounts.map((a) =>
        a.id === id ? { ...a, [key]: value } : a,
      ),
    }));
  function submit(e) {
    e.preventDefault();
    const next = {
      businessUnits: draft.businessUnits.map((u) => ({
        ...u,
        name: u.name.trim(),
      })),
      accounts: draft.accounts.map((a) => ({
        ...a,
        name: a.name.trim(),
        wabaId: a.wabaId.trim(),
        numbers: a.numbers.map((n) => ({
          ...n,
          number: n.number.trim(),
          displayName: n.displayName.trim(),
        })),
      })),
    };
    if (!validConfig(next)) {
      setError(
        "Isi nama Business Unit, nama akun, dan nomor. Nomor dalam satu akun harus unik.",
      );
      return;
    }
    try {
      onSave(next);
    } catch {
      setError("Perubahan belum tersimpan. Periksa penyimpanan browser.");
    }
  }
  return (
    <Dialog title="Business Unit & WABA" onClose={onClose} wide>
      <p className="mb-4 text-xs text-stone-500">
        Business Unit → WABA Account → WA number (display name). Setiap akun
        menjadi satu blok kantor.
      </p>
      <div className="mb-4 flex gap-2">
        {[
          ["accounts", "WABA Accounts & numbers"],
          ["units", "Business Units"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={buttonClass}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        {tab === "units" ? (
          <div className="space-y-3">
            {draft.businessUnits.map((u) => (
              <div key={u.id} className="flex gap-2">
                <label className="min-w-0 flex-1 text-xs">
                  Business Unit
                  <input
                    required
                    className={`${inputClass} mt-1`}
                    value={u.name}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        businessUnits: d.businessUnits.map((v) =>
                          v.id === u.id ? { ...v, name: e.target.value } : v,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className={`${buttonClass} disabled:opacity-30`}
                  disabled={
                    draft.businessUnits.length === 1 ||
                    draft.accounts.some((a) => a.businessUnitId === u.id)
                  }
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      businessUnits: d.businessUnits.filter(
                        (v) => v.id !== u.id,
                      ),
                    }))
                  }
                >
                  Hapus
                </button>
              </div>
            ))}
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  businessUnits: [
                    ...d.businessUnits,
                    { id: crypto.randomUUID(), name: "" },
                  ],
                }))
              }
            >
              + Business Unit
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {draft.accounts.map((a, i) => (
              <fieldset
                key={a.id}
                className="space-y-3 rounded-xl border border-stone-200 p-3"
              >
                <legend className="px-1 text-xs">WABA Account {i + 1}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="min-w-0 text-xs">
                    Business Unit
                    <select
                      className={`${inputClass} mt-1`}
                      value={a.businessUnitId}
                      onChange={(e) =>
                        change(a.id, "businessUnitId", e.target.value)
                      }
                    >
                      {draft.businessUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || "Unit baru"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0 text-xs">
                    WABA Account name
                    <input
                      required
                      className={`${inputClass} mt-1`}
                      value={a.name}
                      onChange={(e) => change(a.id, "name", e.target.value)}
                    />
                  </label>
                  <label className="min-w-0 text-xs">
                    WABA Account ID
                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="11234"
                      value={a.wabaId}
                      onChange={(e) => change(a.id, "wabaId", e.target.value)}
                    />
                  </label>
                </div>
                {a.numbers.map((n) => (
                  <div
                    key={n.id}
                    className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-lg bg-stone-50 p-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    {[
                      ["number", "WA number"],
                      ["displayName", "Display name"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="col-start-1 min-w-0 text-xs sm:col-start-auto"
                      >
                        {label}
                        <input
                          required={key === "number"}
                          className={`${inputClass} mt-1`}
                          value={n[key]}
                          onChange={(e) =>
                            change(
                              a.id,
                              "numbers",
                              a.numbers.map((p) =>
                                p.id === n.id
                                  ? { ...p, [key]: e.target.value }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      aria-label={`Hapus nomor ${n.number}`}
                      className={`${buttonClass} col-start-2 sm:col-start-auto`}
                      onClick={() =>
                        change(
                          a.id,
                          "numbers",
                          a.numbers.filter((p) => p.id !== n.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() =>
                      change(a.id, "numbers", [
                        ...a.numbers,
                        {
                          id: crypto.randomUUID(),
                          number: "",
                          displayName: "",
                        },
                      ])
                    }
                  >
                    + WA number
                  </button>
                  <button
                    type="button"
                    className={`${buttonClass} text-rose-600`}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        accounts: d.accounts.filter((v) => v.id !== a.id),
                      }))
                    }
                  >
                    Hapus akun {a.name}
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  accounts: [
                    ...d.accounts,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      wabaId: "",
                      businessUnitId: initialTenant || d.businessUnits[0].id,
                      numbers: [],
                    },
                  ],
                }))
              }
            >
              + WABA Account
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
            className={`${buttonClass} bg-emerald-700 text-white`}
          >
            Simpan perubahan
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setDraft(structuredClone(DEFAULT_CONFIG));
              setError("");
            }}
          >
            Gunakan contoh TSO
          </button>
          <button type="button" className={buttonClass} onClick={onClose}>
            Batal
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
