import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, Plus, Send, Sparkles, MessageSquare, X, Share2, Link2, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StreamGate } from "@/components/StreamGate";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/lounge")({
  head: () => ({
    meta: [
      { title: "AI Lounge — MatricPulse AI" },
      { name: "description", content: "Chat with your AI study tutor anytime." },
    ],
  }),
  component: () => (
    <StreamGate>
      <LoungePage />
    </StreamGate>
  ),
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

type Attachment = { name: string; mimeType: string; data: string; preview?: string };
type Msg = { role: "user" | "ai"; text: string; attachments?: Attachment[] };

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf,text/plain";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function LoungePage() {
  const [drawer, setDrawer] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm your **MatricPulse tutor**. Ask me anything from your Ethiopian curriculum — Math, Physics, Biology, English, or Aptitude. What should we tackle today?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 15MB.`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        picked.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          data: dataUrl.split(",").pop() ?? "",
          preview: file.type.startsWith("image/") ? dataUrl : undefined,
        });
      } catch {
        toast.error(`Could not read ${file.name}.`);
      }
    }
    setAttachments((a) => [...a, ...picked].slice(0, 5));
  };

  const send = async () => {
    const q = input.trim();
    if ((!q && attachments.length === 0) || typing) return;
    const userMsg: Msg = { role: "user", text: q, attachments };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setAttachments([]);
    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke<{ content?: string; error?: string }>(
        "ai-tutor",
        {
          body: {
            messages: history.map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.text,
              attachments: m.attachments?.map((a) => ({
                name: a.name,
                mimeType: a.mimeType,
                data: a.data,
              })),
            })),
          },
        },
      );

      if (error) throw new Error(error.message || "The tutor could not respond right now.");
      if (data?.error) throw new Error(data.error);

      const content = data?.content?.trim();
      setMessages((m) => [
        ...m,
        { role: "ai", text: content || "_No response — please try again._" },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setTyping(false);
    }
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
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-white/5 bg-background/80 px-3 py-3 backdrop-blur-xl">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-xl bg-[image:var(--gradient-primary)] px-3 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-95"
          aria-label="Back to Home"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">AI Lounge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-9 w-9 place-items-center rounded-xl bg-secondary transition hover:bg-secondary/80"
            aria-label="Open history"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl bg-secondary transition hover:bg-secondary/80"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex animate-fade-in",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "ai" && (
              <div className="mr-2.5 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "text-[15px] leading-7",
                m.role === "user"
                  ? "max-w-[85%] rounded-3xl rounded-br-lg bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "max-w-[92%] rounded-3xl rounded-bl-lg border border-border/60 bg-card px-4 py-3.5 text-foreground shadow-sm",
              )}
            >
              {m.role === "ai" ? (
                <div className="max-w-none space-y-3 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3.5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_hr]:my-4 [&_hr]:border-border [&_li]:my-1 [&_li>p]:my-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-secondary [&_pre]:p-3 [&_pre_code]:bg-transparent [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_:first-child]:mt-0 [&_:last-child]:mb-0">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      table: ({ children }) => (
                        <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-[13px]">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-secondary/70">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="border-b border-border p-3 font-bold text-foreground">
                          {children}
                        </th>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="[&>tr:nth-child(even)]:bg-secondary/30">{children}</tbody>
                      ),
                      td: ({ children }) => (
                        <td className="border-b border-border/60 p-3 align-top">{children}</td>
                      ),
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2">
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.attachments.map((a, ai) =>
                        a.preview ? (
                          <img
                            key={ai}
                            src={a.preview}
                            alt={a.name}
                            className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/30"
                          />
                        ) : (
                          <span
                            key={ai}
                            className="flex max-w-[180px] items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1 text-[11px]"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                </div>
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
  );
}
