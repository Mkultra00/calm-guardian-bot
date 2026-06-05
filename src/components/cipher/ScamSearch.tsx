import { useState } from "react";
import { Search, Loader2, ExternalLink, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { searchScamSources, type ScamSource } from "@/lib/scam-search.functions";
import { useCipher } from "@/hooks/use-cipher";

const PRESETS = [
  "IRS tax refund",
  "Crypto wallet recovery",
  "Amazon account suspended",
  "Romance / pig butchering",
  "Voice clone grandparent",
  "Zelle bank fraud alert",
];

export function ScamSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScamSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const runSearch = useServerFn(searchScamSources);
  const { addActivity, attachSources } = useCipher();

  const submit = async (raw: string) => {
    const q = raw.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setLastQuery(q);
    addActivity({
      tool: "firecrawl.search",
      reason: `Searching the web for scam intel on "${q}"`,
    });
    try {
      const res = await runSearch({ data: { query: q, limit: 8 } });
      if (res.error) {
        setError(res.error);
        addActivity({ tool: "firecrawl.search", reason: q, result: `✗ ${res.error}` });
      } else {
        setResults(res.sources);
        addActivity({
          tool: "firecrawl.search",
          reason: q,
          result: `Found ${res.sources.length} relevant sources`,
        });
        if (res.sources.length) {
          attachSources(
            q,
            res.sources.slice(0, 5).map((s) => ({ title: s.title, url: s.url })),
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed";
      setError(msg);
      addActivity({ tool: "firecrawl.search", reason: q, result: `✗ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <ShieldAlert className="h-3.5 w-3.5 text-accent" />
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Scam Intel · Web Search
        </div>
      </div>

      <div className="space-y-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter scam keywords (e.g. 'fake DocuSign invoice')"
              maxLength={200}
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="mono inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p);
                submit(p);
              }}
              disabled={loading}
              className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Top sources for "{lastQuery}"
            </div>
            <ul className="space-y-2">
              {results.map((r) => (
                <li
                  key={r.url}
                  className="rounded border border-border/60 bg-background/60 p-2.5"
                >
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10px] uppercase tracking-wider text-accent">
                          {r.source}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-foreground group-hover:text-primary">
                        {r.title}
                      </div>
                      {r.description && (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Search keywords from a suspicious message. Djinn pulls fresh scam reports and feeds the top sources into the threat card.
          </p>
        )}
      </div>
    </div>
  );
}