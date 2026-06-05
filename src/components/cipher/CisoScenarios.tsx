import { useCipher } from "@/hooks/use-cipher";
import {
  AlertTriangle,
  Lock,
  UserX,
  FileWarning,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";

const SCENARIOS = [
  {
    key: "ransomware",
    icon: Lock,
    label: "Ransomware Outbreak",
    text: `[INCIDENT ALERT]
Multiple endpoints in Finance are encrypting files and displaying a ransom note demanding $250,000 in Bitcoin. The malware appears to be spreading laterally via SMB. Core accounting systems are offline.

Assess blast radius and give me immediate containment steps.`,
  },
  {
    key: "supply_chain",
    icon: AlertTriangle,
    label: "Supply Chain Compromise",
    text: `[THREAT INTEL]
Our SIEM flagged that a widely-used network-monitoring tool (deployed to 80% of endpoints) pushed a signed update 6 hours ago that contains a backdoor. The vendor has not yet disclosed the incident.

What is our exposure and what should we do right now?`,
  },
  {
    key: "insider_threat",
    icon: UserX,
    label: "Insider Data Exfiltration",
    text: `[DLP ALERT]
A senior engineer in R&D downloaded the entire customer database (2.4M records) to a personal cloud drive over the past 3 nights, then submitted resignation effective immediately.

Assess legal exposure, data-breach obligations, and containment actions.`,
  },
  {
    key: "bec",
    icon: FileWarning,
    label: "CEO Business Email Compromise",
    text: `[FRAUD ALERT]
Finance received a wire-transfer request from what appears to be the CEO's email account authorizing a $485,000 payment to a new vendor. The email passed SPF/DKIM and the writing style is convincing. The CFO is about to approve.

Is this a BEC attack? What should I tell the CFO immediately?`,
  },
] as const;

export function CisoScenarios() {
  const {
    sendThreat,
    isConnected,
    isConnecting,
    activeAgent,
    start,
    stop,
  } = useCipher();

  const cisoActive = isConnected && activeAgent === "guardian";

  return (
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
            Enterprise threat-detection and incident-response agent. Start a
            voice session to speak with the CISO specialist directly.
          </p>
        </div>
        {cisoActive ? (
          <button
            onClick={stop}
            className="mono inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/20"
          >
            <MicOff className="h-3.5 w-3.5" /> End Specialist
          </button>
        ) : (
          <button
            onClick={() => start("guardian")}
            disabled={isConnecting || isConnected}
            className="mono inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {isConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {isConnected ? "Djinn Active" : "Start CISO Specialist"}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => sendThreat(s.text)}
              disabled={!cisoActive}
              className="group flex items-start gap-3 rounded-md border border-border bg-background/60 p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Scenario
                </div>
                <div className="text-sm font-bold">{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>
      {!cisoActive && (
        <p className="mono mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Start the CISO specialist to dispatch a scenario.
        </p>
      )}
    </section>
  );
}
