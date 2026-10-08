export const CATEGORIES = [
  "service",
  "utility",
  "authentication",
  "marketing",
  "marketing_lite",
];
export const CATEGORY_LABELS = {
  service: "Service",
  utility: "Utility",
  authentication: "Authentication",
  marketing: "Marketing",
  marketing_lite: "Marketing Lite",
};
export const RATE_KEY = "waba-usage-rates-v1";
// Official Meta public calculator, Indonesia / IDR, retrieved 2026-10-07.
// Marketing Lite uses marketing list rate as a reference; actual max-price delivery may differ.
export const DEFAULT_RATES = {
  service: 356.65,
  utility: 356.65,
  authentication: 356.65,
  marketing: 586.33,
  marketing_lite: 586.33,
};
export const REFERENCE_SOURCE =
  "https://whatsappbusiness.com/products/platform-pricing/?country=ID&currency=IDR&category=Service";
export const META_SOURCE =
  "https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing";
export function loadRates(storage = globalThis.localStorage) {
  try {
    const r = JSON.parse(storage.getItem(RATE_KEY));
    if (
      r &&
      CATEGORIES.every(
        (k) =>
          r[k] === null ||
          (typeof r[k] === "number" && Number.isFinite(r[k]) && r[k] >= 0),
      )
    )
      return r;
  } catch {}
  return { ...DEFAULT_RATES };
}
export function monthNow() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}
function hash(s) {
  let h = 7;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return h;
}
export const wordCount = (text) =>
  String(text || "")
    .trim()
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length || 0;
export function demoMessages(config, month = monthNow()) {
  const now = new Date();
  const today = Number(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(now),
  );
  const days =
    month === monthNow()
      ? today
      : new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate();
  const messages = [];
  for (const a of config.accounts)
    for (const n of a.numbers) {
      const seed = hash(a.id + n.id);
      for (let d = 1; d <= days; d++)
        for (let c = 0; c < 8 + ((seed + d * 7) % 17); c++) {
          const customerId = `${a.id}:${n.id}:customer-${(c + d) % 25}`;
          const conversationId = `${a.id}:${n.id}:${d}:${c}`;
          const base = {
            businessUnitId: a.businessUnitId,
            accountId: a.id,
            phoneId: n.id,
            number: n.number,
            displayName: n.displayName,
            customerId,
            conversationId,
            market: "ID",
            currency: "IDR",
            agent: `Agent ${((seed + c) % 4) + 1}`,
            date: `${month}-${String(d).padStart(2, "0")}`,
            demo: true,
          };
          const start = `${base.date}T${String(8 + (c % 10)).padStart(2, "0")}:00:`;
          messages.push({
            ...base,
            id: `${conversationId}:in`,
            direction: "inbound",
            status: "received",
            category: "service",
            billable: false,
            text: "Bisa bantu cek status pesanan saya?",
            at: `${start}00+07:00`,
          });
          const fragmented = (seed + c + d) % 3 === 0;
          const category = CATEGORIES[(seed + c + d) % CATEGORIES.length];
          const texts = fragmented
            ? ["Baik", "Kak", "Saya cek status pesanan Anda sekarang."]
            : [
                "Pesanan Anda sedang diproses. Estimasi selesai sore ini, kami akan memberi kabar.",
              ];
          texts.forEach((text, j) => {
            const actual = fragmented ? "service" : category;
            const status =
              (seed + c + d + j) % 19 === 0 ? "failed" : "delivered";
            messages.push({
              ...base,
              id: `${conversationId}:out:${j}`,
              direction: "outbound",
              status,
              category: actual,
              billable:
                status === "failed"
                  ? false
                  : (actual === "service" || actual === "utility") &&
                      (seed + c) % 4 === 0
                    ? false
                    : true,
              text,
              at: `${start}${String(10 + j * 8).padStart(2, "0")}+07:00`,
              billingReason:
                "Simulated billability; production must use Meta/ORION pricing evidence",
            });
          });
        }
    }
  return messages;
}
export function summarize(messages, rates) {
  const unique = [...new Map(messages.map((m) => [m.id, m])).values()];
  const outbound = unique.filter((m) => m.direction === "outbound");
  const categories = CATEGORIES.map((category) => {
    const group = outbound.filter((m) => m.category === category);
    const delivered = group.filter((m) => m.status === "delivered");
    const charged = delivered.filter((m) => m.billable === true);
    const uncertain = delivered.filter((m) => m.billable == null);
    const rate = rates[category];
    const cost =
      rate === null ? 0 : Math.round(charged.length * rate * 100) / 100;
    return {
      category,
      bubbles: group.length,
      delivered: delivered.length,
      failed: group.length - delivered.length,
      billable: charged.length,
      free: delivered.filter((m) => m.billable === false).length,
      unknown: uncertain.length + (rate === null ? charged.length : 0),
      cost,
      rate,
    };
  });
  const single = outbound.filter((m) => wordCount(m.text) === 1);
  return {
    categories,
    bubbles: outbound.length,
    inbound: unique.filter((m) => m.direction === "inbound").length,
    customers: new Set(unique.map((m) => m.customerId)).size,
    conversations: new Set(unique.map((m) => m.conversationId)).size,
    oneWord: single.length,
    oneWordBillable: single.filter(
      (m) => m.status === "delivered" && m.billable === true,
    ).length,
    cost: Math.round(categories.reduce((s, c) => s + c.cost, 0) * 100) / 100,
    unknown: categories.reduce((s, c) => s + c.unknown, 0),
    billable: categories.reduce((s, c) => s + c.billable, 0),
  };
}
export function reviewBursts(messages, rates) {
  const groups = new Map();
  for (const m of messages) {
    if (!groups.has(m.conversationId)) groups.set(m.conversationId, []);
    groups.get(m.conversationId).push(m);
  }
  const results = [];
  for (const group of groups.values()) {
    const sorted = group.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let burst = [];
    const flush = () => {
      if (burst.length > 1 && burst.some((m) => wordCount(m.text) === 1)) {
        const removable = burst.slice(0, -1);
        const priced = removable.filter(
          (m) =>
            m.status === "delivered" &&
            m.billable === true &&
            rates[m.category] !== null,
        );
        results.push({
          id: burst[0].id,
          messages: [...burst],
          ...burst[0],
          extra: removable.length,
          saving:
            Math.round(
              priced.reduce((s, m) => s + rates[m.category], 0) * 100,
            ) / 100,
          unknown: removable.some(
            (m) =>
              m.billable == null || (m.billable && rates[m.category] === null),
          ),
        });
      }
      burst = [];
    };
    for (const m of sorted) {
      if (m.direction !== "outbound" || m.category === "authentication") {
        flush();
        continue;
      }
      if (
        burst.length &&
        (m.agent !== burst.at(-1).agent ||
          Date.parse(m.at) - Date.parse(burst.at(-1).at) > 30000)
      )
        flush();
      burst.push(m);
    }
    flush();
  }
  return results;
}
export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(n);
export const num = (n) => new Intl.NumberFormat("id-ID").format(n);
