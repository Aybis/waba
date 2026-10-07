import { Scene } from "./Office.jsx";
import { Badge, buttonClass, dotClasses } from "./ui.jsx";
import { StatusBubble, WorkstationState } from "../lib/state.js";
import { fmt } from "../lib/telemetry.js";

export function Workstations({ rows, paused, bubbles, onSelect }) {
  const services = [...new Set(rows.map((row) => row.serviceId))];
  return (
    <div className="space-y-6">
      {services.map((service) => (
        <section key={service}>
          <h2 className="mb-3 text-sm font-semibold">
            {rows.find((row) => row.serviceId === service)?.serviceLabel}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {rows
              .filter((row) => row.serviceId === service)
              .map((row) => (
                <article
                  key={row.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white"
                >
                  <header className="flex items-center justify-between gap-2 p-4">
                    <div>
                      <p className="text-[9px] tracking-widest text-stone-400">
                        WORKSTATION{" "}
                        {String(row.workstationIndex).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 font-mono text-sm font-semibold">
                        {row.number}
                        {row.displayName && (
                          <span className="ml-1 font-sans text-[10px] font-normal">
                            ({row.displayName})
                          </span>
                        )}
                      </h3>
                    </div>
                    <Badge row={row} />
                  </header>
                  <div className="h-56">
                    <Scene
                      rows={[row]}
                      paused={paused}
                      bubbles={bubbles}
                      onSelect={onSelect}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-4 text-center">
                    <Mini label="Pesan" value={fmt(row.total)} />
                    <Mini label="Error" value={fmt(row.errors)} />
                    <Mini label="Latency" value={`${row.latency}s`} />
                  </div>
                  <button
                    onClick={() => onSelect(row)}
                    className={`${buttonClass} m-3 mt-0 w-[calc(100%-24px)]`}
                  >
                    Detail {row.serviceLabel} · {row.number}
                    {row.displayName && (
                      <span className="ml-1 font-sans text-[10px] font-normal">
                        ({row.displayName})
                      </span>
                    )}{" "}
                    ↗
                  </button>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
function Mini({ label, value }) {
  return (
    <div className="min-w-0">
      <strong className="block truncate text-sm font-medium">{value}</strong>
      <span className="text-[10px] text-stone-400">{label}</span>
    </div>
  );
}

export function Agents({ rows, bubbles, onSelect }) {
  return (
    <section
      aria-label="Agent View"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
    >
      {rows.map((row) => (
        <article
          key={row.id}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white"
        >
          <header className="flex items-center justify-between gap-2 p-4">
            <div>
              <h2 className="font-mono text-sm font-semibold">
                {row.number}
                {row.displayName && (
                  <span className="ml-1 font-sans text-[10px] font-normal">
                    ({row.displayName})
                  </span>
                )}
              </h2>
              <p className="mt-1 text-[10px] text-stone-400">
                {row.serviceLabel} · Inbound + Outbound
              </p>
            </div>
            <Badge row={row} />
          </header>
          <div className="flex min-h-44 flex-col gap-3 bg-[#f1f5ed] p-4 text-xs">
            <p className="max-w-[85%] self-start rounded-xl rounded-bl-sm bg-white px-3 py-2 text-stone-600">
              Halo, saya mau cek pesanan.
            </p>
            <p className="max-w-[85%] self-end rounded-xl rounded-br-sm bg-emerald-100 px-3 py-2 text-emerald-800">
              Terima kasih, pesanmu sedang kami proses.
            </p>
            {bubbles && (
              <p
                className={`rounded-lg p-2 text-[11px] ${WorkstationState.resolve(row) === "error" ? "bg-rose-50 text-rose-600" : "bg-white/70 text-stone-500"}`}
              >
                {StatusBubble.content(row).title} ·{" "}
                {StatusBubble.content(row).detail}
              </p>
            )}
            <p className="mt-auto text-[9px] text-stone-400">
              Contoh percakapan · simulasi
            </p>
          </div>
          <footer className="flex items-center justify-between gap-2 p-3">
            <span className="text-[10px] text-stone-400">
              {fmt(row.total)} pesan · {row.latency}s
            </span>
            <button className={buttonClass} onClick={() => onSelect(row)}>
              Detail {row.number}
              {row.displayName && (
                <span className="ml-1 font-sans text-[10px] font-normal">
                  ({row.displayName})
                </span>
              )}{" "}
              ↗
            </button>
          </footer>
        </article>
      ))}
    </section>
  );
}

export function Flow({ rows, paused, onSelect }) {
  return (
    <section aria-label="Traffic Flow" className="space-y-4">
      {[...new Set(rows.map((row) => row.serviceId))].map((service) => (
        <article
          key={service}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white"
        >
          <header className="border-b border-stone-100 p-4">
            <h2 className="text-sm font-semibold">
              {rows.find((row) => row.serviceId === service)?.serviceLabel}
            </h2>
            <p className="mt-1 text-xs text-stone-400">
              Alur pesan simulasi · Customer → Webhook → Agent → Meta API
            </p>
          </header>
          <div className="overflow-x-auto p-4">
            <div className="min-w-[610px]">
              <div className="mb-4 grid grid-cols-4 gap-4 text-center text-[10px] tracking-wider text-stone-400">
                {["CUSTOMER", "WEBHOOK", "WABA AGENT", "META API"].map(
                  (label) => (
                    <span key={label}>{label}</span>
                  ),
                )}
              </div>
              {rows
                .filter((row) => row.serviceId === service)
                .map((row) => (
                  <button
                    key={row.id}
                    onClick={() => onSelect(row)}
                    aria-label={`Alur ${row.serviceLabel} ${row.number} ${row.displayName || ""}`}
                    className="relative mb-3 grid w-full grid-cols-4 items-center gap-4 rounded-lg p-2 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                  >
                    <div className="pointer-events-none absolute inset-x-14 top-1/2 h-px bg-emerald-200" />
                    {[
                      "Pesan masuk",
                      row.number,
                      StatusBubble.content(row).title,
                      WorkstationState.resolve(row) === "error"
                        ? "Gagal terkirim"
                        : "Outbound",
                    ].map((label, index) => (
                      <span
                        key={index}
                        className="relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-[#f7faf4] px-2 text-[10px]"
                      >
                        <i
                          className={`size-1.5 shrink-0 rounded-full ${dotClasses[WorkstationState.resolve(row)]} ${paused ? "" : "motion-safe:animate-pulse"}`}
                        />
                        <span className="line-clamp-2">{label}</span>
                      </span>
                    ))}
                  </button>
                ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export function MetricsTable({ rows, onSelect }) {
  return (
    <section className="mt-7">
      <h2 className="text-sm font-semibold">Detail nomor WABA</h2>
      <p className="mb-4 mt-1 text-xs text-stone-400">
        Metrik dari workstation yang ditampilkan.
      </p>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="bg-stone-50 text-[9px] uppercase tracking-wider text-stone-400">
            <tr>
              {[
                "Workstation",
                "Nomor WABA",
                "Business Unit",
                "WABA Account",
                "Status",
                "Total pesan",
                "Success rate",
                "Error",
                "Latency",
              ].map((label) => (
                <th
                  key={label}
                  className="whitespace-nowrap px-4 py-3 font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-stone-100 hover:bg-stone-50"
              >
                <td className="px-4 py-2 font-mono text-[10px] text-stone-400">
                  PC {String(row.workstationIndex).padStart(2, "0")}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onSelect(row)}
                    aria-label={`Detail nomor ${row.number} ${row.displayName || ""} service ${row.serviceLabel}`}
                    className="min-h-10 font-mono font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-4"
                  >
                    {row.number}
                    {row.displayName && (
                      <span className="ml-1 font-sans text-[10px] font-normal">
                        ({row.displayName})
                      </span>
                    )}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-stone-500">
                  {row.tenantPath}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-stone-500">
                  {row.serviceLabel}
                </td>
                <td className="px-4 py-2">
                  <Badge row={row} />
                </td>
                <td className="px-4 py-2 font-mono">{fmt(row.total)}</td>
                <td className="px-4 py-2 font-mono">
                  {((row.success / row.total) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-2 font-mono">{fmt(row.errors)}</td>
                <td className="px-4 py-2 font-mono">{row.latency}s</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-stone-400">
                  Tidak ada nomor yang sesuai filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
