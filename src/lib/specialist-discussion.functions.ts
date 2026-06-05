import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
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

const VOICES = {
  ciso: "JBFqnCBsd6RMkjVDRZzb",
  nhi: "Xb7hH8MSUJpSbSDYk0k2",
} as const;

const SYSTEM = `You are simulating a candid back-and-forth conversation between two security specialists evaluating a website:
- CISO: an enterprise Chief Information Security Officer focused on business risk, brand, compliance, user impact. Sharp, executive tone.
- NHI: a Non-Human Identity & AI threat specialist focused on bots, agents, credential/token exposure, automation abuse. Technical, curious tone.

They should actually TALK TO EACH OTHER: agree, push back, ask follow-ups, build on each other's points, and dig deep. 14 to 20 turns total, alternating, starting with CISO. Keep each turn to 2-4 sentences, natural spoken English, no markdown.

The discussion MUST explicitly cover BOTH attack surfaces, with several turns dedicated to each:
1. CONVENTIONAL attacks the site is exposed to (e.g. phishing, XSS, CSRF, injection, clickjacking, credential stuffing, supply-chain scripts, exposed admin/login surfaces, missing security headers, TLS issues, social engineering of users). CISO should lead these but NHI must weigh in.
2. NHI / agentic attacks the site is exposed to (e.g. bot scraping, automated account creation, token/API key leakage, OAuth/app abuse, prompt-injection of any embedded LLM features, agent impersonation, credential harvesting by autonomous agents, machine-to-machine auth gaps, MCP/tool abuse). NHI should lead these but CISO must weigh in on business impact.

For each category, give a concrete vulnerability assessment: how exposed is THIS site, what an attacker would likely try first, and what the blast radius looks like. Reference specific findings when relevant.

End with a JSON object ONLY (no prose outside it) of this exact shape:
{
  "verdict": "safe|suspicious|malicious",
  "summary": "2-3 sentence consensus covering both conventional and NHI exposure",
  "conventionalRisk": "low|medium|high",
  "nhiRisk": "low|medium|high",
  "turns": [
    { "speaker": "ciso|nhi", "text": "..." }
  ]
}`;

export const getSpecialistDiscussion = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const findings = data.findings
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.label}: ${f.detail}`)
      .join("\n");

    const userPrompt = `Site audited: ${data.url}
Title: ${data.title ?? "(none)"}
Summary: ${data.summary ?? "(none)"}
Findings:
${findings || "(none)"}

Hold the conversation now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Discussion failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: {
      verdict?: "safe" | "suspicious" | "malicious";
      summary?: string;
      turns?: { speaker: "ciso" | "nhi"; text: string }[];
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { summary: raw.slice(0, 200), turns: [] };
    }
    const turns = (parsed.turns ?? [])
      .filter((t) => t && (t.speaker === "ciso" || t.speaker === "nhi") && typeof t.text === "string")
      .slice(0, 24)
      .map((t) => ({ speaker: t.speaker, text: t.text, voiceId: VOICES[t.speaker] }));
    return {
      verdict: parsed.verdict ?? "suspicious",
      summary: parsed.summary ?? "",
      conventionalRisk: (parsed as any).conventionalRisk ?? null,
      nhiRisk: (parsed as any).nhiRisk ?? null,
      turns,
    };
  });