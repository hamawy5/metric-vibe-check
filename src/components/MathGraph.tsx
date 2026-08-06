import { useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/ChatChart";
import { openNodeLightbox } from "@/components/ImageLightbox";

export type PlotFn = { fn: string; color?: string; label?: string };
export type MathGraphSpec = {
  title?: string;
  functions: PlotFn[];
  xRange?: [number, number];
  yRange?: [number, number];
  xLabel?: string;
  yLabel?: string;
};

const PALETTE = ["#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#4ade80"];

/* ---------------- spec parsing ---------------- */

/** Normalize loose AI math into an expression function-plot can evaluate. */
export function normalizeExpression(input: string): string {
  let s = input.trim();
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

const EQ_LINE = /^\s*(?:([A-Za-z][\w\s()]*?)\s*:\s*)?(?:[fgh]\s*\(\s*x\s*\)|y)\s*=\s*(.+?)\s*$/i;

/** Accepts either a JSON spec with `functions`, or plain lines of `y = ...`. */
export function parseMathGraphSpec(raw: string): MathGraphSpec | null {
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const j = JSON.parse(text) as Partial<MathGraphSpec> & { fn?: string };
      const fns = Array.isArray(j.functions)
        ? j.functions
        : j.fn
          ? [{ fn: j.fn }]
          : [];
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

  const lines = text.split("\n").filter((l) => l.trim());
  if (!lines.length || lines.length > 6) return null;
  const functions: PlotFn[] = [];
  for (const line of lines) {
    const m = EQ_LINE.exec(line.replace(/\s*\((?:growth|decay)[^)]*\)\s*$/i, (x) => x));
    if (!m) return null;
    const expr = normalizeExpression(m[2].replace(/\(([^()]*[a-zA-Z]{3,}[^()]*)\)\s*$/, ""));
    if (!expr) return null;
    functions.push({
      fn: expr,
      color: PALETTE[functions.length % PALETTE.length],
      label: line.trim(),
    });
  }
  return functions.length ? { functions } : null;
}

/* ---------------- renderer ---------------- */

function Plot({ spec, height }: { spec: MathGraphSpec; height: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;

    (async () => {
      const host = hostRef.current;
      if (!host) return;
      try {
        const mod = await import("function-plot");
        if (disposed) return;
        const functionPlot = (mod as unknown as { default: (o: unknown) => unknown }).default ?? mod;

        const render = () => {
          const el = hostRef.current;
          if (!el) return;
          el.innerHTML = "";
          const width = el.clientWidth || 320;
          try {
            (functionPlot as (o: unknown) => unknown)({
              target: el,
              width,
              height,
              grid: true,
              disableZoom: false,
              xAxis: { domain: spec.xRange ?? [-6, 6], label: spec.xLabel ?? "x" },
              yAxis: { domain: spec.yRange ?? [-6, 6], label: spec.yLabel ?? "y" },
              tip: { xLine: true, yLine: true, renderer: (x: number, y: number) => `(${round(x)}, ${round(y)})` },
              annotations: [
                { x: 0, text: "" },
                { y: 0, text: "" },
              ],
              data: spec.functions.map((f) => ({
                fn: f.fn,
                color: f.color,
                graphType: "polyline",
                nSamples: 1200,
                skipTip: false,
              })),
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not plot this function.");
          }
        };

        render();
        ro = new ResizeObserver(() => render());
        ro.observe(host);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Plotter failed to load.");
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [spec, height]);

  if (error) {
    return (
      <div className="grid h-full place-items-center px-3 text-center text-xs text-muted-foreground">
        {error}
      </div>
    );
  }
  return <div ref={hostRef} className="math-plot w-full touch-none select-none" style={{ height }} />;
}

function round(v: number) {
  if (!Number.isFinite(v)) return "–";
  return String(Math.round(v * 100) / 100);
}

function Legend({ spec, large = false }: { spec: MathGraphSpec; large?: boolean }) {
  return (
    <div
      className={`mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${large ? "text-sm" : "text-xs"}`}
    >
      {spec.functions.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full" style={{ background: f.color }} />
          <MathText className={large ? "text-white/85" : "text-foreground/85"}>
            {f.label || f.fn}
          </MathText>
        </span>
      ))}
    </div>
  );
}

export function MathGraph({ spec }: { spec: MathGraphSpec }) {
  const key = useMemo(() => JSON.stringify(spec), [spec]);
  return (
    <figure className="my-4">
      {spec.title && (
        <figcaption className="mb-1.5 text-center text-[13px] font-semibold text-muted-foreground">
          <MathText>{spec.title}</MathText>
        </figcaption>
      )}
      <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-[#0b1120] p-1">
        <Plot key={key} spec={spec} height={256} />
      </div>
      <Legend spec={spec} />
      <div className="mt-1 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span>Pinch / scroll to zoom · drag to pan</span>
        <button
          type="button"
          className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground"
          onClick={() =>
            openNodeLightbox(
              <div className="w-[92vw] max-w-3xl rounded-xl bg-[#0b1120] p-3">
                {spec.title && (
                  <p className="mb-1 text-center text-sm font-semibold text-white/80">
                    <MathText>{spec.title}</MathText>
                  </p>
                )}
                <Plot spec={spec} height={Math.round(window.innerHeight * 0.6)} />
                <Legend spec={spec} large />
              </div>,
            )
          }
        >
          Expand graph
        </button>
      </div>
    </figure>
  );
}
