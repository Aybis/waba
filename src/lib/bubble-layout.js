const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// Reject the whole popup, including its shadow, if it would cover a person or label.
export function placeBubble(anchor, w, h, width, height, obstacles) {
  const candidates = [
    { x: anchor.x - w / 2, y: anchor.y - h - 18 },
    { x: anchor.x - w - 25, y: anchor.y - h / 2 },
    { x: anchor.x + 25, y: anchor.y - h / 2 },
  ];
  for (let y = 12; y + h < height - 12; y += h + 12) {
    candidates.push({ x: 12, y }, { x: width - w - 12, y });
  }
  return (
    candidates.find(
      (r) =>
        r.x >= 8 &&
        r.y >= 8 &&
        r.x + w <= width - 8 &&
        r.y + h <= height - 8 &&
        !obstacles.some((b) =>
          overlaps({ x: r.x - 8, y: r.y - 8, w: w + 16, h: h + 16 }, b),
        ),
    ) || null
  );
}
