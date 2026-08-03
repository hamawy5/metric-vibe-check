import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";
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

const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e"];

/** Round rationals cleanly: integers stay bare, otherwise max 2 decimals. */
export function fmtNum(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return String(v ?? "");
  if (Number.isInteger(v)) return String(v);
  const r = Math.round(v * 100) / 100;
  return String(r);
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

function ChartBody({ spec, large = false }: { spec: ChartSpec; large?: boolean }) {
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  const type = spec.type ?? "line";

  const xs: (number | string)[] = [];
  for (const s of series) for (const p of s.data) if (!xs.includes(p.x)) xs.push(p.x);
  xs.sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : 0));
  const rows = xs.map((x) => {
    const row: Record<string, number | string> = { x };
    series.forEach((s, i) => {
      const hit = s.data.find((p) => p.x === x);
      if (hit) row[s.name || `y${i + 1}`] = hit.y;
    });
    return row;
  });

  const keys = series.map((s, i) => s.name || `y${i + 1}`);
  const Chart = type === "bar" ? BarChart : type === "scatter" ? ScatterChart : LineChart;
  const tickSize = large ? 12 : 11;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart
        data={rows}
        margin={{ top: 10, right: large ? 24 : 14, bottom: spec.xLabel ? 24 : 10, left: large ? 10 : 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.9} />
        <XAxis
          dataKey="x"
          type={typeof xs[0] === "number" ? "number" : "category"}
          stroke="#9CA3AF"
          tick={{ fontSize: tickSize, fill: "#9CA3AF" }}
          tickFormatter={fmtNum}
          tickLine
          axisLine={{ stroke: "#9CA3AF" }}
          allowDecimals
          label={
            spec.xLabel
              ? { value: spec.xLabel, position: "insideBottom", offset: -4, fontSize: tickSize, fill: "#9CA3AF" }
              : undefined
          }
        />
        <YAxis
          stroke="#9CA3AF"
          tick={{ fontSize: tickSize, fill: "#9CA3AF" }}
          tickFormatter={fmtNum}
          tickLine
          axisLine={{ stroke: "#9CA3AF" }}
          allowDecimals
          label={
            spec.yLabel
              ? { value: spec.yLabel, angle: -90, position: "insideLeft", fontSize: tickSize, fill: "#9CA3AF" }
              : undefined
          }
        />
        <ReferenceLine x={0} stroke="#6B7280" strokeWidth={1.5} />
        <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1.5} />
        <Tooltip
          cursor={{ stroke: "#9CA3AF", strokeDasharray: "3 3" }}
          labelFormatter={(l) => `x = ${fmtNum(l)}`}
          formatter={(value: number | string, name: string) => [`y = ${fmtNum(value)}`, name]}
          contentStyle={{
            background: large ? "#111827" : "hsl(var(--card))",
            border: "1px solid #374151",
            borderRadius: 12,
            fontSize: 12,
            color: large ? "#F9FAFB" : "hsl(var(--foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: tickSize }} />
        {keys.map((k, i) =>
          type === "bar" ? (
            <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ) : type === "scatter" ? (
            <Scatter key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
          ) : (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function ChatChart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="my-4">
      {spec.title && (
        <figcaption className="mb-1.5 text-[13px] font-semibold text-muted-foreground">{spec.title}</figcaption>
      )}
      <div
        onClick={() =>
          openNodeLightbox(
            <div className="h-[70vh] w-[92vw] max-w-3xl rounded-xl bg-[#0b1120] p-3">
              <ChartBody spec={spec} large />
            </div>,
          )
        }
        className="h-64 w-full cursor-zoom-in rounded-xl border border-border/60 bg-card p-2"
      >
        <ChartBody spec={spec} />
      </div>
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
