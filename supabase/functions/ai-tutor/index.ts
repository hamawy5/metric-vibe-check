const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Attachment = { name?: string; mimeType: string; data: string };
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

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
GRAPHS AND DIAGRAMS (NEVER USE ASCII ART)
- When asked to plot, sketch, or draw a graph, NEVER use ASCII/text art.
- Instead output a fenced code block tagged \`chart\` containing JSON for our charting renderer:
\`\`\`chart
{"type":"line","title":"y = x^2","xLabel":"x","yLabel":"y","series":[{"name":"y = x^2","data":[{"x":-3,"y":9},{"x":-2,"y":4},{"x":-1,"y":1},{"x":0,"y":0},{"x":1,"y":1},{"x":2,"y":4},{"x":3,"y":9}]}]}
\`\`\`
- "type" is "line" (functions/curves), "scatter" (data points) or "bar" (categories). Sample at least 15 evenly spaced points for smooth curves, and include multiple entries in "series" to compare functions.
- For every discontinuous function, NEVER place points from opposite sides of an asymptote in one series. Output separate named series such as "branch_left" and "branch_right", and omit the undefined x-value. For example, y=1/x must use one series for x<0 and another for x>0.
- For geometry figures, free-body diagrams, or circuits, output a self-contained \`svg\` fenced code block with a viewBox and stroke="currentColor" instead.
- Always add a one-line explanation of the graph beneath it.

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

    const contents = messages.map((m) => {
      const parts: Array<Record<string, unknown>> = [];
      const text = String(m.content ?? "").slice(0, 8000);
      if (text) parts.push({ text });
      for (const a of m.attachments ?? []) {
        if (!a?.data || !a?.mimeType) continue;
        const raw = a.data.includes(",") ? a.data.split(",").pop()! : a.data;
        parts.push({ inlineData: { mimeType: a.mimeType, data: raw } });
      }
      if (parts.length === 0) parts.push({ text: "(empty)" });
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

    const payload = JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    const MODELS = [
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-pro-latest",
    ];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let res: Response | undefined;
    let lastStatus = 503;
    let lastText = "";

    outer: for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const attemptRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: payload,
          },
        );

        if (attemptRes.ok) {
          res = attemptRes;
          break outer;
        }

        lastStatus = attemptRes.status;
        lastText = await attemptRes.text().catch(() => "");
        console.error(`Gemini ${model} failed [${lastStatus}] attempt ${attempt + 1}: ${lastText}`);

        // Model missing/unavailable → skip to the next model in the list
        if (lastStatus === 404 || lastStatus === 400) break;
        // Retry only on transient overload / rate limit / server errors
        if (![429, 500, 502, 503, 504].includes(lastStatus)) break outer;
        if (attempt < 2) await sleep(600 * 2 ** attempt);
      }
    }

    if (!res) {
      // Gemini exhausted/unavailable → fall back to Lovable AI Gateway
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        const gwMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role,
            content: [
              { type: "text", text: String(m.content ?? "").slice(0, 8000) || "(empty)" },
              ...(m.attachments ?? [])
                .filter((a) => a?.data && a?.mimeType?.startsWith("image/"))
                .map((a) => ({
                  type: "image_url",
                  image_url: {
                    url: a.data.startsWith("data:")
                      ? a.data
                      : `data:${a.mimeType};base64,${a.data}`,
                  },
                })),
            ],
          })),
        ];

        const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({ model: "google/gemini-3.5-flash", messages: gwMessages }),
        });

        if (gwRes.ok) {
          const gwJson = (await gwRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = gwJson.choices?.[0]?.message?.content?.trim() ?? "";
          return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        lastStatus = gwRes.status;
        lastText = await gwRes.text().catch(() => "");
        console.error(`Lovable AI fallback failed [${lastStatus}]: ${lastText}`);
      }

      const message =
        lastStatus === 429 || lastStatus === 503
          ? "The tutor is very busy right now. Please try again in a few seconds."
          : `AI request failed (${lastStatus}): ${lastText.slice(0, 200)}`;
      return new Response(JSON.stringify({ error: message }), {
        status: lastStatus === 503 ? 503 : lastStatus,
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
