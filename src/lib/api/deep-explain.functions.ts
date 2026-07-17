import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const deepExplain = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      correctAnswer: z.string().min(1),
      subject: z.string().min(1),
      grade: z.string().min(1),
      unit: z.string().min(1),
      baseExplanation: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You are an expert Ethiopian matric exam tutor. Provide a deep, structured study explanation for a single MCQ.

FORMAT RULES (STRICT):
- Use markdown with these ## section headings: ## Concept Breakdown, ## Why The Correct Answer Works, ## Common Pitfalls, ## Worked Example, ## Exam Tip.
- Under EVERY heading, write ONLY bullet points (\`-\` lists). NEVER write paragraphs.
- Each bullet is one short, punchy idea (max ~20 words).
- Use **bold** for key terms and \`code\`/inline math for formulas.
- Nested sub-bullets are allowed for clarifying details.
- Keep the whole answer under 350 words.
- Style: like a ChatGPT explanation — clean, scannable, bulletized.

Align to the Ethiopian Grade ${data.grade} ${data.subject} curriculum.`;

    const userPrompt = `Subject: ${data.subject}\nGrade: ${data.grade}\nUnit: ${data.unit}\n\nQuestion: ${data.question}\nCorrect answer: ${data.correctAnswer}\n${data.baseExplanation ? `Existing short explanation: ${data.baseExplanation}\n` : ""}\nProduce the deep dive now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI is busy right now — please retry in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 160)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { content };
  });
