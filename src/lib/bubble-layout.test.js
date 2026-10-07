import test from "node:test";
import assert from "node:assert/strict";
import { placeBubble } from "./bubble-layout.js";
test("moves popup away from a person above the selected person", () => {
  const p = placeBubble({ x: 200, y: 200 }, 140, 43, 600, 400, [
    { x: 120, y: 120, w: 160, h: 70 },
  ]);
  assert.ok(p);
  assert.ok(p.x + 140 <= 120 || p.x >= 280 || p.y + 43 <= 120 || p.y >= 190);
});
test("hides popup when no safe space remains", () =>
  assert.equal(
    placeBubble({ x: 100, y: 100 }, 140, 43, 200, 200, [
      { x: 0, y: 0, w: 200, h: 200 },
    ]),
    null,
  ));
