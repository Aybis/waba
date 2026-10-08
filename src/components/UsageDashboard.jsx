import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_RATES,
  RATE_KEY,
  loadRates,
  monthNow,
  demoMessages,
  summarize,
  reviewBursts,
  rupiah,
  num,
  REFERENCE_SOURCE,
  META_SOURCE,
} from "../lib/usage.js";
import { inputClass, buttonClass } from "./ui.jsx";
const panel = "min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5";
function Stat({ label, value, detail }) {
  return (
    <div className={panel}>
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-[10px] text-stone-400">{detail}</p>
    </div>
  );
}
export function UsageDashboard({
  config,
  unit = "",
  account = "",
  phone = "",
}) {
  const [month, setMonth] = useState(monthNow());
  const [category, setCategory] = useState("");
  const [rates, setRates] = useState(loadRates);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const reviewRef = useRef(null);
  useEffect(() => {
    if (detail) reviewRef.current?.focus();
  }, [detail]);
  const all = useMemo(() => demoMessages(config, month), [config, month]);
  const scoped = useMemo(
    () =>
      all.filter(
        (m) =>
          (!unit || m.businessUnitId === unit) &&
          (!account || m.accountId === account) &&
          (!phone || m.phoneId === phone),
      ),
    [all, unit, account, phone],
  );
  const filtered = useMemo(() => {
    if (!category) return scoped;
    const threads = new Set(
      scoped
        .filter((m) => m.direction === "outbound" && m.category === category)
        .map((m) => m.conversationId),
    );
    return scoped.filter((m) =>
      m.direction === "inbound"
        ? threads.has(m.conversationId)
        : m.category === category,
    );
  }, [scoped, category]);
  useEffect(() => {
    setDetail(null);
    setExpanded(false);
  }, [unit, account, phone, month, category]);
  const total = summarize(filtered, rates);
  // Detect bursts in the full ordered conversation before filtering by category.
  const reviews = useMemo(
    () =>
      reviewBursts(scoped, rates).filter(
        (r) => !category || r.category === category,
      ),
    [scoped, rates, category],
  );
  const units = config.businessUnits.filter((u) => !unit || u.id === unit);
  units.sort(
    (a, b) =>
      filtered.filter((m) => m.businessUnitId === b.id).length -
      filtered.filter((m) => m.businessUnitId === a.id).length,
  );
  const numberStats = config.accounts
    .filter(
      (a) =>
        (!unit || a.businessUnitId === unit) && (!account || a.id === account),
    )
    .flatMap((a) =>
      a.numbers
        .filter((n) => !phone || n.id === phone)
        .map((n) => ({
          a,
          n,
          ...summarize(
            filtered.filter((m) => m.accountId === a.id && m.phoneId === n.id),
            rates,
          ),
        })),
    )
    .sort((a, b) => b.oneWord - a.oneWord);
  const days = [...new Set(filtered.map((m) => m.date))].sort();
  const daily = days.map((day) => ({
    day,
    ...summarize(
      filtered.filter((m) => m.date === day),
      rates,
    ),
  }));
  const max = Math.max(1, ...daily.map((d) => d.bubbles));
  function saveRates(e) {
    e.preventDefault();
    const next = Object.fromEntries(
      CATEGORIES.map((k) => [k, draft[k] === "" ? null : Number(draft[k])]),
    );
    if (
      CATEGORIES.some(
        (k) => next[k] !== null && (!Number.isFinite(next[k]) || next[k] < 0),
      )
    ) {
      setMessage("Tarif harus angka positif atau nol.");
      return;
    }
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(next));
      setRates(next);
      setDraft(null);
      setMessage("Tarif kerja disimpan di browser ini.");
    } catch {
      setMessage("Tarif gagal disimpan.");
    }
  }
  function csv() {
    const lines = [
      [
        "BU",
        "Category",
        "Outbound bubbles",
        "Delivered",
        "Billable",
        "Free",
        "Unpriced",
        "Rate IDR",
        "Estimated IDR",
      ],
      ...units.flatMap((u) =>
        summarize(
          filtered.filter((m) => m.businessUnitId === u.id),
          rates,
        ).categories.map((c) => [
          u.name,
          CATEGORY_LABELS[c.category],
          c.bubbles,
          c.delivered,
          c.billable,
          c.free,
          c.unknown,
          c.rate ?? "",
          c.cost,
        ]),
      ),
    ];
    const text = lines
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `waba-demo-usage-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section aria-label="Usage and cost analytics" className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-emerald-700">
            USAGE INTELLIGENCE
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Every bubble counts.</h2>
          <p className="mt-1 text-xs text-stone-500">
            Volume, biaya, dan pola percakapan per Business Unit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="text-[10px] text-stone-500">
            Bulan (WIB)
            <select
              aria-label="Usage month"
              className={inputClass}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, index) => {
                const [year, currentMonth] = monthNow().split("-").map(Number);
                const date = new Date(
                  Date.UTC(year, currentMonth - 1 - index, 1),
                );
                const value = date.toISOString().slice(0, 7);
                return (
                  <option key={value} value={value}>
                    {new Intl.DateTimeFormat("id-ID", {
                      year: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    }).format(date)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-[10px] text-stone-500">
            Kategori
            <select
              aria-label="Usage category"
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <button className={`${buttonClass} self-end`} onClick={csv}>
            ↓ Export CSV
          </button>
        </div>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <strong>SIMULASI · bukan tagihan.</strong> Usage dan status billable
        adalah contoh, terpisah dari metrik live simulasi. Estimasi memakai
        tarif dasar Indonesia / IDR, tanpa pajak, biaya ORION/BSP, atau diskon
        volume. Marketing Lite memakai referensi marketing, bukan harga lelang
        aktual.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Outbound bubbles"
          value={num(total.bubbles)}
          detail={`${num(total.inbound)} inbound · outbound termasuk gagal`}
        />
        <Stat
          label="Billable delivered"
          value={num(total.billable)}
          detail="Satu pesan terkirim, dihitung sekali"
        />
        <Stat
          label={total.unknown ? "Subtotal terhitung" : "Estimasi biaya dasar"}
          value={rupiah(total.cost)}
          detail={
            total.unknown
              ? `${num(total.unknown)} pesan belum dapat dihargai`
              : "Rate card × delivered billable · bukan invoice"
          }
        />
        <Stat
          label="Balasan satu kata"
          value={`${num(total.oneWord)} · ${total.bubbles ? Math.round((total.oneWord / total.bubbles) * 100) : 0}%`}
          detail={`${num(total.oneWordBillable)} billable · perlu review konteks`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className={panel}>
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Tarif & usage per kategori
            </h3>
            <button
              className="text-xs text-emerald-700 underline"
              onClick={() => {
                setDraft(
                  Object.fromEntries(
                    CATEGORIES.map((k) => [k, rates[k] ?? ""]),
                  ),
                );
                setMessage("");
              }}
            >
              Atur tarif kerja
            </button>
          </div>
          <p className="mb-4 mt-1 text-[10px] text-stone-400">
            Meta calculator diperiksa 7 Oktober 2026 · tujuan +62 · tarif dasar
            per delivered message
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="text-[10px] text-stone-400">
                <tr>
                  {[
                    "Kategori",
                    "Harga / pesan",
                    "Bubbles",
                    "Billable",
                    "Gratis",
                    "Est. biaya",
                  ].map((t) => (
                    <th key={t} className="pb-3 pr-3 font-medium">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {total.categories.map((c) => (
                  <tr key={c.category} className="border-t border-stone-100">
                    <td className="py-3 pr-2 font-medium">
                      {CATEGORY_LABELS[c.category]}
                      {c.category === "marketing_lite" && (
                        <small className="block text-[9px] text-amber-700">
                          Referensi · harga aktual variabel
                        </small>
                      )}
                    </td>
                    <td className="pr-2 whitespace-nowrap">
                      {c.rate === null ? "Belum diisi" : rupiah(c.rate)}
                    </td>
                    <td>{num(c.bubbles)}</td>
                    <td>{num(c.billable)}</td>
                    <td>{num(c.free)}</td>
                    <td className="whitespace-nowrap font-semibold">
                      {rupiah(c.cost)}
                      {c.unknown > 0 ? " + ?" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-stone-500">
            Harga kerja{" "}
            {CATEGORIES.some((k) => rates[k] !== DEFAULT_RATES[k])
              ? "telah diubah pengguna"
              : "mengikuti snapshot sumber"}
            . Marketing Lite adalah jalur pengiriman marketing, bukan kategori
            tagihan tambahan; tidak dihitung dua kali.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-emerald-700 underline">
            <a href={REFERENCE_SOURCE} target="_blank" rel="noreferrer">
              Meta calculator / IDR
            </a>
            <a href={META_SOURCE} target="_blank" rel="noreferrer">
              Aturan billing & volume tiers
            </a>
            <a
              href="https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/pricing"
              target="_blank"
              rel="noreferrer"
            >
              Marketing max-price
            </a>
          </div>
        </div>
        <div className={panel}>
          <h3 className="text-sm font-semibold">Outbound bubbles per hari</h3>
          <p className="mt-1 text-[10px] text-stone-400">
            {month} · pilih batang untuk volume dan biaya
          </p>
          <div
            className="mt-5 flex h-44 items-end gap-1 overflow-x-auto border-b border-stone-200"
            aria-label="Daily usage chart"
          >
            {daily.map((d) => (
              <button
                key={d.day}
                title={`${d.day}: ${num(d.bubbles)} bubbles, ${rupiah(d.cost)}`}
                aria-label={`${d.day}: ${d.bubbles} bubbles`}
                onClick={() =>
                  setMessage(
                    `${d.day}: ${num(d.bubbles)} bubbles · ${num(d.billable)} billable · ${rupiah(d.cost)} estimasi`,
                  )
                }
                className="group flex h-full min-w-4 flex-1 flex-col justify-end"
              >
                <span
                  className="rounded-t bg-emerald-600 transition group-hover:bg-emerald-800"
                  style={{ height: `${(d.bubbles / max) * 85}%` }}
                />
                <span className="py-1 text-[8px] text-stone-400">
                  {d.day.slice(-2)}
                </span>
              </button>
            ))}
          </div>
          {!daily.length && (
            <p className="mt-4 text-xs text-stone-400">
              Belum ada usage pada scope ini.
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-stone-500">Customer unik*</p>
              <strong className="text-xl">{num(total.customers)}</strong>
            </div>
            <div>
              <p className="text-[10px] text-stone-500">Bubbles / percakapan</p>
              <strong className="text-xl">
                {total.conversations
                  ? (total.bubbles / total.conversations).toFixed(1)
                  : "—"}
              </strong>
            </div>
          </div>
          <p className="mt-2 text-[9px] text-stone-400">
            *Identitas customer pada fixture terpisah per WA number. Percakapan
            adalah thread analitis, bukan unit billing.
          </p>
        </div>
      </div>
      {draft && (
        <form onSubmit={saveRates} className={`${panel} border-emerald-300`}>
          <h3 className="mb-3 text-sm font-semibold">
            Tarif kerja — IDR / delivered billable message
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CATEGORIES.map((c) => (
              <label key={c} className="text-xs">
                {CATEGORY_LABELS[c]}
                <input
                  aria-label={`Rate ${c}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft[c]}
                  placeholder="Belum diketahui"
                  className={`${inputClass} mt-1`}
                  onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="my-3 text-[10px] text-stone-500">
            Kosong = belum diketahui, bukan gratis. Perubahan ini hanya
            memengaruhi estimasi di browser.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass}>Simpan tarif</button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setDraft({ ...DEFAULT_RATES })}
            >
              Snapshot Meta
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setDraft(null)}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {message}
        </p>
      )}
      <div className={panel}>
        <h3 className="mb-4 text-sm font-semibold">Biaya per Business Unit</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => {
            const s = summarize(
              filtered.filter((m) => m.businessUnitId === u.id),
              rates,
            );
            return (
              <div
                key={u.id}
                className="rounded-lg border border-stone-200 p-3"
              >
                <div className="flex justify-between gap-2">
                  <strong className="text-sm">{u.name}</strong>
                  <span className="text-sm font-semibold">
                    {rupiah(s.cost)}
                    {s.unknown ? " + ?" : ""}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-stone-500">
                  {num(s.bubbles)} bubbles · {num(s.billable)} billable ·{" "}
                  {num(s.oneWord)} satu kata
                </p>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded bg-stone-100">
                  {s.categories.map((c, i) => (
                    <span
                      key={c.category}
                      title={`${CATEGORY_LABELS[c.category]}: ${c.bubbles}`}
                      className={
                        [
                          "bg-sky-400",
                          "bg-emerald-500",
                          "bg-violet-400",
                          "bg-amber-400",
                          "bg-rose-400",
                        ][i]
                      }
                      style={{
                        width: `${s.bubbles ? (c.bubbles / s.bubbles) * 100 : 0}%`,
                      }}
                    />
                  ))}
                </div>
                {!s.bubbles && (
                  <p className="mt-2 text-[10px] text-stone-400">
                    Belum ada nomor atau usage dalam scope.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[9px] text-stone-400">
          Warna: service biru · utility hijau · authentication ungu · marketing
          kuning · marketing lite merah muda
        </p>
      </div>
      <div className={panel}>
        <h3 className="text-sm font-semibold">Efisiensi per WA number</h3>
        <p className="mb-4 mt-1 text-[10px] text-stone-500">
          Urut berdasarkan balasan satu kata. Review konteks, bukan otomatis
          menilai performa agent.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="text-[10px] text-stone-400">
              <tr>
                {[
                  "BU / nomor",
                  "Customer",
                  "Percakapan",
                  "Bubbles",
                  "Satu kata",
                  "Billable satu kata",
                  "Est. biaya",
                ].map((t) => (
                  <th className="pb-3 pr-3" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numberStats.map((s) => (
                <tr key={s.a.id + s.n.id} className="border-t border-stone-100">
                  <td className="py-3 pr-3">
                    <strong>
                      {
                        config.businessUnits.find(
                          (u) => u.id === s.a.businessUnitId,
                        )?.name
                      }{" "}
                      · {s.n.number}
                    </strong>
                    <small className="block text-stone-400">
                      {s.a.name} · {s.n.displayName}
                    </small>
                  </td>
                  <td>{s.customers}</td>
                  <td>{s.conversations}</td>
                  <td>{num(s.bubbles)}</td>
                  <td className="font-semibold text-amber-700">{s.oneWord}</td>
                  <td>{s.oneWordBillable}</td>
                  <td>{rupiah(s.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={panel}>
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              Reply fragmentation review
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {num(reviews.length)} burst kandidat ·{" "}
              {num(reviews.reduce((s, r) => s + r.extra, 0))} bubble berlebih ·{" "}
              {rupiah(reviews.reduce((s, r) => s + r.saving, 0))} skenario
              penghematan
            </p>
          </div>
          <button
            className={buttonClass}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Ringkas" : "Lihat semua"}
          </button>
        </div>
        <p className="my-3 text-[10px] leading-relaxed text-stone-500">
          Agent yang sama mengirim beberapa balasan dalam 30 detik tanpa respons
          customer, termasuk satu kata. OTP dikecualikan. Penghematan
          mengasumsikan balasan dapat digabung tanpa mengurangi kualitas; hanya
          pesan delivered billable yang dihitung. Bukan penghematan terjamin.
        </p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {(expanded ? reviews : reviews.slice(0, 6)).map((r) => (
            <button
              key={r.id}
              onClick={() => setDetail(r)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-left"
            >
              <div className="min-w-0">
                <strong className="text-xs">
                  {
                    config.businessUnits.find((u) => u.id === r.businessUnitId)
                      ?.name
                  }{" "}
                  · {r.number} · {r.agent}
                </strong>
                <p className="mt-1 break-words text-[11px] text-stone-500">
                  {r.messages.map((m) => `“${m.text}”`).join(" → ")}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-amber-800">
                {r.messages.length} → 1 bubble · {rupiah(r.saving)} ↗
              </span>
            </button>
          ))}
        </div>
        {!reviews.length && (
          <p className="py-5 text-xs text-stone-400">
            Tidak ada burst satu kata pada scope ini.
          </p>
        )}
      </div>
      {detail && (
        <section
          ref={reviewRef}
          tabIndex={-1}
          aria-label="Conversation review"
          className={`${panel} border-emerald-300`}
        >
          <div className="flex justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Review percakapan · {detail.number} · {detail.agent}
            </h3>
            <button className={buttonClass} onClick={() => setDetail(null)}>
              Tutup review
            </button>
          </div>
          <p className="mt-2 break-all font-mono text-[9px] text-stone-400">
            {detail.conversationId} · customer anonim · simulasi
          </p>
          {scoped
            .filter((m) => m.conversationId === detail.conversationId)
            .map((m) => (
              <div
                key={m.id}
                className={`mt-3 rounded-lg p-3 text-xs ${m.direction === "inbound" ? "mr-6 bg-stone-100" : "ml-6 bg-emerald-50"}`}
              >
                <p>{m.text}</p>
                <p className="mt-2 text-[9px] text-stone-400">
                  {m.at.slice(11, 19)} WIB · {m.direction} · {m.status} ·{" "}
                  {CATEGORY_LABELS[m.category]} ·{" "}
                  {m.billable === true
                    ? "Billable"
                    : m.billable === false
                      ? "Non-billable"
                      : "Belum diketahui"}
                </p>
              </div>
            ))}
          <p className="mt-4 text-xs text-emerald-800">
            Saran review: gabungkan pengakuan dan jawaban yang utuh dalam satu
            balasan. Jangan menunda jawaban penting hanya untuk mengurangi
            bubble.
          </p>
        </section>
      )}
    </section>
  );
}
