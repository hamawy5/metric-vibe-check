import { useRef } from "react";
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
} from "recharts";
import { openHtmlLightbox } from "@/components/ImageLightbox";

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

export function ChatChart({ spec }: { spec: ChartSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const series = (spec.series ?? []).filter((s) => Array.isArray(s.data) && s.data.length);
  const type = spec.type ?? "line";

  // merge series on x for a shared dataset
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

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
      <XAxis
        dataKey="x"
        type={typeof xs[0] === "number" ? "number" : "category"}
        stroke="currentColor"
        className="text-muted-foreground"
        tick={{ fontSize: 11 }}
        label={
          spec.xLabel ? { value: spec.xLabel, position: "insideBottom", offset: -4, fontSize: 11 } : undefined
        }
      />
      <YAxis
        stroke="currentColor"
        className="text-muted-foreground"
        tick={{ fontSize: 11 }}
        label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", fontSize: 11 } : undefined}
      />
      <Tooltip
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          fontSize: 12,
        }}
      />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>
  );

  return (
    <figure className="my-4">
      {spec.title && (
        <figcaption className="mb-1.5 text-[13px] font-semibold text-muted-foreground">{spec.title}</figcaption>
      )}
      <div
        ref={ref}
        onClick={() => {
          const svg = ref.current?.querySelector("svg");
          if (svg) openHtmlLightbox(svg.outerHTML);
        }}
        className="h-64 w-full cursor-zoom-in rounded-xl border border-border/60 bg-card p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ top: 8, right: 12, bottom: spec.xLabel ? 18 : 4, left: 0 }}>
            {axes}
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
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">Tap graph to zoom</p>
    </figure>
  );
}

export function ChatSvg({ svg }: { svg: string }) {
  return (
    <div
      onClick={() => openHtmlLightbox(svg)}
      className="my-4 max-w-full cursor-zoom-in overflow-x-auto rounded-xl border border-border/60 bg-card p-3 [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
