import { createFileRoute } from "@tanstack/react-router";
import avatar from "@/assets/flaming-eyeball-avatar.png";
import { CipherProvider, useCipher } from "@/hooks/use-cipher";
import { ShieldStatus } from "@/components/cipher/ShieldStatus";
import { Transcript } from "@/components/cipher/Transcript";
import { ToolActivityLog } from "@/components/cipher/ToolActivityLog";
import { ThreatCard } from "@/components/cipher/ThreatCard";
import { DemoTriggers } from "@/components/cipher/DemoTriggers";
import { SessionControl } from "@/components/cipher/SessionControl";
import { UploadAnalyzer } from "@/components/cipher/UploadAnalyzer";
import { NhiThreats } from "@/components/cipher/NhiThreats";
import { Play, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DJINN — Deployed Joint Intelligence Neural Network" },
      { name: "description", content: "Djinn is a calm voice guardian that shields you and your family from phishing, scam calls, and AI voice-clone attacks." },
      { property: "og:title", content: "Djinn" },
      { property: "og:description", content: "Voice-first family scam shield." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <CipherProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:p-6">
          <header className="flex flex-col gap-3">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Black Chamber · Seraph Systems
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                DJINN
              </h1>
              <div className="text-sm font-medium text-primary">
                Deployed Joint Intelligence Neural Network
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Voice-first family scam shield. Djinn listens, researches, and
                explains threats — calmly and in plain language.
              </p>
            </div>
          </header>

          <div className="flex items-center justify-center">
            <RunDemoButton />
          </div>

          <ShieldStatus />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 lg:h-[460px]">
              <Transcript />
            </div>
            <div className="lg:h-[460px]">
              <ToolActivityLog />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DemoTriggers />
            </div>
            <div className="min-h-[200px]">
              <ThreatCard />
            </div>
          </div>

          <UploadAnalyzer />

          <section className="rounded-lg border border-primary/30 bg-card/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  Specialist · Chief Information Security Officer
                </div>
                <h2 className="mt-1 text-lg font-bold">
                  CISO <span className="text-primary">Specialist</span>
                </h2>
                <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                  Primary threat-detection and family-scam-shield agent. Start a
                  voice session to speak with the CISO specialist directly.
                </p>
              </div>
              <SessionControl />
            </div>
          </section>

          <NhiThreats />

          <footer className="mono pt-2 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Every action visible · Djinn never obeys the attacker · Keys stay server-side
          </footer>
        </div>
      </div>
    </CipherProvider>
  );
}

function RunDemoButton() {
  const { runDemo, isRunningDemo } = useCipher();
  return (
    <button
      onClick={runDemo}
      disabled={isRunningDemo}
      className="mono inline-flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-accent hover:bg-accent/20 disabled:opacity-50"
    >
      {isRunningDemo ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {isRunningDemo ? "Running Demo..." : "Run Demo"}
    </button>
  );
}
