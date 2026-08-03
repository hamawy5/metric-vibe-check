import { useMemo } from "react";
import {
  CartesianGrid,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import katex from "katex";
import { openNodeLightbox } from "@/components/ImageLightbox";

type Point = { x: number | string; y: number };
type Series = { name?: string; data: Point[] };
export type ChartSpec = {
  type?: "line" | "bar" | "scatter";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  series?: Series[];
  data?: Point[];
};

const COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#f87171", "#4ade80"];

/** Round rationals cleanly: integers stay bare, otherwise max 2 decimals. */
export function fmtNum(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return String(v ?? "");
  if (Object.is(v, -0)) return "0";
  if (Number.isInteger(v)) return String(v);
  const r = Math.round(v * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  return String(parseFloat(r.toFixed(2)));
}

export function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const spec = JSON.parse(raw) as ChartSpec;
    const series = spec.series ?? (spec.data ? [{ data: spec.data }] : []);
    if (!series.length || !series.some((s) => Array.isArray(s.data) && s.data.length)) return null;
    return { ...spec, series };
  } catch {
    return null;
  }
}

/* ---------------- KaTeX helpers ---------------- */

/** Turn loose AI text like "y = 2^x (Growth)" into valid LaTeX. */
function toLatex(text: string): string {
  let s = text.trim();
  if (/^\$.*\$$/.test(s)) return s.replace(/^\$+|\$+$/g, "");
  // wrap trailing/inline parenthetical prose in \text{}
  s = s.replace(/\(([^()$\\]*[A-Za-z]{2,}[^()$\\]*)\)/g, (_m, inner: string) =>
    /[+\-*/^=]/.test(inner) ? `(${inner})` : `\\text{ (${inner.trim()})}`,
  );
  return s;
}

export function MathText({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(toLatex(children), {
        throwOnError: false,
        displayMode: false,
        output: "html",
      });
    } catch {
      return null;
    }
  }, [children]);
  if (!html) return <span className={className}>{children}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------------- Math plane (SVG) ---------------- */

function niceStep(range: number, target: number) {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

function ticksFor(min: number, max: number, target: number) {
  const step = niceStep(max - min, target);
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step * 1e-6; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : Math.round(v * 1e6) / 1e6);
  }
  return { ticks: out, step };
}

const W = 480;
const H = 340;
const PAD = 34;

function MathPlane({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  const pts = series.map((s) =>
    s.data
      .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.x - b.x),
  );

  const all = pts.flat();
  let xmin = Math.min(...all.map((p) => p.x));
  let xmax = Math.max(...all.map((p) => p.x));
  let ymin = Math.min(...all.map((p) => p.y));
  let ymax = Math.max(...all.map((p) => p.y));
  if (xmin === xmax) ((xmin -= 1), (xmax += 1));
  if (ymin === ymax) ((ymin -= 1), (ymax += 1));
  // pad and always include the origin so the crosshair is visible
  const padY = (ymax - ymin) * 0.12;
  ymin = Math.min(0, ymin - padY);
  ymax = Math.max(0, ymax + padY);
  const padX = (xmax - xmin) * 0.06;
  xmin = Math.min(0, xmin - padX);
  xmax = Math.max(0, xmax + padX);

  const sx = (x: number) => PAD + ((x - xmin) / (xmax - xmin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - ymin) / (ymax - ymin)) * (H - 2 * PAD);

  const xt = ticksFor(xmin, xmax, large ? 10 : 7);
  const yt = ticksFor(ymin, ymax, large ? 8 : 6);
  const ax = sy(0); // y-pixel of the x-axis
  const ay = sx(0); // x-pixel of the y-axis
  const fs = large ? 12 : 10.5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#9CA3AF" />
        </marker>
      </defs>

      {/* grid */}
      {xt.ticks.map((t) => (
        <line key={`gx${t}`} x1={sx(t)} y1={PAD - 8} x2={sx(t)} y2={H - PAD + 8} stroke="#374151" strokeWidth={1} />
      ))}
      {yt.ticks.map((t) => (
        <line key={`gy${t}`} x1={PAD - 8} y1={sy(t)} x2={W - PAD + 8} y2={sy(t)} stroke="#374151" strokeWidth={1} />
      ))}

      {/* axes through the origin, with arrowheads */}
      <line x1={PAD - 12} y1={ax} x2={W - PAD + 14} y2={ax} stroke="#9CA3AF" strokeWidth={1.6} markerEnd="url(#mp-arrow)" />
      <line x1={ay} y1={H - PAD + 12} x2={ay} y2={PAD - 14} stroke="#9CA3AF" strokeWidth={1.6} markerEnd="url(#mp-arrow)" />

      {/* ticks + numbers written on the axes */}
      {xt.ticks.map((t) => (
        <g key={`tx${t}`}>
          <line x1={sx(t)} y1={ax - 4} x2={sx(t)} y2={ax + 4} stroke="#9CA3AF" strokeWidth={1.4} />
          {t !== 0 && (
            <text x={sx(t)} y={ax + fs + 5} textAnchor="middle" fontSize={fs} fill="#9CA3AF">
              {fmtNum(t)}
            </text>
          )}
        </g>
      ))}
      {yt.ticks.map((t) => (
        <g key={`ty${t}`}>
          <line x1={ay - 4} y1={sy(t)} x2={ay + 4} y2={sy(t)} stroke="#9CA3AF" strokeWidth={1.4} />
          {t !== 0 && (
            <text x={ay - 7} y={sy(t) + fs * 0.35} textAnchor="end" fontSize={fs} fill="#9CA3AF">
              {fmtNum(t)}
            </text>
          )}
        </g>
      ))}
      <text x={ay - 7} y={ax + fs + 3} textAnchor="end" fontSize={fs} fill="#9CA3AF">
        0
      </text>

      {/* axis names */}
      {spec.xLabel && (
        <text x={W - PAD + 6} y={ax - 8} textAnchor="end" fontSize={fs} fill="#9CA3AF" fontStyle="italic">
          {spec.xLabel}
        </text>
      )}
      {spec.yLabel && (
        <text x={ay + 8} y={PAD - 6} fontSize={fs} fill="#9CA3AF" fontStyle="italic">
          {spec.yLabel}
        </text>
      )}

      {/* curves / points */}
      {pts.map((data, i) => {
        const color = COLORS[i % COLORS.length];
        if ((spec.type ?? "line") === "scatter") {
          return (
            <g key={i}>
              {data.map((p, j) => (
                <circle key={j} cx={sx(p.x)} cy={sy(p.y)} r={large ? 4 : 3} fill={color} />
              ))}
            </g>
          );
        }
        const d = data.map((p, j) => `${j === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join(" ");
        return <path key={i} d={d} fill="none" stroke={color} strokeWidth={large ? 2.4 : 2} strokeLinecap="round" />;
      })}
    </svg>
  );
}

/* ---------------- Categorical / bar fallback ---------------- */

function BarBody({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  const xs: (number | string)[] = [];
  for (const s of series) for (const p of s.data) if (!xs.includes(p.x)) xs.push(p.x);
  const rows = xs.map((x) => {
    const row: Record<string, number | string> = { x };
    series.forEach((s, i) => {
      const hit = s.data.find((p) => p.x === x);
      if (hit) row[s.name || `y${i + 1}`] = hit.y;
    });
    return row;
  });
  const keys = series.map((s, i) => s.name || `y${i + 1}`);
  const tickSize = large ? 12 : 11;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 10, right: large ? 24 : 14, bottom: 10, left: large ? 10 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="x" stroke="#9CA3AF" tick={{ fontSize: tickSize, fill: "#9CA3AF" }} tickFormatter={fmtNum} />
        <YAxis stroke="#9CA3AF" tick={{ fontSize: tickSize, fill: "#9CA3AF" }} tickFormatter={fmtNum} />
        <Tooltip
          formatter={(value: number | string, name: string) => [fmtNum(value), name]}
          contentStyle={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 12,
            fontSize: 12,
            color: "#F9FAFB",
          }}
        />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Public chart ---------------- */

function isNumericPlane(spec: ChartSpec) {
  if ((spec.type ?? "line") === "bar") return false;
  return (spec.series ?? []).every((s) => s.data.every((p) => Number.isFinite(Number(p.x))));
}

function ChartBody({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  return isNumericPlane(spec) ? <MathPlane spec={spec} large={large} /> : <BarBody spec={spec} large={large} />;
}

function Legend({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  if (!series.length) return null;
  return (
    <div className={`mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${large ? "text-sm" : "text-xs"}`}>
      {series.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
          <MathText className={large ? "text-white/85" : "text-foreground/85"}>
            {s.name || `y_{${i + 1}}`}
          </MathText>
        </span>
      ))}
    </div>
  );
}

export function ChatChart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="my-4">
      {spec.title && (
        <figcaption className="mb-1.5 text-center text-[13px] font-semibold text-muted-foreground">
          <MathText>{spec.title}</MathText>
        </figcaption>
      )}
      <div
        onClick={() =>
          openNodeLightbox(
            <div className="w-[92vw] max-w-3xl rounded-xl bg-[#0b1120] p-3">
              {spec.title && (
                <p className="mb-1 text-center text-sm font-semibold text-white/80">
                  <MathText>{spec.title}</MathText>
                </p>
              )}
              <div className="h-[62vh]">
                <ChartBody spec={spec} large />
              </div>
              <Legend spec={spec} large />
            </div>,
          )
        }
        className="h-64 w-full cursor-zoom-in rounded-xl border border-border/60 bg-card p-2"
      >
        <ChartBody spec={spec} />
      </div>
      <Legend spec={spec} />
      <p className="mt-1 text-center text-[11px] text-muted-foreground">Tap graph to zoom</p>
    </figure>
  );
}

export function ChatSvg({ svg }: { svg: string }) {
  return (
    <div
      onClick={() =>
        openNodeLightbox(
          <div
            className="max-h-[80vh] max-w-[92vw] overflow-auto rounded-lg bg-white p-4 [&_svg]:h-auto [&_svg]:max-w-none"
            dangerouslySetInnerHTML={{ __html: svg }}
          />,
        )
      }
      className="my-4 max-w-full cursor-zoom-in overflow-x-auto rounded-xl border border-border/60 bg-card p-3 [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
