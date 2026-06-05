import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["ciso", "nhi"]),
  url: z.string().max(500),
  title: z.string().max(300).optional(),
  summary: z.string().max(2000).optional(),
  findings: z
    .array(
      z.object({
        label: z.string().max(200),
        detail: z.string().max(500),
        severity: z.enum(["info", "warn", "risk"]),
      }),
    )
    .max(20),
});

const PERSONAS = {
  ciso: {
    name: "CISO Specialist",
    system:
      "You are an enterprise Chief Information Security Officer. Give a sharp, executive-level opinion on the audited site: business risk, likely intent of the operator, what an enterprise should do (block, investigate, report). Keep it to 4-6 short sentences, plain spoken — this will be read aloud.",
  },
  nhi: {
    name: "NHI / AI Threat Specialist",
    system:
      "You are a Non-Human Identity & AI threat specialist. Focus on whether the site looks AI-generated, uses prompt-injection bait, harvests credentials/tokens, or targets autonomous agents. Give a 4-6 sentence spoken opinion with concrete next steps.",
  },
} as const;

export const getSpecialistOpinion = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const persona = PERSONAS[data.role];
    const findings = data.findings
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.label}: ${f.detail}`)
      .join("\n");

    const userPrompt = `Site audited: ${data.url}
Title: ${data.title ?? "(none)"}
Summary: ${data.summary ?? "(none)"}
Findings:
${findings || "(none)"}

Give your specialist opinion.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: persona.system },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Opinion failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const opinion = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { role: data.role, persona: persona.name, opinion };
  });