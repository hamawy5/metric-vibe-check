import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Plus, Send, Sparkles, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lounge")({
  head: () => ({
    meta: [
      { title: "AI Lounge — MatricPulse AI" },
      { name: "description", content: "Chat with your AI study tutor anytime." },
    ],
  }),
  component: LoungePage,
});

const HISTORY = [
  { id: 1, title: "Quadratic equations help", time: "2m ago" },
  { id: 2, title: "Explain photosynthesis", time: "1h ago" },
  { id: 3, title: "Essay on industrial rev", time: "Yesterday" },
  { id: 4, title: "Trig identities review", time: "2 days ago" },
  { id: 5, title: "Stats: standard deviation", time: "5 days ago" },
];

type Msg = { role: "user" | "ai"; text: string };

function LoungePage() {
  const [drawer, setDrawer] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm your MatricPulse tutor. What should we tackle today?" },
  ]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: input },
      { role: "ai", text: "Great question — let's break it down step by step…" },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => setDrawer(true)}
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
          aria-label="Open history"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">AI Lounge</span>
        </div>
        <button
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
          aria-label="New chat"
          onClick={() =>
            setMessages([{ role: "ai", text: "New session. Ready when you are." }])
          }
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "ai" && (
              <div className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-[image:var(--gradient-primary)] text-primary-foreground"
                  : "rounded-bl-md bg-card text-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-white/5 bg-background/80 px-3 py-3 backdrop-blur-xl">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask anything…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r border-white/10 bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Recent chats</h2>
              <button
                onClick={() => setDrawer(false)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                setMessages([{ role: "ai", text: "New session. Ready when you are." }]);
                setDrawer(false);
              }}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> New chat
            </button>
            <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {HISTORY.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setDrawer(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-secondary"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="text-[11px] text-muted-foreground">{h.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
