import { useMemo } from "react";
import {
  CartesianGrid,
  Bar,
  BarChart,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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




/* ---------------- Numeric plane (live Recharts) ---------------- */

const tooltipStyle = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 12,
  fontSize: 12,
  color: "#F9FAFB",
} as const;

/** Calculator-style axes: crosshair through the origin, arrowheads, numbers on the axes. */
function CartesianAxes(props: any) {
  const { xAxisMap, yAxisMap, offset, fontSize = 11 } = props;
  const xAxis: any = Object.values(xAxisMap ?? {})[0];
  const yAxis: any = Object.values(yAxisMap ?? {})[0];
  if (!xAxis?.scale || !yAxis?.scale || !offset) return null;

  const sx = xAxis.scale;
  const sy = yAxis.scale;
  const [x0, x1] = sx.range ? sx.range() : [offset.left, offset.left + offset.width];
  const [yTop, yBot] = sy.range ? sy.range() : [offset.top, offset.top + offset.height];
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(yTop, yBot);
  const bottom = Math.max(yTop, yBot);

  const clampX = (v: number) => Math.min(right, Math.max(left, v));
  const clampY = (v: number) => Math.min(bottom, Math.max(top, v));
  const originX = clampX(sx(0));
  const originY = clampY(sy(0));

  const xTicks: number[] = (sx.ticks ? sx.ticks(7) : []).filter((t: number) => t !== 0);
  const yTicks: number[] = (sy.ticks ? sy.ticks(7) : []).filter((t: number) => t !== 0);

  const axisColor = "#9CA3AF";
  const labelColor = "#D1D5DB";
  const t = 4; // tick half-length

  return (
    <g pointerEvents="none">
      <defs>
        <marker id="mp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={axisColor} />
        </marker>
      </defs>

      {/* axes through origin, with arrowheads */}
      <line
        x1={left}
        y1={originY}
        x2={right}
        y2={originY}
        stroke={axisColor}
        strokeWidth={1.5}
        markerEnd="url(#mp-arrow)"
      />
      <line
        x1={originX}
        y1={bottom}
        x2={originX}
        y2={top}
        stroke={axisColor}
        strokeWidth={1.5}
        markerEnd="url(#mp-arrow)"
      />

      {/* x ticks + numbers below the x axis */}
      {xTicks.map((v) => {
        const px = sx(v);
        if (px < left || px > right) return null;
        return (
          <g key={`x${v}`}>
            <line x1={px} y1={originY - t} x2={px} y2={originY + t} stroke={axisColor} />
            <text
              x={px}
              y={Math.min(bottom - 2, originY + t + fontSize + 2)}
              textAnchor="middle"
              fontSize={fontSize}
              fill={labelColor}
            >
              {fmtNum(v)}
            </text>
          </g>
        );
      })}

      {/* y ticks + numbers left of the y axis */}
      {yTicks.map((v) => {
        const py = sy(v);
        if (py < top || py > bottom) return null;
        return (
          <g key={`y${v}`}>
            <line x1={originX - t} y1={py} x2={originX + t} y2={py} stroke={axisColor} />
            <text
              x={Math.max(left + 2, originX - t - 4)}
              y={py + fontSize * 0.35}
              textAnchor="end"
              fontSize={fontSize}
              fill={labelColor}
            >
              {fmtNum(v)}
            </text>
          </g>
        );
      })}

      {/* axis names */}
      <text x={right - 4} y={originY - 8} textAnchor="end" fontSize={fontSize} fontStyle="italic" fill={labelColor}>
        x
      </text>
      <text x={originX + 8} y={top + fontSize} fontSize={fontSize} fontStyle="italic" fill={labelColor}>
        y
      </text>
    </g>
  );
}


function MathPlane({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  const keys = series.map((s, i) => s.name || `y${i + 1}`);
  const isScatter = (spec.type ?? "line") === "scatter";

  const { rows, yDomain, xDomain } = useMemo(() => {
    const clean = series.map((s) =>
      s.data
        .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .sort((a, b) => a.x - b.x),
    );
    const all = clean.flat();
    const xsAll = all.map((p) => p.x);
    let xmin = Math.min(...xsAll);
    let xmax = Math.max(...xsAll);
    const ys = all.map((p) => p.y).sort((a, b) => a - b);
    const q = (f: number) =>
      ys[Math.min(ys.length - 1, Math.max(0, Math.round(f * (ys.length - 1))))];
    let ymin = q(0.04);
    let ymax = q(0.96);
    const spread = Math.abs(xmax - xmin) || 1;
    if (!Number.isFinite(ymin) || !Number.isFinite(ymax) || ymin === ymax) {
      ymin = Math.min(...ys);
      ymax = Math.max(...ys);
    }
    ymin = Math.max(ymin, -spread * 6);
    ymax = Math.min(ymax, spread * 6);
    if (xmin === xmax) ((xmin -= 1), (xmax += 1));
    if (ymin === ymax) ((ymin -= 1), (ymax += 1));
    const padY = (ymax - ymin) * 0.12;
    ymin = Math.min(0, ymin - padY);
    ymax = Math.max(0, ymax + padY);

    // union of x values → one row per x, null for out-of-range (breaks the line)
    const xs = Array.from(new Set(all.map((p) => p.x))).sort((a, b) => a - b);
    const maps = clean.map((d) => new Map(d.map((p) => [p.x, p.y])));
    const rows = xs.map((x) => {
      const row: Record<string, number | null> = { x };
      maps.forEach((m, i) => {
        const v = m.get(x);
        row[keys[i]] = v === undefined || v < ymin || v > ymax ? null : v;
      });
      return row;
    });
    return {
      rows,
      xDomain: [xmin, xmax] as [number, number],
      yDomain: [ymin, ymax] as [number, number],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const tickSize = large ? 12 : 11;
  const margin = {
    top: 14,
    right: large ? 22 : 14,
    bottom: large ? 16 : 12,
    left: large ? 16 : 12,
  };
  const axes = (
    <>
      <CartesianGrid stroke="#3b4252" strokeOpacity={0.55} />
      <XAxis
        type="number"
        dataKey="x"
        domain={xDomain}
        tickCount={large ? 9 : 7}
        height={1}
        axisLine={false}
        tickLine={false}
        tick={false}
        allowDecimals
      />
      <YAxis
        type="number"
        domain={yDomain}
        tickCount={large ? 9 : 7}
        width={1}
        axisLine={false}
        tickLine={false}
        tick={false}
        allowDecimals
      />
      <Customized component={(p: any) => <CartesianAxes {...p} fontSize={tickSize} />} />
      <Tooltip
        contentStyle={tooltipStyle}
        labelFormatter={(l: number | string) => `x = ${fmtNum(l)}`}
        formatter={(value: number | string, name: string) => [fmtNum(value), name]}
      />
    </>
  );




  if (isScatter) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={rows} margin={margin}>
          {axes}
          {keys.map((k, i) => (
            <Scatter key={k} dataKey={k} name={k} fill={COLORS[i % COLORS.length]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={margin}>
        {axes}
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={k}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={large ? 2.4 : 2}
            dot={false}
            activeDot={{ r: large ? 5 : 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
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
      <BarChart data={rows} margin={{ top: 12, right: large ? 24 : 14, bottom: large ? 24 : 20, left: large ? 10 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="x" stroke="#9CA3AF" height={large ? 34 : 28} tickMargin={8} tick={{ fontSize: tickSize, fill: "#9CA3AF" }} tickFormatter={fmtNum} />
        <YAxis stroke="#9CA3AF" width={large ? 52 : 44} tickMargin={8} tick={{ fontSize: tickSize, fill: "#9CA3AF" }} tickFormatter={fmtNum} />

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
        className="h-64 w-full cursor-zoom-in rounded-xl border border-border/60 bg-[#23272e] p-2"
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
