import { createServerFn } from "@tanstack/react-start";

export interface AlertWebhookResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export const sendAlertWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { webhookUrl: string; payload: Record<string, unknown> }) => {
    const webhookUrl = String(d?.webhookUrl ?? "").trim().slice(0, 1000);
    if (!webhookUrl) throw new Error("webhookUrl is required");
    let parsed: URL;
    try {
      parsed = new URL(webhookUrl);
    } catch {
      throw new Error("Invalid webhook URL");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Webhook must be http(s)");
    }
    const payload = d?.payload && typeof d.payload === "object" ? d.payload : {};
    return { webhookUrl, payload };
  })
  .handler(async ({ data }): Promise<AlertWebhookResult> => {
    try {
      const res = await fetch(data.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.payload),
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Webhook POST failed" };
    }
  });