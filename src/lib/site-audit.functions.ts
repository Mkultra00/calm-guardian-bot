import { createServerFn } from "@tanstack/react-start";
import Firecrawl from "@mendable/firecrawl-js";

export interface SiteAuditFinding {
  label: string;
  detail: string;
  severity: "info" | "warn" | "risk";
}

export interface SiteAuditResult {
  url: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  summary?: string;
  findings: SiteAuditFinding[];
  links: string[];
  markdownPreview?: string;
  error?: string;
}

const SUSPICIOUS_KEYWORDS = [
  "verify your account",
  "wallet",
  "seed phrase",
  "gift card",
  "wire transfer",
  "irs",
  "social security",
  "login to continue",
  "confirm your identity",
  "urgent",
  "suspended",
  "bitcoin",
  "crypto",
  "investment opportunity",
];

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}

export const auditSite = createServerFn({ method: "POST" })
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
  .handler(async ({ data }): Promise<SiteAuditResult> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { url: data.url, findings: [], links: [], error: "FIRECRAWL_API_KEY is not configured" };
    }
    try {
      const fc = new Firecrawl({ apiKey });
      const res: unknown = await fc.scrape(data.url, {
        formats: ["markdown", "links", "summary"],
        onlyMainContent: true,
      });

      const r = res as {
        markdown?: string;
        summary?: string;
        links?: string[];
        metadata?: {
          title?: string;
          description?: string;
          sourceURL?: string;
          statusCode?: number;
        };
        data?: {
          markdown?: string;
          summary?: string;
          links?: string[];
          metadata?: {
            title?: string;
            description?: string;
            sourceURL?: string;
            statusCode?: number;
          };
        };
      };
      const markdown = r.markdown ?? r.data?.markdown ?? "";
      const summary = r.summary ?? r.data?.summary;
      const links = (r.links ?? r.data?.links ?? []).slice(0, 50);
      const metadata = r.metadata ?? r.data?.metadata ?? {};

      const findings: SiteAuditFinding[] = [];
      const inputHost = new URL(data.url).hostname.replace(/^www\./, "");
      const finalUrl = metadata.sourceURL ?? data.url;
      try {
        const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "");
        if (finalHost !== inputHost) {
          findings.push({
            label: "Redirects off-domain",
            detail: `Lands on ${finalHost} instead of ${inputHost}`,
            severity: "warn",
          });
        }
      } catch {}

      if (!finalUrl.startsWith("https://")) {
        findings.push({
          label: "No HTTPS",
          detail: "Site does not use encrypted transport.",
          severity: "risk",
        });
      }
      if (!metadata.title) {
        findings.push({ label: "Missing <title>", detail: "Page has no title tag.", severity: "info" });
      }

      const lower = markdown.toLowerCase();
      const hits = SUSPICIOUS_KEYWORDS.filter((k) => lower.includes(k));
      if (hits.length) {
        findings.push({
          label: "Scam-pattern language detected",
          detail: `Found: ${hits.slice(0, 5).join(", ")}`,
          severity: "risk",
        });
      }

      const externalLinks = links.filter((l) => {
        try {
          return new URL(l).hostname.replace(/^www\./, "") !== inputHost;
        } catch {
          return false;
        }
      });
      if (externalLinks.length > 20) {
        findings.push({
          label: "Many external links",
          detail: `${externalLinks.length} links point off-domain.`,
          severity: "info",
        });
      }

      if (!findings.length) {
        findings.push({
          label: "No obvious red flags",
          detail: "Surface scan clean. Always verify the sender independently.",
          severity: "info",
        });
      }

      return {
        url: data.url,
        finalUrl,
        title: metadata.title,
        description: metadata.description,
        summary,
        findings,
        links: externalLinks.slice(0, 15),
        markdownPreview: markdown.slice(0, 600),
      };
    } catch (e) {
      return {
        url: data.url,
        findings: [],
        links: [],
        error: e instanceof Error ? e.message : "Scrape failed",
      };
    }
  });