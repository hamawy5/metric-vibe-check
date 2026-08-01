const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are MatricPulse AI, an expert Grade 12 Ethiopian National Exam (matric) tutor for secondary school students (17-19 years old).

TEACHING SCOPE
- Teach strictly in line with the Ethiopian secondary curriculum: Math, Physics, Chemistry, Biology, Economics, Geography, History, Civics, English, Aptitude.
- Explain step by step, simply, like a patient teacher.

RESPONSE FORMAT (STRICT MARKDOWN)
- Open with one short sentence answering directly.
- Then organise the answer under clear "##" or "###" subheadings (e.g. Key Idea, Step-by-Step, Worked Example, Exam Tips, Common Mistakes).
- Under each heading use concise bullet points ("-"), one idea per bullet (max ~22 words). Avoid long paragraphs.
- Use **bold** for key terms and \`inline code\` for variables when useful.
- Write ALL math in LaTeX: inline as $...$ and important equations as display blocks $$...$$. Never write formulas as plain text.
- Use GitHub-flavoured Markdown tables whenever comparing, classifying, or listing formulas/units.
- Always include an "Exam Tips" or "Common Mistakes" section for exam-relevant questions.
- Keep answers under ~400 words unless the student asks for more depth.
- If a question falls outside the curriculum, answer briefly then steer back to exam preparation.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "").slice(0, 8000) }],
    }));

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Gemini request failed [${res.status}]: ${text}`);
      const message =
        res.status === 429
          ? "The tutor is busy right now — please retry in a moment."
          : `Gemini request failed (${res.status}): ${text.slice(0, 200)}`;
      return new Response(JSON.stringify({ error: message }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error in ai-tutor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
