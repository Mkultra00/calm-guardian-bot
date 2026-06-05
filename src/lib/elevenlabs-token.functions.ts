import { createServerFn } from "@tanstack/react-start";

export type AgentKind = "guardian" | "nhi";

export const getElevenLabsToken = createServerFn({ method: "POST" })
  .inputValidator((data: { agent?: AgentKind } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const kind: AgentKind = data?.agent === "nhi" ? "nhi" : "guardian";
    const agentId =
      kind === "nhi"
        ? process.env.ELEVENLABS_NHI_AGENT_ID
        : process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
    if (!agentId)
      throw new Error(
        kind === "nhi"
          ? "ELEVENLABS_NHI_AGENT_ID not configured"
          : "ELEVENLABS_AGENT_ID not configured",
      );

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token request failed: ${res.status} ${text}`);
    }
    const { token } = (await res.json()) as { token: string };
    return { token, agentId, agent: kind };
  });