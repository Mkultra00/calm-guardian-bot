import { useState } from "react";
import { Globe, Loader2, ShieldCheck, AlertTriangle, Info, ExternalLink, Brain, Bot, Volume2, ShieldAlert, ShieldQuestion } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { auditSite, type SiteAuditResult } from "@/lib/site-audit.functions";
import { getSpecialistOpinion } from "@/lib/specialist-opinion.functions";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { useCipher } from "@/hooks/use-cipher";

export function SiteAudit() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SiteAuditResult | null>(null);
  const [opinionLoading, setOpinionLoading] = useState<"ciso" | "nhi" | null>(null);
  type Opinion = {
    persona: string;
    voiceId: string;
    verdict: "safe" | "suspicious" | "malicious";
    headline: string;
    sections: { title: string; body: string }[];
    spoken: string;
  };
  const [opinions, setOpinions] = useState<Record<"ciso" | "nhi", Opinion | undefined>>({
    ciso: undefined,
    nhi: undefined,
  });
  const [audioLoading, setAudioLoading] = useState<"ciso" | "nhi" | null>(null);
  const run = useServerFn(auditSite);
  const runOpinion = useServerFn(getSpecialistOpinion);
  const runTts = useServerFn(synthesizeSpeech);
  const { addActivity, attachSources } = useCipher();

  const submit = async () => {
    const u = url.trim();
    if (!u || loading) return;
    setLoading(true);
    setResult(null);
    addActivity({ tool: "firecrawl.scrape", reason: `Auditing ${u}` });
    try {
      const res = await run({ data: { url: u } });
      setResult(res);
      if (res.error) {
        addActivity({ tool: "firecrawl.scrape", reason: u, result: `✗ ${res.error}` });
      } else {
        const riskCount = res.findings.filter((f) => f.severity === "risk").length;
        addActivity({
          tool: "firecrawl.scrape",
          reason: u,
          result: riskCount ? `⚠ ${riskCount} risk(s) found` : "Surface scan clean",
        });
        if (res.finalUrl) {
          attachSources(`Site audit: ${new URL(res.finalUrl).hostname}`, [
            { title: res.title || res.finalUrl, url: res.finalUrl },
          ]);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Audit failed";
      setResult({ url: u, findings: [], links: [], error: msg });
      addActivity({ tool: "firecrawl.scrape", reason: u, result: `✗ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  const askSpecialist = async (role: "ciso" | "nhi") => {
    if (!result || result.error || opinionLoading) return;
    setOpinionLoading(role);
    addActivity({
      tool: role === "ciso" ? "specialist.ciso" : "specialist.nhi",
      reason: `Opinion on ${result.finalUrl ?? result.url}`,
    });
    try {
      const res = await runOpinion({
        data: {
          role,
          url: result.finalUrl ?? result.url,
          title: result.title,
          summary: result.summary ?? result.description,
          findings: result.findings,
        },
      });
      setOpinions((p) => ({
        ...p,
        [role]: {
          persona: res.persona,
          voiceId: res.voiceId,
          verdict: res.verdict,
          headline: res.headline,
          sections: res.sections,
          spoken: res.spoken,
        },
      }));
      addActivity({
        tool: role === "ciso" ? "specialist.ciso" : "specialist.nhi",
        reason: result.finalUrl ?? result.url,
        result: "✓ Opinion delivered",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Opinion failed";
      setOpinions((p) => ({
        ...p,
        [role]: {
          persona: role === "ciso" ? "CISO" : "NHI",
          voiceId: "",
          verdict: "suspicious",
          headline: `Error: ${msg}`,
          sections: [],
          spoken: msg,
        },
      }));
    } finally {
      setOpinionLoading(null);
    }
  };

  const playOpinion = async (role: "ciso" | "nhi") => {
    const o = opinions[role];
    if (!o || audioLoading) return;
    setAudioLoading(role);
    try {
      const voiceId = o.voiceId || (role === "ciso" ? "JBFqnCBsd6RMkjVDRZzb" : "TX3LPaxmHKxFdv7VOQHJ");
      const res = await runTts({ data: { text: o.spoken || o.headline, voiceId } });
      const audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
      await audio.play();
    } catch (e) {
      console.warn("TTS playback failed", e);
    } finally {
      setAudioLoading(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Globe className="h-3.5 w-3.5 text-accent" />
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Site Audit · Firecrawl Scrape
        </div>
      </div>

      <div className="space-y-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com or https://suspicious-site.io"
              maxLength={500}
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="mono inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Audit
          </button>
        </form>

        {!result && !loading && (
          <p className="text-xs text-muted-foreground">
            Paste any URL. Djinn scrapes it server-side via Firecrawl, then flags redirects, scam-pattern language, and off-domain links.
          </p>
        )}

        {result?.error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {result.error}
          </div>
        )}

        {result && !result.error && (
          <div className="space-y-3">
            <div className="rounded border border-border/60 bg-background/60 p-3">
              <div className="mono text-[10px] uppercase tracking-wider text-accent">
                {result.finalUrl ? new URL(result.finalUrl).hostname : ""}
              </div>
              {result.title && (
                <div className="mt-0.5 text-sm font-medium text-foreground">{result.title}</div>
              )}
              {(result.summary || result.description) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.summary || result.description}
                </p>
              )}
            </div>

            <div>
              <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Findings
              </div>
              <ul className="space-y-1.5">
                {result.findings.map((f, i) => {
                  const Icon =
                    f.severity === "risk" ? AlertTriangle : f.severity === "warn" ? AlertTriangle : Info;
                  const color =
                    f.severity === "risk"
                      ? "text-destructive border-destructive/40 bg-destructive/10"
                      : f.severity === "warn"
                        ? "text-accent border-accent/40 bg-accent/10"
                        : "text-muted-foreground border-border bg-background/60";
                  return (
                    <li key={i} className={`flex items-start gap-2 rounded border ${color} p-2`}>
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{f.label}</div>
                        <div className="text-[11px] opacity-80">{f.detail}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {result.links.length > 0 && (
              <div>
                <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Off-domain links ({result.links.length})
                </div>
                <ul className="space-y-1">
                  {result.links.slice(0, 8).map((l) => (
                    <li key={l}>
                      <a
                        href={l}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{l}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-border/60 pt-3">
              <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Specialist Opinions
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => askSpecialist("ciso")}
                  disabled={opinionLoading !== null}
                  className="mono inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {opinionLoading === "ciso" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                  Ask CISO
                </button>
                <button
                  onClick={() => askSpecialist("nhi")}
                  disabled={opinionLoading !== null}
                  className="mono inline-flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-accent hover:bg-accent/20 disabled:opacity-50"
                >
                  {opinionLoading === "nhi" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                  Ask NHI
                </button>
              </div>

              {(["ciso", "nhi"] as const).map((role) => {
                const o = opinions[role];
                if (!o) return null;
                const isCiso = role === "ciso";
                const VerdictIcon =
                  o.verdict === "malicious" ? ShieldAlert : o.verdict === "safe" ? ShieldCheck : ShieldQuestion;
                const verdictColor =
                  o.verdict === "malicious"
                    ? "text-destructive border-destructive/40 bg-destructive/10"
                    : o.verdict === "safe"
                      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                      : "text-accent border-accent/40 bg-accent/10";
                return (
                  <div
                    key={role}
                    className={`mt-2 rounded border p-3 ${isCiso ? "border-primary/40 bg-primary/5" : "border-accent/40 bg-accent/5"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={`mono text-[10px] uppercase tracking-wider ${isCiso ? "text-primary" : "text-accent"}`}>
                        {o.persona}
                      </div>
                      <button
                        onClick={() => playOpinion(role)}
                        disabled={audioLoading !== null}
                        className="mono inline-flex items-center gap-1 rounded border border-border bg-background/60 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {audioLoading === role ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                        Play
                      </button>
                    </div>
                    <div className={`mono mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${verdictColor}`}>
                      <VerdictIcon className="h-3 w-3" />
                      {o.verdict}
                    </div>
                    {o.headline && (
                      <p className="mt-2 text-sm font-medium text-foreground">{o.headline}</p>
                    )}
                    {o.sections.length > 0 && (
                      <dl className="mt-2 space-y-2">
                        {o.sections.map((s, i) => (
                          <div key={i} className="rounded border border-border/60 bg-background/40 p-2">
                            <dt className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {s.title}
                            </dt>
                            <dd className="mt-1 text-xs text-foreground">{s.body}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {o.sections.length === 0 && o.spoken && o.spoken !== o.headline && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">{o.spoken}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}