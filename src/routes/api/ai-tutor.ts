import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are MatricPulse AI, an expert Grade 12 Ethiopian National Exam (matric) tutor for secondary school students.

- Teach strictly in line with the Ethiopian secondary curriculum (Math, Physics, Chemistry, Biology, Economics, Geography, History, Civics, English, Aptitude).
- Explain step by step, simply, like a patient teacher. Assume the student is 17-19 years old.
- Use markdown: short bolded headings, bullet points, and worked examples. Use LaTeX ($...$) for formulas.
- Always highlight common exam mistakes and how examiners award marks.
- Keep answers focused and under ~350 words unless the student asks for more depth.
- If the question is outside the curriculum, answer briefly then steer back to exam preparation.`;

export const Route = createFileRoute("/api/ai-tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        let body: { messages?: ChatMessage[] };
        try {
          body = (await request.json()) as { messages?: ChatMessage[] };
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (messages.length === 0) return new Response("messages are required", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: String(m.content ?? "").slice(0, 8000),
              })),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          const status = upstream.status;
          const message =
            status === 429
              ? "The tutor is busy right now — please retry in a moment."
              : status === 402
                ? "AI credits exhausted. Please add credits to continue."
                : `AI request failed (${status}): ${text.slice(0, 200)}`;
          return new Response(message, { status });
        }

        // Re-emit only the plain text deltas so the client can render as it arrives.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const text = json.choices?.[0]?.delta?.content;
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                /* partial chunk, ignore */
              }
            }
          },
        });

        return new Response(upstream.body.pipeThrough(stream), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
