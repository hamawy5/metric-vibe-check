import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, Plus, Send, Sparkles, MessageSquare, X, Share2, Link2, Check, FileText, Pencil, Image as ImageIcon, Camera, Files } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StreamGate } from "@/components/StreamGate";
import { supabase } from "@/integrations/supabase/client";
import { ChatChart, ChatSvg, parseChartSpec } from "@/components/ChatChart";



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

const IMG_ACCEPT = "image/png,image/jpeg,image/webp";
const DOC_ACCEPT = "application/pdf,text/plain";

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"media" | "docs" | "camera">("media");
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
    const base = editingIndex !== null ? messages.slice(0, editingIndex) : messages;
    const history = [...base, userMsg];
    setEditingIndex(null);
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



  const editMessage = (index: number) => {
    const target = messages[index];
    if (!target || typing) return;
    setEditingIndex(index);
    setInput(target.text);
    setAttachments(target.attachments ?? []);
    requestAnimationFrame(() => inputRef.current?.focus());
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
    <div className="flex h-[100dvh] w-full max-w-full flex-col overflow-x-hidden">
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
      <div ref={scrollRef} className="w-full max-w-full flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-0 py-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex w-full max-w-full animate-fade-in",
              m.role === "user" ? "flex-col items-end pl-8 pr-3" : "justify-start pl-1.5 pr-2",
            )}
          >
            {m.role === "ai" && (
              <div className="mr-1.5 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "min-w-0 text-[15px] leading-7",
                m.role === "user"
                  ? "max-w-[85%] rounded-3xl rounded-br-lg bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "w-full max-w-full overflow-x-hidden py-1 text-foreground",
              )}
            >

              {m.role === "ai" ? (
                <div className="max-w-none space-y-3 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3.5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_hr]:my-4 [&_hr]:border-border [&_li]:my-1 [&_li>p]:my-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-secondary [&_pre]:p-3 [&_pre_code]:bg-transparent [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_:first-child]:mt-0 [&_:last-child]:mb-0">

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      table: ({ children }) => (
                        <div className="chat-scroll -mx-2 my-3 max-w-full overflow-x-auto px-2 py-1">
                          <table className="w-max min-w-full border-collapse overflow-hidden rounded-xl border border-border text-left text-[13px]">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-secondary/70">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="whitespace-nowrap border-b border-border px-4 py-3 font-bold text-foreground">
                          {children}
                        </th>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="[&>tr:nth-child(even)]:bg-secondary/30">{children}</tbody>
                      ),
                      td: ({ children }) => (
                        <td className="whitespace-nowrap border-b border-border/60 px-4 py-3 align-top">
                          {children}
                        </td>
                      ),

                      pre: ({ children }) => {
                        const child = Array.isArray(children) ? children[0] : children;
                        const props = (child as { props?: { className?: string; children?: unknown } })
                          ?.props;
                        const lang = /language-(\w+)/.exec(props?.className ?? "")?.[1];
                        const raw = String(props?.children ?? "");
                        if (lang === "chart" || lang === "chartjson") {
                          const spec = parseChartSpec(raw);
                          if (spec) return <ChatChart spec={spec} />;
                        }
                        if (lang === "svg" || raw.trim().startsWith("<svg")) {
                          return <ChatSvg svg={raw} />;
                        }
                        return <pre>{children}</pre>;
                      },
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
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                </div>
              )}
            </div>
            {m.role === "user" && m.text && (
              <button
                onClick={() => editMessage(i)}
                className="mr-1 mt-1.5 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95"
                aria-label="Edit message"
                title="Edit message"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

        ))}

        {typing && (
          <div className="flex animate-fade-in justify-start pl-1.5">
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
        {editingIndex !== null && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[12px]">
            <Pencil className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">Editing your message — send to update the answer.</span>
            <button
              onClick={() => {
                setEditingIndex(null);
                setInput("");
                setAttachments([]);
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-background/60"
              aria-label="Cancel edit"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex max-w-[190px] items-center gap-2 rounded-xl border border-border/60 bg-secondary px-2 py-1.5"
              >
                {a.preview ? (
                  <img src={a.preview} alt={a.name} className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-[11px]">{a.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-background/60"
                  aria-label={`Remove ${a.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-card p-2">
          <input
            ref={fileRef}
            type="file"
            accept={sheetTab === "docs" ? DOC_ACCEPT : sheetTab === "camera" ? "image/*" : IMG_ACCEPT}
            {...(sheetTab === "camera" ? { capture: "environment" as const } : {})}
            multiple
            className="hidden"
            onChange={(e) => {
              pickFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => setSheetOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-foreground transition hover:bg-secondary/80"
            aria-label="Attach file"
          >
            <Plus className="h-4 w-4" />
          </button>
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
            disabled={(!input.trim() && attachments.length === 0) || typing}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] transition disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>


      {/* Attachment sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex h-[50vh] flex-col rounded-t-3xl border-t border-white/10 bg-card p-4 shadow-2xl"
            style={{ animation: "sheetUp 0.25s ease-out" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/40" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Attach to your question</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {([
                { id: "media", label: "Gallery/Media", icon: ImageIcon },
                { id: "docs", label: "Documents", icon: Files },
                { id: "camera", label: "Camera", icon: Camera },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSheetTab(t.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                    sheetTab === t.id
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-secondary/40 p-4 text-left transition active:scale-[0.99]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
                  {sheetTab === "docs" ? (
                    <Files className="h-5 w-5 text-primary-foreground" />
                  ) : sheetTab === "camera" ? (
                    <Camera className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {sheetTab === "docs"
                      ? "Choose a document"
                      : sheetTab === "camera"
                        ? "Take a photo"
                        : "Choose photos"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sheetTab === "docs" ? "PDF or TXT, up to 15MB" : "PNG, JPG or WEBP, up to 5 files"}
                  </p>
                </div>
              </button>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Selected
                  </p>
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/60 p-2"
                    >
                      {a.preview ? (
                        <img src={a.preview} alt={a.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-background">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs">{a.name}</span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-background/70"
                        aria-label={`Remove ${a.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSheetOpen(false)}
              className="mt-3 w-full rounded-xl bg-[image:var(--gradient-primary)] py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              {attachments.length > 0 ? `Attach ${attachments.length} file(s)` : "Done"}
            </button>
          </div>
          <style>{`@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
      )}

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
