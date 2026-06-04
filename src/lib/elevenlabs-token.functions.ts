import { createServerFn } from "@tanstack/react-start";

export const getElevenLabsToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
    if (!agentId) throw new Error("ELEVENLABS_AGENT_ID not configured");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token request failed: ${res.status} ${text}`);
    }
    const { token } = (await res.json()) as { token: string };
    return { token, agentId };
  },
);