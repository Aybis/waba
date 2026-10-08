import { businessTheme } from "../lib/business-colors.js";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { createOfficeScene } from "../lib/office-scene.js";
import { StatusBubble, WorkstationState } from "../lib/state.js";
import { Badge, buttonClass, dotClasses, Icon } from "./ui.jsx";

export function Scene({ rows, paused, bubbles, onSelect, ref }) {
  const host = useRef(null);
  const engine = useRef(null);
  useEffect(() => {
    engine.current = createOfficeScene();
    return () => {
      engine.current.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current.render(host.current, rows, { onSelect });
    engine.current.setPaused(paused);
    engine.current.setBubbles(bubbles);
  }, [rows, onSelect, paused, bubbles]);
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => engine.current?.zoomIn(),
      zoomOut: () => engine.current?.zoomOut(),
      reset: () => engine.current?.resetView(),
    }),
    [],
  );
  return (
    <div
      ref={host}
      data-testid="office-canvas-host"
      className="relative h-full min-h-0 w-full overflow-hidden bg-radial from-[#f0f2e8] to-[#e4eadc]"
    />
  );
}

export function Office({ rows, paused, bubbles, onSelect, focused, onFocus }) {
  const scene = useRef(null);
  const units = [
    ...new Map(
      rows.map((row) => [
        row.tenantId,
        { id: row.tenantId, name: row.tenantPath },
      ]),
    ).values(),
  ];
  return (
    <section
      aria-label="Kantor monitoring isometrik"
      className={
        focused
          ? "fixed inset-2 z-40 grid min-h-0 grid-cols-1 gap-3 rounded-xl bg-[#f6f7f4] shadow-[0_0_0_20px_#f6f7f4] sm:inset-4 xl:grid-cols-[minmax(0,1fr)_280px]"
          : "grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_290px]"
      }
    >
      <div
        className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#dce3d4] bg-[#edf1e5] ${focused ? "h-full min-h-0" : "h-[420px] sm:h-[530px] xl:h-[610px]"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded border border-[#cad5ba] px-1.5 py-1 font-mono text-[8px] text-[#7e8c6b]">
              FLOOR 01
            </span>
            <h2 className="text-[11px] font-medium text-[#647654] sm:text-xs">
              All Business Units · WABA office
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[10px] text-[#819574] min-[400px]:flex">
              <i
                className={`size-1.5 rounded-full ${paused ? "bg-stone-400" : "bg-emerald-500"}`}
              />
              {paused ? "Office paused" : "Office is live"}
            </span>
            <button
              className={`${buttonClass} min-h-9 px-2`}
              aria-label={focused ? "Keluar fokus kantor" : "Fokus kantor"}
              aria-pressed={focused}
              onClick={onFocus}
            >
              <Icon name="focus" />
            </button>
          </div>
        </div>
        <div className="max-h-28 shrink-0 overflow-y-auto border-y border-[#dce3d4] bg-[#f8faf3] px-3 py-2 sm:px-5">
          <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-stone-500">
            <strong className="tracking-widest">BUSINESS UNIT</strong>
            <span>
              Warna lantai = BU ·{" "}
              <strong className="text-red-700">Nomor merah = error</strong>
            </span>
          </div>
          <ul
            aria-label="Business Unit color legend"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center gap-1.5 text-[10px] font-medium"
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{
                    backgroundColor: businessTheme(unit.id, unit.name).accent,
                  }}
                />
                <span>{unit.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-h-0 flex-1">
          <Scene
            ref={scene}
            rows={rows}
            paused={paused}
            bubbles={bubbles}
            onSelect={onSelect}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <span className="max-w-40 text-[10px] leading-relaxed text-[#7d8d6e] sm:max-w-none">
            ↖ Pilih operator untuk detail aktivitas
          </span>
          <div className="flex gap-1" aria-label="Kontrol zoom kantor">
            <button
              className={buttonClass}
              aria-label="Perkecil kantor"
              onClick={() => scene.current.zoomOut()}
            >
              −
            </button>
            <button
              className={buttonClass}
              onClick={() => scene.current.reset()}
            >
              Fit view
            </button>
            <button
              className={buttonClass}
              aria-label="Perbesar kantor"
              onClick={() => scene.current.zoomIn()}
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className={focused ? "hidden min-h-0 xl:block" : "min-w-0"}>
        <Activity
          rows={rows}
          paused={paused}
          onSelect={onSelect}
          focused={focused}
        />
      </div>
    </section>
  );
}

function Activity({ rows, paused, onSelect, focused }) {
  const [expanded, setExpanded] = useState(false);
  const priority = { error: 0, warning: 1, working: 2, idle: 3 };
  const ordered = [...rows].sort(
    (a, b) =>
      priority[WorkstationState.resolve(a)] -
      priority[WorkstationState.resolve(b)],
  );
  const counts = Object.fromEntries(
    Object.keys(dotClasses).map((state) => [
      state,
      rows.filter((row) => WorkstationState.resolve(row) === state).length,
    ]),
  );
  return (
    <aside
      aria-label="Aktivitas kantor"
      className={`flex min-h-0 flex-col rounded-xl border border-stone-200 bg-[#fffefa] p-4 sm:p-5 ${focused ? "h-full" : "h-[520px] xl:h-[610px]"}`}
    >
      <p className="text-[9px] font-semibold tracking-[.16em] text-stone-400">
        DI DALAM RUANG
      </p>
      <h2 className="mt-1.5 text-base font-semibold tracking-tight">
        Aktivitas kantor
      </h2>
      <p className="mt-2 text-[10px] text-stone-500">
        ● Snapshot simulasi{paused ? " · dijeda" : ""}
      </p>
      <div className="my-4 grid grid-cols-4 gap-2 xl:grid-cols-2">
        {Object.entries(counts).map(([state, count]) => (
          <div
            key={state}
            className="flex flex-col justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 p-2 min-[450px]:flex-row xl:items-center"
          >
            <span className="flex items-center gap-1 text-[9px] text-stone-500">
              <i
                className={`size-1.5 shrink-0 rounded-full ${dotClasses[state]}`}
              />
              {WorkstationState.label(state)}
            </span>
            <strong className="text-sm">{count}</strong>
          </div>
        ))}
      </div>
      <p
        className={`rounded-lg px-3 py-2.5 text-[11px] ${counts.error + counts.warning ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
      >
        {rows.length
          ? counts.error + counts.warning
            ? `${counts.error + counts.warning} agent perlu perhatian`
            : "Semua agent dalam kondisi baik"
          : "Tidak ada agent ditampilkan"}
      </p>
      <div className="mb-1 mt-5 flex justify-between text-xs">
        <h3 className="font-medium">Di meja sekarang</h3>
        <span className="text-stone-400">{rows.length} agent</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {(expanded ? ordered : ordered.slice(0, 6)).map((row) => (
          <button
            key={row.id}
            aria-label={`Detail ${row.serviceLabel} ${row.number} ${row.displayName || ""}`}
            onClick={() => onSelect(row)}
            className="flex w-full gap-3 border-b border-stone-100 py-3 text-left last:border-0 hover:bg-emerald-50/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e7eddb] text-[10px] font-medium text-[#7d8d66]">
              {row.tenantPath.split(" / ").at(-1).slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-1">
                <strong className="font-mono text-xs">
                  {row.number}
                  {row.displayName && (
                    <span className="ml-1 font-sans text-[10px] font-normal">
                      ({row.displayName})
                    </span>
                  )}
                </strong>
                <Badge row={row} />
              </span>
              <span className="mt-1 block truncate text-[10px] text-stone-400">
                {row.serviceLabel}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
                {StatusBubble.content(row).title}
              </span>
            </span>
          </button>
        ))}
        {!rows.length && (
          <p className="py-8 text-center text-xs text-stone-500">
            Belum ada agent yang cocok dengan filter.
          </p>
        )}
      </div>
      {rows.length > 6 && (
        <button
          className={`${buttonClass} mt-3 shrink-0`}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Tampilkan lebih sedikit ↑"
            : `Lihat semua ${rows.length} agent →`}
        </button>
      )}
    </aside>
  );
}
