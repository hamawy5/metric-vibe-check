import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type LightboxState = { src: string; alt?: string } | { html: string } | null;

const listeners = new Set<(s: LightboxState) => void>();
let current: LightboxState = null;
function setLightbox(s: LightboxState) {
  current = s;
  listeners.forEach((l) => l(s));
}

export function openImageLightbox(src: string, alt?: string) {
  setLightbox({ src, alt });
}
export function openHtmlLightbox(html: string) {
  setLightbox({ html });
}

export function LightboxHost() {
  const [state, setState] = useState<LightboxState>(current);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  scaleRef.current = scale;
  txRef.current = tx;
  tyRef.current = ty;

  useEffect(() => {
    const l = (s: LightboxState) => {
      setState(s);
      setScale(1);
      setTx(0);
      setTy(0);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panning = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const pinch = useRef({ dist: 0, scale: 1 });

  const dist = () => {
    const [a, b] = Array.from(pointers.current.values());
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) {
      panning.current = false;
      pinch.current = { dist: dist(), scale: scaleRef.current };
      return;
    }
    panning.current = true;
    start.current = { x: e.clientX - txRef.current, y: e.clientY - tyRef.current };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current.dist > 0) {
      const next = (dist() / pinch.current.dist) * pinch.current.scale;
      const clamped = Math.min(3, Math.max(1, next));
      scaleRef.current = clamped;
      setScale(clamped);
      return;
    }
    if (!panning.current || scaleRef.current <= 1) return;
    const nx = e.clientX - start.current.x;
    const ny = e.clientY - start.current.y;
    txRef.current = nx;
    tyRef.current = ny;
    setTx(nx);
    setTy(ny);
  };
  const onPointerUp = (e?: React.PointerEvent) => {
    if (e) pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current.dist = 0;
    if (pointers.current.size === 0) panning.current = false;
  };

  if (!state) return null;


  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition active:scale-95"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition active:scale-95"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setTx(0);
              setTy(0);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition active:scale-95"
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="ml-1 text-xs font-medium tabular-nums text-white/70">
            {Math.round(scale * 100)}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLightbox(null);
        }}
      >
        <div
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: panning ? "none" : "transform 0.15s ease",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          className="max-h-full max-w-full"
          onClick={() => {
            if (scale === 1) setScale(2);
          }}
        >
          {"src" in state ? (
            <img
              src={state.src}
              alt={state.alt ?? ""}
              className="max-h-[80vh] max-w-[92vw] select-none object-contain"
              draggable={false}
            />
          ) : (
            <div
              className="max-h-[80vh] max-w-[92vw] overflow-auto rounded-lg bg-white p-4 [&_svg]:h-auto [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          )}
        </div>
      </div>
      <p className="pb-3 text-center text-[11px] text-white/50">
        Tap image to zoom · Drag to pan · Esc to close
      </p>
    </div>
  );
}

export function Zoomable({ children, html }: { children: ReactNode; html?: () => string }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (html) openHtmlLightbox(html());
      }}
      className="cursor-zoom-in"
    >
      {children}
    </div>
  );
}
