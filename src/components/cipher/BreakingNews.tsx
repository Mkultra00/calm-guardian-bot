import { useEffect, useRef, useState } from "react";
import { Radio, Square, Loader2, ExternalLink, Volume2, VolumeX } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchThreatNews, type NewsItem } from "@/lib/threat-news.functions";
import { synthesizeSpeech } from "@/lib/tts.functions";

const POLL_MS = 30_000;

export function BreakingNews() {
  const [streaming, setStreaming] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchNews = useServerFn(fetchThreatNews);

  useEffect(() => {
    if (!streaming) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      return;
    }
    let cancelled = false;

    const tick = async () => {
      setLoading(true);
      try {
        const { items: fresh } = await fetchNews();
        if (cancelled) return;
        const incoming = fresh.filter((i) => !seen.current.has(i.id));
        incoming.forEach((i) => seen.current.add(i.id));
        if (incoming.length) {
          setItems((prev) => [...incoming, ...prev].slice(0, 50));
        }
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Feed error");
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && streaming) {
          timer.current = setTimeout(tick, POLL_MS);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [streaming, fetchNews]);

  return (
    <div className="rounded-lg border border-accent/40 bg-card/60">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Radio
            className={`h-3.5 w-3.5 ${streaming ? "animate-pulse text-accent" : "text-muted-foreground"}`}
          />
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Breaking · Cyber / NHI / AI Threats
          </div>
          {streaming && loading && (
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
          )}
        </div>
        <button
          onClick={() => setStreaming((s) => !s)}
          className={`mono inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
            streaming
              ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "border-accent bg-accent/10 text-accent hover:bg-accent/20"
          }`}
        >
          {streaming ? (
            <>
              <Square className="h-3 w-3" /> Stop Stream
            </>
          ) : (
            <>
              <Radio className="h-3 w-3" /> Stream Breaking News
            </>
          )}
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-3">
        {items.length === 0 && !streaming && (
          <p className="mono text-[11px] text-muted-foreground">
            Click <strong>Stream Breaking News</strong> to begin a live feed of
            cyber, non-human identity, and AI threat headlines.
          </p>
        )}
        {items.length === 0 && streaming && !error && (
          <p className="mono text-[11px] text-muted-foreground">
            Listening for breaking headlines…
          </p>
        )}
        {error && (
          <p className="mono text-[11px] text-destructive">Feed error: {error}</p>
        )}
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-2">
              <span className="mono mt-0.5 shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent">
                {new Date(i.publishedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <a
                href={i.link}
                target="_blank"
                rel="noreferrer"
                className="group flex-1 text-xs leading-snug text-foreground hover:text-accent"
              >
                {i.title}
                <span className="mono ml-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                  · {i.source}
                </span>
                <ExternalLink className="ml-1 inline h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}