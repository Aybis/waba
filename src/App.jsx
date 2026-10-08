import { BusinessBoard } from "./components/BusinessBoard.jsx";
import { UsageDashboard } from "./components/UsageDashboard.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Office } from "./components/Office.jsx";
import { SessionDialog, SettingsDialog } from "./components/Dialogs.jsx";
import {
  Agents,
  Flow,
  MetricsTable,
  Workstations,
} from "./components/Views.jsx";
import { buttonClass, dotClasses, Icon, inputClass } from "./components/ui.jsx";
import { fetchTelemetry, fmt } from "./lib/telemetry.js";
import {
  loadDemoWorkspace,
  saveConfig,
  tenantScopeIds,
  tenantPath,
  serviceLabel,
} from "./lib/config.js";
import { TenantTree, TenantFilters } from "./components/Tenants.jsx";
import { WorkstationState } from "./lib/state.js";

const views = [
  { id: "office", name: "BU Monitor", icon: "office" },
  { id: "usage", name: "Usage & Cost", icon: "flow" },
  { id: "scene", name: "Office view", icon: "grid" },
  { id: "workstations", name: "Workstations", icon: "grid" },
  { id: "agents", name: "Agent View", icon: "chat" },
  { id: "flow", name: "Traffic Flow", icon: "flow" },
];
const time = (date) =>
  date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

export default function App() {
  const [config, setConfig] = useState(loadDemoWorkspace);
  const [tick, setTick] = useState(1);
  const [updated, setUpdated] = useState(() => new Date());
  const [view, setView] = useState("scene");
  const [tenant, setTenant] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(true);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [bubbles, setBubbles] = useState(true);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState(false);
  const rows = useMemo(() => fetchTelemetry(config, tick), [config, tick]);
  const scope = useMemo(
    () => tenantScopeIds(config.businessUnits, tenant),
    [config.businessUnits, tenant],
  );
  const scopedServices = useMemo(
    () => config.accounts.filter((item) => scope.has(item.businessUnitId)),
    [config.accounts, scope],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          scope.has(row.tenantId) &&
          (!service || row.serviceId === service) &&
          (!phone || row.phoneId === phone) &&
          (!status || WorkstationState.resolve(row) === status) &&
          (!search.trim() ||
            `${row.number} ${row.displayName} ${row.wabaId} ${row.service} ${row.tenantPath}`
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase())),
      ),
    [rows, scope, service, phone, status, search],
  );
  const refresh = useCallback(() => {
    setTick((previous) => previous + 1);
    setUpdated(new Date());
  }, []);
  const select = useCallback((row) => setSelected({ row, tick }), [tick]);
  const paused = !live || !visible;

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!live || !visible) return;
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [live, visible, refresh]);
  const scrollLocked = focused || Boolean(selected) || settings;
  useEffect(() => {
    if (!scrollLocked) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [scrollLocked]);
  useEffect(() => {
    if (!focused) return;
    const escape = (event) => {
      if (event.key === "Escape" && !selected && !settings) setFocused(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [focused, selected, settings]);

  function persist(next) {
    next = { ...next, demoCoverageVersion: 2 };
    saveConfig(next);
    setConfig(next);
    setService("");
    setPhone("");
    if (!next.businessUnits.some((item) => item.id === tenant)) setTenant("");
    setSettings(false);
    refresh();
  }
  function selectTenant(id, accountId = "", phoneId = "") {
    setTenant(id);
    setService(accountId);
    setPhone(phoneId);
    setStatus("");
    setSearch("");
  }
  function resetFilters() {
    setService("");
    setPhone("");
    setStatus("");
    setSearch("");
  }

  return (
    <div className="min-h-dvh min-w-80 bg-[#f6f7f4] font-sans text-[#283e34] antialiased selection:bg-emerald-100 [&_button]:cursor-pointer [&_button]:touch-manipulation [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-emerald-600">
      <aside
        inert={focused}
        className="border-b border-stone-200 bg-[#fafbf8] px-4 pt-5 md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-48 md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:pb-5 xl:w-56 xl:px-5"
      >
        <div className="flex items-center justify-between gap-2">
          <a
            href="./"
            aria-label="WABA Office beranda"
            className="flex items-center gap-2 text-inherit no-underline"
          >
            <span className="grid h-10 w-9 shrink-0 place-items-center rounded-xl bg-[#356e55] text-white shadow-[0_3px_0_#24523e]">
              <Icon name="monitor" className="size-6" />
            </span>
            <span>
              <strong className="block whitespace-nowrap text-[23px] leading-tight tracking-[-1.2px]">
                waba<span className="font-normal text-[#3b6c52]">.office</span>
              </strong>
              <small className="mt-1 block text-[6px] tracking-widest text-stone-400">
                A SPACE FOR EVERY CONNECTION
              </small>
            </span>
          </a>
          <button
            aria-label="Business Unit & WABA mobile"
            className={`${buttonClass} px-2 md:hidden`}
            onClick={() => setSettings(true)}
          >
            <Icon name="settings" />
          </button>
        </div>
        <p className="mb-3 mt-10 hidden px-3 text-[9px] tracking-widest text-stone-400 md:block">
          WORKSPACE
        </p>
        <nav
          aria-label="Tampilan dashboard"
          className="mt-5 grid grid-cols-3 gap-1 md:mt-0 md:grid-cols-1 md:gap-1.5"
        >
          {views.map((item) => (
            <button
              key={item.id}
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-t-lg px-1 py-3 text-[9px] transition md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-xs ${view === item.id ? "bg-[#e8eee2] font-medium text-[#345d42] shadow-[inset_0_-2px_#72966a] md:shadow-[inset_3px_0_#72966a]" : "text-stone-500 hover:bg-stone-100"}`}
            >
              <Icon name={item.icon} className="size-3.5 shrink-0 md:size-4" />
              {item.name}
            </button>
          ))}
        </nav>
        <TenantTree
          config={config}
          selected={tenant}
          account={service}
          phone={phone}
          onSelect={selectTenant}
        />
        <div className="mt-auto hidden pt-8 md:block">
          <button
            className="flex min-h-11 w-full items-center gap-2 border-t border-stone-200 px-3 py-4 text-xs text-stone-500"
            onClick={() => setSettings(true)}
          >
            <Icon name="settings" />
            Business Unit & WABA
          </button>
          <div className="mt-5 rounded-xl bg-[#f0f3ec] p-3">
            <p className="flex items-center gap-2 text-[11px] text-[#63725d]">
              <i className="size-1.5 rounded-full bg-emerald-500" />
              Your local workspace
            </p>
            <p className="mt-1.5 text-[9px] text-stone-400">
              Data simulasi · refresh 15 detik
            </p>
          </div>
          <p className="mt-3 text-center text-[9px] text-stone-400">
            Small office. Big connections.
          </p>
        </div>
      </aside>
      <div className="min-w-0 md:ml-48 xl:ml-56">
        <header
          inert={focused}
          className="flex h-14 items-center justify-between gap-3 border-b border-stone-200 bg-[#fcfdf9] px-4 sm:px-6 xl:px-8"
        >
          <p className="text-[11px] text-stone-400">
            Workspace <span className="mx-2 text-stone-300">/</span>
            <span className="text-stone-600">
              {views.find((item) => item.id === view).name}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <time className="hidden font-mono text-[10px] text-stone-400 sm:block">
              {time(updated)} WIB
            </time>
            <span className="rounded bg-[#f0f1e4] px-2 py-1 text-[8px] tracking-wider text-[#8c9276]">
              SIMULATION
            </span>
            <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-[#e5eada] text-[10px] font-semibold text-[#65764f]">
              M
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1800px] px-4 pb-4 pt-6 sm:px-6 xl:px-8">
          <section
            inert={focused}
            className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"
          >
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[8px] font-semibold tracking-[.18em] text-[#7c9577]">
                <i className="size-1 rounded-full bg-emerald-500" />
                YOUR OPERATIONS, ALIVE
              </p>
              <h1 className="max-w-md text-[28px] leading-tight font-semibold tracking-[-1.2px] text-[#304735] lg:max-w-none 2xl:text-4xl">
                A little office. A lot happening
                <span className="text-[#91a679]">.</span>
              </h1>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-stone-500">
                Setiap nomor punya tempat. Lihat tim kecilmu bekerja, satu pesan
                dalam satu waktu.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end">
              <span className="order-2 font-mono text-[9px] text-stone-400 lg:order-0">
                Diperbarui {time(updated)} WIB
              </span>
              <div className="flex gap-2">
                <button
                  className={`${buttonClass} ${live ? "border-[#3d7155]! bg-[#3d7155]! text-white! hover:bg-emerald-800!" : ""}`}
                  aria-pressed={live}
                  onClick={() => setLive(!live)}
                >
                  {live ? "Ⅱ Live aktif" : "▷ Lanjutkan live"}
                </button>
                <button className={buttonClass} onClick={refresh}>
                  <Icon name="refresh" />
                  Refresh
                </button>
              </div>
            </div>
          </section>
          <div inert={focused}>
            <TenantFilters
              config={config}
              selected={tenant}
              account={service}
              phone={phone}
              onSelect={selectTenant}
            />
            {view !== "usage" && <KPIs rows={filtered} />}
            <section
              hidden={view === "usage"}
              aria-label="Filter workstation"
              className="mb-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Ruang operasi</h2>
                <span
                  data-testid="visible-count"
                  className="rounded bg-[#edf1e6] px-2 py-1 font-mono text-[10px] text-[#7b8b6a]"
                >
                  {filtered.length}
                </span>
                <span className="ml-1 max-w-44 truncate text-[10px] text-stone-400">
                  {config.accounts.find((item) => item.id === service)?.name ||
                    "Semua WABA Account"}
                </span>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[minmax(130px,1fr)_auto_auto] 2xl:w-auto">
                <label className="relative col-span-2 sm:col-span-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                    <Icon name="search" />
                  </span>
                  <input
                    type="search"
                    aria-label="Cari nomor, nama, atau akun"
                    className={`${inputClass} pl-9`}
                    placeholder="Cari nomor, nama, atau akun…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter status"
                  className={inputClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Semua status</option>
                  {Object.keys(dotClasses).map((state) => (
                    <option key={state} value={state}>
                      {WorkstationState.label(state)}
                    </option>
                  ))}
                </select>
                <button
                  className={`${buttonClass} col-span-2 sm:col-span-1 ${bubbles ? "bg-[#f2f5ec]" : ""}`}
                  aria-pressed={bubbles}
                  onClick={() => setBubbles(!bubbles)}
                >
                  ▱ Bubble {bubbles ? "on" : "off"}
                </button>
              </div>
            </section>
            <div
              hidden={view === "usage"}
              className="mb-4 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="hidden text-[9px] tracking-wider text-stone-400 lg:block">
                ◇ A BIRD’S-EYE VIEW <span className="mx-2">/</span> Klik
                operator untuk detail sesi
              </p>
              <div
                className="flex flex-wrap gap-3 sm:gap-4"
                aria-label="Jumlah per status"
              >
                {Object.keys(dotClasses).map((state) => (
                  <span
                    key={state}
                    className="flex items-center gap-1.5 text-[10px] text-stone-500"
                  >
                    <i
                      className={`size-1.5 rounded-full ${dotClasses[state]}`}
                    />
                    {WorkstationState.label(state)}{" "}
                    <b className="font-mono font-normal">
                      {
                        filtered.filter(
                          (row) => WorkstationState.resolve(row) === state,
                        ).length
                      }
                    </b>
                  </span>
                ))}
              </div>
            </div>
          </div>
          {!filtered.length && view !== "office" && view !== "usage" && (
            <div
              inert={focused}
              className="mb-4 rounded-xl border border-dashed border-stone-300 bg-white p-7 text-center"
            >
              <h3 className="text-sm font-semibold">
                Tidak ada workstation ditemukan
              </h3>
              <p className="my-2 text-xs text-stone-500">
                {!scopedServices.length
                  ? `${tenantPath(config.businessUnits, tenant) || "Workspace ini"} belum memiliki nomor. Tambahkan WABA Account dan nomor untuk mulai memantau.`
                  : "Coba nomor lain atau ubah filter."}
              </p>
              <button
                className={buttonClass}
                onClick={
                  !scopedServices.length
                    ? () => setSettings(true)
                    : resetFilters
                }
              >
                {!scopedServices.length
                  ? "Tambah WABA Account"
                  : "Reset filter"}
              </button>
            </div>
          )}
          {view === "office" && (
            <BusinessBoard
              config={config}
              rows={filtered}
              selectedUnit={tenant}
              onSelect={select}
              onSettings={(id) => {
                selectTenant(id);
                setSettings(true);
              }}
            />
          )}
          {view === "usage" && (
            <UsageDashboard
              config={config}
              unit={tenant}
              account={service}
              phone={phone}
            />
          )}
          {view === "scene" && (
            <Office
              rows={filtered}
              paused={paused}
              bubbles={bubbles}
              onSelect={select}
              focused={focused}
              onFocus={() => setFocused(!focused)}
            />
          )}
          {view === "workstations" && (
            <Workstations
              rows={filtered}
              paused={paused}
              bubbles={bubbles}
              onSelect={select}
            />
          )}
          {view === "agents" && (
            <Agents rows={filtered} bubbles={bubbles} onSelect={select} />
          )}
          {view === "flow" && (
            <Flow rows={filtered} paused={paused} onSelect={select} />
          )}
          <div inert={focused}>
            {view !== "usage" && (
              <MetricsTable rows={filtered} onSelect={select} />
            )}
            <footer className="mt-5 flex flex-col justify-between gap-2 text-[9px] text-stone-400 sm:flex-row">
              <span>● Made for the way your team works.</span>
              <span>Demo workspace · Belum terhubung ke WABA / Meta API</span>
            </footer>
          </div>
        </main>
      </div>
      {selected && (
        <SessionDialog
          row={selected.row}
          tick={selected.tick}
          onClose={() => setSelected(null)}
        />
      )}
      {settings && (
        <SettingsDialog
          initialTenant={tenant}
          config={config}
          onSave={persist}
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}

function KPIs({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const errors = rows.reduce((sum, row) => sum + row.errors, 0);
  const working = rows.filter(
    (row) => WorkstationState.resolve(row) === "working",
  ).length;
  const idle = rows.filter(
    (row) => WorkstationState.resolve(row) === "idle",
  ).length;
  const cards = [
    {
      title: "Workstations",
      value: rows.length,
      unit: "nomor",
      sub: `${working} working · ${idle} standby`,
      icon: "grid",
    },
    {
      title: "Total pesan",
      value: fmt(total),
      sub: "Dalam siklus saat ini",
      icon: "chat",
    },
    {
      title: "Success rate",
      value: total ? (((total - errors) / total) * 100).toFixed(1) : "—",
      unit: total ? "%" : "",
      sub: `${fmt(total - errors)} pesan berhasil`,
      icon: "flow",
    },
    {
      title: "Error count",
      value: fmt(errors),
      sub: `${total ? ((errors / total) * 100).toFixed(1) : 0}% dari total pesan`,
      error: true,
      icon: "close",
    },
    {
      title: "Avg. latency",
      value: rows.length
        ? (
            rows.reduce((sum, row) => sum + row.latency, 0) / rows.length
          ).toFixed(2)
        : "—",
      unit: rows.length ? "s" : "",
      sub: "Rata-rata per sesi",
      icon: "refresh",
    },
  ];
  return (
    <section
      aria-label="Ringkasan metrik"
      className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3"
    >
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`min-w-0 rounded-xl border border-stone-200 bg-[#fdfefb] p-3 sm:p-4 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}
        >
          <div className="flex items-center justify-between gap-1 text-[10px] text-stone-500">
            <span>{card.title}</span>
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#f1f4e9] text-[#809771]">
              <Icon name={card.icon} className="size-3.5" />
            </span>
          </div>
          <div
            className={`my-2 text-[27px] font-semibold tracking-[-1px] 2xl:text-3xl ${card.error ? "text-[#b97b6d]" : "text-[#314b36]"}`}
          >
            {card.value}
            <span className="ml-1 text-[11px] font-normal tracking-normal text-stone-400">
              {card.unit}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-stone-400">
            {card.sub}
          </p>
        </div>
      ))}
    </section>
  );
}
