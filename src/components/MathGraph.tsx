import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GraphFunction {
  fn: string;
  color: string;
  label: string;
}

interface MathGraphProps {
  functions: GraphFunction[];
  xRange?: [number, number];
  className?: string;
  title?: string;
}

function compileFn(expr: string): (x: number) => number {
  const clean = expr
    .replace(/\^/g, "**")
    .replace(/\bsin\b/g, "Math.sin")
    .replace(/\bcos\b/g, "Math.cos")
    .replace(/\btan\b/g, "Math.tan")
    .replace(/\blog\b/g, "Math.log")
    .replace(/\bln\b/g, "Math.log")
    .replace(/\bsqrt\b/g, "Math.sqrt")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\bexp\b/g, "Math.exp")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E");
  return new Function("x", `return (${clean});`) as (x: number) => number;
}

export default function MathGraph({
  functions,
  xRange: initX = [-4, 4],
  className,
  title,
}: MathGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(40);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const compiled = React.useMemo(
    () =>
      functions.map((f) => ({
        ...f,
        call: compileFn(f.fn),
      })),
    [functions]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { w, h } = size;
    const padL = 36;
    const padB = 28;
    const padR = 12;
    const padT = 12;
    const plotL = padL;
    const plotR = w - padR;
    const plotT = padT;
    const plotB = h - padB;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;
    const plotCx = plotL + plotW / 2 + offset.x;
    const plotCy = plotT + plotH / 2 + offset.y;

    const toScreen = (x: number, y: number) => ({
      x: plotCx + x * scale,
      y: plotCy - y * scale,
    });
    const fromScreen = (sx: number, sy: number) => ({
      x: (sx - plotCx) / scale,
      y: (plotCy - sy) / scale,
    });

    const tl = fromScreen(plotL, plotT);
    const br = fromScreen(plotR, plotB);
    const xMin = tl.x;
    const xMax = br.x;
    const yMin = br.y;
    const yMax = tl.y;

    const rawStep = 50 / scale;
    const step = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fineStep = step / 5;

    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    const startX = Math.floor(xMin / fineStep) * fineStep;
    for (let x = startX; x <= xMax; x += fineStep) {
      const { x: sx } = toScreen(x, 0);
      if (sx >= plotL && sx <= plotR) {
        ctx.moveTo(sx, plotT);
        ctx.lineTo(sx, plotB);
      }
    }
    const startY = Math.floor(yMin / fineStep) * fineStep;
    for (let y = startY; y <= yMax; y += fineStep) {
      const { y: sy } = toScreen(0, y);
      if (sy >= plotT && sy <= plotB) {
        ctx.moveTo(plotL, sy);
        ctx.lineTo(plotR, sy);
      }
    }
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    const y0 = toScreen(0, 0).y;
    if (y0 >= plotT && y0 <= plotB) {
      ctx.moveTo(plotL, y0);
      ctx.lineTo(plotR, y0);
      ctx.moveTo(plotR - 8, y0 - 4);
      ctx.lineTo(plotR, y0);
      ctx.lineTo(plotR - 8, y0 + 4);
    }
    const x0 = toScreen(0, 0).x;
    if (x0 >= plotL && x0 <= plotR) {
      ctx.moveTo(x0, plotB);
      ctx.lineTo(x0, plotT);
      ctx.moveTo(x0 - 4, plotT + 8);
      ctx.lineTo(x0, plotT);
      ctx.lineTo(x0 + 4, plotT + 8);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (y0 >= plotT && y0 <= plotB) {
      ctx.fillText("x", plotR - 8, y0 + 6);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    if (x0 >= plotL && x0 <= plotR) {
      ctx.fillText("y", x0 + 6, plotT + 8);
    }

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const tickStep = step;
    const xStart = Math.floor(xMin / tickStep) * tickStep;
    for (let x = xStart; x <= xMax; x += tickStep) {
      if (Math.abs(x) < tickStep * 0.001) continue;
      const { x: sx } = toScreen(x, 0);
      if (sx < plotL || sx > plotR) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, y0 - 4);
      ctx.lineTo(sx, y0 + 4);
      ctx.stroke();
      ctx.fillText(String(Math.round(x * 100) / 100), sx, y0 + 6);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yStart = Math.floor(yMin / tickStep) * tickStep;
    for (let y = yStart; y <= yMax; y += tickStep) {
      if (Math.abs(y) < tickStep * 0.001) continue;
      const { y: sy } = toScreen(0, y);
      if (sy < plotT || sy > plotB) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 - 4, sy);
      ctx.lineTo(x0 + 4, sy);
      ctx.stroke();
      ctx.fillText(String(Math.round(y * 100) / 100), x0 - 8, sy);
    }

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    if (x0 >= plotL && x0 <= plotR && y0 >= plotT && y0 <= plotB) {
      ctx.fillText("0", x0 - 4, y0 + 4);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotL, plotT, plotW, plotH);
    ctx.clip();

    const samples = Math.max(200, Math.floor(plotW));
    for (const { call, color } of compiled) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= samples; i++) {
        const x = xMin + (xMax - xMin) * (i / samples);
        let y: number;
        try {
          y = call(x);
        } catch {
          first = true;
          continue;
        }
        if (!Number.isFinite(y)) {
          first = true;
          continue;
        }
        const { x: sx, y: sy } = toScreen(x, y);
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

    if (hover) {
      const { x: sx, y: sy } = toScreen(hover.x, hover.y);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
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

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(plotL, plotT, plotW, plotH);
  }, [compiled, scale, offset, size, hover]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { w, h } = size;
      const plotCx = 36 + (w - 36 - 12) / 2 + offset.x;
      const plotCy = 12 + (h - 12 - 28) / 2 + offset.y;
      const wx = (mx - plotCx) / scale;
      const wy = (plotCy - my) / scale;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(5, Math.min(400, scale * factor));
      const newPlotCx = mx - wx * newScale;
      const newPlotCy = my + wy * newScale;
      const newOffsetX = newPlotCx - (36 + (w - 36 - 12) / 2);
      const newOffsetY = newPlotCy - (12 + (h - 12 - 28) / 2);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [scale, offset, size]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }, [offset]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || size.w === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { w, h } = size;
      const plotCx = 36 + (w - 36 - 12) / 2 + offset.x;
      const plotCy = 12 + (h - 12 - 28) / 2 + offset.y;
      const wx = (mx - plotCx) / scale;
      const wy = (plotCy - my) / scale;

      if (isDragging) {
        setOffset({
          x: dragStart.current.ox + (e.clientX - dragStart.current.x),
          y: dragStart.current.oy + (e.clientY - dragStart.current.y),
        });
        setHover(null);
      } else {
        let bestY = NaN;
        let bestDist = Infinity;
        for (const { call } of compiled) {
          let y: number;
          try {
            y = call(wx);
          } catch {
            continue;
          }
          if (!Number.isFinite(y)) continue;
          const sy = plotCy - y * scale;
          const dist = Math.abs(sy - my);
          if (dist < bestDist && dist < 30) {
            bestDist = dist;
            bestY = y;
          }
        }
        if (Number.isFinite(bestY)) {
          setHover({ x: wx, y: bestY, screenX: mx, screenY: my });
        } else {
          setHover(null);
        }
      }
    },
    [isDragging, offset, scale, size, compiled]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHover(null);
  }, []);

  const resetView = useCallback(() => {
    setScale(40);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className={cn("w-full", className)}>
      {title && (
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          {title}
        </h3>
      )}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-white/5"
        style={{ aspectRatio: "4/3", background: "#0f1117", cursor: isDragging ? "grabbing" : "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        {hover && (
          <div
            className="absolute pointer-events-none z-10 px-2 py-1 rounded-md text-xs font-mono"
            style={{
              left: Math.min(hover.screenX + 12, size.w - 100),
              top: Math.max(hover.screenY - 32, 4),
              background: "rgba(0,0,0,0.8)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            x={hover.x.toFixed(2)}, y={hover.y.toFixed(2)}
          </div>
        )}
        <button
          onClick={resetView}
          className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition"
          title="Reset view"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
        {functions.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-1.5 rounded-full"
              style={{ background: f.color }}
            />
            <span className="text-xs text-white/60">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
