import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Send, Sparkles, MessageSquare, X, Share2, Link2, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StreamGate } from "@/components/StreamGate";

export const Route = createFileRoute("/lounge")({
  head: () => ({
    meta: [
      { title: "AI Lounge — MatricPulse AI" },
      { name: "description", content: "Chat with your AI study tutor anytime." },
    ],
  }),
  component: LoungePage,
});

const HISTORY_GROUPS = [
  {
    label: "Today",
    items: [
      { id: 1, title: "Explain vector addition", time: "2m ago" },
      { id: 2, title: "Quadratic equations help", time: "1h ago" },
    ],
  },
  {
    label: "Yesterday",
    items: [
      { id: 3, title: "Photosynthesis steps", time: "Yesterday" },
      { id: 4, title: "Essay: Adwa victory", time: "Yesterday" },
    ],
  },
  {
    label: "Previous 7 Days",
    items: [
      { id: 5, title: "Trig identities review", time: "3 days ago" },
      { id: 6, title: "Stats: standard deviation", time: "5 days ago" },
      { id: 7, title: "Newton's laws practice", time: "6 days ago" },
    ],
  },
];

type Msg = { role: "user" | "ai"; text: string };

function generateTutorResponse(q: string): string {
  const topic = q.trim().replace(/[?.!]+$/, "");
  return `Great question! Let's break down **${topic}** the way it's taught in the Ethiopian curriculum 🇪🇹.

### 🎯 Core Idea
This concept appears frequently in the **Grade 11 & 12 Matric exams**, so understanding it deeply will pay off.

### 📘 Step-by-Step Explanation
1. **Define the basics** — start with the precise definition from your textbook.
2. **Visualize it** — draw a diagram or sketch (most marks come from clear visuals).
3. **Apply the formula** — substitute carefully and watch your units.
4. **Verify your answer** — does it make physical sense?

### 💡 Key Points to Remember
- Always show your working — the matric examiners award **method marks**.
- Common mistake: forgetting to convert units (cm → m, °C → K).
- Practice with **past national exam questions** to lock it in.

### ✅ Quick Example
> If asked: *"${topic}"*, structure your answer in **3 parts**: definition → formula → worked example.

Want me to generate a **practice quiz** on this topic, or explain it in **Amharic**? 🚀`;
}

function LoungePage() {
  const [drawer, setDrawer] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm your **MatricPulse tutor**. Ask me anything from your Ethiopian curriculum — Math, Physics, Biology, English, or Aptitude. What should we tackle today?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    const q = input.trim();
    if (!q || typing) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: generateTutorResponse(q) }]);
      setTyping(false);
      inputRef.current?.focus();
    }, 900);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
    setCopied(true);
    toast.success("Link Copied to Clipboard!", {
      className: "!bg-green-600 !text-white !border-green-500",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <StreamGate>
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => setDrawer(true)}
          className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold transition hover:bg-secondary/80"
          aria-label="Open history"
        >
          <Menu className="h-4 w-4" /> History
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">AI Lounge</span>
        </div>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold transition hover:bg-secondary/80"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex animate-fade-in",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "ai" && (
              <div className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-[image:var(--gradient-primary)] text-primary-foreground"
                  : "rounded-bl-md bg-card text-foreground",
              )}
            >
              {m.role === "ai" ? (
                <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex animate-fade-in justify-start">
            <div className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-card px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/5 bg-background/80 px-3 py-3 backdrop-blur-xl">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-card p-2">
          <textarea
            ref={inputRef}
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
            disabled={!input.trim() || typing}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] transition disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {drawer && (
        <>
          <div
            className="fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs animate-[slide-in-right_0.3s_ease-out] flex-col border-r border-white/10 bg-card p-4 shadow-2xl [animation-name:slide-in-left] [transform:translateX(0)]"
            style={{ animation: "slideInLeft 0.3s ease-out" }}
          >
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
            <div className="mt-5 flex-1 space-y-5 overflow-y-auto">
              {HISTORY_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((h) => (
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
                </div>
              ))}
            </div>
          </aside>
          <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        </>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-sm animate-scale-in rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
                <Link2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-4 text-xl font-bold">Generate Shareable Link</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share this expert AI explanation with your classmates on Telegram!
            </p>
            <div className="mt-4 truncate rounded-xl border border-white/10 bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
              {typeof window !== "undefined" ? window.location.href : "https://matricpulse.ai/lounge"}
            </div>
            <button
              onClick={copyLink}
              className={cn(
                "mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Link Copied to Clipboard!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
    </StreamGate>
  );
}
