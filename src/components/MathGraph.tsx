import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Exports required by the app (do not remove)
 */
export type PlotFn = { fn: string; color?: string; label?: string };
export type MathGraphSpec = {
  title?: string;
  functions: PlotFn[];
  xRange?: [number, number];
  yRange?: [number, number];
};

const PALETTE = ["#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#4ade80"];

/* ---------------- helpers used by parse/normalize ---------------- */

/** Normalize loose AI math into an expression the component can evaluate. */
export function normalizeExpression(input: string): string {
  let s = String(input ?? "").trim();
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\cdot|\\times/g, "*");
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\(sin|cos|tan|log|ln|exp|abs|sqrt)/g, "$1");
  s = s.replace(/\{|\}/g, "");
  s = s.replace(/\$/g, "");
  s = s.replace(/^\s*(?:[fgh]\s*\(\s*x\s*\)|y)\s*=\s*/i, "");
  s = s.replace(/π/g, "PI").replace(/\bpi\b/gi, "PI");
  s = s.replace(/(\d)\s*([a-zA-Z(])/g, "$1*$2"); // 2x -> 2*x
  s = s.replace(/\)\s*\(/g, ")*(");
  s = s.replace(/\bln\s*\(/g, "log(");
  s = s.replace(/\be\^/g, "exp1^");
  s = s.replace(/exp1/g, "E");
  return s.trim();
}

/* Allow simple equations like "y = x^2" or labeled "parabola: y = x^2" */
const EQ_LINE = /^\s*(?:([A-Za-z][\w\s()]*?)\s*:\s*)?(?:[fgh]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)\s*$/i;

/** Accepts either a JSON spec with `functions`, or plain lines of `y = ...`. */
export function parseMathGraphSpec(raw: string): MathGraphSpec | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  if (text.startsWith("{")) {
    try {
      const j = JSON.parse(text) as Partial<MathGraphSpec> & { fn?: string };
      const fns = Array.isArray(j.functions) ? j.functions : j.fn ? [{ fn: j.fn }] : [];
      const functions = fns
        .filter((f) => f && typeof f.fn === "string" && f.fn.trim())
        .map((f, i) => ({
          fn: normalizeExpression(f.fn),
          color: f.color || PALETTE[i % PALETTE.length],
          label: f.label || f.fn,
        }));
      if (!functions.length) return null;
      return { ...j, functions } as MathGraphSpec;
    } catch {
      return null;
    }
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length || lines.length > 6) return null;
  const functions: PlotFn[] = [];
  for (const line of lines) {
    // strip trailing "(Growth)" style notes before matching
    const cleaned = line.replace(/\s*\((?:growth|decay)[^)]*\)\s*$/i, (x) => x);
    const m = EQ_LINE.exec(cleaned);
    if (!m) return null;
    const rawExpr = m[2] ?? "";
    const expr = normalizeExpression(rawExpr.replace(/\(([^()]*[a-zA-Z]{3,}[^()]*)\)\s*$/, ""));
    if (!expr) return null;
    functions.push({
      fn: expr,
      color: PALETTE[functions.length % PALETTE.length],
      label: line.trim(),
    });
  }
  return functions.length ? { functions } : null;
}

/* ---------------- canvas MathGraph implementation (default export) ---------------- */

interface GraphFunction {
  fn: string;
  color: string;
  label?: string;
  call?: (x: number) => number;
}

interface MathGraphProps {
  functions: GraphFunction[];
  xRange?: [number, number];
  className?: string;
  title?: string;
}

/** Compile a sanitized-ish expression into a function(x) -> y.
 * This uses new Function; inputs should be normalized/validated first.
 */
function compileFn(expr: string): (x: number) => number {
  const clean = String(expr)
    .replace(/\^/g, "**")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E")
    .replace(/\bsin\b/g, "Math.sin")
    .replace(/\bcos\b/g, "Math.cos")
    .replace(/\btan\b/g, "Math.tan")
    .replace(/\bln\b/g, "Math.log")
    .replace(/\blog\b/g, "Math.log")
    .replace(/\bsqrt\b/g, "Math.sqrt")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\bexp\b/g, "Math.exp")
    // disallow some characters that are unlikely in math expressions
    .replace(/[^-+*\/%^()0-9.xPIEMathsincotaelgbtrq]/g, (m) => m); // keep letters for Math.* replacements
  // safer to wrap in try/catch when evaluating
  // eslint-disable-next-line no-new-func
  return new Function("x", `with (Math) { try { return (${clean}); } catch(e) { return NaN; } }`) as (
    x: number
  ) => number;
}

/** Nice numeric tick step for a target pixel spacing */
function computeTickStep(scale: number, targetPx = 80) {
  // scale: pixels per world unit
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  const raw = targetPx / scale; // desired world-units per tick
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1 * pow, 2 * pow, 5 * pow, 10 * pow];
  let best = candidates[0];
  let bestDiff = Math.abs(candidates[0] - raw);
  for (let i = 1; i < candidates.length; i++) {
    const d = Math.abs(candidates[i] - raw);
    if (d < bestDiff) {
      bestDiff = d;
      best = candidates[i];
    }
  }
  return best;
}

export default function MathGraph({ functions: fns, xRange, className, title }: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // compiled functions with fallback colors
  const compiled = useMemo<GraphFunction[]>(
    () =>
      (fns ?? []).map((f, i) => ({
        fn: f.fn,
        color: f.color || PALETTE[i % PALETTE.length],
        label: f.label,
        call: compileFn(f.fn),
      })),
    [fns],
  );

  // size in CSS pixels
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 640, h: 480 });

  // scale (pixels per world unit) and offset in pixels from centered origin
  const [scale, setScale] = useState<number>(40);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // dragging and hover state
  const dragging = useRef(false);
  const dragStart = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [hover, setHover] = useState<{ wx: number; wy: number; screenX: number; screenY: number } | null>(null);

  // configure initial view based on optional xRange
  useEffect(() => {
    if (!containerRef.current) return;
    // compute initial scale to fit xRange if provided
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width || 640;
    const h = Math.round((w * 3) / 4); // 4:3 aspect if no explicit size yet
    setSize({ w, h });

    if (xRange && xRange.length === 2 && Number.isFinite(xRange[0]) && Number.isFinite(xRange[1]) && xRange[1] > xRange[0]) {
      const span = Math.abs(xRange[1] - xRange[0]);
      const newScale = Math.max(5, Math.min(800, w / span));
      setScale(newScale);
      setOffset({ x: 0, y: 0 });
    } else {
      // default scale depends on width
      const guess = Math.max(20, Math.min(120, w / 10));
      setScale(guess);
      setOffset({ x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xRange]);

  // observe container size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    resizeObserver.current?.disconnect();
    resizeObserver.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ w: cr.width, h: cr.height });
      }
    });
    resizeObserver.current.observe(el);
    return () => resizeObserver.current?.disconnect();
  }, []);

  // convert world <-> screen coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      const w = size.w;
      const h = size.h;
      const plotCx = w / 2 + offset.x;
      const plotCy = h / 2 + offset.y;
      return { x: plotCx + wx * scale, y: plotCy - wy * scale };
    },
    [size, scale, offset],
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const w = size.w;
      const h = size.h;
      const plotCx = w / 2 + offset.x;
      const plotCy = h / 2 + offset.y;
      return { x: (sx - plotCx) / scale, y: (plotCy - sy) / scale };
    },
    [size, scale, offset],
  );

  // redraw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { w, h } = size;
    if (!w || !h) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, w, h);

    // plot metrics
    const plotL = 0;
    const plotR = w;
    const plotT = 0;
    const plotB = h;
    const plotCx = w / 2 + offset.x;
    const plotCy = h / 2 + offset.y;

    // world bounds visible
    const leftWorld = screenToWorld(plotL, plotCy).x;
    const rightWorld = screenToWorld(plotR, plotCy).x;
    const topWorld = screenToWorld(plotCx, plotT).y;
    const bottomWorld = screenToWorld(plotCx, plotB).y;

    // grid lines (fine and coarse)
    const coarseStep = computeTickStep(scale, 100);
    const fineStep = coarseStep / 5;

    ctx.lineWidth = 1;
    // draw fine grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    for (let x = Math.floor(leftWorld / fineStep) * fineStep; x <= rightWorld; x += fineStep) {
      const sx = worldToScreen(x, 0).x;
      ctx.moveTo(sx, plotT);
      ctx.lineTo(sx, plotB);
    }
    for (let y = Math.floor(bottomWorld / fineStep) * fineStep; y <= topWorld; y += fineStep) {
      const sy = worldToScreen(0, y).y;
      ctx.moveTo(plotL, sy);
      ctx.lineTo(plotR, sy);
    }
    ctx.stroke();

    // coarse grid / ticks
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(leftWorld / coarseStep) * coarseStep; x <= rightWorld; x += coarseStep) {
      const sx = worldToScreen(x, 0).x;
      ctx.moveTo(sx, plotT);
      ctx.lineTo(sx, plotB);
    }
    for (let y = Math.floor(bottomWorld / coarseStep) * coarseStep; y <= topWorld; y += coarseStep) {
      const sy = worldToScreen(0, y).y;
      ctx.moveTo(plotL, sy);
      ctx.lineTo(plotR, sy);
    }
    ctx.stroke();

    // axes (white) centered at world origin
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    // x-axis
    const y0 = worldToScreen(0, 0).y;
    ctx.moveTo(plotL, y0);
    ctx.lineTo(plotR, y0);
    // arrow
    ctx.moveTo(plotR - 10, y0 - 6);
    ctx.lineTo(plotR, y0);
    ctx.lineTo(plotR - 10, y0 + 6);
    // y-axis
    const x0 = worldToScreen(0, 0).x;
    ctx.moveTo(x0, plotT);
    ctx.lineTo(x0, plotB);
    ctx.moveTo(x0 - 6, plotT + 10);
    ctx.lineTo(x0, plotT);
    ctx.lineTo(x0 + 6, plotT + 10);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    if (x0 >= plotL && x0 <= plotR && y0 >= plotT && y0 <= plotB) {
      ctx.fillText("0", x0 - 4, y0 + 6);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (y0 >= plotT && y0 <= plotB) {
      ctx.fillText("x", plotR - 12, y0 + 6);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    if (x0 >= plotL && x0 <= plotR) {
      ctx.fillText("y", x0 + 6, plotT + 12);
    }

    // tick marks and labels
    ctx.fillStyle = "rgba(229,231,235,0.9)";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = Math.floor(leftWorld / coarseStep) * coarseStep; x <= rightWorld; x += coarseStep) {
      const sx = worldToScreen(x, 0).x;
      if (sx < plotL - 1 || sx > plotR + 1) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(sx, y0 - 6);
      ctx.lineTo(sx, y0 + 6);
      ctx.stroke();
      // skip label if it's close to origin label
      if (Math.abs(x) > coarseStep * 0.0001) {
        ctx.fillText(String(Math.round(x * 100) / 100), sx, y0 + 8);
      }
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = Math.floor(bottomWorld / coarseStep) * coarseStep; y <= topWorld; y += coarseStep) {
      const sy = worldToScreen(0, y).y;
      if (sy < plotT - 1 || sy > plotB + 1) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(x0 - 6, sy);
      ctx.lineTo(x0 + 6, sy);
      ctx.stroke();
      if (Math.abs(y) > coarseStep * 0.0001) {
        ctx.fillText(String(Math.round(y * 100) / 100), x0 - 8, sy);
      }
    }

    // clip to plot area and draw functions
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotL, plotT, plotR - plotL, plotB - plotT);
    ctx.clip();

    const samples = Math.max(200, Math.floor((plotR - plotL) * 1)); // one sample per px baseline
    for (const fn of compiled) {
      ctx.strokeStyle = fn.color || "#22d3ee";
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const wx = leftWorld + (rightWorld - leftWorld) * t;
        let wy = NaN;
        try {
          wy = (fn.call ?? (() => NaN))(wx);
        } catch {
          wy = NaN;
        }
        if (!Number.isFinite(wy)) {
          first = true;
          continue;
        }
        const { x: sx, y: sy } = worldToScreen(wx, wy);
        // skip if way off screen to avoid huge lines
        if (sy < plotT - 200 || sy > plotB + 200) {
          first = true;
          continue;
        }
        if (first) {
          ctx.moveTo(sx, sy);
          first = false;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    }

    // hover crosshair and marker
    if (hover) {
      const { x: sx, y: sy } = worldToScreen(hover.wx, hover.wy);
      // lines
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(sx, plotT);
      ctx.lineTo(sx, plotB);
      ctx.moveTo(plotL, sy);
      ctx.lineTo(plotR, sy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // outline
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(plotL + 0.5, plotT + 0.5, plotR - plotL - 1, plotB - plotT - 1);
  }, [size, offset, scale, compiled, screenToWorld, worldToScreen, hover]);

  // redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  // wheel: zoom around cursor
  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const before = screenToWorld(sx, sy);
      const delta = e.deltaY;
      const factor = delta > 0 ? 0.92 : 1.08;
      const newScale = Math.max(4, Math.min(1200, scale * factor));
      setScale(newScale);
      // compute new offset so world point under cursor stays under cursor
      const w = size.w;
      const h = size.h;
      const plotCx = w / 2;
      const plotCy = h / 2;
      const newPlotCx = sx - before.x * newScale;
      const newPlotCy = sy + before.y * newScale;
      setOffset({ x: newPlotCx - plotCx, y: newPlotCy - plotCy });
    },
    [scale, size, screenToWorld],
  );

  // mouse down -> start drag
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      dragging.current = true;
      dragStart.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    },
    [offset],
  );

  // mouse move -> pan or hover
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (dragging.current && dragStart.current) {
        const dsx = e.clientX - dragStart.current.sx;
        const dsy = e.clientY - dragStart.current.sy;
        setOffset({ x: dragStart.current.ox + dsx, y: dragStart.current.oy + dsy });
        setHover(null);
        return;
      }

      // not dragging: compute hover nearest function y
      const world = screenToWorld(sx, sy);
      let bestY = NaN;
      let bestDist = Infinity;
      for (const fn of compiled) {
        let wy = NaN;
        try {
          wy = (fn.call ?? (() => NaN))(world.x);
        } catch {
          wy = NaN;
        }
        if (!Number.isFinite(wy)) continue;
        const { y: syFn } = worldToScreen(world.x, wy);
        const dist = Math.abs(syFn - sy);
        if (dist < bestDist && dist < 40) {
          bestDist = dist;
          bestY = wy;
        }
      }
      if (Number.isFinite(bestY)) {
        setHover({ wx: world.x, wy: bestY, screenX: sx + (canvas.getBoundingClientRect().left || 0), screenY: sy + (canvas.getBoundingClientRect().top || 0) });
      } else {
        setHover(null);
      }
    },
    [compiled, screenToWorld, worldToScreen],
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    dragStart.current = null;
  }, []);

  const onMouseLeave = useCallback(() => {
    dragging.current = false;
    dragStart.current = null;
    setHover(null);
  }, []);

  // double click to reset view
  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(40);
    // if xRange exists, try to fit
    if (xRange && xRange.length === 2 && Number.isFinite(xRange[0]) && Number.isFinite(xRange[1]) && xRange[1] > xRange[0] && size.w > 0) {
      const span = Math.abs(xRange[1] - xRange[0]);
      const newScale = Math.max(5, Math.min(800, size.w / span));
      setScale(newScale);
    }
  }, [xRange, size.w]);

  // attach pointer events to window to ensure we capture drag outside canvas
  useEffect(() => {
    const onUp = () => {
      dragging.current = false;
      dragStart.current = null;
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      // synthesize move relative to canvas
      const canvas = canvasRef.current;
      if (!canvas || !dragStart.current) return;
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      // reuse onMouseMove logic by calling handler directly would be awkward; just update offset here
      const dsx = ev.clientX - (dragStart.current?.sx ?? ev.clientX);
      const dsy = ev.clientY - (dragStart.current?.sy ?? ev.clientY);
      setOffset({ x: (dragStart.current?.ox ?? 0) + dsx, y: (dragStart.current?.oy ?? 0) + dsy });
    };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // keyboard: + / - to zoom, r to reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r") resetView();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(2000, s * 1.12));
      if (e.key === "-") setScale((s) => Math.max(4, s / 1.12));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);

  // legend items prepared
  const legend = useMemo(() => compiled.map((c) => ({ label: c.label ?? c.fn, color: c.color })), [compiled]);

  return (
    <div className={cn("w-full", className)}>
      {title && <div className="mb-2 text-center text-sm font-semibold text-white/80">{title}</div>}

      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "#0f1117", aspectRatio: "4/3" }}
      >
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{ width: "100%", height: "100%", display: "block", cursor: dragging.current ? "grabbing" : "crosshair" }}
        />

        {/* Reset button top-right */}
        <button
          onClick={resetView}
          title="Reset view"
          className="absolute right-3 top-3 z-10 rounded-md bg-white/6 px-2 py-1 text-xs text-white/80 hover:bg-white/10 transition"
        >
          Reset
        </button>

        {/* Hover tooltip */}
        {hover && (
          <div
            className="absolute z-20 pointer-events-none rounded-md px-2 py-1 text-xs font-mono"
            style={{
              left: Math.min(hover.screenX - (canvasRef.current?.getBoundingClientRect().left ?? 0) + 12, (size.w || 400) - 120),
              top: Math.max(hover.screenY - (canvasRef.current?.getBoundingClientRect().top ?? 0) - 36, 6),
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            x={hover.wx.toFixed(3)}, y={hover.wy.toFixed(3)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        {legend.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ background: l.color }} className="inline-block w-6 h-1.5 rounded-full" />
            <span className="text-xs text-white/70">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
                                                                     }
