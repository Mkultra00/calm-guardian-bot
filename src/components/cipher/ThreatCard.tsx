import { useCipher } from "@/hooks/use-cipher";
import { AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";

export function ThreatCard() {
  const { threat } = useCipher();

  if (!threat) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-6 text-center">
        <CheckCircle2 className="mb-2 h-8 w-8 text-primary" />
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          No active threat
        </p>
        <p className="mt-2 max-w-xs text-xs text-muted-foreground">
          When Djinn analyzes a suspicious event, the verdict lands here.
        </p>
      </div>
    );
  }

  const riskStyles = {
    LOW: "bg-primary/15 text-primary border-primary/40",
    MEDIUM: "bg-accent/15 text-accent border-accent/40",
    HIGH: "bg-destructive/20 text-destructive border-destructive/50",
  }[threat.risk];

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-lg border border-destructive/50 bg-card/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Threat Card
          </div>
          <h3 className="mt-1 text-lg font-bold">{threat.scam_type}</h3>
        </div>
        <span className={`mono rounded-md border px-2 py-1 text-xs font-bold ${riskStyles}`}>
          {threat.risk}
        </span>
      </div>

      <div className="mt-4">
        <div className="mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent">
          <AlertTriangle className="h-3 w-3" /> Do this now
        </div>
        <ul className="space-y-1.5 text-sm">
          {threat.do_now.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="mono text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {threat.sources.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sources
          </div>
          <ul className="space-y-1 text-xs">
            {threat.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}