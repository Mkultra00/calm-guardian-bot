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
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    system:
      "You are an enterprise Chief Information Security Officer giving a spoken briefing. Respond ONLY with valid JSON matching this shape: {\"verdict\":\"safe|suspicious|malicious\",\"headline\":\"one short sentence\",\"sections\":[{\"title\":\"Business Risk\",\"body\":\"...\"},{\"title\":\"Likely Intent\",\"body\":\"...\"},{\"title\":\"Recommended Action\",\"body\":\"...\"}],\"spoken\":\"a natural 4-6 sentence narration suitable for text-to-speech, no markdown\"}. Be sharp and executive. No prose outside the JSON.",
  },
  nhi: {
    name: "NHI / AI Threat Specialist",
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    system:
      "You are a Non-Human Identity & AI threat specialist giving a spoken briefing. Respond ONLY with valid JSON matching this shape: {\"verdict\":\"safe|suspicious|malicious\",\"headline\":\"one short sentence\",\"sections\":[{\"title\":\"AI / Bot Signals\",\"body\":\"...\"},{\"title\":\"Credential & Token Risk\",\"body\":\"...\"},{\"title\":\"Agent Hardening Steps\",\"body\":\"...\"}],\"spoken\":\"a natural 4-6 sentence narration suitable for text-to-speech, no markdown\"}. No prose outside the JSON.",
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
        response_format: { type: "json_object" },
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
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: {
      verdict?: "safe" | "suspicious" | "malicious";
      headline?: string;
      sections?: { title: string; body: string }[];
      spoken?: string;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { headline: raw.slice(0, 200), spoken: raw, sections: [] };
    }
    return {
      role: data.role,
      persona: persona.name,
      voiceId: persona.voiceId,
      verdict: parsed.verdict ?? "suspicious",
      headline: parsed.headline ?? "",
      sections: parsed.sections ?? [],
      spoken: parsed.spoken ?? parsed.headline ?? "",
    };
  });