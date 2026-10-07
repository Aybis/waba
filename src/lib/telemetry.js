import { WorkstationState } from "./state.js";
const resolveState = WorkstationState.resolve;
import { serviceLabel, tenantPath } from "./config.js";
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function rng(seed) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Agent roles & tasks ---------- */
const TASKS = [
  "Membaca pesan masuk & klasifikasi intent",
  "Ekstrak entitas (nama, tanggal, jumlah)",
  "Menjawab customer dengan template",
  "Meneruskan ke CSO bila di luar scope",
  "Update CRM & catat percakapan",
  "Mengirim notifikasi / reminder ke customer",
  "Broadcast promo tersegmentasi",
  "Follow-up pembayaran / invoice",
  "Konfirmasi jadwal & pengingat",
  "Kirim OTP / verifikasi",
];

function taskFor(seed, r) {
  return TASKS[Math.floor(r() * TASKS.length)];
}

/* ---------- Profil kesehatan per nomor (STABIL, bukan acak tiap detik) ----------
   OK     = sukses terus (hijau)
   WARN   = warning kuning  -> error INBOUND
   ERROR  = error merah     -> error OUTBOUND
   SERVER = error di server (webhook/meta tidak merespon)
-------------------------------------------------------------------------- */
function healthProfile(id, idx) {
  // 1 nomor SERVER per service (deterministik: nomor ke-4), sisanya tersebar
  if (idx === 3) return "SERVER";
  const h = hashStr(id);
  if (h % 23 === 5) return "SERVER";
  const r = h % 10;
  if (r < 5) return "OK";
  if (r < 8) return "WARN";
  return "ERROR";
}
function errMessage(health, id) {
  const code = 1000 + (hashStr(id + "|err") % 900);
  if (health === "WARN") return "Warn: High Latency — buffer pesan menumpuk";
  if (health === "SERVER")
    return `SERVER_${code}: Meta server tidak merespon — cek webhook`;
  return `ERROR_OUT_${code}: pesan KELUAR gagal terkirim (Meta API HTTP 500)`;
}

/* ---------- Telemetry: satu baris = satu agent (service + number) ---------- */
export function fetchTelemetry(config, tick = 1) {
  const rows = [];
  for (const svc of config.services) {
    for (const num of svc.numbers) {
      const id = svc.id + "|" + num;
      const health = healthProfile(id, svc.numbers.indexOf(num));

      const base = (hashStr(id) % 18000) + 400;
      const jitter =
        (Math.sin(tick * 0.3 + (hashStr(num) % 7)) + 1) * 0.25 + 0.75;
      const total = Math.max(1, Math.round(base * jitter));

      // error rate stabil sesuai profil nomor
      let errRate;
      if (health === "SERVER")
        errRate = 0.25 + (hashStr(id + "|s") % 30) / 1000;
      else if (health === "ERROR")
        errRate = 0.08 + (hashStr(id + "|e") % 50) / 1000;
      else if (health === "WARN")
        errRate = 0.02 + (hashStr(id + "|w") % 20) / 1000;
      else errRate = (hashStr(id + "|o") % 3) / 10000;
      const errors =
        health === "OK" ? 0 : Math.max(1, Math.round(total * errRate));
      const success = total - errors;

      const latencyBase =
        (health === "WARN" ? 2.8 : 0.4) + (hashStr(id + "|lat") % 180) / 100;
      const latency = +(
        latencyBase +
        (rng(hashStr(id) + tick)() - 0.5) * 0.3
      ).toFixed(2);

      // Aktivitas legacy dipetakan ke empat state oleh WorkstationState.
      const rnd = rng(hashStr(id) + tick * 7919);
      let status;
      if (health === "OK") {
        const r2 = rnd();
        status = r2 < 0.6 ? "ACTIVE" : r2 < 0.85 ? "IDLE" : "DONE";
      } else if (health === "WARN") {
        status = rnd() < 0.5 ? "ACTIVE" : "IDLE";
      } else {
        status = "ERROR";
      }

      rows.push({
        id,
        service: svc.name,
        serviceId: svc.id,
        tenantId: svc.tenantId,
        tenantPath: tenantPath(config.tenants, svc.tenantId),
        serviceLabel: serviceLabel(config, svc),
        number: num,
        workstationIndex: svc.numbers.indexOf(num) + 1,
        role: "Inbound + Outbound",
        health,
        status,
        total,
        success,
        errors,
        errRate: errors / total,
        latency,
        queueDepth:
          health === "WARN"
            ? 55 + (hashStr(id) % 45)
            : status === "ACTIVE"
              ? 1 + (hashStr(id + tick) % 18)
              : 0,
        errType:
          health === "SERVER"
            ? "SERVER"
            : health === "WARN"
              ? "INBOUND"
              : health === "ERROR"
                ? "OUTBOUND"
                : null,
        task: status === "IDLE" ? null : taskFor(id, rng(hashStr(id) + tick)),
        lastError: health !== "OK" ? errMessage(health, id) : null,
      });
    }
  }
  return rows;
}

/* ---------- Event stream (log per agent) ---------- */
export function eventsFor(r, tick = 1) {
  const rnd = rng(hashStr(r.id) + tick * 31);
  const t = () => {
    const d = new Date(Date.now() - Math.floor(rnd() * 55000));
    return d.toLocaleTimeString("id-ID", { hour12: false });
  };
  const evs = [];
  evs.push({
    t: t(),
    m: `Agent "${r.number} ${r.role}" mulai sesi`,
    k: "info",
  });
  const state = resolveState(r);
  if (state === "idle") {
    evs.push({
      t: t(),
      m: "Standby — operator istirahat, tidak ada antrean",
      k: "info",
    });
  } else if (state === "warning") {
    evs.push({
      t: t(),
      m: `Peringatan — antrean ${r.queueDepth ?? "tidak tersedia"}, latency ${r.latency}s`,
      k: "warn",
    });
    if (r.lastError) evs.push({ t: t(), m: r.lastError, k: "warn" });
  } else if (state === "error") {
    evs.push({
      t: t(),
      m: r.lastError || "Koneksi atau proses pengiriman gagal",
      k: "err",
    });
    evs.push({
      t: t(),
      m: `${r.errors} pesan gagal — periksa koneksi dan kredensial`,
      k: "err",
    });
  } else {
    evs.push({
      t: t(),
      m: `Terima pesan → pilih template (${r.total} pesan siklus ini)`,
      k: "ok",
    });
    if (r.errors > 0) {
      evs.push({
        t: t(),
        m: `LLM call gagal — ${r.errors} error (${(r.errRate * 100).toFixed(2)}%)`,
        k: "err",
      });
      evs.push({
        t: t(),
        m: "Retry otomatis 2x → fallback template default",
        k: "warn",
      });
    } else {
      evs.push({ t: t(), m: "Semua terkirim, tidak ada error", k: "ok" });
    }
  }
  evs.push({ t: t(), m: `Latency rata-rata ${r.latency}s`, k: "info" });
  return evs;
}

/* ---------- Session spans (waterfall ala AgentOps) ---------- */
export function spansFor(r, tick = 1) {
  const rnd = rng(hashStr(r.id) + tick * 17);
  const base = Date.now() - 90000;
  let cursor = base;
  const mk = (name, dur, kind, extra) => {
    const s = cursor;
    cursor += dur;
    return { name, start: s, dur, kind, extra };
  };
  const spans = [
    mk("receive_message", 300 + rnd() * 400, "ok"),
    mk(
      "llm.intent_classify",
      900 + rnd() * 1200,
      r.errors > 0 && rnd() < 0.5 ? "err" : "ok",
      r.errors > 0
        ? `model=meta-llm · status=timeout · retry=1`
        : "model=gemini-flash · topIntent=ORDER_STATUS",
    ),
    mk("tool.get_crm_context", 400 + rnd() * 500, "ok"),
    mk(
      "llm.generate_reply",
      1100 + rnd() * 1400,
      "ok",
      "template=approved · tokens=182",
    ),
    mk(
      "tool.send_whatsapp",
      600 + rnd() * 900,
      r.errors > 0 && rnd() < 0.4 ? "err" : "ok",
      r.errors > 0
        ? `Meta API 500 → retry → fallback OK (${r.errors} msg gagal)`
        : "delivered=OK",
    ),
    mk("log_analytics", 150 + rnd() * 200, "ok"),
  ];
  return spans;
}

export function fmt(n) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
