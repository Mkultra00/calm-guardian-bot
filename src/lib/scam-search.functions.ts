import { createServerFn } from "@tanstack/react-start";
import Firecrawl from "@mendable/firecrawl-js";

export interface ScamSource {
  title: string;
  url: string;
  description: string;
  source: string;
}

export interface ScamSearchResult {
  query: string;
  sources: ScamSource[];
  error?: string;
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const searchScamSources = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string; limit?: number }) => {
    const query = String(d?.query ?? "").trim().slice(0, 200);
    if (!query) throw new Error("query is required");
    const limit = Math.min(Math.max(Number(d?.limit) || 8, 1), 15);
    return { query, limit };
  })
  .handler(async ({ data }): Promise<ScamSearchResult> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { query: data.query, sources: [], error: "FIRECRAWL_API_KEY is not configured" };
    }

    const fullQuery = `${data.query} scam OR fraud OR phishing OR "scam alert"`;

    try {
      const fc = new Firecrawl({ apiKey });
      const res: unknown = await fc.search(fullQuery, {
        limit: data.limit,
        tbs: "qdr:m",
      });

      // SDK v2 typically returns { web: [...] }; tolerate alternate shapes.
      const r = res as {
        web?: Array<{ url?: string; title?: string; description?: string }>;
        data?: Array<{ url?: string; title?: string; description?: string }>;
      };
      const raw = r.web ?? r.data ?? [];
      const seen = new Set<string>();
      const sources: ScamSource[] = [];
      for (const item of raw) {
        const url = item?.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({
          url,
          title: item.title || url,
          description: item.description || "",
          source: hostnameOf(url),
        });
        if (sources.length >= data.limit) break;
      }
      return { query: data.query, sources };
    } catch (e) {
      return {
        query: data.query,
        sources: [],
        error: e instanceof Error ? e.message : "Search failed",
      };
    }
  });