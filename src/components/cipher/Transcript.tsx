import { useEffect, useRef } from "react";
import { useCipher } from "@/hooks/use-cipher";

export function Transcript() {
  const { transcript } = useCipher();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card/60">
      <div className="border-b border-border px-4 py-2">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Live Transcript
        </div>
      </div>
      <div ref={ref} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {transcript.length === 0 && (
          <p className="mono text-xs text-muted-foreground">
            Awaiting conversation. Start a session — or click <strong>Run Demo</strong> to watch Djinn analyze a synthetic phishing attack.
          </p>
        )}
        {transcript.map((m) => (
          <div key={m.id} className="space-y-1">
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {m.role === "user" ? "▶ You" : "◆ Djinn"}
            </div>
            <div
              className={`whitespace-pre-wrap rounded-md px-3 py-2 ${
                m.role === "user"
                  ? "bg-secondary text-foreground"
                  : "bg-primary/10 text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}