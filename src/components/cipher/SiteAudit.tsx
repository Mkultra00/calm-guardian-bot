import { useState, useRef, useEffect } from "react";
import { Globe, Loader2, ShieldCheck, AlertTriangle, Info, ExternalLink, Brain, Bot, Volume2, ShieldAlert, ShieldQuestion, MessagesSquare, Play, Square, Download, Radar } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { auditSite, type SiteAuditResult } from "@/lib/site-audit.functions";
import { getSpecialistOpinion } from "@/lib/specialist-opinion.functions";
import { getSpecialistDiscussion } from "@/lib/specialist-discussion.functions";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { checkSiteChanges, type SiteMonitorResult } from "@/lib/site-monitor.functions";
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
  type DiscussionTurn = { speaker: "ciso" | "nhi"; text: string; voiceId: string };
  type Discussion = {
    verdict: "safe" | "suspicious" | "malicious";
    summary: string;
    conventionalRisk?: "low" | "medium" | "high" | null;
    nhiRisk?: "low" | "medium" | "high" | null;
    turns: DiscussionTurn[];
  };
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [playingConv, setPlayingConv] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopRequestedRef = useRef(false);
  const run = useServerFn(auditSite);
  const runOpinion = useServerFn(getSpecialistOpinion);
  const runDiscussion = useServerFn(getSpecialistDiscussion);
  const runTts = useServerFn(synthesizeSpeech);
  const runMonitor = useServerFn(checkSiteChanges);
  const { addActivity, attachSources } = useCipher();

  const [monitoring, setMonitoring] = useState(false);
  const [monitorChecks, setMonitorChecks] = useState<SiteMonitorResult[]>([]);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const monitorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MONITOR_INTERVAL_MS = 60_000;

  const performMonitorCheck = async (targetUrl: string) => {
    setMonitorBusy(true);
    addActivity({ tool: "firecrawl.monitor", reason: `Checking ${targetUrl}` });
    try {
      const res = await runMonitor({ data: { url: targetUrl } });
      setMonitorChecks((p) => [res, ...p].slice(0, 10));
      addActivity({
        tool: "firecrawl.monitor",
        reason: targetUrl,
        result: res.error ? `✗ ${res.error}` : `✓ ${res.changeStatus ?? "checked"}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Monitor failed";
      addActivity({ tool: "firecrawl.monitor", reason: targetUrl, result: `✗ ${msg}` });
    } finally {
      setMonitorBusy(false);
    }
  };

  const startMonitoring = () => {
    if (!result || result.error || monitoring) return;
    const target = result.finalUrl ?? result.url;
    setMonitoring(true);
    setMonitorChecks([]);
    performMonitorCheck(target);
    monitorTimerRef.current = setInterval(() => {
      performMonitorCheck(target);
    }, MONITOR_INTERVAL_MS);
  };

  const stopMonitoring = () => {
    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    setMonitoring(false);
  };

  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) clearInterval(monitorTimerRef.current);
    };
  }, []);

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
      const voiceId = o.voiceId || (role === "ciso" ? "JBFqnCBsd6RMkjVDRZzb" : "Xb7hH8MSUJpSbSDYk0k2");
      const res = await runTts({ data: { text: o.spoken || o.headline, voiceId } });
      const audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
      await audio.play();
    } catch (e) {
      console.warn("TTS playback failed", e);
    } finally {
      setAudioLoading(null);
    }
  };

  const discuss = async () => {
    if (!result || result.error || discussionLoading) return;
    setDiscussionLoading(true);
    setDiscussion(null);
    addActivity({
      tool: "specialist.discussion",
      reason: `Discussion on ${result.finalUrl ?? result.url}`,
    });
    try {
      const res = await runDiscussion({
        data: {
          url: result.finalUrl ?? result.url,
          title: result.title,
          summary: result.summary ?? result.description,
          findings: result.findings,
        },
      });
      setDiscussion(res);
      addActivity({
        tool: "specialist.discussion",
        reason: result.finalUrl ?? result.url,
        result: `✓ ${res.turns.length} turns`,
      });
      if (res.turns.length > 0) {
        playConversation(res);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Discussion failed";
      setDiscussion({ verdict: "suspicious", summary: msg, turns: [] });
    } finally {
      setDiscussionLoading(false);
    }
  };

  const playConversation = async (overrideDiscussion?: Discussion) => {
    const disc = overrideDiscussion ?? discussion;
    if (!disc || playingConv) return;
    stopRequestedRef.current = false;
    setPlayingConv(true);
    try {
      for (let i = 0; i < disc.turns.length; i++) {
        if (stopRequestedRef.current) break;
        setPlayingIdx(i);
        const t = disc.turns[i];
        const res = await runTts({ data: { text: t.text, voiceId: t.voiceId } });
        if (stopRequestedRef.current) break;
        const audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
        currentAudioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        currentAudioRef.current = null;
      }
    } finally {
      stopRequestedRef.current = false;
      setPlayingConv(false);
      setPlayingIdx(null);
    }
  };

  const stopConversation = () => {
    stopRequestedRef.current = true;
    const a = currentAudioRef.current;
    if (a) {
      try { a.pause(); } catch {}
      a.src = "";
      currentAudioRef.current = null;
    }
    setPlayingConv(false);
    setPlayingIdx(null);
  };

  const downloadTranscript = () => {
    if (!discussion || !result) return;
    const url = result.finalUrl ?? result.url;
    let text = `Specialist Discussion Transcript\n${"=".repeat(40)}\n`;
    text += `Site: ${url}\n`;
    text += `Title: ${result.title ?? "(none)"}\n`;
    text += `Verdict: ${discussion.verdict.toUpperCase()}\n`;
    if (discussion.conventionalRisk) {
      text += `Conventional Risk: ${discussion.conventionalRisk.toUpperCase()}\n`;
    }
    if (discussion.nhiRisk) {
      text += `NHI Risk: ${discussion.nhiRisk.toUpperCase()}\n`;
    }
    text += `\nSummary:\n${discussion.summary}\n\n`;
    text += `${"=".repeat(40)}\nConversation\n${"=".repeat(40)}\n\n`;
    discussion.turns.forEach((t, i) => {
      const speaker = t.speaker === "ciso" ? "CISO" : "NHI";
      text += `[${i + 1}] ${speaker}:\n${t.text}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cipher-discussion-${new URL(url).hostname}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadJson = () => {
    if (!discussion || !result) return;
    const url = result.finalUrl ?? result.url;
    const payload = {
      site: url,
      title: result.title ?? null,
      verdict: discussion.verdict,
      summary: discussion.summary,
      conventionalRisk: discussion.conventionalRisk ?? null,
      nhiRisk: discussion.nhiRisk ?? null,
      findings: result.findings.map((f) => ({ label: f.label, detail: f.detail, severity: f.severity })),
      conversation: discussion.turns.map((t) => ({ speaker: t.speaker, text: t.text })),
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cipher-discussion-${new URL(url).hostname}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-lg border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Globe className="h-3.5 w-3.5 text-accent" />
        <div className="mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
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
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm font-bold focus:border-primary focus:outline-none"
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
                <button
                  onClick={discuss}
                  disabled={discussionLoading}
                  className="mono inline-flex items-center gap-2 rounded-md border border-foreground/30 bg-gradient-to-r from-primary/15 to-accent/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:from-primary/25 hover:to-accent/25 disabled:opacity-50"
                >
                  {discussionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessagesSquare className="h-3 w-3" />}
                  Let Them Discuss
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

              {discussion && (
                <div className="mt-3 rounded border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      CISO ⇄ NHI Discussion
                    </div>
                    {discussion.turns.length > 0 && (
                      <button
                        onClick={() => (playingConv ? stopConversation() : playConversation())}
                        className="mono inline-flex items-center gap-1 rounded border border-border bg-background/60 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      >
                        {playingConv ? <Square className="h-3 w-3 animate-pulse" /> : <Play className="h-3 w-3" />}
                        {playingConv ? "Stop" : "Play Conversation"}
                      </button>
                    )}
                  </div>
                  {discussion.summary && (
                    <p className="mt-2 text-xs italic text-muted-foreground">{discussion.summary}</p>
                  )}
                  <div className="mono mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                    <button
                      onClick={downloadTranscript}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background/60 px-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      Transcript
                    </button>
                    <button
                      onClick={downloadJson}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background/60 px-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      JSON Log
                    </button>
                  </div>
                  {(discussion.conventionalRisk || discussion.nhiRisk) && (
                    <div className="mono mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                      {discussion.conventionalRisk && (
                        <span className="rounded border border-border bg-background/60 px-2 py-0.5 text-muted-foreground">
                          Conventional: <span className="text-foreground">{discussion.conventionalRisk}</span>
                        </span>
                      )}
                      {discussion.nhiRisk && (
                        <span className="rounded border border-border bg-background/60 px-2 py-0.5 text-muted-foreground">
                          NHI: <span className="text-foreground">{discussion.nhiRisk}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {discussion.turns.map((t, i) => {
                      const isCiso = t.speaker === "ciso";
                      const active = playingIdx === i;
                      return (
                        <div
                          key={i}
                          className={`flex gap-2 ${isCiso ? "" : "flex-row-reverse"}`}
                        >
                          <div
                            className={`mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] uppercase ${
                              isCiso ? "border-primary/50 bg-primary/10 text-primary" : "border-accent/50 bg-accent/10 text-accent"
                            } ${active ? "ring-2 ring-foreground/40" : ""}`}
                          >
                            {isCiso ? <Brain className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          </div>
                          <div
                            className={`max-w-[85%] rounded-lg border px-3 py-2 text-xs ${
                              isCiso
                                ? "border-primary/30 bg-primary/5 text-foreground"
                                : "border-accent/30 bg-accent/5 text-foreground"
                            } ${active ? "ring-1 ring-foreground/30" : ""}`}
                          >
                            <div className={`mono mb-1 text-[9px] uppercase tracking-wider ${isCiso ? "text-primary" : "text-accent"}`}>
                              {isCiso ? "CISO" : "NHI"}
                            </div>
                            <p className="whitespace-pre-wrap">{t.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}