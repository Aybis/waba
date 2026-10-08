import test from "node:test";
import assert from "node:assert/strict";
import {
  summarize,
  reviewBursts,
  wordCount,
  DEFAULT_RATES,
  demoMessages,
  loadRates,
} from "./usage.js";
import { DEFAULT_CONFIG } from "./config.js";
const event = (id, extras = {}) => ({
  id,
  conversationId: "c",
  customerId: "u",
  direction: "outbound",
  category: "service",
  status: "delivered",
  billable: true,
  text: "Baik",
  agent: "A",
  at: "2026-10-01T10:00:00+07:00",
  ...extras,
});
test("only delivered billable messages cost money; retries deduplicated; Lite not double counted", () => {
  const a = event("1"),
    b = event("2", { status: "failed" }),
    c = event("3", { direction: "inbound", billable: false }),
    d = event("4", { billable: false }),
    e = event("5", { category: "marketing_lite" });
  const s = summarize([a, a, b, c, d, e], DEFAULT_RATES);
  assert.equal(s.bubbles, 4);
  assert.equal(s.billable, 2);
  assert.equal(s.cost, 942.98);
  assert.equal(s.categories.find((c) => c.category === "marketing").bubbles, 0);
});
test("unknown rate or billability is explicit and never a zero-cost total", () => {
  const s = summarize([event("1"), event("2", { billable: null })], {
    ...DEFAULT_RATES,
    service: null,
  });
  assert.equal(s.unknown, 2);
  assert.equal(s.cost, 0);
});
test("burst review requires same agent, no inbound between replies, excludes authentication", () => {
  const a = event("1"),
    b = event("2", {
      at: "2026-10-01T10:00:15+07:00",
      text: "Saya cek sekarang",
    });
  assert.equal(reviewBursts([a, b], DEFAULT_RATES)[0].saving, 356.65);
  assert.equal(
    reviewBursts([a, { ...b, agent: "B" }], DEFAULT_RATES).length,
    0,
  );
  assert.equal(
    reviewBursts(
      [
        a,
        event("in", { direction: "inbound", at: "2026-10-01T10:00:08+07:00" }),
        b,
      ],
      DEFAULT_RATES,
    ).length,
    0,
  );
  assert.equal(
    reviewBursts([{ ...a, category: "authentication" }, b], DEFAULT_RATES)
      .length,
    0,
  );
  assert.equal(
    reviewBursts([a, { ...b, at: "2026-10-01T10:01:00+07:00" }], DEFAULT_RATES)
      .length,
    0,
  );
});
test("free or failed one-word replies do not promise savings", () => {
  for (const override of [{ billable: false }, { status: "failed" }])
    assert.equal(
      reviewBursts(
        [
          event("1", override),
          event("2", {
            text: "Jawaban lengkap",
            at: "2026-10-01T10:00:08+07:00",
          }),
        ],
        DEFAULT_RATES,
      )[0].saving,
      0,
    );
});
test("monthly simulation is deterministic and totals reconcile by BU/category/number", () => {
  const first = demoMessages(DEFAULT_CONFIG, "2026-09");
  assert.deepEqual(first, demoMessages(DEFAULT_CONFIG, "2026-09"));
  const s = summarize(first, DEFAULT_RATES);
  assert.equal(
    s.bubbles,
    s.categories.reduce((n, c) => n + c.bubbles, 0),
  );
  assert.equal(
    s.bubbles,
    DEFAULT_CONFIG.businessUnits.reduce(
      (n, u) =>
        n +
        summarize(
          first.filter((m) => m.businessUnitId === u.id),
          DEFAULT_RATES,
        ).bubbles,
      0,
    ),
  );
  assert.equal(new Set(first.map((m) => m.id)).size, first.length);
  assert.ok(first.every((m) => m.date.startsWith("2026-09")));
});
test("Unicode words and bad stored rates handled", () => {
  assert.equal(wordCount("OK!"), 1);
  assert.equal(wordCount("😊"), 0);
  assert.equal(wordCount("Terima kasih"), 2);
  assert.deepEqual(
    loadRates({
      getItem: () => JSON.stringify({ ...DEFAULT_RATES, service: -1 }),
    }),
    DEFAULT_RATES,
  );
});
