import { createServerFn } from "@tanstack/react-start";

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number;
}

const FEEDS = [
  "https://news.google.com/rss/search?q=%22non-human+identity%22+OR+%22NHI+security%22+OR+%22AI+threat%22+OR+%22prompt+injection%22+OR+%22cyber+attack%22+when:1d&hl=en-US&gl=US&ceid=US:en",
];

function decodeEntities(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml))) {
    const block = m[1];
    const title = decodeEntities(/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "");
    const link = decodeEntities(/<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? "");
    const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? "";
    const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block);
    const source = decodeEntities(sourceMatch?.[1] ?? "");
    const ts = pub ? Date.parse(pub) : Date.now();
    if (title && link) {
      items.push({
        id: link,
        title,
        link,
        source: source || "News",
        publishedAt: isNaN(ts) ? Date.now() : ts,
      });
    }
  }
  return items;
}

export const fetchThreatNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: NewsItem[] }> => {
    try {
      const results = await Promise.all(
        FEEDS.map((url) =>
          fetch(url, { headers: { "user-agent": "Mozilla/5.0 DjinnBot/1.0" } })
            .then((r) => (r.ok ? r.text() : ""))
            .catch(() => ""),
        ),
      );
      const all = results.flatMap(parseRss);
      const seen = new Set<string>();
      const deduped = all.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
      deduped.sort((a, b) => b.publishedAt - a.publishedAt);
      return { items: deduped.slice(0, 25) };
    } catch {
      return { items: [] };
    }
  },
);