import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { openHtmlLightbox } from "@/components/ImageLightbox";


let initialized = false;
let idCounter = 0;

function ensureInit() {
  if (initialized) return;
  const isDark = document.documentElement.classList.contains("dark");
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "inherit",
    themeVariables: isDark
      ? {
          background: "transparent",
          primaryColor: "#312e81",
          primaryTextColor: "#f8fafc",
          primaryBorderColor: "#818cf8",
          lineColor: "#94a3b8",
          secondaryColor: "#155e75",
          tertiaryColor: "#1e293b",
        }
      : {
          background: "transparent",
          primaryColor: "#eef2ff",
          primaryTextColor: "#0f172a",
          primaryBorderColor: "#6366f1",
          lineColor: "#475569",
        },
  });
  initialized = true;
}

export function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureInit();
    const id = `mmd-${++idCounter}-${Date.now()}`;
    mermaid
      .render(id, code.trim())
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to render diagram");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="my-5 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200/80 bg-card p-4 dark:border-white/10">
      {error ? (
        <pre className="text-xs text-red-400 whitespace-pre-wrap">{error}</pre>
      ) : (
        <div
          ref={ref}
          onClick={() => {
            const svg = ref.current?.querySelector("svg");
            if (svg) openHtmlLightbox(svg.outerHTML);
          }}
          className="mermaid-render flex w-max min-w-full cursor-zoom-in justify-center [&_svg]:h-auto [&_svg]:max-w-none"
        />
      )}
    </div>
  );
}
