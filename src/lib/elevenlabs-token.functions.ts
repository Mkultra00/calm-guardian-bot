import { createServerFn } from "@tanstack/react-start";

export type AgentKind = "guardian" | "nhi";

type TokenResult =
  | { token: string; agent: AgentKind; error?: undefined }
  | { token: null; agent: AgentKind; error: string };

export const getElevenLabsToken = createServerFn({ method: "POST" })
  .inputValidator((data: { agent?: AgentKind } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY_1 ?? process.env.ELEVENLABS_API_KEY;
    const kind: AgentKind = data?.agent === "nhi" ? "nhi" : "guardian";
    const agentId =
      kind === "nhi"
        ? process.env.ELEVENLABS_NHI_AGENT_ID
        : process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) {
      return { token: null, agent: kind, error: "ElevenLabs API key is not configured." } satisfies TokenResult;
    }
    if (!agentId) {
      return {
        token: null,
        agent: kind,
        error:
          kind === "nhi"
            ? "NHI specialist agent ID is not configured."
            : "CISO specialist agent ID is not configured.",
      } satisfies TokenResult;
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      const text = await res.text();
      const specialist = kind === "nhi" ? "NHI" : "CISO";
      const missingAgent = res.status === 404 || text.includes("document_not_found");
      return {
        token: null,
        agent: kind,
        error: missingAgent
          ? `${specialist} specialist agent ID is invalid or no longer exists. Update its ElevenLabs agent ID secret.`
          : `${specialist} specialist token request failed (${res.status}).`,
      } satisfies TokenResult;
    }
    const { token } = (await res.json()) as { token: string };
    return { token, agent: kind } satisfies TokenResult;
  });