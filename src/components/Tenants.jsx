import { useState } from "react";
import { accountLabel } from "../lib/config.js";
import { inputClass } from "./ui.jsx";
const rowClass =
  "flex min-h-10 min-w-0 flex-1 items-center justify-between gap-1 rounded-lg px-2 py-2 text-left text-[11px] hover:bg-stone-100";
export function TenantTree({ config, selected, account, phone, onSelect }) {
  const [closed, setClosed] = useState(new Set());
  const toggle = (id) =>
    setClosed((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const count = (accounts) =>
    accounts.reduce((n, a) => n + a.numbers.length, 0);
  const disclosure = (id, label) => (
    <button
      aria-label={`${closed.has(id) ? "Expand" : "Collapse"} ${label}`}
      aria-expanded={!closed.has(id)}
      onClick={() => toggle(id)}
      className="min-h-10 w-6 shrink-0 text-stone-400"
    >
      {closed.has(id) ? "›" : "⌄"}
    </button>
  );
  return (
    <nav aria-label="Business Unit hierarchy" className="mt-7 hidden md:block">
      <p className="px-2 pb-3 text-[9px] tracking-widest text-stone-400">
        BUSINESS UNITS
      </p>
      <button
        className={`${rowClass} w-full ${!selected ? "bg-emerald-50" : ""}`}
        aria-pressed={!selected}
        onClick={() => onSelect("")}
      >
        Semua Business Unit <span>{count(config.accounts)}</span>
      </button>
      <ul>
        {config.businessUnits.map((unit) => {
          const accounts = config.accounts.filter(
            (a) => a.businessUnitId === unit.id,
          );
          return (
            <li key={unit.id}>
              <div className="flex">
                {accounts.length ? (
                  disclosure(unit.id, unit.name)
                ) : (
                  <span className="w-6" />
                )}
                <button
                  className={`${rowClass} ${selected === unit.id && !account ? "bg-[#e8eee2] text-emerald-800" : ""}`}
                  aria-pressed={selected === unit.id && !account}
                  onClick={() => onSelect(unit.id)}
                >
                  <span className="break-words">{unit.name}</span>
                  <span className="text-stone-400">{count(accounts)}</span>
                </button>
              </div>
              {!closed.has(unit.id) && (
                <ul className="ml-3 border-l border-stone-200 pl-1">
                  {accounts.map((a) => (
                    <li key={a.id}>
                      <div className="flex">
                        {disclosure(a.id, accountLabel(a))}
                        <button
                          className={`${rowClass} ${account === a.id && !phone ? "bg-[#e8eee2] text-emerald-800" : ""}`}
                          aria-pressed={account === a.id && !phone}
                          onClick={() => onSelect(unit.id, a.id)}
                        >
                          <span className="min-w-0 break-words">
                            {a.name}
                            <small className="block text-[9px] text-stone-400">
                              WABA {a.wabaId || "ID belum diisi"}
                            </small>
                          </span>
                          <span>{a.numbers.length}</span>
                        </button>
                      </div>
                      {!closed.has(a.id) && (
                        <ul className="ml-3 border-l border-stone-200 pl-1">
                          {a.numbers.map((n) => (
                            <li key={n.id}>
                              <button
                                className={`${rowClass} w-full ${account === a.id && phone === n.id ? "bg-emerald-100 text-emerald-800" : ""}`}
                                aria-pressed={
                                  account === a.id && phone === n.id
                                }
                                onClick={() => onSelect(unit.id, a.id, n.id)}
                              >
                                <span className="min-w-0 break-words">
                                  <span className="font-mono">{n.number}</span>
                                  <small className="block text-[10px] text-stone-500">
                                    {n.displayName || "Nama belum diisi"}
                                  </small>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-2 text-[9px] leading-relaxed text-stone-400">
        Business Unit → WABA Account → WA number. Angka menunjukkan jumlah
        nomor.
      </p>
    </nav>
  );
}
export function TenantFilters({ config, selected, account, phone, onSelect }) {
  const accounts = config.accounts.filter(
    (a) => !selected || a.businessUnitId === selected,
  );
  const current = config.accounts.find((a) => a.id === account);
  return (
    <section
      aria-label="Workspace scope"
      className="mb-5 rounded-xl border border-stone-200 bg-[#fdfefb] p-3 sm:p-4"
    >
      <p className="mb-3 text-[10px] text-stone-500">
        Satu blok = WABA Account · Satu orang = WA number
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="min-w-0 text-xs">
          Business Unit
          <select
            className={`${inputClass} mt-1`}
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">Semua Business Unit</option>
            {config.businessUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs">
          WABA Account
          <select
            className={`${inputClass} mt-1`}
            value={account}
            onChange={(e) => {
              const a = config.accounts.find((a) => a.id === e.target.value);
              onSelect(a?.businessUnitId || selected, a?.id || "");
            }}
          >
            <option value="">Semua WABA Account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs">
          WA number
          <select
            className={`${inputClass} mt-1 disabled:opacity-50`}
            disabled={!current}
            value={phone}
            onChange={(e) => onSelect(selected, account, e.target.value)}
          >
            <option value="">Semua nomor</option>
            {current?.numbers.map((n) => (
              <option key={n.id} value={n.id}>
                {n.number}
                {n.displayName ? ` (${n.displayName})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
