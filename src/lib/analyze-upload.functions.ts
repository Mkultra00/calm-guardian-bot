import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  dataUrl: z.string().min(20),
  filename: z.string().optional(),
  mimeType: z.string(),
});

export const analyzeUpload = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are assisting CIPHER, a family scam shield. Analyze the attached ${
      data.mimeType.startsWith("image/") ? "image" : "document"
    } (${data.filename ?? "uploaded file"}) for any signs of phishing, scam, fraud, social engineering, suspicious links, urgency tactics, brand spoofing, or AI-generated deception. Transcribe any visible text verbatim. Then give a short structured summary: SENDER, SUBJECT/CONTEXT, KEY TEXT, RED FLAGS, LINKS/NUMBERS. Be concise.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`Analyze failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { analysis: content };
  });