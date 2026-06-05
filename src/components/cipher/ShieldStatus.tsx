import { useCipher } from "@/hooks/use-cipher";
import { Shield, ShieldAlert, ShieldCheck, Activity } from "lucide-react";

export function ShieldStatus() {
  const { status, isConnected, isSpeaking } = useCipher();

  const cfg = {
    protected: {
      label: "PROTECTED",
      Icon: ShieldCheck,
      bg: "bg-primary/10 border-primary/40",
      text: "text-primary",
      dot: "bg-primary",
      pulse: "",
    },
    analyzing: {
      label: "ANALYZING",
      Icon: Activity,
      bg: "bg-accent/10 border-accent/50",
      text: "text-accent",
      dot: "bg-accent",
      pulse: "cipher-pulse",
    },
    threat: {
      label: "THREAT DETECTED",
      Icon: ShieldAlert,
      bg: "bg-destructive/15 border-destructive/60",
      text: "text-destructive",
      dot: "bg-destructive",
      pulse: "cipher-pulse",
    },
  }[status];

  return (
    <div
      className={`mono relative flex items-center justify-between gap-4 rounded-lg border px-5 py-4 ${cfg.bg} ${cfg.pulse}`}
    >
      <div className="flex items-center gap-3">
        <cfg.Icon className={`h-6 w-6 ${cfg.text}`} />
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Shield Status
          </div>
          <div className={`text-xl font-bold tracking-wider ${cfg.text}`}>
            {cfg.label}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Djinn</span>
        <span className={`ml-3 inline-block h-2 w-2 rounded-full ${isConnected ? "bg-primary" : "bg-muted-foreground"}`} />
        <span>{isConnected ? (isSpeaking ? "speaking" : "listening") : "offline"}</span>
      </div>
    </div>
  );
}