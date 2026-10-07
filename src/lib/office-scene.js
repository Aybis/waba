import { WorkstationState } from "./state.js";
/* A shared, interactive isometric office. All scenery is drawn locally on Canvas. */
export function createOfficeScene() {
  "use strict";
  const views = new WeakMap();
  const activeViews = new Set();
  const palette = [
    { floor: "#e4def1", edge: "#c5b6df", accent: "#947bc0", dark: "#746090" },
    { floor: "#d9e8d9", edge: "#a9c9ad", accent: "#72a88b", dark: "#4d8068" },
    { floor: "#f0e0cf", edge: "#dbc1a4", accent: "#c69569", dark: "#a07550" },
    { floor: "#dbe5ef", edge: "#b9cedf", accent: "#7e9fb9", dark: "#597b98" },
  ];
  const colors = {
    working: "#4b9a76",
    idle: "#829397",
    warning: "#d4a149",
    error: "#d36f69",
  };
  let paused = false,
    bubbles = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stateOf = (row) =>
    WorkstationState ? WorkstationState.resolve(row) : "idle";
  const shade = (hex, factor) => {
    const rgb = hex
      .replace("#", "")
      .match(/../g)
      .map((n) => parseInt(n, 16));
    return `rgb(${rgb.map((n) => Math.round(Math.max(0, Math.min(255, n * factor)))).join(",")})`;
  };
  function hash(value) {
    let n = 0;
    for (const ch of String(value))
      n = (Math.imul(n, 31) + ch.charCodeAt(0)) | 0;
    return n >>> 0;
  }
  function rounded(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function buildLayout(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const name = String(row.serviceLabel || row.service || "WABA");
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(row);
    });
    const columns = Math.min(2, Math.max(1, groups.size));
    const zones = [],
      stations = [];
    let nextY = 0.35;
    const entries = [...groups];
    for (let start = 0; start < entries.length; start += columns) {
      const batch = entries.slice(start, start + columns);
      const height = Math.max(
        ...batch.map(
          ([, members]) => Math.ceil(members.length / 2) * 2.5 + 1.5,
        ),
      );
      batch.forEach(([service, members], col) => {
        const index = start + col,
          x = 0.35 + col * 8.0,
          y = nextY;
        zones.push({
          service,
          members,
          x,
          y,
          w: 7.5,
          d: height - 0.35,
          theme: palette[index % palette.length],
        });
        members.forEach((row, i) =>
          stations.push({
            row,
            x: x + 0.8 + (i % 2) * 3.3,
            y: y + 1.0 + Math.floor(i / 2) * 2.5,
            theme: palette[index % palette.length],
            seed: hash(row.id || `${service}-${row.number}`),
            state: stateOf(row),
          }),
        );
      });
      nextY += height + 0.7;
    }
    return {
      zones,
      stations,
      width: columns * 8.0 + 0.2,
      depth: Math.max(6, nextY) + 3.5,
      commonY: Math.max(6, nextY),
    };
  }
  function create(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full touch-pan-y";
    canvas.setAttribute("aria-hidden", "true");
    const navigation = document.createElement("div");
    navigation.className = "absolute left-3 top-3 z-10";
    navigation.setAttribute("role", "group");
    navigation.setAttribute(
      "aria-label",
      "Pilih workstation untuk detail nomor",
    );
    const instruction = document.createElement("span");
    instruction.className = "sr-only";
    instruction.textContent = "Klik operator untuk melihat aktivitas";
    container.append(canvas, navigation, instruction);
    const view = {
      container,
      canvas,
      navigation,
      instruction,
      ctx: canvas.getContext("2d"),
      rows: [],
      layout: buildLayout([]),
      zoom: 1,
      hover: null,
      frame: 0,
      visible: true,
      options: {},
      time: 0,
      previousTime: null,
      hitAreas: [],
      buttons: new Map(),
      width: 0,
      height: 0,
    };
    view.resize = () => {
      const bounds = container.getBoundingClientRect();
      view.width = Math.max(1, bounds.width);
      view.height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(view.width * ratio);
      canvas.height = Math.round(view.height * ratio);
      view.ratio = ratio;
      schedule(view);
    };
    view.observer = new ResizeObserver(view.resize);
    view.observer.observe(container);
    if ("IntersectionObserver" in window) {
      view.intersection = new IntersectionObserver((entries) => {
        view.visible = entries[0].isIntersecting;
        schedule(view);
      });
      view.intersection.observe(container);
    }
    function hit(event) {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left,
        y = event.clientY - bounds.top;
      const operators = view.hitAreas.filter((area) => {
        const actor = area.operator;
        return (
          actor &&
          Math.abs(x - actor.x) < actor.w &&
          y > actor.y - actor.h &&
          y < actor.y + 5
        );
      });
      if (operators.length)
        return operators.sort(
          (a, b) => Math.abs(x - a.operator.x) - Math.abs(x - b.operator.x),
        )[0];
      return [...view.hitAreas]
        .reverse()
        .find(
          (area) =>
            Math.abs(x - area.x) < area.w &&
            y > area.y - area.h &&
            y < area.y + 14,
        );
    }
    canvas.addEventListener("pointermove", (event) => {
      const target = hit(event);
      const next = target ? target.id : null;
      if (next !== view.hover) {
        view.hover = next;
        canvas.style.cursor = next ? "pointer" : "default";
        schedule(view);
      }
    });
    canvas.addEventListener("pointerleave", () => {
      view.hover = null;
      schedule(view);
    });
    canvas.addEventListener("click", (event) => {
      const target = hit(event);
      if (target && typeof view.options.onSelect === "function")
        view.options.onSelect(target.row);
    });
    activeViews.add(view);
    views.set(container, view);
    view.resize();
    return view;
  }
  function schedule(view) {
    if (!view.frame)
      view.frame = requestAnimationFrame((now) => draw(view, now));
  }
  function draw(view, now) {
    view.frame = 0;
    const animated =
      !paused && !document.hidden && !reducedMotion.matches && view.visible;
    if (animated && view.previousTime !== null)
      view.time += Math.min(50, now - view.previousTime) / 1000;
    view.previousTime = animated ? now : null;
    const { ctx, width: W, height: H, layout: scene } = view;
    if (!W || !H) return;
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!scene.stations.length) {
      view.hitAreas = [];
      return;
    }
    const tile =
      Math.max(
        0.1,
        Math.min(
          (W - 64) / (scene.width + scene.depth),
          (H - 100) / ((scene.width + scene.depth) * 0.49 + 2),
        ),
      ) * view.zoom;
    const centerX = W / 2 - ((scene.width - scene.depth) * tile) / 2;
    const centerY = H / 2 - (scene.width + scene.depth) * tile * 0.245 + 22;
    const p = (x, y, z = 0) => ({
      x: centerX + (x - y) * tile,
      y: centerY + (x + y) * tile * 0.49 - z * tile * 0.9,
    });
    function poly(points, color, stroke) {
      ctx.beginPath();
      points.forEach((q, i) => {
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
    function flat(x, y, w, d, z, color, stroke) {
      poly(
        [p(x, y, z), p(x + w, y, z), p(x + w, y + d, z), p(x, y + d, z)],
        color,
        stroke,
      );
    }
    function box(x, y, z, w, d, h, color, topColor) {
      poly(
        [
          p(x, y + d, z),
          p(x + w, y + d, z),
          p(x + w, y + d, z + h),
          p(x, y + d, z + h),
        ],
        shade(color, 0.87),
      );
      poly(
        [
          p(x + w, y, z),
          p(x + w, y + d, z),
          p(x + w, y + d, z + h),
          p(x + w, y, z + h),
        ],
        shade(color, 0.72),
      );
      flat(x, y, w, d, z + h, topColor || color);
    }
    function line(a, b, color, width = 1) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    function groundShadow(x, y, w, d, opacity = 0.1) {
      flat(x + 0.15, y + 0.18, w, d, 0.012, `rgba(43,67,51,${opacity})`);
    }
    const objects = [];
    const add = (depth, paint) => objects.push({ depth, paint });
    // Floating foundation, tiled circulation, and soft room-colored floor mats.
    ctx.save();
    ctx.shadowColor = "#496a4a1b";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 19;
    flat(0, 0, scene.width, scene.depth, -0.19, "#b9c8b5");
    ctx.restore();
    box(0, 0, -0.24, scene.width, scene.depth, 0.24, "#c7d3c0", "#f0efe4");
    for (let x = 1; x < scene.width; x += 1)
      line(p(x, 0, 0.006), p(x, scene.depth, 0.006), "#a0afa116", 0.65);
    for (let y = 1; y < scene.depth; y += 1)
      line(p(0, y, 0.006), p(scene.width, y, 0.006), "#a0afa116", 0.65);
    scene.zones.forEach((zone) => {
      flat(zone.x, zone.y, zone.w, zone.d, 0.016, zone.theme.floor);
      flat(
        zone.x + 0.12,
        zone.y + 0.12,
        zone.w - 0.24,
        zone.d - 0.24,
        0.018,
        zone.theme.floor,
        zone.theme.edge,
      );
      for (let y = zone.y + 0.5; y < zone.y + zone.d; y += 0.7)
        line(
          p(zone.x + 0.15, y, 0.02),
          p(zone.x + zone.w - 0.15, y, 0.02),
          zone.theme.edge + "30",
          0.5,
        );
    });
    // Back walls stay low enough that every operator is visible.
    box(0, 0, 0, scene.width, 0.14, 1.5, "#e1e7d7", "#edf0e5");
    box(0, 0, 0, 0.14, Math.min(scene.depth - 2, 9), 1.5, "#e7ebdf", "#f4f3e9");
    for (let x = 1.1; x < scene.width - 1; x += 3.8) {
      poly(
        [
          p(x, 0.153, 0.5),
          p(x + 2.2, 0.153, 0.5),
          p(x + 2.2, 0.153, 1.3),
          p(x, 0.153, 1.3),
        ],
        "#9fbdba",
      );
      poly(
        [
          p(x + 0.09, 0.16, 0.58),
          p(x + 2.11, 0.16, 0.58),
          p(x + 2.11, 0.16, 1.22),
          p(x + 0.09, 0.16, 1.22),
        ],
        "#d8e8df",
      );
      line(p(x + 1.1, 0.17, 0.57), p(x + 1.1, 0.17, 1.23), "#abc5b7", 2);
      box(x - 0.05, 0.14, 0.46, 2.3, 0.16, 0.1, "#cfdbcd");
    }
    function plant(x, y, size = 1, pot = "#d1a57f") {
      add(x + y + 0.5, () => {
        groundShadow(x, y, 0.42 * size, 0.42 * size, 0.12);
        box(x, y, 0, 0.43 * size, 0.43 * size, 0.42 * size, pot);
        box(
          x - 0.04 * size,
          y - 0.04 * size,
          0.36 * size,
          0.51 * size,
          0.51 * size,
          0.1 * size,
          shade(pot, 1.12),
        );
        box(
          x + 0.18 * size,
          y + 0.18 * size,
          0.42 * size,
          0.07 * size,
          0.07 * size,
          0.6 * size,
          "#729577",
        );
        [
          [-0.17, 0.09, 0.65, 0.31, 0.19, 0.31, "#88ac80"],
          [0.15, -0.07, 0.85, 0.35, 0.23, 0.37, "#719e76"],
          [0.13, 0.19, 1.05, 0.24, 0.27, 0.34, "#95b784"],
          [-0.09, 0.22, 0.93, 0.29, 0.18, 0.24, "#669572"],
        ].forEach((a) =>
          box(
            x + a[0] * size,
            y + a[1] * size,
            a[2] * size,
            a[3] * size,
            a[4] * size,
            a[5] * size,
            a[6],
          ),
        );
      });
    }
    // Each workstation shares the floor but keeps a recognizable chair and operator.
    view.hitAreas = [];
    scene.stations.forEach((station, index) => {
      const { row, x, y, state, seed, theme } = station,
        color = colors[state];
      const id = String(row.id || `${row.service}-${row.number}`),
        hovered = view.hover === id;
      const phase = view.time * 2.8 + (seed % 20);
      if (hovered)
        flat(x - 0.17, y - 0.13, 2.65, 2.18, 0.027, "#ffffff70", theme.accent);
      add(x + y + 1.4, () => {
        groundShadow(x, y, 2.3, 1.1, 0.09);
        box(x + 0.13, y + 0.08, 0, 0.13, 0.76, 0.84, "#b7b0a9");
        box(x + 2.04, y + 0.08, 0, 0.13, 0.76, 0.84, "#b7b0a9");
        box(x, y, 0.8, 2.3, 0.99, 0.12, "#dac5ae", "#f5dec3");
        box(x + 0.17, y + 0.07, 0.94, 0.45, 0.47, 0.2, "#c8c6b5", "#f1efdf");
        box(x + 0.73, y + 0.17, 0.94, 0.65, 0.32, 0.05, "#9a9da0");
        box(x + 1.01, y + 0.22, 0.99, 0.08, 0.09, 0.2, "#8c979b");
        box(x + 0.72, y + 0.2, 1.14, 0.75, 0.11, 0.62, "#535e6c", "#79828c");
        poly(
          [
            p(x + 0.77, y + 0.319, 1.19),
            p(x + 1.42, y + 0.319, 1.19),
            p(x + 1.42, y + 0.319, 1.69),
            p(x + 0.77, y + 0.319, 1.69),
          ],
          state === "error"
            ? "#d18b92"
            : state === "idle"
              ? "#859ba4"
              : state === "warning"
                ? "#d2b67c"
                : "#a9c8c4",
        );
        for (let k = 0; k < 3; k++)
          line(
            p(x + 0.85, y + 0.322, 1.57 - k * 0.1),
            p(x + 1.15 + (k % 2) * 0.17, y + 0.322, 1.57 - k * 0.1),
            state === "error" ? "#f6d4d2" : "#e9f3e4",
            Math.max(0.8, tile * 0.035),
          );
        box(x + 0.78, y + 0.66, 0.94, 0.7, 0.24, 0.04, "#b5b8ae", "#dde0d2");
        for (let k = 0; k < 4; k++)
          line(
            p(x + 0.88 + k * 0.13, y + 0.69, 0.985),
            p(x + 0.88 + k * 0.13, y + 0.84, 0.985),
            "#9eaba0",
            0.65,
          );
        box(x + 1.65, y + 0.7, 0.94, 0.13, 0.21, 0.045, "#bac3b5");
        box(
          x + 1.95,
          y + 0.18,
          0.94,
          0.17,
          0.19,
          0.24,
          seed % 2 ? "#caafce" : "#a7c1a8",
          "#eef0da",
        );
        // Small connection light on the desk.
        const light = p(x + 0.25, y + 0.78, 1.04);
        ctx.beginPath();
        ctx.arc(light.x, light.y, Math.max(1.5, tile * 0.055), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      add(x + y + 2.45, () => {
        const cx = x + 0.87,
          cy = y + 1.21;
        groundShadow(cx - 0.1, cy - 0.08, 0.76, 0.75, 0.1);
        box(cx + 0.22, cy + 0.2, 0.05, 0.1, 0.1, 0.35, "#858e92");
        box(cx - 0.04, cy + 0.08, 0.03, 0.63, 0.45, 0.065, "#839095");
        box(cx, cy, 0.39, 0.58, 0.54, 0.13, theme.accent);
        box(cx, cy + 0.47, 0.45, 0.58, 0.12, 0.55, theme.accent, theme.edge);
      });
      let ox = x + 1.12,
        oy = y + 1.32;
      if (state === "idle") {
        ox = x + 2.42 + Math.sin(phase * 0.23) * 0.15;
        oy = y + 1.18 + Math.sin(phase * 0.38) * 0.36;
      }
      const bob =
        state === "idle"
          ? Math.abs(Math.sin(phase * 2)) * 0.035
          : state === "error"
            ? Math.abs(Math.sin(phase * 4)) * 0.065
            : 0;
      const headY = state === "idle" ? 0.91 : 0.95;
      add(ox + oy + 0.3, () => {
        const shirt = [
          "#92a8ca",
          "#c497ad",
          "#8bb9a4",
          "#cbab80",
          "#b0a0c4",
          "#84adb7",
        ][seed % 6];
        const skin = ["#e2b38c", "#c98e67", "#edc2a3", "#bb855f"][seed % 4];
        groundShadow(ox - 0.25, oy - 0.21, 0.54, 0.57, 0.12);
        const walking = state === "idle" ? Math.sin(phase * 2) * 0.065 : 0;
        box(
          ox - 0.19,
          oy - 0.1,
          0.1 + bob + walking,
          0.15,
          0.24,
          0.42,
          "#63727d",
        );
        box(
          ox + 0.04,
          oy - 0.1,
          0.1 + bob - walking,
          0.15,
          0.24,
          0.42,
          "#63727d",
        );
        box(ox - 0.2, oy + 0.01, 0.05 + walking, 0.18, 0.29, 0.12, "#535e68");
        box(ox + 0.04, oy + 0.01, 0.05 - walking, 0.18, 0.29, 0.12, "#535e68");
        box(ox - 0.24, oy - 0.17, 0.49 + bob, 0.48, 0.34, 0.45, shirt);
        let hand =
          0.7 +
          bob +
          (state === "working" || state === "warning"
            ? Math.sin(phase * (state === "warning" ? 6 : 3)) * 0.035
            : 0);
        if (state === "error") hand = 1.02 + bob;
        box(ox - 0.36, oy - 0.16, hand, 0.13, 0.24, 0.22, shirt);
        box(ox + 0.24, oy - 0.16, hand, 0.13, 0.24, 0.22, shirt);
        box(ox - 0.36, oy - 0.19, hand - 0.04, 0.13, 0.15, 0.13, skin);
        box(ox + 0.24, oy - 0.19, hand - 0.04, 0.13, 0.15, 0.13, skin);
        box(ox - 0.09, oy - 0.06, 0.91 + bob, 0.18, 0.19, 0.13, skin);
        box(ox - 0.23, oy - 0.2, headY + bob, 0.46, 0.39, 0.41, skin);
        box(
          ox - 0.25,
          oy - 0.22,
          headY + 0.32 + bob,
          0.5,
          0.43,
          0.17,
          seed % 3 === 0 ? "#70615a" : "#4b4548",
        );
        box(
          ox - 0.25,
          oy + 0.12,
          headY + 0.14 + bob,
          0.5,
          0.09,
          0.29,
          seed % 3 === 0 ? "#70615a" : "#4b4548",
        );
        if (state === "warning" || state === "error") {
          const mark = p(ox + 0.26, oy, 1.8 + bob);
          ctx.fillStyle = color;
          ctx.font = `800 ${Math.max(11, tile * 0.46)}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(state === "error" ? "!" : "?", mark.x, mark.y);
        }
      });
      const center = p(x + 1.14, y + 1.32, 0),
        head = p(ox, oy, 1.55),
        foot = p(ox, oy, 0);
      view.hitAreas.push({
        id,
        row,
        x: center.x,
        y: center.y,
        w: Math.max(21, tile * 1.12),
        h: Math.max(36, tile * 2.05),
        operator: {
          x: foot.x,
          y: foot.y,
          w: Math.max(12, tile * 0.59),
          h: Math.max(23, tile * 1.5),
        },
        head,
        station,
        index,
      });
    });
    scene.zones.forEach((zone) => {
      plant(zone.x + 0.42, zone.y + 0.4, 0.67, "#f0d9be");
      plant(zone.x + zone.w - 0.66, zone.y + zone.d - 0.66, 0.72, "#e4e2d6");
    });
    const loungeY = scene.commonY + 0.35;
    // Soft striped rug, low table and a modular lilac lounge.
    const loungeW = Math.min(5.9, scene.width - 2.2);
    flat(1.15, loungeY, loungeW, 2.35, 0.023, "#e3c8b4", "#c8af9e");
    for (let i = 0.13; i < 2.3; i += 0.19)
      line(
        p(1.2, loungeY + i, 0.028),
        p(1.1 + loungeW, loungeY + i, 0.028),
        "#ead6c550",
        0.65,
      );
    add(1.35 + loungeY + 1.4, () => {
      groundShadow(1.4, loungeY + 0.1, 2.25, 0.8, 0.13);
      box(1.4, loungeY + 0.06, 0.15, 2.25, 0.72, 0.45, "#bdaecb", "#cfbfd8");
      box(1.4, loungeY + 0.03, 0.4, 2.25, 0.17, 0.65, "#bdaccb", "#d5c6df");
      box(1.3, loungeY + 0.03, 0.3, 0.2, 0.85, 0.56, "#bdaccb");
      box(3.58, loungeY + 0.03, 0.3, 0.2, 0.85, 0.56, "#bdaccb");
      for (let i = 0; i < 3; i++)
        box(1.56 + i * 0.65, loungeY + 0.25, 0.6, 0.59, 0.49, 0.08, "#d0c0db");
      box(1.68, loungeY + 0.28, 0.7, 0.4, 0.22, 0.3, "#e4cbab");
    });
    add(3.4 + loungeY + 1.55, () => {
      box(3.4, loungeY + 1.3, 0.07, 0.1, 0.1, 0.4, "#bcb4a2");
      box(4.7, loungeY + 1.5, 0.07, 0.1, 0.1, 0.4, "#bcb4a2");
      box(3.3, loungeY + 1.14, 0.45, 1.65, 0.85, 0.12, "#d4b896", "#f0d6b2");
      box(3.57, loungeY + 1.4, 0.58, 0.4, 0.32, 0.035, "#98b9aa");
      box(4.26, loungeY + 1.36, 0.58, 0.2, 0.2, 0.18, "#f0e6d0");
    });
    plant(0.5, loungeY + 1.5, 0.92, "#c9aa91");
    if (scene.width > 10) {
      const coffeeX = scene.width - 5.3;
      add(coffeeX + loungeY + 1.1, () => {
        groundShadow(coffeeX, loungeY, 2.2, 0.72, 0.1);
        box(coffeeX, loungeY, 0.06, 2.2, 0.69, 0.86, "#b3bca1", "#c4ceb3");
        box(
          coffeeX - 0.06,
          loungeY - 0.04,
          0.9,
          2.32,
          0.79,
          0.1,
          "#d9c29f",
          "#eddbbd",
        );
        line(
          p(coffeeX + 1.1, loungeY + 0.701, 0.15),
          p(coffeeX + 1.1, loungeY + 0.701, 0.85),
          "#98a58c",
          1,
        );
        box(
          coffeeX + 0.24,
          loungeY + 0.12,
          1.01,
          0.57,
          0.38,
          0.48,
          "#656e68",
          "#85918b",
        );
        box(coffeeX + 0.34, loungeY + 0.5, 1.04, 0.25, 0.08, 0.26, "#b9c6b3");
        box(coffeeX + 1.34, loungeY + 0.27, 1.01, 0.2, 0.2, 0.24, "#f6e6cf");
        box(coffeeX + 1.73, loungeY + 0.17, 1.01, 0.18, 0.2, 0.22, "#d0b6c8");
      });
      // Bookshelf with individual books and a plant on top.
      const bx = scene.width - 1.9,
        by = loungeY + 0.48;
      add(bx + by + 0.5, () => {
        box(bx, by, 0, 1.0, 0.4, 1.55, "#d0ba9e", "#e1ccae");
        for (let k = 0; k < 2; k++) {
          poly(
            [
              p(bx + 0.08, by + 0.41, 0.15 + k * 0.7),
              p(bx + 0.9, by + 0.41, 0.15 + k * 0.7),
              p(bx + 0.9, by + 0.41, 0.69 + k * 0.7),
              p(bx + 0.08, by + 0.41, 0.69 + k * 0.7),
            ],
            "#9c907e",
          );
          for (let i = 0; i < 5; i++)
            box(
              bx + 0.13 + i * 0.145,
              by + 0.31,
              0.18 + k * 0.7,
              0.1,
              0.13,
              0.3 + (i % 2) * 0.12,
              ["#a4b79c", "#d7bd9f", "#acabc8", "#97adb5"][i % 4],
            );
        }
      });
      plant(scene.width - 1.18, loungeY + 2.09, 0.82, "#ba987f");
    }
    objects.sort((a, b) => a.depth - b.depth).forEach((item) => item.paint());
    // Station nameplates are screen-facing for legibility, independent of the projection.
    view.hitAreas.forEach((area) => {
      if (tile < 16 && view.hover !== area.id) return;
      const { station, row } = area,
        q = p(station.x + 1.17, station.y + 2.03, 0.07),
        label = String(row.number);
      const fontSize = Math.max(8, Math.min(10, tile * 0.39));
      ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
      const labelWidth = ctx.measureText(label).width + 24;
      rounded(
        ctx,
        q.x - labelWidth / 2,
        q.y - 5,
        labelWidth,
        16,
        5,
        view.hover === area.id ? "#ffffff" : "#fffffff0",
        view.hover === area.id ? station.theme.accent : "#d7ded3",
      );
      ctx.beginPath();
      ctx.arc(q.x - labelWidth / 2 + 7, q.y + 3, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors[station.state];
      ctx.fill();
      ctx.fillStyle = "#506153";
      ctx.textAlign = "left";
      ctx.fillText(label, q.x - labelWidth / 2 + 14, q.y + 6);
    });
    // A room sign at the open end remains readable even behind a full row of desks.
    scene.zones.forEach((zone) => {
      const q = p(zone.x + zone.w * 0.5, zone.y + zone.d + 0.45, 0.02);
      const label = zone.service;
      ctx.font = "600 9px system-ui";
      const signWidth = Math.min(160, ctx.measureText(label).width + 21);
      rounded(
        ctx,
        q.x - signWidth / 2,
        q.y - 8,
        signWidth,
        17,
        5,
        "#fafbf4ed",
        zone.theme.edge,
      );
      ctx.fillStyle = zone.theme.dark;
      ctx.textAlign = "center";
      let shortLabel = label;
      while (
        ctx.measureText(shortLabel).width > signWidth - 14 &&
        shortLabel.length > 1
      )
        shortLabel = shortLabel.slice(0, -1);
      ctx.fillText(
        shortLabel === label ? label : shortLabel.slice(0, -1) + "…",
        q.x,
        q.y + 3,
      );
    });
    if (bubbles) drawBubbles(view, p, tile);
    view.instruction.textContent = `${scene.stations.length} operator · Klik untuk detail aktivitas`;
    if (animated && scene.stations.length) schedule(view);
  }
  function drawBubbles(view, p, tile) {
    const ctx = view.ctx,
      taken = [],
      max = view.width < 600 ? 2 : 3;
    const candidates = [...view.hitAreas].sort((a, b) => {
      const priority = (area) =>
        view.hover === area.id
          ? -10
          : area.station.state === "error"
            ? 0
            : area.station.state === "warning"
              ? 1
              : area.station.state === "working"
                ? 2
                : 3;
      return priority(a) - priority(b) || a.index - b.index;
    });
    for (const area of candidates) {
      if (taken.length >= max && view.hover !== area.id) continue;
      const { row, station } = area,
        state = station.state,
        hovered = view.hover === area.id;
      const label =
        state === "error"
          ? "Koneksi bermasalah"
          : state === "warning"
            ? `Antrean ${row.queueDepth || 0} pesan`
            : state === "working"
              ? "Memproses pesan…"
              : "Sedang istirahat";
      const detail = hovered
        ? String(row.number)
        : state === "error"
          ? "Periksa workstation"
          : state === "working"
            ? `${row.queueDepth || 0} dalam antrean`
            : "";
      ctx.font = "600 10px system-ui";
      const bw = Math.min(
          164,
          Math.max(115, ctx.measureText(label).width + 27),
        ),
        bh = detail ? 43 : 30;
      const anchor = area.head,
        x = Math.max(8, Math.min(view.width - bw - 8, anchor.x - bw / 2)),
        y = anchor.y - bh - 15;
      if (y < 10) continue;
      if (
        !hovered &&
        taken.some(
          (r) =>
            x < r.x + r.w + 10 &&
            x + bw > r.x - 10 &&
            y < r.y + r.h + 12 &&
            y + bh > r.y - 12,
        )
      )
        continue;
      ctx.save();
      ctx.shadowColor = "#52654815";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      rounded(
        ctx,
        x,
        y,
        bw,
        bh,
        7,
        state === "error" ? "#fff7f2" : "#fffefa",
        state === "error" ? "#e9bdb4" : "#d8e0d2",
      );
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(anchor.x - 4, y + bh - 1);
      ctx.lineTo(anchor.x, y + bh + 5);
      ctx.lineTo(anchor.x + 4, y + bh - 1);
      ctx.fillStyle = state === "error" ? "#fff7f2" : "#fffefa";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 11, y + 14, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[state];
      ctx.fill();
      ctx.fillStyle = "#566454";
      ctx.textAlign = "left";
      ctx.font = "600 10px system-ui";
      ctx.fillText(label, x + 19, y + 17);
      if (detail) {
        ctx.font = "9px system-ui";
        ctx.fillStyle = "#929b8a";
        ctx.fillText(detail, x + 19, y + 31);
      }
      taken.push({ x, y, w: bw, h: bh });
    }
  }
  function render(container, rows, options = {}) {
    if (!container) return;
    const view = views.get(container) || create(container);
    view.rows = Array.isArray(rows) ? rows : [];
    view.options = options;
    view.layout = buildLayout(view.rows);
    const ids = new Set(
      view.rows.map((row) => String(row.id || `${row.service}-${row.number}`)),
    );
    for (const [id, button] of view.buttons)
      if (!ids.has(id)) {
        button.remove();
        view.buttons.delete(id);
      }
    view.rows.forEach((row, index) => {
      const id = String(row.id || `${row.service}-${row.number}`);
      let button = view.buttons.get(id);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className =
          "sr-only focus:not-sr-only focus:block focus:max-w-64 focus:rounded-lg focus:border-2 focus:border-emerald-700 focus:bg-white focus:p-3 focus:text-xs focus:text-emerald-950";
        button.addEventListener("focus", () => {
          view.hover = id;
          schedule(view);
        });
        button.addEventListener("blur", () => {
          view.hover = null;
          schedule(view);
        });
        button.addEventListener("click", () => {
          if (typeof view.options.onSelect === "function")
            view.options.onSelect(button._officeRow);
        });
        view.buttons.set(id, button);
      }
      button._officeRow = row;
      button.textContent = `${row.serviceLabel || row.service} · ${row.number} · ${WorkstationState ? WorkstationState.label(stateOf(row)) : stateOf(row)}. Buka detail workstation.`;
      const atIndex = view.navigation.children[index];
      if (atIndex !== button)
        view.navigation.insertBefore(button, atIndex || null);
    });
    view.instruction.hidden = !view.rows.length;
    schedule(view);
  }
  function updateAll() {
    activeViews.forEach((view) => schedule(view));
  }
  document.addEventListener("visibilitychange", updateAll);
  reducedMotion.addEventListener("change", updateAll);
  return {
    render,
    dispose() {
      document.removeEventListener("visibilitychange", updateAll);
      reducedMotion.removeEventListener("change", updateAll);
      activeViews.forEach((view) => {
        cancelAnimationFrame(view.frame);
        view.observer.disconnect();
        view.intersection?.disconnect();
        view.container.replaceChildren();
      });
      activeViews.clear();
    },
    setPaused(value) {
      paused = Boolean(value);
      updateAll();
    },
    setBubbles(value) {
      bubbles = Boolean(value);
      updateAll();
    },
    zoomIn() {
      activeViews.forEach((view) => {
        view.zoom = Math.min(1.8, view.zoom + 0.15);
        schedule(view);
      });
    },
    zoomOut() {
      activeViews.forEach((view) => {
        view.zoom = Math.max(0.65, view.zoom - 0.15);
        schedule(view);
      });
    },
    resetView() {
      activeViews.forEach((view) => {
        view.zoom = 1;
        schedule(view);
      });
    },
  };
}
