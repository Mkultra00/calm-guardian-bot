import { createServerFn } from "@tanstack/react-start";
import Firecrawl from "@mendable/firecrawl-js";

export interface SiteMonitorResult {
  url: string;
  checkedAt: string;
  changeStatus?: "new" | "same" | "changed" | "removed";
  previousScrapeAt?: string | null;
  visibility?: string | null;
  title?: string;
  error?: string;
}

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}

export const checkSiteChanges = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => {
    const url = normalizeUrl(String(d?.url ?? "")).slice(0, 500);
    if (!url) throw new Error("url is required");
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL");
    }
    return { url };
  })
  .handler(async ({ data }): Promise<SiteMonitorResult> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const checkedAt = new Date().toISOString();
    if (!apiKey) {
      return { url: data.url, checkedAt, error: "FIRECRAWL_API_KEY is not configured" };
    }
    try {
      const fc = new Firecrawl({ apiKey });
      const res: unknown = await fc.scrape(data.url, {
        formats: ["markdown", { type: "changeTracking" }],
        onlyMainContent: true,
      });
      const r = res as {
        metadata?: { title?: string };
        changeTracking?: {
          previousScrapeAt?: string | null;
          changeStatus?: "new" | "same" | "changed" | "removed";
          visibility?: string | null;
        };
        data?: {
          metadata?: { title?: string };
          changeTracking?: {
            previousScrapeAt?: string | null;
            changeStatus?: "new" | "same" | "changed" | "removed";
            visibility?: string | null;
          };
        };
      };
      const ct = r.changeTracking ?? r.data?.changeTracking;
      const meta = r.metadata ?? r.data?.metadata ?? {};
      return {
        url: data.url,
        checkedAt,
        changeStatus: ct?.changeStatus,
        previousScrapeAt: ct?.previousScrapeAt ?? null,
        visibility: ct?.visibility ?? null,
        title: meta.title,
      };
    } catch (e) {
      return {
        url: data.url,
        checkedAt,
        error: e instanceof Error ? e.message : "Monitor check failed",
      };
    }
  });