import { useCipher } from "@/hooks/use-cipher";
import { Mic, MicOff, Loader2 } from "lucide-react";

export function SessionControl() {
  const { isConnected, isConnecting, start, stop, error } = useCipher();

  return (
    <div className="flex items-center gap-3">
      {isConnected ? (
        <button
          onClick={stop}
          className="mono inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/20"
        >
          <MicOff className="h-3.5 w-3.5" /> End Session
        </button>
      ) : (
        <button
          onClick={start}
          disabled={isConnecting}
          className="mono inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {isConnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {isConnecting ? "Connecting" : "Start Session"}
        </button>
      )}
      {error && (
        <span className="mono text-[10px] uppercase tracking-widest text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}